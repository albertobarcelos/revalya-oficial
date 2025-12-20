import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'

// Constantes de configuração
const RATE_LIMIT_MAX = 10  // 10 requisições por minuto
const RATE_LIMIT_WINDOW = 60 * 1000  // 1 minuto em milissegundos
const TOKEN_EXPIRY = 30 * 60  // 30 minutos em segundos
const CLOCK_SKEW = 60  // tolerância de 60 segundos para validação de tempo

// Cliente Supabase com service role para acessar a tabela tenant_access_codes
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      persistSession: false,
    }
  }
)

// Chave privada para assinar os JWTs (armazenada como variável de ambiente)
// Deve ser uma chave RSA em formato PEM
const privateKeyPEM = Deno.env.get('JWT_PRIVATE_KEY') ?? '';

// Cache para rate limiting baseado em IP
const rateLimitCache = new Map<string, { count: number, resetTime: number }>();

// Interface para o payload do JWT
interface JWTPayload {
  sub: string;            // user_id
  tenant_id: string;      // id do tenant
  tenant_slug: string;    // slug do tenant
  roles: string[];        // papéis do usuário no tenant
  token_version: number;  // versão do token para revogação
  iat: number;            // issued at time
  exp: number;            // expiration time
}

// Interface para a requisição
interface ExchangeRequest {
  code: string;
  slug: string;
}

// Interface para a resposta
interface ExchangeResponse {
  access_token?: string;
  expires_in?: number;
  tenant_id?: string;
  tenant_slug?: string;
  error?: string;
}

serve(async (req: Request) => {
  console.log(`[Exchange] ${req.method} request received from origin: ${req.headers.get('origin')}`)
  
  // CORS headers - mais permissivos para debug
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  }
  
  // Responder ao preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }
  
  // Verificar se o método é POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Obter o endereço IP do cliente
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   req.headers.get('x-real-ip') || 
                   '0.0.0.0'
  
  // Verificar rate limit
  if (isRateLimited(clientIP)) {
    // Log da tentativa de excesso de rate limit
    await logSecurityEvent({
      action: 'RATE_LIMIT_EXCEEDED',
      ip_address: clientIP,
      user_agent: req.headers.get('user-agent') || '',
      details: { endpoint: '/exchange-tenant-code' }
    })
    
    return new Response(JSON.stringify({ error: 'Taxa de requisições excedida' }), {
      status: 429,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': '60'
      }
    })
  }
  
  // Incrementar contador de rate limit
  incrementRateLimit(clientIP)
  
  try {
    // Ler o corpo da requisição
    const requestBody: ExchangeRequest = await req.json()
    const { code, slug } = requestBody
    
    // Validar os parâmetros
    if (!code || !slug) {
      return new Response(JSON.stringify({ error: 'Código ou slug não fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Buscar o código de acesso
    const { data: codeData, error: codeError } = await supabaseClient
      .from('tenant_access_codes')
      .select('id, code, user_id, tenant_id, expires_at, used_at')
      .eq('code', code)
      .single()
    
    // Verificar se o código foi encontrado
    if (codeError || !codeData) {
      await logSecurityEvent({
        action: 'INVALID_ACCESS_CODE',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { code_prefix: code.substring(0, 8), slug }
      })
      
      return new Response(JSON.stringify({ error: 'Código inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Verificar se o código já foi usado
    if (codeData.used_at) {
      await logSecurityEvent({
        action: 'USED_ACCESS_CODE',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { code_prefix: code.substring(0, 8), user_id: codeData.user_id }
      })
      
      return new Response(JSON.stringify({ error: 'Código já utilizado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Verificar se o código está expirado
    const now = new Date()
    if (new Date(codeData.expires_at) < now) {
      await logSecurityEvent({
        action: 'EXPIRED_ACCESS_CODE',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { code_prefix: code.substring(0, 8), user_id: codeData.user_id }
      })
      
      return new Response(JSON.stringify({ error: 'Código expirado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Buscar o tenant pelo ID
    const { data: tenantData, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, slug, name, active')
      .eq('id', codeData.tenant_id)
      .single()
    
    // Verificar se o tenant foi encontrado
    if (tenantError || !tenantData) {
      await logSecurityEvent({
        action: 'TENANT_NOT_FOUND',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { tenant_id: codeData.tenant_id, user_id: codeData.user_id }
      })
      
      return new Response(JSON.stringify({ error: 'Tenant não encontrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Verificar se o tenant está ativo
    if (!tenantData.active) {
      await logSecurityEvent({
        action: 'INACTIVE_TENANT_ACCESS',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { tenant_id: codeData.tenant_id, user_id: codeData.user_id }
      })
      
      return new Response(JSON.stringify({ error: 'Tenant inativo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Verificar se o slug corresponde
    if (tenantData.slug !== slug) {
      await logSecurityEvent({
        action: 'SLUG_MISMATCH',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { 
          expected_slug: tenantData.slug, 
          provided_slug: slug,
          user_id: codeData.user_id
        }
      })
      
      return new Response(JSON.stringify({ error: 'Slug não corresponde ao tenant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Buscar a membership do usuário no tenant
    const { data: membershipData, error: membershipError } = await supabaseClient
      .from('tenant_users')
      .select('user_id, tenant_id, role, token_version, active')
      .eq('user_id', codeData.user_id)
      .eq('tenant_id', codeData.tenant_id)
      .single()
    
    // Verificar se o usuário tem acesso ao tenant
    if (membershipError || !membershipData) {
      await logSecurityEvent({
        action: 'NO_TENANT_MEMBERSHIP',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { tenant_id: codeData.tenant_id, user_id: codeData.user_id }
      })
      
      return new Response(JSON.stringify({ error: 'Usuário não tem acesso ao tenant' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Verificar se a membership está ativa
    if (!membershipData.active) {
      await logSecurityEvent({
        action: 'INACTIVE_MEMBERSHIP',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { tenant_id: codeData.tenant_id, user_id: codeData.user_id }
      })
      
      return new Response(JSON.stringify({ error: 'Acesso do usuário ao tenant está inativo' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Marcar o código como usado
    const { error: updateError } = await supabaseClient
      .from('tenant_access_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', codeData.id)
    
    if (updateError) {
      console.error('Erro ao marcar código como usado:', updateError)
      
      return new Response(JSON.stringify({ error: 'Erro ao processar código' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Registrar o uso do código no log
    await logAuditEvent({
      user_id: codeData.user_id,
      tenant_id: codeData.tenant_id,
      action: 'TENANT_ACCESS_CODE_USED',
      details: {
        code_prefix: code.substring(0, 8),
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || ''
      }
    })
    
    // Gerar refresh token usando a função do banco
    console.log('[Exchange] Gerando refresh token')
    const { data: refreshTokenData, error: refreshTokenError } = await supabaseClient
      .rpc('generate_refresh_token', {
        p_user_id: codeData.user_id,
        p_tenant_id: codeData.tenant_id
      })
    
    if (refreshTokenError) {
      console.error('[Exchange] Erro ao gerar refresh token:', refreshTokenError)
      return new Response(JSON.stringify({ error: 'Erro ao gerar refresh token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const refreshToken = refreshTokenData as string
    console.log('[Exchange] Refresh token gerado:', refreshToken.substring(0, 8) + '...')
    
    // Retornar sucesso com token simples
    const response: ExchangeResponse = {
      access_token: `tenant_${codeData.tenant_id}_${Date.now()}`, // Token simples
      expires_in: TOKEN_EXPIRY,
      tenant_id: codeData.tenant_id,
      tenant_slug: tenantData.slug
    }
    
    console.log('[Exchange] Returning success response with refresh cookie')
    
    // Configurar cookie httpOnly para refresh token
    const refreshCookieName = `rt_${tenantData.slug}`
    const refreshCookieValue = `${refreshCookieName}=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Set-Cookie': refreshCookieValue
      }
    })
    
  } catch (error) {
    console.error('[Exchange] Unexpected error:', error)
    
    return new Response(JSON.stringify({ error: 'Erro interno no servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Função para verificar se o cliente atingiu o limite de requisições
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const rateData = rateLimitCache.get(ip)
  
  // Se não há registro ou o tempo de reset já passou, não está limitado
  if (!rateData || rateData.resetTime < now) {
    return false
  }
  
  // Verificar se o contador excedeu o limite
  return rateData.count >= RATE_LIMIT_MAX
}

// Função para incrementar o contador de rate limit
function incrementRateLimit(ip: string): void {
  const now = Date.now()
  const rateData = rateLimitCache.get(ip)
  
  // Se não há registro ou o tempo de reset já passou, criar novo registro
  if (!rateData || rateData.resetTime < now) {
    rateLimitCache.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return
  }
  
  // Incrementar o contador existente
  rateData.count++
  rateLimitCache.set(ip, rateData)
}

// Função para verificar se a origem é permitida pelo CORS
function allowedOrigin(origin: string): string {
  // Em desenvolvimento, sempre permitir localhost
  if (origin.includes('localhost')) {
    return origin
  }
  
  const allowedDomains = [
    'app.revalya.com',
    'portal.revalya.com',
    'revalya.com'
  ]
  
  // Verificar se a origem é permitida
  for (const domain of allowedDomains) {
    if (origin.endsWith(domain) || origin.includes(domain)) {
      return origin
    }
  }
  
  // Em caso de dúvida, permitir a origem (mais permissivo para debug)
  return origin || '*'
}

// Função para registrar eventos de segurança
async function logSecurityEvent(event: {
  action: string,
  ip_address: string,
  user_agent: string,
  user_id?: string,
  details: Record<string, any>
}): Promise<void> {
  try {
    await supabaseClient.from('security_logs').insert({
      action: event.action,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      user_id: event.user_id,
      details: event.details
    })
  } catch (error) {
    console.error('Erro ao registrar evento de segurança:', error)
  }
}

// Função para registrar eventos de auditoria
async function logAuditEvent(event: {
  user_id: string,
  tenant_id: string,
  action: string,
  details: Record<string, any>
}): Promise<void> {
  try {
    await supabaseClient.from('audit_logs').insert({
      user_id: event.user_id,
      tenant_id: event.tenant_id,
      action: event.action,
      details: event.details
    })
  } catch (error) {
    console.error('Erro ao registrar evento de auditoria:', error)
  }
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'

// Cliente Supabase com service role
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      persistSession: false,
    }
  }
)

// Chave pública para verificar assinatura do JWT (par da chave privada usada para assinar)
const publicKeyPEM = Deno.env.get('JWT_PUBLIC_KEY') ?? '';

// Constantes de configuração
const CLOCK_SKEW = 60; // 60 segundos de tolerância para validação de tempo
const RATE_LIMIT_MAX = 100  // 100 validações por minuto por IP
const RATE_LIMIT_WINDOW = 60 * 1000  // 1 minuto em milissegundos

// Cache para rate limiting baseado em IP
const rateLimitCache = new Map<string, { count: number, resetTime: number }>();

// Cache para métricas
const metrics = {
  validations: 0,
  validSuccessful: 0,
  validFailed: 0,
  expiredTokens: 0,
  invalidSignatures: 0,
  tokenVersionMismatch: 0,
  lastReset: Date.now(),
}

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
interface ValidationRequest {
  token: string;
}

// Interface para a resposta
interface ValidationResponse {
  valid: boolean;
  user_id?: string;
  tenant_id?: string;
  tenant_slug?: string;
  roles?: string[];
  error?: string;
}

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin(req.headers.get('origin') || ''),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      details: { 
        endpoint: '/validate-tenant-token',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || ''
      }
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
  
  // Incrementar contador de validações
  metrics.validations++;
  
  try {
    // Ler o corpo da requisição
    const requestBody: ValidationRequest = await req.json()
    const { token } = requestBody
    
    // Validar os parâmetros
    if (!token) {
      metrics.validFailed++;
      return new Response(JSON.stringify({ valid: false, error: 'Token não fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Converter a chave pública de PEM para objeto JWK
    const publicKey = await jose.importSPKI(publicKeyPEM, 'RS256')
    
    try {
      // Verificar assinatura do JWT e extrair payload
      const { payload } = await jose.jwtVerify(token, publicKey, {
        clockTolerance: CLOCK_SKEW,
      });
      
      const jwtPayload = payload as unknown as JWTPayload;
      
      // Verificar se o token está expirado
      const now = Math.floor(Date.now() / 1000);
      if (jwtPayload.exp && jwtPayload.exp < now) {
        metrics.expiredTokens++;
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Token expirado' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Verificar se o token_version corresponde à versão atual do usuário no tenant
      const { data: membershipData, error: membershipError } = await supabaseClient
        .from('tenant_users')
        .select('token_version, active')
        .eq('user_id', jwtPayload.sub)
        .eq('tenant_id', jwtPayload.tenant_id)
        .single();
      
      if (membershipError || !membershipData) {
        // Registrar evento de segurança
        await logSecurityEvent({
          action: 'TOKEN_MEMBERSHIP_NOT_FOUND',
          user_id: jwtPayload.sub,
          tenant_id: jwtPayload.tenant_id,
          details: {
            token_prefix: token.substring(0, 8)
          }
        });
        
        metrics.validFailed++;
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Usuário não tem acesso ao tenant' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Verificar se o usuário está ativo no tenant
      if (!membershipData.active) {
        // Registrar evento de segurança
        await logSecurityEvent({
          action: 'TOKEN_INACTIVE_MEMBERSHIP',
          user_id: jwtPayload.sub,
          tenant_id: jwtPayload.tenant_id,
          details: {
            token_prefix: token.substring(0, 8)
          }
        });
        
        metrics.validFailed++;
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Acesso ao tenant está inativo' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Verificar se a versão do token corresponde à versão atual
      if (jwtPayload.token_version !== membershipData.token_version) {
        // Registrar evento de segurança
        await logSecurityEvent({
          action: 'TOKEN_VERSION_MISMATCH',
          user_id: jwtPayload.sub,
          tenant_id: jwtPayload.tenant_id,
          details: {
            token_prefix: token.substring(0, 8),
            token_version: jwtPayload.token_version,
            current_version: membershipData.token_version
          }
        });
        
        metrics.tokenVersionMismatch++;
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Token revogado' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Token é válido
      metrics.validSuccessful++;
      
      // Log de auditoria para validações (com frequência reduzida para evitar sobrecarga)
      if (Math.random() < 0.1) { // Log apenas 10% das validações bem-sucedidas
        await logAuditEvent({
          user_id: jwtPayload.sub,
          tenant_id: jwtPayload.tenant_id,
          action: 'TENANT_TOKEN_VALIDATED',
          details: {
            token_prefix: token.substring(0, 8),
          }
        });
      }
      
      return new Response(JSON.stringify({ 
        valid: true,
        user_id: jwtPayload.sub,
        tenant_id: jwtPayload.tenant_id,
        tenant_slug: jwtPayload.tenant_slug,
        roles: jwtPayload.roles
      }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
      
    } catch (jwtError) {
      // Erro na verificação do JWT (assinatura inválida, token mal formado, etc.)
      console.error('Erro na validação do JWT:', jwtError);
      
      metrics.invalidSignatures++;
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Token inválido' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('Erro no processamento:', error);
    
    metrics.validFailed++;
    return new Response(JSON.stringify({ valid: false, error: 'Erro interno no servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Endpoint para obter métricas (apenas para uso interno/administrativo)
Deno.serve("/metrics", async (req: Request) => {
  // Verificar se a requisição veio da infraestrutura interna
  const apiKey = req.headers.get('x-admin-api-key');
  if (apiKey !== Deno.env.get('ADMIN_API_KEY')) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Calcular taxa de sucesso
  const successRate = metrics.validations > 0 ? 
    (metrics.validSuccessful / metrics.validations) * 100 : 0;
  
  // Calcular tempo desde último reset
  const uptimeMs = Date.now() - metrics.lastReset;
  const uptimeMinutes = Math.floor(uptimeMs / 60000);
  
  // Retornar métricas
  return new Response(JSON.stringify({
    validations: metrics.validations,
    validSuccessful: metrics.validSuccessful,
    validFailed: metrics.validFailed,
    successRate: successRate.toFixed(2) + '%',
    expiredTokens: metrics.expiredTokens,
    invalidSignatures: metrics.invalidSignatures,
    tokenVersionMismatch: metrics.tokenVersionMismatch,
    uptime: uptimeMinutes + ' minutos'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// Função para verificar se a origem é permitida pelo CORS
function allowedOrigin(origin: string): string {
  const allowedDomains = [
    'app.revalya.com',
    'portal.revalya.com',
    'localhost:3000',
    'localhost:5173'
  ]
  
  // Em desenvolvimento, permitir localhost
  if (origin.includes('localhost') && (Deno.env.get('ENVIRONMENT') === 'development')) {
    return origin
  }
  
  // Verificar se a origem é permitida
  for (const domain of allowedDomains) {
    if (origin.endsWith(domain) || origin.includes(`.revalya.com`)) {
      return origin
    }
  }
  
  // Origem padrão em produção
  return 'https://app.revalya.com'
}

// Função para registrar eventos de segurança
async function logSecurityEvent(event: {
  action: string,
  user_id?: string,
  tenant_id?: string,
  details: Record<string, any>
}): Promise<void> {
  try {
    await supabaseClient.from('security_logs').insert({
      action: event.action,
      user_id: event.user_id,
      tenant_id: event.tenant_id,
      ip_address: null, // Não temos acesso ao IP neste contexto
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

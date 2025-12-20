import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// Configurações
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const JWT_PRIVATE_KEY = Deno.env.get('JWT_PRIVATE_KEY');
const TOKEN_EXPIRY = 3600 // 1 hora
;
const RATE_LIMIT_MAX = 10 // máximo de tentativas por IP
;
const RATE_LIMIT_WINDOW = 60000 // janela de 1 minuto
;
// Cliente Supabase com service role
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Cache para rate limiting
const rateLimitCache = new Map();
// Função para log de eventos de segurança
async function logSecurityEvent(event) {
  try {
    await supabaseClient.from('security_logs').insert({
      action: event.action,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      details: event.details || {},
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Security Log] Error:', error);
  }
}
// Função para log de auditoria
async function logAuditEvent(event) {
  try {
    await supabaseClient.from('audit_logs').insert({
      user_id: event.user_id,
      tenant_id: event.tenant_id,
      action: event.action,
      details: event.details || {},
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Audit Log] Error:', error);
  }
}
serve(async (req)=>{
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Extrair IP do cliente para rate limiting e auditoria
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    console.log('[Exchange] Processing request from:', clientIP);
    // Verificar rate limit
    if (isRateLimited(clientIP)) {
      await logSecurityEvent({
        action: 'RATE_LIMIT_EXCEEDED',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || ''
      });
      return new Response(JSON.stringify({
        error: 'Muitas tentativas. Tente novamente em alguns minutos.'
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Incrementar contador de rate limit
    incrementRateLimit(clientIP);
    // Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Extrair slug da URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const slug = pathSegments[pathSegments.length - 1] // último segmento
    ;
    if (!slug) {
      return new Response(JSON.stringify({
        error: 'Slug do tenant é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('[Exchange] Processing for tenant slug:', slug);
    // Parse do body da requisição
    const body = await req.json();
    const { code } = body;
    if (!code) {
      return new Response(JSON.stringify({
        error: 'Código de acesso é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('[Exchange] Processing code:', code.substring(0, 8) + '...');
    // Buscar o código de acesso no banco
    const { data: codeData, error: codeError } = await supabaseClient.from('tenant_access_codes').select('id, user_id, tenant_id, code, expires_at, used_at').eq('code', code).single();
    // Verificar se o código foi encontrado
    if (codeError || !codeData) {
      await logSecurityEvent({
        action: 'INVALID_ACCESS_CODE',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: {
          code_prefix: code.substring(0, 8)
        }
      });
      return new Response(JSON.stringify({
        error: 'Código de acesso inválido'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verificar se o código já foi usado
    if (codeData.used_at) {
      await logSecurityEvent({
        action: 'USED_ACCESS_CODE',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: {
          code_prefix: code.substring(0, 8),
          user_id: codeData.user_id
        }
      });
      return new Response(JSON.stringify({
        error: 'Código já utilizado'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verificar se o código está expirado
    const now = new Date();
    if (new Date(codeData.expires_at) < now) {
      await logSecurityEvent({
        action: 'EXPIRED_ACCESS_CODE',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: {
          code_prefix: code.substring(0, 8),
          user_id: codeData.user_id
        }
      });
      return new Response(JSON.stringify({
        error: 'Código expirado'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Buscar o tenant pelo ID
    const { data: tenantData, error: tenantError } = await supabaseClient.from('tenants').select('id, slug, name, active').eq('id', codeData.tenant_id).single();
    // Verificar se o tenant foi encontrado
    if (tenantError || !tenantData) {
      await logSecurityEvent({
        action: 'TENANT_NOT_FOUND',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: {
          tenant_id: codeData.tenant_id,
          user_id: codeData.user_id
        }
      });
      return new Response(JSON.stringify({
        error: 'Tenant não encontrado'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verificar se o tenant está ativo
    if (!tenantData.active) {
      await logSecurityEvent({
        action: 'INACTIVE_TENANT_ACCESS',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: {
          tenant_id: codeData.tenant_id,
          user_id: codeData.user_id
        }
      });
      return new Response(JSON.stringify({
        error: 'Tenant inativo'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
      });
      return new Response(JSON.stringify({
        error: 'Slug não corresponde ao tenant'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Buscar a membership do usuário no tenant
    const { data: membershipData, error: membershipError } = await supabaseClient.from('tenant_users').select('user_id, tenant_id, role, token_version, active').eq('user_id', codeData.user_id).eq('tenant_id', codeData.tenant_id).single();
    // Verificar se o usuário tem acesso ao tenant
    if (membershipError || !membershipData) {
      await logSecurityEvent({
        action: 'NO_TENANT_MEMBERSHIP',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: {
          tenant_id: codeData.tenant_id,
          user_id: codeData.user_id
        }
      });
      return new Response(JSON.stringify({
        error: 'Usuário não tem acesso ao tenant'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verificar se a membership está ativa
    if (!membershipData.active) {
      await logSecurityEvent({
        action: 'INACTIVE_MEMBERSHIP',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: {
          tenant_id: codeData.tenant_id,
          user_id: codeData.user_id
        }
      });
      return new Response(JSON.stringify({
        error: 'Acesso do usuário ao tenant está inativo'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Marcar o código como usado
    const { error: updateError } = await supabaseClient.from('tenant_access_codes').update({
      used_at: new Date().toISOString()
    }).eq('id', codeData.id);
    if (updateError) {
      console.error('Erro ao marcar código como usado:', updateError);
      return new Response(JSON.stringify({
        error: 'Erro ao processar código'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
    });
    // Gerar refresh token usando a função do banco
    console.log('[Exchange] Gerando refresh token');
    const { data: refreshTokenData, error: refreshTokenError } = await supabaseClient.rpc('generate_refresh_token', {
      p_user_id: codeData.user_id,
      p_tenant_id: codeData.tenant_id
    });
    if (refreshTokenError) {
      console.error('[Exchange] Erro ao gerar refresh token:', refreshTokenError);
      return new Response(JSON.stringify({
        error: 'Erro ao gerar refresh token'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const refreshToken = refreshTokenData;
    console.log('[Exchange] Refresh token gerado:', refreshToken.substring(0, 8) + '...');
    // Retornar sucesso com token simples
    const response = {
      access_token: `tenant_${codeData.tenant_id}_${Date.now()}`,
      expires_in: TOKEN_EXPIRY,
      tenant_id: codeData.tenant_id,
      tenant_slug: tenantData.slug
    };
    console.log('[Exchange] Returning success response with refresh cookie');
    // Configurar cookie httpOnly para refresh token
    const refreshCookieName = `rt_${tenantData.slug}`;
    const refreshCookieValue = `${refreshCookieName}=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`;
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Set-Cookie': refreshCookieValue
      }
    });
  } catch (error) {
    console.error('[Exchange] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno no servidor'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
// Função para verificar se o cliente atingiu o limite de requisições
function isRateLimited(ip) {
  const now = Date.now();
  const rateData = rateLimitCache.get(ip);
  // Se não há registro ou o tempo de reset já passou, não está limitado
  if (!rateData || rateData.resetTime < now) {
    return false;
  }
  // Verificar se o contador excedeu o limite
  return rateData.count >= RATE_LIMIT_MAX;
}
// Função para incrementar o contador de rate limit
function incrementRateLimit(ip) {
  const now = Date.now();
  const rateData = rateLimitCache.get(ip);
  // Se não há registro ou o tempo de reset já passou, criar novo
  if (!rateData || rateData.resetTime < now) {
    rateLimitCache.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
  } else {
    // Incrementar contador existente
    rateData.count++;
  }
}
// Limpeza periódica do cache de rate limit
setInterval(()=>{
  const now = Date.now();
  for (const [ip, rateData] of rateLimitCache.entries()){
    if (rateData.resetTime < now) {
      rateLimitCache.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

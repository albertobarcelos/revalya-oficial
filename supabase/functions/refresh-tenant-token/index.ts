import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Configurações
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PORTAL_BASE_URL = Deno.env.get('PORTAL_BASE_URL') || 'https://portal.revalya.com'

// Cliente Supabase com service role
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface RefreshResponse {
  access_token: string
  expires_in: number
  tenant_id: string
  tenant_slug: string
}

interface ErrorResponse {
  error: string
  redirect_url?: string
}

// Função para log de eventos de segurança
async function logSecurityEvent(event: {
  action: string
  ip_address: string
  user_agent: string
  details?: any
}) {
  try {
    await supabaseClient.from('security_logs').insert({
      action: event.action,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      details: event.details || {},
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Security Log] Error:', error)
  }
}

// Função para log de auditoria
async function logAuditEvent(event: {
  user_id: string
  tenant_id?: string
  action: string
  details?: any
}) {
  try {
    await supabaseClient.from('audit_logs').insert({
      user_id: event.user_id,
      tenant_id: event.tenant_id,
      action: event.action,
      details: event.details || {},
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Audit Log] Error:', error)
  }
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // Extrair IP do cliente
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    console.log('[Refresh] Processing request from:', clientIP)

    // Apenas aceitar GET
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    // Extrair slug da URL
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const slug = pathSegments[pathSegments.length - 1] // último segmento

    if (!slug) {
      await logSecurityEvent({
        action: 'REFRESH_MISSING_SLUG',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || ''
      })

      const redirectUrl = `${PORTAL_BASE_URL}/bootstrap?error=missing_slug`
      return new Response(JSON.stringify({ 
        error: 'Slug do tenant é obrigatório',
        redirect_url: redirectUrl 
      }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    console.log('[Refresh] Slug extracted:', slug)

    // Extrair refresh token do cookie
    const cookieHeader = req.headers.get('cookie')
    const refreshCookieName = `rt_${slug}`
    let refreshToken: string | null = null

    if (cookieHeader) {
      const cookies = cookieHeader.split(';')
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === refreshCookieName) {
          refreshToken = value
          break
        }
      }
    }

    if (!refreshToken) {
      await logSecurityEvent({
        action: 'REFRESH_TOKEN_MISSING',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { slug, cookie_name: refreshCookieName }
      })

      const redirectUrl = `${PORTAL_BASE_URL}/bootstrap?slug=${slug}&reason=no_refresh_token`
      return new Response(JSON.stringify({ 
        error: 'Token de refresh não encontrado',
        redirect_url: redirectUrl 
      }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    console.log('[Refresh] Token found:', refreshToken.substring(0, 8) + '...')

    // Validar refresh token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .rpc('validate_refresh_token', {
        p_token: refreshToken
      })

    if (tokenError || !tokenData || tokenData.length === 0 || !tokenData[0].valid) {
      await logSecurityEvent({
        action: 'REFRESH_TOKEN_INVALID',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { 
          slug, 
          token_prefix: refreshToken?.substring(0, 8),
          error: tokenError?.message
        }
      })

      const redirectUrl = `${PORTAL_BASE_URL}/bootstrap?slug=${slug}&reason=invalid_refresh_token`
      return new Response(JSON.stringify({ 
        error: 'Token de refresh inválido ou expirado',
        redirect_url: redirectUrl 
      }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    const tokenInfo = tokenData[0]
    console.log('[Refresh] Token validated for user:', tokenInfo.user_id, 'tenant:', tokenInfo.tenant_id)

    // Atualizar último uso do token
    await supabaseClient
      .from('tenant_refresh_tokens')
      .update({ 
        last_used_at: new Date().toISOString(),
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || ''
      })
      .eq('id', tokenInfo.token_id)

    // Buscar dados do tenant para validação
    const { data: tenantData, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, slug, name, active')
      .eq('id', tokenInfo.tenant_id)
      .single()

    if (tenantError || !tenantData || tenantData.slug !== slug) {
      await logSecurityEvent({
        action: 'REFRESH_TENANT_MISMATCH',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        details: { 
          expected_slug: slug,
          tenant_slug: tenantData?.slug,
          tenant_id: tokenInfo.tenant_id
        }
      })

      const redirectUrl = `${PORTAL_BASE_URL}/bootstrap?slug=${slug}&reason=tenant_mismatch`
      return new Response(JSON.stringify({ 
        error: 'Tenant não corresponde',
        redirect_url: redirectUrl 
      }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    // Log de auditoria do refresh bem-sucedido
    await logAuditEvent({
      user_id: tokenInfo.user_id,
      tenant_id: tokenInfo.tenant_id,
      action: 'ACCESS_TOKEN_REFRESHED',
      details: {
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent') || '',
        tenant_slug: slug
      }
    })

    // Gerar novo access token
    const accessToken = `tenant_${tokenInfo.tenant_id}_${Date.now()}`
    const expiresIn = 3600 // 1 hora

    const response: RefreshResponse = {
      access_token: accessToken,
      expires_in: expiresIn,
      tenant_id: tokenInfo.tenant_id,
      tenant_slug: slug
    }

    console.log('[Refresh] Success - returning new access token')

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    })

  } catch (error) {
    console.error('[Refresh] Unexpected error:', error)

    return new Response(JSON.stringify({ error: 'Erro interno no servidor' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }
})


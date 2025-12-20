import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configurações inspiradas na Omie
const CONFIG = {
  REFRESH_TOKEN_EXPIRY_DAYS: 30,
  ACCESS_TOKEN_EXPIRY_HOURS: 1,
  MAX_TOKENS_PER_USER: 10,
}

interface CreateSessionRequest {
  tenantId: string;
  tenantSlug: string;
  userToken: string;
}

interface TenantSession {
  tenantId: string;
  tenantSlug: string;
  refreshToken: string;
  accessToken: string;
  expiresAt: number;
  userId: string;
  userEmail: string;
  lastAccess: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { tenantId, tenantSlug, userToken }: CreateSessionRequest = await req.json()

    // Validar parâmetros
    if (!tenantId || !tenantSlug || !userToken) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: tenantId, tenantSlug, userToken' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Decodificar token do usuário (assumindo JWT do Supabase)
    const userPayload = JSON.parse(atob(userToken.split('.')[1]))
    const { sub: userId, email: userEmail } = userPayload

    // Verificar se usuário tem acesso ao tenant
    const { data: tenantAccess, error: accessError } = await supabaseClient
      .from('tenant_users')
      .select('id, role, is_active')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (accessError || !tenantAccess) {
      return new Response(
        JSON.stringify({ error: 'Usuário não tem acesso a este tenant' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar se tenant está ativo
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, slug, name, active')
      .eq('id', tenantId)
      .eq('slug', tenantSlug)
      .eq('active', true)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant não encontrado ou inativo' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Gerar refresh token único (inspirado na Omie)
    const refreshToken = `rt_${tenantSlug}_${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`
    
    // Gerar access token simples
    const accessToken = `at_${tenantSlug}_${userId}_${Date.now()}`
    
    // Calcular expiração (30 dias para refresh)
    const expiresAt = Date.now() + (CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    // Salvar refresh token no banco
    const { error: saveError } = await supabaseClient
      .from('tenant_refresh_tokens')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        token: refreshToken,
        expires_at: new Date(expiresAt).toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

    if (saveError) {
      console.error('Erro ao salvar refresh token:', saveError)
      return new Response(
        JSON.stringify({ error: 'Erro interno ao criar sessão' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Criar objeto de sessão (formato Omie-inspired)
    const session: TenantSession = {
      tenantId,
      tenantSlug,
      refreshToken,
      accessToken,
      expiresAt,
      userId,
      userEmail,
      lastAccess: Date.now()
    }

    // Log de auditoria
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        action: 'TENANT_SESSION_CREATED',
        entity_type: 'tenant_session',
        entity_id: tenantId,
        new_data: {
          tenant_slug: tenantSlug,
          session_type: 'omie_inspired',
          user_agent: req.headers.get('user-agent'),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        }
      })

    return new Response(
      JSON.stringify(session),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na criação de sessão:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})


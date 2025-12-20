import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { refreshToken, tenantSlug } = await req.json();
    // Validar parâmetros
    if (!refreshToken || !tenantSlug) {
      return new Response(JSON.stringify({
        error: 'Parâmetros obrigatórios: refreshToken, tenantSlug'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Buscar refresh token no banco
    const { data: tokenData, error: tokenError } = await supabaseClient.from('tenant_refresh_tokens').select(`
        id, user_id, tenant_id, expires_at, revoked_at,
        tenants!inner(id, slug, name, active)
      `).eq('token', refreshToken).eq('tenants.slug', tenantSlug).is('revoked_at', null).single();
    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({
        error: 'Refresh token inválido ou expirado'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verificar se token não expirou
    if (new Date(tokenData.expires_at) < new Date()) {
      // Marcar como revogado
      await supabaseClient.from('tenant_refresh_tokens').update({
        revoked_at: new Date().toISOString()
      }).eq('id', tokenData.id);
      return new Response(JSON.stringify({
        error: 'Refresh token expirado'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verificar se tenant ainda está ativo
    if (!tokenData.tenants.active) {
      return new Response(JSON.stringify({
        error: 'Tenant inativo'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verificar se usuário ainda tem acesso ao tenant
    const { data: tenantAccess, error: accessError } = await supabaseClient.from('tenant_users').select('id, role, is_active').eq('tenant_id', tokenData.tenant_id).eq('user_id', tokenData.user_id).eq('is_active', true).single();
    if (accessError || !tenantAccess) {
      return new Response(JSON.stringify({
        error: 'Usuário não tem mais acesso a este tenant'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(tokenData.user_id);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({
        error: 'Usuário não encontrado'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Gerar novo access token
    const newAccessToken = `at_${tenantSlug}_${tokenData.user_id}_${Date.now()}`;
    // Atualizar último uso do refresh token
    await supabaseClient.from('tenant_refresh_tokens').update({
      last_used_at: new Date().toISOString()
    }).eq('id', tokenData.id);
    // Criar nova sessão (mantém o mesmo refresh token)
    const newSession = {
      tenantId: tokenData.tenant_id,
      tenantSlug,
      refreshToken,
      accessToken: newAccessToken,
      expiresAt: new Date(tokenData.expires_at).getTime(),
      userId: tokenData.user_id,
      userEmail: userData.user.email,
      lastAccess: Date.now()
    };
    // Log de auditoria
    await supabaseClient.from('audit_logs').insert({
      user_id: tokenData.user_id,
      tenant_id: tokenData.tenant_id,
      action: 'TENANT_TOKEN_REFRESHED',
      entity_type: 'tenant_session',
      entity_id: tokenData.tenant_id,
      new_data: {
        tenant_slug: tenantSlug,
        refresh_token_id: tokenData.id,
        user_agent: req.headers.get('user-agent'),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      }
    });
    return new Response(JSON.stringify(newSession), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Erro na renovação de token:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

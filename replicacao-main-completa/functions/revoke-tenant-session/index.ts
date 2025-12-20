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
    const { refreshToken, tenantSlug, reason } = await req.json();
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
        tenants!inner(id, slug, name)
      `).eq('token', refreshToken).eq('tenants.slug', tenantSlug).single();
    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({
        error: 'Refresh token não encontrado'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verificar se já foi revogado
    if (tokenData.revoked_at) {
      return new Response(JSON.stringify({
        message: 'Token já estava revogado',
        revoked_at: tokenData.revoked_at
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Revogar o token
    const { error: revokeError } = await supabaseClient.from('tenant_refresh_tokens').update({
      revoked_at: new Date().toISOString()
    }).eq('id', tokenData.id);
    if (revokeError) {
      console.error('Erro ao revogar token:', revokeError);
      return new Response(JSON.stringify({
        error: 'Erro interno ao revogar sessão'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Log de auditoria
    await supabaseClient.from('audit_logs').insert({
      user_id: tokenData.user_id,
      tenant_id: tokenData.tenant_id,
      action: 'TENANT_SESSION_REVOKED',
      entity_type: 'tenant_session',
      entity_id: tokenData.tenant_id,
      new_data: {
        tenant_slug: tenantSlug,
        refresh_token_id: tokenData.id,
        revocation_reason: reason || 'manual_revocation',
        user_agent: req.headers.get('user-agent'),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      }
    });
    return new Response(JSON.stringify({
      message: 'Sessão revogada com sucesso',
      revoked_at: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Erro na revogação de sessão:', error);
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

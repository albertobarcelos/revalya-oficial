import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function para adicionar custom claims ao JWT
 * Esta função é chamada automaticamente pelo Supabase Auth
 * quando um usuário faz login ou refresh do token
 */
serve(async (req) => {
  try {
    // Verificar se é uma requisição POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obter o payload do webhook
    const payload = await req.json();
    
    // Verificar se é um evento de autenticação válido
    if (!payload.user || !payload.user.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = payload.user.id;
    
    // Criar cliente Supabase com service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar informações do usuário e seus tenants
    const { data: userTenants, error: tenantError } = await supabase
      .from('tenant_users')
      .select(`
        tenant_id,
        role,
        tenants!inner(
          id,
          name,
          slug,
          active
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('tenants.active', true);

    if (tenantError) {
      console.error('Erro ao buscar tenants do usuário:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Preparar custom claims
    const customClaims: Record<string, any> = {
      // Timestamp da última atualização dos claims
      claims_updated_at: new Date().toISOString(),
      
      // Lista de tenants que o usuário tem acesso
      tenants: userTenants?.map(ut => ({
        tenant_id: ut.tenant_id,
        role: ut.role,
        tenant_name: ut.tenants.name,
        tenant_slug: ut.tenants.slug
      })) || [],
      
      // Tenant primário (primeiro da lista ou null)
      primary_tenant_id: userTenants?.[0]?.tenant_id || null,
      primary_role: userTenants?.[0]?.role || null,
      
      // Flag indicando se é platform admin
      is_platform_admin: userTenants?.some(ut => ut.role === 'platform_admin') || false,
      
      // Total de tenants que o usuário tem acesso
      tenant_count: userTenants?.length || 0
    };

    // Log para auditoria
    console.log(`Custom claims atualizados para usuário ${userId}:`, {
      tenant_count: customClaims.tenant_count,
      primary_tenant_id: customClaims.primary_tenant_id,
      primary_role: customClaims.primary_role,
      is_platform_admin: customClaims.is_platform_admin
    });

    // Retornar os custom claims para serem adicionados ao JWT
    return new Response(
      JSON.stringify({
        claims: customClaims
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Erro na função jwt-custom-claims:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
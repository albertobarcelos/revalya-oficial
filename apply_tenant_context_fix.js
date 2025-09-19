// AIDEV-NOTE: Script para aplicar a correção da inconsistência no contexto de tenant
// Executa a correção diretamente no banco de dados via cliente Supabase

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTenantContextFix() {
  console.log('🔧 Aplicando correção da inconsistência no contexto de tenant...');
  
  try {
    // 1. Corrigir a função get_tenant_id para usar app.current_tenant_id
    const fixGetTenantIdQuery = `
      CREATE OR REPLACE FUNCTION public.get_tenant_id() 
      RETURNS UUID 
      SECURITY DEFINER
      LANGUAGE SQL
      AS $$
        SELECT COALESCE(
          current_setting('app.current_tenant_id', true)::uuid,
          NULL
        );
      $$;
    `;
    
    const { error: fixError } = await supabase.rpc('exec_sql', {
      sql: fixGetTenantIdQuery
    });
    
    if (fixError) {
      console.error('❌ Erro ao corrigir get_tenant_id:', fixError);
      return;
    }
    
    console.log('✅ Função get_tenant_id corrigida com sucesso!');
    
    // 2. Conceder permissões
    const grantPermissionsQuery = `
      GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO authenticated;
      GRANT EXECUTE ON FUNCTION public.set_tenant_context_flexible(UUID, UUID) TO authenticated;
    `;
    
    const { error: grantError } = await supabase.rpc('exec_sql', {
      sql: grantPermissionsQuery
    });
    
    if (grantError) {
      console.error('❌ Erro ao conceder permissões:', grantError);
      return;
    }
    
    console.log('✅ Permissões concedidas com sucesso!');
    
    // 3. Testar a correção
    console.log('🧪 Testando a correção...');
    
    // Buscar um tenant para teste
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, slug')
      .limit(1);
    
    if (tenantsError || !tenants || tenants.length === 0) {
      console.error('❌ Erro ao buscar tenant para teste:', tenantsError);
      return;
    }
    
    const testTenant = tenants[0];
    console.log('📋 Usando tenant para teste:', testTenant.slug);
    
    // Buscar um usuário para teste
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.error('❌ Erro ao buscar usuário para teste:', usersError);
      return;
    }
    
    const testUser = users[0];
    
    // Testar set_tenant_context_flexible
    const { data: setResult, error: setError } = await supabase.rpc('set_tenant_context_flexible', {
      p_tenant_id: testTenant.id,
      p_user_id: testUser.id
    });
    
    if (setError) {
      console.error('❌ Erro ao testar set_tenant_context_flexible:', setError);
      return;
    }
    
    console.log('✅ set_tenant_context_flexible funcionando:', setResult);
    
    // Testar get_tenant_id
    const { data: getTenantResult, error: getTenantError } = await supabase.rpc('get_tenant_id');
    
    if (getTenantError) {
      console.error('❌ Erro ao testar get_tenant_id:', getTenantError);
      return;
    }
    
    console.log('✅ get_tenant_id retornando:', getTenantResult);
    
    if (getTenantResult === testTenant.id) {
      console.log('🎉 CORREÇÃO APLICADA COM SUCESSO! As funções estão consistentes.');
    } else {
      console.log('⚠️ Atenção: get_tenant_id não retornou o tenant esperado.');
      console.log('Esperado:', testTenant.id);
      console.log('Recebido:', getTenantResult);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar a correção
applyTenantContextFix();
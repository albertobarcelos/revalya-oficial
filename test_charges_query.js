// Teste direto para verificar dados na tabela charges
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://wyehpiutzvwplllumgdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testChargesQuery() {
  try {
    console.log('🔍 Testando consulta direta na tabela charges...');
    
    // Buscar todos os tenants primeiro
    const { data: allTenants, error: allTenantsError } = await supabase
      .from('tenants')
      .select('id, name, slug, active')
      .order('name');
    
    if (allTenantsError) {
      console.error('❌ Erro ao buscar tenants:', allTenantsError);
      return;
    }
    
    console.log(`📋 Total de tenants encontrados: ${allTenants?.length || 0}`);
    
    if (allTenants && allTenants.length > 0) {
      console.log('📋 Tenants disponíveis:');
      allTenants.forEach(t => {
        console.log(`  - ${t.name} (${t.slug}) - ID: ${t.id} - Ativo: ${t.active}`);
      });
    } else {
      console.log('⚠️ Nenhum tenant encontrado na tabela tenants');
      
      // Verificar se a tabela existe e se há problemas de permissão
      const { data: testData, error: testError } = await supabase
        .from('tenants')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('❌ Erro de permissão ou tabela não existe:', testError);
      }
      
      return;
    }
    
    // Buscar tenant nexsyn
    const tenant = allTenants?.find(t => t.slug === 'nexsyn');
    
    if (!tenant) {
      console.error('❌ Tenant nexsyn não encontrado!');
      return;
    }
    
    console.log('✅ Tenant encontrado:', tenant);
    
    // Buscar cobranças do tenant
    const { data: charges, error: chargesError } = await supabase
      .from('charges')
      .select(`
        id,
        status,
        valor,
        tipo,
        data_vencimento,
        data_pagamento,
        descricao,
        tenant_id,
        customers!inner(
          id,
          name
        )
      `)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (chargesError) {
      console.error('❌ Erro ao buscar cobranças:', chargesError);
      return;
    }
    
    console.log(`✅ Cobranças encontradas: ${charges?.length || 0}`);
    
    if (charges && charges.length > 0) {
      console.log('📋 Primeiras cobranças:');
      charges.forEach((charge, index) => {
        console.log(`  ${index + 1}. ID: ${charge.id}`);
        console.log(`     Status: ${charge.status}`);
        console.log(`     Valor: R$ ${charge.valor}`);
        console.log(`     Tipo: ${charge.tipo}`);
        console.log(`     Vencimento: ${charge.data_vencimento}`);
        console.log(`     Cliente: ${charge.customers?.name}`);
        console.log('     ---');
      });
    } else {
      console.log('⚠️ Nenhuma cobrança encontrada para o tenant nexsyn');
      
      // Verificar se há cobranças em geral na tabela
      const { data: allCharges, error: allChargesError } = await supabase
        .from('charges')
        .select('id, tenant_id')
        .limit(5);
      
      if (allChargesError) {
        console.error('❌ Erro ao buscar todas as cobranças:', allChargesError);
      } else {
        console.log(`📊 Total de cobranças na tabela: ${allCharges?.length || 0}`);
        if (allCharges && allCharges.length > 0) {
          console.log('🔍 Tenant IDs encontrados:');
          const tenantIds = [...new Set(allCharges.map(c => c.tenant_id))];
          tenantIds.forEach(id => console.log(`  - ${id}`));
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar o teste
testChargesQuery();
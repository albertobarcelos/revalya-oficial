// =====================================================
// DEBUG EDGE FUNCTION - Teste Simples
// Descrição: Script para identificar o ponto exato de falha na Edge Function
// =====================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wyehpiutzvwplllumgdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEdgeFunction() {
  console.log('🔍 Iniciando debug da Edge Function...\n');

  // Teste 1: Verificar se a função existe
  console.log('1️⃣ Testando se a Edge Function existe...');
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/asaas-import-charges`, {
      method: 'OPTIONS',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status OPTIONS: ${response.status}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
    
    if (response.status === 200) {
      console.log('   ✅ Edge Function existe e responde a OPTIONS\n');
    } else {
      console.log('   ❌ Edge Function não responde corretamente a OPTIONS\n');
      return;
    }
  } catch (error) {
    console.error('   ❌ Erro no teste OPTIONS:', error.message);
    return;
  }

  // Teste 2: Testar com dados inválidos para ver se a validação funciona
  console.log('2️⃣ Testando validação com dados inválidos...');
  try {
    const { data, error } = await supabase.functions.invoke('asaas-import-charges', {
      body: {
        // Dados inválidos propositalmente
      }
    });
    
    if (error) {
      console.log('   ✅ Validação funcionando - erro esperado:', error.message);
    } else {
      console.log('   ⚠️ Validação não funcionou - deveria ter dado erro');
    }
  } catch (error) {
    console.log('   ✅ Validação funcionando - exceção esperada:', error.message);
  }
  console.log('');

  // Teste 3: Testar com tenant_id inválido
  console.log('3️⃣ Testando com tenant_id inválido...');
  try {
    const { data, error } = await supabase.functions.invoke('asaas-import-charges', {
      body: {
        tenant_id: 'invalid-tenant-id',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        limit: 1
      }
    });
    
    if (error) {
      console.log('   ✅ Erro esperado com tenant inválido:', error.message);
      
      // Tentar extrair mais detalhes do erro
      if (error.context) {
        try {
          const errorText = await error.context.text();
          console.log('   📄 Corpo da resposta de erro:', errorText);
        } catch (e) {
          console.log('   ⚠️ Não foi possível ler o corpo do erro');
        }
      }
    } else {
      console.log('   ⚠️ Não houve erro - inesperado:', data);
    }
  } catch (error) {
    console.log('   ✅ Exceção esperada:', error.message);
  }
  console.log('');

  // Teste 4: Verificar se existe algum tenant no sistema
  console.log('4️⃣ Verificando tenants no sistema...');
  try {
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(5);
    
    if (tenantError) {
      console.log('   ❌ Erro ao buscar tenants:', tenantError.message);
    } else if (!tenants || tenants.length === 0) {
      console.log('   ⚠️ Nenhum tenant encontrado no sistema');
    } else {
      console.log(`   ✅ Encontrados ${tenants.length} tenants:`);
      tenants.forEach(tenant => {
        console.log(`      - ${tenant.id}: ${tenant.name || 'Sem nome'}`);
      });
    }
  } catch (error) {
    console.log('   ❌ Erro ao verificar tenants:', error.message);
  }
  console.log('');

  // Teste 5: Verificar integrações ASAAS
  console.log('5️⃣ Verificando integrações ASAAS...');
  try {
    const { data: integrations, error: intError } = await supabase
      .from('tenant_integrations')
      .select('tenant_id, integration_type, is_active')
      .eq('integration_type', 'asaas')
      .limit(5);
    
    if (intError) {
      console.log('   ❌ Erro ao buscar integrações:', intError.message);
    } else if (!integrations || integrations.length === 0) {
      console.log('   ⚠️ Nenhuma integração ASAAS encontrada');
    } else {
      console.log(`   ✅ Encontradas ${integrations.length} integrações ASAAS:`);
      integrations.forEach(int => {
        console.log(`      - Tenant: ${int.tenant_id}, Ativa: ${int.is_active}`);
      });
    }
  } catch (error) {
    console.log('   ❌ Erro ao verificar integrações:', error.message);
  }

  console.log('\n🏁 Debug concluído!');
}

debugEdgeFunction().catch(console.error);
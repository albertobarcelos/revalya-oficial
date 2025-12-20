/**
 * Script para aplicar a função RPC get_tenant_id_by_slug no Supabase
 * AIDEV-NOTE: Este script resolve o problema da RPC ausente que estava causando
 * o retorno de null no TenantManager
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wyehpiutzvwplllumgdk.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function showInstructions() {
  console.log('📋 INSTRUÇÕES PARA APLICAR A FUNÇÃO RPC');
  console.log('=' .repeat(50));
  console.log('');
  console.log('1. Acesse o painel do Supabase: https://supabase.com/dashboard');
  console.log('2. Vá para o projeto: wyehpiutzvwplllumgdk');
  console.log('3. Navegue até: SQL Editor');
  console.log('4. Execute o conteúdo do arquivo:');
  console.log('   📁 supabase/migrations/create_get_tenant_id_by_slug_function.sql');
  console.log('');
  console.log('🔍 Após aplicar, teste a função com:');
  console.log("   SELECT get_tenant_id_by_slug('nexsyn', null);");
  console.log('');
  console.log('💡 Esta função resolve o problema do TenantManager que estava');
  console.log('   retornando null porque a RPC não existia no banco.');
  console.log('');
  
  // Tentar testar se a função já existe
  try {
    console.log('🧪 Testando se a função já existe...');
    const { data, error } = await supabase.rpc('get_tenant_id_by_slug', {
      p_slug: 'nexsyn',
      p_user_id: null
    });
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('❌ Função RPC não existe - precisa ser criada');
      } else {
        console.log('⚠️  Erro ao testar função:', error.message);
      }
    } else {
      console.log('✅ Função RPC já existe e retornou:', data);
    }
  } catch (error) {
    console.log('⚠️  Erro ao testar função:', error.message);
  }
  
  return true;
}

// Executar se chamado diretamente
if (require.main === module) {
  showInstructions()
    .then(success => {
      if (success) {
        console.log('');
        console.log('🎉 Verificação concluída!');
        console.log('💡 Siga as instruções acima para aplicar a função RPC.');
      } else {
        console.log('❌ Falha na verificação.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { showInstructions };
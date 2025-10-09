/**
 * AIDEV-NOTE: Script para verificar configurações da Edge Function send-bulk-messages
 * Este script ajuda a diagnosticar problemas de configuração que podem causar falhas
 */

import { createClient } from '@supabase/supabase-js';

// AIDEV-NOTE: Configuração do cliente Supabase para verificações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Verifica se as variáveis de ambiente da Edge Function estão configuradas
 */
async function checkEdgeFunctionConfig() {
  console.log('🔍 Verificando configurações da Edge Function send-bulk-messages...\n');

  try {
    // AIDEV-NOTE: Testa a Edge Function com uma requisição de verificação
    const response = await supabase.functions.invoke('send-bulk-messages', {
      body: { 
        action: 'health-check',
        chargeIds: [],
        templateId: 'test'
      },
      headers: {
        'x-tenant-id': 'test',
        'x-request-id': 'health-check-' + Date.now()
      }
    });

    console.log('📊 Resposta da Edge Function:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    console.log('Error:', response.error);

    if (response.error) {
      console.log('\n❌ Problemas identificados:');
      
      if (response.error.message?.includes('EVOLUTION_API_URL')) {
        console.log('- Variável EVOLUTION_API_URL não configurada');
      }
      
      if (response.error.message?.includes('EVOLUTION_API_KEY')) {
        console.log('- Variável EVOLUTION_API_KEY não configurada');
      }
      
      if (response.error.message?.includes('authentication')) {
        console.log('- Problemas de autenticação');
      }
      
      if (response.error.message?.includes('tenant')) {
        console.log('- Problemas de contexto de tenant');
      }
    } else {
      console.log('\n✅ Edge Function respondeu corretamente');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar Edge Function:', error);
  }
}

/**
 * Verifica configurações do projeto Supabase
 */
async function checkProjectConfig() {
  console.log('\n🔧 Verificando configurações do projeto...\n');

  try {
    // AIDEV-NOTE: Verifica se o cliente Supabase está funcionando
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);

    if (error) {
      console.log('❌ Erro de conectividade com Supabase:', error.message);
    } else {
      console.log('✅ Conectividade com Supabase OK');
    }

    // AIDEV-NOTE: Verifica se as tabelas necessárias existem
    const requiredTables = ['charges', 'message_templates', 'customers'];
    
    for (const table of requiredTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ Tabela ${table} não acessível:`, error.message);
      } else {
        console.log(`✅ Tabela ${table} acessível`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar configurações:', error);
  }
}

// AIDEV-NOTE: Executa as verificações
async function main() {
  console.log('🚀 Iniciando diagnóstico da Edge Function...\n');
  
  await checkProjectConfig();
  await checkEdgeFunctionConfig();
  
  console.log('\n📋 Próximos passos recomendados:');
  console.log('1. Configure as variáveis EVOLUTION_API_URL e EVOLUTION_API_KEY no Supabase');
  console.log('2. Verifique se o usuário tem role adequada (admin/manager/operator)');
  console.log('3. Confirme se o tenant_id está sendo enviado corretamente');
  console.log('4. Teste a conectividade com a Evolution API');
}

main().catch(console.error);
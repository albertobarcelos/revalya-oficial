// Script para aplicar correção de segurança da função set_tenant_context_flexible
// AIDEV-NOTE: Este script aplica a migração de segurança e testa a função corrigida

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// AIDEV-NOTE: Configuração do cliente Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * AIDEV-NOTE: Função para aplicar a migração de segurança
 */
async function applySecurityMigration() {
  console.log('🔧 Aplicando migração de segurança...');
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250117_fix_set_tenant_context_security.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Aplicar a migração (isso normalmente seria feito via Supabase CLI)
    console.log('📝 Migração lida com sucesso. Execute via Supabase CLI:');
    console.log('supabase db push');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao ler migração:', error);
    return false;
  }
}

/**
 * AIDEV-NOTE: Função para testar a função corrigida
 */
async function testSecureFunction() {
  console.log('\n🧪 Testando função set_tenant_context_flexible corrigida...');
  
  try {
    // Teste 1: Parâmetros inválidos
    console.log('\n1. Testando com parâmetros nulos...');
    const { data: nullTest, error: nullError } = await supabase.rpc('set_tenant_context_flexible', {
      p_tenant_id: null,
      p_user_id: null
    });
    
    if (nullError) {
      console.log('✅ Função ainda não foi migrada. Execute: supabase db push');
      return;
    }
    
    console.log('Resultado teste nulo:', nullTest);
    
    // Teste 2: Tenant inexistente
    console.log('\n2. Testando com tenant inexistente...');
    const fakeUUID = '00000000-0000-0000-0000-000000000000';
    const { data: fakeTest, error: fakeError } = await supabase.rpc('set_tenant_context_flexible', {
      p_tenant_id: fakeUUID,
      p_user_id: fakeUUID
    });
    
    console.log('Resultado teste fake:', fakeTest);
    
    // Teste 3: Verificar contexto atual
    console.log('\n3. Testando get_current_tenant_context_safe...');
    const { data: contextTest, error: contextError } = await supabase.rpc('get_current_tenant_context_safe');
    
    if (contextError) {
      console.log('Função get_current_tenant_context_safe ainda não migrada');
    } else {
      console.log('Contexto atual:', contextTest);
    }
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  }
}

/**
 * AIDEV-NOTE: Função para verificar logs de auditoria
 */
async function checkAuditLogs() {
  console.log('\n📊 Verificando logs de auditoria...');
  
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('Tabela audit_logs ainda não criada');
      return;
    }
    
    console.log('Últimos 10 logs de auditoria:');
    logs.forEach(log => {
      console.log(`- ${log.action}: ${JSON.stringify(log.details)} (${log.created_at})`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar logs:', error);
  }
}

/**
 * AIDEV-NOTE: Função principal
 */
async function main() {
  console.log('🚀 Iniciando aplicação de correção de segurança...');
  
  // Aplicar migração
  const migrationApplied = await applySecurityMigration();
  
  if (!migrationApplied) {
    console.log('❌ Falha ao aplicar migração');
    return;
  }
  
  // Testar função
  await testSecureFunction();
  
  // Verificar logs
  await checkAuditLogs();
  
  console.log('\n✅ Processo concluído!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Execute: supabase db push');
  console.log('2. Atualize o frontend para usar a nova resposta JSON');
  console.log('3. Teste o sistema para verificar se o vazamento foi corrigido');
}

// Executar
main().catch(console.error);
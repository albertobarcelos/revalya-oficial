/**
 * Script para configurar webhook ASAAS automaticamente
 * 
 * Este script configura o webhook ASAAS via API para enviar eventos
 * de cobrança para nossa Edge Function no Supabase.
 * 
 * Uso:
 * npm run setup-asaas-webhook -- --env=sandbox --email=seu@email.com
 * npm run setup-asaas-webhook -- --env=production --email=seu@email.com
 * 
 * AIDEV-NOTE: Automatiza completamente a configuração do webhook,
 * eliminando a necessidade de configuração manual no painel ASAAS.
 */

import { setupAsaasWebhook } from '../src/services/asaas/webhookService';
import { AsaasEnvironment } from '../src/types/asaas';
import crypto from 'crypto';

interface ScriptArgs {
  env: AsaasEnvironment;
  email: string;
  apiKey?: string;
  webhookUrl?: string;
  authToken?: string;
}

/**
 * Parseia argumentos da linha de comando
 */
function parseArgs(): ScriptArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<ScriptArgs> = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--env=')) {
      parsed.env = arg.split('=')[1] as AsaasEnvironment;
    } else if (arg.startsWith('--email=')) {
      parsed.email = arg.split('=')[1];
    } else if (arg.startsWith('--api-key=')) {
      parsed.apiKey = arg.split('=')[1];
    } else if (arg.startsWith('--webhook-url=')) {
      parsed.webhookUrl = arg.split('=')[1];
    } else if (arg.startsWith('--auth-token=')) {
      parsed.authToken = arg.split('=')[1];
    }
  });
  
  if (!parsed.env || !parsed.email) {
    console.error('❌ Argumentos obrigatórios: --env e --email');
    console.log('Uso: npm run setup-asaas-webhook -- --env=sandbox --email=seu@email.com');
    process.exit(1);
  }
  
  return parsed as ScriptArgs;
}

/**
 * Obtém configurações do ambiente
 */
function getEnvironmentConfig(env: AsaasEnvironment) {
  const envVarPrefix = env === 'production' ? 'ASAAS_PROD' : 'ASAAS_SANDBOX';
  
  return {
    apiKey: process.env[`${envVarPrefix}_API_KEY`],
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseProjectId: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0],
  };
}

/**
 * Gera URL do webhook baseada no projeto Supabase
 */
function generateWebhookUrl(supabaseProjectId: string): string {
  return `https://${supabaseProjectId}.supabase.co/functions/v1/asaas-webhook-charges`;
}

/**
 * Gera token de autenticação seguro
 */
function generateAuthToken(): string {
  return crypto.randomUUID();
}

/**
 * Função principal
 */
async function main() {
  try {
    console.log('🚀 Configurando webhook ASAAS...\n');
    
    const args = parseArgs();
    const envConfig = getEnvironmentConfig(args.env);
    
    // Validações
    if (!envConfig.apiKey) {
      console.error(`❌ Chave da API ASAAS não encontrada.`);
      console.log(`Configure a variável de ambiente: ${args.env === 'production' ? 'ASAAS_PROD_API_KEY' : 'ASAAS_SANDBOX_API_KEY'}`);
      process.exit(1);
    }
    
    if (!envConfig.supabaseProjectId) {
      console.error('❌ URL do Supabase não encontrada.');
      console.log('Configure a variável de ambiente: NEXT_PUBLIC_SUPABASE_URL');
      process.exit(1);
    }
    
    // Configurações do webhook
    const apiKey = args.apiKey || envConfig.apiKey;
    const webhookUrl = args.webhookUrl || generateWebhookUrl(envConfig.supabaseProjectId);
    const authToken = args.authToken || generateAuthToken();
    
    console.log('📋 Configurações:');
    console.log(`   Ambiente: ${args.env}`);
    console.log(`   Email: ${args.email}`);
    console.log(`   Webhook URL: ${webhookUrl}`);
    console.log(`   Auth Token: ${authToken.substring(0, 8)}...`);
    console.log('');
    
    // Configura o webhook
    console.log('⏳ Criando webhook ASAAS...');
    const webhook = await setupAsaasWebhook(
      apiKey,
      args.env,
      webhookUrl,
      args.email,
      authToken
    );
    
    console.log('✅ Webhook configurado com sucesso!');
    console.log('');
    console.log('📊 Detalhes do webhook:');
    console.log(`   ID: ${webhook.id}`);
    console.log(`   Nome: ${webhook.name}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Ativo: ${webhook.enabled ? 'Sim' : 'Não'}`);
    console.log(`   Eventos: ${webhook.events.length} configurados`);
    console.log('');
    
    console.log('🔐 IMPORTANTE - Salve estas informações:');
    console.log(`   Webhook ID: ${webhook.id}`);
    console.log(`   Auth Token: ${authToken}`);
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('   1. Configure o Auth Token na Edge Function');
    console.log('   2. Teste o webhook em ambiente de desenvolvimento');
    console.log('   3. Monitore os logs do webhook no painel ASAAS');
    console.log('');
    console.log('🔍 Para monitorar o webhook:');
    console.log('   - Acesse: Menu do Usuário > Integrações > Logs de Webhook');
    console.log(`   - URL da API: ${args.env === 'production' ? 'https://api.asaas.com' : 'https://api-sandbox.asaas.com'}/v3/webhooks/${webhook.id}`);
    
  } catch (error) {
    console.error('❌ Erro ao configurar webhook ASAAS:', error);
    process.exit(1);
  }
}

// Executa o script
if (require.main === module) {
  main();
}

export { main as setupAsaasWebhookScript };
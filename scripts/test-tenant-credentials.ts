#!/usr/bin/env tsx

// Script para testar a função getTenantCredentials
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Simular a função getTenantCredentials localmente
async function testGetTenantCredentials(tenantId: string, integrationType: string) {
  console.log(`🔍 Testando getTenantCredentials para tenant: ${tenantId}, tipo: ${integrationType}`)
  
  const { data, error } = await supabase
    .from('tenant_integrations')
    .select('config, webhook_token')
    .eq('tenant_id', tenantId)
    .eq('integration_type', integrationType)
    .eq('is_active', true)
    .single()

  console.log('📋 Query result:', { data, error })

  if (error) {
    console.error('❌ Erro ao buscar credenciais:', error)
    return null
  }

  if (!data) {
    console.log('⚠️ Nenhuma integração encontrada')
    return null
  }

  console.log('📊 Dados encontrados:', {
    hasConfig: !!data.config,
    hasWebhookToken: !!data.webhook_token,
    configKeys: data.config ? Object.keys(data.config) : [],
    webhookToken: data.webhook_token
  })

  // Usar o campo 'config' que contém as configurações da integração
  const config = data.config || {}
  const webhookToken = data.webhook_token || config.webhook_token

  console.log('🔧 Processando config:', {
    configApiKey: config.api_key ? 'PRESENTE' : 'AUSENTE',
    configApiUrl: config.api_url || 'AUSENTE',
    webhookTokenFinal: webhookToken ? 'PRESENTE' : 'AUSENTE'
  })

  if (!webhookToken) {
    console.log('❌ Token de webhook não encontrado')
    return null
  }

  const result = {
    api_key: config.api_key || '',
    api_url: config.api_url || '',
    webhook_token: webhookToken,
    environment: config.environment || 'production'
  }

  console.log('✅ Retornando credenciais:', {
    hasApiKey: !!result.api_key,
    hasApiUrl: !!result.api_url,
    hasWebhookToken: !!result.webhook_token,
    environment: result.environment
  })

  return result
}

async function main() {
  const tenantId = '8d2888f1-64a5-445f-84f5-2614d5160251'
  const integrationType = 'asaas'
  
  console.log('🧪 TESTANDO FUNÇÃO getTenantCredentials\n')
  
  const credentials = await testGetTenantCredentials(tenantId, integrationType)
  
  if (credentials) {
    console.log('\n✅ SUCESSO: Credenciais encontradas!')
    console.log('🔑 API Key:', credentials.api_key ? 'CONFIGURADA' : 'NÃO CONFIGURADA')
    console.log('🌐 API URL:', credentials.api_url)
    console.log('🔐 Webhook Token:', credentials.webhook_token ? 'CONFIGURADO' : 'NÃO CONFIGURADO')
    console.log('🏷️ Environment:', credentials.environment)
  } else {
    console.log('\n❌ FALHA: Credenciais não encontradas!')
  }
}

main().catch(console.error)
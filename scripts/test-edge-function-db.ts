#!/usr/bin/env tsx

// Script para testar conexão com banco usando configurações da Edge Function
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function testEdgeFunctionDbConnection() {
  console.log('🧪 TESTANDO CONEXÃO COM BANCO (EDGE FUNCTION CONFIG)\n')
  
  // Usar as mesmas variáveis que a Edge Function usa
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  
  console.log('🔧 Configuração do Supabase:')
  console.log('📍 URL:', supabaseUrl ? 'CONFIGURADA' : 'NÃO CONFIGURADA')
  console.log('🔑 Service Key:', supabaseServiceKey ? 'CONFIGURADA' : 'NÃO CONFIGURADA')
  console.log('📏 URL Length:', supabaseUrl?.length || 0)
  console.log('📏 Key Length:', supabaseServiceKey?.length || 0)
  console.log()
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas!')
    console.log('📋 Variáveis necessárias:')
    console.log('- SUPABASE_URL ou VITE_SUPABASE_URL')
    console.log('- SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_SERVICE_ROLE_KEY')
    return
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('✅ Cliente Supabase criado com sucesso')
    
    // Testar conexão básica
    console.log('🔍 Testando conexão básica...')
    const { data: testData, error: testError } = await supabase
      .from('tenant_integrations')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Erro na conexão básica:', testError)
      return
    }
    
    console.log('✅ Conexão básica funcionando')
    
    // Testar busca específica
    const tenantId = '8d2888f1-64a5-445f-84f5-2614d5160251'
    const integrationType = 'asaas'
    
    console.log(`🔍 Testando busca específica para tenant: ${tenantId}`)
    
    const { data, error } = await supabase
      .from('tenant_integrations')
      .select('config, webhook_token')
      .eq('tenant_id', tenantId)
      .eq('integration_type', integrationType)
      .eq('is_active', true)
      .single()
    
    console.log('📋 Resultado da busca:', { data, error })
    
    if (error) {
      console.error('❌ Erro na busca específica:', error)
      return
    }
    
    if (!data) {
      console.log('⚠️ Nenhum dado encontrado')
      return
    }
    
    console.log('✅ Dados encontrados:')
    console.log('🔧 Config presente:', !!data.config)
    console.log('🔐 Webhook token presente:', !!data.webhook_token)
    
    if (data.config) {
      console.log('📊 Config keys:', Object.keys(data.config))
    }
    
    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!')
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

async function main() {
  await testEdgeFunctionDbConnection()
}

main().catch(console.error)
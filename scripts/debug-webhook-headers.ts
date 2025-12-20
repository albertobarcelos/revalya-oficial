#!/usr/bin/env tsx

/**
 * Script para debugar headers do webhook ASAAS
 * Identifica problemas de autorização e configuração
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas:')
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌')
  console.error('VITE_SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌')
  process.exit(1)
}

// Payload real do webhook que falhou
const REAL_WEBHOOK_PAYLOAD = {
  "id": "evt_05b708f961d739ea7eba7e4db318f621&1076945482",
  "event": "PAYMENT_CREATED",
  "dateCreated": "2025-10-01 01:39:55",
  "payment": {
    "object": "payment",
    "id": "pay_p8yiz9fi2x9o7kv6",
    "dateCreated": "2025-10-01",
    "customer": "cus_000125181151",
    "subscription": "sub_1gjkuywqydjdwz0b",
    "checkoutSession": null,
    "paymentLink": null,
    "value": 950,
    "netValue": 921.11,
    "originalValue": null,
    "interestValue": null,
    "description": "LICENÇA PDV LEGAL - Valor referente a mensalidade do sistema PDV Legal. Inclui suporte técnico e atualizações. A cobrança será realizada mensalmente",
    "billingType": "CREDIT_CARD",
    "confirmedDate": null,
    "creditCard": {
      "creditCardNumber": "0121",
      "creditCardBrand": "VISA"
    },
    "pixTransaction": null,
    "status": "PENDING",
    "dueDate": "2025-11-09",
    "originalDueDate": "2025-11-09",
    "paymentDate": null,
    "clientPaymentDate": null,
    "installmentNumber": null,
    "invoiceUrl": "https://www.asaas.com/i/p8yiz9fi2x9o7kv6",
    "invoiceNumber": "645810486",
    "externalReference": "558225f5-70db-44fe-95d2-830df18526df",
    "deleted": false,
    "anticipated": false,
    "anticipable": false,
    "creditDate": null,
    "estimatedCreditDate": null,
    "transactionReceiptUrl": null,
    "nossoNumero": null,
    "bankSlipUrl": null,
    "lastInvoiceViewedDate": null,
    "lastBankSlipViewedDate": null,
    "discount": {
      "value": 0,
      "limitDate": null,
      "dueDateLimitDays": 0,
      "type": "FIXED"
    },
    "fine": {
      "value": 0,
      "type": "FIXED"
    },
    "interest": {
      "value": 0,
      "type": "PERCENTAGE"
    },
    "postalService": false,
    "escrow": null,
    "refunds": null
  }
}

function generateHmacSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

async function debugWebhookConfiguration() {
  console.log('🔍 DEBUGANDO CONFIGURAÇÃO DO WEBHOOK ASAAS')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  // 1. Buscar tenant pelo external_reference
  const externalRef = REAL_WEBHOOK_PAYLOAD.payment.externalReference
  console.log(`\n📋 External Reference: ${externalRef}`)
  
  // Primeiro, vamos buscar o tenant que tem webhook configurado
  const { data: integrations, error: intError } = await supabase
    .from('tenant_integrations')
    .select('*')
    .eq('integration_type', 'asaas')
    .eq('is_active', true)
    .not('webhook_url', 'is', null)
    .not('webhook_token', 'is', null)
  
  if (intError) {
    console.error('❌ Erro ao buscar integrações:', intError)
    return
  }
  
  if (!integrations || integrations.length === 0) {
    console.log('❌ PROBLEMA: Nenhuma integração ASAAS ativa com webhook configurado encontrada')
    return
  }
  
  console.log(`\n✅ Encontradas ${integrations.length} integração(ões) ASAAS com webhook configurado:`)
  
  for (const integration of integrations) {
    console.log(`\n🏢 TENANT: ${integration.tenant_id}`)
    console.log(`📡 Webhook URL: ${integration.webhook_url}`)
    console.log(`🔑 Webhook Token: ${integration.webhook_token ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`)
    
    // 2. Testar geração de HMAC
    if (integration.webhook_token) {
      const payloadString = JSON.stringify(REAL_WEBHOOK_PAYLOAD)
      const hmacSignature = generateHmacSignature(payloadString, integration.webhook_token)
      console.log(`🔐 HMAC Gerado: ${hmacSignature}`)
      
      // 3. Testar chamada para o webhook
      console.log(`\n🧪 TESTANDO WEBHOOK...`)
      
      try {
        const response = await fetch(integration.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'asaas-signature': hmacSignature,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: payloadString
        })
        
        const responseText = await response.text()
        
        console.log(`📊 Status: ${response.status}`)
        console.log(`📝 Response: ${responseText}`)
        
        if (response.ok) {
          console.log('✅ WEBHOOK FUNCIONANDO CORRETAMENTE!')
          
          // 4. Verificar se os dados foram inseridos na staging
          console.log('\n🔍 Verificando dados na staging...')
          
          const { data: stagingData, error: stagingError } = await supabase
            .from('conciliation_staging')
            .select('*')
            .eq('tenant_id', integration.tenant_id)
            .eq('external_id', REAL_WEBHOOK_PAYLOAD.payment.id)
            .order('created_at', { ascending: false })
            .limit(1)
          
          if (stagingError) {
            console.error('❌ Erro ao verificar staging:', stagingError)
          } else if (stagingData && stagingData.length > 0) {
            console.log('✅ Dados encontrados na staging:')
            console.log(JSON.stringify(stagingData[0], null, 2))
          } else {
            console.log('⚠️ Dados não encontrados na staging')
          }
          
        } else {
          console.log('❌ WEBHOOK COM PROBLEMA!')
          
          if (response.status === 401) {
            console.log('🔍 Problema de autenticação detectado')
            console.log('   - Verificar se o webhook_token está correto')
            console.log('   - Verificar se a assinatura HMAC está sendo gerada corretamente')
          }
        }
        
      } catch (error) {
        console.error('❌ Erro na chamada do webhook:', error)
      }
    }
  }
  
  // 5. Verificar logs do Edge Function
  console.log('\n📋 Para verificar logs detalhados, execute:')
  console.log('supabase functions logs asaas-webhook-charges --follow')
}

async function main() {
  console.log('🔍 Iniciando debug do webhook ASAAS...')
  
  try {
    await debugWebhookConfiguration()
  } catch (error) {
    console.error('❌ Erro durante debug:', error)
    process.exit(1)
  }
}

// Executar se for o arquivo principal
main().catch(console.error)
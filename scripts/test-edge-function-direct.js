#!/usr/bin/env tsx

// Script para testar diretamente a Edge Function
import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

// AIDEV-NOTE: URL do webhook incluindo o tenant_id ao final
const TENANT_ID = '8d2888f1-64a5-445f-84f5-2614d5160251'
const WEBHOOK_URL = `https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/asaas-webhook-charges/${TENANT_ID}`
const WEBHOOK_TOKEN = 'webhook_secret_test_123'

// Payload de teste com external_reference válido para tenant (baseado em charge real)
const testPayload = {
  event: 'PAYMENT_RECEIVED',
  payment: {
    id: 'pay_123456789',
    customer: 'cus_test_456',
    value: 100.00,
    netValue: 95.00,
    status: 'RECEIVED',
    billingType: 'PIX',
    dueDate: '2025-01-15',
    externalReference: '558225f5-70db-44fe-95d2-830df18526df',
    description: 'Teste de webhook com charge real'
  }
}

// AIDEV-NOTE: Função para gerar assinatura HMAC usando Web Crypto API (compatível com Deno)
async function generateHmacSignature(payload, secret) {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const payloadData = encoder.encode(payload)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadData)
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return signature
}

async function testEdgeFunction() {
  console.log('🧪 TESTANDO EDGE FUNCTION DIRETAMENTE\n')
  
  const payloadString = JSON.stringify(testPayload)
  const signature = await generateHmacSignature(payloadString, WEBHOOK_TOKEN)
  
  console.log('📋 Dados do teste:')
  console.log('🔗 URL:', WEBHOOK_URL)
  console.log('📦 Payload:', payloadString)
  console.log('🔐 Token:', WEBHOOK_TOKEN)
  console.log('🔏 Signature:', signature)
  console.log()
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-signature': signature,
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY`
      },
      body: payloadString
    })
    
    const responseText = await response.text()
    
    console.log('📊 Resposta da Edge Function:')
    console.log('🔢 Status:', response.status)
    console.log('📝 Headers:', Object.fromEntries(response.headers.entries()))
    console.log('📄 Body:', responseText)
    
    if (response.status === 200) {
      console.log('\n✅ SUCESSO: Edge Function processou o webhook!')
    } else {
      console.log('\n❌ ERRO: Edge Function retornou erro')
      
      // Tentar parsear o erro
      try {
        const errorData = JSON.parse(responseText)
        console.log('🔍 Detalhes do erro:', errorData)
      } catch {
        console.log('🔍 Resposta não é JSON válido')
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao chamar Edge Function:', error)
  }
}

async function main() {
  await testEdgeFunction()
  
  console.log('\n📋 Para ver logs detalhados da Edge Function:')
  console.log('supabase functions logs asaas-webhook-charges --follow')
}

main().catch(console.error)
// =====================================================
// EDGE FUNCTION: ASAAS WEBHOOK CHARGES
// Descrição: Processa webhooks do ASAAS para conciliation_staging
// Autor: Barcelitos AI Agent
// Data: 2025-01-09
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// AIDEV-NOTE: Interfaces para tipagem dos dados ASAAS
interface AsaasWebhookPayload {
  event: string
  payment: {
    id: string
    customer: string
    subscription?: string
    value: number
    netValue?: number
    originalValue?: number
    interestValue?: number
    description?: string
    billingType: string
    status: string
    pixTransaction?: any
    creditCard?: any
    installmentCount?: number
    installmentNumber?: number
    dueDate: string
    originalDueDate?: string
    paymentDate?: string
    clientPaymentDate?: string
    confirmedDate?: string
    creditDate?: string
    estimatedCreditDate?: string
    invoiceUrl?: string
    bankSlipUrl?: string
    transactionReceiptUrl?: string
    externalReference?: string
    discount?: {
      value: number
      limitDate?: string
    }
    fine?: {
      value: number
    }
    interest?: {
      value: number
    }
    deleted: boolean
    anticipated?: boolean
    anticipable?: boolean
  }
}

interface AsaasCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  mobilePhone?: string
  cpfCnpj?: string
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
  country?: string
}

// AIDEV-NOTE: Função para validar assinatura HMAC SHA-256
async function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return signature.toLowerCase() === expectedSignature.toLowerCase()
  } catch (error) {
    console.error('Erro na validação da assinatura:', error)
    return false
  }
}

// AIDEV-NOTE: Função para buscar dados do cliente ASAAS
async function fetchAsaasCustomer(customerId: string, apiKey: string): Promise<AsaasCustomer | null> {
  try {
    const response = await fetch(`https://www.asaas.com/api/v3/customers/${customerId}`, {
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error(`Erro ao buscar cliente ASAAS: ${response.status}`)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Erro na requisição para ASAAS:', error)
    return null
  }
}

// AIDEV-NOTE: Função para determinar o tenant_id baseado no webhook
async function determineTenantId(supabase: any, payload: AsaasWebhookPayload): Promise<string | null> {
  try {
    // AIDEV-NOTE: Busca tenant baseado na referência externa ou configuração
    const { data: tenantIntegration, error } = await supabase
      .from('tenant_integrations')
      .select('tenant_id, config')
      .eq('integration_type', 'ASAAS')
      .eq('status', 'active')
      .single()
    
    if (error || !tenantIntegration) {
      console.error('Erro ao buscar tenant integration:', error)
      return null
    }
    
    return tenantIntegration.tenant_id
  } catch (error) {
    console.error('Erro ao determinar tenant_id:', error)
    return null
  }
}

// AIDEV-NOTE: Função principal da Edge Function
serve(async (req) => {
  // AIDEV-NOTE: Configuração CORS para permitir webhooks
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // AIDEV-NOTE: Validação do método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Leitura do payload
    const rawPayload = await req.text()
    let webhookPayload: AsaasWebhookPayload

    try {
      webhookPayload = JSON.parse(rawPayload)
    } catch (parseError) {
      console.error('Erro ao fazer parse do payload:', parseError)
      return new Response(
        JSON.stringify({ error: 'Payload inválido' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Validação da estrutura do payload
    if (!webhookPayload.event || !webhookPayload.payment || !webhookPayload.payment.id) {
      return new Response(
        JSON.stringify({ error: 'Estrutura do payload inválida' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Inicialização do cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // AIDEV-NOTE: Determinação do tenant_id
    const tenantId = await determineTenantId(supabase, webhookPayload)
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant não encontrado' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Validação da assinatura HMAC (se configurada)
    const webhookSignature = req.headers.get('asaas-signature')
    const webhookSecret = Deno.env.get('ASAAS_WEBHOOK_SECRET')
    
    if (webhookSecret && webhookSignature) {
      const isValidSignature = await validateWebhookSignature(
        rawPayload,
        webhookSignature,
        webhookSecret
      )
      
      if (!isValidSignature) {
        console.error('Assinatura do webhook inválida')
        return new Response(
          JSON.stringify({ error: 'Assinatura inválida' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // AIDEV-NOTE: Extração dos dados do payment
    const payment = webhookPayload.payment
    
    // AIDEV-NOTE: Busca dados do cliente ASAAS (opcional)
    let customerData: AsaasCustomer | null = null
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')
    
    if (asaasApiKey && payment.customer) {
      customerData = await fetchAsaasCustomer(payment.customer, asaasApiKey)
    }

    // AIDEV-NOTE: Preparação dos dados para inserção
    const stagingData = {
      tenant_id: tenantId,
      id_externo: payment.id,
      asaas_customer_id: payment.customer,
      asaas_subscription_id: payment.subscription || null,
      
      // Dados financeiros
      valor: payment.originalValue || payment.value,
      valor_pago: payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' ? payment.value : null,
      valor_liquido: payment.netValue || null,
      taxa_asaas: payment.originalValue && payment.netValue 
        ? (payment.originalValue - payment.netValue) 
        : null,
      
      // Status e método
      status: payment.status,
      payment_method: payment.billingType,
      
      // Datas
      data_vencimento: payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : null,
      data_pagamento: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
      data_confirmacao: payment.confirmedDate ? new Date(payment.confirmedDate).toISOString() : null,
      
      // Dados do cliente
      customer_name: customerData?.name || null,
      customer_email: customerData?.email || null,
      customer_document: customerData?.cpfCnpj || null,
      customer_phone: customerData?.phone || customerData?.mobilePhone || null,
      
      // Dados adicionais
      description: payment.description || null,
      external_reference: payment.externalReference || null,
      installment_number: payment.installmentNumber || null,
      installment_count: payment.installmentCount || null,
      
      // Controle
      raw_data: webhookPayload,
      webhook_event: webhookPayload.event,
      webhook_signature: webhookSignature || null,
      processed: false,
      processing_attempts: 0
    }

    // AIDEV-NOTE: Inserção com UPSERT para evitar duplicatas
    const { data, error } = await supabase
      .from('conciliation_staging')
      .upsert(stagingData, {
        onConflict: 'tenant_id,id_externo',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Erro ao inserir dados no staging:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Erro interno do servidor',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Log de sucesso
    console.log(`Webhook processado com sucesso:`, {
      event: webhookPayload.event,
      payment_id: payment.id,
      tenant_id: tenantId,
      status: payment.status,
      value: payment.value
    })

    // AIDEV-NOTE: Resposta de sucesso
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Webhook processado com sucesso',
        payment_id: payment.id,
        event: webhookPayload.event,
        processed_at: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro não tratado na Edge Function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
// =====================================================
// WEBHOOK SERVICE
// Descrição: Serviço para gerenciamento de webhooks ASAAS
// Autor: Barcelitos AI Agent
// Data: 2025-01-09
// =====================================================

import { supabase } from '@/lib/supabase'
import { validateHmacToken, generateSecureToken } from '@/lib/security'
import { logService } from './logService'

// AIDEV-NOTE: Interface para resposta do webhook
interface WebhookResponse {
  success: boolean
  message: string
}

// AIDEV-NOTE: Função para configurar webhook no ASAAS
async function configureAsaasWebhook(
  apiKey: string,
  apiUrl: string,
  webhookUrl: string,
  webhookToken: string
): Promise<WebhookResponse> {
  try {
    // AIDEV-NOTE: Configuração do webhook no ASAAS
    const response = await fetch(`${apiUrl}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey
      },
      body: JSON.stringify({
        url: webhookUrl,
        email: 'suporte@nexsyn.com.br',
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        authToken: webhookToken
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Erro ao configurar webhook: ${error.message || response.statusText}`)
    }

    return {
      success: true,
      message: 'Webhook configurado com sucesso'
    }
  } catch (error) {
    logService.error('Erro ao configurar webhook ASAAS:', error)
    return {
      success: false,
      message: error.message || 'Erro ao configurar webhook'
    }
  }
}

// AIDEV-NOTE: Função para remover webhook do ASAAS
async function removeAsaasWebhook(
  apiKey: string,
  apiUrl: string
): Promise<WebhookResponse> {
  try {
    // AIDEV-NOTE: Remoção do webhook no ASAAS
    const response = await fetch(`${apiUrl}/webhook`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Erro ao remover webhook: ${error.message || response.statusText}`)
    }

    return {
      success: true,
      message: 'Webhook removido com sucesso'
    }
  } catch (error) {
    logService.error('Erro ao remover webhook ASAAS:', error)
    return {
      success: false,
      message: error.message || 'Erro ao remover webhook'
    }
  }
}

// AIDEV-NOTE: Função para configurar webhook do tenant
export async function setupTenantWebhook(
  tenantId: string,
  webhookUrl: string
): Promise<WebhookResponse> {
  try {
    // AIDEV-NOTE: Busca credenciais do tenant
    const { data: credentials, error: credentialsError } = await supabase
      .rpc('get_tenant_asaas_credentials', {
        p_tenant_id: tenantId
      })
      .single()

    if (credentialsError || !credentials) {
      throw new Error('Erro ao buscar credenciais do tenant')
    }

    // AIDEV-NOTE: Gera token seguro para o webhook usando Web Crypto API
    const webhookToken = generateSecureToken(32)

    // AIDEV-NOTE: Configura webhook no ASAAS
    const asaasResponse = await configureAsaasWebhook(
      credentials.api_key,
      credentials.api_url,
      webhookUrl,
      webhookToken
    )

    if (!asaasResponse.success) {
      throw new Error(asaasResponse.message)
    }

    // AIDEV-NOTE: Salva configuração do webhook no banco
    const { error: saveError } = await supabase
      .rpc('setup_asaas_webhook', {
        p_tenant_id: tenantId,
        p_webhook_url: webhookUrl,
        p_webhook_token: webhookToken
      })

    if (saveError) {
      // AIDEV-NOTE: Se falhar ao salvar, tenta remover o webhook do ASAAS
      await removeAsaasWebhook(credentials.api_key, credentials.api_url)
      throw new Error('Erro ao salvar configuração do webhook')
    }

    return {
      success: true,
      message: 'Webhook configurado com sucesso'
    }
  } catch (error) {
    logService.error('Erro ao configurar webhook do tenant:', error)
    return {
      success: false,
      message: error.message || 'Erro ao configurar webhook'
    }
  }
}

// AIDEV-NOTE: Função para remover webhook do tenant
export async function removeTenantWebhook(tenantId: string): Promise<WebhookResponse> {
  try {
    // AIDEV-NOTE: Busca credenciais do tenant
    const { data: credentials, error: credentialsError } = await supabase
      .rpc('get_tenant_asaas_credentials', {
        p_tenant_id: tenantId
      })
      .single()

    if (credentialsError || !credentials) {
      throw new Error('Erro ao buscar credenciais do tenant')
    }

    // AIDEV-NOTE: Remove webhook do ASAAS
    const asaasResponse = await removeAsaasWebhook(
      credentials.api_key,
      credentials.api_url
    )

    if (!asaasResponse.success) {
      throw new Error(asaasResponse.message)
    }

    // AIDEV-NOTE: Remove configuração do webhook no banco
    const { error: saveError } = await supabase
      .rpc('setup_asaas_webhook', {
        p_tenant_id: tenantId,
        p_webhook_url: null,
        p_webhook_token: null
      })

    if (saveError) {
      throw new Error('Erro ao remover configuração do webhook')
    }

    return {
      success: true,
      message: 'Webhook removido com sucesso'
    }
  } catch (error) {
    logService.error('Erro ao remover webhook do tenant:', error)
    return {
      success: false,
      message: error.message || 'Erro ao remover webhook'
    }
  }
}

// AIDEV-NOTE: Função para validar assinatura do webhook
export async function validateWebhookSignature(
  payload: string,
  signature: string,
  webhookToken: string
): Promise<boolean> {
  try {
    return await validateHmacToken(payload, signature, webhookToken)
  } catch (error) {
    logService.error('Erro ao validar assinatura do webhook:', error)
    return false
  }
}

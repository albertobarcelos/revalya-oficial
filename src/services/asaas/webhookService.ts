// =====================================================
// ASAAS WEBHOOK SERVICE
// Descrição: Serviço para gerenciar webhooks do ASAAS
// Autor: Barcelitos AI Agent
// Data: 2025-01-09
// =====================================================

import { supabase } from '@/lib/supabase'
import { generateSecureToken, validateHmacToken } from '@/lib/security'

// AIDEV-NOTE: Interface para configuração do webhook
interface WebhookConfig {
  url: string
  token: string
}

// AIDEV-NOTE: Interface para resposta da API ASAAS
interface AsaasApiResponse {
  success: boolean
  message?: string
  error?: string
}

// AIDEV-NOTE: Função para gerar URL do webhook
function generateWebhookUrl(tenantId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'https://wyehpiutzvwplllumgdk.supabase.co/functions/v1';
  return `${baseUrl}/asaas-webhook-charges/${tenantId}`;
}

// AIDEV-NOTE: Função para configurar webhook no ASAAS
async function configureAsaasWebhook(
  tenantId: string,
  apiKey: string,
  apiUrl: string,
  webhookConfig: WebhookConfig
): Promise<AsaasApiResponse> {
  try {
    // AIDEV-NOTE: Configura webhook no ASAAS
    const response = await fetch(`${apiUrl}/v3/webhook`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookConfig.url,
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        authToken: webhookConfig.token,
        type: 'PAYMENT'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Erro ao configurar webhook no ASAAS:', error)
      return {
        success: false,
        error: error.message || 'Erro ao configurar webhook no ASAAS'
      }
    }

    // AIDEV-NOTE: Atualiza configuração no banco
    const { data, error } = await supabase
      .rpc('setup_asaas_webhook', {
        p_tenant_id: tenantId,
        p_webhook_url: webhookConfig.url,
        p_webhook_token: webhookConfig.token
      })

    if (error) {
      console.error('Erro ao salvar configuração do webhook:', error)
      return {
        success: false,
        error: 'Erro ao salvar configuração do webhook'
      }
    }

    if (!data || !data[0] || !data[0].success) {
      return {
        success: false,
        error: data?.[0]?.message || 'Erro ao salvar configuração do webhook'
      }
    }

    return {
      success: true,
      message: 'Webhook configurado com sucesso'
    }
  } catch (error) {
    console.error('Erro ao configurar webhook:', error)
    return {
      success: false,
      error: 'Erro ao configurar webhook'
    }
  }
}

// AIDEV-NOTE: Função para configurar webhook para um tenant
export async function setupTenantWebhook(tenantId: string): Promise<AsaasApiResponse> {
  try {
    // AIDEV-NOTE: Busca credenciais do tenant
    const { data: credentials, error: credentialsError } = await supabase
      .rpc('get_tenant_asaas_credentials', {
        p_tenant_id: tenantId
      })
      .single()

    if (credentialsError || !credentials) {
      console.error('Erro ao buscar credenciais:', credentialsError)
      return {
        success: false,
        error: 'Credenciais não encontradas'
      }
    }

    // AIDEV-NOTE: Gera configuração do webhook
    const webhookConfig: WebhookConfig = {
      url: generateWebhookUrl(tenantId),
      token: generateSecureToken(32) // Token de 32 caracteres
    }

    // AIDEV-NOTE: Configura webhook
    return await configureAsaasWebhook(
      tenantId,
      credentials.api_key,
      credentials.api_url,
      webhookConfig
    )
  } catch (error) {
    console.error('Erro ao configurar webhook do tenant:', error)
    return {
      success: false,
      error: 'Erro ao configurar webhook do tenant'
    }
  }
}

// AIDEV-NOTE: Função para remover webhook do ASAAS
export async function removeTenantWebhook(tenantId: string): Promise<AsaasApiResponse> {
  try {
    // AIDEV-NOTE: Busca credenciais do tenant
    const { data: credentials, error: credentialsError } = await supabase
      .rpc('get_tenant_asaas_credentials', {
        p_tenant_id: tenantId
      })
      .single()

    if (credentialsError || !credentials) {
      console.error('Erro ao buscar credenciais:', credentialsError)
      return {
        success: false,
        error: 'Credenciais não encontradas'
      }
    }

    // AIDEV-NOTE: Remove webhook no ASAAS
    const response = await fetch(`${credentials.api_url}/v3/webhook`, {
      method: 'DELETE',
      headers: {
        'access_token': credentials.api_key,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Erro ao remover webhook no ASAAS:', error)
      return {
        success: false,
        error: error.message || 'Erro ao remover webhook no ASAAS'
      }
    }

    // AIDEV-NOTE: Limpa configuração no banco
    const { data, error } = await supabase
      .rpc('setup_asaas_webhook', {
        p_tenant_id: tenantId,
        p_webhook_url: null,
        p_webhook_token: null
      })

    if (error) {
      console.error('Erro ao limpar configuração do webhook:', error)
      return {
        success: false,
        error: 'Erro ao limpar configuração do webhook'
      }
    }

    if (!data || !data[0] || !data[0].success) {
      return {
        success: false,
        error: data?.[0]?.message || 'Erro ao limpar configuração do webhook'
      }
    }

    return {
      success: true,
      message: 'Webhook removido com sucesso'
    }
  } catch (error) {
    console.error('Erro ao remover webhook do tenant:', error)
    return {
      success: false,
      error: 'Erro ao remover webhook do tenant'
    }
  }
}

// AIDEV-NOTE: Interface para status do webhook
interface WebhookStatus {
  isConfigured: boolean
  url?: string
  token?: string
}

// AIDEV-NOTE: Função para verificar status do webhook
export async function checkWebhookStatus(tenantId: string): Promise<WebhookStatus> {
  try {
    // AIDEV-NOTE: Busca configuração do webhook
    const { data, error } = await supabase
      .rpc('get_tenant_asaas_webhook', {
        p_tenant_id: tenantId
      })
      .single()

    if (error) {
      console.error('Erro ao buscar status do webhook:', error)
      return { isConfigured: false }
    }

    return {
      isConfigured: Boolean(data?.webhook_url && data?.webhook_token),
      url: data?.webhook_url,
      token: data?.webhook_token
    }
  } catch (error) {
    console.error('Erro ao verificar status do webhook:', error)
    return { isConfigured: false }
  }
}
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
  webhookConfig: WebhookConfig,
  contextAlreadySet: boolean = false
): Promise<AsaasApiResponse> {
  try {
    // AIDEV-NOTE: Configurar contexto do tenant se ainda não foi configurado
    if (!contextAlreadySet) {
      console.log('🔍 [DEBUG] Configurando contexto do tenant para configureAsaasWebhook:', tenantId)
      
      const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      })

      if (contextError) {
        console.error('❌ Erro ao configurar contexto do tenant:', contextError)
        return {
          success: false,
          error: 'Erro ao configurar contexto do tenant'
        }
      }
    }

    // AIDEV-NOTE: Configura webhook no ASAAS
    // AIDEV-NOTE: Seguindo documentação oficial: POST /v3/webhooks com events array
    const response = await fetch(`${apiUrl}/v3/webhooks`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Webhook Revalya - Tenant ${tenantId}`,
        url: webhookConfig.url,
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        authToken: webhookConfig.token,
        sendType: 'SEQUENTIALLY',
        events: [
          'PAYMENT_RECEIVED',
          'PAYMENT_CONFIRMED',
          'PAYMENT_OVERDUE',
          'PAYMENT_REFUNDED',
          'PAYMENT_DELETED',
          'PAYMENT_RESTORED',
          'PAYMENT_UPDATED',
          'PAYMENT_ANTICIPATED'
        ]
      })
    })

    if (!response.ok) {
      let errorMessage = 'Erro ao configurar webhook no ASAAS'
      try {
        const error = await response.json()
        // AIDEV-NOTE: API Asaas pode retornar errors array ou message direto
        if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
          errorMessage = error.errors[0].description || error.errors[0].code || errorMessage
        } else if (error.message) {
          errorMessage = error.message
        } else if (error.description) {
          errorMessage = error.description
        }
      } catch (parseError) {
        console.error('Erro ao parsear resposta de erro:', parseError)
        errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`
      }
      console.error('Erro ao configurar webhook no ASAAS:', errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    }

    // AIDEV-NOTE: Obtém dados do webhook criado (incluindo ID)
    const webhookData = await response.json()
    const webhookId = webhookData?.id

    // AIDEV-NOTE: Atualiza configuração no banco
    // AIDEV-NOTE: Nota: Se a função setup_asaas_webhook não suporta webhook_id, 
    // podemos adicionar esse campo depois ou usar uma tabela separada
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
    // AIDEV-NOTE: Configurar contexto do tenant para segurança multi-tenant
    console.log('🔍 [DEBUG] Configurando contexto do tenant para setup webhook:', tenantId)
    
    const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    })

    if (contextError) {
      console.error('❌ Erro ao configurar contexto do tenant:', contextError)
      return {
        success: false,
        error: 'Erro ao configurar contexto do tenant'
      }
    }

    // AIDEV-NOTE: Busca credenciais do tenant com contexto configurado
    const { data: credentials, error: credentialsError } = await supabase
      .rpc('get_tenant_asaas_credentials', {
        p_tenant_id: tenantId
      })
      .single()

    if (credentialsError || !credentials) {
      console.error('❌ Erro ao buscar credenciais:', credentialsError)
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

    // AIDEV-NOTE: Configura webhook (contexto já configurado)
    return await configureAsaasWebhook(
      tenantId,
      credentials.api_key,
      credentials.api_url,
      webhookConfig,
      true // contexto já foi configurado
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
    // AIDEV-NOTE: Configurar contexto do tenant para segurança multi-tenant
    console.log('🔍 [DEBUG] Configurando contexto do tenant para remover webhook:', tenantId)
    
    const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    })

    if (contextError) {
      console.error('❌ Erro ao configurar contexto do tenant:', contextError)
      return {
        success: false,
        error: 'Erro ao configurar contexto do tenant'
      }
    }

    // AIDEV-NOTE: Busca credenciais do tenant com contexto configurado
    const { data: credentials, error: credentialsError } = await supabase
      .rpc('get_tenant_asaas_credentials', {
        p_tenant_id: tenantId
      })
      .single()

    if (credentialsError || !credentials) {
      console.error('❌ Erro ao buscar credenciais:', credentialsError)
      return {
        success: false,
        error: 'Credenciais não encontradas'
      }
    }

    // AIDEV-NOTE: Busca configuração do webhook para obter a URL
    const { data: webhookData, error: webhookDataError } = await supabase
      .rpc('get_tenant_asaas_webhook', {
        p_tenant_id: tenantId
      })
      .single()

    if (webhookDataError || !webhookData?.webhook_url) {
      console.error('❌ Webhook não encontrado no banco de dados')
      // AIDEV-NOTE: Se não existe no banco, tenta limpar mesmo assim
    } else {
      // AIDEV-NOTE: Lista webhooks no ASAAS para encontrar o ID
      const listResponse = await fetch(`${credentials.api_url}/v3/webhooks?limit=100`, {
        method: 'GET',
        headers: {
          'access_token': credentials.api_key,
          'Content-Type': 'application/json'
        }
      })

      if (listResponse.ok) {
        const listData = await listResponse.json()
        const webhookToDelete = listData.data?.find(
          (wh: { url: string }) => wh.url === webhookData.webhook_url
        )

        if (webhookToDelete?.id) {
          // AIDEV-NOTE: Remove webhook no ASAAS usando o ID
          const deleteResponse = await fetch(`${credentials.api_url}/v3/webhooks/${webhookToDelete.id}`, {
            method: 'DELETE',
            headers: {
              'access_token': credentials.api_key,
              'Content-Type': 'application/json'
            }
          })

          if (!deleteResponse.ok) {
            const error = await deleteResponse.json()
            console.error('Erro ao remover webhook no ASAAS:', error)
            // AIDEV-NOTE: Continua para limpar no banco mesmo se falhar na API
          }
        } else {
          console.warn('⚠️ Webhook não encontrado na lista do ASAAS, pode já ter sido removido')
        }
      } else {
        console.warn('⚠️ Erro ao listar webhooks do ASAAS, tentando limpar apenas no banco')
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
    // AIDEV-NOTE: Configurar contexto do tenant para segurança multi-tenant
    console.log('🔍 [DEBUG] Configurando contexto do tenant para webhook:', tenantId)
    
    const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    })

    if (contextError) {
      console.error('❌ Erro ao configurar contexto do tenant:', contextError)
      return { isConfigured: false }
    }

    // AIDEV-NOTE: Busca configuração do webhook com contexto configurado
    const { data, error } = await supabase
      .rpc('get_tenant_asaas_webhook', {
        p_tenant_id: tenantId
      })
      .single()

    if (error) {
      console.error('❌ Erro ao buscar status do webhook:', error)
      return { isConfigured: false }
    }

    console.log('✅ [DEBUG] Status do webhook carregado com sucesso:', {
      tenantId,
      isConfigured: Boolean(data?.webhook_url && data?.webhook_token),
      hasUrl: Boolean(data?.webhook_url),
      hasToken: Boolean(data?.webhook_token)
    })

    return {
      isConfigured: Boolean(data?.webhook_url && data?.webhook_token),
      url: data?.webhook_url,
      token: data?.webhook_token
    }
  } catch (error) {
    console.error('❌ Erro ao verificar status do webhook:', error)
    return { isConfigured: false }
  }
}
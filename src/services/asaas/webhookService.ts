// =====================================================
// ASAAS WEBHOOK SERVICE
// Descrição: Serviço para gerenciar webhooks do ASAAS
// Autor: Barcelitos AI Agent
// Data: 2025-01-09
// =====================================================

import { supabase } from '@/lib/supabase'
import { generateSecureToken, validateHmacToken } from '@/lib/security'

// AIDEV-NOTE: URL da Edge Function asaas-proxy
const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-proxy`

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
  // AIDEV-NOTE: Usar VITE_SUPABASE_URL que está disponível no cliente
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wyehpiutzvwplllumgdk.supabase.co'
  const baseUrl = `${supabaseUrl}/functions/v1`
  return `${baseUrl}/asaas-webhook-charges/${tenantId}`
}

// AIDEV-NOTE: Função para configurar webhook no ASAAS
async function configureAsaasWebhook(
  tenantId: string,
  apiKey: string,
  apiUrl: string,
  webhookConfig: WebhookConfig,
  environment: string = 'sandbox',
  contextAlreadySet: boolean = false
): Promise<AsaasApiResponse> {
  try {
    // AIDEV-NOTE: Configurar contexto do tenant se ainda não foi configurado
    // AIDEV-NOTE: Usar set_tenant_context_flexible com user_id para garantir autenticação
    if (!contextAlreadySet) {
      console.log('🔍 [DEBUG] Configurando contexto do tenant para configureAsaasWebhook:', tenantId)
      
      const { data: { session: sessionForContext } } = await supabase.auth.getSession()
      const { error: contextError } = await supabase.rpc('set_tenant_context_flexible', {
        p_tenant_id: tenantId,
        p_user_id: sessionForContext?.user?.id
      })

      if (contextError) {
        console.error('❌ Erro ao configurar contexto do tenant:', contextError)
        return {
          success: false,
          error: 'Erro ao configurar contexto do tenant'
        }
      }
    }

    // AIDEV-NOTE: Configura webhook no ASAAS via proxy (Edge Function)
    // AIDEV-NOTE: Seguindo documentação oficial: POST /v3/webhooks com events array
    // AIDEV-NOTE: Usar proxy para evitar CORS e expor API key no cliente
    
    // AIDEV-NOTE: Obter sessão para autenticação e email do usuário
    const { data: { session } } = await supabase.auth.getSession()
    const userEmail = session?.user?.email || 'webhook@revalya.com.br' // Fallback se não tiver email
    
    // AIDEV-NOTE: Buscar slug ou nome do tenant para usar no nome do webhook
    let tenantDisplayName = tenantId // Fallback para ID se não encontrar
    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('slug, name')
        .eq('id', tenantId)
        .maybeSingle()
      
      if (tenantData) {
        // AIDEV-NOTE: Priorizar slug, se não tiver usar name, se não tiver usar ID
        tenantDisplayName = tenantData.slug || tenantData.name || tenantId
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar dados do tenant, usando ID:', error)
      // Mantém o fallback para tenantId
    }
    
    // AIDEV-NOTE: Verificar se já existe webhook configurado antes de criar
    // AIDEV-NOTE: Se existir, vamos atualizar ao invés de criar novo
    const listPath = '/webhooks?limit=100'
    
    let existingWebhookId: string | null = null
    
    try {
      const listResponse = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          path: listPath,
          method: 'GET',
          tenant_id: tenantId,
          environment: environment
        })
      })
      
      if (listResponse.ok) {
        const listResponseText = await listResponse.text()
        let listData: any = null
        
        try {
          listData = listResponseText ? JSON.parse(listResponseText) : null
        } catch (parseError) {
          console.warn('⚠️ Erro ao parsear lista de webhooks:', parseError)
        }
        
        if (listData?.data && Array.isArray(listData.data)) {
          // AIDEV-NOTE: Verificar se já existe webhook com a mesma URL
          const existingWebhook = listData.data.find(
            (wh: { url: string }) => wh.url === webhookConfig.url
          )
          
          if (existingWebhook?.id) {
            existingWebhookId = existingWebhook.id
            console.log('🔍 [DEBUG] Webhook existente encontrado, será atualizado:', existingWebhookId)
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao verificar webhooks existentes, continuando com criação:', error)
    }
    
    // AIDEV-NOTE: Construir path - o asaas-proxy adiciona o path ao apiUrl
    // AIDEV-NOTE: O apiUrl do proxy já contém /v3, então usamos apenas /webhooks
    const basePath = existingWebhookId ? `/webhooks/${existingWebhookId}` : '/webhooks'
    const method = existingWebhookId ? 'PUT' : 'POST'
    
    // AIDEV-NOTE: Preparar body da requisição
    const requestBody = {
      path: basePath,
      method: method,
      data: {
        name: `Webhook Revalya - ${tenantDisplayName}`,
        url: webhookConfig.url,
        email: userEmail, // AIDEV-NOTE: Campo obrigatório segundo API Asaas
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        authToken: webhookConfig.token,
        sendType: 'SEQUENTIALLY',
        events: [
          'PAYMENT_CREATED',      // AIDEV-NOTE: Pagamento criado
          'PAYMENT_RECEIVED',     // AIDEV-NOTE: Pagamento recebido
          'PAYMENT_CONFIRMED',     // AIDEV-NOTE: Pagamento confirmado
          'PAYMENT_OVERDUE',       // AIDEV-NOTE: Pagamento vencido
          'PAYMENT_REFUNDED',      // AIDEV-NOTE: Pagamento estornado
          'PAYMENT_DELETED',       // AIDEV-NOTE: Pagamento deletado
          'PAYMENT_RESTORED',      // AIDEV-NOTE: Pagamento restaurado
          'PAYMENT_UPDATED',       // AIDEV-NOTE: Pagamento atualizado
          'PAYMENT_ANTICIPATED'    // AIDEV-NOTE: Pagamento antecipado
        ]
      },
      tenant_id: tenantId,
      environment: environment
    }
    
    console.log('🔍 [DEBUG] Enviando requisição para asaas-proxy:', {
      path: basePath,
      method: method,
      environment: environment,
      webhookUrl: webhookConfig.url,
      eventsCount: requestBody.data.events.length,
      isUpdate: !!existingWebhookId
    })
    
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        'x-tenant-id': tenantId
      },
      body: JSON.stringify(requestBody)
    })

    // AIDEV-NOTE: Ler resposta do proxy
    const responseText = await response.text()
    let responseData: any = null
    
    try {
      responseData = responseText ? JSON.parse(responseText) : null
    } catch (parseError) {
      console.error('Erro ao parsear resposta do proxy:', parseError)
    }

    if (!response.ok) {
      let errorMessage = 'Erro ao configurar webhook no ASAAS'
      try {
        // AIDEV-NOTE: Proxy pode retornar erro em formato diferente
        if (responseData?.error) {
          errorMessage = responseData.error
        } else if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          errorMessage = responseData.errors[0].description || responseData.errors[0].code || errorMessage
        } else if (responseData?.message) {
          errorMessage = responseData.message
        } else if (responseData?.description) {
          errorMessage = responseData.description
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
    const webhookData = responseData
    const webhookId = webhookData?.id

    // AIDEV-NOTE: Reconfigurar contexto do tenant antes de salvar no banco
    // AIDEV-NOTE: O contexto pode ter sido perdido após a chamada ao proxy
    // AIDEV-NOTE: Usar set_tenant_context_flexible com user_id para garantir autenticação
    console.log('🔍 [DEBUG] Reconfigurando contexto do tenant antes de salvar webhook:', tenantId)
    const { data: { session: sessionForContext } } = await supabase.auth.getSession()
    
    const { error: contextErrorBeforeSave } = await supabase.rpc('set_tenant_context_flexible', {
      p_tenant_id: tenantId,
      p_user_id: sessionForContext?.user?.id
    })

    if (contextErrorBeforeSave) {
      console.error('❌ Erro ao reconfigurar contexto do tenant:', contextErrorBeforeSave)
      return {
        success: false,
        error: 'Erro ao configurar contexto do tenant para salvar webhook'
      }
    }

    // AIDEV-NOTE: Atualiza configuração no banco diretamente na tabela
    // AIDEV-NOTE: Usar UPDATE direto em vez de RPC para evitar problemas de autenticação
    const { data: updateData, error: updateError } = await supabase
      .from('tenant_integrations')
      .update({
        webhook_url: webhookConfig.url,
        webhook_token: webhookConfig.token,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'asaas')
      .eq('is_active', true)
      .select()

    if (updateError) {
      console.error('Erro ao salvar configuração do webhook:', updateError)
      return {
        success: false,
        error: 'Erro ao salvar configuração do webhook: ' + (updateError.message || 'Erro desconhecido')
      }
    }

    if (!updateData || updateData.length === 0) {
      console.error('Nenhuma integração encontrada para atualizar')
      return {
        success: false,
        error: 'Integração Asaas não encontrada para atualizar o webhook'
      }
    }

    console.log('✅ [DEBUG] Webhook salvo com sucesso no banco:', {
      tenantId,
      webhookUrl: webhookConfig.url,
      updated: updateData.length > 0
    })

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
    // AIDEV-NOTE: Usar set_tenant_context_flexible com user_id para garantir autenticação
    console.log('🔍 [DEBUG] Configurando contexto do tenant para setup webhook:', tenantId)
    
    const { data: { session } } = await supabase.auth.getSession()
    const { error: contextError } = await supabase.rpc('set_tenant_context_flexible', {
      p_tenant_id: tenantId,
      p_user_id: session?.user?.id
    })

    if (contextError) {
      console.error('❌ Erro ao configurar contexto do tenant:', contextError)
      return {
        success: false,
        error: 'Erro ao configurar contexto do tenant'
      }
    }

    // AIDEV-NOTE: Busca integração do Asaas diretamente da tabela
    const { data: integration, error: integrationError } = await supabase
      .from('tenant_integrations')
      .select('config, is_active, environment')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'asaas')
      .eq('is_active', true)
      .maybeSingle()

    if (integrationError || !integration) {
      console.error('❌ Erro ao buscar integração Asaas:', integrationError)
      return {
        success: false,
        error: 'Integração Asaas não encontrada ou inativa. Configure as credenciais primeiro.'
      }
    }

    // AIDEV-NOTE: Tentar descriptografar chave API usando função RPC
    // Se não conseguir, usar texto plano do config (compatibilidade)
    let apiKey: string | null = null

    try {
      const { data: decryptedKey, error: decryptError } = await supabase.rpc('get_decrypted_api_key', {
        p_tenant_id: tenantId,
        p_integration_type: 'asaas'
      })

      if (!decryptError && decryptedKey) {
        apiKey = decryptedKey
        console.log('✅ [DEBUG] Chave API descriptografada com sucesso')
      } else {
        // Fallback: usar texto plano do config
        const config = integration.config || {}
        apiKey = config.api_key || null
        if (apiKey) {
          console.warn('⚠️ [DEBUG] Usando chave em texto plano (compatibilidade)')
        }
      }
    } catch (error) {
      // Se função não existir ou falhar, usar texto plano
      const config = integration.config || {}
      apiKey = config.api_key || null
      console.warn('⚠️ [DEBUG] Erro ao descriptografar, usando texto plano:', error)
    }

    if (!apiKey) {
      console.error('❌ API key não encontrada (criptografada ou texto plano)')
      return {
        success: false,
        error: 'Chave API do Asaas não encontrada. Verifique a configuração da integração.'
      }
    }

    // AIDEV-NOTE: Determina URL da API baseado no environment
    // AIDEV-NOTE: A URL pode já conter /v3 ou não, dependendo de como foi configurada
    const config = integration.config || {}
    const environment = config.environment || integration.environment || 'sandbox'
    const apiUrl = config.api_url || (environment === 'production' 
      ? 'https://api.asaas.com/v3' 
      : 'https://sandbox.asaas.com/v3')

    // AIDEV-NOTE: Gera configuração do webhook
    const webhookConfig: WebhookConfig = {
      url: generateWebhookUrl(tenantId),
      token: generateSecureToken(32) // Token de 32 caracteres
    }

    // AIDEV-NOTE: Configura webhook (contexto já configurado)
    return await configureAsaasWebhook(
      tenantId,
      apiKey,
      apiUrl,
      webhookConfig,
      environment, // environment para o proxy buscar credenciais corretas
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
    // AIDEV-NOTE: Usar set_tenant_context_flexible com user_id para garantir autenticação
    console.log('🔍 [DEBUG] Configurando contexto do tenant para remover webhook:', tenantId)
    
    const { data: { session } } = await supabase.auth.getSession()
    const { error: contextError } = await supabase.rpc('set_tenant_context_flexible', {
      p_tenant_id: tenantId,
      p_user_id: session?.user?.id
    })

    if (contextError) {
      console.error('❌ Erro ao configurar contexto do tenant:', contextError)
      return {
        success: false,
        error: 'Erro ao configurar contexto do tenant'
      }
    }

    // AIDEV-NOTE: Busca integração do Asaas diretamente da tabela
    const { data: integration, error: integrationError } = await supabase
      .from('tenant_integrations')
      .select('config, is_active, environment')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'asaas')
      .eq('is_active', true)
      .maybeSingle()

    if (integrationError || !integration) {
      console.error('❌ Erro ao buscar integração Asaas:', integrationError)
      return {
        success: false,
        error: 'Integração Asaas não encontrada ou inativa. Configure as credenciais primeiro.'
      }
    }

    // AIDEV-NOTE: Tentar descriptografar chave API usando função RPC
    let apiKey: string | null = null

    try {
      const { data: decryptedKey, error: decryptError } = await supabase.rpc('get_decrypted_api_key', {
        p_tenant_id: tenantId,
        p_integration_type: 'asaas'
      })

      if (!decryptError && decryptedKey) {
        apiKey = decryptedKey
      } else {
        // Fallback: usar texto plano do config
        const config = integration.config || {}
        apiKey = config.api_key || null
      }
    } catch (error) {
      // Se função não existir ou falhar, usar texto plano
      const config = integration.config || {}
      apiKey = config.api_key || null
    }

    if (!apiKey) {
      return {
        success: false,
        error: 'Chave API do Asaas não encontrada. Verifique a configuração da integração.'
      }
    }

    // AIDEV-NOTE: Determina URL da API baseado no environment
    // AIDEV-NOTE: A URL pode já conter /v3 ou não, dependendo de como foi configurada
    const config = integration.config || {}
    const environment = config.environment || integration.environment || 'sandbox'
    const apiUrl = config.api_url || (environment === 'production' 
      ? 'https://api.asaas.com/v3' 
      : 'https://sandbox.asaas.com/v3')

    // AIDEV-NOTE: Busca configuração do webhook diretamente da tabela
    // AIDEV-NOTE: Usar query direta em vez de RPC para evitar problemas de autenticação
    const { data: webhookData, error: webhookDataError } = await supabase
      .from('tenant_integrations')
      .select('webhook_url')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'asaas')
      .eq('is_active', true)
      .maybeSingle()

    if (webhookDataError || !webhookData?.webhook_url) {
      console.error('❌ Webhook não encontrado no banco de dados')
      // AIDEV-NOTE: Se não existe no banco, tenta limpar mesmo assim
    } else {
      // AIDEV-NOTE: Lista webhooks no ASAAS via proxy para encontrar o ID
      const { data: { session } } = await supabase.auth.getSession()
      const listPath = '/webhooks?limit=100'
      
      const listResponse = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          path: listPath,
          method: 'GET',
          tenant_id: tenantId,
          environment: environment
        })
      })

      if (listResponse.ok) {
        const listResponseText = await listResponse.text()
        let listData: any = null
        
        try {
          listData = listResponseText ? JSON.parse(listResponseText) : null
        } catch (parseError) {
          console.error('Erro ao parsear lista de webhooks:', parseError)
        }
        
        if (listData?.data) {
          const webhookToDelete = listData.data.find(
            (wh: { url: string }) => wh.url === webhookData.webhook_url
          )

          if (webhookToDelete?.id) {
            // AIDEV-NOTE: Remove webhook no ASAAS usando o ID via proxy
            const deletePath = `/webhooks/${webhookToDelete.id}`
            
            const deleteResponse = await fetch(PROXY_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                'x-tenant-id': tenantId
              },
              body: JSON.stringify({
                path: deletePath,
                method: 'DELETE',
                tenant_id: tenantId,
                environment: environment
              })
            })

            if (!deleteResponse.ok) {
              const deleteResponseText = await deleteResponse.text()
              let error: any = null
              try {
                error = deleteResponseText ? JSON.parse(deleteResponseText) : null
              } catch {
                error = { message: deleteResponseText || 'Erro desconhecido' }
              }
              console.error('Erro ao remover webhook no ASAAS:', error)
              // AIDEV-NOTE: Continua para limpar no banco mesmo se falhar na API
            }
          } else {
            console.warn('⚠️ Webhook não encontrado na lista do ASAAS, pode já ter sido removido')
          }
        }
      } else {
        console.warn('⚠️ Erro ao listar webhooks do ASAAS, tentando limpar apenas no banco')
      }
    }

    // AIDEV-NOTE: Limpa configuração no banco diretamente na tabela
    // AIDEV-NOTE: Usar UPDATE direto em vez de RPC para evitar problemas de autenticação
    const { data: updateData, error: updateError } = await supabase
      .from('tenant_integrations')
      .update({
        webhook_url: null,
        webhook_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'asaas')
      .eq('is_active', true)
      .select()

    if (updateError) {
      console.error('Erro ao limpar configuração do webhook:', updateError)
      return {
        success: false,
        error: 'Erro ao limpar configuração do webhook: ' + (updateError.message || 'Erro desconhecido')
      }
    }

    if (!updateData || updateData.length === 0) {
      console.warn('⚠️ Nenhuma integração encontrada para limpar webhook')
      // AIDEV-NOTE: Não é erro crítico se não encontrar, pode já estar limpo
    } else {
      console.log('✅ [DEBUG] Webhook removido com sucesso do banco:', {
        tenantId,
        updated: updateData.length > 0
      })
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
    // AIDEV-NOTE: Usar set_tenant_context_flexible com user_id para garantir autenticação
    console.log('🔍 [DEBUG] Configurando contexto do tenant para webhook:', tenantId)
    
    const { data: { session } } = await supabase.auth.getSession()
    const { error: contextError } = await supabase.rpc('set_tenant_context_flexible', {
      p_tenant_id: tenantId,
      p_user_id: session?.user?.id
    })

    if (contextError) {
      console.error('❌ Erro ao configurar contexto do tenant:', contextError)
      return { isConfigured: false }
    }

    // AIDEV-NOTE: Busca configuração do webhook diretamente da tabela
    // AIDEV-NOTE: Usar query direta em vez de RPC para evitar problemas de autenticação
    const { data: integrationData, error } = await supabase
      .from('tenant_integrations')
      .select('webhook_url, webhook_token')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'asaas')
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('❌ Erro ao buscar status do webhook:', error)
      return { isConfigured: false }
    }

    const isConfigured = Boolean(integrationData?.webhook_url && integrationData?.webhook_token)

    console.log('✅ [DEBUG] Status do webhook carregado com sucesso:', {
      tenantId,
      isConfigured,
      hasUrl: Boolean(integrationData?.webhook_url),
      hasToken: Boolean(integrationData?.webhook_token)
    })

    return {
      isConfigured,
      url: integrationData?.webhook_url || undefined,
      token: integrationData?.webhook_token || undefined
    }
  } catch (error) {
    console.error('❌ Erro ao verificar status do webhook:', error)
    return { isConfigured: false }
  }
}
// =====================================================
// TENANT HELPER FUNCTIONS
// Descrição: Funções auxiliares para gestão de tenant
// Autor: Barcelitos AI Agent
// Data: 2025-01-09
// =====================================================

import { SupabaseClient } from '@supabase/supabase-js'

// AIDEV-NOTE: Interface para credenciais ASAAS
interface AsaasCredentials {
  api_key: string
  api_url: string
  environment: string
  webhook_token?: string
}

// AIDEV-NOTE: Função para determinar tenant_id baseado na referência externa
export async function determineTenantId(
  supabase: SupabaseClient,
  externalReference?: string
): Promise<string | null> {
  try {
    if (!externalReference) {
      console.error('Referência externa não fornecida')
      return null
    }

    // AIDEV-NOTE: Busca tenant_id baseado na referência externa do ASAAS
    const { data: charge, error: chargeError } = await supabase
      .from('charges')
      .select('tenant_id')
      .eq('asaas_external_reference', externalReference)
      .single()

    if (chargeError || !charge) {
      console.error('Erro ao buscar charge:', chargeError)
      return null
    }

    return charge.tenant_id
  } catch (error) {
    console.error('Erro ao determinar tenant_id:', error)
    return null
  }
}

// AIDEV-NOTE: Interface para credenciais do tenant
interface TenantCredentials {
  api_key: string
  api_url: string
  webhook_token: string
  environment: string
}

// AIDEV-NOTE: Função para buscar credenciais do tenant
export async function getTenantCredentials(
  supabase: SupabaseClient,
  tenantId: string,
  integrationType: string
): Promise<TenantCredentials | null> {
  console.log(`[getTenantCredentials] Buscando credenciais para tenant: ${tenantId}, tipo: ${integrationType}`);
  
  const { data, error } = await supabase
    .from('tenant_integrations')
    .select('config, webhook_token')
    .eq('tenant_id', tenantId)
    .eq('integration_type', integrationType)
    .eq('is_active', true)
    .single();

  console.log('[getTenantCredentials] Query result:', { data, error });

  if (error) {
    console.error('[getTenantCredentials] Erro ao buscar credenciais:', error);
    return null;
  }

  if (!data) {
    console.log('[getTenantCredentials] Nenhuma integração encontrada');
    return null;
  }

  console.log('[getTenantCredentials] Dados encontrados:', {
    hasConfig: !!data.config,
    hasWebhookToken: !!data.webhook_token,
    configKeys: data.config ? Object.keys(data.config) : [],
    webhookToken: data.webhook_token
  });

  // Usar o campo 'config' que contém as configurações da integração
  const config = data.config || {};
  const webhookToken = data.webhook_token || config.webhook_token;

  console.log('[getTenantCredentials] Processando config:', {
    configApiKey: config.api_key ? 'PRESENTE' : 'AUSENTE',
    configApiUrl: config.api_url || 'AUSENTE',
    webhookTokenFinal: webhookToken ? 'PRESENTE' : 'AUSENTE'
  });

  if (!webhookToken) {
    console.log('[getTenantCredentials] Token de webhook não encontrado');
    return null;
  }

  const result = {
    api_key: config.api_key || '',
    api_url: config.api_url || '',
    webhook_token: webhookToken,
    environment: config.environment || 'production'
  };

  console.log('[getTenantCredentials] Retornando credenciais:', {
    hasApiKey: !!result.api_key,
    hasApiUrl: !!result.api_url,
    hasWebhookToken: !!result.webhook_token,
    environment: result.environment
  });

  return result;
}
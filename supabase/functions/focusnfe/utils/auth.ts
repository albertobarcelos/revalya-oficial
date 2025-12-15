// =====================================================
// FOCUSNFE AUTH UTILS
// Descrição: Utilitários de autenticação para FocusNFe
// Autor: Revalya AI Agent
// Data: 2025-12-14
// =====================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { FocusNFeConfig, FOCUSNFE_URLS } from '../types.ts';

// AIDEV-NOTE: Interface para credenciais do FocusNFe
export interface FocusNFeCredentials {
  token: string;
  baseUrl: string;
  ambiente: 'homologacao' | 'producao';
  config: FocusNFeConfig;
}

/**
 * AIDEV-NOTE: Busca as credenciais do FocusNFe para um tenant específico
 * Utiliza a tabela payment_gateways para armazenar configurações
 */
export async function getFocusNFeCredentials(
  supabase: SupabaseClient,
  tenantId: string
): Promise<FocusNFeCredentials | null> {
  console.log(`[FocusNFe Auth] Buscando credenciais para tenant: ${tenantId}`);

  // AIDEV-NOTE: Buscar configuração na tabela payment_gateways
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('api_key, environment, settings')
    .eq('tenant_id', tenantId)
    .eq('provider', 'focusnfe')
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('[FocusNFe Auth] Erro ao buscar credenciais:', error);
    return null;
  }

  if (!data) {
    console.log('[FocusNFe Auth] Nenhuma configuração FocusNFe encontrada');
    return null;
  }

  // AIDEV-NOTE: Validar se o token está presente
  if (!data.api_key) {
    console.error('[FocusNFe Auth] Token não configurado');
    return null;
  }

  // AIDEV-NOTE: Determinar ambiente (homologacao ou producao)
  const ambiente = (data.environment === 'producao' || data.environment === 'production') 
    ? 'producao' 
    : 'homologacao';

  // AIDEV-NOTE: Construir URL base
  const baseUrl = FOCUSNFE_URLS[ambiente];

  // AIDEV-NOTE: Extrair configurações
  const settings = data.settings || {};

  const config: FocusNFeConfig = {
    token: data.api_key,
    ambiente,
    emitente: settings.emitente || {},
    fiscal_defaults: settings.fiscal_defaults,
    webhook_url: settings.webhook_url
  };

  console.log('[FocusNFe Auth] Credenciais encontradas:', {
    hasToken: !!data.api_key,
    ambiente,
    hasEmitente: !!settings.emitente,
    hasFiscalDefaults: !!settings.fiscal_defaults
  });

  return {
    token: data.api_key,
    baseUrl,
    ambiente,
    config
  };
}

/**
 * AIDEV-NOTE: Valida o JWT do Supabase e retorna o usuário
 */
export async function validateSupabaseAuth(
  supabase: SupabaseClient,
  authHeader: string | null
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  if (!authHeader) {
    return { valid: false, error: 'Header de autorização não fornecido' };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { valid: false, error: error?.message || 'Usuário não autenticado' };
    }

    return { valid: true, userId: user.id };
  } catch (error) {
    console.error('[FocusNFe Auth] Erro ao validar autenticação:', error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Erro de autenticação'
    };
  }
}

/**
 * AIDEV-NOTE: Verifica se o tenant existe e está ativo
 */
export async function validateTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<{ valid: boolean; error?: string }> {
  if (!tenantId) {
    return { valid: false, error: 'Tenant ID não fornecido' };
  }

  // AIDEV-NOTE: Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    return { valid: false, error: 'Tenant ID inválido (deve ser UUID)' };
  }

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, status')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Tenant não encontrado' };
    }

    if (data.status !== 'active') {
      return { valid: false, error: 'Tenant não está ativo' };
    }

    return { valid: true };
  } catch (error) {
    console.error('[FocusNFe Auth] Erro ao validar tenant:', error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Erro ao validar tenant' 
    };
  }
}

/**
 * AIDEV-NOTE: Faz requisição autenticada para a API FocusNFe
 */
export async function focusNFeRequest<T>(
  credentials: FocusNFeCredentials,
  endpoint: string,
  options: {
    method: 'GET' | 'POST' | 'DELETE';
    body?: unknown;
    queryParams?: Record<string, string>;
  }
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  try {
    // AIDEV-NOTE: Construir URL com query params
    let url = `${credentials.baseUrl}${endpoint}`;
    
    if (options.queryParams) {
      const params = new URLSearchParams(options.queryParams);
      url += `?${params.toString()}`;
    }

    console.log(`[FocusNFe Request] ${options.method} ${url}`);

    // AIDEV-NOTE: Configurar headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${credentials.token}`,
      'Content-Type': 'application/json'
    };

    // AIDEV-NOTE: Fazer requisição
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const responseData = await response.json();

    console.log(`[FocusNFe Request] Status: ${response.status}`, {
      hasData: !!responseData,
      status: responseData?.status
    });

    if (!response.ok) {
      return {
        success: false,
        error: responseData?.mensagem || `Erro HTTP ${response.status}`,
        data: responseData as T,
        status: response.status
      };
    }

    return {
      success: true,
      data: responseData as T,
      status: response.status
    };

  } catch (error) {
    console.error('[FocusNFe Request] Erro na requisição:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro na requisição'
    };
  }
}

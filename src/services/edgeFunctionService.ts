// =====================================================
// EDGE FUNCTION SERVICE - MULTI-TENANT SECURITY
// Descrição: Serviço seguro para chamar Edge Functions do Supabase
// Segurança: JWT + Tenant Isolation + Validação Dupla + Auditoria
// Padrão: Conforme guia-implementacao-multi-tenant-seguro.md
// =====================================================

import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/tenantStore';
import { refreshAuthToken } from '@/utils/authUtils';

// AIDEV-NOTE: Interfaces tipadas para substituir 'any' e garantir type safety
export interface TenantContext {
  id: string;
  slug: string;
  name: string;
}

export interface SecureHeaders {
  'Content-Type': string;
  'Authorization': string;
  'x-tenant-id': string;
  'x-request-id': string;
  'x-timestamp': string;
}

export interface EdgeFunctionResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  data: T | null;
  error: EdgeFunctionError | null;
  text: () => Promise<string>;
  json: () => Promise<T>;
}

export interface EdgeFunctionError {
  status?: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// AIDEV-NOTE: Interface para erro estendido com propriedades adicionais
export interface ExtendedError extends Error {
  status?: number;
  statusText?: string;
  responseError?: unknown;
}

// AIDEV-NOTE: Interface específica para resposta da Edge Function de mensagens
export interface BulkMessageResponse {
  success: boolean;
  message: string;
  tenant_id: string; // Validação de segurança obrigatória
  results?: Array<{
    charge_id: string;
    success: boolean;
    message?: string;
    tenant_id: string; // Validação dupla por item
  }>;
  summary: {
    total: number;
    sent: number;
    failed: number;
    errors: number;
  };
}

// AIDEV-NOTE: Interface para request da Edge Function com validação de tenant
export interface SendBulkMessagesRequest {
  chargeIds: string[];
  templateId: string;
  sendImmediately?: boolean;
  tenant_id: string; // Validação obrigatória
}

// AIDEV-NOTE: Interface para opções de chamada de Edge Function
export interface EdgeFunctionOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requireTenant?: boolean;
  additionalHeaders?: Record<string, string>;
  maxRetries?: number;
  auditLog?: boolean;
}

// AIDEV-NOTE: Sistema de auditoria obrigatório conforme padrão de segurança
class SecurityAuditLogger {
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static logEdgeFunctionCall(
    functionName: string,
    tenantContext: TenantContext,
    requestId: string,
    payload?: unknown
  ): void {
    console.log(`🔍 [AUDIT] Edge Function Call`, {
      timestamp: new Date().toISOString(),
      requestId,
      functionName,
      tenant: {
        id: tenantContext.id,
        slug: tenantContext.slug,
        name: tenantContext.name
      },
      payloadSize: payload ? JSON.stringify(payload).length : 0,
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  static logSecurityValidation(
    type: 'tenant_validation' | 'response_validation' | 'auth_validation',
    success: boolean,
    details: Record<string, unknown>
  ): void {
    const level = success ? 'INFO' : 'ERROR';
    console.log(`🛡️ [SECURITY-${level}] ${type}`, {
      timestamp: new Date().toISOString(),
      success,
      ...details
    });
  }

  static logError(
    error: Error,
    context: {
      functionName: string;
      tenantId: string;
      requestId: string;
    }
  ): void {
    console.error(`❌ [AUDIT-ERROR] Edge Function Error`, {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      },
      context
    });
  }
}

// AIDEV-NOTE: Validador de segurança multi-tenant obrigatório
class MultiTenantSecurityValidator {
  /**
   * Validação crítica de contexto do tenant antes de qualquer operação
   */
  static validateTenantContext(): TenantContext {
    const { currentTenant } = useTenantStore.getState();
    
    if (!currentTenant?.id) {
      SecurityAuditLogger.logSecurityValidation('tenant_validation', false, {
        error: 'Tenant não encontrado no store',
        storeState: useTenantStore.getState()
      });
      throw new Error('🔐 ERRO DE SEGURANÇA: Tenant não encontrado. Faça login novamente.');
    }

    if (!currentTenant.slug || !currentTenant.name) {
      SecurityAuditLogger.logSecurityValidation('tenant_validation', false, {
        error: 'Dados incompletos do tenant',
        tenant: currentTenant
      });
      throw new Error('🔐 ERRO DE SEGURANÇA: Dados do tenant incompletos.');
    }

    SecurityAuditLogger.logSecurityValidation('tenant_validation', true, {
      tenantId: currentTenant.id,
      tenantSlug: currentTenant.slug
    });

    return currentTenant;
  }

  /**
   * Validação dupla obrigatória: verifica se todos os dados retornados pertencem ao tenant correto
   */
  static validateResponseData<T extends { tenant_id?: string }>(
    data: T | T[] | null,
    expectedTenantId: string,
    functionName: string
  ): void {
    if (!data) return;

    const items = Array.isArray(data) ? data : [data];
    const invalidItems = items.filter(item => 
      item.tenant_id && item.tenant_id !== expectedTenantId
    );

    if (invalidItems.length > 0) {
      SecurityAuditLogger.logSecurityValidation('response_validation', false, {
        error: 'Violação de segurança: dados de outro tenant detectados',
        expectedTenantId,
        invalidItems: invalidItems.map(item => ({ tenant_id: item.tenant_id })),
        functionName
      });
      throw new Error('🚨 VIOLAÇÃO DE SEGURANÇA: Dados de outro tenant detectados!');
    }

    SecurityAuditLogger.logSecurityValidation('response_validation', true, {
      expectedTenantId,
      validatedItems: items.length,
      functionName
    });
  }

  /**
   * Validação de autenticação JWT obrigatória
   */
  static async validateAuthentication(): Promise<string> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      SecurityAuditLogger.logSecurityValidation('auth_validation', false, {
        error: 'Sessão inválida ou token ausente',
        sessionError: sessionError?.message
      });
      throw new Error('🔐 ERRO DE SEGURANÇA: Sessão inválida. Faça login novamente.');
    }

    // Verificar expiração do token
    if (session.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at;
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry <= 0) {
        SecurityAuditLogger.logSecurityValidation('auth_validation', false, {
          error: 'Token JWT expirado',
          expiresAt,
          now
        });
        throw new Error('🔐 ERRO DE SEGURANÇA: Token de autenticação expirado. Faça login novamente.');
      }
      
      if (timeUntilExpiry < 300) { // Menos de 5 minutos
        console.warn('⚠️ [SECURITY-WARNING] Token JWT expira em breve:', Math.round(timeUntilExpiry / 60), 'minutos');
      }
    }

    SecurityAuditLogger.logSecurityValidation('auth_validation', true, {
      tokenLength: session.access_token.length,
      expiresAt: session.expires_at
    });

    return session.access_token;
  }
}

// AIDEV-NOTE: Função auxiliar segura para chamadas com retry automático e validação multi-tenant
async function callEdgeFunctionWithRetry<T = unknown>(
  functionName: string,
  payload: unknown,
  headers: SecureHeaders,
  maxRetries: number = 1
): Promise<EdgeFunctionResponse<T>> {
  let lastError: Error | null = null;
  const requestId = headers['x-request-id'];
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await supabase.functions.invoke(functionName, {
        body: payload,
        headers
      });

      // Se não é erro 401, processa resposta
      if (!response.error || response.error.status !== 401) {
        const hasError = !!response.error;
        const status = hasError ? (response.error.status || 500) : 200;
        const statusText = hasError ? (response.error.message || 'Edge Function Error') : 'OK';
        
        console.log('🔍 [DEBUG] Resposta da Edge Function:', {
          requestId,
          hasError,
          status,
          statusText,
          ok: !hasError,
          responseData: response.data,
          responseError: response.error,
          functionName
        });
        
        return {
          ok: !hasError,
          status,
          statusText,
          data: response.data,
          error: response.error,
          text: async () => response.error?.message || '',
          json: async () => response.data || {}
        };
      }

      // Se é erro 401 e ainda temos tentativas, tenta renovar token
      if (attempt < maxRetries) {
        console.log(`🔄 [RETRY] Token expirado, tentando renovar... (tentativa ${attempt + 1}/${maxRetries + 1})`);
        const refreshSuccess = await refreshAuthToken();
        
        if (!refreshSuccess) {
          throw new Error('Falha ao renovar token de autenticação');
        }

        // Atualiza o token no header para próxima tentativa
        const newToken = await MultiTenantSecurityValidator.validateAuthentication();
        headers.Authorization = `Bearer ${newToken}`;
        console.log('✅ Token renovado, tentando novamente...');
        continue;
      }

      // Se chegou aqui, esgotou as tentativas
      throw new Error(`Erro 401: ${response.error.message || 'Token inválido ou expirado'}`);
      
    } catch (error) {
      lastError = error as Error;
      
      // Se não é erro de rede/timeout e ainda temos tentativas, continua
      if (attempt < maxRetries && (error as ExtendedError)?.status === 401) {
        continue;
      }
      
      // Se não temos mais tentativas ou é outro tipo de erro, lança exceção
      throw error;
    }
  }
  
  throw lastError || new Error('Falha inesperada na chamada da Edge Function');
}

export const edgeFunctionService = {
  /**
   * AIDEV-NOTE: Função principal para envio de mensagens em lote
   * Implementa todas as 5 camadas de segurança multi-tenant
   */
  async sendBulkMessages(
    chargeIds: string[], 
    templateId: string, 
    sendImmediately: boolean = true
  ): Promise<BulkMessageResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // CAMADA 1: Validação de contexto do tenant (Zustand Store)
      const tenantContext = MultiTenantSecurityValidator.validateTenantContext();
      
      // CAMADA 2: Validação de autenticação JWT
      const accessToken = await MultiTenantSecurityValidator.validateAuthentication();

      // AIDEV-NOTE: Preparar dados da requisição com tenant_id obrigatório
      const requestData: SendBulkMessagesRequest = {
        chargeIds,
        templateId,
        sendImmediately,
        tenant_id: tenantContext.id // Validação obrigatória
      };

      // AIDEV-NOTE: Sistema de auditoria obrigatório
      SecurityAuditLogger.logEdgeFunctionCall(
        'send-bulk-messages',
        tenantContext,
        requestId,
        { chargeCount: chargeIds.length, templateId }
      );

      // AIDEV-NOTE: Headers seguros com todas as validações obrigatórias
      const secureHeaders: SecureHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-tenant-id': tenantContext.id,
        'x-request-id': requestId,
        'x-timestamp': new Date().toISOString()
      };

      console.log('📤 [SECURE] Enviando para Edge Function:', {
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-bulk-messages`,
        chargeCount: chargeIds.length,
        templateId,
        tenantId: tenantContext.id,
        requestId
      });

      // CAMADA 3: Chamada segura com retry automático
      const response = await callEdgeFunctionWithRetry<BulkMessageResponse>(
        'send-bulk-messages',
        requestData,
        secureHeaders
      );

      // CAMADA 4: Verificação de sucesso da resposta
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na Edge Function:', {
          requestId,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        
        let errorMessage = 'Erro ao enviar mensagens';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        SecurityAuditLogger.logError(
          new Error(errorMessage),
          { functionName: 'send-bulk-messages', tenantId: tenantContext.id, requestId }
        );
        
        throw new Error(errorMessage);
      }

      // CAMADA 5: Validação dupla obrigatória dos dados retornados
      const result: BulkMessageResponse = await response.json();
      
      // Validação crítica: verificar se a resposta pertence ao tenant correto
      if (result.tenant_id !== tenantContext.id) {
        SecurityAuditLogger.logSecurityValidation('response_validation', false, {
          error: 'Tenant ID da resposta não confere',
          expected: tenantContext.id,
          received: result.tenant_id,
          functionName: 'send-bulk-messages'
        });
        throw new Error('🚨 VIOLAÇÃO DE SEGURANÇA: Resposta de tenant incorreto!');
      }

      // Validação dupla dos resultados individuais
      if (result.results) {
        MultiTenantSecurityValidator.validateResponseData(
          result.results,
          tenantContext.id,
          'send-bulk-messages'
        );
      }

      console.log('✅ [SECURE] Resposta validada da Edge Function:', {
        requestId,
        success: result.success,
        summary: result.summary,
        sentCount: result.results?.length || 0,
        tenantValidated: true
      });

      return result;
    } catch (error) {
      SecurityAuditLogger.logError(
        error as Error,
        { functionName: 'send-bulk-messages', tenantId: 'unknown', requestId }
      );
      console.error('❌ Erro no edgeFunctionService.sendBulkMessages:', error);
      throw error;
    }
  },

  /**
   * AIDEV-NOTE: Método genérico seguro para chamar qualquer Edge Function
   * Implementa todas as validações de segurança multi-tenant
   */
  async callEdgeFunction<TRequest = unknown, TResponse = unknown>(
    functionName: string,
    data: TRequest,
    options: EdgeFunctionOptions = {}
  ): Promise<TResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const { 
        method = 'POST', 
        requireTenant = true, 
        additionalHeaders = {},
        maxRetries = 1,
        auditLog = true
      } = options;

      // CAMADA 1: Validação de contexto do tenant se necessário
      let tenantContext: TenantContext | null = null;
      if (requireTenant) {
        tenantContext = MultiTenantSecurityValidator.validateTenantContext();
      }

      // CAMADA 2: Validação de autenticação JWT
      const accessToken = await MultiTenantSecurityValidator.validateAuthentication();

      // AIDEV-NOTE: Headers seguros básicos
      const secureHeaders: Partial<SecureHeaders> & Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-request-id': requestId,
        'x-timestamp': new Date().toISOString(),
        ...additionalHeaders,
      };

      // AIDEV-NOTE: Adicionar tenant_id se necessário
      if (requireTenant && tenantContext) {
        secureHeaders['x-tenant-id'] = tenantContext.id;
        
        // Sistema de auditoria obrigatório
        if (auditLog) {
          SecurityAuditLogger.logEdgeFunctionCall(
            functionName,
            tenantContext,
            requestId,
            data
          );
        }
      }

      // AIDEV-NOTE: Fazer requisição segura
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method,
          headers: secureHeaders,
          body: method !== 'GET' ? JSON.stringify(data) : undefined,
        }
      );

      // AIDEV-NOTE: Processar resposta com validação de segurança
      let responseData = null;
      let responseError = null;
      let hasError = false;

      try {
        const responseText = await response.text();
        if (responseText) {
          const parsedResponse = JSON.parse(responseText);
          if (response.ok) {
            responseData = parsedResponse;
          } else {
            responseError = parsedResponse;
            hasError = true;
          }
        }
      } catch (parseError) {
        console.warn('⚠️ Erro ao fazer parse da resposta:', parseError);
      }

      const statusText = hasError ? (responseError?.message || response.statusText || 'Edge Function Error') : 'OK';

      console.log('🔍 [DEBUG] Resposta da Edge Function:', {
        requestId,
        hasError,
        status: response.status,
        statusText,
        ok: response.ok,
        responseData,
        responseError,
        functionName
      });

      if (!response.ok) {
        const errorMessage = responseError?.message || response.statusText || 'Edge Function Error';
        const error = new Error(`Edge Function ${response.status}: ${errorMessage}`) as ExtendedError;
        error.status = response.status;
        error.statusText = response.statusText;
        error.responseError = responseError;
        
        if (tenantContext) {
          SecurityAuditLogger.logError(
            error,
            { functionName, tenantId: tenantContext.id, requestId }
          );
        }
        
        throw error;
      }

      // CAMADA 3: Validação dupla dos dados se for multi-tenant
      if (requireTenant && tenantContext && responseData) {
        MultiTenantSecurityValidator.validateResponseData(
          responseData,
          tenantContext.id,
          functionName
        );
      }

      return responseData || await response.json();
    } catch (error) {
      console.error(`❌ Erro no callEdgeFunction(${functionName}):`, error);
      throw error;
    }
  },
};
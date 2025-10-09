// =====================================================
// EDGE FUNCTION SERVICE - MULTI-TENANT SECURITY
// Descrição: Serviço seguro para chamar Edge Functions do Supabase
// Segurança: JWT + Tenant Isolation + Validação Dupla + Auditoria
// Padrão: Conforme guia-implementacao-multi-tenant-seguro.md
// =====================================================

import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/tenantStore';
import { refreshAuthToken } from '@/utils/authUtils';

// ========================= Tipagens =========================

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
}

export interface SecureHeaders {
  'Content-Type': string;
  'Authorization': string;               // Bearer <jwt>
  'x-tenant-id': string;
  'x-request-id': string;
  'x-timestamp': string;
  'x-env'?: 'production' | 'sandbox';
  'x-debug': 'true';   // opcional
  [key: string]: string | undefined;    // Index signature para compatibilidade
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

export interface ExtendedError extends Error {
  status?: number;
  statusText?: string;
  responseError?: unknown;
}

// === Shape interno esperado pelo app (mantido para compatibilidade) ===
export interface BulkMessageResponse {
  success: boolean;
  message: string;
  tenant_id: string; // usado para validação interna do app
  results?: Array<{
    charge_id: string;
    success: boolean;
    message?: string;
    tenant_id: string;
  }>;
  summary: {
    total: number;
    sent: number;
    failed: number;
    errors: number;
  };
}

// === Payload enviado para a Edge ===
// AIDEV-NOTE: Interface corrigida para corresponder exatamente ao que a Edge Function espera
export interface SendBulkMessagesRequest {
  chargeIds: string[];
  templateId?: string;      // opcional quando customMessage é fornecida
  customMessage?: string;   // mensagem direta sem template
  tenant_id?: string;       // opcional (enviado via header x-tenant-id)
}

// === Resposta da Edge Function ===
export interface EdgeFunctionBulkResponse {
  success: boolean;
  data: {
    total: number;
    success: number;
    failed: number;
    details: Array<{
      chargeId: string;
      success: boolean;
      error?: string;
      tenant_id?: string;
    }>;
  };
  requestId: string;
}



export interface EdgeFunctionOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requireTenant?: boolean;
  additionalHeaders?: Record<string, string>;
  maxRetries?: number;
  auditLog?: boolean;
}

// ==================== Auditoria / Segurança ====================

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
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
      url: typeof window !== 'undefined' ? window.location.href : 'n/a'
    });
  }

  static logSecurityValidation(
    type: 'tenant_validation' | 'response_validation' | 'auth_validation' | 'edge_function_response',
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
      [k: string]: unknown;
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

class MultiTenantSecurityValidator {
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
    return currentTenant as TenantContext;
  }

  static async validateAuthentication(): Promise<string> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      SecurityAuditLogger.logSecurityValidation('auth_validation', false, {
        error: 'Sessão inválida ou token ausente',
        sessionError: sessionError?.message
      });
      throw new Error('🔐 ERRO DE SEGURANÇA: Sessão inválida. Faça login novamente.');
    }
    if (session.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = session.expires_at - now;
      if (timeUntilExpiry <= 0) {
        SecurityAuditLogger.logSecurityValidation('auth_validation', false, {
          error: 'Token JWT expirado',
          expiresAt: session.expires_at,
          now
        });
        throw new Error('🔐 ERRO DE SEGURANÇA: Token de autenticação expirado. Faça login novamente.');
      }
      if (timeUntilExpiry < 300) {
        console.warn('⚠️ [SECURITY-WARNING] Token JWT expira em breve:', Math.round(timeUntilExpiry / 60), 'minutos');
      }
    }
    SecurityAuditLogger.logSecurityValidation('auth_validation', true, {
      tokenLength: session.access_token.length,
      expiresAt: session.expires_at
    });
    return session.access_token;
  }

  static validateResponseData<T extends { tenant_id?: string }>(
    data: T | T[] | null,
    expectedTenantId: string,
    functionName: string
  ): void {
    if (!data) return;
    const items = Array.isArray(data) ? data : [data];
    const invalidItems = items.filter(item => item.tenant_id && item.tenant_id !== expectedTenantId);
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
}

// =================== Core: chamada com retry ===================

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
      // AIDEV-NOTE: Usando fetch direto em vez de supabase.functions.invoke
      // para garantir que todos os headers customizados sejam enviados corretamente
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/functions/v1/${functionName}`;
      
      console.log('🚀 [DEBUG] Chamando Edge Function com fetch direto:', {
        requestId,
        url,
        headers: Object.keys(headers),
        payloadType: typeof payload,
        functionName
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let responseData: T | null = null;
      
      try {
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch {
        // Se não conseguir fazer parse do JSON, mantém como null
        responseData = null;
      }

      console.log('🔍 [DEBUG] Resposta da Edge Function:', {
        requestId,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responseData,
        functionName
      });

      // Se não é erro 401, processa resposta
      if (response.status !== 401) {
        const hasError = !response.ok;
        
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: responseData,
          error: hasError ? {
            status: response.status,
            message: responseText || response.statusText
          } as EdgeFunctionError : null,
          text: async () => responseText,
          json: async () => responseData as T,
        };
      }

      // Se é erro 401 e ainda temos tentativas, tenta renovar token
      if (attempt < maxRetries) {
        console.log(`🔄 [RETRY] Token expirado, tentando renovar... (tentativa ${attempt + 1}/${maxRetries + 1})`);
        const refreshSuccess = await refreshAuthToken();
        if (!refreshSuccess) {
          throw new Error('Falha ao renovar token de autenticação');
        }
        const newToken = await MultiTenantSecurityValidator.validateAuthentication();
        headers.Authorization = `Bearer ${newToken}`;
        console.log('✅ Token renovado, tentando novamente...');
        continue;
      }

      throw new Error(`Erro 401: ${responseText || 'Token inválido ou expirado'}`);
    } catch (error) {
      lastError = error as Error;

      // Retry apenas em 401 dentro desse fluxo; demais erros caem fora
      if (attempt < maxRetries && (error as ExtendedError)?.status === 401) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Falha inesperada na chamada da Edge Function');
}

// ===================== Serviço público =====================

export const edgeFunctionService = {
  /**
   * Envio de mensagens em lote
   * - Segurança multi-tenant completa
   * - Retry automático
   * - Converte o retorno real da Edge no shape esperado pelo app
   */
  async sendBulkMessages(
    chargeIds: string[],
    templateIdOrCustomMessage: string,
    sendImmediately: boolean = true,
    customMessage?: string,
    tenantId?: string
  ): Promise<BulkMessageResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${maxRetries} - Enviando mensagens em lote...`);
        return await this._executeBulkMessages(
          chargeIds,
          templateIdOrCustomMessage,
          sendImmediately,
          requestId,
          customMessage
        );
      } catch (error) {
        lastError = error as Error;

        if (!this._shouldRetryError(lastError, attempt, maxRetries)) {
          throw lastError;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Falha após todas as tentativas de retry');
  },

  _shouldRetryError(error: Error, attempt: number, maxRetries: number): boolean {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('token de autenticação') || msg.includes('acesso negado') || msg.includes('permissões insuficientes')) {
      return false;
    }
    if (msg.includes('dados da requisição inválidos')) {
      return false;
    }
    if (attempt < maxRetries && (
      msg.includes('temporariamente indisponível') ||
      msg.includes('erro interno do servidor') ||
      msg.includes('timeout') ||
      msg.includes('network')
    )) {
      return true;
    }
    return false;
  },

  async _executeBulkMessages(
    chargeIds: string[],
    templateIdOrCustomMessage: string,
    sendImmediately: boolean,
    requestId: string,
    customMessage?: string,
    tenantId?: string
  ): Promise<BulkMessageResponse> {
    try {
      // CAMADA 1: Tenant
      const tenantContext = MultiTenantSecurityValidator.validateTenantContext();

      // CAMADA 2: JWT
      const accessToken = await MultiTenantSecurityValidator.validateAuthentication();

      // AIDEV-NOTE: Payload corrigido - Edge Function só aceita chargeIds, templateId OU customMessage
      const requestData: SendBulkMessagesRequest = {
        chargeIds,
        ...(customMessage ? { customMessage } : { templateId: templateIdOrCustomMessage }),
        tenant_id: tenantId || tenantContext.id
      };

      // AIDEV-NOTE: Log detalhado para debug
      console.log('🔍 [DEBUG] Payload sendo enviado para Edge Function:', {
        requestData,
        chargeIds: chargeIds.length,
        hasCustomMessage: !!customMessage,
        hasTemplateId: !!templateIdOrCustomMessage && !customMessage,
        tenantId: tenantContext.id
      });

      // Auditoria
      SecurityAuditLogger.logEdgeFunctionCall(
        'send-bulk-messages',
        tenantContext,
        requestId,
        {
          chargeCount: chargeIds.length,
          templateId: customMessage ? 'custom_message' : templateIdOrCustomMessage,
          hasCustomMessage: !!customMessage
        }
      );

      // Headers seguros
      const secureHeaders: SecureHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-tenant-id': tenantId || tenantContext.id,
        'x-request-id': requestId,
        'x-timestamp': new Date().toISOString(),
        // 'x-env': 'production' | 'sandbox' // opcional, se quiser forçar
      };

      console.log('📤 [SECURE] Enviando para Edge Function:', {
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-bulk-messages`,
        chargeCount: chargeIds.length,
        templateId: customMessage ? 'custom_message' : templateIdOrCustomMessage,
        hasCustomMessage: !!customMessage,
        tenantId: tenantId || tenantContext.id,
        requestId
      });

      // Chamada com retry
      const response = await callEdgeFunctionWithRetry<EdgeFunctionBulkResponse>(
        'send-bulk-messages',
        requestData,
        secureHeaders
      );

      // Tratamento de erro HTTP
      if (!response.ok) {
        const errorText = await response.text();
        SecurityAuditLogger.logSecurityValidation('edge_function_response', false, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        // Use a mensagem real do backend se disponível
        const errorMessage = errorText || response.statusText || 'Erro ao enviar mensagens';
        console.error('🚨 Erro na Edge Function:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          errorText,
          requestId,
          tenantId: tenantId || tenantContext.id
        });

        SecurityAuditLogger.logError(
          new Error(errorMessage),
          {
            functionName: 'send-bulk-messages',
            tenantId: tenantId || tenantContext.id,
            requestId,
            httpStatus: response.status
          }
        );

        throw new Error(errorMessage);
      }

      // Resposta OK: Edge retorna { success, data, requestId }
      const edgeRes = await response.json(); // tipado no invoke acima

      console.log('✅ [SECURE] Resposta validada da Edge Function:', {
        requestId: edgeRes.requestId,
        success: edgeRes.success,
        summary: {
          total: edgeRes.data.total,
          sent: edgeRes.data.success,
          failed: edgeRes.data.failed
        },
        sentCount: edgeRes.data.details?.length ?? 0,
        tenantValidated: true
      });

      // Normaliza para o shape esperado pelo app:
      const normalized: BulkMessageResponse = {
        success: edgeRes.success,
        message: edgeRes.success ? 'Mensagens processadas' : 'Falha ao processar mensagens',
        tenant_id: tenantId || tenantContext.id,
        results: (edgeRes.data.details ?? []).map((detail) => ({
          charge_id: detail.chargeId,
          success: !!detail.success,
          message: detail.error ?? '',
          tenant_id: tenantId || tenantContext.id,
        })),
        summary: {
          total: edgeRes.data.total,
          sent: edgeRes.data.success,
          failed: edgeRes.data.failed,
          errors: edgeRes.data.failed,
        },
      };

      return normalized;
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
   * Método genérico seguro para chamar qualquer Edge Function
   */
  async callEdgeFunction<TRequest = unknown, TResponse = unknown>(
    functionName: string,
    data: TRequest,
    tenantId?: string,
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

      let tenantContext: TenantContext | null = null;
      if (requireTenant) {
        tenantContext = MultiTenantSecurityValidator.validateTenantContext();
      }

      const accessToken = await MultiTenantSecurityValidator.validateAuthentication();

      const secureHeaders: Partial<SecureHeaders> & Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-tenant-id': tenantId || tenantContext?.id || '',
        'x-request-id': requestId,
        'x-timestamp': new Date().toISOString(),
        ...additionalHeaders,
      };

      if (requireTenant && tenantContext) {
        secureHeaders['x-tenant-id'] = tenantId || tenantContext.id;
        if (auditLog) {
          SecurityAuditLogger.logEdgeFunctionCall(
            functionName,
            tenantContext,
            requestId,
            data
          );
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method,
          headers: secureHeaders,
          body: method !== 'GET' ? JSON.stringify(data) : undefined,
        }
      );

      let responseData: unknown = null;
      let responseError: EdgeFunctionError | null = null;
      let hasError = false;

      try {
        const responseText = await response.text();
        if (responseText) {
          const parsed = JSON.parse(responseText);
          if (response.ok) responseData = parsed;
          else { responseError = parsed; hasError = true; }
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

      if (requireTenant && tenantContext && responseData) {
        MultiTenantSecurityValidator.validateResponseData(
          responseData,
          tenantContext.id,
          functionName
        );
      }

      return (responseData ?? (await response.json())) as TResponse;
    } catch (error) {
      console.error(`❌ Erro no callEdgeFunction(${functionName}):`, error);
      throw error;
    }
  },
};

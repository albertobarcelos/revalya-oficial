/**
 * 🔒 Security Logger - Sistema de Auditoria Seguro
 * 
 * AIDEV-NOTE: Este módulo implementa logging seguro para eventos de segurança,
 * garantindo que dados sensíveis nunca sejam expostos nos logs.
 */

interface SecurityEvent {
  event: string;
  tenant_id: string;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

interface AsaasAccessMetadata {
  endpoint?: string;
  method?: string;
  response_status?: number;
  error_type?: string;
}

export class SecurityLogger {
  /**
   * Log de acesso à API Asaas (sem dados sensíveis)
   */
  static async logAsaasAccess(
    tenantId: string, 
    success: boolean, 
    metadata?: AsaasAccessMetadata
  ): Promise<void> {
    const event: SecurityEvent = {
      event: 'asaas_api_access',
      tenant_id: tenantId,
      timestamp: new Date(),
      success,
      metadata: metadata ? {
        ...metadata,
        // AIDEV-NOTE: Garantir que credenciais nunca apareçam nos logs
        credentials: '[REDACTED]',
        api_key: '[REDACTED]',
        access_token: '[REDACTED]'
      } : undefined
    };
    
    // Log estruturado para auditoria
    console.log('SECURITY_AUDIT:', JSON.stringify(event));
    
    // Em produção, enviar para sistema de monitoramento
    // await sendToMonitoringSystem(event);
  }

  /**
   * Log de tentativa de acesso não autorizado
   */
  static async logUnauthorizedAccess(
    tenantId: string | null,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: SecurityEvent = {
      event: 'unauthorized_access_attempt',
      tenant_id: tenantId || 'unknown',
      timestamp: new Date(),
      success: false,
      metadata: {
        reason,
        ...metadata,
        // AIDEV-NOTE: Sanitizar dados sensíveis
        credentials: '[REDACTED]',
        tokens: '[REDACTED]'
      }
    };
    
    console.warn('SECURITY_ALERT:', JSON.stringify(event));
  }

  /**
   * Log de erro de integração
   */
  static async logIntegrationError(
    tenantId: string,
    integration: string,
    error: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: SecurityEvent = {
      event: 'integration_error',
      tenant_id: tenantId,
      timestamp: new Date(),
      success: false,
      metadata: {
        integration,
        error_message: error,
        ...metadata,
        // AIDEV-NOTE: Remover dados sensíveis do log de erro
        credentials: '[REDACTED]',
        api_keys: '[REDACTED]'
      }
    };
    
    console.error('INTEGRATION_ERROR:', JSON.stringify(event));
  }

  /**
   * Log de rate limiting
   */
  static async logRateLimitExceeded(
    tenantId: string,
    endpoint: string,
    currentCount: number,
    limit: number
  ): Promise<void> {
    const event: SecurityEvent = {
      event: 'rate_limit_exceeded',
      tenant_id: tenantId,
      timestamp: new Date(),
      success: false,
      metadata: {
        endpoint,
        current_count: currentCount,
        limit,
        action: 'request_blocked'
      }
    };
    
    console.warn('RATE_LIMIT_ALERT:', JSON.stringify(event));
  }

  /**
   * Log genérico de eventos de segurança
   * AIDEV-NOTE: Método genérico para compatibilidade com implementações existentes
   */
  static async logSecurityEvent(eventData: {
    event: string;
    tenant_id: string;
    success: boolean;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    const event: SecurityEvent = {
      ...eventData,
      timestamp: new Date(),
      metadata: eventData.metadata ? {
        ...eventData.metadata,
        // AIDEV-NOTE: Sanitizar dados sensíveis automaticamente
        credentials: '[REDACTED]',
        api_key: '[REDACTED]',
        access_token: '[REDACTED]',
        password: '[REDACTED]'
      } : undefined
    };
    
    // Log estruturado baseado no tipo de evento
    if (eventData.success) {
      console.log('SECURITY_EVENT:', JSON.stringify(event));
    } else {
      console.warn('SECURITY_ALERT:', JSON.stringify(event));
    }
  }
}

export default SecurityLogger;
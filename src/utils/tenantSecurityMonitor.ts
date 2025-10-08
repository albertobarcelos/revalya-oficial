/**
 * Sistema de Monitoramento de Segurança Multi-Tenant
 * 
 * Monitora e registra tentativas de acesso cross-tenant,
 * inconsistências de dados e possíveis violações de segurança.
 */

interface SecurityEvent {
  type: 'TENANT_MISMATCH' | 'INVALID_ACCESS' | 'CACHE_VIOLATION' | 'UNAUTHORIZED_QUERY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tenantId?: string;
  expectedTenant?: string;
  actualTenant?: string;
  userId?: string;
  url?: string;
  queryKey?: string[];
  timestamp: string;
  userAgent?: string;
  details?: Record<string, any>;
}

class TenantSecurityMonitor {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 1000;
  private alertThreshold = 5; // Alertar após 5 eventos suspeitos em 5 minutos

  /**
   * Registra um evento de segurança
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp' | 'userAgent'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.events.push(securityEvent);

    // Manter apenas os últimos eventos
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log no console para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      // AIDEV-NOTE: Sanitizar evento antes de logar para evitar referências circulares
      const { sanitizeSecurityMetadata } = require('@/utils/jsonSanitizer');
      const sanitizedEvent = {
        ...securityEvent,
        details: sanitizeSecurityMetadata(securityEvent.details)
      };
      console.warn('[TenantSecurity]', sanitizedEvent);
    }

    // Verificar se precisa alertar
    this.checkForAlerts(securityEvent);

    // Enviar para backend em produção
    if (process.env.NODE_ENV === 'production') {
      this.sendToBackend(securityEvent);
    }
  }

  /**
   * Verifica se há padrões suspeitos que requerem alerta
   */
  private checkForAlerts(currentEvent: SecurityEvent) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEvents = this.events.filter(
      event => new Date(event.timestamp) > fiveMinutesAgo
    );

    // Alertar se muitos eventos suspeitos em pouco tempo
    if (recentEvents.length >= this.alertThreshold) {
      this.triggerAlert(recentEvents);
    }

    // Alertar imediatamente para eventos críticos
    if (currentEvent.severity === 'CRITICAL') {
      this.triggerAlert([currentEvent]);
    }
  }

  /**
   * Dispara alerta de segurança
   */
  private triggerAlert(events: SecurityEvent[]) {
    console.error('[SECURITY ALERT] Possível violação de segurança detectada:', events);
    
    // Em produção, enviar notificação para equipe de segurança
    if (process.env.NODE_ENV === 'production') {
      // Implementar notificação (email, Slack, etc.)
    }
  }

  /**
   * Envia evento para backend para análise
   */
  private async sendToBackend(event: SecurityEvent) {
    try {
      // AIDEV-NOTE: Usar sanitização para evitar erro "Converting circular structure to JSON"
      const { safeJSONStringify } = await import('@/utils/jsonSanitizer');
      
      await fetch('/api/security/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: safeJSONStringify(event)
      });
    } catch (error) {
      console.error('Erro ao enviar evento de segurança:', error);
    }
  }

  /**
   * Obtém estatísticas de segurança
   */
  getSecurityStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const events24h = this.events.filter(e => new Date(e.timestamp) > last24h);
    const eventsLastHour = this.events.filter(e => new Date(e.timestamp) > lastHour);

    return {
      totalEvents: this.events.length,
      events24h: events24h.length,
      eventsLastHour: eventsLastHour.length,
      criticalEvents: events24h.filter(e => e.severity === 'CRITICAL').length,
      tenantMismatches: events24h.filter(e => e.type === 'TENANT_MISMATCH').length,
      unauthorizedQueries: events24h.filter(e => e.type === 'UNAUTHORIZED_QUERY').length
    };
  }

  /**
   * Limpa eventos antigos
   */
  clearOldEvents(daysToKeep = 7) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    this.events = this.events.filter(e => new Date(e.timestamp) > cutoffDate);
  }
}

// Instância singleton
export const tenantSecurityMonitor = new TenantSecurityMonitor();

/**
 * Funções utilitárias para registrar eventos específicos
 */
export const SecurityLogger = {
  /**
   * Registra tentativa de acesso com tenant inválido
   */
  logTenantMismatch(expectedTenant: string, actualTenant: string | null, details?: any) {
    tenantSecurityMonitor.logSecurityEvent({
      type: 'TENANT_MISMATCH',
      severity: 'HIGH',
      expectedTenant,
      actualTenant: actualTenant || 'null',
      details
    });
  },

  /**
   * Registra tentativa de query não autorizada
   */
  logUnauthorizedQuery(queryKey: string[], tenantId?: string, details?: any) {
    tenantSecurityMonitor.logSecurityEvent({
      type: 'UNAUTHORIZED_QUERY',
      severity: 'CRITICAL',
      tenantId,
      queryKey,
      details
    });
  },

  /**
   * Registra violação de cache entre tenants
   */
  logCacheViolation(tenantId: string, details?: any) {
    tenantSecurityMonitor.logSecurityEvent({
      type: 'CACHE_VIOLATION',
      severity: 'MEDIUM',
      tenantId,
      details
    });
  },

  /**
   * Registra acesso inválido geral
   */
  logInvalidAccess(tenantId?: string, details?: any) {
    tenantSecurityMonitor.logSecurityEvent({
      type: 'INVALID_ACCESS',
      severity: 'MEDIUM',
      tenantId,
      details
    });
  }
};

/**
 * Hook para acessar estatísticas de segurança
 */
export function useSecurityStats() {
  return tenantSecurityMonitor.getSecurityStats();
}

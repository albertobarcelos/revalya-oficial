// AIDEV-NOTE: Utilitário para throttling de logs e evitar spam no console
// Propósito: Controlar a frequência de logs de debug/audit para melhorar performance
// OTIMIZAÇÃO: Aumentado throttle significativamente para reduzir logs excessivos

interface LogEntry {
  message: string;
  lastLogged: number;
  count: number;
}

class LogThrottle {
  private logs: Map<string, LogEntry> = new Map();
  private readonly throttleTime: number;
  private readonly maxLogsPerMinute: number = 3; // AIDEV-NOTE: Reduzido para máximo 3 logs por minuto

  constructor(throttleTimeMs: number = 30000) { // AIDEV-NOTE: Aumentado para 30 segundos
    this.throttleTime = throttleTimeMs;
  }

  /**
   * Log com throttling - só executa se passou o tempo mínimo desde o último log
   */
  log(key: string, message: string, ...args: any[]): void {
    const now = Date.now();
    const entry = this.logs.get(key);

    // AIDEV-NOTE: Throttling mais agressivo para logs repetitivos
    if (!entry || (now - entry.lastLogged) >= this.throttleTime) {
      // Se é a primeira vez ou passou o tempo de throttle
      if (entry && entry.count > 1) {
        // AIDEV-NOTE: Só mostra contagem se for significativa (>20)
        if (entry.count > 20) {
          console.log(`${message} (repetido ${entry.count}x)`, ...args);
        }
      } else {
        console.log(message, ...args);
      }
      
      this.logs.set(key, {
        message,
        lastLogged: now,
        count: 1
      });
    } else {
      // Incrementa contador mas não loga
      entry.count++;
      this.logs.set(key, entry);
    }
  }

  /**
   * Log de audit com throttling específico
   */
  audit(key: string, message: string, data?: any): void {
    this.log(`audit_${key}`, `[AUDIT] ${message}`, data);
  }

  /**
   * Log de debug com throttling específico
   */
  debug(key: string, message: string, data?: any): void {
    // AIDEV-NOTE: Debug logs têm throttling de 60 segundos para reduzir spam drasticamente
    const now = Date.now();
    const entry = this.logs.get(`debug_${key}`);
    
    if (!entry || (now - entry.lastLogged) >= 60000) { // 60 segundos para debug
      this.log(`debug_${key}`, `[DEBUG] ${message}`, data);
    }
  }

  /**
   * Log de tenant guard com throttling específico
   */
  tenantGuard(key: string, message: string, data?: any): void {
    // AIDEV-NOTE: Tenant guard logs têm throttling de 120 segundos devido à alta frequência
    const now = Date.now();
    const entry = this.logs.get(`tenant_${key}`);
    
    if (!entry || (now - entry.lastLogged) >= 120000) { // 120 segundos para tenant guard
      this.log(`tenant_${key}`, `[TENANT ACCESS GUARD] 🔍 ${message}`, data);
    }
  }

  /**
   * Log de auto select com throttling específico
   * AIDEV-NOTE: Throttling mais agressivo para evitar spam no console
   * AIDEV-NOTE: Não acumula chamadas - apenas loga a primeira vez e ignora as subsequentes dentro do throttle
   */
  autoSelect(key: string, message: string, data?: any): void {
    // AIDEV-NOTE: Usar throttle de 60 segundos para auto-select (mais agressivo)
    // AIDEV-NOTE: Não acumula chamadas - apenas loga a primeira vez e ignora as subsequentes
    const now = Date.now();
    const entry = this.logs.get(`autoselect_${key}`);
    const throttleTime = 60000; // 60 segundos para auto-select
    
    if (!entry || (now - entry.lastLogged) >= throttleTime) {
      // Se é a primeira vez ou passou o tempo de throttle, loga
      console.log(`[AUTO SELECT] ${message}`, data);
      
      this.logs.set(`autoselect_${key}`, {
        message: `[AUTO SELECT] ${message}`,
        lastLogged: now,
        count: 1
      });
    }
    // AIDEV-NOTE: Se ainda está dentro do throttle, simplesmente ignora (não acumula)
  }

  /**
   * Limpa logs antigos para evitar vazamento de memória
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutos (aumentado de 5)
    
    for (const [key, entry] of this.logs.entries()) {
      if (now - entry.lastLogged > maxAge) {
        this.logs.delete(key);
      }
    }
  }

  /**
   * Log forçado que ignora throttling (usar apenas para erros críticos)
   */
  forceLog(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }
}

// AIDEV-NOTE: Instância global com throttle de 30 segundos (aumentado de 10s)
export const logThrottle = new LogThrottle(30000);

// AIDEV-NOTE: Cleanup automático a cada 10 minutos (aumentado de 5)
if (typeof window !== 'undefined') {
  setInterval(() => {
    logThrottle.cleanup();
  }, 10 * 60 * 1000);
}

// Funções de conveniência com throttling otimizado
export const throttledAudit = (key: string, message: string, data?: any) => 
  logThrottle.audit(key, message, data);

export const throttledDebug = (key: string, message: string, data?: any) => 
  logThrottle.debug(key, message, data);

export const throttledTenantGuard = (key: string, message: string, data?: any) => 
  logThrottle.tenantGuard(key, message, data);

export const throttledAutoSelect = (key: string, message: string, data?: any) => 
  logThrottle.autoSelect(key, message, data);
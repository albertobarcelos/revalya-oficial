// AIDEV-NOTE: Utilitário para throttling de logs e evitar spam no console
// Propósito: Controlar a frequência de logs de debug/audit para melhorar performance

interface LogEntry {
  message: string;
  lastLogged: number;
  count: number;
}

class LogThrottle {
  private logs: Map<string, LogEntry> = new Map();
  private readonly throttleTime: number;

  constructor(throttleTimeMs: number = 1000) {
    this.throttleTime = throttleTimeMs;
  }

  /**
   * Log com throttling - só executa se passou o tempo mínimo desde o último log
   */
  log(key: string, message: string, ...args: any[]): void {
    const now = Date.now();
    const entry = this.logs.get(key);

    if (!entry || (now - entry.lastLogged) >= this.throttleTime) {
      // Se é a primeira vez ou passou o tempo de throttle
      if (entry && entry.count > 1) {
        console.log(`${message} (repetido ${entry.count}x)`, ...args);
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
    this.log(`debug_${key}`, `🔍 [DEBUG] ${message}`, data);
  }

  /**
   * Log de tenant guard com throttling específico
   */
  tenantGuard(key: string, message: string, data?: any): void {
    this.log(`tenant_guard_${key}`, `[TENANT ACCESS GUARD] ${message}`, data);
  }

  /**
   * Log de auto-select com throttling específico
   */
  autoSelect(key: string, message: string, data?: any): void {
    this.log(`auto_select_${key}`, `[TENANT AUTO-SELECT] ${message}`, data);
  }

  /**
   * Limpa logs antigos (chamado periodicamente)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = this.throttleTime * 10; // 10x o tempo de throttle

    for (const [key, entry] of this.logs.entries()) {
      if (now - entry.lastLogged > maxAge) {
        this.logs.delete(key);
      }
    }
  }

  /**
   * Força um log mesmo com throttling ativo (para casos críticos)
   */
  forceLog(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }
}

// Instância global do throttle
export const logThrottle = new LogThrottle(2000); // 2 segundos de throttle

// Cleanup automático a cada 30 segundos
if (typeof window !== 'undefined') {
  setInterval(() => {
    logThrottle.cleanup();
  }, 30000);
}

// Exports para facilitar uso
export const throttledAudit = (key: string, message: string, data?: any) => 
  logThrottle.audit(key, message, data);

export const throttledDebug = (key: string, message: string, data?: any) => 
  logThrottle.debug(key, message, data);

export const throttledTenantGuard = (key: string, message: string, data?: any) => 
  logThrottle.tenantGuard(key, message, data);

export const throttledAutoSelect = (key: string, message: string, data?: any) => 
  logThrottle.autoSelect(key, message, data);
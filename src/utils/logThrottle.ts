// AIDEV-NOTE: Utilitário para throttling de logs e evitar spam no console
// Propósito: Controlar a frequência de logs de debug/audit para melhorar performance
// OTIMIZAÇÃO: Aumentado throttle para 10s e implementado throttling mais agressivo

interface LogEntry {
  message: string;
  lastLogged: number;
  count: number;
}

class LogThrottle {
  private logs: Map<string, LogEntry> = new Map();
  private readonly throttleTime: number;
  private readonly maxLogsPerMinute: number = 5; // AIDEV-NOTE: Máximo 5 logs por minuto por chave

  constructor(throttleTimeMs: number = 10000) { // AIDEV-NOTE: Aumentado para 10 segundos
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
        // AIDEV-NOTE: Só mostra contagem se for significativa (>10)
        if (entry.count > 10) {
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
    // AIDEV-NOTE: Debug logs têm throttling de 30 segundos para reduzir spam
    const now = Date.now();
    const entry = this.logs.get(`debug_${key}`);
    
    if (!entry || (now - entry.lastLogged) >= 30000) { // 30 segundos para debug
      this.log(`debug_${key}`, `[DEBUG] ${message}`, data);
    }
  }

  /**
   * Log de tenant guard com throttling específico
   */
  tenantGuard(key: string, message: string, data?: any): void {
    // AIDEV-NOTE: Tenant guard logs têm throttling de 60 segundos devido à alta frequência
    const now = Date.now();
    const entry = this.logs.get(`tenant_${key}`);
    
    if (!entry || (now - entry.lastLogged) >= 60000) { // 60 segundos para tenant guard
      this.log(`tenant_${key}`, `[TENANT ACCESS GUARD] 🔍 ${message}`, data);
    }
  }

  /**
   * Log de auto select com throttling específico
   */
  autoSelect(key: string, message: string, data?: any): void {
    this.log(`autoselect_${key}`, `[AUTO SELECT] ${message}`, data);
  }

  /**
   * Limpa logs antigos para evitar vazamento de memória
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutos
    
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

// AIDEV-NOTE: Instância global com throttle de 10 segundos (aumentado de 2s)
export const logThrottle = new LogThrottle(10000);

// AIDEV-NOTE: Cleanup automático a cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    logThrottle.cleanup();
  }, 5 * 60 * 1000);
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
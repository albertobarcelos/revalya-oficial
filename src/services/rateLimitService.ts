import { RATE_LIMIT } from '@/config/constants';
import { logService } from './logService';

interface RateLimitEntry {
  count: number;
  timestamp: number;
}

class RateLimitService {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly MODULE_NAME = 'RateLimit';

  constructor() {
    // Limpar entradas antigas periodicamente
    setInterval(() => this.cleanup(), RATE_LIMIT.TIME_WINDOW);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.timestamp > RATE_LIMIT.TIME_WINDOW) {
        this.limits.delete(key);
      }
    }
  }

  private getKey(tenantId: string, endpoint: string): string {
    return `${tenantId}:${endpoint}`;
  }

  async checkLimit(tenantId: string, endpoint: string): Promise<boolean> {
    const key = this.getKey(tenantId, endpoint);
    const now = Date.now();

    // Obter ou criar entrada para este tenant/endpoint
    let entry = this.limits.get(key);
    if (!entry || now - entry.timestamp > RATE_LIMIT.TIME_WINDOW) {
      entry = { count: 0, timestamp: now };
    }

    // Verificar se excedeu o limite
    if (entry.count >= RATE_LIMIT.MAX_REQUESTS) {
      logService.warn(this.MODULE_NAME, `Rate limit excedido para ${key}`);
      
      // Calcular tempo restante até reset
      const timeUntilReset = (entry.timestamp + RATE_LIMIT.TIME_WINDOW) - now;
      
      if (timeUntilReset > 0) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.COOLDOWN));
        return false;
      }
      
      // Se o tempo já passou, resetar o contador
      entry = { count: 0, timestamp: now };
    }

    // Incrementar contador
    entry.count++;
    this.limits.set(key, entry);

    return true;
  }

  getRemainingRequests(tenantId: string, endpoint: string): number {
    const key = this.getKey(tenantId, endpoint);
    const entry = this.limits.get(key);
    
    if (!entry) {
      return RATE_LIMIT.MAX_REQUESTS;
    }

    const remaining = RATE_LIMIT.MAX_REQUESTS - entry.count;
    return remaining > 0 ? remaining : 0;
  }

  getTimeUntilReset(tenantId: string, endpoint: string): number {
    const key = this.getKey(tenantId, endpoint);
    const entry = this.limits.get(key);
    
    if (!entry) {
      return 0;
    }

    const timeUntilReset = (entry.timestamp + RATE_LIMIT.TIME_WINDOW) - Date.now();
    return timeUntilReset > 0 ? timeUntilReset : 0;
  }
}

export const rateLimitService = new RateLimitService(); 

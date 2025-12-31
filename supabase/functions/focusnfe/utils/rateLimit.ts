/**
 * Utilitários para rate limiting
 * AIDEV-NOTE: Rate limiting simples (em produção usar Redis)
 */

import type { RateLimitCache } from "../types.ts";
import { RATE_LIMIT } from "../constants.ts";

const requestCache = new Map<string, RateLimitCache>();

/**
 * Verifica se o tenant pode fazer requisição (rate limiting)
 */
export function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const key = `focusnfe_${tenantId}`;
  
  const current = requestCache.get(key);
  
  if (!current || now > current.resetTime) {
    requestCache.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT.WINDOW_MS
    });
    return true;
  }
  
  if (current.count >= RATE_LIMIT.MAX_REQUESTS) {
    console.warn('[RATE_LIMIT] Limite excedido:', {
      tenant_id: tenantId,
      count: current.count,
      limit: RATE_LIMIT.MAX_REQUESTS
    });
    return false;
  }
  
  current.count++;
  return true;
}


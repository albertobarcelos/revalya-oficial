/**
 * Middleware de Segurança - Sistema Revalya
 * Intercepta e valida todas as requisições para garantir segurança
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { 
  AUTH_CONSTANTS, 
  generateDeviceFingerprint, 
  getClientIP, 
  getRiskLevel 
} from '../types/auth';

/**
 * Interface para configuração do middleware
 */
interface SecurityConfig {
  enableRateLimiting: boolean;
  enableDeviceTracking: boolean;
  enableGeoBlocking: boolean;
  maxRequestsPerMinute: number;
  blockedCountries: string[];
  suspiciousUserAgents: string[];
  requireMFA: boolean;
}

/**
 * Configuração padrão de segurança
 */
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableRateLimiting: true,
  enableDeviceTracking: true,
  enableGeoBlocking: false,
  maxRequestsPerMinute: 60,
  blockedCountries: [],
  suspiciousUserAgents: [
    'bot',
    'crawler',
    'spider',
    'scraper'
  ],
  requireMFA: false
};

/**
 * Cache para rate limiting (em produção, usar Redis)
 */
const requestCache = new Map<string, { count: number; resetTime: number }>();

/**
 * Cache para dispositivos conhecidos
 */
const deviceCache = new Map<string, { lastSeen: number; trusted: boolean }>();

/**
 * Limpa caches expirados
 */
function cleanupCaches(): void {
  const now = Date.now();
  
  // Limpa rate limiting cache
  for (const [key, value] of requestCache.entries()) {
    if (now > value.resetTime) {
      requestCache.delete(key);
    }
  }
  
  // Limpa device cache (dispositivos não vistos há mais de 30 dias)
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  for (const [key, value] of deviceCache.entries()) {
    if (value.lastSeen < thirtyDaysAgo) {
      deviceCache.delete(key);
    }
  }
}

/**
 * Verifica rate limiting
 */
function checkRateLimit(ip: string, maxRequests: number): boolean {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000; // Janela de 1 minuto
  const key = `${ip}:${windowStart}`;
  
  const current = requestCache.get(key) || { count: 0, resetTime: windowStart + 60000 };
  current.count++;
  
  requestCache.set(key, current);
  
  return current.count <= maxRequests;
}

/**
 * Calcula score de risco da requisição
 */
function calculateRequestRisk(
  request: NextRequest,
  ip: string,
  userAgent: string,
  config: SecurityConfig
): number {
  let riskScore = 0;
  
  // Verifica User-Agent suspeito
  const lowerUserAgent = userAgent.toLowerCase();
  if (config.suspiciousUserAgents.some(suspicious => 
    lowerUserAgent.includes(suspicious.toLowerCase())
  )) {
    riskScore += 30;
  }
  
  // Verifica se é um IP conhecido
  const deviceFingerprint = generateDeviceFingerprint(userAgent, ip);
  const device = deviceCache.get(deviceFingerprint);
  if (!device) {
    riskScore += 20; // Dispositivo novo
  } else if (!device.trusted) {
    riskScore += 15; // Dispositivo não confiável
  }
  
  // Verifica horário suspeito (entre 2h e 6h)
  const hour = new Date().getHours();
  if (hour >= 2 && hour <= 6) {
    riskScore += 10;
  }
  
  // Verifica múltiplas tentativas do mesmo IP
  const recentRequests = Array.from(requestCache.entries())
    .filter(([key]) => key.startsWith(ip))
    .reduce((sum, [, value]) => sum + value.count, 0);
  
  if (recentRequests > config.maxRequestsPerMinute * 0.8) {
    riskScore += 25;
  }
  
  // Verifica headers suspeitos
  const hasXForwardedFor = request.headers.get('x-forwarded-for');
  const hasXRealIp = request.headers.get('x-real-ip');
  if (hasXForwardedFor || hasXRealIp) {
    riskScore += 5; // Possível proxy
  }
  
  return Math.min(riskScore, 100);
}

/**
 * Registra evento de segurança
 */
async function logSecurityEvent(
  supabase: any,
  eventType: string,
  details: Record<string, any>,
  riskScore: number,
  ip: string,
  userAgent: string
): Promise<void> {
  try {
    await supabase.rpc('log_auth_event', {
      p_event_type: eventType,
      p_ip_address: ip,
      p_user_agent: userAgent,
      p_risk_score: riskScore,
      p_details: details
    });
  } catch (error) {
    console.error('Erro ao registrar evento de segurança:', error);
  }
}

/**
 * Valida token JWT
 */
async function validateJWT(
  supabase: any,
  token: string
): Promise<{ valid: boolean; user?: any; error?: string }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { valid: false, error: 'Token inválido' };
    }
    
    // Verifica se o token não expirou
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_jwt_integrity', { p_token: token });
    
    if (validationError || !validationResult) {
      return { valid: false, error: 'Token expirado ou inválido' };
    }
    
    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: 'Erro na validação do token' };
  }
}

/**
 * Middleware principal de segurança
 */
export async function securityMiddleware(
  request: NextRequest,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Promise<NextResponse> {
  const startTime = Date.now();
  
  // Limpa caches periodicamente
  if (Math.random() < 0.01) { // 1% de chance
    cleanupCaches();
  }
  
  // Extrai informações da requisição
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const path = request.nextUrl.pathname;
  const method = request.method;
  
  // Cria cliente Supabase
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });
  
  try {
    // 1. Verifica rate limiting
    if (config.enableRateLimiting) {
      const rateLimitOk = checkRateLimit(ip, config.maxRequestsPerMinute);
      if (!rateLimitOk) {
        await logSecurityEvent(
          supabase,
          'RATE_LIMIT_EXCEEDED',
          { path, method, ip },
          80,
          ip,
          userAgent
        );
        
        return new NextResponse(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { 
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60'
            }
          }
        );
      }
    }
    
    // 2. Calcula score de risco
    const riskScore = calculateRequestRisk(request, ip, userAgent, config);
    const riskLevel = getRiskLevel(riskScore);
    
    // 3. Verifica autenticação para rotas protegidas
    const protectedPaths = ['/admin', '/api/admin', '/dashboard'];
    const isProtectedPath = protectedPaths.some(protectedPath => 
      path.startsWith(protectedPath)
    );
    
    if (isProtectedPath) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '') || 
                   request.cookies.get('supabase-auth-token')?.value;
      
      if (!token) {
        await logSecurityEvent(
          supabase,
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          { path, method, reason: 'No token provided' },
          riskScore + 20,
          ip,
          userAgent
        );
        
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Valida o token
      const { valid, user, error } = await validateJWT(supabase, token);
      if (!valid) {
        await logSecurityEvent(
          supabase,
          'INVALID_TOKEN_ACCESS',
          { path, method, error },
          riskScore + 30,
          ip,
          userAgent
        );
        
        return new NextResponse(
          JSON.stringify({ error: 'Invalid token' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Adiciona informações do usuário aos headers
      response.headers.set('X-User-ID', user.id);
      response.headers.set('X-User-Email', user.email || '');
    }
    
    // 4. Registra dispositivo se habilitado
    if (config.enableDeviceTracking) {
      const deviceFingerprint = generateDeviceFingerprint(userAgent, ip);
      const now = Date.now();
      
      const existingDevice = deviceCache.get(deviceFingerprint);
      if (existingDevice) {
        existingDevice.lastSeen = now;
        // Dispositivo se torna confiável após 7 dias de uso
        if (now - existingDevice.lastSeen > 7 * 24 * 60 * 60 * 1000) {
          existingDevice.trusted = true;
        }
      } else {
        deviceCache.set(deviceFingerprint, {
          lastSeen: now,
          trusted: false
        });
      }
    }
    
    // 5. Registra evento se risco alto
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      await logSecurityEvent(
        supabase,
        'HIGH_RISK_REQUEST',
        { 
          path, 
          method, 
          riskLevel,
          factors: {
            suspiciousUserAgent: config.suspiciousUserAgents.some(s => 
              userAgent.toLowerCase().includes(s.toLowerCase())
            ),
            newDevice: !deviceCache.has(generateDeviceFingerprint(userAgent, ip)),
            suspiciousHour: new Date().getHours() >= 2 && new Date().getHours() <= 6
          }
        },
        riskScore,
        ip,
        userAgent
      );
    }
    
    // 6. Adiciona headers de segurança
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Headers de informação (apenas para debug, remover em produção)
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('X-Risk-Score', riskScore.toString());
      response.headers.set('X-Risk-Level', riskLevel);
      response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
    }
    
    return response;
    
  } catch (error) {
    console.error('Erro no middleware de segurança:', error);
    
    // Em caso de erro, registra e permite a requisição
    await logSecurityEvent(
      supabase,
      'MIDDLEWARE_ERROR',
      { path, method, error: error instanceof Error ? error.message : 'Unknown error' },
      50,
      ip,
      userAgent
    );
    
    return response;
  }
}

/**
 * Middleware específico para APIs
 */
export async function apiSecurityMiddleware(
  request: NextRequest
): Promise<NextResponse> {
  const apiConfig: SecurityConfig = {
    ...DEFAULT_SECURITY_CONFIG,
    maxRequestsPerMinute: 120, // APIs podem ter mais requisições
    requireMFA: true
  };
  
  return securityMiddleware(request, apiConfig);
}

/**
 * Middleware específico para admin
 */
export async function adminSecurityMiddleware(
  request: NextRequest
): Promise<NextResponse> {
  const adminConfig: SecurityConfig = {
    ...DEFAULT_SECURITY_CONFIG,
    maxRequestsPerMinute: 30, // Admin tem limite mais restritivo
    requireMFA: true,
    enableGeoBlocking: true
  };
  
  return securityMiddleware(request, adminConfig);
}

/**
 * Exporta configuração padrão
 */
export { DEFAULT_SECURITY_CONFIG, type SecurityConfig };

/**
 * Função para configurar middleware personalizado
 */
export function createSecurityMiddleware(config: Partial<SecurityConfig>) {
  const mergedConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  
  return (request: NextRequest) => securityMiddleware(request, mergedConfig);
}

/**
 * Utilitários para análise de segurança
 */
export const SecurityUtils = {
  /**
   * Obtém estatísticas de rate limiting
   */
  getRateLimitStats(): { totalRequests: number; uniqueIPs: number } {
    const totalRequests = Array.from(requestCache.values())
      .reduce((sum, cache) => sum + cache.count, 0);
    
    const uniqueIPs = new Set(
      Array.from(requestCache.keys()).map(key => key.split(':')[0])
    ).size;
    
    return { totalRequests, uniqueIPs };
  },
  
  /**
   * Obtém estatísticas de dispositivos
   */
  getDeviceStats(): { totalDevices: number; trustedDevices: number } {
    const totalDevices = deviceCache.size;
    const trustedDevices = Array.from(deviceCache.values())
      .filter(device => device.trusted).length;
    
    return { totalDevices, trustedDevices };
  },
  
  /**
   * Limpa todos os caches
   */
  clearAllCaches(): void {
    requestCache.clear();
    deviceCache.clear();
  },
  
  /**
   * Bloqueia IP temporariamente
   */
  blockIP(ip: string, durationMinutes: number = 60): void {
    const blockUntil = Date.now() + (durationMinutes * 60 * 1000);
    requestCache.set(`${ip}:blocked`, { 
      count: Infinity, 
      resetTime: blockUntil 
    });
  }
};

/**
 * Tipos e utilitários para autenticação segura com JWT
 * Sistema Revalya - Implementação de Custom Claims e Segurança
 */

// Tipos de roles disponíveis no sistema
export type UserRole = 
  | 'ADMIN'
  | 'PLATFORM_ADMIN'
  | 'TENANT_ADMIN'
  | 'TENANT_USER'
  | 'MANAGER'
  | 'VIEWER';

// Tipos de permissões do sistema
export type Permission = 
  | 'read:contracts'
  | 'write:contracts'
  | 'delete:contracts'
  | 'read:customers'
  | 'write:customers'
  | 'delete:customers'
  | 'read:billings'
  | 'write:billings'
  | 'read:reports'
  | 'write:reports'
  | 'admin:users'
  | 'admin:tenants'
  | 'admin:system';

// Tipos de eventos de autenticação
export type AuthEventType = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'PASSWORD_CHANGE'
  | 'SUSPICIOUS_ACTIVITY'
  | 'ACCOUNT_LOCKED';

// Interface para custom claims do JWT - Desabilitada
// export interface CustomJWTClaims {
//   user_role: UserRole;
//   tenant_id: string;
//   permissions: Permission[];
//   exp: number;
//   iat: number;
//   sub: string;
//   email: string;
// }

// Interface para dados de autenticação
export interface AuthData {
  user: {
    id: string;
    email: string;
    user_metadata: {
      user_role: UserRole;
      tenant_id: string;
      permissions: Permission[];
    };
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// Interface para evento de monitoramento
export interface AuthEvent {
  user_id?: string;
  email?: string;
  event_type: AuthEventType;
  ip_address: string;
  user_agent: string;
  risk_score?: number;
  details?: Record<string, any>;
}

// Interface para estatísticas de segurança
export interface SecurityStats {
  total_events: number;
  failed_logins: number;
  successful_logins: number;
  high_risk_events: number;
  unique_ips: number;
  avg_risk_score: number;
}

// Interface para refresh token
export interface RefreshTokenData {
  token: string;
  device_fingerprint: string;
  expires_at: string;
  is_valid: boolean;
}

// Configurações de segurança
export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // em minutos
  tokenExpirationHours: number;
  refreshTokenExpirationDays: number;
  riskScoreThreshold: number;
  suspiciousHoursStart: number; // 0-23
  suspiciousHoursEnd: number; // 0-23
}

// Configuração padrão de segurança
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  tokenExpirationHours: 1,
  refreshTokenExpirationDays: 7,
  riskScoreThreshold: 70,
  suspiciousHoursStart: 2,
  suspiciousHoursEnd: 6
};

// Mapeamento de roles para permissões padrão
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'read:contracts', 'write:contracts', 'delete:contracts',
    'read:customers', 'write:customers', 'delete:customers',
    'read:billings', 'write:billings',
    'read:reports', 'write:reports',
    'admin:users', 'admin:tenants', 'admin:system'
  ],
  PLATFORM_ADMIN: [
    'read:contracts', 'write:contracts', 'delete:contracts',
    'read:customers', 'write:customers', 'delete:customers',
    'read:billings', 'write:billings',
    'read:reports', 'write:reports',
    'admin:users', 'admin:tenants'
  ],
  TENANT_ADMIN: [
    'read:contracts', 'write:contracts', 'delete:contracts',
    'read:customers', 'write:customers', 'delete:customers',
    'read:billings', 'write:billings',
    'read:reports', 'write:reports',
    'admin:users'
  ],
  MANAGER: [
    'read:contracts', 'write:contracts',
    'read:customers', 'write:customers',
    'read:billings', 'write:billings',
    'read:reports', 'write:reports'
  ],
  TENANT_USER: [
    'read:contracts', 'write:contracts',
    'read:customers', 'write:customers',
    'read:billings',
    'read:reports'
  ],
  VIEWER: [
    'read:contracts',
    'read:customers',
    'read:billings',
    'read:reports'
  ]
};

// Níveis de risco
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Função para determinar nível de risco baseado no score
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 90) return RiskLevel.CRITICAL;
  if (score >= 70) return RiskLevel.HIGH;
  if (score >= 40) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

// Função para verificar se um horário é suspeito
export function isSuspiciousHour(hour: number, config: SecurityConfig = DEFAULT_SECURITY_CONFIG): boolean {
  return hour >= config.suspiciousHoursStart && hour <= config.suspiciousHoursEnd;
}

// Função para gerar device fingerprint
export function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('Device fingerprint', 10, 10);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|');
  
  // Simples hash (em produção, usar biblioteca de hash mais robusta)
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

// Função para obter IP do cliente (aproximado)
export async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return '0.0.0.0'; // Fallback
  }
}

// Função para validar formato de email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Função para validar força da senha
export interface PasswordStrength {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;
  
  // Comprimento
  if (password.length >= 8) score += 20;
  else feedback.push('Use pelo menos 8 caracteres');
  
  if (password.length >= 12) score += 10;
  
  // Caracteres especiais
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Inclua caracteres especiais');
  }
  
  // Números
  if (/\d/.test(password)) {
    score += 20;
  } else {
    feedback.push('Inclua números');
  }
  
  // Letras maiúsculas
  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Inclua letras maiúsculas');
  }
  
  // Letras minúsculas
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Inclua letras minúsculas');
  }
  
  // Determinar nível
  let level: PasswordStrength['level'];
  if (score >= 80) level = 'strong';
  else if (score >= 60) level = 'good';
  else if (score >= 40) level = 'fair';
  else level = 'weak';
  
  return { score, level, feedback };
}

// Constantes para timeouts e intervalos
export const AUTH_CONSTANTS = {
  TOKEN_REFRESH_INTERVAL: 50 * 60 * 1000, // 50 minutos
  SESSION_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutos
  ACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutos
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 segundo
} as const;

// Tipos para erros de autenticação
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Códigos de erro comuns
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_LOCKED: 'account_locked',
  TOKEN_EXPIRED: 'token_expired',
  INSUFFICIENT_PERMISSIONS: 'insufficient_permissions',
  TENANT_ACCESS_DENIED: 'tenant_access_denied',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMITED: 'rate_limited',
  INVALID_TOKEN: 'invalid_token'
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

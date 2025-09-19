/**
 * Configurações de Autenticação Multi-Tenant
 * Inspirado na arquitetura da Omie para auto-login
 */

// Configurações de expiração de tokens
export const TOKEN_CONFIG = {
  // Refresh token: 30 dias (como na Omie)
  REFRESH_TOKEN_EXPIRY_DAYS: parseInt(import.meta.env.REFRESH_TOKEN_EXPIRY_DAYS || '30'),
  
  // Access token: 1 hora
  ACCESS_TOKEN_EXPIRY_HOURS: parseInt(import.meta.env.ACCESS_TOKEN_EXPIRY_HOURS || '1'),
  
  // Margem de segurança para renovação (renovar 5 min antes de expirar)
  RENEWAL_MARGIN_MINUTES: 5,
} as const;

// Configurações de segurança
export const SECURITY_CONFIG = {
  // Máximo de refresh tokens por usuário
  MAX_REFRESH_TOKENS_PER_USER: parseInt(import.meta.env.MAX_REFRESH_TOKENS_PER_USER || '10'),
  
  // Habilitar rotação de tokens
  ENABLE_TOKEN_ROTATION: import.meta.env.ENABLE_TOKEN_ROTATION === 'true',
  
  // Detecção de atividade suspeita
  ENABLE_SUSPICIOUS_ACTIVITY_DETECTION: import.meta.env.ENABLE_SUSPICIOUS_ACTIVITY_DETECTION === 'true',
  
  // Tempo limite para validação de sessão (ms)
  SESSION_VALIDATION_TIMEOUT: 5000,
} as const;

// URLs e endpoints
export const ENDPOINT_CONFIG = {
  // URL base do portal
  PORTAL_BASE_URL: import.meta.env.PORTAL_BASE_URL || 'https://portal.revalya.com',
  
  // Edge Functions
  CREATE_TENANT_SESSION: '/functions/v1/create-tenant-session',
  REFRESH_TENANT_TOKEN: '/functions/v1/refresh-tenant-token',
  REVOKE_TENANT_SESSION: '/functions/v1/revoke-tenant-session',
} as const;

// Chaves de armazenamento (inspirado no padrão da Omie)
export const STORAGE_KEYS = {
  // Token principal do usuário (localStorage)
  USER_TOKEN: 'revalya_user_token',
  
  // Sessões de tenant (localStorage) - múltiplas sessões por usuário
  TENANT_SESSIONS: 'revalya_tenant_sessions',
  
  // Sessão atual da aba (sessionStorage)
  CURRENT_SESSION: 'revalya_current_tenant_session',
  
  // Configurações de usuário
  USER_PREFERENCES: 'revalya_user_preferences',
  
  // Chaves legadas para compatibilidade
  TENANT_TOKEN_PREFIX: 'tenant_token_',
  TENANT_DATA_PREFIX: 'tenant_data_',
  PORTAL_REDIRECT_KEY: 'portal_redirect_url'
} as const;

// Tipos de ação para auditoria
export const AUDIT_ACTIONS = {
  SESSION_CREATED: 'created',
  TOKEN_REFRESHED: 'refreshed',
  SESSION_REVOKED: 'revoked',
  TOKEN_EXPIRED: 'expired',
  INVALID_ATTEMPT: 'invalid_attempt',
} as const;

// Configurações de desenvolvimento
export const DEV_CONFIG = {
  // Habilitar logs detalhados
  ENABLE_DEBUG_LOGS: import.meta.env.VITE_DEV_MODE === 'true',
  
  // Simular latência de rede (ms)
  SIMULATE_NETWORK_DELAY: 0,
  
  // Bypass de validação (apenas desenvolvimento)
  BYPASS_TOKEN_VALIDATION: false,
} as const;

// Utilitários de tempo
export const TIME_UTILS = {
  // Converter dias para milissegundos
  daysToMs: (days: number) => days * 24 * 60 * 60 * 1000,
  
  // Converter horas para milissegundos
  hoursToMs: (hours: number) => hours * 60 * 60 * 1000,
  
  // Converter minutos para milissegundos
  minutesToMs: (minutes: number) => minutes * 60 * 1000,
  
  // Verificar se timestamp está expirado
  isExpired: (timestamp: number, marginMs: number = 0) => {
    return Date.now() > (timestamp - marginMs);
  },
} as const;

// Validações
export const VALIDATION = {
  // Validar formato de slug de tenant
  isValidTenantSlug: (slug: string): boolean => {
    return /^[a-z0-9-]+$/.test(slug) && slug.length >= 2 && slug.length <= 50;
  },
  
  // Validar formato de email
  isValidEmail: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  // Validar UUID
  isValidUUID: (uuid: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  },
} as const;

// Mensagens de erro padronizadas
export const ERROR_MESSAGES = {
  INVALID_REFRESH_TOKEN: 'Refresh token inválido ou expirado',
  TENANT_NOT_FOUND: 'Tenant não encontrado',
  TENANT_INACTIVE: 'Tenant inativo',
  USER_NO_ACCESS: 'Usuário não tem acesso a este tenant',
  SESSION_EXPIRED: 'Sessão expirada',
  NETWORK_ERROR: 'Erro de conexão',
  VALIDATION_FAILED: 'Falha na validação',
  UNAUTHORIZED: 'Não autorizado',
} as const;

// Configuração completa exportada
export const TENANT_AUTH_CONFIG = {
  TOKEN: TOKEN_CONFIG,
  SECURITY: SECURITY_CONFIG,
  ENDPOINTS: ENDPOINT_CONFIG,
  STORAGE: STORAGE_KEYS,
  AUDIT: AUDIT_ACTIONS,
  DEV: DEV_CONFIG,
  TIME: TIME_UTILS,
  VALIDATION,
  ERRORS: ERROR_MESSAGES,
} as const;

export default TENANT_AUTH_CONFIG;

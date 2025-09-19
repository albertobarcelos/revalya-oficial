/**
 * Configurações globais do sistema
 */

// Timeouts (em milissegundos)
export const API_TIMEOUT = 30000; // 30 segundos
export const RETRY_DELAY = 2000;  // 2 segundos
export const MAX_RETRIES = 3;

// Rate Limiting
export const RATE_LIMIT = {
  MAX_REQUESTS: 100,    // Máximo de requisições
  TIME_WINDOW: 60000,   // Janela de tempo (1 minuto)
  COOLDOWN: 5000        // Tempo de espera após atingir limite
};

// WhatsApp Integration
export const WHATSAPP = {
  STATUS_CHECK_INTERVAL: 5000,  // Intervalo de verificação de status (5 segundos)
  QR_CODE_TIMEOUT: 60000,       // Timeout para QR Code (1 minuto)
  INSTANCE_PREFIX: 'revalya',   // Prefixo para instâncias
  CONNECTION_STATES: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    ERROR: 'error',
    LOADING: 'loading',
    SCANNING: 'scanning',
    SYNCING: 'syncing',
    PAIRED: 'paired',
    TIMEOUT: 'timeout',
    CONFLICT: 'conflict'
  } as const,
  POLLING_INTERVAL: 3000, // intervalo de verificação do status (ms)
};

// Logging
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
} as const;

// Security
export const SECURITY = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME: 900000, // 15 minutos
  PASSWORD_MIN_LENGTH: 8,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 horas (padronizado com supabase.ts)
};

// Cache
export const CACHE = {
  TTL: 300000, // 5 minutos
  MAX_SIZE: 100 // Máximo de itens em cache
};

// Timeouts
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 segundos
  LONG_OPERATION: 60000, // 1 minuto
  SHORT_OPERATION: 10000, // 10 segundos
}

// Limites de tentativas
export const RETRY_LIMITS = {
  API_CALLS: 3,
  WHATSAPP_CONNECTION: 2,
} 

// =====================================================
// SYSTEM CONFIGURATION
// Descrição: Configurações centralizadas do sistema
// =====================================================

import { Currency } from '../types/models';

// =====================================================
// ENVIRONMENT VARIABLES
// =====================================================

/**
 * Configurações de ambiente
 */
export const ENV = {
  NODE_ENV: import.meta.env.MODE || 'development',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Revalya Financial System',
  APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'Sistema Financeiro Avançado com Supabase',
  APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5173/api',
  PORT: parseInt(import.meta.env.VITE_PORT || '5173', 10),
  HOST: import.meta.env.VITE_HOST || 'localhost',
  
  // Debug e Logging
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
  ENABLE_CONSOLE_LOGS: import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false',
  ENABLE_FILE_LOGS: import.meta.env.VITE_ENABLE_FILE_LOGS === 'true',
  
  // Feature Flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_MONITORING: import.meta.env.VITE_ENABLE_MONITORING === 'true',
  ENABLE_CACHE: import.meta.env.VITE_ENABLE_CACHE !== 'false',
  ENABLE_RATE_LIMITING: import.meta.env.VITE_ENABLE_RATE_LIMITING !== 'false',
  ENABLE_COMPRESSION: import.meta.env.VITE_ENABLE_COMPRESSION !== 'false',
  ENABLE_CORS: import.meta.env.VITE_ENABLE_CORS !== 'false',
  
  // Timezone e Localização
  DEFAULT_TIMEZONE: import.meta.env.VITE_DEFAULT_TIMEZONE || 'America/Sao_Paulo',
  DEFAULT_LOCALE: import.meta.env.VITE_DEFAULT_LOCALE || 'pt-BR',
  DEFAULT_CURRENCY: (import.meta.env.VITE_DEFAULT_CURRENCY as Currency) || 'BRL',
  
  // Segurança
  ENABLE_HTTPS: import.meta.env.VITE_ENABLE_HTTPS === 'true',
  ENABLE_HELMET: import.meta.env.VITE_ENABLE_HELMET !== 'false',
  ENABLE_CSRF: import.meta.env.VITE_ENABLE_CSRF === 'true',
  ENABLE_XSS_PROTECTION: import.meta.env.VITE_ENABLE_XSS_PROTECTION !== 'false',
  
  // Performance
  ENABLE_CLUSTERING: import.meta.env.VITE_ENABLE_CLUSTERING === 'true',
  MAX_WORKERS: parseInt(import.meta.env.VITE_MAX_WORKERS || '0', 10),
  MEMORY_LIMIT: import.meta.env.VITE_MEMORY_LIMIT || '512MB',
  
  // Manutenção
  MAINTENANCE_MODE: import.meta.env.VITE_MAINTENANCE_MODE === 'true',
  MAINTENANCE_MESSAGE: import.meta.env.VITE_MAINTENANCE_MESSAGE || 'Sistema em manutenção. Tente novamente em alguns minutos.',
} as const;

// =====================================================
// SUPABASE CONFIGURATION
// =====================================================

/**
 * Configurações do Supabase
 */
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Configurações de Auth
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
    
    // Configurações de sessão
    sessionTimeout: 24 * 60 * 60, // 24 horas em segundos
    refreshTokenRotation: true,
    
    // Configurações de redirecionamento
    redirectTo: import.meta.env.VITE_AUTH_REDIRECT_URL || `${ENV.APP_URL}/auth/callback`,
    
    // Configurações de providers
    providers: {
      google: {
        enabled: import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true',
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
      },
      github: {
        enabled: import.meta.env.VITE_ENABLE_GITHUB_AUTH === 'true',
        clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
        clientSecret: import.meta.env.VITE_GITHUB_CLIENT_SECRET || '',
      },
      microsoft: {
        enabled: import.meta.env.VITE_ENABLE_MICROSOFT_AUTH === 'true',
        clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
        clientSecret: import.meta.env.VITE_MICROSOFT_CLIENT_SECRET || '',
      },
      apple: {
        enabled: import.meta.env.VITE_ENABLE_APPLE_AUTH === 'true',
        clientId: import.meta.env.VITE_APPLE_CLIENT_ID || '',
        clientSecret: import.meta.env.VITE_APPLE_CLIENT_SECRET || '',
      },
    },
    
    // Configurações de MFA
    mfa: {
      enabled: import.meta.env.VITE_ENABLE_MFA === 'true',
      enforced: import.meta.env.VITE_ENFORCE_MFA === 'true',
      factors: ['totp', 'phone'] as const,
    },
  },
  
  // Configurações de Storage
  storage: {
    buckets: {
      documents: 'documents',
      avatars: 'avatars',
      reports: 'reports',
      backups: 'backups',
      temp: 'temp',
    },
    
    // Configurações de upload
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
    ],
    
    // Configurações de CDN
    cdn: {
      enabled: import.meta.env.VITE_ENABLE_CDN === 'true',
    domain: import.meta.env.VITE_CDN_DOMAIN || '',
    },
  },
  
  // Configurações de Realtime
  realtime: {
    enabled: import.meta.env.VITE_ENABLE_REALTIME !== 'false',
    heartbeatInterval: 30000,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    
    // Canais habilitados
    channels: {
      notifications: 'notifications',
      transactions: 'transactions',
      contracts: 'contracts',
      reports: 'reports',
      system: 'system',
    },
  },
  
  // Configurações de Edge Functions
  functions: {
    enabled: import.meta.env.VITE_ENABLE_EDGE_FUNCTIONS === 'true',
    timeout: 30000,
    region: import.meta.env.VITE_SUPABASE_REGION || 'us-east-1',
    
    // Funções disponíveis
    endpoints: {
      calculateFinancials: 'calculate-financials',
      generateReports: 'generate-reports',
      processPayments: 'process-payments',
      sendNotifications: 'send-notifications',
      validateDocuments: 'validate-documents',
      syncIntegrations: 'sync-integrations',
    },
  },
  
  // Configurações de Database
  database: {
    // Configurações de conexão
    pooling: {
      enabled: import.meta.env.VITE_ENABLE_DB_POOLING === 'true',
      maxConnections: parseInt(import.meta.env.VITE_DB_MAX_CONNECTIONS || '20', 10),
      idleTimeout: parseInt(import.meta.env.VITE_DB_IDLE_TIMEOUT || '30000', 10),
    },
    
    // Configurações de performance
    performance: {
      enableQueryOptimization: true,
      enableIndexHints: true,
      enableStatementTimeout: true,
      statementTimeout: 30000,
    },
    
    // Configurações de backup
    backup: {
      enabled: import.meta.env.VITE_ENABLE_AUTO_BACKUP === 'true',
      schedule: import.meta.env.VITE_BACKUP_SCHEDULE || '0 2 * * *', // Diário às 2h
      retention: parseInt(import.meta.env.VITE_BACKUP_RETENTION_DAYS || '30', 10),
    },
  },
} as const;

// =====================================================
// SECURITY CONFIGURATION
// =====================================================

/**
 * Configurações de segurança
 */
export const SECURITY_CONFIG = {
  // Configurações de JWT
  jwt: {
    algorithm: 'HS256' as const,
    expiresIn: import.meta.env.VITE_JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: import.meta.env.VITE_JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: import.meta.env.VITE_JWT_ISSUER || ENV.APP_NAME,
    audience: import.meta.env.VITE_JWT_AUDIENCE || ENV.APP_URL,
  },
  
  // Configurações de criptografia
  encryption: {
    algorithm: 'aes-256-gcm' as const,
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    saltLength: 32,
    iterations: 100000,
  },
  
  // Configurações de hash
  hashing: {
    algorithm: 'sha256' as const,
    saltRounds: parseInt(import.meta.env.VITE_BCRYPT_SALT_ROUNDS || '12', 10),
    pepper: import.meta.env.VITE_PASSWORD_PEPPER || '',
  },
  
  // Configurações de senha
  password: {
    minLength: parseInt(import.meta.env.VITE_PASSWORD_MIN_LENGTH || '8', 10),
    maxLength: parseInt(import.meta.env.VITE_PASSWORD_MAX_LENGTH || '128', 10),
    requireUppercase: import.meta.env.VITE_PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: import.meta.env.VITE_PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumbers: import.meta.env.VITE_PASSWORD_REQUIRE_NUMBERS !== 'false',
    requireSymbols: import.meta.env.VITE_PASSWORD_REQUIRE_SYMBOLS !== 'false',
    preventCommonPasswords: import.meta.env.VITE_PASSWORD_PREVENT_COMMON !== 'false',
    preventPersonalInfo: import.meta.env.VITE_PASSWORD_PREVENT_PERSONAL !== 'false',
    historyLength: parseInt(import.meta.env.VITE_PASSWORD_HISTORY_LENGTH || '5', 10),
    expiryDays: parseInt(import.meta.env.VITE_PASSWORD_EXPIRY_DAYS || '90', 10),
  },
  
  // Configurações de rate limiting
  rateLimit: {
    enabled: ENV.ENABLE_RATE_LIMITING,
    windowMs: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos
    maxRequests: parseInt(import.meta.env.VITE_RATE_LIMIT_MAX_REQUESTS || '100', 10),
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    
    // Rate limits específicos
    auth: {
      windowMs: 900000, // 15 minutos
      maxRequests: 5, // 5 tentativas de login
    },
    api: {
      windowMs: 900000, // 15 minutos
      maxRequests: 1000, // 1000 requests
    },
    upload: {
      windowMs: 3600000, // 1 hora
      maxRequests: 50, // 50 uploads
    },
  },
  
  // Configurações de CORS
  cors: {
    enabled: ENV.ENABLE_CORS,
    origin: import.meta.env.VITE_CORS_ORIGIN?.split(',') || [ENV.APP_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Tenant-ID',
      'X-Request-ID',
    ],
    credentials: true,
    maxAge: 86400, // 24 horas
  },
  
  // Configurações de CSP
  csp: {
    enabled: import.meta.env.VITE_ENABLE_CSP === 'true',
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", SUPABASE_CONFIG.url],
      fontSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  // Configurações de auditoria
  audit: {
    enabled: import.meta.env.VITE_ENABLE_AUDIT_LOGS !== 'false',
    logLevel: import.meta.env.VITE_AUDIT_LOG_LEVEL || 'info',
    retentionDays: parseInt(import.meta.env.VITE_AUDIT_RETENTION_DAYS || '365', 10),
    
    // Eventos auditados
    events: {
      auth: true,
      dataAccess: true,
      dataModification: true,
      adminActions: true,
      securityEvents: true,
      systemEvents: true,
    },
    
    // Dados sensíveis para mascarar
    sensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'cpf',
      'cnpj',
      'creditCard',
      'bankAccount',
      'ssn',
      'passport',
    ],
  },
} as const;

// =====================================================
// CACHE CONFIGURATION
// =====================================================

/**
 * Configurações de cache
 */
export const CACHE_CONFIG = {
  enabled: ENV.ENABLE_CACHE,
  
  // Configurações do Redis
  redis: {
    enabled: import.meta.env.VITE_ENABLE_REDIS === 'true',
    url: import.meta.env.VITE_REDIS_URL || 'redis://localhost:6379',
    host: import.meta.env.VITE_REDIS_HOST || 'localhost',
    port: parseInt(import.meta.env.VITE_REDIS_PORT || '6379', 10),
    password: import.meta.env.VITE_REDIS_PASSWORD || '',
    db: parseInt(import.meta.env.VITE_REDIS_DB || '0', 10),
    
    // Configurações de conexão
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    
    // Configurações de pool
    family: 4,
    keepAlive: true,
    
    // Configurações de cluster (se aplicável)
    cluster: {
      enabled: import.meta.env.VITE_REDIS_CLUSTER_ENABLED === 'true',
      nodes: import.meta.env.VITE_REDIS_CLUSTER_NODES?.split(',') || [],
    },
  },
  
  // Configurações de cache em memória
  memory: {
    enabled: true,
    maxSize: parseInt(import.meta.env.VITE_MEMORY_CACHE_MAX_SIZE || '100', 10),
    defaultTtl: parseInt(import.meta.env.VITE_MEMORY_CACHE_DEFAULT_TTL || '300000', 10), // 5 minutos
  },
  
  // TTLs específicos por tipo de dados
  ttl: {
    user: 300000, // 5 minutos
    session: 1800000, // 30 minutos
    config: 3600000, // 1 hora
    reports: 1800000, // 30 minutos
    calculations: 600000, // 10 minutos
    notifications: 60000, // 1 minuto
    static: 86400000, // 24 horas
  },
  
  // Prefixos para chaves de cache
  prefixes: {
    user: 'user:',
    session: 'session:',
    config: 'config:',
    reports: 'reports:',
    calculations: 'calc:',
    notifications: 'notif:',
    locks: 'lock:',
    rate_limit: 'rl:',
  },
} as const;

// =====================================================
// MONITORING CONFIGURATION
// =====================================================

/**
 * Configurações de monitoramento
 */
export const MONITORING_CONFIG = {
  enabled: ENV.ENABLE_MONITORING,
  
  // Configurações de métricas
  metrics: {
    enabled: import.meta.env.VITE_ENABLE_METRICS !== 'false',
    endpoint: import.meta.env.VITE_METRICS_ENDPOINT || '/metrics',
    interval: parseInt(import.meta.env.VITE_METRICS_INTERVAL || '30000', 10), // 30 segundos
    
    // Métricas habilitadas
    types: {
      http: true,
      database: true,
      cache: true,
      memory: true,
      cpu: true,
      custom: true,
    },
  },
  
  // Configurações de health check
  healthCheck: {
    enabled: import.meta.env.VITE_ENABLE_HEALTH_CHECK !== 'false',
    endpoint: import.meta.env.VITE_HEALTH_CHECK_ENDPOINT || '/health',
    interval: parseInt(import.meta.env.VITE_HEALTH_CHECK_INTERVAL || '30000', 10),
    timeout: parseInt(import.meta.env.VITE_HEALTH_CHECK_TIMEOUT || '5000', 10),
    
    // Checks habilitados
    checks: {
      database: true,
      cache: true,
      storage: true,
      external: true,
    },
  },
  
  // Configurações de alertas
  alerts: {
    enabled: import.meta.env.VITE_ENABLE_ALERTS === 'true',
    
    // Thresholds
    thresholds: {
      errorRate: parseFloat(import.meta.env.VITE_ALERT_ERROR_RATE || '0.05'), // 5%
      responseTime: parseInt(import.meta.env.VITE_ALERT_RESPONSE_TIME || '5000', 10), // 5s
      memoryUsage: parseFloat(import.meta.env.VITE_ALERT_MEMORY_USAGE || '0.8'), // 80%
      cpuUsage: parseFloat(import.meta.env.VITE_ALERT_CPU_USAGE || '0.8'), // 80%
      diskUsage: parseFloat(import.meta.env.VITE_ALERT_DISK_USAGE || '0.9'), // 90%
    },
    
    // Canais de notificação
    channels: {
      email: {
        enabled: import.meta.env.VITE_ENABLE_EMAIL_ALERTS === 'true',
        recipients: import.meta.env.VITE_ALERT_EMAIL_RECIPIENTS?.split(',') || [],
      },
      slack: {
        enabled: import.meta.env.VITE_ENABLE_SLACK_ALERTS === 'true',
        webhook: import.meta.env.VITE_SLACK_WEBHOOK_URL || '',
        channel: import.meta.env.VITE_SLACK_ALERT_CHANNEL || '#alerts',
      },
      webhook: {
        enabled: import.meta.env.VITE_ENABLE_WEBHOOK_ALERTS === 'true',
        url: import.meta.env.VITE_ALERT_WEBHOOK_URL || '',
      },
    },
  },
  
  // Configurações de tracing
  tracing: {
    enabled: import.meta.env.VITE_ENABLE_TRACING === 'true',
    serviceName: import.meta.env.VITE_TRACE_SERVICE_NAME || ENV.APP_NAME,
    
    // Configurações do OpenTelemetry
    opentelemetry: {
      endpoint: import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || '',
      headers: import.meta.env.VITE_OTEL_EXPORTER_OTLP_HEADERS || '',
    },
    
    // Configurações do Jaeger
    jaeger: {
      enabled: import.meta.env.VITE_ENABLE_JAEGER === 'true',
      endpoint: import.meta.env.VITE_JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    },
  },
  
  // Configurações de logging
  logging: {
    level: ENV.LOG_LEVEL,
    format: import.meta.env.VITE_LOG_FORMAT || 'json',
    
    // Configurações de arquivo
    file: {
      enabled: ENV.ENABLE_FILE_LOGS,
      path: import.meta.env.VITE_LOG_FILE_PATH || './logs',
      maxSize: import.meta.env.VITE_LOG_FILE_MAX_SIZE || '10MB',
      maxFiles: parseInt(import.meta.env.VITE_LOG_FILE_MAX_FILES || '5', 10),
      datePattern: import.meta.env.VITE_LOG_FILE_DATE_PATTERN || 'YYYY-MM-DD',
    },
    
    // Configurações de console
    console: {
      enabled: ENV.ENABLE_CONSOLE_LOGS,
      colorize: import.meta.env.VITE_LOG_COLORIZE !== 'false',
    },
    
    // Configurações de transporte externo
    external: {
      enabled: import.meta.env.VITE_ENABLE_EXTERNAL_LOGGING === 'true',
      
      // Elasticsearch
      elasticsearch: {
        enabled: import.meta.env.VITE_ENABLE_ELASTICSEARCH_LOGGING === 'true',
        node: import.meta.env.VITE_ELASTICSEARCH_NODE || 'http://localhost:9200',
        index: import.meta.env.VITE_ELASTICSEARCH_INDEX || 'revalya-logs',
      },
      
      // Logstash
      logstash: {
        enabled: import.meta.env.VITE_ENABLE_LOGSTASH === 'true',
        host: import.meta.env.VITE_LOGSTASH_HOST || 'localhost',
        port: parseInt(import.meta.env.VITE_LOGSTASH_PORT || '5000', 10),
      },
    },
  },
} as const;

// =====================================================
// INTEGRATION CONFIGURATION
// =====================================================

/**
 * Configurações de integrações externas
 */
export const INTEGRATION_CONFIG = {
  // Configurações de email
  email: {
    enabled: import.meta.env.VITE_ENABLE_EMAIL === 'true',
    provider: import.meta.env.VITE_EMAIL_PROVIDER || 'smtp',
    
    // Configurações SMTP
    smtp: {
      host: import.meta.env.VITE_SMTP_HOST || '',
      port: parseInt(import.meta.env.VITE_SMTP_PORT || '587', 10),
      secure: import.meta.env.VITE_SMTP_SECURE === 'true',
      auth: {
        user: import.meta.env.VITE_SMTP_USER || '',
        pass: import.meta.env.VITE_SMTP_PASS || '',
      },
    },
    
    // Configurações de templates
    templates: {
      path: import.meta.env.VITE_EMAIL_TEMPLATES_PATH || './templates/email',
      engine: import.meta.env.VITE_EMAIL_TEMPLATE_ENGINE || 'handlebars',
    },
    
    // Configurações padrão
    defaults: {
      from: import.meta.env.VITE_EMAIL_FROM || 'noreply@revalya.com',
      replyTo: import.meta.env.VITE_EMAIL_REPLY_TO || 'support@revalya.com',
    },
  },
  
  // Configurações de SMS
  sms: {
    enabled: import.meta.env.VITE_ENABLE_SMS === 'true',
    provider: import.meta.env.VITE_SMS_PROVIDER || 'twilio',
    
    // Configurações Twilio
    twilio: {
      accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
      authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
      from: import.meta.env.VITE_TWILIO_FROM || '',
    },
    
    // Configurações AWS SNS
    aws: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    },
  },
  
  // Configurações de push notifications
  push: {
    enabled: import.meta.env.VITE_ENABLE_PUSH === 'true',
    
    // Firebase
    firebase: {
      enabled: import.meta.env.VITE_ENABLE_FIREBASE_PUSH === 'true',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      privateKey: import.meta.env.VITE_FIREBASE_PRIVATE_KEY || '',
      clientEmail: import.meta.env.VITE_FIREBASE_CLIENT_EMAIL || '',
    },
    
    // Apple Push Notification
    apn: {
      enabled: import.meta.env.VITE_ENABLE_APN === 'true',
      keyId: import.meta.env.VITE_APN_KEY_ID || '',
      teamId: import.meta.env.VITE_APN_TEAM_ID || '',
      bundleId: import.meta.env.VITE_APN_BUNDLE_ID || '',
      production: import.meta.env.VITE_APN_PRODUCTION === 'true',
    },
  },
  
  // Configurações de pagamento
  payment: {
    // Stripe
    stripe: {
      enabled: import.meta.env.VITE_ENABLE_STRIPE === 'true',
      publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY || '',
      secretKey: import.meta.env.VITE_STRIPE_SECRET_KEY || '',
      webhookSecret: import.meta.env.VITE_STRIPE_WEBHOOK_SECRET || '',
    },
    
    // Asaas
    asaas: {
      enabled: import.meta.env.VITE_ENABLE_ASAAS === 'true',
      apiKey: import.meta.env.VITE_ASAAS_API_KEY || '',
      environment: import.meta.env.VITE_ASAAS_ENVIRONMENT || 'sandbox',
      webhookToken: import.meta.env.VITE_ASAAS_WEBHOOK_TOKEN || '',
    },
    
    // PagSeguro
    pagseguro: {
      enabled: import.meta.env.VITE_ENABLE_PAGSEGURO === 'true',
      email: import.meta.env.VITE_PAGSEGURO_EMAIL || '',
      token: import.meta.env.VITE_PAGSEGURO_TOKEN || '',
      environment: import.meta.env.VITE_PAGSEGURO_ENVIRONMENT || 'sandbox',
    },
    
    // Mercado Pago
    mercadopago: {
      enabled: import.meta.env.VITE_ENABLE_MERCADOPAGO === 'true',
      accessToken: import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || '',
      publicKey: import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '',
      environment: import.meta.env.VITE_MERCADOPAGO_ENVIRONMENT || 'sandbox',
    },
  },
  
  // Configurações bancárias
  banking: {
    // Open Banking
    openBanking: {
      enabled: import.meta.env.VITE_ENABLE_OPEN_BANKING === 'true',
      environment: import.meta.env.VITE_OPEN_BANKING_ENVIRONMENT || 'sandbox',
      clientId: import.meta.env.VITE_OPEN_BANKING_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_OPEN_BANKING_CLIENT_SECRET || '',
      redirectUri: import.meta.env.VITE_OPEN_BANKING_REDIRECT_URI || '',
    },
    
    // PIX
    pix: {
      enabled: import.meta.env.VITE_ENABLE_PIX === 'true',
      provider: import.meta.env.VITE_PIX_PROVIDER || 'bacen',
      
      // Configurações BACEN
      bacen: {
        clientId: import.meta.env.VITE_PIX_BACEN_CLIENT_ID || '',
        clientSecret: import.meta.env.VITE_PIX_BACEN_CLIENT_SECRET || '',
        certificate: import.meta.env.VITE_PIX_BACEN_CERTIFICATE || '',
        privateKey: import.meta.env.VITE_PIX_BACEN_PRIVATE_KEY || '',
      },
    },
  },
  
  // Configurações de analytics
  analytics: {
    enabled: ENV.ENABLE_ANALYTICS,
    
    // Google Analytics
    googleAnalytics: {
      enabled: import.meta.env.VITE_ENABLE_GOOGLE_ANALYTICS === 'true',
      trackingId: import.meta.env.VITE_GOOGLE_ANALYTICS_TRACKING_ID || '',
      measurementId: import.meta.env.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID || '',
    },
    
    // Mixpanel
    mixpanel: {
      enabled: import.meta.env.VITE_ENABLE_MIXPANEL === 'true',
      token: import.meta.env.VITE_MIXPANEL_TOKEN || '',
    },
    
    // Amplitude
    amplitude: {
      enabled: import.meta.env.VITE_ENABLE_AMPLITUDE === 'true',
      apiKey: import.meta.env.VITE_AMPLITUDE_API_KEY || '',
    },
  },
  
  // Configurações de storage externo
  storage: {
    // AWS S3
    s3: {
      enabled: import.meta.env.VITE_ENABLE_S3 === 'true',
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      bucket: import.meta.env.VITE_S3_BUCKET || '',
    },
    
    // Google Cloud Storage
    gcs: {
      enabled: import.meta.env.VITE_ENABLE_GCS === 'true',
      projectId: import.meta.env.VITE_GCP_PROJECT_ID || '',
      keyFilename: import.meta.env.VITE_GCP_KEY_FILENAME || '',
      bucket: import.meta.env.VITE_GCS_BUCKET || '',
    },
    
    // Azure Blob Storage
    azure: {
      enabled: import.meta.env.VITE_ENABLE_AZURE_STORAGE === 'true',
      connectionString: import.meta.env.VITE_AZURE_STORAGE_CONNECTION_STRING || '',
      containerName: import.meta.env.VITE_AZURE_CONTAINER_NAME || '',
    },
  },
} as const;

// =====================================================
// BUSINESS CONFIGURATION
// =====================================================

/**
 * Configurações de negócio
 */
export const BUSINESS_CONFIG = {
  // Configurações financeiras
  financial: {
    defaultCurrency: ENV.DEFAULT_CURRENCY,
    supportedCurrencies: ['BRL', 'USD', 'EUR'] as Currency[],
    
    // Configurações de cálculo
    calculations: {
      precision: parseInt(import.meta.env.VITE_FINANCIAL_PRECISION || '4', 10),
      roundingMode: import.meta.env.VITE_FINANCIAL_ROUNDING_MODE || 'ROUND_HALF_UP',
      
      // Taxas padrão
      defaultInterestRate: parseFloat(import.meta.env.VITE_DEFAULT_INTEREST_RATE || '0.01'),
      defaultDiscountRate: parseFloat(import.meta.env.VITE_DEFAULT_DISCOUNT_RATE || '0.1'),
      
      // Limites
      maxCalculationAmount: parseFloat(import.meta.env.VITE_MAX_CALCULATION_AMOUNT || '1000000000'),
      maxCalculationPeriods: parseInt(import.meta.env.VITE_MAX_CALCULATION_PERIODS || '1200', 10),
    },
    
    // Configurações de relatórios
    reports: {
      maxRecords: parseInt(import.meta.env.VITE_REPORT_MAX_RECORDS || '100000', 10),
      defaultFormat: import.meta.env.VITE_REPORT_DEFAULT_FORMAT || 'PDF',
      supportedFormats: ['PDF', 'XLSX', 'CSV', 'JSON'],
      
      // Configurações de agendamento
      scheduling: {
        enabled: import.meta.env.VITE_ENABLE_REPORT_SCHEDULING === 'true',
        maxScheduledReports: parseInt(import.meta.env.VITE_MAX_SCHEDULED_REPORTS || '50', 10),
      },
    },
  },
  
  // Configurações de contratos
  contracts: {
    // Configurações de assinatura digital
    digitalSignature: {
      enabled: import.meta.env.VITE_ENABLE_DIGITAL_SIGNATURE === 'true',
      provider: import.meta.env.VITE_DIGITAL_SIGNATURE_PROVIDER || 'docusign',
      
      // Configurações de validade
      defaultValidityDays: parseInt(import.meta.env.VITE_CONTRACT_DEFAULT_VALIDITY_DAYS || '365', 10),
      maxValidityDays: parseInt(import.meta.env.VITE_CONTRACT_MAX_VALIDITY_DAYS || '3650', 10),
      
      // Configurações de lembretes
      reminderDays: [30, 15, 7, 1], // Dias antes do vencimento
    },
    
    // Configurações de templates
    templates: {
      path: import.meta.env.VITE_CONTRACT_TEMPLATES_PATH || './templates/contracts',
      defaultLanguage: import.meta.env.VITE_CONTRACT_DEFAULT_LANGUAGE || 'pt-BR',
      supportedLanguages: ['pt-BR', 'en-US', 'es-ES'],
    },
  },
  
  // Configurações de notificações
  notifications: {
    // Configurações padrão
    defaults: {
      channel: 'EMAIL' as const,
      priority: 'MEDIUM' as const,
      retryAttempts: 3,
      retryDelay: 5000,
    },
    
    // Configurações de templates
    templates: {
      path: import.meta.env.VITE_NOTIFICATION_TEMPLATES_PATH || './templates/notifications',
      engine: import.meta.env.VITE_NOTIFICATION_TEMPLATE_ENGINE || 'handlebars',
    },
    
    // Configurações de agendamento
    scheduling: {
      enabled: import.meta.env.VITE_ENABLE_NOTIFICATION_SCHEDULING === 'true',
      batchSize: parseInt(import.meta.env.VITE_NOTIFICATION_BATCH_SIZE || '100', 10),
      processingInterval: parseInt(import.meta.env.VITE_NOTIFICATION_PROCESSING_INTERVAL || '60000', 10),
    },
  },
  
  // Configurações de auditoria
  audit: {
    // Configurações de retenção
    retention: {
      defaultDays: parseInt(import.meta.env.VITE_AUDIT_DEFAULT_RETENTION_DAYS || '2555', 10), // 7 anos
      financialDays: parseInt(import.meta.env.VITE_AUDIT_FINANCIAL_RETENTION_DAYS || '3650', 10), // 10 anos
      contractDays: parseInt(import.meta.env.VITE_AUDIT_CONTRACT_RETENTION_DAYS || '3650', 10), // 10 anos
      systemDays: parseInt(import.meta.env.VITE_AUDIT_SYSTEM_RETENTION_DAYS || '365', 10), // 1 ano
    },
    
    // Configurações de compliance
    compliance: {
      enabled: import.meta.env.VITE_ENABLE_COMPLIANCE_MONITORING === 'true',
      regulations: ['LGPD', 'SOX', 'BACEN'] as const,
      
      // Configurações de relatórios de compliance
      reporting: {
        enabled: import.meta.env.VITE_ENABLE_COMPLIANCE_REPORTING === 'true',
        schedule: import.meta.env.VITE_COMPLIANCE_REPORT_SCHEDULE || '0 0 1 * *', // Mensal
        recipients: import.meta.env.VITE_COMPLIANCE_REPORT_RECIPIENTS?.split(',') || [],
      },
    },
  },
} as const;

// =====================================================
// FEATURE FLAGS
// =====================================================

/**
 * Feature flags para controle de funcionalidades
 */
export const FEATURE_FLAGS = {
  // Funcionalidades principais
  FINANCIAL_CALCULATIONS: import.meta.env.VITE_FEATURE_FINANCIAL_CALCULATIONS !== 'false',
  DIGITAL_CONTRACTS: import.meta.env.VITE_FEATURE_DIGITAL_CONTRACTS !== 'false',
  PAYMENT_PROCESSING: import.meta.env.VITE_FEATURE_PAYMENT_PROCESSING !== 'false',
  INVESTMENT_ANALYSIS: import.meta.env.VITE_FEATURE_INVESTMENT_ANALYSIS !== 'false',
  RISK_MANAGEMENT: import.meta.env.VITE_FEATURE_RISK_MANAGEMENT !== 'false',
  BANKING_INTEGRATION: import.meta.env.VITE_FEATURE_BANKING_INTEGRATION !== 'false',
  
  // Funcionalidades avançadas
  AUTOMATION_WORKFLOWS: import.meta.env.VITE_FEATURE_AUTOMATION_WORKFLOWS === 'true',
  AI_INSIGHTS: import.meta.env.VITE_FEATURE_AI_INSIGHTS === 'true',
  PREDICTIVE_ANALYTICS: import.meta.env.VITE_FEATURE_PREDICTIVE_ANALYTICS === 'true',
  FRAUD_DETECTION: import.meta.env.VITE_FEATURE_FRAUD_DETECTION === 'true',
  COMPLIANCE_AUTOMATION: import.meta.env.VITE_FEATURE_COMPLIANCE_AUTOMATION === 'true',
  
  // Funcionalidades experimentais
  BLOCKCHAIN_INTEGRATION: import.meta.env.VITE_FEATURE_BLOCKCHAIN === 'true',
  QUANTUM_ENCRYPTION: import.meta.env.VITE_FEATURE_QUANTUM_ENCRYPTION === 'true',
  VOICE_INTERFACE: import.meta.env.VITE_FEATURE_VOICE_INTERFACE === 'true',
  AUGMENTED_REALITY: import.meta.env.VITE_FEATURE_AR === 'true',
  
  // Funcionalidades de desenvolvimento
  DEBUG_MODE: ENV.DEBUG,
  MOCK_INTEGRATIONS: import.meta.env.VITE_FEATURE_MOCK_INTEGRATIONS === 'true',
  PERFORMANCE_PROFILING: import.meta.env.VITE_FEATURE_PERFORMANCE_PROFILING === 'true',
  A_B_TESTING: import.meta.env.VITE_FEATURE_AB_TESTING === 'true',
} as const;

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Valida se todas as configurações obrigatórias estão presentes
 */
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validações obrigatórias do Supabase
  if (!SUPABASE_CONFIG.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL é obrigatório');
  }
  
  if (!SUPABASE_CONFIG.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatório');
  }
  
  // Validações de segurança em produção
  if (ENV.NODE_ENV === 'production') {
    if (!SUPABASE_CONFIG.serviceRoleKey) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY é obrigatório em produção');
    }
    
    if (!ENV.ENABLE_HTTPS) {
      errors.push('HTTPS deve estar habilitado em produção');
    }
    
    if (ENV.DEBUG) {
      errors.push('DEBUG deve estar desabilitado em produção');
    }
  }
  
  // Validações de integrações habilitadas
  if (INTEGRATION_CONFIG.email.enabled && !INTEGRATION_CONFIG.email.smtp.host) {
    errors.push('SMTP_HOST é obrigatório quando email está habilitado');
  }
  
  if (INTEGRATION_CONFIG.payment.stripe.enabled && !INTEGRATION_CONFIG.payment.stripe.secretKey) {
    errors.push('STRIPE_SECRET_KEY é obrigatório quando Stripe está habilitado');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Obtém configuração específica por chave
 */
export const getConfig = <T>(key: string, defaultValue?: T): T => {
  const keys = key.split('.');
  let value: any = {
    env: ENV,
    supabase: SUPABASE_CONFIG,
    security: SECURITY_CONFIG,
    cache: CACHE_CONFIG,
    monitoring: MONITORING_CONFIG,
    integration: INTEGRATION_CONFIG,
    business: BUSINESS_CONFIG,
    features: FEATURE_FLAGS,
  };
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      return defaultValue as T;
    }
  }
  
  return value as T;
};

/**
 * Verifica se uma feature flag está habilitada
 */
export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[feature];
};

/**
 * Obtém configurações de ambiente específicas
 */
export const getEnvironmentConfig = () => {
  return {
    isDevelopment: ENV.NODE_ENV === 'development',
    isProduction: ENV.NODE_ENV === 'production',
    isTest: ENV.NODE_ENV === 'test',
    isDebug: ENV.DEBUG,
    version: ENV.APP_VERSION,
    name: ENV.APP_NAME,
  };
};

/**
 * Obtém configurações de segurança baseadas no ambiente
 */
export const getSecurityConfig = () => {
  const isProduction = ENV.NODE_ENV === 'production';
  
  return {
    ...SECURITY_CONFIG,
    
    // Configurações mais restritivas em produção
    rateLimit: {
      ...SECURITY_CONFIG.rateLimit,
      maxRequests: isProduction 
        ? SECURITY_CONFIG.rateLimit.maxRequests 
        : SECURITY_CONFIG.rateLimit.maxRequests * 2,
    },
    
    password: {
      ...SECURITY_CONFIG.password,
      minLength: isProduction 
        ? Math.max(SECURITY_CONFIG.password.minLength, 10)
        : SECURITY_CONFIG.password.minLength,
    },
    
    audit: {
      ...SECURITY_CONFIG.audit,
      enabled: isProduction ? true : SECURITY_CONFIG.audit.enabled,
    },
  };
};

/**
 * Obtém configurações de cache baseadas no ambiente
 */
export const getCacheConfig = () => {
  const isProduction = ENV.NODE_ENV === 'production';
  
  return {
    ...CACHE_CONFIG,
    
    // TTLs mais longos em produção
    ttl: {
      ...CACHE_CONFIG.ttl,
      user: isProduction ? CACHE_CONFIG.ttl.user * 2 : CACHE_CONFIG.ttl.user,
      config: isProduction ? CACHE_CONFIG.ttl.config * 2 : CACHE_CONFIG.ttl.config,
    },
  };
};

// =====================================================
// EXPORTS
// =====================================================

export default {
  ENV,
  SUPABASE_CONFIG,
  SECURITY_CONFIG,
  CACHE_CONFIG,
  MONITORING_CONFIG,
  INTEGRATION_CONFIG,
  BUSINESS_CONFIG,
  FEATURE_FLAGS,
  validateConfig,
  getConfig,
  isFeatureEnabled,
  getEnvironmentConfig,
  getSecurityConfig,
  getCacheConfig,
};

// =====================================================
// TYPE EXPORTS
// =====================================================

export type ConfigKey = 
  | 'env'
  | 'supabase'
  | 'security'
  | 'cache'
  | 'monitoring'
  | 'integration'
  | 'business'
  | 'features';

export type EnvironmentType = typeof ENV.NODE_ENV;
export type LogLevel = typeof ENV.LOG_LEVEL;
export type FeatureFlag = keyof typeof FEATURE_FLAGS;
export type IntegrationProvider = 
  | 'stripe'
  | 'asaas'
  | 'pagseguro'
  | 'mercadopago'
  | 'twilio'
  | 'firebase'
  | 'aws'
  | 'google'
  | 'microsoft';

export type CacheProvider = 'memory' | 'redis';
export type EmailProvider = 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
export type SMSProvider = 'twilio' | 'aws' | 'nexmo';
export type StorageProvider = 'supabase' | 's3' | 'gcs' | 'azure';
export type PaymentProvider = 'stripe' | 'asaas' | 'pagseguro' | 'mercadopago';
export type AuthProvider = 'google' | 'github' | 'microsoft' | 'apple';

// =====================================================
// RUNTIME VALIDATION
// =====================================================

// Executa validação na inicialização
if (typeof window === 'undefined') {
  const validation = validateConfig();
  
  if (!validation.isValid) {
    console.error('❌ Configuração inválida:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    
    if (ENV.NODE_ENV === 'production' && typeof process !== 'undefined' && typeof process.exit === 'function') {
      process.exit(1);
    }
  } else {
    console.log('✅ Configuração validada com sucesso');
  }
}

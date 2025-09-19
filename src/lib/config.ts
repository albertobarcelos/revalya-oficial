// =====================================================
// SYSTEM CONFIGURATION
// Descrição: Configurações centralizadas do sistema e variáveis de ambiente
// =====================================================

// =====================================================
// VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE
// =====================================================

function getEnvVar(name: string, defaultValue?: string): string {
  const value = import.meta.env[name] || defaultValue
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada`)
  }
  return value
}

function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  return import.meta.env[name] || defaultValue
}

function getBooleanEnvVar(name: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[name]
  if (!value) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

function getNumberEnvVar(name: string, defaultValue?: number): number {
  const value = import.meta.env[name]
  if (!value) {
    if (defaultValue !== undefined) return defaultValue
    throw new Error(`Variável de ambiente ${name} não configurada`)
  }
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new Error(`Variável de ambiente ${name} deve ser um número válido`)
  }
  return parsed
}

// =====================================================
// CONFIGURAÇÕES DO SUPABASE
// =====================================================

export const supabaseConfig = {
  url: getEnvVar('VITE_SUPABASE_URL'),
  anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  serviceRoleKey: getOptionalEnvVar('VITE_SUPABASE_SERVICE_ROLE_KEY'),
  jwtSecret: getOptionalEnvVar('VITE_SUPABASE_JWT_SECRET'),
} as const

// =====================================================
// CONFIGURAÇÕES DA APLICAÇÃO
// =====================================================

export const appConfig = {
  name: 'Revalya Financial System',
  version: '1.0.0',
  description: 'Sistema Financeiro Avançado com Supabase',
  url: getOptionalEnvVar('VITE_APP_URL', 'http://localhost:5173'),
  environment: getOptionalEnvVar('VITE_NODE_ENV', 'development') as 'development' | 'production' | 'test',
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  isTest: import.meta.env.MODE === 'test',
} as const

// =====================================================
// CONFIGURAÇÕES DE SEGURANÇA
// =====================================================

export const securityConfig = {
  // Configurações de sessão
  sessionTimeout: getNumberEnvVar('SESSION_TIMEOUT', 24 * 60 * 60), // 24 horas em segundos
  refreshTokenTimeout: getNumberEnvVar('REFRESH_TOKEN_TIMEOUT', 7 * 24 * 60 * 60), // 7 dias
  
  // Configurações de senha
  passwordMinLength: getNumberEnvVar('PASSWORD_MIN_LENGTH', 8),
  passwordMaxLength: getNumberEnvVar('PASSWORD_MAX_LENGTH', 128),
  passwordRequireUppercase: getBooleanEnvVar('PASSWORD_REQUIRE_UPPERCASE', true),
  passwordRequireLowercase: getBooleanEnvVar('PASSWORD_REQUIRE_LOWERCASE', true),
  passwordRequireNumbers: getBooleanEnvVar('PASSWORD_REQUIRE_NUMBERS', true),
  passwordRequireSpecialChars: getBooleanEnvVar('PASSWORD_REQUIRE_SPECIAL_CHARS', true),
  
  // Rate limiting
  rateLimitWindow: getNumberEnvVar('RATE_LIMIT_WINDOW', 15 * 60), // 15 minutos
  rateLimitMaxRequests: getNumberEnvVar('RATE_LIMIT_MAX_REQUESTS', 100),
  
  // CORS
  corsOrigins: getOptionalEnvVar('CORS_ORIGINS', '*'),
  
  // Criptografia
  encryptionKey: getOptionalEnvVar('ENCRYPTION_KEY'),
  hashSaltRounds: getNumberEnvVar('HASH_SALT_ROUNDS', 12),
} as const

// =====================================================
// CONFIGURAÇÕES DE EMAIL
// =====================================================

export const emailConfig = {
  provider: getOptionalEnvVar('EMAIL_PROVIDER', 'resend') as 'resend' | 'sendgrid' | 'smtp',
  
  // Resend
  resendApiKey: getOptionalEnvVar('RESEND_API_KEY'),
  
  // SendGrid
  sendgridApiKey: getOptionalEnvVar('SENDGRID_API_KEY'),
  
  // SMTP
  smtpHost: getOptionalEnvVar('SMTP_HOST'),
  smtpPort: getNumberEnvVar('SMTP_PORT', 587),
  smtpUser: getOptionalEnvVar('SMTP_USER'),
  smtpPassword: getOptionalEnvVar('SMTP_PASSWORD'),
  smtpSecure: getBooleanEnvVar('SMTP_SECURE', false),
  
  // Configurações gerais
  fromEmail: getOptionalEnvVar('FROM_EMAIL', 'noreply@revalya.com'),
  fromName: getOptionalEnvVar('FROM_NAME', 'Revalya Financial'),
  replyToEmail: getOptionalEnvVar('REPLY_TO_EMAIL'),
  
  // Templates
  templatesEnabled: getBooleanEnvVar('EMAIL_TEMPLATES_ENABLED', true),
  defaultTemplate: getOptionalEnvVar('DEFAULT_EMAIL_TEMPLATE', 'default'),
} as const

// =====================================================
// CONFIGURAÇÕES DE SMS
// =====================================================

export const smsConfig = {
  provider: getOptionalEnvVar('SMS_PROVIDER', 'twilio') as 'twilio' | 'aws-sns' | 'disabled',
  
  // Twilio
  twilioAccountSid: getOptionalEnvVar('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: getOptionalEnvVar('TWILIO_AUTH_TOKEN'),
  twilioPhoneNumber: getOptionalEnvVar('TWILIO_PHONE_NUMBER'),
  
  // AWS SNS
  awsAccessKeyId: getOptionalEnvVar('AWS_ACCESS_KEY_ID'),
  awsSecretAccessKey: getOptionalEnvVar('AWS_SECRET_ACCESS_KEY'),
  awsRegion: getOptionalEnvVar('AWS_REGION', 'us-east-1'),
  
  // Configurações gerais
  enabled: getBooleanEnvVar('SMS_ENABLED', false),
  maxLength: getNumberEnvVar('SMS_MAX_LENGTH', 160),
} as const

// =====================================================
// CONFIGURAÇÕES DE PUSH NOTIFICATIONS
// =====================================================

export const pushConfig = {
  enabled: getBooleanEnvVar('PUSH_NOTIFICATIONS_ENABLED', false),
  
  // Firebase
  firebaseProjectId: getOptionalEnvVar('FIREBASE_PROJECT_ID'),
  firebasePrivateKey: getOptionalEnvVar('FIREBASE_PRIVATE_KEY'),
  firebaseClientEmail: getOptionalEnvVar('FIREBASE_CLIENT_EMAIL'),
  
  // Web Push
  vapidPublicKey: getOptionalEnvVar('VAPID_PUBLIC_KEY'),
  vapidPrivateKey: getOptionalEnvVar('VAPID_PRIVATE_KEY'),
  vapidSubject: getOptionalEnvVar('VAPID_SUBJECT', 'mailto:admin@revalya.com'),
} as const

// =====================================================
// CONFIGURAÇÕES DE STORAGE
// =====================================================

export const storageConfig = {
  provider: getOptionalEnvVar('STORAGE_PROVIDER', 'supabase') as 'supabase' | 'aws-s3' | 'local',
  
  // Supabase Storage
  supabaseStorageUrl: getOptionalEnvVar('SUPABASE_STORAGE_URL'),
  
  // AWS S3
  awsS3Bucket: getOptionalEnvVar('AWS_S3_BUCKET'),
  awsS3Region: getOptionalEnvVar('AWS_S3_REGION', 'us-east-1'),
  awsS3AccessKeyId: getOptionalEnvVar('AWS_S3_ACCESS_KEY_ID'),
  awsS3SecretAccessKey: getOptionalEnvVar('AWS_S3_SECRET_ACCESS_KEY'),
  
  // Local Storage
  localStoragePath: getOptionalEnvVar('LOCAL_STORAGE_PATH', './uploads'),
  
  // Configurações gerais
  maxFileSize: getNumberEnvVar('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
  allowedFileTypes: getOptionalEnvVar('ALLOWED_FILE_TYPES', 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif')?.split(',') || [],
  cdnUrl: getOptionalEnvVar('CDN_URL'),
} as const

// =====================================================
// CONFIGURAÇÕES DE LOGGING
// =====================================================

export const loggingConfig = {
  level: getOptionalEnvVar('LOG_LEVEL', 'info') as 'error' | 'warn' | 'info' | 'debug',
  format: getOptionalEnvVar('LOG_FORMAT', 'json') as 'json' | 'text',
  
  // Destinos de log
  console: getBooleanEnvVar('LOG_TO_CONSOLE', true),
  file: getBooleanEnvVar('LOG_TO_FILE', false),
  database: getBooleanEnvVar('LOG_TO_DATABASE', true),
  
  // Configurações de arquivo
  logFilePath: getOptionalEnvVar('LOG_FILE_PATH', './logs'),
  maxFileSize: getNumberEnvVar('LOG_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
  maxFiles: getNumberEnvVar('LOG_MAX_FILES', 5),
  
  // Serviços externos
  sentryDsn: getOptionalEnvVar('SENTRY_DSN'),
  logflareApiKey: getOptionalEnvVar('LOGFLARE_API_KEY'),
  logflareSourceToken: getOptionalEnvVar('LOGFLARE_SOURCE_TOKEN'),
} as const

// =====================================================
// CONFIGURAÇÕES DE CACHE
// =====================================================

export const cacheConfig = {
  provider: getOptionalEnvVar('CACHE_PROVIDER', 'memory') as 'memory' | 'redis' | 'disabled',
  
  // Redis
  redisUrl: getOptionalEnvVar('REDIS_URL'),
  redisHost: getOptionalEnvVar('REDIS_HOST', 'localhost'),
  redisPort: getNumberEnvVar('REDIS_PORT', 6379),
  redisPassword: getOptionalEnvVar('REDIS_PASSWORD'),
  redisDb: getNumberEnvVar('REDIS_DB', 0),
  
  // Configurações gerais
  defaultTtl: getNumberEnvVar('CACHE_DEFAULT_TTL', 3600), // 1 hora
  maxMemoryUsage: getNumberEnvVar('CACHE_MAX_MEMORY', 100 * 1024 * 1024), // 100MB
} as const

// =====================================================
// CONFIGURAÇÕES DE MONITORAMENTO
// =====================================================

export const monitoringConfig = {
  enabled: getBooleanEnvVar('MONITORING_ENABLED', true),
  
  // Métricas
  metricsEnabled: getBooleanEnvVar('METRICS_ENABLED', true),
  metricsPort: getNumberEnvVar('METRICS_PORT', 9090),
  
  // Health checks
  healthCheckEnabled: getBooleanEnvVar('HEALTH_CHECK_ENABLED', true),
  healthCheckInterval: getNumberEnvVar('HEALTH_CHECK_INTERVAL', 30), // segundos
  
  // Alertas
  alertsEnabled: getBooleanEnvVar('ALERTS_ENABLED', false),
  alertWebhookUrl: getOptionalEnvVar('ALERT_WEBHOOK_URL'),
  
  // Performance
  performanceMonitoring: getBooleanEnvVar('PERFORMANCE_MONITORING', true),
  slowQueryThreshold: getNumberEnvVar('SLOW_QUERY_THRESHOLD', 1000), // ms
} as const

// =====================================================
// CONFIGURAÇÕES FINANCEIRAS
// =====================================================

export const financialConfig = {
  // Moeda padrão
  defaultCurrency: getOptionalEnvVar('DEFAULT_CURRENCY', 'BRL'),
  
  // Precisão decimal
  currencyPrecision: getNumberEnvVar('CURRENCY_PRECISION', 2),
  percentagePrecision: getNumberEnvVar('PERCENTAGE_PRECISION', 4),
  ratePrecision: getNumberEnvVar('RATE_PRECISION', 6),
  
  // Limites
  maxTransactionAmount: getNumberEnvVar('MAX_TRANSACTION_AMOUNT', 999999999999.99),
  minTransactionAmount: getNumberEnvVar('MIN_TRANSACTION_AMOUNT', 0.01),
  maxInterestRate: getNumberEnvVar('MAX_INTEREST_RATE', 1000), // 1000%
  minInterestRate: getNumberEnvVar('MIN_INTEREST_RATE', -100), // -100%
  
  // Configurações de cálculo
  daysInYear: getNumberEnvVar('DAYS_IN_YEAR', 365),
  businessDaysInYear: getNumberEnvVar('BUSINESS_DAYS_IN_YEAR', 252),
  daysInMonth: getNumberEnvVar('DAYS_IN_MONTH', 30),
  
  // Taxas de referência (devem ser atualizadas via API)
  selicRate: getNumberEnvVar('SELIC_RATE', 11.75) / 100, // 11.75%
  cdiRate: getNumberEnvVar('CDI_RATE', 11.65) / 100, // 11.65%
  ipcaRate: getNumberEnvVar('IPCA_RATE', 4.56) / 100, // 4.56%
  
  // APIs externas
  bcbApiUrl: getOptionalEnvVar('BCB_API_URL', 'https://api.bcb.gov.br'),
  bcbApiKey: getOptionalEnvVar('BCB_API_KEY'),
  
  // Configurações de relatórios
  reportRetentionDays: getNumberEnvVar('REPORT_RETENTION_DAYS', 90),
  maxReportsPerUser: getNumberEnvVar('MAX_REPORTS_PER_USER', 100),
  
  // Configurações de contratos
  contractRetentionYears: getNumberEnvVar('CONTRACT_RETENTION_YEARS', 7),
  maxContractsPerTenant: getNumberEnvVar('MAX_CONTRACTS_PER_TENANT', 1000),
  signatureValidityDays: getNumberEnvVar('SIGNATURE_VALIDITY_DAYS', 30),
} as const

// =====================================================
// CONFIGURAÇÕES DE INTEGRAÇÃO
// =====================================================

export const integrationConfig = {
  // Webhooks
  webhooksEnabled: getBooleanEnvVar('WEBHOOKS_ENABLED', true),
  webhookSecret: getOptionalEnvVar('WEBHOOK_SECRET'),
  webhookTimeout: getNumberEnvVar('WEBHOOK_TIMEOUT', 30), // segundos
  webhookRetries: getNumberEnvVar('WEBHOOK_RETRIES', 3),
  
  // APIs externas
  externalApiTimeout: getNumberEnvVar('EXTERNAL_API_TIMEOUT', 10), // segundos
  externalApiRetries: getNumberEnvVar('EXTERNAL_API_RETRIES', 2),
  
  // Sincronização
  syncEnabled: getBooleanEnvVar('SYNC_ENABLED', false),
  syncInterval: getNumberEnvVar('SYNC_INTERVAL', 3600), // 1 hora
  
  // Rate limiting para APIs externas
  externalApiRateLimit: getNumberEnvVar('EXTERNAL_API_RATE_LIMIT', 100), // requests por minuto
} as const

// =====================================================
// CONFIGURAÇÕES DE DESENVOLVIMENTO
// =====================================================

export const devConfig = {
  // Debug
  debugEnabled: getBooleanEnvVar('DEBUG_ENABLED', appConfig.isDevelopment),
  verboseLogging: getBooleanEnvVar('VERBOSE_LOGGING', appConfig.isDevelopment),
  
  // Hot reload
  hotReloadEnabled: getBooleanEnvVar('HOT_RELOAD_ENABLED', appConfig.isDevelopment),
  
  // Mocks
  mockExternalApis: getBooleanEnvVar('MOCK_EXTERNAL_APIS', appConfig.isDevelopment),
  mockEmailSending: getBooleanEnvVar('MOCK_EMAIL_SENDING', appConfig.isDevelopment),
  mockSmsSending: getBooleanEnvVar('MOCK_SMS_SENDING', appConfig.isDevelopment),
  
  // Seeding
  seedDatabase: getBooleanEnvVar('SEED_DATABASE', false),
  seedDataPath: getOptionalEnvVar('SEED_DATA_PATH', './seeds'),
} as const

// =====================================================
// CONFIGURAÇÕES CONSOLIDADAS
// =====================================================

export const config = {
  app: appConfig,
  supabase: supabaseConfig,
  security: securityConfig,
  email: emailConfig,
  sms: smsConfig,
  push: pushConfig,
  storage: storageConfig,
  logging: loggingConfig,
  cache: cacheConfig,
  monitoring: monitoringConfig,
  financial: financialConfig,
  integration: integrationConfig,
  dev: devConfig,
} as const

// =====================================================
// VALIDAÇÃO DE CONFIGURAÇÃO
// =====================================================

export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Validações obrigatórias
  if (!supabaseConfig.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL é obrigatória')
  }
  
  if (!supabaseConfig.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatória')
  }
  
  // Validações condicionais
  if (emailConfig.provider === 'resend' && !emailConfig.resendApiKey) {
    errors.push('RESEND_API_KEY é obrigatória quando EMAIL_PROVIDER=resend')
  }
  
  if (emailConfig.provider === 'sendgrid' && !emailConfig.sendgridApiKey) {
    errors.push('SENDGRID_API_KEY é obrigatória quando EMAIL_PROVIDER=sendgrid')
  }
  
  if (emailConfig.provider === 'smtp') {
    if (!emailConfig.smtpHost) errors.push('SMTP_HOST é obrigatório quando EMAIL_PROVIDER=smtp')
    if (!emailConfig.smtpUser) errors.push('SMTP_USER é obrigatório quando EMAIL_PROVIDER=smtp')
    if (!emailConfig.smtpPassword) errors.push('SMTP_PASSWORD é obrigatório quando EMAIL_PROVIDER=smtp')
  }
  
  if (smsConfig.enabled && smsConfig.provider === 'twilio') {
    if (!smsConfig.twilioAccountSid) errors.push('TWILIO_ACCOUNT_SID é obrigatório quando SMS_PROVIDER=twilio')
    if (!smsConfig.twilioAuthToken) errors.push('TWILIO_AUTH_TOKEN é obrigatório quando SMS_PROVIDER=twilio')
    if (!smsConfig.twilioPhoneNumber) errors.push('TWILIO_PHONE_NUMBER é obrigatório quando SMS_PROVIDER=twilio')
  }
  
  if (cacheConfig.provider === 'redis' && !cacheConfig.redisUrl && !cacheConfig.redisHost) {
    errors.push('REDIS_URL ou REDIS_HOST é obrigatório quando CACHE_PROVIDER=redis')
  }
  
  if (appConfig.isProduction) {
    if (!securityConfig.encryptionKey) {
      errors.push('ENCRYPTION_KEY é obrigatória em produção')
    }
    
    if (securityConfig.corsOrigins === '*') {
      errors.push('CORS_ORIGINS não deve ser * em produção')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

// =====================================================
// UTILITÁRIOS
// =====================================================

/**
 * Obtém configuração específica por caminho
 */
export function getConfigValue(path: string): any {
  const keys = path.split('.')
  let value: any = config
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      return undefined
    }
  }
  
  return value
}

/**
 * Verifica se uma feature está habilitada
 */
export function isFeatureEnabled(feature: string): boolean {
  const value = getConfigValue(feature)
  return Boolean(value)
}

/**
 * Obtém URL completa da aplicação
 */
export function getAppUrl(path: string = ''): string {
  const baseUrl = appConfig.url.replace(/\/$/, '')
  const cleanPath = path.replace(/^\//, '')
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl
}

/**
 * Obtém configurações públicas (seguras para o frontend)
 */
export function getPublicConfig() {
  return {
    app: {
      name: appConfig.name,
      version: appConfig.version,
      url: appConfig.url,
      environment: appConfig.environment,
    },
    supabase: {
      url: supabaseConfig.url,
      anonKey: supabaseConfig.anonKey,
    },
    financial: {
      defaultCurrency: financialConfig.defaultCurrency,
      currencyPrecision: financialConfig.currencyPrecision,
      maxTransactionAmount: financialConfig.maxTransactionAmount,
      minTransactionAmount: financialConfig.minTransactionAmount,
    },
    features: {
      emailEnabled: emailConfig.provider !== 'disabled',
      smsEnabled: smsConfig.enabled,
      pushEnabled: pushConfig.enabled,
      cacheEnabled: cacheConfig.provider !== 'disabled',
      monitoringEnabled: monitoringConfig.enabled,
    },
  }
}

// =====================================================
// EXPORTAÇÃO PADRÃO
// =====================================================

export default config

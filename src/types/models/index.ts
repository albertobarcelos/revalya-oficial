// =====================================================
// MODELS INDEX
// Descrição: Exportações centralizadas de todos os tipos de modelos
// =====================================================

// =====================================================
// CORE MODELS
// =====================================================

// Financial Models
export * from './financial';
export * from './contract';

// Risk Management
export * from './risk-management';

// Banking Integration
export * from './banking-integration';

// Investment Analysis
export * from './investment-analysis';

// Automation
export * from './automation';

// Payment Gateway
export * from './payment-gateway';

// Audit & Compliance
export * from './audit-compliance';

// =====================================================
// TYPE UNIONS FOR COMMON USE CASES
// =====================================================

// All calculation types
export type AllCalculationTypes = 
  | 'SIMPLE_INTEREST'
  | 'COMPOUND_INTEREST'
  | 'LOAN_PAYMENT'
  | 'NPV'
  | 'IRR'
  | 'PAYBACK'
  | 'AMORTIZATION'
  | 'DEPRECIATION'
  | 'INTEREST'
  | 'PENALTY'
  | 'DISCOUNT'
  | 'TAX'
  | 'COMMISSION'
  | 'FEE'
  | 'PROVISION'
  | 'ACCRUAL'
  | 'ALLOCATION'
  | 'REVALUATION'
  | 'CUSTOM';

// All entity types for audit
export type AllEntityTypes = 
  | 'USER'
  | 'TRANSACTION'
  | 'ACCOUNT'
  | 'CONTRACT'
  | 'PAYMENT'
  | 'INVOICE'
  | 'REPORT'
  | 'CONFIGURATION'
  | 'PERMISSION'
  | 'ROLE'
  | 'TENANT'
  | 'INTEGRATION'
  | 'WORKFLOW'
  | 'RULE'
  | 'CALCULATION'
  | 'NOTIFICATION'
  | 'DOCUMENT'
  | 'BACKUP'
  | 'SYSTEM'
  | 'PORTFOLIO'
  | 'INVESTMENT'
  | 'RISK_ASSESSMENT'
  | 'COMPLIANCE_MONITOR';

// All status types
export type AllStatusTypes = 
  | 'DRAFT'
  | 'PENDING'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'
  | 'PAUSED'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'DELETED';

// All notification channels
export type AllNotificationChannels = 
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'IN_APP'
  | 'WEBHOOK'
  | 'SLACK'
  | 'TEAMS'
  | 'WHATSAPP';

// All payment methods
export type AllPaymentMethods = 
  | 'CREDIT_CARD'
  | 'CREDIT_CARD_RECURRING'
  | 'PIX'
  | 'BOLETO'
  | 'BANK_TRANSFER'
  | 'DIGITAL_WALLET'
  | 'CRYPTOCURRENCY'
  | 'BANK_SLIP'
  | 'INSTALLMENTS'
  | 'RECURRING'
  | 'APPLE_PAY'
  | 'GOOGLE_PAY'
  | 'PAYPAL'
  | 'CASH';

// All compliance regulations
export type AllComplianceRegulations = 
  | 'LGPD'
  | 'GDPR'
  | 'SOX'
  | 'PCI_DSS'
  | 'BACEN'
  | 'CVM'
  | 'SUSEP'
  | 'COAF'
  | 'FATCA'
  | 'CRS'
  | 'BASEL_III'
  | 'IFRS'
  | 'CUSTOM';

// =====================================================
// COMMON INTERFACES
// =====================================================

/**
 * Interface base para entidades com tenant
 */
export interface TenantEntity {
  tenantId: string;
}

/**
 * Interface base para entidades auditáveis
 */
export interface AuditableEntity {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Interface base para entidades com metadados
 */
export interface MetadataEntity {
  metadata: Record<string, any>;
}

/**
 * Interface base para entidades versionadas
 */
export interface VersionedEntity {
  version: number;
}

/**
 * Interface base para entidades com status
 */
export interface StatusEntity {
  status: string;
  isActive: boolean;
}

/**
 * Interface completa para entidades do sistema
 */
export interface BaseEntity extends 
  TenantEntity, 
  AuditableEntity, 
  MetadataEntity, 
  VersionedEntity, 
  StatusEntity {
  id: string;
  name?: string;
  description?: string;
}

/**
 * Interface para paginação
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Interface para filtros de busca
 */
export interface SearchFilters {
  query?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string[];
  categories?: string[];
  tags?: string[];
  customFilters?: Record<string, any>;
}

/**
 * Interface para respostas de API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  path?: string;
  method?: string;
}

/**
 * Interface para configurações do sistema
 */
export interface SystemConfiguration {
  id: string;
  tenantId: string;
  category: string;
  key: string;
  value: any;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'ARRAY';
  isEncrypted: boolean;
  isRequired: boolean;
  description?: string;
  validationRules?: ValidationRule[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationRule {
  type: 'REQUIRED' | 'MIN' | 'MAX' | 'PATTERN' | 'CUSTOM';
  value?: any;
  message: string;
}

/**
 * Interface para logs do sistema
 */
export interface SystemLog {
  id: string;
  tenantId: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  category: string;
  source: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  data?: Record<string, any>;
  stackTrace?: string;
  correlationId?: string;
}

/**
 * Interface para métricas de performance
 */
export interface PerformanceMetric {
  id: string;
  tenantId: string;
  name: string;
  type: 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'TIMER';
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Interface para alertas do sistema
 */
export interface SystemAlert {
  id: string;
  tenantId: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  source: string;
  category: string;
  severity: number;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  actions: AlertAction[];
  recipients: string[];
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AlertAction {
  type: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'ESCALATE' | 'AUTO_RESOLVE';
  parameters: Record<string, any>;
  executed: boolean;
  executedAt?: string;
  result?: string;
}

/**
 * Interface para backups
 */
export interface SystemBackup {
  id: string;
  tenantId: string;
  type: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  size?: number;
  location: string;
  checksum?: string;
  encryption: boolean;
  retention: {
    days: number;
    autoDelete: boolean;
  };
  metadata?: Record<string, any>;
}

/**
 * Interface para integrações externas
 */
export interface ExternalIntegration {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  provider: string;
  configuration: Record<string, any>;
  credentials: Record<string, any>;
  isActive: boolean;
  lastSync?: string;
  syncFrequency?: string;
  errorCount: number;
  lastError?: string;
  healthStatus: 'HEALTHY' | 'WARNING' | 'ERROR' | 'UNKNOWN';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Tipo para IDs do sistema
 */
export type SystemId = string;

/**
 * Tipo para timestamps ISO
 */
export type ISOTimestamp = string;

/**
 * Tipo para URLs
 */
export type URL = string;

/**
 * Tipo para emails
 */
export type Email = string;

/**
 * Tipo para telefones
 */
export type Phone = string;

/**
 * Tipo para documentos brasileiros
 */
export type CPF = string;
export type CNPJ = string;
export type Document = CPF | CNPJ;

/**
 * Tipo para moedas
 */
export type Currency = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'JPY';

/**
 * Tipo para valores monetários
 */
export type MonetaryValue = {
  amount: number;
  currency: Currency;
};

/**
 * Tipo para coordenadas geográficas
 */
export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Tipo para endereços
 */
export type Address = {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: Coordinates;
};

/**
 * Tipo para arquivos
 */
export type FileInfo = {
  name: string;
  type: string;
  size: number;
  url: string;
  checksum?: string;
  uploadedAt: string;
  uploadedBy: string;
};

/**
 * Tipo para configurações de notificação
 */
export type NotificationSettings = {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  frequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
};

/**
 * Tipo para preferências do usuário
 */
export type UserPreferences = {
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  currency: Currency;
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  notifications: NotificationSettings;
  dashboard: {
    layout: string;
    widgets: string[];
  };
};

// =====================================================
// CONDITIONAL TYPES
// =====================================================

/**
 * Tipo condicional para entidades opcionais
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Tipo condicional para entidades obrigatórias
 */
export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Tipo para criação de entidades (sem campos gerados)
 */
export type CreateEntity<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'version'>;

/**
 * Tipo para atualização de entidades (campos opcionais)
 */
export type UpdateEntity<T> = Partial<Omit<T, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>>;

/**
 * Tipo para listagem de entidades (campos essenciais)
 */
export type ListEntity<T> = Pick<T, 'id' | 'name' | 'status' | 'createdAt' | 'updatedAt'>;

/**
 * Tipo para resumo de entidades
 */
export type SummaryEntity<T> = Pick<T, 'id' | 'name' | 'description' | 'status'>;

// =====================================================
// MAPPED TYPES
// =====================================================

/**
 * Tipo mapeado para campos de busca
 */
export type SearchableFields<T> = {
  [K in keyof T]?: T[K] extends string ? string : 
                   T[K] extends number ? number | { min?: number; max?: number } :
                   T[K] extends boolean ? boolean :
                   T[K] extends Date ? string | { start?: string; end?: string } :
                   any;
};

/**
 * Tipo mapeado para campos ordenáveis
 */
export type SortableFields<T> = {
  [K in keyof T]?: 'ASC' | 'DESC';
};

/**
 * Tipo mapeado para campos de agregação
 */
export type AggregateFields<T> = {
  [K in keyof T]?: T[K] extends number ? ('SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT')[] : 
                   'COUNT'[];
};

// =====================================================
// TEMPLATE LITERAL TYPES
// =====================================================

/**
 * Tipo para eventos do sistema
 */
export type SystemEvent = `${string}.${string}.${string}`;

/**
 * Tipo para permissões
 */
export type Permission = `${string}:${string}:${string}`;

/**
 * Tipo para chaves de configuração
 */
export type ConfigKey = `${string}.${string}`;

/**
 * Tipo para métricas
 */
export type MetricName = `${string}.${string}.${string}`;

// =====================================================
// BRANDED TYPES
// =====================================================

/**
 * Tipos com marca para maior segurança de tipos
 */
export type UserId = string & { readonly brand: unique symbol };
export type TenantId = string & { readonly brand: unique symbol };
export type SessionId = string & { readonly brand: unique symbol };
export type TransactionId = string & { readonly brand: unique symbol };
export type ContractId = string & { readonly brand: unique symbol };
export type CalculationId = string & { readonly brand: unique symbol };
export type WorkflowId = string & { readonly brand: unique symbol };
export type RuleId = string & { readonly brand: unique symbol };
export type NotificationId = string & { readonly brand: unique symbol };
export type ReportId = string & { readonly brand: unique symbol };
export type AuditId = string & { readonly brand: unique symbol };
export type ComplianceId = string & { readonly brand: unique symbol };
export type PaymentId = string & { readonly brand: unique symbol };
export type SubscriptionId = string & { readonly brand: unique symbol };
export type RefundId = string & { readonly brand: unique symbol };
export type ChargebackId = string & { readonly brand: unique symbol };
export type InvestmentId = string & { readonly brand: unique symbol };
export type PortfolioId = string & { readonly brand: unique symbol };
export type RiskAssessmentId = string & { readonly brand: unique symbol };
export type BankAccountId = string & { readonly brand: unique symbol };
export type PixTransactionId = string & { readonly brand: unique symbol };

// =====================================================
// DISCRIMINATED UNIONS
// =====================================================

/**
 * União discriminada para diferentes tipos de eventos
 */
export type SystemEventUnion = 
  | { type: 'USER_ACTION'; userId: UserId; action: string; data: any }
  | { type: 'SYSTEM_EVENT'; source: string; event: string; data: any }
  | { type: 'INTEGRATION_EVENT'; provider: string; event: string; data: any }
  | { type: 'WORKFLOW_EVENT'; workflowId: WorkflowId; step: string; data: any }
  | { type: 'PAYMENT_EVENT'; paymentId: PaymentId; status: string; data: any }
  | { type: 'COMPLIANCE_EVENT'; regulation: string; event: string; data: any };

/**
 * União discriminada para diferentes tipos de notificações
 */
export type NotificationUnion = 
  | { type: 'EMAIL'; to: Email; subject: string; body: string; attachments?: FileInfo[] }
  | { type: 'SMS'; to: Phone; message: string }
  | { type: 'PUSH'; to: UserId; title: string; body: string; data?: any }
  | { type: 'IN_APP'; to: UserId; title: string; body: string; data?: any }
  | { type: 'WEBHOOK'; url: URL; method: string; headers?: Record<string, string>; body: any };

/**
 * União discriminada para diferentes tipos de cálculos
 */
export type CalculationUnion = 
  | { type: 'SIMPLE_INTEREST'; principal: number; rate: number; time: number }
  | { type: 'COMPOUND_INTEREST'; principal: number; rate: number; time: number; frequency: number }
  | { type: 'LOAN_PAYMENT'; principal: number; rate: number; periods: number }
  | { type: 'NPV'; cashFlows: number[]; discountRate: number }
  | { type: 'IRR'; cashFlows: number[]; guess?: number }
  | { type: 'PAYBACK'; initialInvestment: number; cashFlows: number[] }
  | { type: 'CUSTOM'; formula: string; variables: Record<string, number> };

// =====================================================
// RECURSIVE TYPES
// =====================================================

/**
 * Tipo recursivo para estruturas hierárquicas
 */
export interface HierarchicalEntity {
  id: string;
  name: string;
  parentId?: string;
  children?: HierarchicalEntity[];
  level: number;
  path: string;
}

/**
 * Tipo recursivo para menus
 */
export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  url?: string;
  permission?: Permission;
  children?: MenuItem[];
  isActive: boolean;
  order: number;
}

/**
 * Tipo recursivo para workflows
 */
export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  configuration: Record<string, any>;
  nextSteps?: WorkflowStep[];
  conditions?: Array<{
    expression: string;
    nextStep: string;
  }>;
}

// =====================================================
// FUNCTION TYPES
// =====================================================

/**
 * Tipos para funções de validação
 */
export type ValidatorFunction<T> = (value: T) => boolean | string;
export type AsyncValidatorFunction<T> = (value: T) => Promise<boolean | string>;

/**
 * Tipos para funções de transformação
 */
export type TransformerFunction<T, U> = (value: T) => U;
export type AsyncTransformerFunction<T, U> = (value: T) => Promise<U>;

/**
 * Tipos para funções de filtro
 */
export type FilterFunction<T> = (item: T) => boolean;
export type AsyncFilterFunction<T> = (item: T) => Promise<boolean>;

/**
 * Tipos para funções de comparação
 */
export type ComparatorFunction<T> = (a: T, b: T) => number;

/**
 * Tipos para funções de agregação
 */
export type AggregatorFunction<T, U> = (items: T[]) => U;

/**
 * Tipos para event handlers
 */
export type EventHandler<T = any> = (event: T) => void | Promise<void>;
export type ErrorHandler = (error: Error) => void | Promise<void>;

/**
 * Tipos para middleware
 */
export type MiddlewareFunction<T, U> = (input: T, next: () => Promise<U>) => Promise<U>;

// =====================================================
// GENERIC CONSTRAINTS
// =====================================================

/**
 * Constraint para entidades com ID
 */
export interface HasId {
  id: string;
}

/**
 * Constraint para entidades com nome
 */
export interface HasName {
  name: string;
}

/**
 * Constraint para entidades com timestamp
 */
export interface HasTimestamp {
  createdAt: string;
  updatedAt: string;
}

/**
 * Constraint para entidades serializáveis
 */
export interface Serializable {
  toJSON(): Record<string, any>;
}

/**
 * Constraint para entidades validáveis
 */
export interface Validatable {
  validate(): ValidationError[];
}

/**
 * Constraint para entidades clonáveis
 */
export interface Cloneable<T> {
  clone(): T;
}

/**
 * Constraint para entidades comparáveis
 */
export interface Comparable<T> {
  equals(other: T): boolean;
  compareTo(other: T): number;
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guards para verificação de tipos em runtime
 */
export const isValidEmail = (value: any): value is Email => {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const isValidPhone = (value: any): value is Phone => {
  return typeof value === 'string' && /^\+?[1-9]\d{1,14}$/.test(value);
};

export const isValidCPF = (value: any): value is CPF => {
  return typeof value === 'string' && /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value);
};

export const isValidCNPJ = (value: any): value is CNPJ => {
  return typeof value === 'string' && /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value);
};

export const isValidURL = (value: any): value is URL => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const isValidCurrency = (value: any): value is Currency => {
  return typeof value === 'string' && ['BRL', 'USD', 'EUR', 'GBP', 'JPY'].includes(value);
};

export const isValidISOTimestamp = (value: any): value is ISOTimestamp => {
  return typeof value === 'string' && !isNaN(Date.parse(value));
};

export const hasId = (value: any): value is HasId => {
  return typeof value === 'object' && value !== null && typeof value.id === 'string';
};

export const hasName = (value: any): value is HasName => {
  return typeof value === 'object' && value !== null && typeof value.name === 'string';
};

export const hasTimestamp = (value: any): value is HasTimestamp => {
  return typeof value === 'object' && 
         value !== null && 
         typeof value.createdAt === 'string' && 
         typeof value.updatedAt === 'string';
};

export const isTenantEntity = (value: any): value is TenantEntity => {
  return typeof value === 'object' && value !== null && typeof value.tenantId === 'string';
};

export const isAuditableEntity = (value: any): value is AuditableEntity => {
  return typeof value === 'object' && 
         value !== null && 
         typeof value.createdAt === 'string' && 
         typeof value.updatedAt === 'string' && 
         typeof value.createdBy === 'string';
};

export const isBaseEntity = (value: any): value is BaseEntity => {
  return hasId(value) && 
         isTenantEntity(value) && 
         isAuditableEntity(value) && 
         typeof value.version === 'number' && 
         typeof value.isActive === 'boolean';
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Função para criar IDs únicos
 */
export const createId = (): string => {
  return crypto.randomUUID();
};

/**
 * Função para criar timestamps ISO
 */
export const createTimestamp = (): ISOTimestamp => {
  return new Date().toISOString();
};

/**
 * Função para validar entidades
 */
export const validateEntity = <T extends Validatable>(entity: T): ValidationError[] => {
  return entity.validate();
};

/**
 * Função para clonar entidades
 */
export const cloneEntity = <T extends Cloneable<T>>(entity: T): T => {
  return entity.clone();
};

/**
 * Função para comparar entidades
 */
export const compareEntities = <T extends Comparable<T>>(a: T, b: T): number => {
  return a.compareTo(b);
};

/**
 * Função para serializar entidades
 */
export const serializeEntity = <T extends Serializable>(entity: T): Record<string, any> => {
  return entity.toJSON();
};

/**
 * Função para mascarar dados sensíveis
 */
export const maskSensitiveData = (value: string, visibleChars: number = 4): string => {
  if (value.length <= visibleChars) {
    return '*'.repeat(value.length);
  }
  return value.slice(0, visibleChars) + '*'.repeat(value.length - visibleChars);
};

/**
 * Função para formatar valores monetários
 */
export const formatCurrency = (amount: number, currency: Currency = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Função para formatar datas
 */
export const formatDate = (date: string | Date, locale: string = 'pt-BR'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale).format(dateObj);
};

/**
 * Função para formatar números
 */
export const formatNumber = (value: number, locale: string = 'pt-BR'): string => {
  return new Intl.NumberFormat(locale).format(value);
};

/**
 * Função para calcular hash de dados
 */
export const calculateHash = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Função para gerar códigos aleatórios
 */
export const generateCode = (length: number = 6, charset: string = '0123456789'): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * Função para debounce
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Função para throttle
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Função para retry com backoff exponencial
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
  
  throw new Error('Max attempts reached');
};

/**
 * Função para timeout de promises
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
};

/**
 * Função para cache simples em memória
 */
export const createCache = <K, V>(maxSize: number = 100) => {
  const cache = new Map<K, { value: V; timestamp: number }>();
  
  return {
    get: (key: K, ttl: number = 300000): V | undefined => {
      const item = cache.get(key);
      if (!item) return undefined;
      
      if (Date.now() - item.timestamp > ttl) {
        cache.delete(key);
        return undefined;
      }
      
      return item.value;
    },
    
    set: (key: K, value: V): void => {
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      cache.set(key, { value, timestamp: Date.now() });
    },
    
    delete: (key: K): boolean => {
      return cache.delete(key);
    },
    
    clear: (): void => {
      cache.clear();
    },
    
    size: (): number => {
      return cache.size;
    }
  };
};

// =====================================================
// CONSTANTS
// =====================================================

export const SYSTEM_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  DEFAULT_CACHE_TTL: 300000, // 5 minutes
  PASSWORD_MIN_LENGTH: 8,
  TOKEN_EXPIRY: 3600000, // 1 hour
  SESSION_TIMEOUT: 86400000, // 24 hours
  FILE_MAX_SIZE: 10485760, // 10MB
  RATE_LIMIT_WINDOW: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  HASH_ALGORITHM: 'SHA-256',
  JWT_ALGORITHM: 'HS256',
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  CURRENCY_PRECISION: 2,
  PERCENTAGE_PRECISION: 4
} as const;

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  CEP: /^\d{5}-\d{3}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  CREDIT_CARD: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/,
  PIX_KEY: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^\+?[1-9]\d{1,14}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
} as const;

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  BUSINESS_RULE_ERROR: 'BUSINESS_RULE_ERROR',
  COMPLIANCE_ERROR: 'COMPLIANCE_ERROR',
  SECURITY_ERROR: 'SECURITY_ERROR'
} as const;

// =====================================================
// FINAL EXPORTS
// =====================================================

// Re-export all types for convenience
export type * from './financial';
export type * from './contract';
export type * from './risk-management';
export type * from './banking-integration';
export type * from './investment-analysis';
export type * from './automation';
export type * from './payment-gateway';
export type * from './audit-compliance';

// Export default object with all utilities
export default {
  constants: SYSTEM_CONSTANTS,
  patterns: REGEX_PATTERNS,
  statusCodes: HTTP_STATUS_CODES,
  errorCodes: ERROR_CODES,
  utils: {
    createId,
    createTimestamp,
    validateEntity,
    cloneEntity,
    compareEntities,
    serializeEntity,
    maskSensitiveData,
    formatCurrency,
    formatDate,
    formatNumber,
    calculateHash,
    generateCode,
    debounce,
    throttle,
    retryWithBackoff,
    withTimeout,
    createCache
  },
  guards: {
    isValidEmail,
    isValidPhone,
    isValidCPF,
    isValidCNPJ,
    isValidURL,
    isValidCurrency,
    isValidISOTimestamp,
    hasId,
    hasName,
    hasTimestamp,
    isTenantEntity,
    isAuditableEntity,
    isBaseEntity
  }
};

// Tipos base do sistema financeiro

// Enums para tipos de dados
export enum CalculationType {
  SIMPLE_INTEREST = 'SIMPLE_INTEREST',
  COMPOUND_INTEREST = 'COMPOUND_INTEREST',
  LOAN_PAYMENT = 'LOAN_PAYMENT',
  INVESTMENT_RETURN = 'INVESTMENT_RETURN',
  DEPRECIATION = 'DEPRECIATION',
  NPV = 'NPV',
  IRR = 'IRR',
  PAYBACK_PERIOD = 'PAYBACK_PERIOD',
  BREAK_EVEN = 'BREAK_EVEN',
  CASH_FLOW = 'CASH_FLOW'
}

export enum ContractType {
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  LICENSE = 'LICENSE',
  PARTNERSHIP = 'PARTNERSHIP',
  EMPLOYMENT = 'EMPLOYMENT',
  CONSULTING = 'CONSULTING',
  MAINTENANCE = 'MAINTENANCE'
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  CREDIT_CARD_RECURRING = 'CREDIT_CARD_RECURRING',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CASH = 'CASH',
  CHECK = 'CHECK'
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
  ONE_TIME = 'ONE_TIME',
  CUSTOM = 'CUSTOM'
}

export enum ReportType {
  INCOME_STATEMENT = 'INCOME_STATEMENT',
  CASH_FLOW = 'CASH_FLOW',
  ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
  REVENUE_ANALYSIS = 'REVENUE_ANALYSIS',
  PROFITABILITY_ANALYSIS = 'PROFITABILITY_ANALYSIS',
  BUDGET_VARIANCE = 'BUDGET_VARIANCE',
  CUSTOM = 'CUSTOM'
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON'
}

export enum NotificationType {
  PAYMENT_DUE = 'PAYMENT_DUE',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  CONTRACT_EXPIRING = 'CONTRACT_EXPIRING',
  CONTRACT_RENEWED = 'CONTRACT_RENEWED',
  BUDGET_ALERT = 'BUDGET_ALERT',
  COMPLIANCE_ALERT = 'COMPLIANCE_ALERT',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  CUSTOM = 'CUSTOM'
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK'
}

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT'
}

// Interfaces para cálculos financeiros
export interface FinancialCalculationInput {
  principal?: number;
  rate?: number;
  time?: number;
  payment?: number;
  futureValue?: number;
  presentValue?: number;
  cashFlows?: number[];
  initialInvestment?: number;
  salvageValue?: number;
  usefulLife?: number;
  [key: string]: any;
}

export interface FinancialCalculationResult {
  value: number;
  formula: string;
  breakdown: Record<string, any>;
  metadata: {
    calculatedAt: string;
    precision: number;
    currency: string;
  };
}

export interface FinancialCalculation {
  id: string;
  userId: string;
  tenantId: string;
  calculationType: CalculationType;
  inputData: FinancialCalculationInput;
  resultData: FinancialCalculationResult;
  createdAt: string;
  updatedAt: string;
}

// Interfaces para contratos digitais
export interface ContractParty {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document: string; // CPF/CNPJ
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  role: 'CONTRACTOR' | 'CONTRACTEE' | 'WITNESS' | 'GUARANTOR';
}

export interface PaymentTerms {
  method: PaymentMethod;
  billingCycle: BillingCycle;
  dueDay?: number; // Dia do vencimento (1-31)
  gracePeriod?: number; // Dias de carência
  lateFee?: {
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
  };
  discount?: {
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    conditions: string;
  };
  installments?: {
    count: number;
    amount: number;
    dueDate: string;
  }[];
}

export interface ContractClause {
  id: string;
  title: string;
  content: string;
  order: number;
  required: boolean;
  editable: boolean;
}

export interface DigitalContract {
  id: string;
  tenantId: string;
  contractNumber: string;
  title: string;
  description?: string;
  contractType: ContractType;
  status: ContractStatus;
  startDate: string;
  endDate?: string;
  value: number;
  currency: string;
  paymentTerms: PaymentTerms;
  parties: ContractParty[];
  clauses: ContractClause[];
  metadata: {
    version: number;
    templateId?: string;
    tags: string[];
    customFields: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Interfaces para assinatura digital
export interface ContractSignature {
  id: string;
  contractId: string;
  signerId: string;
  signerName: string;
  signerEmail: string;
  role: 'SIGNER' | 'WITNESS' | 'APPROVER';
  signatureType: 'ELECTRONIC' | 'DIGITAL' | 'BIOMETRIC';
  status: 'PENDING' | 'SIGNED' | 'REJECTED' | 'EXPIRED';
  signedAt?: string;
  ipAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  certificate?: {
    issuer: string;
    serialNumber: string;
    validFrom: string;
    validTo: string;
  };
  metadata: Record<string, any>;
  createdAt: string;
}

// Interfaces para relatórios financeiros
export interface ReportParameter {
  key: string;
  value: any;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  required: boolean;
  description: string;
}

export interface FinancialReport {
  id: string;
  tenantId: string;
  name: string;
  reportType: ReportType;
  parameters: ReportParameter[];
  data: any;
  format: ReportFormat;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  fileUrl?: string;
  scheduled: boolean;
  scheduleConfig?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    dayOfWeek?: number; // 0-6 (domingo-sábado)
    dayOfMonth?: number; // 1-31
    time: string; // HH:mm
    timezone: string;
    recipients: string[];
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Interfaces específicas para tipos de relatórios
export interface IncomeStatementData {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: {
    total: number;
    breakdown: Record<string, number>;
  };
  expenses: {
    total: number;
    breakdown: Record<string, number>;
  };
  netIncome: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

export interface CashFlowData {
  period: {
    startDate: string;
    endDate: string;
  };
  operatingActivities: {
    inflows: Record<string, number>;
    outflows: Record<string, number>;
    net: number;
  };
  investingActivities: {
    inflows: Record<string, number>;
    outflows: Record<string, number>;
    net: number;
  };
  financingActivities: {
    inflows: Record<string, number>;
    outflows: Record<string, number>;
    net: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export interface AccountsReceivableData {
  period: {
    startDate: string;
    endDate: string;
  };
  totalReceivables: number;
  aging: {
    current: number; // 0-30 dias
    days31to60: number;
    days61to90: number;
    over90Days: number;
  };
  topCustomers: {
    name: string;
    amount: number;
    percentage: number;
  }[];
  averageCollectionPeriod: number;
  turnoverRatio: number;
}

// Interfaces para notificações
export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  body: string;
  variables: string[];
  channels: NotificationChannel[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    event: string;
    conditions: Record<string, any>;
  };
  templateId: string;
  recipients: {
    type: 'USER' | 'ROLE' | 'EMAIL';
    value: string;
  }[];
  schedule?: {
    delay: number; // minutos
    repeat: boolean;
    maxAttempts: number;
  };
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialNotification {
  id: string;
  tenantId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  scheduledFor?: string;
  sentAt?: string;
  metadata: {
    templateId?: string;
    ruleId?: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
    variables: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}

// Interfaces para auditoria
export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata: {
    sessionId?: string;
    requestId?: string;
    source: 'WEB' | 'API' | 'MOBILE' | 'SYSTEM';
    additionalInfo: Record<string, any>;
  };
  createdAt: string;
}

export interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  category: 'FINANCIAL' | 'SECURITY' | 'OPERATIONAL' | 'REGULATORY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PASSED' | 'FAILED' | 'WARNING' | 'SKIPPED';
  result: {
    score: number; // 0-100
    details: string;
    recommendations: string[];
    evidence: Record<string, any>;
  };
  lastChecked: string;
  nextCheck: string;
}

// Interfaces para configurações do usuário
export interface UserFinancialProfile {
  id: string;
  userId: string;
  tenantId: string;
  preferences: {
    currency: string;
    locale: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
    frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY';
    types: NotificationType[];
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number; // minutos
    ipWhitelist: string[];
    allowedDevices: number;
  };
  dashboard: {
    layout: 'GRID' | 'LIST' | 'CARDS';
    widgets: {
      id: string;
      type: string;
      position: { x: number; y: number; w: number; h: number };
      config: Record<string, any>;
    }[];
  };
  createdAt: string;
  updatedAt: string;
}

// Interfaces para métricas e analytics
export interface FinancialMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  change: {
    value: number;
    percentage: number;
    period: string;
  };
  target?: {
    value: number;
    achievement: number; // percentual de atingimento
  };
  category: 'REVENUE' | 'EXPENSE' | 'PROFIT' | 'CASH' | 'DEBT' | 'INVESTMENT';
  calculatedAt: string;
}

export interface DashboardWidget {
  id: string;
  type: 'METRIC' | 'CHART' | 'TABLE' | 'ALERT' | 'CUSTOM';
  title: string;
  description?: string;
  data: any;
  config: {
    refreshInterval?: number; // segundos
    autoRefresh: boolean;
    filters: Record<string, any>;
    visualization: Record<string, any>;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  permissions: {
    view: string[];
    edit: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// Tipos utilitários
export type Currency = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'JPY';
export type Locale = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE';
export type Timezone = string; // IANA timezone identifier

// Interfaces para API responses
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  metadata: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
    totalPages: number;
  };
}

// Interfaces para filtros e busca
export interface SearchFilters {
  query?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string[];
  type?: string[];
  tags?: string[];
  customFilters?: Record<string, any>;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Interfaces para exportação de dados
export interface ExportOptions {
  format: 'CSV' | 'EXCEL' | 'PDF' | 'JSON';
  fields?: string[];
  filters?: SearchFilters;
  includeHeaders?: boolean;
  filename?: string;
}

export interface ExportResult {
  id: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileUrl?: string;
  fileName: string;
  fileSize?: number;
  recordCount?: number;
  createdAt: string;
  expiresAt: string;
}

// Interfaces para integração com serviços externos
export interface ExternalServiceConfig {
  id: string;
  name: string;
  type: 'PAYMENT' | 'SIGNATURE' | 'NOTIFICATION' | 'STORAGE' | 'ANALYTICS';
  provider: string;
  credentials: Record<string, string>;
  settings: Record<string, any>;
  active: boolean;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
  headers?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// Tipos para validação
export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'cpf' | 'cnpj' | 'min' | 'max' | 'pattern';
  value?: any;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
}

// Tipos para cache
export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

// Tipos para logs
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  category: string;
  metadata?: Record<string, any>;
  stack?: string;
}

// Tipos para configuração
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  conditions?: Record<string, any>;
}

export interface SystemConfig {
  features: FeatureFlag[];
  limits: {
    maxFileSize: number;
    maxRecordsPerPage: number;
    maxExportRecords: number;
    sessionTimeout: number;
  };
  integrations: ExternalServiceConfig[];
  webhooks: WebhookConfig[];
}

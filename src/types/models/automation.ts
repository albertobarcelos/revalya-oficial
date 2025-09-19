// =====================================================
// FINANCIAL AUTOMATION TYPES
// Descrição: Tipos para automação financeira e workflows
// =====================================================

// =====================================================
// WORKFLOW AUTOMATION
// =====================================================

/**
 * Interface para workflow financeiro
 */
export interface FinancialWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  status: WorkflowStatus;
  priority: WorkflowPriority;
  schedule?: WorkflowSchedule;
  retryPolicy: RetryPolicy;
  errorHandling: ErrorHandling;
  executionHistory: WorkflowExecution[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata: Record<string, any>;
}

export type WorkflowCategory = 
  | 'BILLING'
  | 'PAYMENT_PROCESSING'
  | 'RECONCILIATION'
  | 'REPORTING'
  | 'COMPLIANCE'
  | 'RISK_MANAGEMENT'
  | 'CUSTOMER_MANAGEMENT'
  | 'INVESTMENT'
  | 'TAX_PROCESSING'
  | 'AUDIT'
  | 'NOTIFICATION'
  | 'DATA_SYNC'
  | 'CUSTOM';

export type WorkflowStatus = 
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'DISABLED'
  | 'ERROR'
  | 'ARCHIVED';

export type WorkflowPriority = 
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'CRITICAL';

/**
 * Interface para trigger de workflow
 */
export interface WorkflowTrigger {
  type: TriggerType;
  event?: string;
  schedule?: string; // Cron expression
  webhook?: WebhookTrigger;
  manual?: boolean;
  conditions?: TriggerCondition[];
  parameters: Record<string, any>;
}

export type TriggerType = 
  | 'EVENT'
  | 'SCHEDULE'
  | 'WEBHOOK'
  | 'MANUAL'
  | 'FILE_UPLOAD'
  | 'EMAIL'
  | 'API_CALL'
  | 'DATABASE_CHANGE'
  | 'THRESHOLD'
  | 'TIME_BASED';

export interface WebhookTrigger {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  authentication?: WebhookAuth;
  retryAttempts: number;
}

export interface WebhookAuth {
  type: 'NONE' | 'BASIC' | 'BEARER' | 'API_KEY' | 'OAUTH2';
  credentials: Record<string, string>;
}

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'ARRAY' | 'OBJECT';
}

export type ConditionOperator = 
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_EQUAL'
  | 'LESS_EQUAL'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'IN'
  | 'NOT_IN'
  | 'IS_NULL'
  | 'IS_NOT_NULL'
  | 'REGEX_MATCH';

/**
 * Interface para condições de workflow
 */
export interface WorkflowCondition {
  id: string;
  name: string;
  expression: string;
  operator: LogicalOperator;
  rules: ConditionRule[];
  isRequired: boolean;
}

export type LogicalOperator = 'AND' | 'OR' | 'NOT';

export interface ConditionRule {
  field: string;
  operator: ConditionOperator;
  value: any;
  dataType: string;
  weight?: number;
}

/**
 * Interface para ações de workflow
 */
export interface WorkflowAction {
  id: string;
  name: string;
  type: ActionType;
  order: number;
  parameters: Record<string, any>;
  conditions?: WorkflowCondition[];
  retryPolicy?: RetryPolicy;
  timeout?: number;
  onSuccess?: string; // Next action ID
  onFailure?: string; // Next action ID
  isAsync: boolean;
}

export type ActionType = 
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'SEND_NOTIFICATION'
  | 'CREATE_RECORD'
  | 'UPDATE_RECORD'
  | 'DELETE_RECORD'
  | 'EXECUTE_QUERY'
  | 'CALL_API'
  | 'GENERATE_REPORT'
  | 'PROCESS_PAYMENT'
  | 'SEND_INVOICE'
  | 'RECONCILE_ACCOUNT'
  | 'CALCULATE_INTEREST'
  | 'APPLY_PENALTY'
  | 'TRANSFER_FUNDS'
  | 'BACKUP_DATA'
  | 'SYNC_DATA'
  | 'VALIDATE_DATA'
  | 'TRANSFORM_DATA'
  | 'ARCHIVE_DATA'
  | 'CUSTOM_SCRIPT'
  | 'WAIT'
  | 'BRANCH'
  | 'LOOP'
  | 'PARALLEL';

/**
 * Interface para agendamento de workflow
 */
export interface WorkflowSchedule {
  type: ScheduleType;
  cronExpression?: string;
  interval?: number; // em minutos
  startDate?: string;
  endDate?: string;
  timezone: string;
  isRecurring: boolean;
  maxExecutions?: number;
  executionWindow?: ExecutionWindow;
}

export type ScheduleType = 
  | 'ONCE'
  | 'RECURRING'
  | 'CRON'
  | 'INTERVAL'
  | 'EVENT_DRIVEN';

export interface ExecutionWindow {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  excludeHolidays?: boolean;
}

/**
 * Interface para política de retry
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  initialDelay: number; // em segundos
  maxDelay: number; // em segundos
  multiplier: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

export type BackoffStrategy = 
  | 'FIXED'
  | 'LINEAR'
  | 'EXPONENTIAL'
  | 'RANDOM';

/**
 * Interface para tratamento de erros
 */
export interface ErrorHandling {
  strategy: ErrorStrategy;
  fallbackAction?: WorkflowAction;
  notificationRecipients: string[];
  escalationRules: EscalationRule[];
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
}

export type ErrorStrategy = 
  | 'FAIL_FAST'
  | 'CONTINUE'
  | 'RETRY'
  | 'FALLBACK'
  | 'ESCALATE'
  | 'IGNORE';

export interface EscalationRule {
  condition: string;
  delay: number; // em minutos
  recipients: string[];
  action?: WorkflowAction;
}

/**
 * Interface para execução de workflow
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  tenantId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number; // em segundos
  triggeredBy: string;
  triggerData: any;
  steps: ExecutionStep[];
  result?: any;
  error?: ExecutionError;
  metrics: ExecutionMetrics;
  metadata: Record<string, any>;
}

export type ExecutionStatus = 
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMEOUT'
  | 'PAUSED';

export interface ExecutionStep {
  actionId: string;
  actionName: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  retryCount: number;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: any;
  stackTrace?: string;
  actionId?: string;
  timestamp: string;
}

export interface ExecutionMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  averageStepDuration: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

// =====================================================
// BUSINESS RULES ENGINE
// =====================================================

/**
 * Interface para regra de negócio
 */
export interface BusinessRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: RuleCategory;
  ruleType: RuleType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  isActive: boolean;
  validFrom: string;
  validTo?: string;
  version: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata: Record<string, any>;
}

export type RuleCategory = 
  | 'PRICING'
  | 'DISCOUNT'
  | 'PENALTY'
  | 'APPROVAL'
  | 'VALIDATION'
  | 'CALCULATION'
  | 'NOTIFICATION'
  | 'ROUTING'
  | 'SECURITY'
  | 'COMPLIANCE';

export type RuleType = 
  | 'DECISION'
  | 'CALCULATION'
  | 'VALIDATION'
  | 'TRANSFORMATION'
  | 'ROUTING'
  | 'SCORING';

export interface RuleCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: any;
  dataType: string;
  weight?: number;
  description?: string;
}

export interface RuleAction {
  id: string;
  type: RuleActionType;
  parameters: Record<string, any>;
  order: number;
  description?: string;
}

export type RuleActionType = 
  | 'SET_VALUE'
  | 'CALCULATE'
  | 'VALIDATE'
  | 'APPROVE'
  | 'REJECT'
  | 'ROUTE'
  | 'NOTIFY'
  | 'LOG'
  | 'CALL_SERVICE'
  | 'EXECUTE_WORKFLOW';

/**
 * Interface para execução de regra
 */
export interface RuleExecution {
  id: string;
  ruleId: string;
  tenantId: string;
  input: any;
  output: any;
  status: ExecutionStatus;
  evaluatedConditions: ConditionEvaluation[];
  executedActions: ActionExecution[];
  executionTime: number; // em ms
  timestamp: string;
  metadata: Record<string, any>;
}

export interface ConditionEvaluation {
  conditionId: string;
  result: boolean;
  actualValue: any;
  expectedValue: any;
  operator: ConditionOperator;
}

export interface ActionExecution {
  actionId: string;
  status: ExecutionStatus;
  result: any;
  error?: string;
  duration: number;
}

// =====================================================
// AUTOMATED CALCULATIONS
// =====================================================

/**
 * Interface para cálculo automatizado
 */
export interface AutomatedCalculation {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  calculationType: CalculationType;
  formula: CalculationFormula;
  inputs: CalculationInput[];
  outputs: CalculationOutput[];
  schedule: WorkflowSchedule;
  dependencies: string[]; // IDs de outros cálculos
  validationRules: ValidationRule[];
  isActive: boolean;
  lastExecution?: string;
  nextExecution?: string;
  executionHistory: CalculationExecution[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata: Record<string, any>;
}

export type CalculationType = 
  | 'INTEREST'
  | 'PENALTY'
  | 'DISCOUNT'
  | 'TAX'
  | 'COMMISSION'
  | 'FEE'
  | 'DEPRECIATION'
  | 'AMORTIZATION'
  | 'PROVISION'
  | 'ACCRUAL'
  | 'ALLOCATION'
  | 'REVALUATION'
  | 'CUSTOM';

export interface CalculationFormula {
  expression: string;
  language: 'JAVASCRIPT' | 'PYTHON' | 'SQL' | 'EXCEL' | 'CUSTOM';
  variables: FormulaVariable[];
  functions: FormulaFunction[];
}

export interface FormulaVariable {
  name: string;
  type: 'NUMBER' | 'STRING' | 'DATE' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  source: VariableSource;
  defaultValue?: any;
  isRequired: boolean;
}

export type VariableSource = 
  | 'INPUT'
  | 'DATABASE'
  | 'API'
  | 'CONSTANT'
  | 'CALCULATED'
  | 'ENVIRONMENT';

export interface FormulaFunction {
  name: string;
  description: string;
  parameters: FunctionParameter[];
  returnType: string;
  implementation?: string;
}

export interface FunctionParameter {
  name: string;
  type: string;
  isRequired: boolean;
  defaultValue?: any;
}

export interface CalculationInput {
  name: string;
  type: string;
  source: VariableSource;
  query?: string;
  transformation?: string;
  validation?: ValidationRule[];
}

export interface CalculationOutput {
  name: string;
  type: string;
  destination: OutputDestination;
  format?: string;
  validation?: ValidationRule[];
}

export type OutputDestination = 
  | 'DATABASE'
  | 'FILE'
  | 'API'
  | 'EMAIL'
  | 'NOTIFICATION'
  | 'CACHE'
  | 'QUEUE';

export interface ValidationRule {
  type: ValidationType;
  parameters: Record<string, any>;
  errorMessage: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

export type ValidationType = 
  | 'REQUIRED'
  | 'MIN_VALUE'
  | 'MAX_VALUE'
  | 'RANGE'
  | 'PATTERN'
  | 'CUSTOM'
  | 'BUSINESS_RULE';

export interface CalculationExecution {
  id: string;
  calculationId: string;
  status: ExecutionStatus;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  startedAt: string;
  completedAt?: string;
  duration: number;
  error?: ExecutionError;
  validationResults: ValidationResult[];
  metadata: Record<string, any>;
}

export interface ValidationResult {
  ruleType: ValidationType;
  field: string;
  isValid: boolean;
  message?: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

// =====================================================
// AUTOMATED NOTIFICATIONS
// =====================================================

/**
 * Interface para notificação automatizada
 */
export interface AutomatedNotification {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  trigger: NotificationTrigger;
  template: NotificationTemplate;
  recipients: NotificationRecipient[];
  channels: NotificationChannel[];
  schedule?: WorkflowSchedule;
  conditions: NotificationCondition[];
  isActive: boolean;
  lastSent?: string;
  nextScheduled?: string;
  sendHistory: NotificationSend[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata: Record<string, any>;
}

export interface NotificationTrigger {
  type: TriggerType;
  event?: string;
  conditions: TriggerCondition[];
  delay?: number; // em minutos
  aggregation?: NotificationAggregation;
}

export interface NotificationAggregation {
  enabled: boolean;
  window: number; // em minutos
  maxNotifications: number;
  groupBy: string[];
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  format: 'TEXT' | 'HTML' | 'MARKDOWN';
  variables: TemplateVariable[];
  attachments?: NotificationAttachment[];
}

export interface TemplateVariable {
  name: string;
  type: string;
  source: VariableSource;
  defaultValue?: any;
  format?: string;
}

export interface NotificationAttachment {
  name: string;
  type: 'FILE' | 'REPORT' | 'DOCUMENT';
  source: string;
  parameters?: Record<string, any>;
}

export interface NotificationRecipient {
  type: 'USER' | 'ROLE' | 'EMAIL' | 'PHONE' | 'WEBHOOK';
  identifier: string;
  name?: string;
  preferences?: RecipientPreferences;
}

export interface RecipientPreferences {
  channels: NotificationChannel[];
  frequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export type NotificationChannel = 
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'IN_APP'
  | 'WEBHOOK'
  | 'SLACK'
  | 'TEAMS'
  | 'WHATSAPP';

export interface NotificationCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  description?: string;
}

export interface NotificationSend {
  id: string;
  notificationId: string;
  recipients: string[];
  channels: NotificationChannel[];
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED' | 'READ';
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
  metadata: Record<string, any>;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface WorkflowExecutionRequest {
  workflowId: string;
  triggerData?: any;
  parameters?: Record<string, any>;
  async?: boolean;
}

export interface RuleEvaluationRequest {
  ruleId?: string;
  ruleCategory?: RuleCategory;
  input: any;
  context?: Record<string, any>;
}

export interface CalculationRequest {
  calculationId: string;
  inputs?: Record<string, any>;
  validate?: boolean;
  async?: boolean;
}

export interface NotificationRequest {
  notificationId?: string;
  templateId?: string;
  recipients: NotificationRecipient[];
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  scheduledFor?: string;
}

// =====================================================
// EXPORT TYPES
// =====================================================

export type {
  FinancialWorkflow,
  WorkflowExecution,
  BusinessRule,
  RuleExecution,
  AutomatedCalculation,
  CalculationExecution,
  AutomatedNotification,
  NotificationSend
};

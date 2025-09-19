// =====================================================
// FINANCIAL SYSTEM TYPES
// Descrição: Tipos TypeScript para o sistema financeiro
// =====================================================

import { Database } from '../database';

// Base types from database
type FinancialCalculationsTable = Database['public']['Tables']['financial_calculations'];
type DigitalContractsTable = Database['public']['Tables']['digital_contracts'];
type DigitalContractSignaturesTable = Database['public']['Tables']['digital_contract_signatures'];
type FinancialReportsTable = Database['public']['Tables']['financial_reports'];
type FinancialNotificationsTable = Database['public']['Tables']['financial_notifications'];
type AuditLogsTable = Database['public']['Tables']['audit_logs'];

// =====================================================
// FINANCIAL CALCULATIONS
// =====================================================

export interface FinancialCalculation {
  id: string;
  tenantId: string;
  userId: string;
  calculationType: CalculationType;
  parameters: Record<string, any>;
  result: any;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type CalculationType = 
  | 'simple_interest'
  | 'compound_interest'
  | 'loan_payment'
  | 'npv'
  | 'irr'
  | 'payback'
  | 'amortization'
  | 'depreciation'
  | 'cash_flow'
  | 'roi'
  | 'break_even'
  | 'present_value'
  | 'future_value';

export interface SimpleInterestParams {
  principal: number;
  rate: number; // Annual percentage rate
  time: number; // Time in years
}

export interface CompoundInterestParams {
  principal: number;
  rate: number; // Annual percentage rate
  time: number; // Time in years
  compoundingFrequency: number; // Times per year (12 for monthly)
}

export interface LoanPaymentParams {
  principal: number;
  rate: number; // Annual percentage rate
  periods: number; // Number of payment periods
}

export interface NPVParams {
  rate: number; // Discount rate
  cashFlows: number[]; // Array of cash flows
}

export interface IRRParams {
  cashFlows: number[]; // Array of cash flows
  guess?: number; // Initial guess for IRR calculation
}

export interface PaybackParams {
  initialInvestment: number;
  cashFlows: number[]; // Array of periodic cash flows
}

export interface AmortizationParams {
  principal: number;
  rate: number; // Annual percentage rate
  periods: number; // Number of payment periods
}

export interface DepreciationParams {
  cost: number;
  salvageValue: number;
  usefulLife: number; // In years
  method: 'straight_line' | 'declining_balance' | 'sum_of_years';
}

// Results interfaces
export interface SimpleInterestResult {
  interest: number;
  total: number;
}

export interface CompoundInterestResult {
  amount: number;
  interest: number;
}

export interface LoanPaymentResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
}

export interface NPVResult {
  npv: number;
}

export interface IRRResult {
  irr: number | null;
  converged: boolean;
}

export interface PaybackResult {
  paybackPeriod: number | null;
  hasPayback: boolean;
}

export interface AmortizationEntry {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface AmortizationResult {
  schedule: AmortizationEntry[];
}

export interface DepreciationEntry {
  year: number;
  depreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export interface DepreciationResult {
  schedule: DepreciationEntry[];
}

// =====================================================
// DIGITAL CONTRACTS
// =====================================================

export interface DigitalContract {
  id: string;
  tenantId: string;
  contractNumber: string;
  title: string;
  content: string;
  contractType: ContractType;
  status: ContractStatus;
  signatories: Signatory[];
  expiresAt?: string;
  requiresWitness: boolean;
  allowPartialSigning: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ContractType = 
  | 'SERVICE'
  | 'PURCHASE'
  | 'EMPLOYMENT'
  | 'NDA'
  | 'PARTNERSHIP'
  | 'LEASE'
  | 'LOAN'
  | 'OTHER';

export type ContractStatus = 
  | 'DRAFT'
  | 'PENDING_SIGNATURES'
  | 'PARTIALLY_SIGNED'
  | 'FULLY_SIGNED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface Signatory {
  email: string;
  name: string;
  role: SignatoryRole;
  phone?: string;
  required: boolean;
  order?: number;
}

export type SignatoryRole = 
  | 'SIGNER'
  | 'WITNESS'
  | 'APPROVER'
  | 'NOTARY';

export interface DigitalContractSignature {
  id: string;
  contractId: string;
  tenantId: string;
  signatoryEmail: string;
  signatoryName: string;
  signatureType: SignatureType;
  signatureData: string;
  ipAddress?: string;
  userAgent?: string;
  location?: SignatureLocation;
  witnessEmail?: string;
  witnessName?: string;
  signedAt: string;
  metadata: Record<string, any>;
}

export type SignatureType = 
  | 'DIGITAL'
  | 'ELECTRONIC'
  | 'BIOMETRIC'
  | 'HANDWRITTEN'
  | 'TYPED';

export interface SignatureLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface ContractProgress {
  totalSignatories: number;
  signedCount: number;
  pendingCount: number;
  percentComplete: number;
  nextSignatory?: Signatory;
}

// =====================================================
// FINANCIAL REPORTS
// =====================================================

export interface FinancialReport {
  id: string;
  tenantId: string;
  title: string;
  reportType: ReportType;
  status: ReportStatus;
  dateRange: DateRange;
  filters: ReportFilters;
  groupBy?: GroupByPeriod;
  includeProjections: boolean;
  data?: any;
  summary?: ReportSummary;
  charts?: ReportChart[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  generatedBy: string;
}

export type ReportType = 
  | 'CASH_FLOW'
  | 'PROFIT_LOSS'
  | 'BALANCE_SHEET'
  | 'BUDGET_ANALYSIS'
  | 'CONTRACT_SUMMARY'
  | 'PAYMENT_ANALYSIS'
  | 'TAX_REPORT'
  | 'EXPENSE_ANALYSIS'
  | 'REVENUE_ANALYSIS'
  | 'CUSTOM';

export type ReportStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ReportFilters {
  contractIds?: string[];
  serviceIds?: string[];
  clientIds?: string[];
  categories?: string[];
  status?: string[];
  paymentMethods?: string[];
  currencies?: string[];
}

export type GroupByPeriod = 
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'contract'
  | 'service'
  | 'client'
  | 'category';

export interface ReportSummary {
  totalRecords: number;
  totalValue: number;
  averageValue: number;
  trends?: ReportTrend;
  kpis?: Record<string, number>;
}

export interface ReportTrend {
  direction: 'UP' | 'DOWN' | 'STABLE';
  percentage: number;
  period: string;
}

export interface ReportChart {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'donut';
  title: string;
  data: any[];
  config?: {
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
  };
}

// =====================================================
// FINANCIAL NOTIFICATIONS
// =====================================================

export interface FinancialNotification {
  id: string;
  tenantId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  recipients: NotificationRecipient[];
  status: NotificationStatus;
  scheduledFor?: string;
  sentAt?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 
  | 'PAYMENT_DUE'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_RECEIVED'
  | 'CONTRACT_EXPIRING'
  | 'CONTRACT_SIGNED'
  | 'REPORT_GENERATED'
  | 'BUDGET_EXCEEDED'
  | 'CASH_FLOW_ALERT'
  | 'SYSTEM_ALERT'
  | 'CUSTOM';

export type NotificationChannel = 
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'IN_APP'
  | 'WEBHOOK';

export type NotificationStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'PARTIALLY_SENT'
  | 'FAILED'
  | 'CANCELLED';

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  name?: string;
  userId?: string;
  role?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channels: NotificationChannel[];
  subject: string;
  emailTemplate: string;
  smsTemplate: string;
  pushTemplate: string;
  variables: string[];
  isActive: boolean;
  metadata: Record<string, any>;
}

// =====================================================
// AUDIT LOGS
// =====================================================

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'SIGN'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'RESTORE';

export type ResourceType = 
  | 'FINANCIAL_CALCULATION'
  | 'DIGITAL_CONTRACT'
  | 'CONTRACT_SIGNATURE'
  | 'FINANCIAL_REPORT'
  | 'NOTIFICATION'
  | 'USER'
  | 'TENANT'
  | 'BILLING'
  | 'PAYMENT';

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

// Financial Calculations API
export interface CalculationRequest {
  type: CalculationType;
  parameters: Record<string, any>;
  saveResult?: boolean;
  metadata?: Record<string, any>;
}

export interface CalculationResponse {
  id?: string;
  type: CalculationType;
  result: any;
  parameters: Record<string, any>;
  calculatedAt: string;
  metadata?: Record<string, any>;
}

// Digital Contracts API
export interface CreateContractRequest {
  title: string;
  content: string;
  contractType: ContractType;
  signatories: Signatory[];
  expiresAt?: string;
  metadata?: Record<string, any>;
  requiresWitness?: boolean;
  allowPartialSigning?: boolean;
}

export interface SignContractRequest {
  contractId: string;
  signatoryEmail: string;
  signatureType: SignatureType;
  signatureData: string;
  ipAddress?: string;
  userAgent?: string;
  location?: SignatureLocation;
  witnessEmail?: string;
}

export interface ContractResponse {
  id: string;
  contractNumber: string;
  title: string;
  content: string;
  contractType: ContractType;
  status: ContractStatus;
  signatories: Signatory[];
  signatures: DigitalContractSignature[];
  progress: ContractProgress;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

// Financial Reports API
export interface GenerateReportRequest {
  title: string;
  reportType: ReportType;
  dateRange: DateRange;
  filters?: ReportFilters;
  groupBy?: GroupByPeriod;
  includeProjections?: boolean;
  customQueries?: CustomQuery[];
  metadata?: Record<string, any>;
}

export interface CustomQuery {
  name: string;
  query: string;
  parameters?: Record<string, any>;
}

export interface ReportResponse {
  id: string;
  title: string;
  reportType: ReportType;
  status: ReportStatus;
  dateRange: DateRange;
  data?: any;
  summary?: ReportSummary;
  charts?: ReportChart[];
  createdAt: string;
  updatedAt: string;
  generatedBy: string;
  metadata?: Record<string, any>;
}

// Notifications API
export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  recipients: NotificationRecipient[];
  scheduledFor?: string;
  metadata?: Record<string, any>;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  recipients: NotificationRecipient[];
  status: NotificationStatus;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ValidationError[];
  timestamp: string;
}

// =====================================================
// FINANCIAL METRICS & KPIs
// =====================================================

export interface FinancialMetrics {
  revenue: {
    total: number;
    monthly: number;
    growth: number;
  };
  expenses: {
    total: number;
    monthly: number;
    growth: number;
  };
  profit: {
    gross: number;
    net: number;
    margin: number;
  };
  cashFlow: {
    operating: number;
    investing: number;
    financing: number;
    net: number;
  };
  contracts: {
    total: number;
    active: number;
    pending: number;
    value: number;
  };
  payments: {
    received: number;
    pending: number;
    overdue: number;
    averageDays: number;
  };
}

export interface KPITarget {
  metric: string;
  target: number;
  current: number;
  period: string;
  unit: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

// =====================================================
// INTEGRATION TYPES
// =====================================================

export interface PaymentGatewayConfig {
  provider: 'STRIPE' | 'ASAAS' | 'PAGSEGURO' | 'MERCADOPAGO';
  apiKey: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
  currency: string;
}

export interface BankingIntegration {
  bank: string;
  accountNumber: string;
  agency: string;
  accountType: 'CHECKING' | 'SAVINGS';
  balance: number;
  lastSync: string;
}

export interface TaxConfiguration {
  regime: 'SIMPLES' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  rates: {
    iss: number;
    pis: number;
    cofins: number;
    irpj: number;
    csll: number;
  };
  deductions: string[];
}

// =====================================================
// EXPORT ALL TYPES
// =====================================================

export type {
  // Database types
  FinancialCalculationsTable,
  DigitalContractsTable,
  DigitalContractSignaturesTable,
  FinancialReportsTable,
  FinancialNotificationsTable,
  AuditLogsTable,
};

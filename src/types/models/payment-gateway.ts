// =====================================================
// PAYMENT GATEWAY INTEGRATION TYPES
// Descrição: Tipos para integração com gateways de pagamento
// =====================================================

// =====================================================
// PAYMENT GATEWAY CONFIGURATION
// =====================================================

/**
 * Interface para configuração de gateway de pagamento
 */
export interface PaymentGateway {
  id: string;
  tenantId: string;
  name: string;
  provider: PaymentProvider;
  environment: 'SANDBOX' | 'PRODUCTION';
  configuration: GatewayConfiguration;
  supportedMethods: PaymentMethod[];
  supportedCurrencies: string[];
  features: GatewayFeature[];
  fees: GatewayFee[];
  limits: PaymentLimits;
  webhookConfig: WebhookConfiguration;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export type PaymentProvider = 
  | 'STRIPE'
  | 'PAGSEGURO'
  | 'MERCADOPAGO'
  | 'PAYPAL'
  | 'ASAAS'
  | 'IUGU'
  | 'GERENCIANET'
  | 'CIELO'
  | 'REDE'
  | 'STONE'
  | 'GETNET'
  | 'ADYEN'
  | 'BRAINTREE'
  | 'SQUARE'
  | 'PIX'
  | 'BOLETO'
  | 'CUSTOM';

export interface GatewayConfiguration {
  apiKey: string;
  secretKey?: string;
  publicKey?: string;
  merchantId?: string;
  applicationId?: string;
  webhookSecret?: string;
  apiUrl?: string;
  apiVersion?: string;
  timeout: number;
  retryAttempts: number;
  customSettings: Record<string, any>;
}

export type PaymentMethod = 
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

export type GatewayFeature = 
  | 'TOKENIZATION'
  | 'RECURRING_PAYMENTS'
  | 'INSTALLMENTS'
  | 'REFUNDS'
  | 'PARTIAL_REFUNDS'
  | 'CHARGEBACKS'
  | 'FRAUD_DETECTION'
  | 'WEBHOOKS'
  | 'MARKETPLACE'
  | 'SPLIT_PAYMENTS'
  | 'ESCROW'
  | 'PREAUTH'
  | 'CAPTURE'
  | 'VOID'
  | 'DISPUTES';

export interface GatewayFee {
  type: FeeType;
  method: PaymentMethod;
  structure: FeeStructure;
  amount: number;
  percentage?: number;
  minimum?: number;
  maximum?: number;
  currency: string;
}

export type FeeType = 
  | 'TRANSACTION'
  | 'MONTHLY'
  | 'SETUP'
  | 'CHARGEBACK'
  | 'REFUND'
  | 'DISPUTE'
  | 'INSTALLMENT'
  | 'INTERNATIONAL';

export type FeeStructure = 
  | 'FIXED'
  | 'PERCENTAGE'
  | 'MIXED'
  | 'TIERED'
  | 'VOLUME_BASED';

export interface PaymentLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  maxInstallments?: number;
  currency: string;
}

export interface WebhookConfiguration {
  url: string;
  events: WebhookEvent[];
  secret: string;
  retryAttempts: number;
  timeout: number;
  isActive: boolean;
}

export type WebhookEvent = 
  | 'PAYMENT_CREATED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_CANCELLED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_CHARGEBACK'
  | 'PAYMENT_DISPUTE'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED';

// =====================================================
// PAYMENT PROCESSING
// =====================================================

/**
 * Interface para transação de pagamento
 */
export interface PaymentTransaction {
  id: string;
  tenantId: string;
  gatewayId: string;
  gatewayTransactionId?: string;
  externalId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  description: string;
  customer: PaymentCustomer;
  billing?: BillingAddress;
  shipping?: ShippingAddress;
  items?: PaymentItem[];
  metadata: Record<string, any>;
  fees: TransactionFee[];
  installments?: InstallmentInfo;
  recurring?: RecurringInfo;
  fraud?: FraudAnalysis;
  gateway: GatewayResponse;
  events: PaymentEvent[];
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  settledAt?: string;
  refunds: PaymentRefund[];
  chargebacks: PaymentChargeback[];
}

export type PaymentStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'APPROVED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CHARGEBACK'
  | 'DISPUTE'
  | 'EXPIRED'
  | 'FAILED'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'VOIDED';

export interface PaymentCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  document?: CustomerDocument;
  address?: CustomerAddress;
  birthDate?: string;
  gender?: 'M' | 'F' | 'OTHER';
  metadata?: Record<string, any>;
}

export interface CustomerDocument {
  type: 'CPF' | 'CNPJ' | 'PASSPORT' | 'OTHER';
  number: string;
}

export interface CustomerAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface BillingAddress extends CustomerAddress {
  name?: string;
  email?: string;
}

export interface ShippingAddress extends CustomerAddress {
  name?: string;
  phone?: string;
}

export interface PaymentItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  sku?: string;
  metadata?: Record<string, any>;
}

export interface TransactionFee {
  type: FeeType;
  amount: number;
  percentage?: number;
  description: string;
}

export interface InstallmentInfo {
  count: number;
  amount: number;
  interestRate?: number;
  totalAmount: number;
  schedule: InstallmentSchedule[];
}

export interface InstallmentSchedule {
  number: number;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paidAt?: string;
}

export interface RecurringInfo {
  subscriptionId: string;
  planId: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  trialDays?: number;
  cycleCount?: number;
  currentCycle: number;
}

export type RecurringFrequency = 
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL';

export interface FraudAnalysis {
  score: number;
  status: FraudStatus;
  provider: string;
  rules: FraudRule[];
  recommendation: FraudRecommendation;
  details: Record<string, any>;
}

export type FraudStatus = 
  | 'APPROVED'
  | 'DECLINED'
  | 'REVIEW'
  | 'PENDING'
  | 'ERROR';

export interface FraudRule {
  name: string;
  score: number;
  triggered: boolean;
  description: string;
}

export type FraudRecommendation = 
  | 'APPROVE'
  | 'DECLINE'
  | 'REVIEW'
  | 'CHALLENGE';

export interface GatewayResponse {
  provider: PaymentProvider;
  transactionId: string;
  authorizationCode?: string;
  nsu?: string;
  tid?: string;
  acquirer?: string;
  responseCode: string;
  responseMessage: string;
  rawResponse: Record<string, any>;
  processingTime: number;
}

export interface PaymentEvent {
  id: string;
  type: PaymentEventType;
  status: PaymentStatus;
  timestamp: string;
  data: Record<string, any>;
  source: 'GATEWAY' | 'WEBHOOK' | 'API' | 'MANUAL';
}

export type PaymentEventType = 
  | 'CREATED'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'CHARGEBACK'
  | 'DISPUTE'
  | 'SETTLED'
  | 'FAILED'
  | 'EXPIRED';

// =====================================================
// REFUNDS AND CHARGEBACKS
// =====================================================

export interface PaymentRefund {
  id: string;
  transactionId: string;
  gatewayRefundId?: string;
  amount: number;
  reason: RefundReason;
  status: RefundStatus;
  requestedBy: string;
  requestedAt: string;
  processedAt?: string;
  gateway: GatewayResponse;
  metadata: Record<string, any>;
}

export type RefundReason = 
  | 'CUSTOMER_REQUEST'
  | 'FRAUD'
  | 'DUPLICATE'
  | 'PRODUCT_NOT_RECEIVED'
  | 'PRODUCT_DEFECTIVE'
  | 'CANCELLED_ORDER'
  | 'PROCESSING_ERROR'
  | 'OTHER';

export type RefundStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface PaymentChargeback {
  id: string;
  transactionId: string;
  gatewayChargebackId?: string;
  amount: number;
  reasonCode: string;
  reasonDescription: string;
  status: ChargebackStatus;
  receivedAt: string;
  dueDate?: string;
  evidence?: ChargebackEvidence;
  gateway: GatewayResponse;
  metadata: Record<string, any>;
}

export type ChargebackStatus = 
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'DISPUTED'
  | 'WON'
  | 'LOST'
  | 'EXPIRED';

export interface ChargebackEvidence {
  documents: EvidenceDocument[];
  description: string;
  submittedAt?: string;
  submittedBy?: string;
}

export interface EvidenceDocument {
  type: DocumentType;
  name: string;
  url: string;
  uploadedAt: string;
}

export type DocumentType = 
  | 'RECEIPT'
  | 'INVOICE'
  | 'SHIPPING_PROOF'
  | 'COMMUNICATION'
  | 'AUTHORIZATION'
  | 'TERMS_OF_SERVICE'
  | 'OTHER';

// =====================================================
// SUBSCRIPTIONS AND RECURRING PAYMENTS
// =====================================================

export interface PaymentSubscription {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  gatewaySubscriptionId?: string;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  trialDays?: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  cancelReason?: string;
  metadata: Record<string, any>;
  payments: PaymentTransaction[];
  events: SubscriptionEvent[];
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus = 
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'UNPAID'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'PAUSED';

export interface SubscriptionEvent {
  id: string;
  type: SubscriptionEventType;
  timestamp: string;
  data: Record<string, any>;
}

export type SubscriptionEventType = 
  | 'CREATED'
  | 'UPDATED'
  | 'CANCELLED'
  | 'REACTIVATED'
  | 'TRIAL_ENDED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID';

export interface SubscriptionPlan {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  trialDays?: number;
  setupFee?: number;
  features: PlanFeature[];
  limits: PlanLimits;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export interface PlanFeature {
  name: string;
  description?: string;
  included: boolean;
  limit?: number;
}

export interface PlanLimits {
  users?: number;
  storage?: number; // em GB
  apiCalls?: number;
  customLimits: Record<string, number>;
}

// =====================================================
// PAYMENT METHODS AND TOKENS
// =====================================================

export interface PaymentMethodToken {
  id: string;
  customerId: string;
  gatewayTokenId: string;
  type: PaymentMethod;
  brand?: string;
  lastFourDigits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export interface CreditCardInfo {
  number: string;
  holderName: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  brand?: string;
}

export interface BankAccountInfo {
  bankCode: string;
  agency: string;
  account: string;
  accountType: 'CHECKING' | 'SAVINGS';
  holderName: string;
  holderDocument: string;
}

export interface PixInfo {
  key: string;
  keyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  qrCode?: string;
  qrCodeImage?: string;
  expiresAt?: string;
}

// =====================================================
// WEBHOOK PROCESSING
// =====================================================

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  data: Record<string, any>;
  timestamp: string;
  signature?: string;
  provider: PaymentProvider;
  version?: string;
}

export interface WebhookProcessing {
  id: string;
  webhookId: string;
  payload: WebhookPayload;
  status: WebhookStatus;
  attempts: number;
  lastAttempt?: string;
  nextAttempt?: string;
  error?: string;
  processedAt?: string;
  createdAt: string;
}

export type WebhookStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'RETRYING'
  | 'DISCARDED';

// =====================================================
// PAYMENT ANALYTICS
// =====================================================

export interface PaymentAnalytics {
  period: AnalyticsPeriod;
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  successRate: number;
  declineRate: number;
  refundRate: number;
  chargebackRate: number;
  byMethod: MethodAnalytics[];
  byStatus: StatusAnalytics[];
  byGateway: GatewayAnalytics[];
  trends: AnalyticsTrend[];
  topDeclineReasons: DeclineReason[];
}

export interface AnalyticsPeriod {
  startDate: string;
  endDate: string;
  granularity: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
}

export interface MethodAnalytics {
  method: PaymentMethod;
  count: number;
  amount: number;
  successRate: number;
}

export interface StatusAnalytics {
  status: PaymentStatus;
  count: number;
  amount: number;
  percentage: number;
}

export interface GatewayAnalytics {
  gatewayId: string;
  provider: PaymentProvider;
  count: number;
  amount: number;
  successRate: number;
  averageProcessingTime: number;
}

export interface AnalyticsTrend {
  date: string;
  transactions: number;
  amount: number;
  successRate: number;
}

export interface DeclineReason {
  code: string;
  description: string;
  count: number;
  percentage: number;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  method: PaymentMethod;
  description: string;
  customer: PaymentCustomer;
  billing?: BillingAddress;
  shipping?: ShippingAddress;
  items?: PaymentItem[];
  installments?: number;
  paymentMethodToken?: string;
  creditCard?: CreditCardInfo;
  bankAccount?: BankAccountInfo;
  pix?: PixInfo;
  metadata?: Record<string, any>;
}

export interface CreateRefundRequest {
  transactionId: string;
  amount?: number;
  reason: RefundReason;
  description?: string;
}

export interface CreateSubscriptionRequest {
  customerId: string;
  planId: string;
  paymentMethodToken?: string;
  trialDays?: number;
  startDate?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  transaction: PaymentTransaction;
  redirectUrl?: string;
  qrCode?: string;
  barcode?: string;
  pixKey?: string;
}

export interface RefundResponse {
  refund: PaymentRefund;
  success: boolean;
  message?: string;
}

export interface SubscriptionResponse {
  subscription: PaymentSubscription;
  success: boolean;
  message?: string;
}

// =====================================================
// EXPORT TYPES
// =====================================================

export type {
  PaymentGateway,
  PaymentTransaction,
  PaymentSubscription,
  PaymentRefund,
  PaymentChargeback,
  WebhookPayload,
  PaymentAnalytics
};

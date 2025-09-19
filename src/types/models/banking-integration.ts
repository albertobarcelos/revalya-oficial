// =====================================================
// BANKING INTEGRATION TYPES
// Descrição: Tipos para integração bancária e Open Banking
// =====================================================

// =====================================================
// OPEN BANKING
// =====================================================

/**
 * Interface para dados de conta bancária via Open Banking
 */
export interface BankAccount {
  id: string;
  tenantId: string;
  bankCode: string;
  bankName: string;
  agency: string;
  accountNumber: string;
  accountType: AccountType;
  accountSubType?: AccountSubType;
  currency: string;
  balance: AccountBalance;
  holder: AccountHolder;
  status: AccountStatus;
  permissions: OpenBankingPermission[];
  consentId: string;
  lastSync: string;
  metadata: Record<string, any>;
}

export type AccountType = 
  | 'CONTA_DEPOSITO_A_VISTA'
  | 'CONTA_POUPANCA'
  | 'CONTA_PAGAMENTO_PRE_PAGA';

export type AccountSubType = 
  | 'INDIVIDUAL'
  | 'CONJUNTA_SIMPLES'
  | 'CONJUNTA_SOLIDARIA';

/**
 * Interface para saldo da conta
 */
export interface AccountBalance {
  available: number;
  current: number;
  overdraftLimit?: number;
  blockedAmount?: number;
  automaticallyInvestedAmount?: number;
  currency: string;
  updateDateTime: string;
}

/**
 * Interface para titular da conta
 */
export interface AccountHolder {
  type: 'PESSOA_NATURAL' | 'PESSOA_JURIDICA';
  cpfCnpj: string;
  name: string;
  socialName?: string;
  companyName?: string;
  tradeName?: string;
}

export type AccountStatus = 
  | 'AVAILABLE'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'UNAVAILABLE';

export type OpenBankingPermission = 
  | 'ACCOUNTS_READ'
  | 'ACCOUNTS_BALANCES_READ'
  | 'ACCOUNTS_TRANSACTIONS_READ'
  | 'ACCOUNTS_OVERDRAFT_LIMITS_READ'
  | 'CREDIT_CARDS_ACCOUNTS_READ'
  | 'CREDIT_CARDS_ACCOUNTS_BILLS_READ'
  | 'CREDIT_CARDS_ACCOUNTS_BILLS_TRANSACTIONS_READ'
  | 'CREDIT_CARDS_ACCOUNTS_LIMITS_READ'
  | 'CREDIT_CARDS_ACCOUNTS_TRANSACTIONS_READ'
  | 'CUSTOMERS_PERSONAL_IDENTIFICATIONS_READ'
  | 'CUSTOMERS_PERSONAL_ADITTIONALINFO_READ'
  | 'CUSTOMERS_BUSINESS_IDENTIFICATIONS_READ'
  | 'CUSTOMERS_BUSINESS_ADITTIONALINFO_READ'
  | 'FINANCINGS_READ'
  | 'FINANCINGS_SCHEDULED_INSTALMENTS_READ'
  | 'FINANCINGS_PAYMENTS_READ'
  | 'FINANCINGS_WARRANTIES_READ'
  | 'INVOICE_FINANCINGS_READ'
  | 'INVOICE_FINANCINGS_SCHEDULED_INSTALMENTS_READ'
  | 'INVOICE_FINANCINGS_PAYMENTS_READ'
  | 'INVOICE_FINANCINGS_WARRANTIES_READ'
  | 'LOANS_READ'
  | 'LOANS_SCHEDULED_INSTALMENTS_READ'
  | 'LOANS_PAYMENTS_READ'
  | 'LOANS_WARRANTIES_READ'
  | 'UNARRANGED_ACCOUNTS_OVERDRAFT_READ'
  | 'UNARRANGED_ACCOUNTS_OVERDRAFT_SCHEDULED_INSTALMENTS_READ'
  | 'UNARRANGED_ACCOUNTS_OVERDRAFT_PAYMENTS_READ'
  | 'UNARRANGED_ACCOUNTS_OVERDRAFT_WARRANTIES_READ';

// =====================================================
// BANK TRANSACTIONS
// =====================================================

/**
 * Interface para transações bancárias
 */
export interface BankTransaction {
  id: string;
  accountId: string;
  transactionId: string;
  completedAuthorisedPaymentType: CompletedAuthorisedPaymentType;
  creditDebitType: 'CREDITO' | 'DEBITO';
  transactionName: string;
  type: TransactionType;
  amount: number;
  currency: string;
  transactionDate: string;
  partieBankCode?: string;
  partiePersonType?: 'PESSOA_NATURAL' | 'PESSOA_JURIDICA';
  partieCpfCnpj?: string;
  partieCompeCode?: string;
  partieBranchCode?: string;
  partieNumber?: string;
  partieCheckDigit?: string;
  transactionCategory: TransactionCategory;
  transactionSubCategory?: string;
  balanceAfterTransaction?: number;
  metadata: Record<string, any>;
}

export type CompletedAuthorisedPaymentType = 
  | 'TED'
  | 'DOC'
  | 'PIX'
  | 'TRANSFERENCIA_CONTA_CORRENTE'
  | 'BOLETO'
  | 'CONVENIO_ARRECADACAO'
  | 'PACOTE_TARIFA_SERVICOS'
  | 'TARIFA_SERVICOS_AVULSOS'
  | 'FOLHA_PAGAMENTO'
  | 'DEPOSITO'
  | 'SAQUE'
  | 'CARTAO'
  | 'FINANCIAMENTO'
  | 'EMPRESTIMO'
  | 'CAMBIO'
  | 'INVESTIMENTO'
  | 'OUTROS';

export type TransactionType = 
  | 'PAYMENT'
  | 'TRANSFER'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'FEE'
  | 'INTEREST'
  | 'DIVIDEND'
  | 'REFUND'
  | 'CHARGEBACK'
  | 'OTHER';

export type TransactionCategory = 
  | 'RECEITA'
  | 'DESPESA'
  | 'TRANSFERENCIA'
  | 'INVESTIMENTO'
  | 'EMPRESTIMO'
  | 'FINANCIAMENTO'
  | 'IMPOSTOS'
  | 'TARIFAS'
  | 'OUTROS';

// =====================================================
// PIX INTEGRATION
// =====================================================

/**
 * Interface para chave Pix
 */
export interface PixKey {
  id: string;
  tenantId: string;
  keyType: PixKeyType;
  keyValue: string;
  accountId: string;
  status: PixKeyStatus;
  createdAt: string;
  registeredAt?: string;
  deletedAt?: string;
  metadata: Record<string, any>;
}

export type PixKeyType = 
  | 'CPF'
  | 'CNPJ'
  | 'PHONE'
  | 'EMAIL'
  | 'EVP'; // Chave aleatória

export type PixKeyStatus = 
  | 'PENDING'
  | 'REGISTERED'
  | 'BLOCKED'
  | 'DELETED'
  | 'ERROR';

/**
 * Interface para transação Pix
 */
export interface PixTransaction {
  id: string;
  tenantId: string;
  endToEndId: string;
  txId?: string;
  amount: number;
  currency: string;
  type: PixTransactionType;
  status: PixTransactionStatus;
  payer: PixParticipant;
  payee: PixParticipant;
  description?: string;
  pixKey?: string;
  qrCode?: string;
  location?: string;
  createdAt: string;
  processedAt?: string;
  settledAt?: string;
  returnInfo?: PixReturnInfo;
  metadata: Record<string, any>;
}

export type PixTransactionType = 
  | 'PAYMENT'
  | 'TRANSFER'
  | 'WITHDRAWAL'
  | 'CHANGE'
  | 'RETURN';

export type PixTransactionStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETURNED';

/**
 * Interface para participante Pix
 */
export interface PixParticipant {
  name: string;
  cpfCnpj: string;
  bankCode: string;
  agency: string;
  account: string;
  accountType: AccountType;
}

/**
 * Interface para informações de devolução Pix
 */
export interface PixReturnInfo {
  returnId: string;
  originalEndToEndId: string;
  returnAmount: number;
  returnReason: PixReturnReason;
  returnDescription?: string;
  returnedAt: string;
}

export type PixReturnReason = 
  | 'MD06' // Solicitação do usuário recebedor
  | 'AG03' // Número da conta transacionada inválido
  | 'AC03' // Tipo de conta inválido
  | 'AG01' // Operação não permitida neste tipo de conta
  | 'AM04' // Saldo insuficiente
  | 'AM09' // Valor inválido
  | 'BE01' // Identificação do usuário final inconsistente
  | 'FF01' // Operação inválida
  | 'SL02'; // Rejeitada pela instituição do usuário recebedor

/**
 * Interface para QR Code Pix
 */
export interface PixQRCode {
  id: string;
  tenantId: string;
  qrCodeType: PixQRCodeType;
  payload: string;
  amount?: number;
  description?: string;
  pixKey?: string;
  merchantName?: string;
  merchantCity?: string;
  txId?: string;
  expiresAt?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'USED' | 'CANCELLED';
  usageCount: number;
  maxUsage?: number;
  createdAt: string;
  metadata: Record<string, any>;
}

export type PixQRCodeType = 
  | 'STATIC' // QR Code estático
  | 'DYNAMIC' // QR Code dinâmico
  | 'IMMEDIATE_PAYMENT' // Cobrança imediata
  | 'DUE_DATE_PAYMENT'; // Cobrança com vencimento

// =====================================================
// BANK RECONCILIATION
// =====================================================

/**
 * Interface para conciliação bancária
 */
export interface BankReconciliation {
  id: string;
  tenantId: string;
  accountId: string;
  period: string;
  startDate: string;
  endDate: string;
  status: ReconciliationStatus;
  bankBalance: number;
  systemBalance: number;
  difference: number;
  matchedTransactions: number;
  unmatchedBankTransactions: number;
  unmatchedSystemTransactions: number;
  reconciliationItems: ReconciliationItem[];
  createdAt: string;
  completedAt?: string;
  createdBy: string;
  metadata: Record<string, any>;
}

export type ReconciliationStatus = 
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'REQUIRES_REVIEW';

/**
 * Interface para item de conciliação
 */
export interface ReconciliationItem {
  id: string;
  type: ReconciliationItemType;
  bankTransactionId?: string;
  systemTransactionId?: string;
  amount: number;
  date: string;
  description: string;
  status: ReconciliationItemStatus;
  matchConfidence?: number; // 0-1
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export type ReconciliationItemType = 
  | 'MATCHED'
  | 'UNMATCHED_BANK'
  | 'UNMATCHED_SYSTEM'
  | 'DIFFERENCE'
  | 'DUPLICATE'
  | 'TIMING_DIFFERENCE';

export type ReconciliationItemStatus = 
  | 'PENDING'
  | 'MATCHED'
  | 'IGNORED'
  | 'REQUIRES_INVESTIGATION'
  | 'RESOLVED';

// =====================================================
// BANK INTEGRATION CONFIG
// =====================================================

/**
 * Interface para configuração de integração bancária
 */
export interface BankIntegrationConfig {
  id: string;
  tenantId: string;
  bankCode: string;
  bankName: string;
  integrationType: BankIntegrationType;
  credentials: BankCredentials;
  endpoints: BankEndpoints;
  settings: BankSettings;
  status: IntegrationStatus;
  lastSync: string;
  nextSync: string;
  errorCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export type BankIntegrationType = 
  | 'OPEN_BANKING'
  | 'API_DIRECT'
  | 'FILE_IMPORT'
  | 'SCREEN_SCRAPING'
  | 'WEBHOOK';

/**
 * Interface para credenciais bancárias
 */
export interface BankCredentials {
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  certificate?: string;
  privateKey?: string;
  username?: string;
  password?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}

/**
 * Interface para endpoints bancários
 */
export interface BankEndpoints {
  baseUrl: string;
  authUrl?: string;
  accountsUrl?: string;
  transactionsUrl?: string;
  balanceUrl?: string;
  pixUrl?: string;
  webhookUrl?: string;
}

/**
 * Interface para configurações bancárias
 */
export interface BankSettings {
  syncFrequency: number; // em minutos
  autoReconciliation: boolean;
  enableWebhooks: boolean;
  transactionDaysBack: number;
  enablePixIntegration: boolean;
  enableOpenBanking: boolean;
  retryAttempts: number;
  timeoutSeconds: number;
}

export type IntegrationStatus = 
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ERROR'
  | 'PENDING_SETUP'
  | 'EXPIRED_CREDENTIALS';

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface BankAccountSyncRequest {
  accountId: string;
  startDate?: string;
  endDate?: string;
  forceSync?: boolean;
}

export interface PixPaymentRequest {
  amount: number;
  description?: string;
  pixKey?: string;
  payeeInfo?: PixParticipant;
  scheduledFor?: string;
}

export interface PixQRCodeRequest {
  type: PixQRCodeType;
  amount?: number;
  description?: string;
  pixKey?: string;
  merchantInfo?: {
    name: string;
    city: string;
  };
  expiresAt?: string;
  maxUsage?: number;
}

export interface ReconciliationRequest {
  accountId: string;
  startDate: string;
  endDate: string;
  autoMatch?: boolean;
  matchThreshold?: number; // 0-1
}

// =====================================================
// WEBHOOK TYPES
// =====================================================

export interface BankWebhookEvent {
  id: string;
  type: BankWebhookEventType;
  bankCode: string;
  accountId: string;
  data: any;
  timestamp: string;
  signature?: string;
}

export type BankWebhookEventType = 
  | 'TRANSACTION_CREATED'
  | 'TRANSACTION_UPDATED'
  | 'BALANCE_UPDATED'
  | 'PIX_RECEIVED'
  | 'PIX_SENT'
  | 'PIX_RETURNED'
  | 'ACCOUNT_BLOCKED'
  | 'ACCOUNT_UNBLOCKED'
  | 'INTEGRATION_ERROR';

// =====================================================
// EXPORT TYPES
// =====================================================

export type {
  BankAccount,
  BankTransaction,
  PixKey,
  PixTransaction,
  PixQRCode,
  BankReconciliation,
  BankIntegrationConfig
};

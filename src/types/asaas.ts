export interface AsaasCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  address: string | null;
  addressNumber: string | null;
  complement: string | null;
  neighborhood: string | null; // AIDEV-NOTE: Campo correto conforme schema da tabela customers
  postalCode: string | null;
  cpfCnpj: string | null;
  personType: string | null;
  deleted: boolean;
  additionalEmails: string | null;
  externalReference: string | null;
  notificationDisabled: boolean;
  city: string | null; // AIDEV-NOTE: Código da cidade (não usado na interface)
  cityName?: string | null; // AIDEV-NOTE: Nome da cidade (usado na interface)
  state: string | null;
  country: string;
  observations: string | null;
  company: string | null; // Adicionado campo company
}

export interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  description?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeUrl?: string;
  nossoNumero?: string;
  invoiceNumber?: string;
  deleted: boolean;
  dateCreated: string;
  subscription?: string;
  installment?: string;
  externalReference?: string;
  
  // AIDEV-NOTE: Campos específicos para conciliação ASAAS
  identificationField?: string;      // Linha digitável do boleto
  barCode?: string;                  // Código de barras do boleto
  originalValue?: number;            // Valor original da cobrança
  interestValue?: number;            // Valor de juros e multas
  discountValue?: number;            // Valor de desconto aplicado
  confirmedDate?: string;            // Data de confirmação do pagamento
  clientPaymentDate?: string;        // Data de pagamento informada pelo cliente
  installmentNumber?: number;        // Número da parcela (se parcelado)
  installmentCount?: number;         // Total de parcelas
  transactionReceiptUrl?: string;    // URL do comprovante de transação
  canBeCancelled?: boolean;          // Se pode ser cancelada
  refunds?: AsaasRefund[];           // Estornos relacionados
}

export interface AsaasListResponse<T> {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
}

// AIDEV-NOTE: Interface para estornos ASAAS
export interface AsaasRefund {
  id: string;
  value: number;
  status: string;
  description?: string;
  refundDate: string;
}

// AIDEV-NOTE: Interface para dados específicos de conciliação ASAAS
export interface AsaasReconciliationData {
  paymentId: string;
  identificationField?: string;
  barCode?: string;
  nossoNumero?: string;
  bankSlipUrl?: string;
  pixQrCodeUrl?: string;
  transactionReceiptUrl?: string;
  originalValue: number;
  paidValue: number;
  interestValue?: number;
  discountValue?: number;
  netValue: number;
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER';
  paymentStatus: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'REFUND_IN_PROGRESS' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
  confirmedDate?: string;
  clientPaymentDate?: string;
  dueDate: string;
  installmentNumber?: number;
  installmentCount?: number;
  canBeCancelled: boolean;
  refunds?: AsaasRefund[];
}

export const mapAsaasCustomerToCustomer = (asaasCustomer: AsaasCustomer) => {
  return {
    asaas_id: asaasCustomer.id,
    name: asaasCustomer.name,
    email: asaasCustomer.email,
    phone: asaasCustomer.phone || asaasCustomer.mobilePhone,
    cpf_cnpj: asaasCustomer.cpfCnpj,
    address: asaasCustomer.address,
    neighborhood: asaasCustomer.neighborhood, // ✅ Corrigido: mapear neighborhood corretamente
    city: asaasCustomer.cityName || asaasCustomer.city, // ✅ Priorizar cityName se disponível
    state: asaasCustomer.state,
    postal_code: asaasCustomer.postalCode,
    country: asaasCustomer.country || 'Brasil', // ✅ Valor padrão mais flexível
    notes: asaasCustomer.observations,
    status: asaasCustomer.deleted ? 'inactive' : 'active',
    company: asaasCustomer.company
  };
};

export const mapAsaasPaymentToCharge = (payment: AsaasPayment) => {
  return {
    asaas_id: payment.id,
    customer_id: payment.customer,
    amount: payment.value,
    due_date: payment.dueDate,
    status: payment.status.toLowerCase() as 'pending' | 'paid' | 'overdue' | 'cancelled',
    description: payment.description || null,
    payment_link: payment.invoiceUrl || null,
    barcode: payment.bankSlipUrl || null,
    pix_code: payment.pixQrCodeUrl || null,
    paid_at: payment.paymentDate || null,
    priority: 'medium' as const,
    attempts: 0
  };
};

// AIDEV-NOTE: Função para mapear pagamento ASAAS para dados de conciliação
export const mapAsaasPaymentToReconciliation = (payment: AsaasPayment): AsaasReconciliationData => {
  return {
    paymentId: payment.id,
    identificationField: payment.identificationField,
    barCode: payment.barCode,
    nossoNumero: payment.nossoNumero,
    bankSlipUrl: payment.bankSlipUrl,
    pixQrCodeUrl: payment.pixQrCodeUrl,
    transactionReceiptUrl: payment.transactionReceiptUrl,
    originalValue: payment.originalValue || payment.value,
    paidValue: payment.netValue,
    interestValue: payment.interestValue,
    discountValue: payment.discountValue,
    netValue: payment.netValue,
    billingType: payment.billingType as 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER',
    paymentStatus: payment.status as any,
    confirmedDate: payment.confirmedDate,
    clientPaymentDate: payment.clientPaymentDate,
    dueDate: payment.dueDate,
    installmentNumber: payment.installmentNumber,
    installmentCount: payment.installmentCount,
    canBeCancelled: payment.canBeCancelled || false,
    refunds: payment.refunds
  };
};

export interface CreateCustomerDTO {
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  // AIDEV-NOTE: Removido mobilePhone - campo não existe na tabela customers
  address?: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string; // AIDEV-NOTE: Campo correto conforme schema da tabela customers
  postal_code?: string; // AIDEV-NOTE: Campo correto conforme schema da tabela customers
  city?: string;
  state?: string;
  country?: string;
  company?: string;
}

export interface AsaasCity {
  id: string;
  name: string;
  state: string;
  district?: string;
  ibgeCode?: string;
}

export type { AsaasCustomer as Customer };

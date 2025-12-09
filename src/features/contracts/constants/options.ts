/**
 * AIDEV-NOTE: Opções de selects centralizadas para contratos
 * Elimina arrays repetidos em múltiplos componentes
 * 
 * @module features/contracts/constants/options
 */

// Métodos de pagamento disponíveis
export const PAYMENT_METHODS = [
  { value: 'Cartão', label: 'Cartão' },
  { value: 'PIX', label: 'PIX' },
  { value: 'Transferência Bancária', label: 'Transferência Bancária' },
  { value: 'Boleto Bancário', label: 'Boleto Bancário' }
] as const;

// Tipos de cartão disponíveis
export const CARD_TYPES = [
  { value: 'credit', label: 'Crédito' },
  { value: 'credit_recurring', label: 'Crédito Recorrente' }
] as const;

// Tipos de faturamento disponíveis
export const BILLING_TYPES = [
  { value: 'Único', label: 'Único' },
  { value: 'Mensal', label: 'Recorrente (Mensal)' },
  { value: 'Trimestral', label: 'Trimestral' },
  { value: 'Semestral', label: 'Semestral' },
  { value: 'Anual', label: 'Anual' }
] as const;

// Frequências de recorrência disponíveis
export const RECURRENCE_FREQUENCIES = [
  { value: 'Mensal', label: 'Mensal' },
  { value: 'Trimestral', label: 'Trimestral' },
  { value: 'Semestral', label: 'Semestral' },
  { value: 'Anual', label: 'Anual' }
] as const;

// Tipos de vencimento disponíveis
export const DUE_TYPES = [
  { value: 'days_after_billing', label: 'Número de dias após faturar' },
  { value: 'fixed_day', label: 'Fixar Dia do Mês (1 a 31)' }
] as const;

// Tipos de desconto disponíveis
export const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentual (%)' },
  { value: 'fixed', label: 'Valor Fixo (R$)' }
] as const;

// Mapeamento de métodos de pagamento (API -> Display)
export const PAYMENT_METHOD_MAP: Record<string, string> = {
  'card': 'Cartão',
  'pix': 'PIX',
  'bank_transfer': 'Transferência',
  'bank_slip': 'Boleto',
  // Valores já em português (caso venham assim)
  'Cartão': 'Cartão',
  'PIX': 'PIX',
  'Transferência': 'Transferência',
  'Transferência Bancária': 'Transferência Bancária',
  'Boleto': 'Boleto',
  'Boleto Bancário': 'Boleto Bancário'
};

// Billing types que são recorrentes (necessitam frequência)
export const RECURRING_BILLING_TYPES = ['Mensal', 'Trimestral', 'Semestral', 'Anual'] as const;

// Tipos que permitem parcelamento
export const INSTALLMENT_BILLING_TYPES = ['Único'] as const;

/**
 * Verifica se o billing type é recorrente
 */
export function isRecurringBillingType(billingType: string): boolean {
  return RECURRING_BILLING_TYPES.includes(billingType as typeof RECURRING_BILLING_TYPES[number]);
}

/**
 * Verifica se o método de pagamento é cartão
 */
export function isCardPaymentMethod(paymentMethod: string): boolean {
  return paymentMethod === 'Cartão';
}

/**
 * Verifica se o tipo de cartão é recorrente
 */
export function isRecurringCardType(cardType: string): boolean {
  return cardType === 'credit_recurring';
}

/**
 * Mapeia método de pagamento para formato do banco
 */
export function mapPaymentMethod(paymentMethod: string | null): string | null {
  if (!paymentMethod) return null;
  return PAYMENT_METHOD_MAP[paymentMethod] || null;
}


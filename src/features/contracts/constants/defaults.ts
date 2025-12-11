/**
 * AIDEV-NOTE: Valores padrão centralizados para contratos
 * Elimina valores mágicos espalhados pelo código
 * 
 * @module features/contracts/constants/defaults
 */

import type { 
  FinancialData, 
  TaxData, 
  DueDateData, 
  BillingData, 
  DiscountData, 
  BulkEditData,
  DraftInputState
} from '../types';

// Dados financeiros padrão
export const DEFAULT_FINANCIAL_DATA: FinancialData = {
  payment_method: 'PIX',
  card_type: '',
  billing_type: 'Único',
  recurrence_frequency: '',
  installments: 1
};

// Dados de impostos padrão
export const DEFAULT_TAX_DATA: TaxData = {
  nbs_code: '',
  deduction_value: 0,
  calculation_base: 0,
  iss_rate: 0,
  iss_deduct: false,
  ir_rate: 0,
  ir_deduct: false,
  csll_rate: 0,
  csll_deduct: false,
  inss_rate: 0,
  inss_deduct: false,
  pis_rate: 0,
  pis_deduct: false,
  cofins_rate: 0,
  cofins_deduct: false
};

// Dados de vencimento padrão
export const DEFAULT_DUE_DATE_DATA: DueDateData = {
  due_type: 'days_after_billing',
  due_value: 5,
  due_next_month: false
};

// Dados de cobrança padrão
export const DEFAULT_BILLING_DATA: BillingData = {
  generate_billing: true
};

// Dados de desconto padrão
export const DEFAULT_DISCOUNT_DATA: DiscountData = {
  discount_type: 'percentage',
  discount_value: 0,
  discount_percentage: 0,
  discount_amount: 0
};

// Dados de edição em massa padrão
export const DEFAULT_BULK_EDIT_DATA: BulkEditData = {
  payment_method: '',
  card_type: '',
  billing_type: '',
  recurrence_frequency: '',
  installments: 1,
  unit_price: '',
  due_type: 'days_after_billing',
  due_value: 5,
  due_next_month: false,
  generate_billing: true
};

// Estado de rascunho de inputs padrão
export const DEFAULT_DRAFT_INPUT_STATE: DraftInputState = {
  unitPrice: { input: '', draft: null },
  costPrice: { input: '', draft: null },
  quantity: { input: '', draft: null }
};

// Valores limites
export const LIMITS = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 9999,
  MIN_INSTALLMENTS: 1,
  MAX_INSTALLMENTS: 12,
  MIN_DAY_OF_MONTH: 1,
  MAX_DAY_OF_MONTH: 31,
  MIN_DAYS_AFTER_BILLING: 1,
  MAX_DAYS_AFTER_BILLING: 365,
  MIN_DISCOUNT_PERCENTAGE: 0,
  MAX_DISCOUNT_PERCENTAGE: 100
} as const;

// Debounce padrão (ms)
export const DEFAULT_DEBOUNCE_MS = 300;


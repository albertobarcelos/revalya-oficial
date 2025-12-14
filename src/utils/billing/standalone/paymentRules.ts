/**
 * AIDEV-NOTE: Regras de negócio para pagamento por item
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import type { BillingItem } from '@/types/billing/standalone';

/**
 * Verifica se deve exibir campo de frequência de cobrança
 */
export function shouldShowRecurrenceFrequency(item: BillingItem): boolean {
  return !!(
    item.payment_method &&
    (item.billing_type === 'Mensal' || 
     item.billing_type === 'Trimestral' || 
     item.billing_type === 'Semestral' || 
     item.billing_type === 'Anual') &&
    item.card_type !== 'credit_recurring' &&
    !(item.payment_method === 'CREDIT_CARD' && item.card_type === 'credit') &&
    item.payment_method !== 'BOLETO'
  );
}

/**
 * Verifica se deve exibir campo de parcelas
 */
export function shouldShowInstallments(item: BillingItem): boolean {
  return !!(
    (item.payment_method === 'CREDIT_CARD' && item.card_type === 'credit') ||
    (item.payment_method === 'BOLETO' && item.billing_type === 'Único') ||
    (item.payment_method &&
     item.payment_method !== 'CREDIT_CARD' &&
     item.payment_method !== 'BOLETO' &&
     item.billing_type &&
     item.billing_type !== 'Único')
  );
}

/**
 * Verifica se tipo de faturamento deve estar desabilitado
 */
export function isBillingTypeDisabled(item: BillingItem): boolean {
  return item.payment_method === 'CREDIT_CARD';
}

/**
 * Obtém placeholder para tipo de faturamento baseado no método de pagamento
 */
export function getBillingTypePlaceholder(item: BillingItem): string {
  if (item.payment_method === 'CREDIT_CARD' && item.card_type === 'credit_recurring') {
    return 'Recorrente (Mensal) - Automático';
  }
  if (item.payment_method === 'CREDIT_CARD' && item.card_type === 'credit') {
    return 'Único - Automático';
  }
  return 'Selecione';
}

/**
 * Labels para métodos de pagamento
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Cartão de Crédito',
  PIX: 'PIX',
  BOLETO: 'Boleto Bancário',
  CASH: 'Dinheiro',
};

/**
 * Labels para tipos de cartão
 */
export const CARD_TYPE_LABELS: Record<string, string> = {
  credit: 'Crédito',
  credit_recurring: 'Crédito Recorrente',
};

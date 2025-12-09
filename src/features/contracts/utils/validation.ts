/**
 * AIDEV-NOTE: Funções de validação centralizadas para contratos
 * Validações de negócio para serviços e produtos
 * 
 * @module features/contracts/utils/validation
 */

import type { SelectedService, SelectedProduct, FinancialData } from '../types';
import { isCardPaymentMethod, isRecurringCardType, isRecurringBillingType } from '../constants';

/**
 * Valida se um serviço está completo para salvar
 * 
 * @param service - Serviço para validar
 * @returns Objeto com resultado da validação e erros encontrados
 */
export function validateService(service: Partial<SelectedService>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!service.name?.trim()) {
    errors.push('Nome do serviço é obrigatório');
  }
  
  if (!service.unit_price || service.unit_price <= 0) {
    errors.push('Valor unitário deve ser maior que zero');
  }
  
  if (!service.quantity || service.quantity < 1) {
    errors.push('Quantidade deve ser pelo menos 1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida se um produto está completo para salvar
 * 
 * @param product - Produto para validar
 * @returns Objeto com resultado da validação e erros encontrados
 */
export function validateProduct(product: Partial<SelectedProduct>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!product.name?.trim()) {
    errors.push('Nome do produto é obrigatório');
  }
  
  if (!product.unit_price || product.unit_price <= 0) {
    errors.push('Valor unitário deve ser maior que zero');
  }
  
  if (!product.quantity || product.quantity < 1) {
    errors.push('Quantidade deve ser pelo menos 1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida configuração financeira
 * 
 * @param data - Dados financeiros para validar
 * @returns Objeto com resultado da validação e erros encontrados
 */
export function validateFinancialData(data: Partial<FinancialData>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!data.payment_method) {
    errors.push('Método de pagamento é obrigatório');
  }
  
  // Se for cartão, tipo de cartão é obrigatório
  if (isCardPaymentMethod(data.payment_method || '')) {
    if (!data.card_type) {
      errors.push('Tipo de cartão é obrigatório para pagamento com cartão');
    }
  }
  
  // Validar consistência entre tipo de cartão e tipo de faturamento
  if (data.card_type) {
    if (isRecurringCardType(data.card_type)) {
      // Cartão recorrente deve ter billing_type 'Mensal'
      if (data.billing_type && data.billing_type !== 'Mensal') {
        errors.push('Cartão recorrente deve usar faturamento Mensal');
      }
    } else if (data.card_type === 'credit') {
      // Cartão crédito simples deve ter billing_type 'Único'
      if (data.billing_type && data.billing_type !== 'Único') {
        errors.push('Cartão de crédito deve usar faturamento Único');
      }
    }
  }
  
  // Validar parcelas
  if (data.installments !== undefined && data.installments < 1) {
    errors.push('Número de parcelas deve ser pelo menos 1');
  }
  
  // Validar frequência de recorrência se tipo for recorrente
  if (data.billing_type && isRecurringBillingType(data.billing_type)) {
    // Para boleto recorrente, a frequência é automática
    // Para outros métodos, frequência é necessária (exceto cartão recorrente que é fixo mensal)
    if (!isCardPaymentMethod(data.payment_method || '') && 
        data.payment_method !== 'Boleto Bancário' &&
        !data.recurrence_frequency) {
      errors.push('Frequência de recorrência é obrigatória para faturamento recorrente');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida configuração de vencimento
 * 
 * @param dueType - Tipo de vencimento
 * @param dueValue - Valor (dias ou dia do mês)
 * @returns Objeto com resultado da validação e erros encontrados
 */
export function validateDueDate(
  dueType: string | undefined,
  dueValue: number | undefined
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!dueType) {
    errors.push('Tipo de vencimento é obrigatório');
  }
  
  if (dueValue === undefined || dueValue === null) {
    errors.push('Valor de vencimento é obrigatório');
  } else {
    if (dueType === 'days_after_billing') {
      if (dueValue < 1 || dueValue > 365) {
        errors.push('Dias após faturamento deve ser entre 1 e 365');
      }
    } else if (dueType === 'fixed_day') {
      if (dueValue < 1 || dueValue > 31) {
        errors.push('Dia do mês deve ser entre 1 e 31');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Verifica se um serviço tem alterações pendentes
 * 
 * @param original - Dados originais do serviço
 * @param current - Dados atuais do serviço
 * @returns true se houver alterações
 */
export function hasServiceChanges(
  original: SelectedService,
  current: Partial<SelectedService>
): boolean {
  // Campos a comparar
  const fieldsToCompare: (keyof SelectedService)[] = [
    'unit_price',
    'cost_price',
    'quantity',
    'discount_percentage',
    'discount_amount',
    'payment_method',
    'card_type',
    'billing_type',
    'recurrence_frequency',
    'installments',
    'due_type',
    'due_value',
    'due_next_month',
    'generate_billing'
  ];
  
  for (const field of fieldsToCompare) {
    if (current[field] !== undefined && original[field] !== current[field]) {
      return true;
    }
  }
  
  return false;
}

/**
 * Valida se o serviço pode gerar cobrança
 * 
 * @param service - Serviço para validar
 * @returns true se pode gerar cobrança
 */
export function canGenerateBilling(service: Partial<SelectedService>): boolean {
  // Deve ter valor positivo
  if (!service.unit_price || service.unit_price <= 0) return false;
  
  // Deve ter quantidade positiva
  if (!service.quantity || service.quantity < 1) return false;
  
  // Flag explícita de geração de cobrança
  if (service.generate_billing === false) return false;
  
  return true;
}


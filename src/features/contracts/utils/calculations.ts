/**
 * AIDEV-NOTE: Funções de cálculo centralizadas para contratos
 * Elimina código duplicado em múltiplos componentes
 * 
 * @module features/contracts/utils/calculations
 */

import type { DiscountType } from '../types';

/**
 * Calcula o valor do desconto com base no tipo e valor
 * 
 * @param subtotal - Valor subtotal antes do desconto
 * @param type - Tipo de desconto ('percentage' ou 'fixed')
 * @param value - Valor do desconto (percentual ou valor fixo)
 * @returns Valor absoluto do desconto
 */
export function calculateDiscount(
  subtotal: number,
  type: DiscountType,
  value: number
): number {
  if (!value || value <= 0) return 0;
  
  if (type === 'percentage') {
    // Limita o percentual entre 0 e 100
    const safePercentage = Math.min(100, Math.max(0, value));
    return (subtotal * safePercentage) / 100;
  }
  
  // Desconto fixo não pode ser maior que o subtotal
  return Math.min(value, subtotal);
}

/**
 * Calcula o total do serviço/produto com desconto aplicado
 * 
 * @param unitPrice - Preço unitário
 * @param quantity - Quantidade
 * @param discount - Objeto com tipo e valor do desconto (opcional)
 * @returns Total calculado (sempre >= 0)
 */
export function calculateServiceTotal(
  unitPrice: number,
  quantity: number,
  discount?: { type: DiscountType; value: number }
): number {
  const subtotal = (unitPrice || 0) * (quantity || 1);
  
  if (!discount || discount.value === 0) {
    return subtotal;
  }
  
  const discountAmount = calculateDiscount(subtotal, discount.type, discount.value);
  return Math.max(0, subtotal - discountAmount);
}

/**
 * Calcula a margem de lucro entre preço de venda e custo
 * 
 * @param sellPrice - Preço de venda
 * @param costPrice - Preço de custo
 * @returns Objeto com valor absoluto e percentual da margem
 */
export function calculateMargin(
  sellPrice: number,
  costPrice: number
): { value: number; percentage: number } {
  const margin = (sellPrice || 0) - (costPrice || 0);
  const percentage = costPrice > 0 ? (margin / costPrice) * 100 : 0;
  
  return {
    value: Math.round(margin * 100) / 100,
    percentage: Math.round(percentage * 100) / 100
  };
}

/**
 * Calcula o subtotal (quantidade * preço unitário)
 * 
 * @param unitPrice - Preço unitário
 * @param quantity - Quantidade
 * @returns Subtotal calculado
 */
export function calculateSubtotal(unitPrice: number, quantity: number): number {
  return (unitPrice || 0) * (quantity || 1);
}

/**
 * Calcula o total de múltiplos serviços/produtos
 * 
 * @param items - Array de itens com campo 'total'
 * @returns Soma dos totais
 */
export function calculateTotalFromItems<T extends { total?: number; total_amount?: number }>(
  items: T[]
): number {
  return items.reduce((sum, item) => {
    const total = item.total ?? item.total_amount ?? 0;
    return sum + total;
  }, 0);
}

/**
 * Calcula valor de parcela
 * 
 * @param total - Valor total
 * @param installments - Número de parcelas
 * @returns Valor de cada parcela
 */
export function calculateInstallmentValue(total: number, installments: number): number {
  if (!installments || installments < 1) return total;
  return Math.round((total / installments) * 100) / 100;
}

/**
 * Valida se o desconto é válido
 * 
 * @param type - Tipo de desconto
 * @param value - Valor do desconto
 * @param subtotal - Subtotal para comparação (opcional, para desconto fixo)
 * @returns true se válido, false caso contrário
 */
export function isValidDiscount(
  type: DiscountType,
  value: number,
  subtotal?: number
): boolean {
  if (value < 0) return false;
  
  if (type === 'percentage') {
    return value >= 0 && value <= 100;
  }
  
  // Para desconto fixo, se tivermos subtotal, validamos
  if (subtotal !== undefined) {
    return value <= subtotal;
  }
  
  return value >= 0;
}


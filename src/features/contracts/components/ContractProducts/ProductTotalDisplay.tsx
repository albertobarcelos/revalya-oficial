/**
 * AIDEV-NOTE: Componente para exibição do total calculado do produto
 * Mostra subtotal, desconto e total final
 * 
 * @module features/contracts/components/ContractProducts/ProductTotalDisplay
 */

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import type { DiscountData } from '../../types';
import { calculateDiscount, calculateSubtotal } from '../../utils';

interface ProductTotalDisplayProps {
  /** Valor unitário */
  unitPrice: number;
  /** Quantidade */
  quantity: number;
  /** Dados de desconto */
  discountData: DiscountData;
}

/**
 * Exibe o total calculado do produto com desconto
 */
export function ProductTotalDisplay({ 
  unitPrice, 
  quantity, 
  discountData 
}: ProductTotalDisplayProps) {
  // Calcular valores
  const subtotal = calculateSubtotal(unitPrice, quantity);
  
  let discount = 0;
  if (discountData.discount_type === 'percentage') {
    discount = calculateDiscount(subtotal, 'percentage', discountData.discount_percentage);
  } else {
    discount = calculateDiscount(subtotal, 'fixed', discountData.discount_amount);
  }
  
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="p-3 bg-muted/50 rounded-lg border">
      {/* Linha do total */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">
          Total do Produto:
        </span>
        <span className="text-lg font-semibold text-primary">
          {formatCurrency(total)}
        </span>
      </div>
      
      {/* Linha do desconto (se houver) */}
      {discount > 0 && (
        <div className="flex justify-between items-center mt-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Desconto:</span>
          <span className="text-sm font-medium text-destructive">
            -{formatCurrency(discount)}
          </span>
        </div>
      )}
    </div>
  );
}

export default ProductTotalDisplay;


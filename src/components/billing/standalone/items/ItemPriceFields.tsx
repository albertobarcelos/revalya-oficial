/**
 * AIDEV-NOTE: Campos de quantidade, preço unitário e total do item
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BillingItem } from '@/types/billing/standalone';
import { formatCurrency } from '@/lib/utils';
import { useCurrencyFormatting } from '@/hooks/billing/useStandaloneBillingForm';

interface ItemPriceFieldsProps {
  item: BillingItem;
  index: number;
  priceInputValue?: string;
  discountInputValue?: string; // AIDEV-NOTE: Valor de input de desconto (para formatação)
  onQuantityChange: (quantity: number) => void;
  onPriceChange: (price: number) => void;
  onPriceInputChange: (value: string) => void;
  onPriceFocus: () => void;
  onPriceBlur: (value: string) => void;
  onDiscountChange: (discountPercent: number, discountAmount: number) => void;
  onDiscountInputChange: (value: string) => void;
  onDiscountFocus: () => void;
  onDiscountBlur: (value: string) => void;
  errors?: Record<string, string>;
}

/**
 * Campos de preço do item (quantidade, preço unitário, total)
 */
export function ItemPriceFields({
  item,
  index,
  priceInputValue,
  discountInputValue,
  onQuantityChange,
  onPriceChange,
  onPriceInputChange,
  onPriceFocus,
  onPriceBlur,
  onDiscountChange,
  onDiscountInputChange,
  onDiscountFocus,
  onDiscountBlur,
  errors = {},
}: ItemPriceFieldsProps) {
  const { parseCurrencyInput, formatCurrencyInput } = useCurrencyFormatting();

  // AIDEV-NOTE: Calcular subtotal (quantidade * preço unitário)
  const subtotal = (item.quantity || 0) * (item.unit_price || 0);
  
  // AIDEV-NOTE: Calcular desconto
  let discountValue = 0;
  if (item.discount_percent && item.discount_percent > 0) {
    discountValue = (subtotal * item.discount_percent) / 100;
  } else if (item.discount_amount && item.discount_amount > 0) {
    discountValue = item.discount_amount;
  }
  
  // AIDEV-NOTE: Calcular total com desconto
  const total = subtotal - discountValue;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Quantidade *</Label>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          value={item.quantity || ''}
          onChange={(e) => {
            onQuantityChange(parseFloat(e.target.value) || 0);
          }}
        />
        {errors[`item_${index}_quantity`] && (
          <p className="text-xs text-red-500">{errors[`item_${index}_quantity`]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Preço Unitário *</Label>
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={priceInputValue !== undefined 
            ? priceInputValue
            : item.unit_price > 0 
              ? formatCurrencyInput(item.unit_price)
              : ''
          }
          onChange={(e) => {
            const inputValue = e.target.value;
            onPriceInputChange(inputValue);
            
            // Parse e atualiza o valor numérico
            const numeric = parseCurrencyInput(inputValue);
            onPriceChange(numeric);
          }}
          onFocus={onPriceFocus}
          onBlur={(e) => {
            onPriceBlur(e.target.value);
          }}
          className="text-center"
        />
        {errors[`item_${index}_price`] && (
          <p className="text-xs text-red-500">{errors[`item_${index}_price`]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Total</Label>
        <Input
          type="text"
          value={formatCurrency(total)}
          disabled
          className="bg-gray-50 text-center"
        />
      </div>
      </div>

      {/* AIDEV-NOTE: Campo de desconto */}
      <div className="space-y-2">
        <Label>Desconto (opcional)</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 10% ou 50,00"
              value={discountInputValue !== undefined 
                ? discountInputValue
                : item.discount_amount && item.discount_amount > 0
                  ? formatCurrencyInput(item.discount_amount)
                  : item.discount_percent && item.discount_percent > 0
                    ? `${item.discount_percent}%`
                    : ''
              }
              onChange={(e) => {
                const inputValue = e.target.value;
                onDiscountInputChange(inputValue);
                
                // AIDEV-NOTE: Verificar se é percentual ou valor fixo
                if (inputValue.trim().endsWith('%')) {
                  const percent = parseFloat(inputValue.replace('%', '').replace(',', '.')) || 0;
                  const discountAmount = subtotal > 0 ? (subtotal * percent) / 100 : 0;
                  onDiscountChange(percent, discountAmount);
                } else {
                  const amount = parseCurrencyInput(inputValue);
                  const percent = subtotal > 0 ? (amount / subtotal) * 100 : 0;
                  onDiscountChange(percent, amount);
                }
              }}
              onFocus={onDiscountFocus}
              onBlur={(e) => {
                onDiscountBlur(e.target.value);
              }}
              className="text-center"
              placeholder="Ex: 10% ou 50,00"
            />
          </div>
        </div>
        {discountValue > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Desconto: {formatCurrency(discountValue)} | Subtotal: {formatCurrency(subtotal)} | Total: {formatCurrency(total)}
          </p>
        )}
        {errors[`item_${index}_discount`] && (
          <p className="text-xs text-red-500">{errors[`item_${index}_discount`]}</p>
        )}
      </div>
    </div>
  );
}

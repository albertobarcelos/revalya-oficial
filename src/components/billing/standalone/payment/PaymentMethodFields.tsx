/**
 * AIDEV-NOTE: Campos de método de pagamento
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BillingItem } from '@/types/billing/standalone';

interface PaymentMethodFieldsProps {
  item: BillingItem;
  index: number;
  onPaymentMethodChange: (method: BillingItem['payment_method']) => void;
  onCardTypeChange: (cardType: BillingItem['card_type']) => void;
  errors?: Record<string, string>;
}

/**
 * Campos de método de pagamento
 */
export function PaymentMethodFields({
  item,
  index,
  onPaymentMethodChange,
  onCardTypeChange,
  errors = {},
}: PaymentMethodFieldsProps) {
  const handlePaymentMethodChange = (val: string) => {
    const pm = val as BillingItem['payment_method'];
    const updates: Partial<BillingItem> = { payment_method: pm, billing_type: 'Único' };
    
    if (pm !== 'CREDIT_CARD') {
      updates.card_type = undefined as any;
      updates.recurrence_frequency = undefined as any;
      updates.installments = undefined as any;
    } else {
      if (!item.card_type) {
        updates.card_type = 'credit';
      }
    }
    
    onPaymentMethodChange(pm);
  };

  const handleCardTypeChange = (val: string) => {
    const ct = val as BillingItem['card_type'];
    const updates: Partial<BillingItem> = { card_type: ct };
    
    if (ct === 'credit_recurring') {
      updates.billing_type = 'Mensal';
      updates.recurrence_frequency = 'Mensal';
      updates.installments = 1;
    } else if (ct === 'credit') {
      updates.billing_type = 'Único';
      updates.recurrence_frequency = '';
      updates.installments = (item.installments && item.installments > 0) ? item.installments : 2;
    }
    
    onCardTypeChange(ct);
  };

  return (
    <div className="space-y-2">
      <Label>Meio de Pagamento</Label>
      <Select
        value={item.payment_method || ''}
        onValueChange={handlePaymentMethodChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
          <SelectItem value="PIX">PIX</SelectItem>
          <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
          <SelectItem value="CASH">Dinheiro</SelectItem>
        </SelectContent>
      </Select>
      {errors[`item_${index}_payment_method`] && (
        <p className="text-xs text-red-500">{errors[`item_${index}_payment_method`]}</p>
      )}

      {item.payment_method === 'CREDIT_CARD' && (
        <div className="space-y-2">
          <Label>Tipo de Cartão</Label>
          <Select
            value={item.card_type || ''}
            onValueChange={handleCardTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="credit">Crédito</SelectItem>
              <SelectItem value="credit_recurring">Crédito Recorrente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

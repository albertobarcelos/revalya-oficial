/**
 * AIDEV-NOTE: Campos de tipo de faturamento, frequência e parcelas
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BillingItem } from '@/types/billing/standalone';
import {
  shouldShowRecurrenceFrequency,
  shouldShowInstallments,
  isBillingTypeDisabled,
  getBillingTypePlaceholder,
} from '@/utils/billing/standalone/paymentRules';

interface BillingTypeFieldsProps {
  item: BillingItem;
  onBillingTypeChange: (billingType: BillingItem['billing_type']) => void;
  onRecurrenceFrequencyChange: (frequency: string) => void;
  onInstallmentsChange: (installments: number) => void;
}

/**
 * Campos de tipo de faturamento, frequência e parcelas
 */
export function BillingTypeFields({
  item,
  onBillingTypeChange,
  onRecurrenceFrequencyChange,
  onInstallmentsChange,
}: BillingTypeFieldsProps) {
  const handleBillingTypeChange = (val: string) => {
    const bt = val as BillingItem['billing_type'];
    const updates: Partial<BillingItem> = { billing_type: bt };
    
    if (item.payment_method === 'BOLETO' && ['Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(bt)) {
      updates.recurrence_frequency = bt;
    } else if (['Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(bt)) {
      updates.recurrence_frequency = undefined as any;
    } else if (bt === 'Único') {
      updates.recurrence_frequency = '';
    }
    
    onBillingTypeChange(bt);
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Tipo de Faturamento</Label>
        <Select
          value={item.billing_type || ''}
          onValueChange={handleBillingTypeChange}
          disabled={isBillingTypeDisabled(item)}
        >
          <SelectTrigger className={isBillingTypeDisabled(item) ? 'opacity-50' : ''}>
            <SelectValue placeholder={getBillingTypePlaceholder(item)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Único">Único</SelectItem>
            <SelectItem value="Mensal">Mensal</SelectItem>
            <SelectItem value="Trimestral">Trimestral</SelectItem>
            <SelectItem value="Semestral">Semestral</SelectItem>
            <SelectItem value="Anual">Anual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {shouldShowRecurrenceFrequency(item) && (
        <div className="space-y-2">
          <Label>Frequência de Cobrança</Label>
          <Select
            value={item.recurrence_frequency || ''}
            onValueChange={onRecurrenceFrequencyChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a frequência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mensal">Mensal</SelectItem>
              <SelectItem value="Trimestral">Trimestral</SelectItem>
              <SelectItem value="Semestral">Semestral</SelectItem>
              <SelectItem value="Anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {shouldShowInstallments(item) && (
        <div className="space-y-2">
          <Label>Número de Parcelas</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={item.installments || ''}
            onChange={(e) => onInstallmentsChange(parseInt(e.target.value) || 0)}
            placeholder="Ex: 3"
          />
        </div>
      )}
    </>
  );
}

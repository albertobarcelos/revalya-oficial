/**
 * AIDEV-NOTE: Card de associação de pagamento por item
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PaymentMethodFields } from './PaymentMethodFields';
import { BillingTypeFields } from './BillingTypeFields';
import { DueDateField } from './DueDateField';
import { formatCurrency } from '@/lib/utils';
import { getItemDisplayName } from '@/utils/billing/standalone/billingItemHelpers';
import type { BillingItem } from '@/types/billing/standalone';

interface PaymentAssociationCardProps {
  item: BillingItem;
  index: number;
  billDate: Date;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<BillingItem>) => void;
  errors?: Record<string, string>;
}

/**
 * Card de associação de pagamento por item
 */
export function PaymentAssociationCard({
  item,
  index,
  billDate,
  isOpen,
  onToggle,
  onUpdate,
  errors = {},
}: PaymentAssociationCardProps) {
  const handleToggle = () => {
    onToggle();
    if (!isOpen) {
      onUpdate({ billing_type: 'Único' });
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {getItemDisplayName(item, index)}
          </span>
          <span className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleToggle}
        >
          Associar Pagamento
        </Button>
      </div>

      {isOpen && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={item.description || ''}
                onChange={(e) => onUpdate({ description: e.target.value })}
                rows={1}
                placeholder="Descrição do pagamento do item"
              />
            </div>

            <PaymentMethodFields
              item={item}
              index={index}
              onPaymentMethodChange={(method) => {
                const updates: Partial<BillingItem> = { payment_method: method, billing_type: 'Único' };
                if (method !== 'CREDIT_CARD') {
                  updates.card_type = undefined as any;
                  updates.recurrence_frequency = undefined as any;
                  updates.installments = undefined as any;
                } else {
                  if (!item.card_type) {
                    updates.card_type = 'credit';
                  }
                }
                onUpdate(updates);
              }}
              onCardTypeChange={(cardType) => {
                const updates: Partial<BillingItem> = { card_type: cardType };
                if (cardType === 'credit_recurring') {
                  updates.billing_type = 'Mensal';
                  updates.recurrence_frequency = 'Mensal';
                  updates.installments = 1;
                } else if (cardType === 'credit') {
                  updates.billing_type = 'Único';
                  updates.recurrence_frequency = '';
                  updates.installments = (item.installments && item.installments > 0) ? item.installments : 2;
                }
                onUpdate(updates);
              }}
              errors={errors}
            />

            <DueDateField
              value={item.item_due_date}
              minDate={billDate}
              onChange={(date) => onUpdate({ item_due_date: date })}
              error={errors[`item_${index}_due_date`]}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-3">
            <BillingTypeFields
              item={item}
              onBillingTypeChange={(billingType) => {
                const updates: Partial<BillingItem> = { billing_type: billingType };
                if (item.payment_method === 'BOLETO' && ['Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(billingType || '')) {
                  updates.recurrence_frequency = billingType;
                } else if (['Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(billingType || '')) {
                  updates.recurrence_frequency = undefined as any;
                } else if (billingType === 'Único') {
                  updates.recurrence_frequency = '';
                }
                onUpdate(updates);
              }}
              onRecurrenceFrequencyChange={(frequency) => {
                onUpdate({ recurrence_frequency: frequency });
              }}
              onInstallmentsChange={(installments) => {
                onUpdate({ installments });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

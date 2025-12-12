/**
 * AIDEV-NOTE: Step de pagamento
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { PaymentAssociationCard } from '../payment/PaymentAssociationCard';
import type { BillingItem } from '@/types/billing/standalone';

interface PaymentStepProps {
  billDate: Date;
  items: BillingItem[];
  assocOpen: Record<string, boolean>;
  onBillDateChange: (date: Date) => void;
  onToggleAssociation: (itemId: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<BillingItem>) => void;
  errors?: Record<string, string>;
}

/**
 * Step de pagamento
 */
export function PaymentStep({
  billDate,
  items,
  assocOpen,
  onBillDateChange,
  onToggleAssociation,
  onUpdateItem,
  errors = {},
}: PaymentStepProps) {
  return (
    <motion.div
      key="payment"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label>Data de Faturamento *</Label>
        <DatePicker
          date={billDate}
          setDate={onBillDateChange}
        />
        {errors.billDate && (
          <p className="text-sm text-red-500">{errors.billDate}</p>
        )}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>
        ) : (
          items.map((item, index) => (
            <PaymentAssociationCard
              key={item.id}
              item={item}
              index={index}
              billDate={billDate}
              isOpen={assocOpen[item.id] || false}
              onToggle={() => onToggleAssociation(item.id)}
              onUpdate={(updates) => onUpdateItem(item.id, updates)}
              errors={errors}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}

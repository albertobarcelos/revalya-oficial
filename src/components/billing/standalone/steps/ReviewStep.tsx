/**
 * AIDEV-NOTE: Step de revisão (resumo final)
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { getItemDisplayName } from '@/utils/billing/standalone/billingItemHelpers';
import { PAYMENT_METHOD_LABELS, CARD_TYPE_LABELS } from '@/utils/billing/standalone/paymentRules';
import type { BillingItem } from '@/types/billing/standalone';
import type { Customer } from '@/hooks/useCustomers';

interface ReviewStepProps {
  selectedCustomer: Customer | null;
  items: BillingItem[];
  billDate: Date;
  dueDate: Date;
  paymentMethod: string;
  totalAmount: number;
}

/**
 * Step de revisão
 */
export function ReviewStep({
  selectedCustomer,
  items,
  billDate,
  dueDate,
  paymentMethod,
  totalAmount,
}: ReviewStepProps) {
  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Cliente</h3>
          <p>{selectedCustomer?.name}</p>
          {selectedCustomer?.company && (
            <p className="text-sm text-gray-600">{selectedCustomer.company}</p>
          )}
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Itens</h3>
          <div className="space-y-2">
            {items.map((item, index) => {
              const subtotal = (item.quantity || 0) * (item.unit_price || 0);
              let discount = 0;
              if (item.discount_percent && item.discount_percent > 0) {
                discount = (subtotal * item.discount_percent) / 100;
              } else if (item.discount_amount && item.discount_amount > 0) {
                discount = item.discount_amount;
              }
              const total = subtotal - discount;
              
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>
                      {index + 1}. {getItemDisplayName(item, index)}
                      {' '}({item.quantity}x {formatCurrency(item.unit_price)})
                    </span>
                    <span className="font-medium">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground pl-4">
                      <span>Subtotal: {formatCurrency(subtotal)}</span>
                      <span className="text-red-600">
                        Desconto: {item.discount_percent ? `${item.discount_percent}%` : formatCurrency(item.discount_amount || 0)} ({formatCurrency(discount)})
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between font-bold">
            <span>Total:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Pagamento</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Data de Faturamento:</span> {format(billDate, 'dd/MM/yyyy')}</p>
            {items.map((item, index) => {
              const itemName = getItemDisplayName(item, index);
              const methodKey = item.payment_method ?? paymentMethod;
              const due = item.item_due_date || dueDate;
              const installments = item.installments;
              const billing = item.billing_type || 'Único';
              const frequency = item.recurrence_frequency || '';
              
              return (
                <div key={item.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="font-medium">{itemName}</p>
                  <p><span className="font-medium">Método:</span> {methodKey ? (PAYMENT_METHOD_LABELS[methodKey] ?? String(methodKey)) : '—'}</p>
                  {item.payment_method === 'CREDIT_CARD' && (
                    <p><span className="font-medium">Tipo de Cartão:</span> {item.card_type ? (CARD_TYPE_LABELS[item.card_type] || item.card_type) : '—'}</p>
                  )}
                  <p><span className="font-medium">Tipo de Faturamento:</span> {billing}</p>
                  {frequency && (
                    <p><span className="font-medium">Frequência:</span> {frequency}</p>
                  )}
                  {installments && installments > 0 && (
                    <p><span className="font-medium">Parcelas:</span> {installments}x</p>
                  )}
                  <p><span className="font-medium">Vencimento:</span> {due ? format(due, 'dd/MM/yyyy') : '—'}</p>
                  {item.description && (
                    <p><span className="font-medium">Descrição:</span> {item.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

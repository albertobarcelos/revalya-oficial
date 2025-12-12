/**
 * AIDEV-NOTE: Campo de data de vencimento
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

interface DueDateFieldProps {
  value?: Date;
  minDate: Date;
  onChange: (date: Date | undefined) => void;
  error?: string;
}

/**
 * Campo de data de vencimento
 */
export function DueDateField({
  value,
  minDate,
  onChange,
  error,
}: DueDateFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Data de Vencimento</Label>
      <DatePicker
        date={value}
        setDate={onChange}
        minDate={minDate}
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

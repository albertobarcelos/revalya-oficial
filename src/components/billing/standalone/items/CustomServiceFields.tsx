/**
 * AIDEV-NOTE: Campos de serviço personalizado (digitar manualmente)
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { BillingItem } from '@/types/billing/standalone';

interface CustomServiceFieldsProps {
  item: BillingItem;
  index: number;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  errors?: Record<string, string>;
}

/**
 * Campos de serviço personalizado
 */
export function CustomServiceFields({
  item,
  index,
  onNameChange,
  onDescriptionChange,
  errors = {},
}: CustomServiceFieldsProps) {
  return (
    <>
      <Input
        placeholder="Nome do serviço personalizado *"
        value={item.custom_name || ''}
        onChange={(e) => {
          onNameChange(e.target.value);
        }}
      />
      {errors[`item_${index}_custom_name`] && (
        <p className="text-xs text-red-500">{errors[`item_${index}_custom_name`]}</p>
      )}
      <Textarea
        placeholder="Descrição do serviço personalizado (opcional)"
        value={item.custom_description || ''}
        onChange={(e) => {
          onDescriptionChange(e.target.value);
        }}
        rows={3}
      />
    </>
  );
}

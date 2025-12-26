/**
 * Seção: Informações Adicionais
 * Performance: Memoizado para evitar re-renders desnecessários
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormSectionProps } from '../types/product-form.types';

// AIDEV-NOTE: Componente memoizado para evitar re-renders desnecessários
export const AdditionalInfoSection = React.memo(function AdditionalInfoSection({ formData, onChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="supplier" className="text-sm font-medium">
          Fornecedor
        </Label>
        <Input
          id="supplier"
          name="supplier"
          value={(formData as any).supplier || ''}
          onChange={onChange}
          placeholder="Nome do fornecedor"
          className="mt-1"
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // AIDEV-NOTE: Comparação customizada - só re-renderiza se formData.supplier mudar
  return (
    (prevProps.formData as any).supplier === (nextProps.formData as any).supplier &&
    prevProps.onChange === nextProps.onChange
  );
});


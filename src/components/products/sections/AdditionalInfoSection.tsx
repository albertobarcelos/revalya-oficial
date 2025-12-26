/**
 * Seção: Informações Adicionais
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormSectionProps } from '../types/product-form.types';

export function AdditionalInfoSection({ formData, onChange }: FormSectionProps) {
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
}


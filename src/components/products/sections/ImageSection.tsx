/**
 * Seção: Imagens do Produto
 * Performance: Memoizado para evitar re-renders desnecessários
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormSectionProps } from '../types/product-form.types';

// AIDEV-NOTE: Componente memoizado para evitar re-renders desnecessários
export const ImageSection = React.memo(function ImageSection({ formData, onChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="image_url" className="text-sm font-medium">
          URL da imagem
        </Label>
        <Input
          id="image_url"
          name="image_url"
          value={(formData as any).image_url || ''}
          onChange={onChange}
          placeholder="https://exemplo.com/imagem.jpg"
          className="mt-1"
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // AIDEV-NOTE: Comparação customizada - só re-renderiza se formData.image_url mudar
  return (
    (prevProps.formData as any).image_url === (nextProps.formData as any).image_url &&
    prevProps.onChange === nextProps.onChange
  );
});


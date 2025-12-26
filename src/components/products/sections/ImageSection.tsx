/**
 * Seção: Imagens do Produto
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormSectionProps } from '../types/product-form.types';

export function ImageSection({ formData, onChange }: FormSectionProps) {
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
}


/**
 * Seção: Preços
 * 
 * AIDEV-NOTE: Componente isolado para informações de preços e estoque
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormSectionProps } from '../types/product-form.types';

export function PricesSection({
  formData,
  isEditMode,
  onChange,
}: FormSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="price" className="text-sm font-medium">
          Preço de venda <span className="text-destructive">*</span>
        </Label>
        <Input
          id="price"
          name={isEditMode ? "unit_price" : "price"}
          type="number"
          step="0.01"
          min="0"
          value={isEditMode ? (formData as any).unit_price || '' : (formData as any).price || ''}
          onChange={onChange}
          placeholder="0.00"
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="cost_price" className="text-sm font-medium">
          Preço de custo
        </Label>
        <Input
          id="cost_price"
          name="cost_price"
          type="number"
          step="0.01"
          min="0"
          value={formData.cost_price || ''}
          onChange={onChange}
          placeholder="0.00"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="stock_quantity" className="text-sm font-medium">
          Quantidade em estoque
        </Label>
        <Input
          id="stock_quantity"
          name="stock_quantity"
          type="number"
          min="0"
          value={formData.stock_quantity || ''}
          onChange={onChange}
          placeholder="0"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="min_stock" className="text-sm font-medium">
          Estoque mínimo
        </Label>
        <Input
          id="min_stock"
          name={isEditMode ? "min_stock_quantity" : "min_stock"}
          type="number"
          min="0"
          value={isEditMode ? (formData as any).min_stock_quantity || '' : (formData as any).min_stock || ''}
          onChange={onChange}
          placeholder="0"
          className="mt-1"
        />
      </div>
    </div>
  );
}


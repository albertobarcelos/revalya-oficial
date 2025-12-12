/**
 * AIDEV-NOTE: Campos específicos de produto
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductSearchInput } from '@/components/products/ProductSearchInput';
import type { BillingItem } from '@/types/billing/standalone';
import type { Product } from '@/hooks/useSecureProducts';
import type { StorageLocation } from '@/hooks/useStorageLocations';

interface ProductItemFieldsProps {
  item: BillingItem;
  locations: StorageLocation[];
  onProductChange: (productId: string | null, product: Product | null) => void;
  onStorageLocationChange: (locationId: string) => void;
  onPriceUpdate?: (price: number) => void;
}

/**
 * Campos específicos para item de produto
 */
export function ProductItemFields({
  item,
  locations,
  onProductChange,
  onStorageLocationChange,
  onPriceUpdate,
}: ProductItemFieldsProps) {
  const handleProductChange = (productId: string | null, product: Product | null) => {
    const newPrice = product?.unit_price ?? 0;
    onProductChange(productId, product);
    
    // AIDEV-NOTE: Atualizar preço se fornecido callback
    if (onPriceUpdate && newPrice > 0) {
      onPriceUpdate(newPrice);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Produto</Label>
        <ProductSearchInput
          value={item.product_id || ''}
          onValueChange={handleProductChange}
          placeholder="Buscar produto..."
        />
      </div>

      {item.product_id && (
        <div className="space-y-2">
          <Label>Local de Estoque</Label>
          <Select
            value={item.storage_location_id || ''}
            onValueChange={onStorageLocationChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um local" />
            </SelectTrigger>
            <SelectContent>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}

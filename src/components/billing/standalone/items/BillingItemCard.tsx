/**
 * AIDEV-NOTE: Card individual de item de faturamento
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { BillingItem } from '@/types/billing/standalone';
import { ProductItemFields } from './ProductItemFields';
import { ServiceItemFields } from './ServiceItemFields';
import { ItemPriceFields } from './ItemPriceFields';
import { BillingItemDescription } from './BillingItemDescription';
import type { Product } from '@/hooks/useSecureProducts';
import type { Service } from '@/hooks/useServices';
import type { StorageLocation } from '@/hooks/useStorageLocations';
import { useCurrencyFormatting } from '@/hooks/billing/useStandaloneBillingForm';

interface BillingItemCardProps {
  item: BillingItem;
  index: number;
  locations: StorageLocation[];
  products: Product[];
  priceInputValue?: string;
  discountInputValue?: string; // AIDEV-NOTE: Valor de input de desconto
  onRemove: () => void;
  onUpdate: (updates: Partial<BillingItem>) => void;
  onPriceInputChange: (value: string) => void;
  onPriceInputFocus: () => void;
  onPriceInputBlur: (value: string) => void;
  onDiscountInputChange: (value: string) => void;
  onDiscountInputFocus: () => void;
  onDiscountInputBlur: (value: string) => void;
  errors?: Record<string, string>;
}

/**
 * Card de item de faturamento
 */
export function BillingItemCard({
  item,
  index,
  locations,
  products,
  priceInputValue,
  discountInputValue,
  onRemove,
  onUpdate,
  onPriceInputChange,
  onPriceInputFocus,
  onPriceInputBlur,
  onDiscountInputChange,
  onDiscountInputFocus,
  onDiscountInputBlur,
  errors = {},
}: BillingItemCardProps) {
  const { formatCurrencyInput, parseCurrencyInput } = useCurrencyFormatting();

  const handleProductChange = (productId: string | null, product: Product | null) => {
    // AIDEV-NOTE: Preencher local de estoque automaticamente
    let defaultStorageLocationId: string | undefined = undefined;
    
    if (locations.length > 0) {
      if (locations.length === 1) {
        // AIDEV-NOTE: Se houver apenas um local, selecionar automaticamente
        defaultStorageLocationId = locations[0].id;
      } else {
        // AIDEV-NOTE: Se houver múltiplos locais, selecionar o primeiro ativo
        // Se não houver nenhum ativo, selecionar o primeiro disponível
        const firstActiveLocation = locations.find(loc => loc.is_active === true);
        defaultStorageLocationId = firstActiveLocation?.id || locations[0]?.id;
      }
    }

    onUpdate({
      product_id: productId || undefined,
      product: product || undefined,
      service_id: undefined,
      service: undefined,
      unit_price: product?.unit_price ?? 0,
      // AIDEV-NOTE: Inicializar descrição com a do cadastro, mas permitir edição posterior
      description: product?.description || undefined,
      // AIDEV-NOTE: Preencher local de estoque automaticamente se houver apenas um ou se houver um padrão
      storage_location_id: defaultStorageLocationId,
    });
    
    // AIDEV-NOTE: Atualizar valor de input quando preço é definido automaticamente
    if (product?.unit_price && product.unit_price > 0) {
      onPriceInputChange(formatCurrencyInput(product.unit_price));
    }
  };

  const handleServiceChange = (serviceId: string | null, service: Service | null) => {
    const newPrice = (service?.default_price ?? service?.price ?? 0);
    onUpdate({
      service_id: serviceId || undefined,
      service: service || undefined,
      product_id: undefined,
      product: undefined,
      is_custom: false,
      custom_name: undefined as any,
      custom_description: undefined as any,
      unit_price: newPrice,
      // AIDEV-NOTE: Inicializar descrição com a do cadastro, mas permitir edição posterior
      description: service?.description || undefined,
    });
    
    // AIDEV-NOTE: Atualizar valor de input quando preço é definido automaticamente
    if (newPrice > 0) {
      onPriceInputChange(formatCurrencyInput(newPrice));
    }
  };

  const handleCustomToggle = () => {
    if (item.is_custom) {
      // Voltar para busca de serviço
      onUpdate({
        is_custom: false,
        custom_name: undefined as any,
        custom_description: undefined as any,
        service_id: undefined as any,
        service: undefined as any,
        unit_price: 0,
      });
      onPriceInputChange('');
    } else {
      // Ir para modo custom
      onUpdate({
        is_custom: true,
        service_id: undefined as any,
        service: undefined as any,
        custom_name: '',
        custom_description: '',
        unit_price: 0,
      });
      onPriceInputChange('');
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Item {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {item.kind === 'product' && (
          <ProductItemFields
            item={item}
            locations={locations}
            onProductChange={handleProductChange}
            onStorageLocationChange={(locationId) => {
              onUpdate({ storage_location_id: locationId || undefined });
            }}
            onPriceUpdate={(price) => {
              onUpdate({ unit_price: price });
              onPriceInputChange(formatCurrencyInput(price));
            }}
          />
        )}

        {item.kind === 'service' && (
          <ServiceItemFields
            item={item}
            index={index}
            onServiceChange={handleServiceChange}
            onCustomToggle={handleCustomToggle}
            onCustomNameChange={(name) => {
              onUpdate({ custom_name: name });
            }}
            onCustomDescriptionChange={(description) => {
              onUpdate({ custom_description: description });
            }}
            onPriceUpdate={(price) => {
              onUpdate({ unit_price: price });
              onPriceInputChange(formatCurrencyInput(price));
            }}
            errors={errors}
          />
        )}
      </div>

      {/* AIDEV-NOTE: Campo de descrição para produtos e serviços (não aparece para serviços personalizados) */}
      <BillingItemDescription
        item={item}
        onDescriptionChange={(description) => {
          onUpdate({ description });
        }}
      />

      <ItemPriceFields
        item={item}
        index={index}
        priceInputValue={priceInputValue}
        discountInputValue={discountInputValue}
        onQuantityChange={(quantity) => {
          // AIDEV-NOTE: Recalcular desconto quando quantidade muda
          const updates: Partial<BillingItem> = { quantity };
          if (item.discount_percent && item.discount_percent > 0) {
            const newSubtotal = quantity * (item.unit_price || 0);
            updates.discount_amount = (newSubtotal * item.discount_percent) / 100;
          }
          onUpdate(updates);
        }}
        onPriceChange={(price) => {
          // AIDEV-NOTE: Recalcular desconto quando preço muda
          const updates: Partial<BillingItem> = { unit_price: price };
          if (item.discount_percent && item.discount_percent > 0) {
            const newSubtotal = (item.quantity || 0) * price;
            updates.discount_amount = (newSubtotal * item.discount_percent) / 100;
          }
          onUpdate(updates);
        }}
        onPriceInputChange={onPriceInputChange}
        onPriceFocus={onPriceInputFocus}
        onPriceBlur={onPriceInputBlur}
        onDiscountChange={(discountPercent, discountAmount) => {
          onUpdate({ 
            discount_percent: discountPercent > 0 ? discountPercent : undefined,
            discount_amount: discountAmount > 0 ? discountAmount : undefined,
          });
        }}
        onDiscountInputChange={onDiscountInputChange}
        onDiscountFocus={onDiscountInputFocus}
        onDiscountBlur={onDiscountInputBlur}
        errors={errors}
      />
    </div>
  );
}

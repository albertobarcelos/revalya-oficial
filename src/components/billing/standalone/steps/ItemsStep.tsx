/**
 * AIDEV-NOTE: Step de itens (produtos/serviços)
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { BillingItemCard } from '../items/BillingItemCard';
import { AddItemChooserModal } from '../shared/AddItemChooserModal';
import { formatCurrency } from '@/lib/utils';
import type { BillingItem } from '@/types/billing/standalone';
import type { Product } from '@/hooks/useSecureProducts';
import type { StorageLocation } from '@/hooks/useStorageLocations';

interface ItemsStepProps {
  items: BillingItem[];
  products: Product[];
  locations: StorageLocation[];
  priceInputValues: Record<string, string>;
  discountInputValues: Record<string, string>;
  showAddItemChooser: boolean;
  totalAmount: number;
  onShowAddItemChooser: (show: boolean) => void;
  onAddItem: (kind: 'product' | 'service') => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<BillingItem>) => void;
  onPriceInputChange: (itemId: string, value: string) => void;
  onPriceInputFocus: (itemId: string) => void;
  onPriceInputBlur: (itemId: string, value: string) => void;
  onDiscountInputChange: (itemId: string, value: string) => void;
  onDiscountInputFocus: (itemId: string) => void;
  onDiscountInputBlur: (itemId: string, value: string) => void;
  errors?: Record<string, string>;
}

/**
 * Step de itens
 */
export function ItemsStep({
  items,
  products,
  locations,
  priceInputValues,
  discountInputValues,
  showAddItemChooser,
  totalAmount,
  onShowAddItemChooser,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onPriceInputChange,
  onPriceInputFocus,
  onPriceInputBlur,
  onDiscountInputChange,
  onDiscountInputFocus,
  onDiscountInputBlur,
  errors = {},
}: ItemsStepProps) {
  return (
    <motion.div
      key="items"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <Label>Produtos/Serviços *</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onShowAddItemChooser(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
      </div>

      {errors.items && (
        <p className="text-sm text-red-500">{errors.items}</p>
      )}

      <div className="space-y-4">
        {items.map((item, index) => (
          <BillingItemCard
            key={item.id}
            item={item}
            index={index}
            locations={locations}
            products={products}
            priceInputValue={priceInputValues[item.id]}
            discountInputValue={discountInputValues[item.id]}
            onRemove={() => onRemoveItem(item.id)}
            onUpdate={(updates) => onUpdateItem(item.id, updates)}
            onPriceInputChange={(value) => onPriceInputChange(item.id, value)}
            onPriceInputFocus={() => onPriceInputFocus(item.id)}
            onPriceInputBlur={(value) => onPriceInputBlur(item.id, value)}
            onDiscountInputChange={(value) => onDiscountInputChange(item.id, value)}
            onDiscountInputFocus={() => onDiscountInputFocus(item.id)}
            onDiscountInputBlur={(value) => onDiscountInputBlur(item.id, value)}
            errors={errors}
          />
        ))}
      </div>

      {items.length > 0 && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total:</span>
            <span className="text-xl font-bold">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      )}

      <AddItemChooserModal
        open={showAddItemChooser}
        onOpenChange={onShowAddItemChooser}
        onSelectProduct={() => onAddItem('product')}
        onSelectService={() => onAddItem('service')}
      />
    </motion.div>
  );
}

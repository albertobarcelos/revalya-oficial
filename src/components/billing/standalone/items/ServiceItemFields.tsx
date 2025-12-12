/**
 * AIDEV-NOTE: Campos específicos de serviço
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ServiceSearchInput } from '@/components/services/ServiceSearchInput';
import { CustomServiceFields } from './CustomServiceFields';
import type { BillingItem } from '@/types/billing/standalone';
import type { Service } from '@/hooks/useServices';

interface ServiceItemFieldsProps {
  item: BillingItem;
  index: number;
  onServiceChange: (serviceId: string | null, service: Service | null) => void;
  onCustomToggle: () => void;
  onCustomNameChange: (name: string) => void;
  onCustomDescriptionChange: (description: string) => void;
  onPriceUpdate?: (price: number) => void;
  errors?: Record<string, string>;
}

/**
 * Campos específicos para item de serviço
 */
export function ServiceItemFields({
  item,
  index,
  onServiceChange,
  onCustomToggle,
  onCustomNameChange,
  onCustomDescriptionChange,
  onPriceUpdate,
  errors = {},
}: ServiceItemFieldsProps) {
  const handleServiceChange = (serviceId: string | null, service: Service | null) => {
    const newPrice = (service?.default_price ?? service?.price ?? 0);
    onServiceChange(serviceId, service);
    
    // AIDEV-NOTE: Atualizar preço se fornecido callback
    if (onPriceUpdate && newPrice > 0) {
      onPriceUpdate(newPrice);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Serviço</Label>
        {!item.is_custom && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCustomToggle}
            className="text-xs text-primary hover:text-primary/80"
          >
            Digitar manualmente
          </Button>
        )}
        {item.is_custom && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCustomToggle}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Buscar serviço
          </Button>
        )}
      </div>
      
      {item.is_custom ? (
        <CustomServiceFields
          item={item}
          index={index}
          onNameChange={onCustomNameChange}
          onDescriptionChange={onCustomDescriptionChange}
          errors={errors}
        />
      ) : (
        <ServiceSearchInput
          value={item.service_id || ''}
          onValueChange={handleServiceChange}
          placeholder="Buscar serviço..."
        />
      )}
    </div>
  );
}

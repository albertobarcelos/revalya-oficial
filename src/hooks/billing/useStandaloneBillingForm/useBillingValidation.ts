/**
 * AIDEV-NOTE: Hook para validação do formulário de faturamento avulso
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import { useCallback } from 'react';
import type { StandaloneBillingStep, BillingItem, BillingFormErrors } from '@/types/billing/standalone';
import type { Product } from '@/hooks/useSecureProducts';

interface UseBillingValidationParams {
  selectedCustomerId: string;
  items: BillingItem[];
  billDate: Date;
  dueDate: Date;
  paymentMethod: string;
  products: Product[];
  assocOpen: Record<string, boolean>;
}

// AIDEV-NOTE: Exportar tipo para uso externo
export type { UseBillingValidationParams };

/**
 * Hook para validação do formulário de faturamento avulso
 */
export function useBillingValidation({
  selectedCustomerId,
  items,
  billDate,
  dueDate,
  paymentMethod,
  products,
  assocOpen,
}: UseBillingValidationParams) {
  /**
   * AIDEV-NOTE: Validar step atual
   */
  const validateStep = useCallback((step: StandaloneBillingStep): BillingFormErrors => {
    const newErrors: BillingFormErrors = {};

    if (step === 'customer') {
      if (!selectedCustomerId) {
        newErrors.customer = 'Cliente é obrigatório';
      }
    }

    if (step === 'items') {
      if (items.length === 0) {
        newErrors.items = 'Adicione pelo menos um item (produto ou serviço)';
      }
      items.forEach((item, index) => {
        // AIDEV-NOTE: Validação atualizada para aceitar serviços personalizados
        if (!item.product_id && !item.service_id && !item.is_custom) {
          newErrors[`item_${index}_type`] = 'Selecione um produto ou serviço, ou digite manualmente';
        }
        // AIDEV-NOTE: Validar nome para serviços personalizados
        if (item.is_custom && !item.custom_name?.trim()) {
          newErrors[`item_${index}_custom_name`] = 'Nome do serviço personalizado é obrigatório';
        }
        if (item.quantity <= 0) {
          newErrors[`item_${index}_quantity`] = 'Quantidade deve ser maior que zero';
        }
        if (item.unit_price < 0) {
          newErrors[`item_${index}_price`] = 'Preço deve ser maior ou igual a zero';
        }
        // Validar estoque para produtos
        if (item.product_id && item.storage_location_id) {
          const product = products.find(p => p.id === item.product_id);
          // Validação de estoque será feita no backend
        }
      });
    }

    if (step === 'payment') {
      if (!billDate) {
        newErrors.billDate = 'Data de faturamento é obrigatória';
      }
      // Validação leve opcional por item quando associação aberta
      items.forEach((item, index) => {
        if (assocOpen[item.id]) {
          if (!item.payment_method) {
            newErrors[`item_${index}_payment_method`] = 'Meio de pagamento é obrigatório';
          }
          if (!item.item_due_date) {
            newErrors[`item_${index}_due_date`] = 'Data de vencimento do item é obrigatória';
          }
        }
      });
    }

    return newErrors;
  }, [selectedCustomerId, items, billDate, dueDate, paymentMethod, products, assocOpen]);

  /**
   * AIDEV-NOTE: Verificar se step é válido (sem erros)
   */
  const isStepValid = useCallback((step: StandaloneBillingStep): boolean => {
    const errors = validateStep(step);
    return Object.keys(errors).length === 0;
  }, [validateStep]);

  return {
    validateStep,
    isStepValid,
  };
}

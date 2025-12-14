/**
 * AIDEV-NOTE: Hook para gerenciamento de itens de faturamento
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import { useState, useCallback, useMemo } from 'react';
import type { BillingItem } from '@/types/billing/standalone';
import { formatCurrency } from '@/lib/utils';

/**
 * Hook para gerenciar itens de faturamento
 */
export function useBillingItems() {
  const [items, setItems] = useState<BillingItem[]>([]);
  const [priceInputValues, setPriceInputValues] = useState<Record<string, string>>({});
  const [discountInputValues, setDiscountInputValues] = useState<Record<string, string>>({});

  /**
   * AIDEV-NOTE: Calcular total de todos os itens considerando desconto
   */
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const subtotal = (item.quantity || 0) * (item.unit_price || 0);
      let discount = 0;
      
      // AIDEV-NOTE: Calcular desconto (percentual ou valor fixo)
      if (item.discount_percent && item.discount_percent > 0) {
        discount = (subtotal * item.discount_percent) / 100;
      } else if (item.discount_amount && item.discount_amount > 0) {
        discount = item.discount_amount;
      }
      
      return sum + (subtotal - discount);
    }, 0);
  }, [items]);

  /**
   * AIDEV-NOTE: Adicionar item ao faturamento
   */
  const addItem = useCallback((kind: 'product' | 'service') => {
    setItems(prev => [...prev, {
      id: `temp-${Date.now()}`,
      quantity: 1,
      unit_price: 0,
      kind
    }]);
  }, []);

  /**
   * AIDEV-NOTE: Remover item do faturamento
   */
  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    // Limpar valor de input quando item é removido
    setPriceInputValues(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
    setDiscountInputValues(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  }, []);

  /**
   * AIDEV-NOTE: Atualizar item específico
   */
  const updateItem = useCallback((itemId: string, updates: Partial<BillingItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, ...updates };
      }
      return item;
    }));
  }, []);

  /**
   * AIDEV-NOTE: Limpar todos os itens
   */
  const clearItems = useCallback(() => {
    setItems([]);
    setPriceInputValues({});
    setDiscountInputValues({});
  }, []);

  /**
   * AIDEV-NOTE: Atualizar valor de input de preço (formatação durante digitação)
   */
  const setPriceInputValue = useCallback((itemId: string, value: string) => {
    setPriceInputValues(prev => ({
      ...prev,
      [itemId]: value
    }));
  }, []);

  /**
   * AIDEV-NOTE: Remover valor de input de preço
   */
  const removePriceInputValue = useCallback((itemId: string) => {
    setPriceInputValues(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  }, []);

  /**
   * AIDEV-NOTE: Atualizar valor de input de desconto (formatação durante digitação)
   */
  const setDiscountInputValue = useCallback((itemId: string, value: string) => {
    setDiscountInputValues(prev => ({
      ...prev,
      [itemId]: value
    }));
  }, []);

  /**
   * AIDEV-NOTE: Remover valor de input de desconto
   */
  const removeDiscountInputValue = useCallback((itemId: string) => {
    setDiscountInputValues(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  }, []);

  return {
    items,
    priceInputValues,
    discountInputValues,
    totalAmount,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    setPriceInputValue,
    removePriceInputValue,
    setDiscountInputValue,
    removeDiscountInputValue,
    setItems, // AIDEV-NOTE: Exposto para reset completo
    setPriceInputValues, // AIDEV-NOTE: Exposto para reset completo
    setDiscountInputValues, // AIDEV-NOTE: Exposto para reset completo
  };
}

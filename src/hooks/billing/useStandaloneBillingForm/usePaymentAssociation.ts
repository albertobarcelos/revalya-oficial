/**
 * AIDEV-NOTE: Hook para gerenciamento de associação de pagamento por item
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar associação de pagamento por item
 */
export function usePaymentAssociation() {
  const [assocOpen, setAssocOpen] = useState<Record<string, boolean>>({});

  /**
   * AIDEV-NOTE: Alternar estado de associação de pagamento para um item
   */
  const toggleAssociation = useCallback((itemId: string) => {
    setAssocOpen(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  /**
   * AIDEV-NOTE: Abrir associação de pagamento para um item
   */
  const openAssociation = useCallback((itemId: string) => {
    setAssocOpen(prev => ({ ...prev, [itemId]: true }));
  }, []);

  /**
   * AIDEV-NOTE: Fechar associação de pagamento para um item
   */
  const closeAssociation = useCallback((itemId: string) => {
    setAssocOpen(prev => ({ ...prev, [itemId]: false }));
  }, []);

  /**
   * AIDEV-NOTE: Verificar se associação está aberta para um item
   */
  const isAssociationOpen = useCallback((itemId: string): boolean => {
    return assocOpen[itemId] || false;
  }, [assocOpen]);

  /**
   * AIDEV-NOTE: Limpar todas as associações
   */
  const clearAll = useCallback(() => {
    setAssocOpen({});
  }, []);

  return {
    assocOpen,
    toggleAssociation,
    openAssociation,
    closeAssociation,
    isAssociationOpen,
    clearAll,
    setAssocOpen, // AIDEV-NOTE: Exposto para reset completo
  };
}

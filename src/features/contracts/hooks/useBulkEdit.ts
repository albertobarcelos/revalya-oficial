/**
 * AIDEV-NOTE: Hook para gerenciar edição em massa de serviços/produtos
 * Centraliza lógica de seleção e aplicação de alterações em massa
 * 
 * @module features/contracts/hooks/useBulkEdit
 */

import { useState, useCallback } from 'react';
import type { SelectedService, BulkEditData } from '../types';
import { DEFAULT_BULK_EDIT_DATA } from '../constants';
import { parseCurrencyInput } from '../utils';

interface UseBulkEditReturn<T> {
  // Estado de seleção
  selectedIds: string[];
  isAllSelected: boolean;
  hasSelection: boolean;
  selectionCount: number;
  
  // Modal
  isModalOpen: boolean;
  bulkEditData: BulkEditData;
  
  // Funções de seleção
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  toggleItem: (id: string) => void;
  selectAll: (items: T[]) => void;
  deselectAll: () => void;
  toggleAll: (items: T[]) => void;
  isSelected: (id: string) => boolean;
  
  // Funções de modal
  openModal: () => void;
  closeModal: () => void;
  setBulkEditData: React.Dispatch<React.SetStateAction<BulkEditData>>;
  resetBulkEditData: () => void;
  
  // Função de aplicação
  applyChanges: (items: T[], getItemId: (item: T) => string) => T[];
}

/**
 * Hook para gerenciar edição em massa de serviços ou produtos
 * 
 * @returns Objeto com estados e funções de controle
 * 
 * @example
 * ```tsx
 * const {
 *   selectedIds,
 *   isModalOpen,
 *   bulkEditData,
 *   selectItem,
 *   toggleAll,
 *   openModal,
 *   applyChanges
 * } = useBulkEdit<SelectedService>();
 * 
 * // Aplicar alterações
 * const handleSave = () => {
 *   const updated = applyChanges(services, s => s.id);
 *   setServices(updated);
 *   closeModal();
 * };
 * ```
 */
export function useBulkEdit<T extends { id: string }>(): UseBulkEditReturn<T> {
  // Estados de seleção
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Estados de modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>(DEFAULT_BULK_EDIT_DATA);

  // === SELEÇÃO ===
  const selectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  const deselectItem = useCallback((id: string) => {
    setSelectedIds(prev => prev.filter(itemId => itemId !== id));
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      }
      return [...prev, id];
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(items.map(item => item.id));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const toggleAll = useCallback((items: T[]) => {
    setSelectedIds(prev => {
      if (prev.length === items.length) {
        return [];
      }
      return items.map(item => item.id);
    });
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  // === MODAL ===
  const openModal = useCallback(() => {
    if (selectedIds.length === 0) return;
    setIsModalOpen(true);
  }, [selectedIds.length]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const resetBulkEditData = useCallback(() => {
    setBulkEditData(DEFAULT_BULK_EDIT_DATA);
  }, []);

  // === APLICAÇÃO DE ALTERAÇÕES ===
  const applyChanges = useCallback((
    items: T[],
    getItemId: (item: T) => string
  ): T[] => {
    return items.map(item => {
      const itemId = getItemId(item);
      
      if (!selectedIds.includes(itemId)) {
        return item;
      }

      // Processar unit_price
      const unitPriceValue = bulkEditData.unit_price;
      const hasUnitPrice = unitPriceValue && unitPriceValue !== '' && unitPriceValue !== '0';
      let parsedUnitPrice = 0;
      
      if (hasUnitPrice) {
        parsedUnitPrice = parseCurrencyInput(unitPriceValue);
      }

      // Construir objeto de alterações
      const changes: Partial<SelectedService> = {};
      
      // Configurações financeiras
      if (bulkEditData.payment_method) {
        changes.payment_method = bulkEditData.payment_method;
      }
      if (bulkEditData.card_type) {
        changes.card_type = bulkEditData.card_type;
      }
      if (bulkEditData.billing_type) {
        changes.billing_type = bulkEditData.billing_type;
      }
      if (bulkEditData.recurrence_frequency) {
        changes.recurrence_frequency = bulkEditData.recurrence_frequency;
      }
      if (bulkEditData.installments > 1) {
        changes.installments = bulkEditData.installments;
      }
      
      // Valor unitário
      if (hasUnitPrice) {
        changes.unit_price = parsedUnitPrice;
        // Recalcular total se houver quantidade
        const currentItem = item as unknown as SelectedService;
        if (currentItem.quantity) {
          changes.total = currentItem.quantity * parsedUnitPrice;
        }
      }
      
      // Configurações de vencimento
      changes.due_type = bulkEditData.due_type;
      if (bulkEditData.due_value !== undefined) {
        changes.due_value = bulkEditData.due_value;
      }
      changes.due_next_month = bulkEditData.due_next_month;
      
      // Geração de faturamento
      if (bulkEditData.generate_billing !== undefined) {
        changes.generate_billing = bulkEditData.generate_billing;
      }

      return {
        ...item,
        ...changes
      };
    });
  }, [selectedIds, bulkEditData]);

  // Valores computados
  const hasSelection = selectedIds.length > 0;
  const selectionCount = selectedIds.length;

  return {
    // Estado de seleção
    selectedIds,
    isAllSelected: false, // Será calculado pelo componente que conhece total de items
    hasSelection,
    selectionCount,
    
    // Modal
    isModalOpen,
    bulkEditData,
    
    // Funções de seleção
    selectItem,
    deselectItem,
    toggleItem,
    selectAll,
    deselectAll,
    toggleAll,
    isSelected,
    
    // Funções de modal
    openModal,
    closeModal,
    setBulkEditData,
    resetBulkEditData,
    
    // Função de aplicação
    applyChanges
  };
}


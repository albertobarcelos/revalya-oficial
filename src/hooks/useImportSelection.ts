import { useState, useEffect } from 'react';
import type { ValidationResultWithCustomer } from './useImportValidation';

/**
 * AIDEV-NOTE: Hook para gerenciar seleção de itens na importação
 * Centraliza a lógica de seleção individual e em massa
 * Agora trabalha com paginação para seleção correta por página
 */
export function useImportSelection(
  validCustomers: ValidationResultWithCustomer[],
  currentPageData: ValidationResultWithCustomer[],
  open: boolean
) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // AIDEV-NOTE: Limpar seleção quando o modal abre
  useEffect(() => {
    if (open) {
      setSelectedItems(new Set());
    }
  }, [open]);

  // AIDEV-NOTE: Função para selecionar/deselecionar todos os itens da página atual
  const handleSelectAllPage = (checked: boolean | 'indeterminate') => {
    const newSelected = new Set(selectedItems);
    const currentPageValidItems = currentPageData.filter(item => item.validation.isValid);
    
    if (checked === true) {
      // Adicionar todos os itens válidos da página atual
      currentPageValidItems.forEach(item => {
        newSelected.add(item.customer.id);
      });
    } else {
      // Remover todos os itens da página atual
      currentPageValidItems.forEach(item => {
        newSelected.delete(item.customer.id);
      });
    }
    setSelectedItems(newSelected);
  };

  // AIDEV-NOTE: Função para selecionar/deselecionar todos os itens válidos globalmente
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedItems(new Set(validCustomers.map(result => result.customer.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (customerId: string, checked: boolean | 'indeterminate') => {
    const newSelected = new Set(selectedItems);
    if (checked === true) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedItems(newSelected);
  };

  // AIDEV-NOTE: Verificar se todos os itens válidos da página atual estão selecionados
  const isAllPageSelected = () => {
    const currentPageValidItems = currentPageData.filter(item => item.validation.isValid);
    return currentPageValidItems.length > 0 && 
           currentPageValidItems.every(item => selectedItems.has(item.customer.id));
  };

  // AIDEV-NOTE: Verificar se alguns itens da página atual estão selecionados (estado indeterminado)
  const isSomePageSelected = () => {
    const currentPageValidItems = currentPageData.filter(item => item.validation.isValid);
    return currentPageValidItems.some(item => selectedItems.has(item.customer.id)) && 
           !isAllPageSelected();
  };

  return {
    selectedItems,
    setSelectedItems,
    handleSelectAll,
    handleSelectAllPage,
    handleSelectItem,
    isAllPageSelected,
    isSomePageSelected
  };
}
import { useState } from 'react';
import type { AsaasCustomer } from '@/types/asaas';

/**
 * AIDEV-NOTE: Hook para gerenciar edição inline na importação
 * Centraliza toda a lógica de edição de campos dos clientes
 */
export function useImportEditing() {
  const [editingCell, setEditingCell] = useState<{customerId: string, field: keyof AsaasCustomer} | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editedData, setEditedData] = useState<Map<string, Partial<AsaasCustomer>>>(new Map());

  // AIDEV-NOTE: Funções para edição inline
  const startEditing = (customerId: string, field: keyof AsaasCustomer, currentValue: string) => {
    setEditingCell({ customerId, field });
    setEditingValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const saveEdit = () => {
    if (!editingCell) return;
    
    const newEditedData = new Map(editedData);
    const existingEdits = newEditedData.get(editingCell.customerId) || {};
    newEditedData.set(editingCell.customerId, {
      ...existingEdits,
      [editingCell.field]: editingValue
    });
    
    setEditedData(newEditedData);
    setEditingCell(null);
    setEditingValue('');
  };

  const getDisplayValue = (customer: AsaasCustomer, field: keyof AsaasCustomer): string => {
    const editedCustomer = editedData.get(customer.id);
    if (editedCustomer && editedCustomer[field] !== undefined) {
      return editedCustomer[field] as string;
    }
    return customer[field] as string || '';
  };

  return {
    editingCell,
    editingValue,
    editedData,
    setEditingValue,
    startEditing,
    cancelEditing,
    saveEdit,
    getDisplayValue
  };
}
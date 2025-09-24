import { useState, useMemo } from 'react';
import type { ValidationResultWithCustomer } from './useImportValidation';

/**
 * AIDEV-NOTE: Hook para gerenciar filtros e busca na importação
 * Centraliza a lógica de filtragem por status e termo de busca
 */
export function useImportFilters(
  validationResults: ValidationResultWithCustomer[],
  validCustomers: ValidationResultWithCustomer[],
  invalidCustomers: ValidationResultWithCustomer[]
) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // AIDEV-NOTE: Filtrar dados baseado no filtro ativo e termo de busca
  const filteredData = useMemo(() => {
    let filtered = validationResults;
    
    if (activeFilter === 'valid') {
      filtered = validCustomers;
    } else if (activeFilter === 'invalid') {
      filtered = invalidCustomers;
    }

    if (searchTerm) {
      filtered = filtered.filter(result => 
        result.customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.customer.cpfCnpj?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [validationResults, activeFilter, searchTerm, validCustomers, invalidCustomers]);

  return {
    activeFilter,
    setActiveFilter,
    searchTerm,
    setSearchTerm,
    filteredData
  };
}
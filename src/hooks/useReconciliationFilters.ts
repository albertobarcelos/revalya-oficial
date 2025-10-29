// =====================================================
// USE RECONCILIATION FILTERS HOOK
// Descrição: Hook customizado para gerenciar filtros de conciliação
// Padrão: Clean Code + React Hooks Best Practices + Performance Optimization
// =====================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  ImportedMovement, 
  ReconciliationFilters,
  ReconciliationIndicators
} from '@/types/reconciliation';

import {
  UseReconciliationFiltersProps,
  UseReconciliationFiltersReturn,
  getInitialFilters,
  RECONCILIATION_MODAL_CONFIG
} from '@/components/reconciliation/types/ReconciliationModalTypes';

// AIDEV-NOTE: Hook customizado para separar responsabilidades de filtros
export const useReconciliationFilters = ({
  movements,
  onFilteredChange,
  onIndicatorsChange,
  onPaginationChange
}: UseReconciliationFiltersProps): UseReconciliationFiltersReturn => {
  
  // Estado dos filtros
  const [filters, setFilters] = useState<ReconciliationFilters>(getInitialFilters);

  // AIDEV-NOTE: Função para calcular indicadores baseados nos dados filtrados
  const calculateIndicators = useCallback((data: ImportedMovement[]): ReconciliationIndicators => {
    const total = data.length;
    const reconciled = data.filter(m => m.reconciliationStatus === 'RECONCILED').length;
    const divergent = data.filter(m => m.reconciliationStatus === 'DIVERGENT').length;
    const pending = data.filter(m => m.reconciliationStatus === 'PENDING').length;
    const cancelled = data.filter(m => m.reconciliationStatus === 'CANCELLED').length;

    const totalAmount = data.reduce((sum, m) => sum + m.amount, 0);
    const reconciledAmount = data
      .filter(m => m.reconciliationStatus === 'RECONCILED')
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      total,
      reconciled,
      divergent,
      pending,
      cancelled,
      totalAmount,
      reconciledAmount,
      reconciledPercentage: total > 0 ? (reconciled / total) * 100 : 0
    };
  }, []);

  // AIDEV-NOTE: Função otimizada para aplicar filtros com performance melhorada
  const applyFilters = useCallback((data: ImportedMovement[], currentFilters: ReconciliationFilters): ImportedMovement[] => {
    // AIDEV-NOTE: Logs removidos para melhorar performance
    
    const filteredData = data.filter(movement => {
      // AIDEV-NOTE: Filtro por status - usando a propriedade correta
      if (currentFilters.status !== 'ALL' && currentFilters.status !== movement.reconciliationStatus) {
        return false;
      }
      
      // AIDEV-NOTE: Filtro por origem - usando a propriedade correta
      if (currentFilters.source !== 'ALL' && currentFilters.source !== movement.source) {
        return false;
      }
      
      // AIDEV-NOTE: Filtro por contrato
      if (currentFilters.hasContract !== 'ALL') {
        if (currentFilters.hasContract === 'WITH_CONTRACT' && !movement.hasContract) {
          return false;
        }
        if (currentFilters.hasContract === 'WITHOUT_CONTRACT' && movement.hasContract) {
          return false;
        }
      }

      // AIDEV-NOTE: Filtro por data - verificar se a data está no range
      if (currentFilters.dateFrom && movement.dueDate) {
        const movementDate = new Date(movement.dueDate);
        const fromDate = new Date(currentFilters.dateFrom);
        if (movementDate < fromDate) {
          return false;
        }
      }

      if (currentFilters.dateTo && movement.dueDate) {
        const movementDate = new Date(movement.dueDate);
        const toDate = new Date(currentFilters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Incluir o dia inteiro
        if (movementDate > toDate) {
          return false;
        }
      }
      
      // AIDEV-NOTE: Filtro por termo de busca - usando múltiplos campos para busca
      if (currentFilters.search && currentFilters.search.length > 0) { // AIDEV-NOTE: Removido trim() para permitir espaços na busca
        const searchLower = currentFilters.search.toLowerCase();
        const matchesSearch = 
          movement.externalId?.toLowerCase().includes(searchLower) ||
          movement.customerName?.toLowerCase().includes(searchLower) ||
          movement.customerDocument?.toLowerCase().includes(searchLower) ||
          movement.description?.toLowerCase().includes(searchLower) ||
          movement.amount.toString().includes(searchLower) ||
          movement.id?.toString().includes(searchLower) ||
          movement.customer_name?.toLowerCase().includes(searchLower) ||
          movement.customer_document?.toLowerCase().includes(searchLower) ||
          movement.external_reference?.toLowerCase().includes(searchLower) ||
          movement.contractNumber?.toLowerCase().includes(searchLower);
          
        if (!matchesSearch) {
          return false;
        }
      }

      // AIDEV-NOTE: Filtro por conta específica
      if (currentFilters.accountFilter && currentFilters.accountFilter.trim()) {
        const accountLower = currentFilters.accountFilter.toLowerCase();
        const matchesAccount = 
          movement.customerName?.toLowerCase().includes(accountLower) ||
          movement.customer_name?.toLowerCase().includes(accountLower) ||
          movement.customerDocument?.toLowerCase().includes(accountLower) ||
          movement.customer_document?.toLowerCase().includes(accountLower);
          
        if (!matchesAccount) {
          return false;
        }
      }

      // AIDEV-NOTE: Filtro por nosso número ASAAS
      if (currentFilters.asaasNossoNumero && currentFilters.asaasNossoNumero.trim()) {
        const nossoNumeroLower = currentFilters.asaasNossoNumero.toLowerCase();
        const matchesNossoNumero = 
          movement.externalId?.toLowerCase().includes(nossoNumeroLower) ||
          movement.external_reference?.toLowerCase().includes(nossoNumeroLower);
          
        if (!matchesNossoNumero) {
          return false;
        }
      }

      return true;
    });
    
    // AIDEV-NOTE: Log removido para melhorar performance
    
    return filteredData;
  }, []);

  // AIDEV-NOTE: Movimentações filtradas com memoização para performance
  const filteredMovements = useMemo(() => {
    return applyFilters(movements, filters);
  }, [movements, filters, applyFilters]);

  // AIDEV-NOTE: Effect para atualizar dados filtrados e indicadores (com debounce otimizado)
  useEffect(() => {
    if (movements.length > 0) {
      // AIDEV-NOTE: Debounce aumentado para reduzir re-renders
      const timeoutId = setTimeout(() => {
        const filtered = filteredMovements;
        const indicators = calculateIndicators(filtered);
        
        onFilteredChange(filtered);
        onIndicatorsChange(indicators);
        
        // AIDEV-NOTE: Resetar paginação quando filtros mudam
        onPaginationChange({ total: filtered.length, page: 1 });
      }, 300); // Aumentado de 100ms para 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [filteredMovements, movements.length, onFilteredChange, onIndicatorsChange, onPaginationChange, calculateIndicators]);

  // AIDEV-NOTE: Função para resetar filtros
  const resetFilters = useCallback(() => {
    setFilters(getInitialFilters());
  }, []);

  // AIDEV-NOTE: Função para atualizar filtros com validação
  const updateFilters = useCallback((newFilters: ReconciliationFilters) => {
    // AIDEV-NOTE: Validação básica dos filtros
    const validatedFilters = {
      ...newFilters,
      search: newFilters.search || '', // AIDEV-NOTE: Removido trim() para permitir espaços na busca
      accountFilter: newFilters.accountFilter?.trim() || '',
      asaasNossoNumero: newFilters.asaasNossoNumero?.trim() || ''
    };
    
    setFilters(validatedFilters);
  }, []);

  return {
    filters,
    filteredMovements,
    updateFilters,
    setFilters: updateFilters,
    applyFilters,
    resetFilters
  };
};
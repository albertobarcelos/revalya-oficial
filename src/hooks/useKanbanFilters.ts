import { useState, useMemo, useCallback } from 'react';
import { format, isToday, isThisWeek, isThisMonth, addMonths, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { KanbanContract, KanbanData } from '@/hooks/useBillingKanban';
import { KanbanFilters } from '@/components/billing/KanbanFilters';

/**
 * AIDEV-NOTE: Hook para gerenciar filtros do Kanban de Faturamento
 * Implementa busca textual e filtros por valor, período e status
 * Retorna dados filtrados e funções de controle
 */
export function useKanbanFilters(kanbanData: KanbanData) {
  // AIDEV-NOTE: Estado dos filtros
  const [filters, setFilters] = useState<KanbanFilters>({
    search: '',
    status: 'all',
    billingType: 'all', // AIDEV-NOTE: Novo filtro para tipo de faturamento
    minValue: '',
    maxValue: '',
    dateRange: 'all',
    client: ''
  });

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // AIDEV-NOTE: Função para alternar expansão dos filtros
  const toggleFiltersExpanded = useCallback(() => {
    setIsFiltersExpanded(prev => !prev);
  }, []);

  // AIDEV-NOTE: Função para aplicar filtros aos contratos
  const applyFilters = useCallback((contracts: KanbanContract[]): KanbanContract[] => {
    return contracts.filter(contract => {
      // AIDEV-NOTE: Filtro de busca textual (cliente, número do contrato, valor)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = 
          contract.customer_name.toLowerCase().includes(searchTerm) ||
          contract.contract_number.toLowerCase().includes(searchTerm) ||
          contract.amount.toString().includes(searchTerm);
        
        if (!matchesSearch) return false;
      }

      // AIDEV-NOTE: Filtro por valor mínimo
      if (filters.minValue) {
        const minValue = parseFloat(filters.minValue);
        if (!isNaN(minValue) && contract.amount < minValue) {
          return false;
        }
      }

      // AIDEV-NOTE: Filtro por valor máximo
      if (filters.maxValue) {
        const maxValue = parseFloat(filters.maxValue);
        if (!isNaN(maxValue) && contract.amount > maxValue) {
          return false;
        }
      }

      // AIDEV-NOTE: Filtro por tipo de faturamento (Avulso ou Por Contrato)
      if (filters.billingType && filters.billingType !== 'all') {
        if (filters.billingType === 'avulso') {
          // AIDEV-NOTE: Faturamento avulso tem contract_id NULL
          if (contract.contract_id !== null) return false;
        } else if (filters.billingType === 'contrato') {
          // AIDEV-NOTE: Faturamento por contrato tem contract_id não NULL
          if (contract.contract_id === null) return false;
        }
      }

      // AIDEV-NOTE: Filtro por período (baseado na data de vencimento)
      if (filters.dateRange && filters.dateRange !== 'all' && contract.bill_date) {
        const dueDate = new Date(contract.bill_date);
        const today = new Date();
        
        switch (filters.dateRange) {
          case 'hoje':
            if (!isToday(dueDate)) return false;
            break;
          case 'esta-semana':
            if (!isThisWeek(dueDate)) return false;
            break;
          case 'este-mes':
            if (!isThisMonth(dueDate)) return false;
            break;
          case 'proximo-mes':
            const nextMonth = addMonths(today, 1);
            if (dueDate.getMonth() !== nextMonth.getMonth() || 
                dueDate.getFullYear() !== nextMonth.getFullYear()) {
              return false;
            }
            break;
          case 'vencidos':
            if (!isBefore(dueDate, startOfDay(today))) return false;
            break;
        }
      }

      return true;
    });
  }, [filters]);

  // AIDEV-NOTE: Dados filtrados calculados de forma otimizada
  const filteredKanbanData = useMemo((): KanbanData => {
    const result: KanbanData = {
      'faturar-hoje': [],
      'pendente': [],
      'faturados': [],
      'renovar': []
    };

    // AIDEV-NOTE: Se há filtro de status específico, aplicar apenas nessa coluna
    if (filters.status && filters.status !== 'all') {
      const columnKey = filters.status as keyof KanbanData;
      if (kanbanData[columnKey]) {
        result[columnKey] = applyFilters(kanbanData[columnKey]);
      }
    } else {
      // AIDEV-NOTE: Aplicar filtros em todas as colunas
      Object.keys(kanbanData).forEach(key => {
        const columnKey = key as keyof KanbanData;
        result[columnKey] = applyFilters(kanbanData[columnKey]);
      });
    }

    return result;
  }, [kanbanData, applyFilters, filters.status]);

  // AIDEV-NOTE: Estatísticas dos filtros
  const filterStats = useMemo(() => {
    const totalContracts = Object.values(kanbanData).reduce(
      (total, contracts) => total + contracts.length, 
      0
    );
    
    const filteredContracts = Object.values(filteredKanbanData).reduce(
      (total, contracts) => total + contracts.length, 
      0
    );

    const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
      if (key === 'status' || key === 'dateRange' || key === 'billingType') {
        return value !== '' && value !== 'all';
      }
      return value !== '';
    });

    return {
      totalContracts,
      filteredContracts,
      hasActiveFilters,
      filteringPercentage: totalContracts > 0 ? (filteredContracts / totalContracts) * 100 : 0
    };
  }, [kanbanData, filteredKanbanData, filters]);

  // AIDEV-NOTE: Função para limpar todos os filtros
  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      billingType: 'all', // AIDEV-NOTE: Incluir novo filtro
      minValue: '',
      maxValue: '',
      dateRange: 'all',
      client: ''
    });
  }, []);

  // AIDEV-NOTE: Função para aplicar filtro rápido
  const applyQuickFilter = useCallback((filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  // AIDEV-NOTE: Função para buscar contratos por texto
  const searchContracts = useCallback((searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm
    }));
  }, []);

  return {
    // Estados
    filters,
    filteredData: filteredKanbanData,
    isFiltersExpanded,
    filterStats,
    
    // Funções
    updateFilter: setFilters,
    toggleFiltersExpanded,
    clearFilters: clearAllFilters,
    applyQuickFilter,
    searchContracts,
    
    // Utilitários
    hasActiveFilters: filterStats.hasActiveFilters
  };
}
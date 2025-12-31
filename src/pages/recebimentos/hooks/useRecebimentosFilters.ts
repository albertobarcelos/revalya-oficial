import { useState } from 'react';
import type { RecebimentosFilters } from '@/components/recebimentos/types';

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useRecebimentosFilters() {
  const [showFilters, setShowFilters] = useState(false);

  // AIDEV-NOTE: Filtros com data padrão do mês atual para mostrar mais dados
  const [filters, setFilters] = useState<RecebimentosFilters>(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    return {
      search: '',
      status: 'all',
      dateFrom: firstDayOfMonth,
      dateTo: lastDayOfMonth,
      type: 'RECEIVABLE',
      page: 1,
      limit: 25
    };
  });

  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 0
  });

  // AIDEV-NOTE: Função para mudar página
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // AIDEV-NOTE: Função para resetar filtros com mês atual
  const resetFilters = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    setFilters({
      search: '',
      status: 'all',
      dateFrom: firstDayOfMonth,
      dateTo: lastDayOfMonth,
      type: 'RECEIVABLE',
      page: 1,
      limit: 25,
      // Advanced filters
      category: '',
      paymentFrom: '',
      paymentTo: '',
      minAmount: '',
      maxAmount: '',
      bankAccountId: '',
      customerId: '',
      documentId: ''
    });
  };

  return {
    filters,
    setFilters,
    pagination,
    setPagination,
    showFilters,
    setShowFilters,
    handlePageChange,
    resetFilters
  };
}

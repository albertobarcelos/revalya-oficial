/**
 * Hook para gerenciar faturas usando TanStack Query
 * Implementa o padrão de namespace por tenant nos query keys
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

// Tipos
interface Invoice {
  id: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_at?: string;
  description?: string;
  created_at: string;
  tenant_id: string;
}

interface InvoiceFilters {
  customerId?: string;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'all';
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Função para obter o tenant slug atual
function getTenantSlug(): string {
  const tenant = apiClient.getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado');
  return tenant.slug;
}

// Hook principal
export function useInvoiceQuery(filters: InvoiceFilters = {}) {
  const queryClient = useQueryClient();
  const tenantSlug = getTenantSlug();
  
  // Query key com namespace por tenant
  const queryKey = ['invoices', tenantSlug, filters];
  
  // Query para listar faturas
  const invoicesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { 
        customerId, 
        status, 
        fromDate, 
        toDate, 
        search,
        page = 1, 
        limit = 10 
      } = filters;
      
      // Construir parâmetros de consulta
      const params = new URLSearchParams();
      if (customerId) params.append('customerId', customerId);
      if (status && status !== 'all') params.append('status', status);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      return apiClient.get<{ 
        data: Invoice[], 
        total: number,
        page: number,
        limit: number
      }>(`/invoices?${params.toString()}`);
    },
    // Opções específicas
    keepPreviousData: true,
    enabled: !!tenantSlug,
  });
  
  // Query para obter estatísticas
  const statsQuery = useQuery({
    queryKey: ['invoices', tenantSlug, 'stats'],
    queryFn: async () => {
      return apiClient.get<{
        total_pending: number;
        total_paid: number;
        total_overdue: number;
        total_amount: number;
      }>('/invoices/stats');
    },
    enabled: !!tenantSlug,
  });
  
  // Mutation para criar fatura
  const createInvoice = useMutation({
    mutationFn: (invoice: Omit<Invoice, 'id' | 'created_at' | 'tenant_id'>) => {
      return apiClient.post<Invoice>('/invoices', invoice);
    },
    onSuccess: () => {
      // Invalidar a query para forçar recarregamento
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantSlug] });
      // Invalidar também as estatísticas
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantSlug, 'stats'] });
    },
  });
  
  // Mutation para atualizar fatura
  const updateInvoice = useMutation({
    mutationFn: (invoice: Partial<Invoice> & { id: string }) => {
      return apiClient.put<Invoice>(`/invoices/${invoice.id}`, invoice);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantSlug, 'stats'] });
    },
  });
  
  // Mutation para marcar como pago
  const markAsPaid = useMutation({
    mutationFn: (id: string) => {
      return apiClient.post<Invoice>(`/invoices/${id}/pay`, {
        paid_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantSlug, 'stats'] });
    },
  });
  
  // Mutation para cancelar fatura
  const cancelInvoice = useMutation({
    mutationFn: (id: string) => {
      return apiClient.post<Invoice>(`/invoices/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantSlug, 'stats'] });
    },
  });
  
  return {
    // Dados e estado da query principal
    invoices: invoicesQuery.data?.data || [],
    total: invoicesQuery.data?.total || 0,
    page: invoicesQuery.data?.page || 1,
    limit: invoicesQuery.data?.limit || 10,
    isLoading: invoicesQuery.isLoading,
    isError: invoicesQuery.isError,
    error: invoicesQuery.error,
    
    // Estatísticas
    stats: statsQuery.data || {
      total_pending: 0,
      total_paid: 0,
      total_overdue: 0,
      total_amount: 0,
    },
    isLoadingStats: statsQuery.isLoading,
    
    // Mutations
    createInvoice,
    updateInvoice,
    markAsPaid,
    cancelInvoice,
    
    // Refetch manual
    refetch: invoicesQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
}

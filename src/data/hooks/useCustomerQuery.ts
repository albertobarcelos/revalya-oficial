/**
 * Hook para gerenciar clientes usando TanStack Query
 * Implementa o padrão de namespace por tenant nos query keys
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

// Tipos
interface Customer {
  id: string;
  name: string;
  email: string;
  document?: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
  tenant_id: string;
}

interface CustomerFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
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
export function useCustomerQuery(filters: CustomerFilters = {}) {
  const queryClient = useQueryClient();
  const tenantSlug = getTenantSlug();
  
  // Query key com namespace por tenant
  const queryKey = ['customers', tenantSlug, filters];
  
  // Query para listar clientes
  const customersQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { search, status, page = 1, limit = 10 } = filters;
      
      // Construir parâmetros de consulta
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status && status !== 'all') params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      return apiClient.get<{ 
        data: Customer[], 
        total: number,
        page: number,
        limit: number
      }>(`/customers?${params.toString()}`);
    },
    // Opções específicas
    keepPreviousData: true,
    enabled: !!tenantSlug,
  });
  
  // Mutation para criar cliente
  const createCustomer = useMutation({
    mutationFn: (customer: Omit<Customer, 'id' | 'created_at' | 'tenant_id'>) => {
      return apiClient.post<Customer>('/customers', customer);
    },
    onSuccess: () => {
      // Invalidar a query para forçar recarregamento
      queryClient.invalidateQueries({ queryKey: ['customers', tenantSlug] });
    },
  });
  
  // Mutation para atualizar cliente
  const updateCustomer = useMutation({
    mutationFn: (customer: Partial<Customer> & { id: string }) => {
      return apiClient.put<Customer>(`/customers/${customer.id}`, customer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', tenantSlug] });
    },
  });
  
  // Mutation para excluir cliente
  const deleteCustomer = useMutation({
    mutationFn: (id: string) => {
      return apiClient.delete<{ success: boolean }>(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', tenantSlug] });
    },
  });
  
  return {
    // Dados e estado da query
    customers: customersQuery.data?.data || [],
    total: customersQuery.data?.total || 0,
    page: customersQuery.data?.page || 1,
    limit: customersQuery.data?.limit || 10,
    isLoading: customersQuery.isLoading,
    isError: customersQuery.isError,
    error: customersQuery.error,
    
    // Mutations
    createCustomer,
    updateCustomer,
    deleteCustomer,
    
    // Refetch manual
    refetch: customersQuery.refetch,
  };
}

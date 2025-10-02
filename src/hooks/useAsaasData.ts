import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { asaasService } from '@/services/asaas';
import type { AsaasListResponse, AsaasCustomer, AsaasPayment } from '@/types/asaas';

// Hook para buscar clientes com paginação infinita
export function useAsaasCustomers({ limit = 20 } = {}) {
  return useInfiniteQuery({
    queryKey: ['asaas-customers', limit],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await asaasService.getAllCustomers(undefined, pageParam, limit);
      return {
        data: response.data,
        hasMore: response.hasMore,
        offset: pageParam,
        limit,
        totalCount: response.totalCount
      } as AsaasListResponse<AsaasCustomer>;
    },
    getNextPageParam: (lastPage: AsaasListResponse<AsaasCustomer>) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.offset + lastPage.limit;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook para buscar TODOS os clientes do Asaas (com paginação automática)
export function useAllAsaasCustomers() {
  return useQuery({
    queryKey: ['all-asaas-customers'],
    queryFn: async () => {
      return await asaasService.getAllCustomersWithPagination();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (cache mais longo para todos os clientes)
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

export function usePayments({ limit = 10 } = {}) {
  return useInfiniteQuery({
    queryKey: ['payments'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await asaasService.getPayments(pageParam, limit);
      return response;
    },
    getNextPageParam: (lastPage: AsaasListResponse<AsaasPayment>) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.offset + lastPage.limit;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

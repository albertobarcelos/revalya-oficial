import { useInfiniteQuery } from '@tanstack/react-query';
import { asaasService } from '@/services/asaas';
import type { AsaasListResponse, AsaasCustomer, AsaasPayment } from '@/types/asaas';

// Renomeado para useAsaasCustomers para evitar conflito com o hook useCustomers
export function useAsaasCustomers({ limit = 10 } = {}) {
  return useInfiniteQuery({
    queryKey: ['customers'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await asaasService.getAllCustomers();
      return {
        data: response,
        hasMore: false,
        offset: 0,
        limit
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

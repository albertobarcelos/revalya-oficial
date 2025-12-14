import { useMemo, useEffect, useState } from 'react';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { getPayablesPaginated, type PayableFilters, type PayableResponse, type PayableRow, type PayableStatus } from '@/services/financialPayablesService';
import type { PaginationData } from '../types/pagination';
import type { PayablesFilters } from '../types/filters';

export function usePayablesQuery(
  currentTenantId: string | undefined,
  hasAccess: boolean,
  filters: PayablesFilters,
  limit: number
) {
  const queryKey = useMemo(
    () => [
      'contas-a-pagar',
      currentTenantId,
      filters.search,
      filters.status,
      filters.dateFrom,
      filters.dateTo,
      filters.page,
      limit,
    ],
    [currentTenantId, filters]
  );

  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit, totalPages: 0 });

  const { data, isLoading, error } = useSecureTenantQuery(
    queryKey,
    async (_supabase, tenantId) => {
      const params: PayableFilters = {
        tenant_id: tenantId,
        page: filters.page,
        limit,
      };
      if (filters.search) params.search = filters.search;
      const allowedStatuses: PayableStatus[] = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
      const statusFilter = (filters.status || []).filter((s) => allowedStatuses.includes(s as PayableStatus)) as PayableStatus[];
      if (statusFilter.length > 0) params.statuses = statusFilter;
      if (filters.dateFrom) params.start_date = filters.dateFrom;
      if (filters.dateTo) params.end_date = filters.dateTo;
      
      if (filters.category) params.category_id = filters.category;
      if (filters.documentId) params.document_id = filters.documentId;

      const response: PayableResponse = await getPayablesPaginated(params);
      return response;
    },
    { enabled: !!currentTenantId && hasAccess }
  );

  useEffect(() => {
    if (data) {
      setPagination({ total: data.total, page: data.page, limit: data.limit, totalPages: data.totalPages });
    }
  }, [data]);

  const payables = (data?.data || []) as PayableRow[];

  return { payables, pagination, isLoading, error };
}


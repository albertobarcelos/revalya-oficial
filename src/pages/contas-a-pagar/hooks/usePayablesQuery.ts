import { useMemo, useEffect, useState } from 'react';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { getPayablesPaginated, type PayableFilters, type PayableResponse, type PayableRow } from '@/services/financialPayablesService';
import type { PaginationData } from '../types/pagination';
import type { PayablesFilters } from '../types/filters';

export function usePayablesQuery(currentTenantId: string | undefined, hasAccess: boolean, filters: PayablesFilters) {
  const queryKey = useMemo(
    () => [
      'contas-a-pagar',
      currentTenantId,
      filters.search,
      filters.status,
      filters.dateFrom,
      filters.dateTo,
      filters.page,
    ],
    [currentTenantId, filters]
  );

  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 10, totalPages: 0 });

  const { data, isLoading, error } = useSecureTenantQuery(
    queryKey,
    async (_supabase, tenantId) => {
      const params: PayableFilters = {
        tenant_id: tenantId,
        page: filters.page,
        limit: 10,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status.length > 0) (params as any).statuses = filters.status as any;
      if (filters.dateFrom) params.start_date = filters.dateFrom;
      if (filters.dateTo) params.end_date = filters.dateTo;
      if (filters.issueFrom) params.issue_start_date = filters.issueFrom;
      if (filters.issueTo) params.issue_end_date = filters.issueTo;
      if (filters.paymentFrom) params.payment_start_date = filters.paymentFrom;
      if (filters.paymentTo) params.payment_end_date = filters.paymentTo;
      if (filters.minAmount) params.min_amount = Number(filters.minAmount);
      if (filters.maxAmount) params.max_amount = Number(filters.maxAmount);
      if (filters.category) params.category = filters.category;
      if (filters.paymentMethod) params.payment_method = filters.paymentMethod;
      if (filters.invoiceStatus) params.invoice_status = filters.invoiceStatus;

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


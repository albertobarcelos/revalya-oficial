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
      filters.category,
      filters.documentId,
      filters.bankAccountId,
      filters.supplier,
      filters.issueFrom,
      filters.issueTo,
      filters.paymentFrom,
      filters.paymentTo,
      filters.reversalFrom,
      filters.reversalTo,
      filters.page,
      limit,
    ],
    [currentTenantId, filters]
  );

  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit, totalPages: 0 });

  const { data, isLoading, error, refetch } = useSecureTenantQuery(
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
      if (filters.bankAccountId) params.bank_account_id = filters.bankAccountId;
      if (filters.supplier) params.customer_id = filters.supplier;
      
      if (filters.issueFrom) params.issue_start_date = filters.issueFrom;
      if (filters.issueTo) params.issue_end_date = filters.issueTo;
      if (filters.paymentFrom) params.payment_start_date = filters.paymentFrom;
      if (filters.paymentTo) params.payment_end_date = filters.paymentTo;
      if (filters.reversalFrom) params.reversal_start_date = filters.reversalFrom;
      if (filters.reversalTo) params.reversal_end_date = filters.reversalTo;

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

  return { payables, pagination, isLoading, error, refetch };
}


import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Search, AlertTriangle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { getPayablesPaginated, type PayableFilters, type PayableResponse, markAsPaid as markPayableAsPaid, createPayable, updatePayable, type PayableRow } from '@/services/financialPayablesService';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard, useSecureTenantMutation, useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { AdvancedFilters } from './contas-a-pagar/components/AdvancedFilters';
import { PayablesTable } from './contas-a-pagar/components/PayablesTable';
import { CreatePayableModal } from './contas-a-pagar/components/CreatePayableModal';
import { EditPayableModal } from './contas-a-pagar/components/EditPayableModal';
import type { PayablesFilters } from './contas-a-pagar/types/filters';
import { PaginationFooter } from '@/components/layout/PaginationFooter';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { motion } from 'framer-motion';

type FinanceEntry = PayableRow;

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ContasAPagar: React.FC = () => {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  

  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [filters, setFilters] = useState<PayablesFilters>(() => {
    return { search: '', status: [], dateFrom: '', dateTo: '', page: 1 } as PayablesFilters;
  });

  interface DateRangeValue { from?: Date; to?: Date }
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: first, to: last } as DateRangeValue;
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  

  const queryKey = useMemo(
    () => [
      'contas-a-pagar',
      currentTenant?.id,
      filters.search,
      filters.status,
      filters.dateFrom,
      filters.dateTo,
      filters.page,
      pagination.limit,
    ],
    [currentTenant?.id, filters, pagination.limit]
  );

  const { data: payablesData, isLoading, error } = useSecureTenantQuery(
    queryKey,
    async (_supabase, tenantId) => {
      if (tenantId !== currentTenant?.id) {
        throw new Error('VIOLAÇÃO DE SEGURANÇA: Tenant inconsistente');
      }

      const params: PayableFilters = {
        tenant_id: tenantId,
        page: filters.page,
        limit: pagination.limit,
      };

      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status.length > 0) (params as any).statuses = filters.status as any;
      if (filters.dateFrom) params.start_date = filters.dateFrom;
      if (filters.dateTo) params.end_date = filters.dateTo;
      if (filters.issueFrom) params.issue_start_date = filters.issueFrom;
      if (filters.issueTo) params.issue_end_date = filters.issueTo;
      if (filters.paymentFrom) params.payment_start_date = filters.paymentFrom as any;
      if (filters.paymentTo) params.payment_end_date = filters.paymentTo as any;
      if (filters.minAmount) params.min_amount = Number(filters.minAmount);
      if (filters.maxAmount) params.max_amount = Number(filters.maxAmount);
      if (filters.category) (params as any).category_id = filters.category;
      if (filters.paymentMethod) (params as any).payment_method = filters.paymentMethod;
      if (filters.documentId) (params as any).document_id = filters.documentId;
      if (filters.supplier) (params as any).supplier_name = filters.supplier;

      const response: PayableResponse = await getPayablesPaginated(params);
      const invalid = response.data?.filter((i) => i.tenant_id !== tenantId);
      if (invalid?.length) throw new Error('VIOLAÇÃO DE SEGURANÇA: registros de outro tenant');
      return response;
    },
    { enabled: !!currentTenant?.id && hasAccess }
  );

  

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erro',
        description: error.message.includes('VIOLAÇÃO') ? 'Violação de segurança detectada' : 'Erro ao carregar contas a pagar',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (payablesData) {
      setPagination({
        total: payablesData.total,
        page: payablesData.page,
        limit: payablesData.limit,
        totalPages: payablesData.totalPages,
      });
    }
  }, [payablesData]);

  const payables = (payablesData?.data || []) as FinanceEntry[];
  const totals = payables.reduce(
    (acc, e) => {
      const gross = e.gross_amount ?? 0;
      const net = e.net_amount ?? 0;
      const paid = e.paid_amount ?? 0;
      const remaining = Math.max(net - paid, 0);
      acc.gross += gross;
      acc.paid += paid;
      acc.remaining += remaining;
      return acc;
    },
    { gross: 0, paid: 0, remaining: 0 }
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = payables.length > 0 && selectedIds.length === payables.length;
  const toggleSelectAll = (v: boolean) => setSelectedIds(v ? payables.map(p => p.id) : []);
  const toggleSelectOne = (id: string, v: boolean) => {
    setSelectedIds(prev => {
      const set = new Set(prev);
      if (v) set.add(id); else set.delete(id);
      return Array.from(set);
    });
  };
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<any | null>(null);
  const [editReadOnly, setEditReadOnly] = useState(false);
  const updatePayableMutation = useSecureTenantMutation(
    async (_supabase, tenantId, { id, patch }: { id: string; patch: any }) => {
      const entry = payables.find((p) => p.id === id);
      if (!entry || entry.tenant_id !== tenantId) {
        throw new Error('VIOLAÇÃO DE SEGURANÇA: Tentativa de alterar outro tenant');
      }
      return await updatePayable(id, patch);
    },
    {
      invalidateQueries: ['contas-a-pagar'],
      onSuccess: () => {
        setEditOpen(false);
        setEditEntry(null);
        toast({ title: 'Salvo', description: 'Conta a pagar atualizada' });
      },
      onError: (e) => {
        toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      }
    }
  );

  const appendLaunchMutation = useSecureTenantMutation(
    async (_supabase, tenantId, { id, patch }: { id: string; patch: any }) => {
      const entry = payables.find((p) => p.id === id);
      if (!entry || entry.tenant_id !== tenantId) {
        throw new Error('VIOLAÇÃO DE SEGURANÇA: Tentativa de alterar outro tenant');
      }
      return await updatePayable(id, patch);
    },
    {
      invalidateQueries: ['contas-a-pagar'],
      onSuccess: (_res, _vars) => {
        try {
          const vars = _vars as any;
          if (editOpen && editEntry && vars?.id === editEntry.id) {
            setEditEntry({ ...editEntry, ...vars.patch });
          }
        } catch {}
        toast({ title: 'Salvo', description: 'Lançamento registrado' });
      },
      onError: (e) => {
        toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      }
    }
  );
  const bulkMarkAsPaid = async () => {
    for (const id of selectedIds) {
      await markAsPaidMutation.mutateAsync({ entryId: id });
    }
    setSelectedIds([]);
    toast({ title: 'Sucesso', description: 'Contas selecionadas marcadas como pagas' });
  };
  const exportCsv = () => {
    const headers = ['Situacao','Vencimento','Numero','Detalhes','Valor','Pago','A pagar'];
    const statusMap: Record<string, string> = {
      PENDING: 'Pendente',
      PAID: 'Pago',
      OVERDUE: 'Vencida',
      CANCELLED: 'Estornada',
      DUE_SOON: 'A vencer',
      DUE_TODAY: 'Vence hoje',
    };
    const rows = payables.map((e) => {
      const gross = e.gross_amount ?? 0;
      const net = e.net_amount ?? 0;
      const paid = e.paid_amount ?? 0;
      const remaining = Math.max(net - paid, 0);
      return [
        statusMap[e.status] || e.status,
        format(new Date(e.due_date), 'dd/MM/yyyy', { locale: ptBR }),
        e.entry_number ?? '',
        e.description ?? '',
        gross.toFixed(2).replace('.', ','),
        paid.toFixed(2).replace('.', ','),
        remaining.toFixed(2).replace('.', ','),
      ].join(';');
    });
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contas_a_pagar_${format(new Date(), 'yyyyMMdd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const markAsPaidMutation = useSecureTenantMutation(
    async (_supabase, tenantId, { entryId }: { entryId: string }) => {
      const entry = payables.find((p) => p.id === entryId);
      if (!entry || entry.tenant_id !== tenantId) {
        throw new Error('VIOLAÇÃO DE SEGURANÇA: Tentativa de alterar outro tenant');
      }
      const amount = entry.net_amount ?? 0;
      return await markPayableAsPaid(entryId, amount, 'MANUAL');
    },
    {
      onSuccess: () => {
        toast({ title: 'Sucesso', description: 'Conta marcada como paga' });
      },
      onError: (e) => {
        toast({
          title: 'Erro',
          description: e.message.includes('VIOLAÇÃO') ? 'Operação não autorizada' : 'Falha ao marcar como paga',
          variant: 'destructive',
        });
      },
      invalidateQueries: ['contas-a-pagar', 'financial-metrics'],
    }
  );

  const markAsPaid = async (entryId: string) => {
    await markAsPaidMutation.mutateAsync({ entryId });
    const entry = payables.find((p) => p.id === entryId);
    if (!entry) return;
    const typeId = entry.document_id ?? '';
    const prevMeta: any = entry.metadata || {};
    const prevLaunches = Array.isArray(prevMeta.launches) ? prevMeta.launches : [];
    const newLaunch = {
      amount: Number(entry.net_amount ?? entry.gross_amount ?? 0),
      date: new Date().toISOString().slice(0,10),
      typeId: String(typeId),
      operation: 'DEBIT',
      description: 'Movimento de Quitação',
    };
    const newMeta = { ...prevMeta, launches: [...prevLaunches, newLaunch] };
    await updatePayableMutation.mutateAsync({ id: entryId, patch: { metadata: newMeta } });
  };
  

  const createPayableAddAnotherMutation = useSecureTenantMutation(
    async (_supabase, tenantId, payload: {
      description?: string | null;
      gross_amount: number;
      net_amount: number;
      due_date: string;
      issue_date?: string | null;
      status?: any;
      payment_date?: string | null;
      paid_amount?: number | null;
      category_id?: string | null;
      entry_number?: string | undefined;
      document_id?: string | null;
      supplier_name?: string | null;
      repeat?: boolean;
    }) => {
      return await createPayable({ tenant_id: tenantId, ...payload } as any);
    },
    {
      invalidateQueries: ['contas-a-pagar'],
      onSuccess: () => {
        toast({ title: 'Salvo', description: 'Conta a pagar criada' });
      }
    }
  );

  const createPayableSaveInfoMutation = useSecureTenantMutation(
    async (_supabase, tenantId, payload: {
      description?: string | null;
      gross_amount: number;
      net_amount: number;
      due_date: string;
      issue_date?: string | null;
      status?: any;
      payment_date?: string | null;
      paid_amount?: number | null;
      category_id?: string | null;
      entry_number?: string | undefined;
      document_id?: string | null;
      supplier_name?: string | null;
      repeat?: boolean;
    }) => {
      return await createPayable({ tenant_id: tenantId, ...payload } as any);
    },
    {
      invalidateQueries: ['contas-a-pagar'],
      onSuccess: () => {
        toast({ title: 'Salvo', description: 'Conta a pagar criada' });
      }
    }
  );

  useEffect(() => {
    if (!currentTenant?.id) return;
    const channel = supabase.channel(`financial-payables-${currentTenant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_payables', filter: `tenant_id=eq.${currentTenant.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [currentTenant?.id, queryClient]);

  

  const resetFilters = () => {
    setFilters({
      search: '',
      status: [],
      dateFrom: '',
      dateTo: '',
      issueFrom: undefined,
      issueTo: undefined,
      paymentFrom: undefined,
      paymentTo: undefined,
      minAmount: undefined,
      maxAmount: undefined,
      category: '',
      paymentMethod: '',
      documentId: undefined,
      storeId: '',
      supplier: '',
      reversalFrom: undefined,
      reversalTo: undefined,
      page: 1,
    });
  };

  const handlePageChange = (newPage: number) => setFilters((prev) => ({ ...prev, page: newPage }));

  if (!hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-destructive mb-4">Acesso Negado</h1>
            <p className="text-muted-foreground">{accessError}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-4">

        <Card className="flex flex-col overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Contas a Pagar</CardTitle>
                  <CardDescription>Gerencie e exporte despesas com filtros avançados</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={exportCsv} className="gap-2">
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Nova
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 p-0 flex-1 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6 items-end">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Busque por detalhes, número, nome, vencimento ou valor"
                    value={filters.search}
                    onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                    className="pl-8 w-full md:max-w-[300px]"
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={(() => {
                  const s = filters.status || [];
                  if (s.length === 0) return 'all' as any;
                  if (s.length === 2 && s.includes('DUE_SOON') && s.includes('DUE_TODAY')) return 'DUE' as any;
                  return (s[0] as any);
                })()} onValueChange={(value) => setFilters((p) => ({
                  ...p,
                  status: value === 'all' ? [] : (value === 'DUE' ? ['DUE_SOON','DUE_TODAY'] : [value as any])
                }))}>
                  <SelectTrigger className="mt-2 w-full md:max-w-[240px]">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="PAID">Quitado</SelectItem>
                    <SelectItem value="DUE">A Vencer</SelectItem>
                    <SelectItem value="OVERDUE">Vencido</SelectItem>
                    <SelectItem value="CANCELLED">Estornado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Período</Label>
                <div className="mt-2 flex items-end gap-2 w-full md:max-w-[280px]">
                  <DateRangePicker
                    date={dateRange as any}
                    onDateChange={(range: any) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to } as any);
                        const fromStr = range.from.toISOString().slice(0, 10);
                        const toStr = range.to.toISOString().slice(0, 10);
                        setFilters((prev) => ({ ...prev, dateFrom: fromStr, dateTo: toStr }));
                      }
                    }}
                  />
                  <Button variant="link" onClick={() => setShowFilters((v) => !v)}>
                    {showFilters ? 'Ocultar filtros' : 'Exibir filtros'}
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="border rounded-2xl">
                <ScrollArea className="max-h-[60vh]">
                  <PayablesTable
                    payables={payables}
                    selectedIds={selectedIds}
                    allSelected={allSelected}
                    toggleSelectAll={toggleSelectAll}
                    toggleSelectOne={toggleSelectOne}
                    markAsPaid={markAsPaid}
                    onEdit={(entry, readOnly) => { setEditEntry(entry); setEditReadOnly(!!readOnly); setEditOpen(true); }}
                    onAfterReverse={() => queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] })}
                  />
                </ScrollArea>
              </div>
            )}

          </CardContent>
          <div className="flex-shrink-0">
            <PaginationFooter
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={(page) => handlePageChange(page)}
              onItemsPerPageChange={(perPage) => setPagination((p) => ({ ...p, limit: perPage, page: 1 }))}
              totals={totals}
            />
          </div>
        </Card>

        

        {showFilters && (
          <AdvancedFilters
            filters={filters}
            setFilters={(updater) => setFilters(updater)}
            onApply={() => setFilters((p) => ({ ...p, page: 1 }))}
            onReset={resetFilters}
          />
        )}

        

        <CreatePayableModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSave={(payload) => createPayableSaveInfoMutation.mutate(payload)}
          onSaveAndAddAnother={(payload) => createPayableAddAnotherMutation.mutate(payload)}
          currentTenantId={currentTenant?.id}
        />

        <EditPayableModal
          open={editOpen}
          onOpenChange={setEditOpen}
          entry={editEntry}
          currentTenantId={currentTenant?.id}
          onSave={(variables) => updatePayableMutation.mutate(variables)}
          onAddLaunchPatch={(variables) => appendLaunchMutation.mutate(variables)}
          readOnly={editReadOnly}
        />
      </motion.div>
    </Layout>
  );
};

export default ContasAPagar;

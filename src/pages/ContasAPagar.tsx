import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Search, AlertTriangle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import type { PayableRow } from '@/services/financialPayablesService';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { usePayablesQuery } from './contas-a-pagar/hooks/usePayablesQuery';
import { usePayablesMutations } from './contas-a-pagar/hooks/usePayablesMutations';
import { AdvancedFilters } from './contas-a-pagar/components/AdvancedFilters';
import { PayablesTable } from './contas-a-pagar/components/PayablesTable';
import { CreatePayableModal } from './contas-a-pagar/components/CreatePayableModal';
import { EditPayableModal } from './contas-a-pagar/components/EditPayableModal';
import type { PayablesFilters } from './contas-a-pagar/types/filters';
import type { PaginationData } from './contas-a-pagar/types/pagination';
import { PaginationFooter } from '@/components/layout/PaginationFooter';
import { Separator } from '@/components/ui/separator';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { motion } from 'framer-motion';
import { exportPayablesCsv } from './contas-a-pagar/utils/exportCsv';

type FinanceEntry = PayableRow;

const ContasAPagar: React.FC = () => {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  

  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
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
  const [iconHtml, setIconHtml] = useState<string>('');
  

  const { payables: payablesList, pagination, isLoading, error } = usePayablesQuery(
    currentTenant?.id,
    hasAccess,
    filters,
    itemsPerPage
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
    if (error) {
      toast({
        title: 'Erro',
        description: error.message.includes('VIOLAÇÃO') ? 'Violação de segurança detectada' : 'Erro ao carregar contas a pagar',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  useEffect(() => {
    let active = true;
    fetch('/images/contas_a_pagar/manage-money-animate.svg')
      .then((r) => r.text())
      .then((text) => {
        if (!active) return;
        setIconHtml(text);
      })
      .catch(() => setIconHtml(''));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const emptySvg = document.querySelector('.empty-icon svg') as SVGElement | null;
    if (emptySvg) {
      emptySvg.setAttribute('width', '100%');
      emptySvg.removeAttribute('height');
      emptySvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
  }, [iconHtml]);

  const payables = (payablesList || []) as FinanceEntry[];
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
  const { updatePayableMutation, markAsPaidMutation, createPayableAddAnotherMutation, createPayableSaveInfoMutation } = usePayablesMutations(payables);

  const appendLaunch = async (variables: { id: string; patch: any }) => {
    await updatePayableMutation.mutateAsync(variables);
    try {
      const vars = variables as any;
      if (editOpen && editEntry && vars?.id === editEntry.id) {
        setEditEntry({ ...editEntry, ...vars.patch });
      }
    } catch {}
    toast({ title: 'Salvo', description: 'Lançamento registrado' });
  };
  const bulkMarkAsPaid = async () => {
    for (const id of selectedIds) {
      await markAsPaidMutation.mutateAsync({ entryId: id });
    }
    setSelectedIds([]);
    toast({ title: 'Sucesso', description: 'Contas selecionadas marcadas como pagas' });
  };
  const exportCsv = () => exportPayablesCsv(payables);


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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col h-full p-4 md:p-6 pt-4 pb-0">

        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-4 md:gap-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5 items-end flex-1 min-w-0">
                <div>
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Busque por detalhes, número, nome, vencimento ou valor"
                      value={filters.search}
                      onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                      className="pl-8 h-9 w-full md:w-[240px]"
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
                    <SelectTrigger className="mt-2 h-9 w-full md:w-[240px]">
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

                <div className="space-y-1">
                  <Label>Período</Label>
                  <div className="mt-2 w-full md:w-[240px]">
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
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Totais</Label>
                  <div className="mt-2 text-sm text-muted-foreground">
                    R$ {totals?.remaining?.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end">
                <Button variant="outline" onClick={exportCsv} className="gap-2">
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Nova
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 p-0 flex flex-col flex-1 min-h-0">
            <Separator className="my-2" />

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : payables.length === 0 ? (
              <div className="rounded-md border flex-1 flex flex-col min-h-0 empty-icon">
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-12 px-4">
                  {iconHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: iconHtml }} className="mb-4 w-[260px] md:w-[320px] mx-auto" />
                  ) : null}
                  <div className="text-center text-muted-foreground">
                    <p className="text-body font-medium">Nenhuma conta a pagar encontrada</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
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
                </div>
              </div>
            )}

          </CardContent>
          {!isLoading && pagination.total > 0 && (
            <div className="flex-shrink-0">
              <PaginationFooter
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={(page) => handlePageChange(page)}
                onItemsPerPageChange={(perPage) => { setItemsPerPage(perPage); setFilters((p) => ({ ...p, page: 1 })); }}
                totals={totals}
              />
            </div>
          )}
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
          onAddLaunchPatch={(variables) => appendLaunch(variables)}
          readOnly={editReadOnly}
        />
      </motion.div>
    </Layout>
  );
};

export default ContasAPagar;

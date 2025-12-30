import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Search, AlertTriangle, Download, Filter, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { useToast } from '@/components/ui/use-toast';
import type { PayableRow, PayableInsert } from '@/services/financialPayablesService';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { usePayablesQuery } from './contas-a-pagar/hooks/usePayablesQuery';
import { usePayablesMutations } from './contas-a-pagar/hooks/usePayablesMutations';
import { AdvancedFilters } from './contas-a-pagar/components/AdvancedFilters';
import { PayablesTable } from './contas-a-pagar/components/PayablesTable';
import { TotalsRow } from './contas-a-pagar/components/TotalsRow';
import { CreatePayableModal } from './contas-a-pagar/components/CreatePayableModal';
import { EditPayableModal } from './contas-a-pagar/components/EditPayableModal';
import { BulkPayModal } from './contas-a-pagar/components/BulkPayModal';
import type { PayablesFilters } from './contas-a-pagar/types/filters';
import type { PaginationData } from './contas-a-pagar/types/pagination';
import { PaginationFooter } from '@/components/layout/PaginationFooter';
import { Separator } from '@/components/ui/separator';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { exportPayablesCsv } from './contas-a-pagar/utils/exportCsv';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type FinanceEntry = PayableRow;

const ContasAPagar: React.FC = () => {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Log de auditoria obrigatório conforme guia de segurança 5.2
  useEffect(() => {
    if (currentTenant) {
      console.log(`[AUDIT] Página Contas a Pagar acessada - Tenant: ${currentTenant.name} (${currentTenant.id})`);
    }
  }, [currentTenant]);

  

  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [filters, setFilters] = useState<PayablesFilters>(() => {
    return { search: '', status: [], dateFrom: '', dateTo: '', page: 1 };
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: first, to: last };
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkPayModal, setShowBulkPayModal] = useState(false);
  const [iconHtml, setIconHtml] = useState<string>('');
  

  const { payables: payablesList, pagination, isLoading, error, refetch } = usePayablesQuery(
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
  const [editEntry, setEditEntry] = useState<PayableRow | null>(null);
  const [editReadOnly, setEditReadOnly] = useState(false);
  const { updatePayableMutation, markAsPaidMutation, createPayableAddAnotherMutation, createPayableSaveInfoMutation } = usePayablesMutations(payables);

  const appendLaunch = async (variables: { id: string; patch: Partial<PayableInsert> }) => {
    await updatePayableMutation.mutateAsync(variables);
    if (editOpen && editEntry && variables.id === editEntry.id) {
      setEditEntry({ ...editEntry, ...variables.patch } as PayableRow);
    }
    // AIDEV-NOTE: Force table refresh
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
    toast({ title: 'Salvo', description: 'Lançamento registrado' });
  };
  const handleBulkPayConfirm = async ({ 
    paymentDate, 
    bankAccountId, 
    description,
    interest = 0,
    fine = 0,
    discount = 0
  }: { 
    paymentDate: string; 
    bankAccountId: string; 
    description: string;
    interest?: number;
    fine?: number;
    discount?: number;
  }) => {
    const count = selectedIds.length;
    if (count === 0) return;

    // Calculate share per item (simple distribution)
    const shareInterest = interest > 0 ? (interest / count) : 0;
    const shareFine = fine > 0 ? (fine / count) : 0;
    const shareDiscount = discount > 0 ? (discount / count) : 0;

    for (const id of selectedIds) {
      const entry = payables.find((p) => p.id === id);
      if (!entry) continue;

      const typeId = entry.document_id ?? '';
      const prevMeta = (entry.metadata || {}) as Record<string, unknown>;
      const prevLaunches = Array.isArray(prevMeta.launches) ? prevMeta.launches : [];
      
      const newLaunches = [];

      // Add Interest Launch
      if (shareInterest > 0) {
        newLaunches.push({
          amount: shareInterest,
          date: paymentDate,
          typeId: 'JUROS',
          operation: 'CREDIT',
          description: description ? `${description} (Juros)` : 'Juros na Quitação',
        });
      }

      // Add Fine Launch
      if (shareFine > 0) {
        newLaunches.push({
          amount: shareFine,
          date: paymentDate,
          typeId: 'MULTA',
          operation: 'CREDIT',
          description: description ? `${description} (Multa)` : 'Multa na Quitação',
        });
      }

      // Add Discount Launch
      if (shareDiscount > 0) {
        newLaunches.push({
          amount: shareDiscount,
          date: paymentDate,
          typeId: 'DESCONTO',
          operation: 'DEBIT',
          description: description ? `${description} (Desconto)` : 'Desconto na Quitação',
        });
      }

      // Calculate Payment Amount
      // Base is remaining amount (net - paid)
      const gross = entry.gross_amount ?? 0;
      const net = entry.net_amount ?? gross;
      const paid = entry.paid_amount ?? 0;
      const remainingBase = Math.max(net - paid, 0);

      const paymentAmount = Math.max(remainingBase + shareInterest + shareFine - shareDiscount, 0);
      const newNet = net + shareInterest + shareFine - shareDiscount;

      // Add Payment Launch
      newLaunches.push({
        amount: paymentAmount,
        date: paymentDate,
        typeId: 'PAGAMENTO',
        operation: 'DEBIT',
        description: description || 'Movimento de Quitação em Lote',
      });

      const newMeta = { ...prevMeta, launches: [...prevLaunches, ...newLaunches] };
      
      await updatePayableMutation.mutateAsync({ 
        id, 
        patch: { 
          status: 'PAID',
          payment_date: paymentDate,
          bank_account_id: bankAccountId,
          paid_amount: (paid + paymentAmount), // Accumulate paid amount
          net_amount: newNet,
          metadata: newMeta
        } 
      });
    }
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
    setSelectedIds([]);
    toast({ title: 'Sucesso', description: 'Contas selecionadas marcadas como pagas' });
  };

  const exportCsv = () => exportPayablesCsv(payables);


  useEffect(() => {
    if (!currentTenant?.id) return;
    const channel = supabase.channel(`financial-payables-${currentTenant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_payables', filter: `tenant_id=eq.${currentTenant.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
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
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-end justify-between gap-4">
                <div className="flex items-end gap-2 flex-1 w-full">
                  <div className="space-y-2 w-full sm:w-[35%]">
                    <Label htmlFor="search">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Busque por detalhes..."
                        value={filters.search}
                        onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                        className="pl-8 w-full h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="opacity-0 hidden sm:block">Filtros</Label>
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`gap-2 h-10 ${showFilters ? 'bg-secondary' : ''}`}
                    >
                      <Filter className="h-4 w-4" />
                      <span className="hidden sm:inline">Filtros</span>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end pt-2 sm:pt-0">
                  <div className="space-y-2">
                    <Label className="opacity-0 hidden sm:block">Ações</Label>
                    <div className="flex items-center gap-2">
                      <AnimatePresence>
                        {selectedIds.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button className="gap-2 w-full sm:w-auto h-10 bg-slate-500 hover:bg-slate-600">
                                  Ações ({selectedIds.length} selecionadas)
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setShowBulkPayModal(true)}>
                                  Quitar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast({ title: 'Em breve', description: 'Geração de recibos em desenvolvimento.' })}>
                                  Gerar Recibo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <Button variant="outline" onClick={exportCsv} className="gap-2 w-full sm:w-auto h-10">
                        <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
                      </Button>
                      <Button onClick={() => setShowCreateModal(true)} className="gap-2 w-full sm:w-auto h-10">
                        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <AdvancedFilters
                        filters={filters}
                        setFilters={(updater) => setFilters(updater)}
                        onApply={() => setFilters((p) => ({ ...p, page: 1 }))}
                        onReset={resetFilters}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                    onEdit={(entry, readOnly) => { setEditEntry(entry); setEditReadOnly(!!readOnly); setEditOpen(true); }}
                    onAfterReverse={async () => {
                      await refetch();
                      queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
                    }}
                  />
                </div>
                <TotalsRow totals={totals} />
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
              />
            </div>
          )}
        </Card>

        <EditPayableModal
          open={editOpen}
          onOpenChange={(v) => { 
            setEditOpen(v); 
            if(!v) {
              setEditEntry(null);
              // AIDEV-NOTE: Force refresh when modal closes to ensure table updates
              refetch();
              queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
            }
          }}
          entry={editEntry}
          currentTenantId={currentTenant?.id}
          readOnly={editReadOnly}
          onSave={async (vars) => {
            await updatePayableMutation.mutateAsync(vars);
            setEditOpen(false);
            setEditEntry(null);
            // AIDEV-NOTE: Force refresh after save
            await refetch();
            queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
          }}
          onSwitchEntry={(newEntry) => setEditEntry(newEntry)}
          onAddLaunchPatch={appendLaunch}
        />



        

        <CreatePayableModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSave={async (payload) => {
            await createPayableSaveInfoMutation.mutateAsync(payload);
            await refetch();
            queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
          }}
          onSaveAndAddAnother={async (payload) => {
            await createPayableAddAnotherMutation.mutateAsync(payload);
            await refetch();
            queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
          }}
          onGenerateRecurrences={async (payload) => {
            await createPayableSaveInfoMutation.mutateAsync(payload);
            await refetch();
            queryClient.invalidateQueries({ queryKey: ['contas-a-pagar'] });
          }}
          currentTenantId={currentTenant?.id}
        />

        <BulkPayModal
          open={showBulkPayModal}
          onOpenChange={setShowBulkPayModal}
          selectedIds={selectedIds}
          payables={payables}
          onConfirm={handleBulkPayConfirm}
          currentTenantId={currentTenant?.id}
        />
      </motion.div>
    </Layout>
  );
};

export default ContasAPagar;

import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Plus, MoreVertical, Search, AlertCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { getPayablesPaginated, type PayableFilters, type PayableResponse, markAsPaid as markPayableAsPaid, createPayable, updatePayable, type PayableRow } from '@/services/financialPayablesService';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/types/database';
import { useTenantAccessGuard, useSecureTenantMutation, useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { listFinancialDocuments } from '@/services/financialDocumentsService';
import { listFinancialSettings } from '@/services/financialSettingsService';
import { ActionsBar } from './contas-a-pagar/components/ActionsBar';
import { AdvancedFilters } from './contas-a-pagar/components/AdvancedFilters';
import { PayablesTable } from './contas-a-pagar/components/PayablesTable';
import { CreatePayableModal } from './contas-a-pagar/components/CreatePayableModal';
import { EditPayableModal } from './contas-a-pagar/components/EditPayableModal';
import { FilterBar } from './contas-a-pagar/components/FilterBar';
import type { PayablesFilters } from './contas-a-pagar/types/filters';
import { PaginationFooter } from '@/components/layout/PaginationFooter';

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

  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'dados'|'lancamentos'|'historico'>('dados');
  const [createdEntry, setCreatedEntry] = useState<FinanceEntry | null>(null);
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDueDate, setEntryDueDate] = useState('');
  const [entryIssueDate, setEntryIssueDate] = useState(() => new Date().toISOString().slice(0,10));
  const [entryNumber, setEntryNumber] = useState('');
  const [entryCategory, setEntryCategory] = useState('');
  const [entryDocumentId, setEntryDocumentId] = useState('');
  const [entrySupplier, setEntrySupplier] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [entryRepeat, setEntryRepeat] = useState(false);
  const [entryPaidConfirmed, setEntryPaidConfirmed] = useState(false);

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

  const categoriesQuery = useSecureTenantQuery(
    ['payables-categories', currentTenant?.id],
    async (supabase, tId) => {
      const data = await listFinancialSettings(tId, 'EXPENSE_CATEGORY', { active: true }, supabase);
      return data;
    },
    { enabled: !!currentTenant?.id && hasAccess }
  );

  const documentsQuery = useSecureTenantQuery(
    ['payables-documents', currentTenant?.id],
    async (supabase, tId) => {
      const data = await listFinancialDocuments(tId, supabase);
      return data;
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
    const doc = documentsQuery.data?.find((d: any) => d.id === entry.document_id);
    const typeId = doc?.settle_id ?? entry.document_id ?? '';
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
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const getStatusBadge = (status: string) => {
    const map = {
      PENDING: { label: 'Pendente', variant: 'secondary' as const },
      PAID: { label: 'Pago', variant: 'default' as const },
      OVERDUE: { label: 'Vencido', variant: 'destructive' as const },
      CANCELLED: { label: 'Cancelado', variant: 'outline' as const },
    } as const;
    const cfg = (map as any)[status] || map.PENDING;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
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
        setEntryAmount(''); setEntryDueDate(''); setEntryIssueDate(new Date().toISOString().slice(0,10)); setEntryNumber('');
        setEntryCategory(''); setEntryDocumentId(''); setEntrySupplier(''); setEntryDescription(''); setEntryRepeat(false); setEntryPaidConfirmed(false);
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
      onSuccess: (entry: any) => {
        setCreatedEntry(entry);
        setCreateModalTab('dados');
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

  /** Retorna indicador visual de situação: bola verde quando vencimento > hoje; caso contrário, badge padrão */
  const renderStatusIndicator = (status: string) => {
    if (status === 'PENDING') return <span className="inline-block w-3 h-3 rounded-full bg-green-500" />;
    if (status === 'DUE_SOON') return <AlertCircle size={17} className="text-[rgb(255,177,51)]" />;
    if (status === 'DUE_TODAY') return <span className="inline-block w-3 h-3 rounded-full bg-red-500" />;
    if (status === 'OVERDUE') return <AlertTriangle size={17} className="text-[rgb(223,75,51)]" />;
    return getStatusBadge(status);
  };

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
      <div className="container mx-auto p-6 space-y-6">
        {/* cabeçalho removido para posicionar botão na mesma altura do filtro */}

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="pt-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Contas a Pagar</h2>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Busque por detalhes, número, nome, vencimento ou valor"
                    className="pl-8 w-full h-9"
                    value={filters.search}
                    onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                  />
                </div>
                <Button variant="link" onClick={() => setShowFilters((v) => !v)}>
                  {showFilters ? 'Ocultar filtros' : 'Exibir filtros'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova conta a pagar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showCreateModal} onOpenChange={(open) => { setShowCreateModal(open); if (!open) {
          setEntryAmount(''); setEntryDueDate(''); setEntryIssueDate(new Date().toISOString().slice(0,10)); setEntryNumber('');
          setEntryCategory(''); setEntryDocumentId(''); setEntrySupplier(''); setEntryDescription(''); setEntryRepeat(false); setEntryPaidConfirmed(false);
          setCreateModalTab('dados'); setCreatedEntry(null);
        } }}>
          <DialogContent className="w-[95vw] max-w-none md:max-w-5xl h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Nova conta a pagar</DialogTitle>
              <DialogDescription>Preencha os dados abaixo e salve.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Nova conta a pagar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
                    <Button variant={createModalTab==='dados' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setCreateModalTab('dados')}>Dados gerais <span>›</span></Button>
                    <Button variant={createModalTab==='lancamentos' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setCreateModalTab('lancamentos')} disabled={!createdEntry}>Lançamentos <span>›</span></Button>
                    <Button variant={createModalTab==='historico' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setCreateModalTab('historico')} disabled={!createdEntry}>Histórico de alterações <span>›</span></Button>
                    <Button variant="outline" className="w-full" onClick={() => setShowCreateModal(false)}>Voltar à listagem</Button>
                    {createdEntry && (
                      <div className="space-y-2 mt-2 text-sm">
                        <div className="bg-muted px-3 py-2 rounded">{(createdEntry as any).entry_number}</div>
                        <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                          <span>Vencimento</span>
                          <span>{format(new Date((createdEntry as any).due_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                        <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                          <span>Valor</span>
                          <span>{formatCurrency((createdEntry as any).gross_amount || (createdEntry as any).net_amount || 0)}</span>
                        </div>
                        <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                          <span>Saldo</span>
                          <span>{formatCurrency(Math.max(((createdEntry as any).net_amount || 0) - ((createdEntry as any).paid_amount || 0), 0))}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dados gerais da conta a pagar</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[70vh] overflow-y-auto">
                    {createdEntry && (
                      <div className="mb-4 w-full rounded bg-emerald-600/10 text-emerald-700 px-4 py-2">Conta a pagar salva com sucesso.</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label>Valor</Label>
                        <Input placeholder="R$ 0,00" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} />
                      </div>
                      <div>
                        <Label>Data de vencimento</Label>
                        <Input type="date" value={entryDueDate} onChange={(e) => setEntryDueDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Data de emissão</Label>
                        <Input type="date" value={entryIssueDate} onChange={(e) => setEntryIssueDate(e.target.value)} />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label>Número</Label>
                          <Input value={entryNumber} onChange={(e) => setEntryNumber(e.target.value)} disabled={!!createdEntry} />
                        </div>
                        <Button variant="link" onClick={() => setEntryNumber(`CP${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${Date.now().toString().slice(-6)}`)}>Gerar número</Button>
                      </div>
                      <div>
                        <Label>Categoria</Label>
                        <Select value={entryCategory} onValueChange={setEntryCategory}>
                          <SelectTrigger><SelectValue placeholder="Selecione ou digite para pesquisar" /></SelectTrigger>
                          <SelectContent>
                            {categoriesQuery.data?.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tipo de documento</Label>
                        <Select value={entryDocumentId} onValueChange={setEntryDocumentId}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {documentsQuery.data?.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Fornecedor ou transportadora (opcional)</Label>
                        <Input placeholder="Selecione ou digite para pesquisar" value={entrySupplier} onChange={(e) => setEntrySupplier(e.target.value)} />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Descrição (opcional)</Label>
                        <Input value={entryDescription} onChange={(e) => setEntryDescription(e.target.value)} />
                      </div>
                      <div className="md:col-span-3 space-y-3">
                        <label className="flex items-center gap-2">
                          <Checkbox checked={entryRepeat} onCheckedChange={(v) => setEntryRepeat(!!v)} />
                          Esta conta a pagar irá se repetir
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox checked={entryPaidConfirmed} onCheckedChange={(v) => setEntryPaidConfirmed(!!v)} />
                          Pagamento confirmado
                        </label>
                      </div>
                    </div>
                    {createModalTab === 'dados' && (
                    <div className="mt-6 flex justify-end gap-2">
                      <Button variant="outline" onClick={async () => {
                        if (!currentTenant?.id) return;
                        const amount = Number(entryAmount || '0');
                        createPayableAddAnotherMutation.mutate({
                          description: entryDescription || currentTenant?.name || 'Conta a pagar',
                          gross_amount: amount,
                          net_amount: amount,
                          due_date: entryDueDate || new Date().toISOString().slice(0,10),
                          issue_date: entryIssueDate || new Date().toISOString().slice(0,10),
                          status: entryPaidConfirmed ? 'PAID' : 'PENDING',
                          payment_date: entryPaidConfirmed ? new Date().toISOString().slice(0,10) : null,
                          paid_amount: entryPaidConfirmed ? amount : null,
                          category_id: entryCategory || null,
                          entry_number: entryNumber || undefined,
                          document_id: entryDocumentId || null,
                          supplier_name: entrySupplier || null,
                          repeat: entryRepeat,
                        });
                      }}>Salvar e adicionar outro</Button>
                      <Button onClick={async () => {
                        if (!currentTenant?.id) return;
                        const amount = Number(entryAmount || '0');
                        createPayableSaveInfoMutation.mutate({
                          description: entryDescription || currentTenant?.name || 'Conta a pagar',
                          gross_amount: amount,
                          net_amount: amount,
                          due_date: entryDueDate || new Date().toISOString().slice(0,10),
                          issue_date: entryIssueDate || new Date().toISOString().slice(0,10),
                          status: entryPaidConfirmed ? 'PAID' : 'PENDING',
                          payment_date: entryPaidConfirmed ? new Date().toISOString().slice(0,10) : null,
                          paid_amount: entryPaidConfirmed ? amount : null,
                          category_id: entryCategory || null,
                          entry_number: entryNumber || undefined,
                          document_id: entryDocumentId || null,
                          supplier_name: entrySupplier || null,
                          repeat: entryRepeat,
                        });
                      }}>Salvar informações</Button>
                    </div>
                    )}
                    {createModalTab === 'lancamentos' && createdEntry && (
                      <div className="mt-6">
                        <p className="text-sm text-muted-foreground">Lançamentos vinculados à conta { (createdEntry as any).entry_number } serão exibidos aqui.</p>
                      </div>
                    )}
                    {createModalTab === 'historico' && createdEntry && (
                      <div className="mt-6">
                        <p className="text-sm text-muted-foreground">Histórico de alterações da conta { (createdEntry as any).entry_number }.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {showFilters && (
          <AdvancedFilters
            filters={filters}
            setFilters={(updater) => setFilters(updater)}
            onApply={() => setFilters((p) => ({ ...p, page: 1 }))}
            onReset={resetFilters}
          />
        )}

        <Card>
          <CardContent>
            <ActionsBar selectedCount={selectedIds.length} onBulkMarkAsPaid={bulkMarkAsPaid} rightActions={<Button variant="outline" onClick={exportCsv}>Baixar planilha</Button>} />
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
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
            )}
          </CardContent>

          <PaginationFooter
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={(page) => handlePageChange(page)}
            onItemsPerPageChange={(perPage) => setPagination((p) => ({ ...p, limit: perPage, page: 1 }))}
            totals={totals}
          />
        </Card>

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
      </div>
    </Layout>
  );
};

export default ContasAPagar;

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Filter, Plus, Edit, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { Layout } from '@/components/layout/Layout';
import { financeEntriesService, type FinanceEntryFilters, type FinanceEntryResponse } from '@/services/financeEntriesService';
import type { Database } from '@/types/database';
import { useTenantAccessGuard, useSecureTenantQuery, useSecureTenantMutation } from '@/hooks/templates/useSecureTenantQuery';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PaginationFooter } from '@/components/layout/PaginationFooter';

// AIDEV-NOTE: Tipo para entrada financeira baseado no banco de dados
type FinanceEntry = Database['public']['Tables']['finance_entries']['Row'];
type FinanceEntryUpdate = Database['public']['Tables']['finance_entries']['Update'];

// AIDEV-NOTE: Interface para filtros de busca
interface RecebimentosFilters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  type: string;
  page: number;
}

// AIDEV-NOTE: Interface para dados de paginação
interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const Recebimentos: React.FC = () => {
  // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA (CAMADA 1)
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  // 🔍 AUDIT LOG OBRIGATÓRIO - Acesso à página
  useEffect(() => {
    if (hasAccess && currentTenant) {
      console.log(`🔍 [AUDIT] Página Recebimentos acessada - Tenant: ${currentTenant.name} (${currentTenant.id})`);
    }
  }, [hasAccess, currentTenant]);
  
  // 🚨 GUARD CLAUSE OBRIGATÓRIA - Bloquear renderização se não tiver acesso
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
  
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 0
  });
  
  // AIDEV-NOTE: Filtros com data padrão do mês atual para mostrar mais dados
  const [filters, setFilters] = useState<RecebimentosFilters>(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    return {
      search: '',
      status: 'all',
      dateFrom: firstDayOfMonth,
      dateTo: lastDayOfMonth,
      type: 'RECEIVABLE',
      page: 1
    };
  });
  
  const { toast } = useToast();
  const tableRef = useRef<HTMLDivElement | null>(null);

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(() => {
    const from = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const to = filters.dateTo ? new Date(filters.dateTo) : undefined;
    return { from, to };
  });

  const bankAccountsQuery = useSecureTenantQuery(
    ['bank-acounts', currentTenant?.id],
    async (supabase, tId) => {
      await supabase.rpc('set_tenant_context_simple', { p_tenant_id: tId });
      const { data, error } = await supabase
        .from('bank_acounts')
        .select('id, bank, agency, count, type, tenant_id')
        .eq('tenant_id', tId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((a: any) => ({ id: a.id, label: String(a.bank ?? 'Banco') }));
    },
    { enabled: !!currentTenant?.id }
  );

  const bankLabelById = useMemo(() => {
    const m = new Map<string, string>();
    (bankAccountsQuery.data || []).forEach((b: any) => m.set(b.id, b.label));
    return m;
  }, [bankAccountsQuery.data]);

  const [selectingEntryId, setSelectingEntryId] = useState<string | null>(null);

  const associateBankAccountMutation = useSecureTenantMutation(
    async (supabase, tenantId, { entryId, bankAccountId }: { entryId: string; bankAccountId: string }) => {
      const entry = recebimentos.find(r => r.id === entryId);
      if (!entry || entry.tenant_id !== tenantId) {
        throw new Error('Operação não autorizada');
      }
      const patch: FinanceEntryUpdate = { bank_account_id: bankAccountId };
      const updated = await financeEntriesService.updateEntry(entryId, patch);
      const amount = Number((entry as any).paid_amount ?? (entry as any).net_amount ?? (entry as any).amount ?? 0);
      const opDate = (entry as any).payment_date ?? new Date().toISOString();
      const { error } = await supabase
        .from('bank_operation_history')
        .insert({
          tenant_id: tenantId,
          bank_acount_id: bankAccountId,
          operation_type: 'CREDIT',
          amount: amount,
          operation_date: opDate,
          description: entry.description ?? 'Recebimento',
          document_reference: (entry as any).document_id ?? null,
          category: null,
        });
      if (error) throw error;
      return updated;
    },
    {
      onSuccess: () => {
        setSelectingEntryId(null);
        toast({ title: 'Conta associada', description: 'A conta bancária foi vinculada ao recebimento.' });
      },
      onError: (error) => {
        toast({ title: 'Erro', description: error.message || 'Falha ao associar conta', variant: 'destructive' });
      },
      invalidateQueries: ['recebimentos']
    }
  );



  // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID (CAMADA 3)
  const queryKey = useMemo(() => [
    'recebimentos',
    currentTenant?.id,
    filters.search,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.type,
    filters.page
  ], [currentTenant?.id, filters.search, filters.status, filters.dateFrom, filters.dateTo, filters.type, filters.page]);
  
  // 🔐 CONSULTA SEGURA COM VALIDAÇÃO MULTI-TENANT (CAMADA 2)
  const { data: recebimentosData, isLoading, error } = useSecureTenantQuery(
    queryKey,
    async (supabase, tenantId) => {
      // 🔍 AUDIT LOG para consulta de dados
      console.log(`🔍 [AUDIT] Buscando recebimentos para tenant: ${tenantId}`);
      console.log(`🔍 [AUDIT] Filtros aplicados:`, filters);
      
      // 🛡️ VALIDAÇÃO CRÍTICA: Verificar se tenantId corresponde ao currentTenant
      if (tenantId !== currentTenant?.id) {
        throw new Error(`🚨 VIOLAÇÃO DE SEGURANÇA: TenantId inconsistente! Query: ${tenantId}, Current: ${currentTenant?.id}`);
      }
      
      const params: FinanceEntryFilters = {
        tenant_id: tenantId, // 🔒 SEMPRE incluir tenant_id
        type: filters.type === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE',
        page: filters.page,
        limit: 15
      };

      if (filters.search) {
        params.search = filters.search;
      }

      if (filters.status && filters.status !== 'all') {
        params.status = filters.status as any;
      }

      if (filters.dateFrom) {
        params.start_date = filters.dateFrom;
      }

      if (filters.dateTo) {
        params.end_date = filters.dateTo;
      }
      
      const response: FinanceEntryResponse = await financeEntriesService.getEntriesPaginated(params);
      
      // 🔍 VALIDAÇÃO DUPLA DE DADOS (CAMADA 5)
      const invalidData = response.data?.filter(item => item.tenant_id !== tenantId);
      if (invalidData && invalidData.length > 0) {
        console.error(`🚨 [SECURITY VIOLATION] Dados de outro tenant detectados:`, invalidData);
        throw new Error(`🚨 VIOLAÇÃO DE SEGURANÇA: ${invalidData.length} registro(s) de outro tenant detectado(s)!`);
      }
      
      console.log(`✅ [AUDIT] ${response.data.length} recebimentos carregados com segurança para tenant: ${currentTenant?.name}`);
      
      return response;
    },
    {
      enabled: !!currentTenant?.id && hasAccess
    }
  );

  // 📊 DADOS SEGUROS EXTRAÍDOS DA CONSULTA
  const recebimentos = recebimentosData?.data || [];
  
  // 📄 ATUALIZAR PAGINAÇÃO QUANDO DADOS MUDAM
  useEffect(() => {
    if (recebimentosData) {
      setPagination({
        total: recebimentosData.total,
        page: recebimentosData.page,
        limit: recebimentosData.limit,
        totalPages: recebimentosData.totalPages
      });
    }
  }, [recebimentosData]);
  
  // 🚨 TRATAMENTO DE ERRO DE SEGURANÇA
  useEffect(() => {
    if (error) {
      console.error('🚨 [SECURITY ERROR] Erro na consulta segura:', error);
      toast({
        title: 'Erro de Segurança',
        description: error.message.includes('VIOLAÇÃO') ? 'Violação de segurança detectada!' : 'Erro ao carregar recebimentos',
        variant: 'destructive'
      });
    }
  }, [error, toast]);

  // AIDEV-NOTE: Função para mudar página
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // AIDEV-NOTE: Função para resetar filtros com mês atual
  const resetFilters = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    setFilters({
      search: '',
      status: 'all',
      dateFrom: firstDayOfMonth,
      dateTo: lastDayOfMonth,
      type: 'RECEIVABLE',
      page: 1
    });
  };

  // AIDEV-NOTE: Formata valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // AIDEV-NOTE: Retorna badge colorido baseado no status
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'Pendente', variant: 'secondary' as const },
      PAID: { label: 'Pago', variant: 'default' as const },
      OVERDUE: { label: 'Vencido', variant: 'destructive' as const },
      CANCELLED: { label: 'Cancelado', variant: 'outline' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 🔐 MUTAÇÃO SEGURA PARA MARCAR COMO PAGO
  const markAsPaidMutation = useSecureTenantMutation(
    async (supabase, tenantId, { entryId }: { entryId: string }) => {
      // 🔍 AUDIT LOG para operação crítica
      console.log(`🔍 [AUDIT] Marcando recebimento como pago - Entry: ${entryId}, Tenant: ${tenantId}`);
      
      // 🛡️ VALIDAÇÃO DUPLA: Verificar se o recebimento pertence ao tenant
      const entry = recebimentos.find(r => r.id === entryId);
      if (!entry || entry.tenant_id !== tenantId) {
        throw new Error(`🚨 VIOLAÇÃO DE SEGURANÇA: Tentativa de modificar recebimento de outro tenant!`);
      }
      
      return await financeEntriesService.registerPayment(entryId, {
        amount: 0,
        payment_date: new Date().toISOString(),
        payment_method: 'MANUAL'
      });
    },
    {
      onSuccess: () => {
        console.log(`✅ [AUDIT] Recebimento marcado como pago com sucesso para tenant: ${currentTenant?.name}`);
        toast({
          title: 'Sucesso',
          description: 'Recebimento marcado como pago'
        });
      },
      onError: (error) => {
        console.error('🚨 [SECURITY ERROR] Erro ao marcar como pago:', error);
        toast({
          title: 'Erro de Segurança',
          description: error.message.includes('VIOLAÇÃO') ? 'Operação não autorizada!' : 'Erro ao marcar recebimento como pago',
          variant: 'destructive'
        });
      },
      invalidateQueries: [
        'recebimentos',               // Página de recebimentos
        'contract_billing_periods',  // Histórico de recebimentos (RecebimentosHistorico)
        'charges'                    // Lista de cobranças relacionadas
      ]
    }
  );
  
  // AIDEV-NOTE: Função wrapper para marcar como pago
  const markAsPaid = (entryId: string) => {
    markAsPaidMutation.mutate({ entryId });
  };

  const handleExportCSV = useCallback(() => {
    const header = ['Descrição', 'Valor', 'Vencimento', 'Status', 'Conta', 'Data Pagamento'];
    const rows = recebimentos.map((e) => [
      e.description || '',
      (e.amount || 0).toString(),
      e.due_date ? new Date(e.due_date).toISOString().slice(0, 10) : '',
      e.status || '',
      e.bank_account_id ? (bankLabelById.get(String(e.bank_account_id)) || String(e.bank_account_id)) : '',
      e.payment_date ? new Date(e.payment_date).toISOString().slice(0, 10) : ''
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `recebimentos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast({ title: 'Exportado', description: 'CSV gerado com sucesso' });
  }, [recebimentos, toast]);

  const handleExportPDF = useCallback(async () => {
    if (!tableRef.current) return;
    const canvas = await html2canvas(tableRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.text('Recebimentos', 10, 10);
    pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, Math.min(imgHeight, pageHeight - 30));
    pdf.save(`recebimentos_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: 'Exportado', description: 'PDF gerado com sucesso' });
  }, [toast]);

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-4">
        <Card className="flex flex-col overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Recebimentos</CardTitle>
                  <CardDescription>Visualize e exporte recebimentos com filtros avançados</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExportCSV} className="gap-2">
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button onClick={handleExportPDF} className="gap-2">
                  <FileText className="h-4 w-4" /> PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 p-0 flex-1 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6 items-end">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Descrição..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="mt-2 w-full md:max-w-[300px]"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="mt-2 w-full md:max-w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEIVABLE">Recebimentos</SelectItem>
                    <SelectItem value="PAYABLE">Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="mt-2 w-full md:max-w-[240px]">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="PAID">Pago</SelectItem>
                    <SelectItem value="OVERDUE">Vencido</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Período</Label>
                <div className="mt-2 flex items-end gap-2 w-full md:max-w-[280px]">
                  <DateRangePicker
                    date={dateRange as any}
                    onDateChange={(range: any) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                        const fromStr = range.from.toISOString().slice(0, 10);
                        const toStr = range.to.toISOString().slice(0, 10);
                        setFilters(prev => ({ ...prev, dateFrom: fromStr, dateTo: toStr }));
                      }
                    }}
                  />
                  
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div ref={tableRef} className="border rounded-2xl">
                <ScrollArea className="max-h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead>Data Pagamento</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence initial={false}>
                        {recebimentos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhum {filters.type === 'RECEIVABLE' ? 'recebimento' : 'despesa'} encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          recebimentos.map((entry) => (
                            <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <TableCell className="font-medium">{entry.description}</TableCell>
                              <TableCell>{formatCurrency(entry.amount || 0)}</TableCell>
                              <TableCell>
                                {format(new Date(entry.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </TableCell>
                              <TableCell>{getStatusBadge(entry.status)}</TableCell>
                              <TableCell>
                                {entry.bank_account_id ? (
                                  bankLabelById.get(String(entry.bank_account_id)) || '-'
                                ) : (
                                  selectingEntryId === entry.id ? (
                                    <Select onValueChange={(value) => associateBankAccountMutation.mutate({ entryId: entry.id, bankAccountId: value })}>
                                      <SelectTrigger className="h-9 w-[220px]">
                                        <SelectValue placeholder={bankAccountsQuery.isLoading ? 'Carregando...' : 'Selecione a conta'} />
                                      </SelectTrigger>
                                      <SelectContent className="w-[300px] max-h-[300px]">
                                        {(bankAccountsQuery.data || []).map((b: any) => (
                                          <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Button size="sm" variant="outline" onClick={() => setSelectingEntryId(entry.id)} disabled={bankAccountsQuery.isLoading}>
                                      Associar Conta
                                    </Button>
                                  )
                                )}
                              </TableCell>
                              <TableCell>
                                {entry.payment_date
                                  ? format(new Date(entry.payment_date), 'dd/MM/yyyy', { locale: ptBR })
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {entry.status === 'PENDING' && (
                                    <Button size="sm" variant="outline" onClick={() => markAsPaid(entry.id)}>
                                      Marcar como Pago
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))
                        )}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
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
            />
          </div>
        </Card>
      </motion.div>
    </Layout>
  );
};

export default Recebimentos;

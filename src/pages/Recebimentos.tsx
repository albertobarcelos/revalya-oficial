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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PaginationFooter } from '@/components/layout/PaginationFooter';
import { RecebimentosFilters } from '@/components/recebimentos/RecebimentosFilters';
import { RecebimentosTable } from '@/components/recebimentos/RecebimentosTable';

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
  limit: number;
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
      page: 1,
      limit: 25
    };
  });
  
  const { toast } = useToast();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [iconHtml, setIconHtml] = useState<string>('');

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(() => {
    const from = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const to = filters.dateTo ? new Date(filters.dateTo) : undefined;
    return { from, to };
  });

  useEffect(() => {
    const linkId = 'finance-icon-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = '/images/Extrato_bancario/finance-styles.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/images/Extrato_bancario/finance-not-css.svg')
      .then((r) => r.text())
      .then((text) => {
        if (!active) return;
        setIconHtml(text);
      })
      .catch(() => {
        setIconHtml('');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const emptySvg = document.querySelector('.empty-icon #freepik_stories-finance') as SVGElement | null;
    if (emptySvg) {
      emptySvg.setAttribute('width', '100%');
      emptySvg.removeAttribute('height');
      emptySvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
  }, [iconHtml]);

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
      return (data || []).map((a: Database['public']['Tables']['bank_acounts']['Row']) => ({ id: a.id, label: String(a.bank ?? 'Banco') }));
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
      const amount = Number((entry as FinanceEntry).paid_amount ?? (entry as FinanceEntry).net_amount ?? (entry as FinanceEntry).amount ?? 0);
      const opDate = (entry as FinanceEntry).payment_date ?? new Date().toISOString();
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
    filters.page,
    filters.limit
  ], [currentTenant?.id, filters.search, filters.status, filters.dateFrom, filters.dateTo, filters.type, filters.page, filters.limit]);
  
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
        limit: filters.limit
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
      page: 1,
      limit: 25
    });
  };

  // AIDEV-NOTE: Formata valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col h-full p-4 md:p-6 pt-4 pb-0">
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="pb-2">
            <RecebimentosFilters
              filters={{ search: filters.search, status: filters.status, type: filters.type }}
              onFiltersChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                setDateRange(range);
                if (range?.from && range?.to) {
                  const fromStr = range.from.toISOString().slice(0, 10);
                  const toStr = range.to.toISOString().slice(0, 10);
                  setFilters(prev => ({ ...prev, dateFrom: fromStr, dateTo: toStr }));
                }
              }}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
            />
          </CardHeader>
          <CardContent className="pt-0 p-0 flex flex-col flex-1 min-h-0">

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div ref={tableRef} className="rounded-md border flex-1 flex flex-col min-h-0">
                {recebimentos.length === 0 ? (
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-12 px-4 empty-icon">
                    {iconHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: iconHtml }} className="mb-4 w-[260px] md:w-[320px] mx-auto" />
                    ) : null}
                    <div className="text-center text-muted-foreground">
                      <p className="text-body font-medium">Nenhum {filters.type === 'RECEIVABLE' ? 'recebimento' : 'despesa'} encontrado</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                    <RecebimentosTable
                      recebimentos={recebimentos}
                      bankLabelById={bankLabelById}
                      selectingEntryId={selectingEntryId}
                      setSelectingEntryId={setSelectingEntryId}
                      bankAccounts={(bankAccountsQuery.data || []) as any}
                      bankAccountsLoading={bankAccountsQuery.isLoading}
                      onAssociateBankAccount={(entryId, bankAccountId) =>
                        associateBankAccountMutation.mutate({ entryId, bankAccountId })
                      }
                      onMarkAsPaid={(entryId) => markAsPaid(entryId)}
                      formatCurrency={formatCurrency}
                    />
                  </div>
                )}
              </div>
            )}

          </CardContent>
          {!isLoading && pagination.total > 0 && (
            <div className="flex-shrink-0 border-t">
              <PaginationFooter
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={(page) => handlePageChange(page)}
                onItemsPerPageChange={(perPage) => setFilters((prev) => ({ ...prev, limit: perPage, page: 1 }))}
              />
            </div>
          )}
        </Card>
      </motion.div>
    </Layout>
  );
};

export default Recebimentos;

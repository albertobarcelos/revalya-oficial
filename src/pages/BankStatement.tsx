import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Separator } from '@/components/ui/separator';
import { PaginationFooter } from '@/components/layout/PaginationFooter';
import { useToast } from '@/components/ui/use-toast';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Download, FileText, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { buildBankStatementCsv, type StatementTransaction } from '@/utils/bankStatement';

type OperationType = 'ALL' | 'DEBIT' | 'CREDIT';

interface DateRangeValue {
  from?: Date;
  to?: Date;
}

interface BankAccountOption {
  id: string;
  label: string;
}

// Tipos movidos para utilitário para compatibilidade com Fast Refresh

/**
 * Retorna o período padrão do mês atual
 */
function getDefaultMonthRange(): DateRangeValue {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: first, to: last };
}

/**
 * Garante que o período seja válido; se inválido, redefine e notifica
 */
function ensureValidDateRange(range: DateRangeValue, onFix: (fixed: DateRangeValue) => void, notify: (title: string, description: string) => void) {
  const from = range.from?.getTime();
  const to = range.to?.getTime();
  if (from && to && from > to) {
    const fixed = getDefaultMonthRange();
    onFix(fixed);
    notify('Período inválido', 'Data inicial maior que a final. Período redefinido.');
  }
}

/**
 * Constrói a chave da query de extrato de forma determinística
 */
function buildStatementQueryKey(
  tenantId: string | undefined,
  accountId: string,
  opType: OperationType,
  range: DateRangeValue
) {
  return [
    'bank-statement',
    tenantId,
    accountId,
    opType,
    range.from?.toISOString().slice(0, 10),
    range.to?.toISOString().slice(0, 10)
  ];
}

/**
 * Ajusta atributos de SVG para tamanhos consistentes
 */
function adjustStatementIconSizing() {
  const headerSvg = document.querySelector('.header-icon svg') as SVGElement | null;
  if (headerSvg) {
    headerSvg.setAttribute('width', '24');
    headerSvg.setAttribute('height', '24');
    headerSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
  const emptySvg = document.querySelector('.empty-icon svg') as SVGElement | null;
  if (emptySvg) {
    emptySvg.setAttribute('width', '100%');
    emptySvg.removeAttribute('height');
    emptySvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
}

/**
 * Faz download de um SVG e retorna seu conteúdo HTML
 */
async function fetchIconHtml(url: string): Promise<string> {
  const r = await fetch(url);
  return await r.text();
}

/**
 * Calcula a paginação local
 */
function paginate<T>(items: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

/**
 * Soma saldos atuais a partir de linhas retornadas do banco
 */
function sumBalances(rows: Array<{ current_balance?: number | string | null }>): number {
  return rows.reduce<number>((acc, row) => {
    const value = row?.current_balance;
    const num = typeof value === 'number' ? value : Number((value as string | null) ?? 0);
    return acc + num;
  }, 0);
}

/**
 * Exporta o extrato em CSV
 * AIDEV-NOTE: Exportação client-side para compartilhamento rápido
 */
function exportCsv(transactions: StatementTransaction[], notify: (title: string, description: string) => void) {
  const csv = buildBankStatementCsv(transactions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `extrato_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  notify('Exportado', 'CSV gerado com sucesso');
}

/**
 * Exporta a tabela de extrato em PDF
 * AIDEV-NOTE: Usa html2canvas para snapshot do conteúdo renderizado
 */
async function exportPdf(tableEl: HTMLDivElement | null, notify: (title: string, description: string) => void) {
  if (!tableEl) return;
  const canvas = await html2canvas(tableEl);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.text('Extrato Bancário', 10, 10);
  pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, Math.min(imgHeight, pageHeight - 30));
  pdf.save(`extrato_${new Date().toISOString().slice(0, 10)}.pdf`);
  notify('Exportado', 'PDF gerado com sucesso');
}

/**
 * Inscreve-se em uma tabela multi-tenant e retorna função de cleanup
 * AIDEV-NOTE: Realtime mantém o extrato e saldo sempre atualizados
 */
function subscribeToTenantTable(tenantId: string, table: string, onChange: () => void) {
  const channel = supabase
    .channel(`${table}_${tenantId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter: `tenant_id=eq.${tenantId}` }, onChange)
    .subscribe();
  return () => { try { supabase.removeChannel(channel); } catch {} };
}

/**
 * Página de Extrato Bancário com filtros, saldo em tempo real e exportação
 */
export default function BankStatement() {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const { toast } = useToast();
  const iconContainerRef = useRef<HTMLDivElement | null>(null);
  const [iconHtml, setIconHtml] = useState<string>('');

  useEffect(() => {
    if (currentTenant?.id) {
      try { console.log(`[AUDIT] Página de Extrato acessada - Tenant: ${currentTenant.id}`); } catch {}
    }
  }, [currentTenant?.id]);

  // Ícone: usar o SVG de Recebimentos

  useEffect(() => {
    let active = true;
    fetchIconHtml('/images/recebimentos/data-report-animate.svg')
      .then((text) => { if (active) setIconHtml(text); })
      .catch(() => setIconHtml(''));
    return () => { active = false; };
  }, []);

  useEffect(() => { adjustStatementIconSizing(); }, [iconHtml]);

  /**
   * Valida se uma string é um UUID v4
   */
  const isUuid = useCallback((v: string | null | undefined) => {
    if (!v) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  }, []);

  // Filtros
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [operationType, setOperationType] = useState<OperationType>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => getDefaultMonthRange());

  const [accounts, setAccounts] = useState<BankAccountOption[]>([]);
  const tableRef = useRef<HTMLDivElement | null>(null);

  // Carregar contas bancárias
  const accountsQuery = useSecureTenantQuery(
    ['bank-statement-accounts'],
    async (client, tenantId) => {
      const { data, error } = await client
        .from('bank_acounts')
        .select('id, bank, agency, count, type')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        label: `${row.bank || 'Banco'}`
      })) as BankAccountOption[];
    },
    { enabled: !!currentTenant?.id }
  );

  useEffect(() => {
    if (accountsQuery.data) setAccounts([{ id: 'ALL', label: 'Todas as contas' }, ...accountsQuery.data]);
  }, [accountsQuery.data]);

  useEffect(() => {
    ensureValidDateRange(
      dateRange,
      (fixed) => setDateRange(fixed),
      (title, description) => toast({ title, description, variant: 'destructive' })
    );
  }, [dateRange.from, dateRange.to, toast]);

  // Query de transações do extrato
  const statementQueryKey = useMemo(() => (
    buildStatementQueryKey(currentTenant?.id, selectedAccountId, operationType, dateRange)
  ), [currentTenant?.id, selectedAccountId, operationType, dateRange.from, dateRange.to]);

  const statementQuery = useSecureTenantQuery(
    statementQueryKey,
    async (client, tenantId) => {
      const from = dateRange.from ? new Date(dateRange.from) : undefined;
      const to = dateRange.to ? new Date(dateRange.to) : undefined;
      const effectiveOp = operationType === 'CREDIT' || operationType === 'DEBIT' ? operationType : null;
      const accountParam = selectedAccountId === 'ALL' ? null : (isUuid(selectedAccountId) ? selectedAccountId : null);
      // AIDEV-NOTE: Contexto de tenant para garantir RLS e isolamento
      try { await client.rpc('set_tenant_context_simple', { p_tenant_id: tenantId }); } catch {}
      const { data, error } = await client.rpc('get_bank_statement', {
        p_tenant_id: tenantId,
        p_bank_acount_id: accountParam,
        p_start: from ? from.toISOString().slice(0, 10) : null,
        p_end: to ? to.toISOString().slice(0, 10) : null,
        p_operation_type: effectiveOp
      });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const safeRows = rows.filter((r: any) => !('tenant_id' in r) || r.tenant_id === tenantId);
      const mapped: StatementTransaction[] = safeRows.map((r: any) => ({
        id: r.id,
        date: r.operation_date,
        kind: r.operation_type,
        value: Number(r.amount || 0),
        description: r.description ?? null,
        account_label: r.bank_account_label ?? null,
        category: (r.category_name ?? r.category) ?? null,
        payment_method: r.document_type ?? null
      }));
      return operationType === 'ALL' ? mapped : mapped.filter(t => t.kind === operationType);
    },
    { enabled: !!currentTenant?.id }
  );

  const transactions = statementQuery.data || [];

  // Paginação local (padrão Produtos)
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalItems = transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedTransactions = useMemo(() => paginate(transactions, page, itemsPerPage), [transactions, page, itemsPerPage]);

  const balanceQueryKey = useMemo(() => [
    'bank-statement-balance',
    currentTenant?.id,
    selectedAccountId
  ], [currentTenant?.id, selectedAccountId]);

  const balanceQuery = useSecureTenantQuery(
    balanceQueryKey,
    async (client, tenantId) => {
      let q = client
        .from('bank_acounts')
        .select('current_balance')
        .eq('tenant_id', tenantId);

      if (selectedAccountId !== 'ALL') q = q.eq('id', selectedAccountId);

      const { data, error } = await q;
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return sumBalances(rows);
    },
    { enabled: !!currentTenant?.id }
  );

  const currentBalance = typeof balanceQuery.data === 'number' ? balanceQuery.data : 0;

  // Subscribe realtime
  useEffect(() => {
    if (!currentTenant?.id) return;
    // AIDEV-NOTE: Atualiza extrato em tempo real quando lançamentos mudam
    return subscribeToTenantTable(currentTenant.id, 'finance_entries', () => statementQuery.refetch?.());
  }, [currentTenant?.id, statementQuery.refetch]);

  useEffect(() => {
    if (!currentTenant?.id) return;
    // AIDEV-NOTE: Atualiza extrato quando contas a pagar variam
    return subscribeToTenantTable(currentTenant.id, 'financial_payables', () => statementQuery.refetch?.());
  }, [currentTenant?.id, statementQuery.refetch]);

  useEffect(() => {
    if (!currentTenant?.id) return;
    // AIDEV-NOTE: Mantém saldo sincronizado
    return subscribeToTenantTable(currentTenant.id, 'bank_acounts', () => balanceQuery.refetch?.());
  }, [currentTenant?.id, balanceQuery.refetch]);

  // Exportar CSV
  const handleExportCSV = useCallback(() => {
    exportCsv(transactions, (title, description) => toast({ title, description }));
  }, [transactions, toast]);

  // Exportar PDF
  const handleExportPDF = useCallback(async () => {
    await exportPdf(tableRef.current, (title, description) => toast({ title, description }));
  }, [toast]);

  // Render
  return (
    <Layout>
      {hasAccess ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col h-full p-4 md:p-6 pt-4 pb-0">
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-end justify-between gap-4 md:gap-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5 items-end flex-1 min-w-0">
                  <div>
                    <label className="text-sm font-medium">Conta Bancária</label>
                    <Select value={selectedAccountId} onValueChange={(v) => setSelectedAccountId(v)}>
                      <SelectTrigger className="mt-2 h-9 w-full md:w-[240px]">
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Período</label>
                    <div className="mt-2 w-full md:w-[240px]">
                      <DateRangePicker
                        date={dateRange as any}
                        onDateChange={(range: any) => {
                          if (range?.from && range?.to) {
                            setDateRange({ from: range.from, to: range.to } as DateRangeValue);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tipo de Operação</label>
                    <Select value={operationType} onValueChange={(v) => setOperationType(v as OperationType)}>
                      <SelectTrigger className="mt-2 h-9 w-full md:w-[240px]">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        <SelectItem value="DEBIT">Débitos</SelectItem>
                        <SelectItem value="CREDIT">Créditos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Saldo Atual</label>
                    <div className="mt-2 flex items-center gap-2">
                      {currentBalance >= 0 ? (
                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-lg font-semibold ${currentBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(Math.abs(currentBalance))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end">
                  <Button variant="outline" onClick={handleExportCSV} className="gap-2">
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button onClick={handleExportPDF} className="gap-2">
                    <FileText className="h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 p-0 flex flex-col flex-1 min-h-0">
              <Separator className="my-2" />

              {statementQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : totalItems === 0 ? (
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-12 px-4 rounded-md border empty-icon">
                  {iconHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: iconHtml }} className="mb-4 w-[260px] md:w-[320px] mx-auto" />
                  ) : null}
                  <div className="text-center text-muted-foreground">
                    <p className="text-body font-medium">Nenhuma movimentação encontrada</p>
                  </div>
                </div>
              ) : (
                <div ref={tableRef} className="rounded-md border flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Método</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence initial={false}>
                          {paginatedTransactions.map((t) => (
                            <StatementRow key={t.id} t={t} />
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
            {totalItems > 0 && (
              <div className="flex-shrink-0">
                <PaginationFooter
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>
            )}
          </Card>
        </motion.div>
      ) : (
        <div className="container mx-auto p-6">
          <div className="text-center py-10">
            <h1 className="text-2xl font-semibold text-destructive mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">{accessError || 'Você não tem permissão para acessar esta página.'}</p>
          </div>
        </div>
      )}
    </Layout>
  );
}

/**
 * Linha de extrato com ícones e formatação
 */
function StatementRow({ t }: { t: StatementTransaction }) {
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <TableCell>{new Date(t.date).toLocaleDateString('pt-BR')}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {t.kind === 'CREDIT' ? (
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          )}
          <Badge variant={t.kind === 'CREDIT' ? 'secondary' : 'destructive'}>
            {t.kind === 'CREDIT' ? 'Crédito' : 'Débito'}
          </Badge>
        </div>
      </TableCell>
      <TableCell className={`text-right ${t.kind === 'CREDIT' ? 'text-green-700' : t.kind === 'DEBIT' ? 'text-red-700' : ''}`}>{formatCurrency(t.value)}</TableCell>
      <TableCell>{t.description || '-'}</TableCell>
      <TableCell>{t.account_label || '-'}</TableCell>
      <TableCell>{t.category || '-'}</TableCell>
      <TableCell>{t.payment_method || '-'}</TableCell>
    </motion.tr>
  );
}

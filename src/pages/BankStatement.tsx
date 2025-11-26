import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaginationFooter } from '@/components/layout/PaginationFooter';
import { useToast } from '@/components/ui/use-toast';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Download, FileText, Landmark, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
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
 * Página de Extrato Bancário com filtros, saldo em tempo real e exportação
 */
export default function BankStatement() {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const { toast } = useToast();

  useEffect(() => {
    if (currentTenant?.id) {
      try { console.log(`[AUDIT] Página de Extrato acessada - Tenant: ${currentTenant.id}`); } catch {}
    }
  }, [currentTenant?.id]);

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
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: first, to: last };
  });

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
    const from = dateRange.from?.getTime();
    const to = dateRange.to?.getTime();
    if (from && to && from > to) {
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDateRange({ from: first, to: last });
      toast({ title: 'Período inválido', description: 'Data inicial maior que a final. Período redefinido.', variant: 'destructive' });
    }
  }, [dateRange.from, dateRange.to, toast]);

  // Query de transações do extrato
  const statementQueryKey = useMemo(() => [
    'bank-statement',
    currentTenant?.id,
    selectedAccountId,
    operationType,
    dateRange.from?.toISOString().slice(0, 10),
    dateRange.to?.toISOString().slice(0, 10)
  ], [currentTenant?.id, selectedAccountId, operationType, dateRange.from, dateRange.to]);

  const statementQuery = useSecureTenantQuery(
    statementQueryKey,
    async (client, tenantId) => {
      const from = dateRange.from ? new Date(dateRange.from) : undefined;
      const to = dateRange.to ? new Date(dateRange.to) : undefined;
      const effectiveOp = operationType === 'CREDIT' || operationType === 'DEBIT' ? operationType : null;
      const accountParam = selectedAccountId === 'ALL' ? null : (isUuid(selectedAccountId) ? selectedAccountId : null);
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
      const filtered = operationType === 'ALL' ? mapped : mapped.filter(t => t.kind === operationType);
      return filtered;
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

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return transactions.slice(start, end);
  }, [transactions, page, itemsPerPage]);

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

      if (selectedAccountId !== 'ALL') {
        q = q.eq('id', selectedAccountId);
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const sum = rows.reduce((acc, row) => {
        const value = (row as { current_balance?: unknown }).current_balance;
        const num = typeof value === 'number' ? value : Number((value as string | null) ?? 0);
        return acc + num;
      }, 0);
      return sum as number;
    },
    { enabled: !!currentTenant?.id }
  );

  const currentBalance = typeof balanceQuery.data === 'number' ? balanceQuery.data : 0;

  // Subscribe realtime
  useEffect(() => {
    if (!currentTenant?.id) return;
    const channel = supabase
      .channel(`finance_entries_statement_${currentTenant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_entries', filter: `tenant_id=eq.${currentTenant.id}` }, () => {
        // refetch
        statementQuery.refetch?.();
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [currentTenant?.id, statementQuery.refetch]);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const channel = supabase
      .channel(`financial_payables_statement_${currentTenant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_payables', filter: `tenant_id=eq.${currentTenant.id}` }, () => {
        statementQuery.refetch?.();
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [currentTenant?.id, statementQuery.refetch]);

  useEffect(() => {
    if (!currentTenant?.id) return;
    const channel = supabase
      .channel(`bank_accounts_balance_${currentTenant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_acounts', filter: `tenant_id=eq.${currentTenant.id}` }, () => {
        balanceQuery.refetch?.();
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [currentTenant?.id, balanceQuery.refetch]);

  // Exportar CSV
  const handleExportCSV = useCallback(() => {
    const csv = buildBankStatementCsv(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `extrato_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    toast({ title: 'Exportado', description: 'CSV gerado com sucesso' });
  }, [transactions, toast]);

  // Exportar PDF
  const handleExportPDF = useCallback(async () => {
    if (!tableRef.current) return;
    const canvas = await html2canvas(tableRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.text('Extrato Bancário', 10, 10);
    pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, Math.min(imgHeight, pageHeight - 30));
    pdf.save(`extrato_${new Date().toISOString().slice(0,10)}.pdf`);
    toast({ title: 'Exportado', description: 'PDF gerado com sucesso' });
  }, [toast]);

  // Render
  return (
    <Layout>
      {hasAccess ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-4">
          <Card className="flex flex-col overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Extrato Bancário</CardTitle>
                    <CardDescription>Visualize e exporte movimentações financeiras com filtros avançados</CardDescription>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end px-6">
                <div>
                  <label className="text-sm font-medium">Conta Bancária</label>
                  <Select value={selectedAccountId} onValueChange={(v) => setSelectedAccountId(v)}>
                    <SelectTrigger className="mt-2 w-full md:w-1/2 md:max-w-[240px]">
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
                  <div className="mt-2">
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
                    <SelectTrigger className="mt-2 w-full md:w-1/2 md:max-w-[240px]">
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

              <Separator className="my-4" />

              <div ref={tableRef} className="border rounded-2xl">
                <ScrollArea className="max-h-[60vh]">
                  <Table>
                    <TableHeader>
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
                        {paginatedTransactions.map(t => (
                          <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <TableCell>{new Date(t.date).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {t.kind === 'CREDIT' ? <ArrowUpCircle className="h-4 w-4 text-green-600" /> : <ArrowDownCircle className="h-4 w-4 text-red-600" />}
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
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
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
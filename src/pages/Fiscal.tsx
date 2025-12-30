/**
 * Página Fiscal
 * 
 * AIDEV-NOTE: Centraliza visualização e emissão de notas fiscais (NF-e e NFS-e)
 * Motor fiscal aplica regras automaticamente - usuário não escolhe tipo/valor
 * 
 * @module FiscalPage
 */

import { useState } from 'react';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, FileText, Download, Loader2 } from 'lucide-react';
import { useEmitProductInvoice, useEmitServiceInvoice } from '@/hooks/useFiscal';
import { formatCurrency } from '@/utils/financial';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * AIDEV-NOTE: Interface para linha da tabela fiscal
 */
interface FiscalTableRow {
  id: string;
  billing_period_id: string;
  charge_id?: string;
  customer_name: string;
  contract_number?: string;
  billing_number?: string;
  tipo: 'NFE' | 'NFSE';
  origem: 'PRODUTO' | 'SERVICO';
  valor: number;
  status: 'PENDENTE' | 'PROCESSANDO' | 'EMITIDA' | 'CANCELADA' | 'ERRO';
  fiscal_invoice_id?: string;
  pdf_url?: string;
  xml_url?: string;
  chave?: string;
  numero?: string;
}

export default function Fiscal() {
  // AIDEV-NOTE: Proteção multi-tenant obrigatória
  const { hasAccess, currentTenant, accessError } = useTenantAccessGuard();
  const [selectedInvoice, setSelectedInvoice] = useState<FiscalTableRow | null>(null);

  // AIDEV-NOTE: Query para buscar dados fiscais
  const { data: fiscalData, isLoading, refetch } = useSecureTenantQuery(
    ['fiscal', 'list'],
    async (supabaseClient, tenantId) => {
      // Buscar períodos faturados com itens
      const { data: periods, error: periodsError } = await supabaseClient
        .from('contract_billing_periods')
        .select(`
          id,
          status,
          customer_id,
          contract_id,
          customer:customers(name),
          contract:contracts(contract_number),
          items:billing_period_items(
            id,
            product_id,
            service_id,
            quantity,
            unit_price
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'BILLED')
        .order('bill_date', { ascending: false })
        .limit(100);

      if (periodsError) throw periodsError;

      // Buscar charges pagas
      const { data: charges, error: chargesError } = await supabaseClient
        .from('charges')
        .select(`
          id,
          status,
          valor,
          billing_periods,
          customer_id
        `)
        .eq('tenant_id', tenantId)
        .like('status', 'RECEIVED%')
        .order('data_pagamento', { ascending: false })
        .limit(100);

      if (chargesError) throw chargesError;

      // Buscar invoices já emitidas
      const { data: invoices, error: invoicesError } = await supabaseClient
        .from('fiscal_invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Montar linhas da tabela
      const rows: FiscalTableRow[] = [];

      // Linhas para períodos com produtos (NF-e)
      periods?.forEach(period => {
        const productItems = period.items?.filter((item: any) => item.product_id) || [];
        if (productItems.length === 0) return;

        const valor = productItems.reduce((sum: number, item: any) => {
          const qty = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.unit_price) || 0;
          return sum + (qty * price);
        }, 0);

        const existingInvoice = invoices?.find(
          inv => inv.billing_period_id === period.id && inv.tipo === 'NFE'
        );

        rows.push({
          id: `period_${period.id}`,
          billing_period_id: period.id,
          customer_name: (period.customer as any)?.name || 'Cliente não encontrado',
          contract_number: (period.contract as any)?.contract_number,
          tipo: 'NFE',
          origem: 'PRODUTO',
          valor,
          status: existingInvoice?.status || 'PENDENTE',
          fiscal_invoice_id: existingInvoice?.id,
          pdf_url: existingInvoice?.pdf_url,
          xml_url: existingInvoice?.xml_url,
          chave: existingInvoice?.chave,
          numero: existingInvoice?.numero
        });
      });

      // Linhas para charges com serviços (NFS-e)
      charges?.forEach(charge => {
        if (!charge.billing_periods) return;

        const period = periods?.find(p => p.id === charge.billing_periods);
        if (!period) return;

        const serviceItems = period.items?.filter((item: any) => item.service_id) || [];
        if (serviceItems.length === 0) return;

        const existingInvoice = invoices?.find(
          inv => inv.charge_id === charge.id && inv.tipo === 'NFSE'
        );

        rows.push({
          id: `charge_${charge.id}`,
          billing_period_id: charge.billing_periods,
          charge_id: charge.id,
          customer_name: (period.customer as any)?.name || 'Cliente não encontrado',
          contract_number: (period.contract as any)?.contract_number,
          tipo: 'NFSE',
          origem: 'SERVICO',
          valor: parseFloat(charge.valor) || 0,
          status: existingInvoice?.status || 'PENDENTE',
          fiscal_invoice_id: existingInvoice?.id,
          pdf_url: existingInvoice?.pdf_url,
          xml_url: existingInvoice?.xml_url,
          numero: existingInvoice?.numero
        });
      });

      return rows;
    },
    {
      enabled: hasAccess && !!currentTenant?.id,
      staleTime: 30 * 1000 // 30 segundos
    }
  );

  // Hooks de emissão
  const emitProductInvoice = useEmitProductInvoice();
  const emitServiceInvoice = useEmitServiceInvoice();

  // AIDEV-NOTE: Guard clause
  if (!hasAccess || accessError) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
              <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const handleEmitNFe = async (billingPeriodId: string) => {
    await emitProductInvoice.mutateAsync(billingPeriodId);
    await refetch();
  };

  const handleEmitNFSe = async (chargeId: string) => {
    await emitServiceInvoice.mutateAsync(chargeId);
    await refetch();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'PENDENTE': 'outline',
      'PROCESSANDO': 'secondary',
      'EMITIDA': 'default',
      'CANCELADA': 'secondary',
      'ERRO': 'destructive'
    };

    const labels: Record<string, string> = {
      'PENDENTE': 'Pendente',
      'PROCESSANDO': 'Processando',
      'EMITIDA': 'Emitida',
      'CANCELADA': 'Cancelada',
      'ERRO': 'Erro'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Módulo Fiscal
              </CardTitle>
              <CardDescription>
                Centralize a visualização e emissão de notas fiscais. O sistema aplica regras automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !fiscalData || fiscalData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma nota fiscal disponível para emissão.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Contrato/Faturamento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fiscalData.map((row) => {
                        const canEmitNFe = row.tipo === 'NFE' && row.status === 'PENDENTE';
                        const canEmitNFSe = row.tipo === 'NFSE' && row.status === 'PENDENTE' && row.charge_id;
                        const canView = row.status === 'EMITIDA';

                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">
                              {row.customer_name}
                            </TableCell>
                            <TableCell>
                              {row.contract_number || row.billing_number || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {row.tipo === 'NFE' ? 'NF-e' : 'NFS-e'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {row.origem === 'PRODUTO' ? 'Produto' : 'Serviço'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(row.valor)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(row.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {canEmitNFe && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleEmitNFe(row.billing_period_id)}
                                    disabled={emitProductInvoice.isPending}
                                  >
                                    {emitProductInvoice.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <FileText className="h-3 w-3 mr-1" />
                                    )}
                                    Emitir NF-e
                                  </Button>
                                )}
                                {canEmitNFSe && row.charge_id && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleEmitNFSe(row.charge_id!)}
                                    disabled={emitServiceInvoice.isPending}
                                  >
                                    {emitServiceInvoice.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <FileText className="h-3 w-3 mr-1" />
                                    )}
                                    Emitir NFS-e
                                  </Button>
                                )}
                                {canView && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedInvoice(row)}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Visualizar
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog para visualizar nota */}
          <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedInvoice?.tipo === 'NFE' ? 'NF-e' : 'NFS-e'} - {selectedInvoice?.numero || 'Sem número'}
                </DialogTitle>
                <DialogDescription>
                  Detalhes da nota fiscal emitida
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedInvoice?.chave && (
                  <div>
                    <p className="text-sm font-medium mb-1">Chave de Acesso:</p>
                    <p className="text-sm text-muted-foreground font-mono">{selectedInvoice.chave}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {selectedInvoice?.pdf_url && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedInvoice.pdf_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                  )}
                  {selectedInvoice?.xml_url && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedInvoice.xml_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar XML
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}


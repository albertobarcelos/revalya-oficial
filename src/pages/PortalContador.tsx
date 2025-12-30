/**
 * Página Portal do Contador
 * 
 * AIDEV-NOTE: Centraliza visualização e gestão de notas fiscais
 * Permite visualizar, filtrar, buscar, baixar XML/PDF, cancelar e reenviar emails
 * 
 * @module PortalContador
 */

import { useState } from 'react';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Mail,
  Search,
  FileText,
  X,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/utils/financial';
import { formatDate } from '@/lib/utils';
import type { FiscalInvoice } from '@/types/fiscal';

export default function PortalContador() {
  const { hasAccess, currentTenant, accessError } = useTenantAccessGuard();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // AIDEV-NOTE: Buscar notas fiscais do tenant
  const { data: invoices, isLoading, refetch } = useSecureTenantQuery<FiscalInvoice[]>(
    ['fiscal_invoices', 'portal', currentTenant?.id, statusFilter, typeFilter],
    async (supabaseClient, tenantId) => {
      let query = supabaseClient
        .from('fiscal_invoices')
        .select(`
          *,
          customer:customers(name, cpf_cnpj),
          contract:contracts(contract_number),
          billing_period:contract_billing_periods(id, bill_date)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // AIDEV-NOTE: Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('tipo', typeFilter);
      }

      // AIDEV-NOTE: Busca por chave, número ou cliente
      if (searchTerm) {
        query = query.or(`chave.ilike.%${searchTerm}%,numero.ilike.%${searchTerm}%,customer:customers.name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as FiscalInvoice[];
    },
    {
      enabled: hasAccess && !!currentTenant?.id,
      staleTime: 30 * 1000
    }
  );

  // AIDEV-NOTE: Early return se não tiver acesso
  if (!hasAccess) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">
                {accessError || 'Acesso negado'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = (invoice: FiscalInvoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    }
  };

  const handleDownloadXML = (invoice: FiscalInvoice) => {
    if (invoice.xml_url) {
      window.open(invoice.xml_url, '_blank');
    }
  };

  const handleResendEmail = async (invoice: FiscalInvoice) => {
    // TODO: Implementar reenvio de email via Edge Function
    console.log('Reenviar email para:', invoice);
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
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Portal do Contador</CardTitle>
              <CardDescription>
                Centralize a gestão de todas as notas fiscais emitidas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros e Busca */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por chave, número ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="PROCESSANDO">Processando</SelectItem>
                    <SelectItem value="EMITIDA">Emitida</SelectItem>
                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                    <SelectItem value="ERRO">Erro</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="NFE">NF-e</SelectItem>
                    <SelectItem value="NFSE">NFS-e</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabela de Notas Fiscais */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !invoices || invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma nota fiscal encontrada
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Chave</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            {formatDate(invoice.created_at)}
                          </TableCell>
                          <TableCell>
                            {(invoice as any).customer?.name || 'Cliente não encontrado'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {invoice.tipo === 'NFE' ? 'NF-e' : 'NFS-e'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {invoice.numero || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {invoice.chave ? (
                              <span className="truncate block max-w-[200px]" title={invoice.chave}>
                                {invoice.chave}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(invoice.valor)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(invoice.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              {invoice.status === 'EMITIDA' && (
                                <>
                                  {invoice.pdf_url && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDownloadPDF(invoice)}
                                      title="Baixar PDF"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {invoice.xml_url && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDownloadXML(invoice)}
                                      title="Baixar XML"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResendEmail(invoice)}
                                    title="Reenviar Email"
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


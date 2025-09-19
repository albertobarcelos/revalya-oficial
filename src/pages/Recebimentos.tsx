import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Filter, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { Layout } from '@/components/layout/Layout';
import { financeEntriesService, type FinanceEntryFilters, type FinanceEntryResponse } from '@/services/financeEntriesService';
import type { Database } from '@/types/database';
import { useTenantAccessGuard, useSecureTenantQuery, useSecureTenantMutation } from '@/hooks/templates/useSecureTenantQuery';

// AIDEV-NOTE: Tipo para entrada financeira baseado no banco de dados
type FinanceEntry = Database['public']['Tables']['finance_entries']['Row'];

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
      invalidateQueries: ['recebimentos']
    }
  );
  
  // AIDEV-NOTE: Função wrapper para marcar como pago
  const markAsPaid = (entryId: string) => {
    markAsPaidMutation.mutate({ entryId });
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recebimentos</h1>
            <p className="text-muted-foreground">
              Gerencie seus recebimentos e controle financeiro
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Recebimento
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Descrição..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="dateFrom">Data Inicial</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="dateTo">Data Final</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
              
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {filters.type === 'RECEIVABLE' ? 'Recebimentos' : 'Despesas'}
            </CardTitle>
            <CardDescription>
              {pagination.total} {filters.type === 'RECEIVABLE' ? 'recebimento(s)' : 'despesa(s)'} encontrado(s) - Página {pagination.page} de {pagination.totalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recebimentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum {filters.type === 'RECEIVABLE' ? 'recebimento' : 'despesa'} encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    recebimentos.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.description}</TableCell>
                        <TableCell>{formatCurrency(entry.amount || 0)}</TableCell>
                        <TableCell>
                          {format(new Date(entry.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell>
                          {entry.payment_date 
                            ? format(new Date(entry.payment_date), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {entry.status === 'PENDING' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsPaid(entry.id)}
                              >
                                Marcar como Pago
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
             )}
          </CardContent>
          
          {/* AIDEV-NOTE: Componente de paginação */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} resultados
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Anterior
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Recebimentos;

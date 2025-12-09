import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CreditCard, Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContractReceivables, FinanceEntry } from "@/hooks/useFinanceEntries";
import { useTenantAccessGuard, useSecureTenantQuery } from "@/hooks/templates/useSecureTenantQuery";
import { useCharges, type Charge } from "@/hooks/useCharges";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipo de recebimento (mock inicial - mantido para compatibilidade)
export interface Recebimento {
  id: string;
  data: string; // ISO date
  valor: number;
  status: string;
  parcelaAtual: number;
  totalParcelas: number;
  observacao?: string;
}

interface RecebimentosHistoricoProps {
  recebimentos?: Recebimento[]; // Mantido para compatibilidade
  onNovoRecebimento?: () => void;
  contractId?: string; // ID do contrato para buscar recebimentos reais
  showRealData?: boolean; // Flag para mostrar dados reais da finance_entries
}

/**
 * RecebimentosHistorico
 * Apresenta abas internas dentro da seção "Histórico" do contrato:
 * - Aba "Faturamentos & Recebimentos": períodos de faturamento e entradas financeiras
 * - Aba "Cobranças e Recebimentos": cobranças vinculadas ao contrato com status e valores
 */
export const RecebimentosHistorico: React.FC<RecebimentosHistoricoProps> = ({ 
  recebimentos = [], 
  onNovoRecebimento, 
  contractId,
  showRealData = false // Padrão alterado para false
}) => {
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO - PRIMEIRA LINHA SEMPRE
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  // AIDEV-NOTE: Hook para buscar dados reais de finance_entries (mantido para compatibilidade)
  const { 
    entries: financeEntries, 
    isLoading: financeLoading, 
    error: financeError,
    formatCurrency: formatEntryCurrency,
    statistics: financeStatistics
  } = useContractReceivables(showRealData ? contractId : undefined);
  
  // 🔐 CONSULTA SEGURA PARA BILLING PERIODS
  const {
    data: periods,
    isLoading: periodsLoading,
    error: periodsError,
    refetch
  } = useSecureTenantQuery(
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['contract_billing_periods', contractId, currentTenant?.id],
    async (supabase, tenantId) => {
      // 🛡️ CONFIGURAR CONTEXTO DE TENANT ANTES DA CONSULTA
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId 
      });

      // 🛡️ VERIFICAR SE O CONTRATO PERTENCE AO TENANT
      const { data: contractCheck, error: contractError } = await supabase
        .from('contracts')
        .select('id, tenant_id')
        .eq('id', contractId)
        .eq('tenant_id', tenantId)
        .single();

      if (contractError || !contractCheck) {
        throw new Error('Contrato não encontrado ou não pertence ao tenant atual');
      }

      // 🛡️ CONSULTA COM FILTRO OBRIGATÓRIO DE TENANT_ID
      const { data: billingPeriods, error: periodsError } = await supabase
        .from('contract_billing_periods')
        .select(`
          *,
          contracts!inner(
            id,
            tenant_id,
            customers!inner(
              id,
              name,
              tenant_id
            )
          )
        `)
        .eq('contract_id', contractId)
        .eq('tenant_id', tenantId)
        .order('period_start', { ascending: true });

      if (periodsError) throw periodsError;

      // Buscar charges para cada período
      const periodsWithCharges = await Promise.all(
        (billingPeriods || []).map(async (period) => {
          const { data: charges, error: chargesError } = await supabase
            .from('charges')
            .select('*')
            .eq('billing_periods', period.id)
            .eq('tenant_id', tenantId);

          if (chargesError) {
            console.warn(`Erro ao buscar charges para período ${period.id}:`, chargesError);
            return { ...period, charges: [] };
          }

          return { ...period, charges: charges || [] };
        })
      );

      return periodsWithCharges;
    },
    {
      // 🔒 SÓ EXECUTA SE TENANT VÁLIDO E DADOS REAIS SOLICITADOS
      enabled: hasAccess && showRealData && !!contractId && !!currentTenant?.id
    }
  );

  // Funções auxiliares para formatação (mantidas para compatibilidade)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // AIDEV-NOTE: Função corrigida para evitar problemas de timezone
  // Usa date-fns para garantir formatação correta das datas do banco
  const formatDate = (dateString: string) => {
    try {
      // parseISO trata corretamente strings de data ISO sem problemas de timezone
      const date = parseISO(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.warn('Erro ao formatar data:', dateString, error);
      // Fallback para o formato original em caso de erro
      return new Date(dateString).toLocaleDateString('pt-BR');
    }
  };

  /**
   * formatChargeType
   * Converte o tipo de cobrança para português para exibição
   */
  const formatChargeType = (type?: string) => {
    switch (type) {
      case 'CREDIT_CARD':
        return 'Cartão de Crédito';
      case 'BOLETO':
        return 'Boleto';
      case 'PIX':
        return 'PIX';
      case 'CASH':
        return 'Dinheiro';
      default:
        return type || '-';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      'PLANNED': 'PLANEJADO',
      'BILLED': 'FATURADO',
      'LATE': 'ATRASADO',
      'DUE_TODAY': 'FATURAR HOJE',
      'PENDING': 'PREVISÃO',
      'PAID': 'PAGO',
      'OVERDUE': 'VENCIDO',
      'CANCELLED': 'CANCELADO'
    };
    return statusLabels[status as keyof typeof statusLabels] || status;
  };

  /**
   * getStatusColor
   * Mapeia o status para classes semânticas do tema (dark-mode friendly).
   */
  const getStatusColor = (status: string) => {
    const statusColors = {
      PLANNED: 'bg-muted text-muted-foreground border-border',
      BILLED: 'bg-primary/10 text-primary border-primary/20',
      LATE: 'bg-danger/10 text-danger border-danger/20',
      DUE_TODAY: 'bg-warning/10 text-warning border-warning/20',
      PENDING: 'bg-warning/10 text-warning border-warning/20',
      PAID: 'bg-success/10 text-success border-success/20',
      OVERDUE: 'bg-danger/10 text-danger border-danger/20',
      CANCELLED: 'bg-muted text-muted-foreground border-border'
    } as Record<string, string>;
    return statusColors[status] || 'bg-muted text-muted-foreground border-border';
  };

  const statistics = {
    total: periods?.reduce((sum, period) => sum + (period.amount_billed || period.amount_planned || 0), 0) || 0,
    count: periods?.length || 0
  };

  // 🔍 LOGS DE SEGURANÇA E DEBUG
  console.log('🔐 [SECURITY] RecebimentosHistorico - Tenant Access:', {
    hasAccess,
    tenantId: currentTenant?.id,
    tenantName: currentTenant?.name,
    showRealData,
    contractId,
    periodsCount: periods?.length || 0,
    periodsLoading,
    periodsError: periodsError?.message
  });

  // AIDEV-NOTE: Decidir qual fonte de dados usar - priorizar períodos de faturamento
  const shouldUseBillingPeriods = showRealData && contractId && periods && periods.length > 0;
  const shouldUseFinanceEntries = showRealData && contractId && !shouldUseBillingPeriods && financeEntries && financeEntries.length > 0;
  
  const displayData = shouldUseBillingPeriods ? (periods || []) : (shouldUseFinanceEntries ? (financeEntries || []) : (recebimentos || []));
  const isLoading = periodsLoading || financeLoading;
  const error = periodsError || financeError;
  
  let dataType: 'billing_periods' | 'finance_entries' | 'mock' = 'mock';
  
  if (shouldUseBillingPeriods) {
    dataType = 'billing_periods';
  } else if (shouldUseFinanceEntries) {
    dataType = 'finance_entries';
  }

  /**
   * useCharges
   * Busca cobranças vinculadas ao contrato atual (aba Cobranças e Recebimentos)
   */
  const chargesQuery = useCharges({
    contractId: contractId,
    limit: 1000,
  });
  const { data: chargesData, isLoading: chargesLoading, error: chargesError } = chargesQuery;

  /**
   * Renderiza o status com badge colorido
   */
  const renderStatusBadge = (status: string, dataType: 'billing_periods' | 'finance_entries' | 'mock') => {
    let statusInfo;
    
    if (dataType === 'billing_periods') {
      // Usar as funções do hook para períodos de faturamento
      statusInfo = {
        label: getStatusLabel(status),
        color: getStatusColor(status)
      };
    } else {
      // Mapeamento para finance_entries e dados mock
      const statusColors = {
        Previsão: 'bg-muted text-muted-foreground border-border',
        PAID: 'bg-success/10 text-success border-success/20',
        PENDING: 'bg-warning/10 text-warning border-warning/20',
        OVERDUE: 'bg-danger/10 text-danger border-danger/20',
        PARTIALLY_PAID: 'bg-warning/10 text-warning border-warning/20',
        CANCELLED: 'bg-muted text-muted-foreground border-border',
        REFUNDED: 'bg-primary/10 text-primary border-primary/20',
        // Status antigos (compatibilidade)
        Pago: 'bg-success/10 text-success border-success/20',
        Pendente: 'bg-warning/10 text-warning border-warning/20',
        Vencido: 'bg-danger/10 text-danger border-danger/20',
      } as Record<string, string>;

      // Traduzir status em inglês para português
      const statusTranslations = {
        'PAID': 'Pago',
        'PENDING': 'Pendente',
        'OVERDUE': 'Vencido',
        'PARTIALLY_PAID': 'Pago Parcial',
        'CANCELLED': 'Cancelado',
        'REFUNDED': 'Reembolsado',
        'RECEIVED': 'Recebida',
        'RECEIVED_IN_CASH': 'Recebida (Dinheiro)',
        'RECEIVED_PIX': 'Recebida (PIX)',
        'RECEIVED_BOLETO': 'Recebida (Boleto)',
        'CONFIRMED': 'Confirmada',
        'BANK_PROCESSING': 'Em processamento',
        'FAILED': 'Falhou'
      };

      const translatedStatus = statusTranslations[status as keyof typeof statusTranslations] || status;
      
      statusInfo = {
        label: translatedStatus,
        color: statusColors[status as keyof typeof statusColors] || 'bg-muted text-muted-foreground border-border'
      };
    }

    return (
      <Badge 
        variant="outline" 
        className={statusInfo.color}
      >
        {statusInfo.label}
      </Badge>
    );
  };



  // 🚨 GUARD DE ACESSO OBRIGATÓRIO - EARLY RETURN
  if (!hasAccess) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Acesso negado: {accessError}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-2">
      <Tabs defaultValue="faturamentos" className="space-y-4">
        <TabsList className="justify-start">
          <TabsTrigger 
            value="faturamentos"
            className="flex items-center gap-2"
          >
            <Receipt className="h-4 w-4" />
            <span>Faturamentos & Recebimentos</span>
          </TabsTrigger>
          <TabsTrigger 
            value="cobrancas"
            className="flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            <span>Cobranças e Recebimentos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faturamentos" className="space-y-4 mt-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                {dataType === 'real' && (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    {financeEntries.length} recebimentos
                  </Badge>
                )}
                {dataType === 'real' && statistics.total > 0 && (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                    Total: {formatEntryCurrency(statistics.total)}
                  </Badge>
                )}
              </div>
            </CardHeader>

            {error && (
              <div className="px-6 pb-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <p className="text-sm text-destructive">
                    Erro ao carregar recebimentos: {error.message}
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {dataType === 'billing_periods' ? (
                      <>
                        <TableHead className="text-left">Período</TableHead>
                        <TableHead className="text-left">Data Faturamento</TableHead>
                        <TableHead className="text-left">Data Cobrança</TableHead>
                        <TableHead className="text-right">Valor Planejado</TableHead>
                        <TableHead className="text-right">Valor Faturado</TableHead>
                        <TableHead className="text-left">Status</TableHead>
                      </>
                    ) : dataType === 'finance_entries' ? (
                      <>
                        <TableHead className="text-left">Número</TableHead>
                        <TableHead className="text-left">Data Vencimento</TableHead>
                        <TableHead className="text-left">Data Pagamento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-left">Categoria</TableHead>
                        <TableHead className="text-left">Status</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-left">Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-left">Status</TableHead>
                        <TableHead className="text-right">Parcela</TableHead>
                        <TableHead className="text-left">Observação</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={dataType === 'mock' ? 6 : 7} className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span className="text-sm text-muted-foreground">Carregando...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !Array.isArray(displayData) || displayData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={dataType === 'mock' ? 6 : 7} className="text-center py-8">
                        <div className="text-gray-500 text-sm">
                          {dataType === 'billing_periods' 
                            ? 'Nenhum período de faturamento encontrado para este contrato'
                            : dataType === 'finance_entries'
                            ? 'Nenhum recebimento encontrado para este contrato' 
                            : 'Nenhum recebimento registrado ainda'
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayData.map((item) => {
                      if (dataType === 'billing_periods') {
                        const period = item;
                        return (
                          <TableRow key={period.id}>
                            <TableCell className="text-left">
                              {formatDate(period.period_start)} - {formatDate(period.period_end)}
                            </TableCell>
                            <TableCell className="text-left">
                              {formatDate(period.bill_date)}
                            </TableCell>
                            <TableCell className="text-left">
                              {period.billed_at ? formatDate(period.billed_at) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(period.amount_planned || 0)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(period.amount_billed || 0)}
                            </TableCell>
                            <TableCell className="text-left">{renderStatusBadge(period.status, dataType)}</TableCell>
                          </TableRow>
                        );
                      } else if (dataType === 'finance_entries') {
                        const entry = item as FinanceEntry;
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="text-left font-medium">{entry.entry_number}</TableCell>
                            <TableCell className="text-left">
                              {new Date(entry.due_date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-left">
                              {entry.payment_date 
                                ? new Date(entry.payment_date).toLocaleDateString('pt-BR')
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatEntryCurrency(entry.net_amount)}
                            </TableCell>
                            <TableCell className="text-left">{entry.category}</TableCell>
                            <TableCell className="text-left">{renderStatusBadge(entry.status, dataType)}</TableCell>
                          </TableRow>
                        );
                      } else {
                        const recebimento = item as Recebimento;
                        return (
                          <TableRow key={recebimento.id}>
                            <TableCell className="text-left">{new Date(recebimento.data).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(recebimento.valor)}</TableCell>
                            <TableCell className="text-left">{renderStatusBadge(recebimento.status, dataType)}</TableCell>
                            <TableCell className="text-right">{recebimento.parcelaAtual}/{recebimento.totalParcelas}</TableCell>
                            <TableCell className="text-left">{recebimento.observacao || '-'}</TableCell>
                          </TableRow>
                        );
                      }
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="cobrancas" className="space-y-4 mt-2">
          <Card>
            <CardHeader className="pb-2">
              {chargesError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <p className="text-sm text-destructive">
                    Erro ao carregar cobranças: {String(chargesError)}
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Descrição</TableHead>
                      <TableHead className="text-left">Tipo</TableHead>
                      <TableHead className="text-left">Vencimento</TableHead>
                      <TableHead className="text-left">Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-left">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chargesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span className="text-sm text-muted-foreground">Carregando...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !Array.isArray(chargesData) || chargesData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-gray-500 text-sm">
                            Nenhuma cobrança encontrada para este contrato
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (chargesData as Charge[]).map((charge: Charge) => (
                        <TableRow key={charge.id}>
                          <TableCell className="text-left">{charge.descricao || '-'}</TableCell>
                          <TableCell className="text-left">{formatChargeType(charge.tipo)}</TableCell>
                          <TableCell className="text-left">
                            {charge.data_vencimento ? format(new Date(charge.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                          </TableCell>
                          <TableCell className="text-left">
                            {charge.data_pagamento ? format(new Date(charge.data_pagamento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(charge.valor || 0)}</TableCell>
                          <TableCell className="text-left">
                            {renderStatusBadge(charge.status, 'finance_entries')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

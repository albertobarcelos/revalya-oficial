import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { useContractReceivables, FinanceEntry } from "@/hooks/useFinanceEntries";
import { useTenantAccessGuard, useSecureTenantQuery } from "@/hooks/templates/useSecureTenantQuery";
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

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      'PLANNED': 'PLANEJADO',
      'BILLED': 'FATURADO',
      'LATE': 'ATRASADO',
      'DUE_TODAY': 'FATURAR HOJE',
      'PENDING': 'PENDENTE',
      'PAID': 'PAGO',
      'OVERDUE': 'VENCIDO',
      'CANCELLED': 'CANCELADO'
    };
    return statusLabels[status as keyof typeof statusLabels] || status;
  };

  const getStatusColor = (status: string) => {
    const statusColors = {
      'PLANNED': 'bg-blue-100 text-blue-800 border-blue-200',
      'BILLED': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'LATE': 'bg-red-100 text-red-800 border-red-200',
      'DUE_TODAY': 'bg-orange-200 text-orange-800 border-orange-200',
      'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'PAID': 'bg-green-100 text-green-800 border-green-200',
      'OVERDUE': 'bg-red-100 text-red-800 border-red-200',
      'CANCELLED': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
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
        // Status das previsões
        'Previsão': 'bg-blue-100 text-blue-800 border-blue-200',
        // Status dos recebimentos reais (finance_entries)
        'PAID': 'bg-green-100 text-green-800 border-green-200',
        'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'OVERDUE': 'bg-red-100 text-red-800 border-red-200',
        'PARTIALLY_PAID': 'bg-orange-100 text-orange-800 border-orange-200',
        'CANCELLED': 'bg-gray-100 text-gray-800 border-gray-200',
        'REFUNDED': 'bg-purple-100 text-purple-800 border-purple-200',
        // Status antigos (compatibilidade)
        'Pago': 'bg-green-100 text-green-800 border-green-200',
        'Pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Vencido': 'bg-red-100 text-red-800 border-red-200',
      };

      // Traduzir status em inglês para português
      const statusTranslations = {
        'PAID': 'Pago',
        'PENDING': 'Pendente',
        'OVERDUE': 'Vencido',
        'PARTIALLY_PAID': 'Pago Parcial',
        'CANCELLED': 'Cancelado',
        'REFUNDED': 'Reembolsado'
      };

      const translatedStatus = statusTranslations[status as keyof typeof statusTranslations] || status;
      
      statusInfo = {
        label: translatedStatus,
        color: statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
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
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          {dataType === 'real' && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {financeEntries.length} recebimentos
            </Badge>
          )}

          {dataType === 'real' && statistics.total > 0 && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700">
              Total: {formatEntryCurrency(statistics.total)}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      {error && (
        <div className="px-6 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">
              Erro ao carregar recebimentos: {error.message}
            </p>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* AIDEV-NOTE: Cabeçalhos condicionais baseados no tipo de dados */}
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-500">Carregando...</span>
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
                  // Renderizar períodos de faturamento
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
                  // Renderizar recebimentos reais da finance_entries
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
                      <TableCell className="text-left">
                        {entry.contracts?.customers?.name || '-'}
                      </TableCell>
                    </TableRow>
                  );

                } else {
                  // Renderizar recebimentos históricos (formato antigo)
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
  );
};

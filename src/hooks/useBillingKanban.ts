import { useState, useCallback } from 'react';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { format, startOfMonth, endOfMonth, addDays, isToday, isBefore, isAfter } from 'date-fns';

// AIDEV-NOTE: Interface atualizada para refletir dados da VIEW billing_kanban corrigida
// AIDEV-NOTE: contract_id agora pode ser NULL para suportar faturamentos avulsos
// AIDEV-NOTE: id é o period_id (ID do contract_billing_periods), adicionado alias para clareza
export interface KanbanContract {
  /** ID do período de faturamento (contract_billing_periods.id) - alias: period_id */
  id: string;
  /** Alias para 'id' - ID do período de faturamento para maior clareza semântica */
  period_id?: string;
  /** ID do contrato associado - pode ser NULL para faturamentos avulsos */
  contract_id: string | null;
  customer_id: string;
  customer_name: string;
  contract_number: string;
  /** Número da Ordem de Serviço (sequencial: 001, 002, ...) - pode ser NULL */
  order_number?: string | null;
  amount: number;
  status: 'Faturar Hoje' | 'Faturamento Pendente' | 'Faturados no Mês' | 'Contratos a Renovar';
  bill_date: string;
  billed_at?: string;
  period_start: string;
  period_end: string;
  amount_planned: number;
  amount_billed?: number;
  billing_status: string;
  priority: string;
  kanban_column: string;
  /** Indica se é um faturamento avulso (standalone) */
  is_standalone?: boolean;
}

export interface KanbanData {
  'faturar-hoje': KanbanContract[];
  'pendente': KanbanContract[];
  'faturados': KanbanContract[];
  'renovar': KanbanContract[];
}

// AIDEV-NOTE: Função para invalidar cache relacionado ao kanban de faturamento
const invalidateBillingCache = (tenantId: string) => {
  // Invalidar todas as queries relacionadas ao kanban de faturamento
  queryClient.invalidateQueries({ 
    queryKey: ['billing_kanban', tenantId] 
  });
  
  // Invalidar queries relacionadas que podem afetar o kanban
  queryClient.invalidateQueries({ 
    queryKey: ['contracts', tenantId] 
  });
  
  queryClient.invalidateQueries({ 
    queryKey: ['billing_periods', tenantId] 
  });
  
  queryClient.invalidateQueries({ 
    queryKey: ['contract_billing_periods', tenantId] 
  });
  
  queryClient.invalidateQueries({ 
    queryKey: ['charges', tenantId] 
  });
  
  queryClient.invalidateQueries({ 
    queryKey: ['recebimentos', tenantId] 
  });
  
  console.log('🔄 Cache invalidado para tenant:', tenantId);
};

/**
 * Categoriza o registro em colunas do kanban com regras mutuamente exclusivas.
 * Prioriza cálculo por `bill_date` e `status`, evitando sobreposição entre "Faturar Hoje" e "Pendente".
 */
const categorizeRecord = (record: { bill_date: string; status?: string; kanban_column?: string }): string => {
  const now = new Date();
  
  // AIDEV-NOTE: Correção de fuso horário na análise da data
  // Datas no formato YYYY-MM-DD são interpretadas como UTC pelo construtor Date(),
  // o que pode causar deslocamento de dia dependendo do fuso horário local.
  // Forçamos a interpretação como data local usando os componentes da data.
  let bill: Date;
  if (record.bill_date && record.bill_date.includes('T')) {
    // Se já tem hora (ISO), usa o construtor padrão
    bill = new Date(record.bill_date);
  } else if (record.bill_date) {
    // Se é apenas data (YYYY-MM-DD), constrói data local ao meio-dia para evitar problemas de virada de dia
    const [year, month, day] = record.bill_date.split('-').map(Number);
    bill = new Date(year, month - 1, day, 12, 0, 0);
  } else {
    // Fallback para data atual se inválido (não deve acontecer)
    bill = new Date();
  }

  if (record.status === 'BILLED') return 'faturados';
  if (record.status === 'EXPIRED') return 'renovar';
  // AIDEV-NOTE: Se o backend já marcou como DUE_TODAY, respeitar
  if (record.status === 'DUE_TODAY') return 'faturar-hoje';

  // AIDEV-NOTE: Verificar se já foi faturado verificando campos auxiliares
  // Caso billed_at ou amount_billed estejam preenchidos, considerar como faturado
  // Isso resolve casos onde o status pode não estar sincronizado na view
  if (record.billed_at || (record.amount_billed && record.amount_billed > 0)) {
    return 'faturados';
  }

  const isSameDay = bill.getFullYear() === now.getFullYear() && bill.getMonth() === now.getMonth() && bill.getDate() === now.getDate();
  if (isSameDay) return 'faturar-hoje';

  // Comparar datas zerando horas para evitar erros de precisão
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const billStart = new Date(bill.getFullYear(), bill.getMonth(), bill.getDate());

  if (billStart < todayStart) return 'pendente';

  // Futuro: não classificar como pendente aqui; manter como pendente apenas se não houver período "hoje" para o mesmo contrato (tratado após agrupamento)
  return 'pendente';
};

// AIDEV-NOTE: Função auxiliar para mapear categoria para status label
const getStatusLabel = (category: string): KanbanContract['status'] => {
  switch (category) {
    case 'faturar-hoje':
      return 'Faturar Hoje';
    case 'pendente':
      return 'Faturamento Pendente';
    case 'faturados':
      return 'Faturados no Mês';
    case 'renovar':
      return 'Contratos a Renovar';
    default:
      return 'Faturamento Pendente';
  }
};

// AIDEV-NOTE: Hook seguro para usar a VIEW billing_kanban seguindo padrões obrigatórios
export function useBillingKanban() {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  
  // AIDEV-NOTE: Query segura usando useSecureTenantQuery conforme guia de segurança
  // Configurações otimizadas para sincronização em tempo real
  const {
    data: kanbanData,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    ['billing_kanban', currentTenant?.id], // Query key padronizada conforme guia
    async (supabase, tenantId) => {
      // AIDEV-NOTE: CAMADA 4 - Configuração explícita de contexto de tenant (OBRIGATÓRIO)
      try {
        await supabase.rpc('set_tenant_context_simple', { 
          p_tenant_id: tenantId 
        });
        console.log('🛡️ [SECURITY] Contexto de tenant configurado no useBillingKanban:', tenantId);
      } catch (contextError) {
        console.error('❌ [SECURITY] Falha ao configurar contexto de tenant no useBillingKanban:', contextError);
        throw new Error('Falha na configuração de segurança. Tente novamente.');
      }

      // AIDEV-NOTE: Usar nova função RPC get_billing_kanban que substitui a view problemática
      // Esta função resolve o erro "unrecognized configuration parameter app.current_tenant_id"
      const { data: billingKanbanData, error: kanbanError } = await supabase
        .rpc('get_billing_kanban', { p_tenant_id: tenantId });

      if (kanbanError) {
        console.error('❌ Erro na função RPC get_billing_kanban:', kanbanError);
        throw new Error(`Erro ao buscar dados do kanban: ${kanbanError.message}`);
      }

      // AIDEV-NOTE: CAMADA 5 - Validação dupla dos dados retornados (OBRIGATÓRIO)
      if (billingKanbanData && billingKanbanData.length > 0) {
        const invalidRecords = billingKanbanData.filter((record: { tenant_id?: string }) => 
          record.tenant_id && record.tenant_id !== tenantId
        );
        
        if (invalidRecords.length > 0) {
          console.error('🚨 [SECURITY] VIOLAÇÃO DE SEGURANÇA - Dados de tenant incorreto no useBillingKanban:', {
            expected: tenantId,
            invalidRecords: invalidRecords.map(r => ({ id: r.id, tenant_id: r.tenant_id }))
          });
          throw new Error('Violação de segurança detectada. Operação cancelada.');
        }
      }

      console.log('✅ Dados carregados da função RPC:', billingKanbanData?.length || 0, 'registros');

      // AIDEV-NOTE: Debug temporário - verificar dados retornados
      if (billingKanbanData && billingKanbanData.length > 0) {
        console.log('🔍 [DEBUG] Primeiro registro da RPC:', billingKanbanData[0]);
        console.log('🔍 [DEBUG] Campos amount disponíveis:', {
          amount: billingKanbanData[0]?.amount,
          amount_planned: billingKanbanData[0]?.amount_planned,
          amount_billed: billingKanbanData[0]?.amount_billed
        });
        console.log('🔍 [DEBUG] order_number disponível?', {
          order_number: billingKanbanData[0]?.order_number,
          has_order_number: !!billingKanbanData[0]?.order_number
        });
      }

      // AIDEV-NOTE: Agrupar dados por categoria
      const groupedData: KanbanData = {
        'faturar-hoje': [],
        'pendente': [],
        'faturados': [],
        'renovar': []
      };

      // AIDEV-NOTE: Carregar descontos e status dos contratos em lote
      const contractIds: string[] = Array.from(new Set((billingKanbanData || [])
        .map((row: any) => row.contract_id)
        .filter((id: string | null) => !!id))) as string[];

      const discountMap = new Map<string, number>();
      const statusMap = new Map<string, string>();

      if (contractIds.length > 0) {
        try {
          const { data: contractsData, error: contractsError } = await supabase
            .from('contracts')
            .select('id, total_discount, status')
            .in('id', contractIds)
            .eq('tenant_id', tenantId);

          if (contractsError) {
            console.warn('[useBillingKanban] Erro ao buscar dados dos contratos:', contractsError);
          } else if (contractsData) {
            contractsData.forEach((c: { id: string; total_discount?: number; status?: string }) => {
              discountMap.set(c.id, c.total_discount || 0);
              if (c.status) statusMap.set(c.id, c.status);
            });
            console.log('✅ [DEBUG] Dados carregados para', contractsData.length, 'contratos');
          }
        } catch (error) {
          console.warn('[useBillingKanban] Exceção ao carregar dados dos contratos:', error);
        }
      }

      // AIDEV-NOTE: Separar períodos que precisam buscar order_number
      const periodsNeedingOrderNumber: string[] = [];
      const standalonePeriodsNeedingOrderNumber: string[] = [];
      const contractsMap = new Map<string, KanbanContract>();

      // AIDEV-NOTE: Processar cada registro da VIEW e categorizar
      (billingKanbanData || []).forEach(row => {
        // AIDEV-NOTE: Filtrar contratos suspensos ou cancelados
        if (row.contract_id) {
          const contractStatus = statusMap.get(row.contract_id);
          if (contractStatus === 'SUSPENDED' || contractStatus === 'CANCELED' || contractStatus === 'Suspenso' || contractStatus === 'Cancelado') {
            console.log(`🚫 [KANBAN] Ignorando contrato ${contractStatus}:`, row.contract_id);
            return; // Pular este registro
          }
        }

        const category = categorizeRecord(row);
        
        // AIDEV-NOTE: Debug temporário - verificar valores antes de criar o contrato
        console.log('🔍 [DEBUG] Processando registro:', {
          customer_name: row.customer_name,
          amount: row.amount,
          amount_planned: row.amount_planned,
          amount_billed: row.amount_billed,
          category,
          order_number: row.order_number
        });
        
        // AIDEV-NOTE: Criar objeto KanbanContract com nomenclatura clara
        // id e period_id são o mesmo valor (ID do contract_billing_periods)
        const isStandalone = !row.contract_id;
        const baseAmount = row.amount ?? row.amount_planned ?? 0;
        const contractDiscount = !isStandalone && row.contract_id ? (discountMap.get(row.contract_id) || 0) : 0;
        const isPendingOrDue = category === 'faturar-hoje' || category === 'pendente';
        const computedAmount = isPendingOrDue ? Math.max(baseAmount - contractDiscount, 0) : baseAmount;
        const contract: KanbanContract = {
          id: row.id,
          period_id: row.id, // AIDEV-NOTE: Alias explícito para clareza semântica
          contract_id: row.contract_id || null, // AIDEV-NOTE: Pode ser NULL para faturamentos avulsos
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          contract_number: row.contract_number || 'Faturamento Avulso', // AIDEV-NOTE: Fallback para avulsos
          order_number: row.order_number || null, // AIDEV-NOTE: Número da Ordem de Serviço (pode ser NULL)
          amount: computedAmount, // AIDEV-NOTE: Valor líquido considerando desconto geral do contrato para pendentes/hoje
          status: getStatusLabel(category),
          bill_date: row.bill_date,
          billed_at: row.billed_at,
          period_start: row.period_start,
          period_end: row.period_end,
          amount_planned: row.amount_planned,
          amount_billed: row.amount_billed,
          billing_status: row.billing_status,
          priority: row.priority,
          kanban_column: row.kanban_column,
          is_standalone: isStandalone, // AIDEV-NOTE: Flag para identificar faturamentos avulsos
        };

        // AIDEV-NOTE: Se não tem order_number, buscar depois (tanto para contratos quanto standalone)
        if (!contract.order_number) {
          if (isStandalone) {
            standalonePeriodsNeedingOrderNumber.push(row.id);
          } else if (contract.contract_id) {
            periodsNeedingOrderNumber.push(row.id);
          }
        }

        contractsMap.set(row.id, contract);
        groupedData[category as keyof KanbanData].push(contract);
      });

      // Remover registros futuros da coluna pendente quando existir um período "Faturar Hoje" para o mesmo contrato
      const today = new Date();
      const dueTodayContractIds = new Set(
        (groupedData['faturar-hoje'] || [])
          .map(c => c.contract_id)
          .filter((id): id is string => !!id)
      );

      groupedData['pendente'] = (groupedData['pendente'] || []).filter(c => {
        if (!c.contract_id) return true; // manter avulsos
        const bill = new Date(c.bill_date);
        const isFuture = bill > new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (isFuture && dueTodayContractIds.has(c.contract_id)) {
          return false; // evitar duplicação visual: mantém apenas o "hoje"
        }
        return true;
      });

      // AIDEV-NOTE: Buscar order_number em lote para períodos de contratos que não têm
      if (periodsNeedingOrderNumber.length > 0) {
        console.log(`🔍 [DEBUG] Buscando order_number para ${periodsNeedingOrderNumber.length} períodos de contratos...`);
        
        try {
          const { data: periodsWithOrderNumber, error: orderNumberError } = await supabase
            .from('contract_billing_periods')
            .select('id, order_number')
            .in('id', periodsNeedingOrderNumber)
            .eq('tenant_id', tenantId);

          if (!orderNumberError && periodsWithOrderNumber) {
            // AIDEV-NOTE: Atualizar contracts com order_number encontrado
            periodsWithOrderNumber.forEach((period: { id: string; order_number: string | null }) => {
              const contract = contractsMap.get(period.id);
              if (contract && period.order_number) {
                contract.order_number = period.order_number;
                console.log(`✅ [DEBUG] order_number encontrado para período ${period.id}: ${period.order_number}`);
              }
            });
          } else if (orderNumberError) {
            console.warn('[useBillingKanban] Erro ao buscar order_number de contratos:', orderNumberError);
          }
        } catch (error) {
          console.warn('[useBillingKanban] Erro ao buscar order_number em lote:', error);
        }
      }

      // AIDEV-NOTE: Buscar order_number em lote para períodos standalone que não têm
      // AIDEV-NOTE: Agora usa a tabela unificada contract_billing_periods com is_standalone=true
      if (standalonePeriodsNeedingOrderNumber.length > 0) {
        console.log(`🔍 [DEBUG] Buscando order_number para ${standalonePeriodsNeedingOrderNumber.length} períodos standalone...`);
        
        try {
          // AIDEV-NOTE: Buscar na tabela unificada contract_billing_periods
          const { data: standalonePeriodsWithOrderNumber, error: standaloneOrderNumberError } = await supabase
            .from('contract_billing_periods')
            .select('id, order_number')
            .in('id', standalonePeriodsNeedingOrderNumber)
            .eq('tenant_id', tenantId)
            .eq('is_standalone', true); // AIDEV-NOTE: Filtrar apenas standalone

          if (!standaloneOrderNumberError && standalonePeriodsWithOrderNumber) {
            // AIDEV-NOTE: Atualizar contracts com order_number encontrado
            standalonePeriodsWithOrderNumber.forEach((period: { id: string; order_number: string | null }) => {
              const contract = contractsMap.get(period.id);
              if (contract && period.order_number) {
                contract.order_number = period.order_number;
                console.log(`✅ [DEBUG] order_number encontrado para período standalone ${period.id}: ${period.order_number}`);
              }
            });
          } else if (standaloneOrderNumberError) {
            console.warn('[useBillingKanban] Erro ao buscar order_number de standalone:', standaloneOrderNumberError);
          }
        } catch (error) {
          console.warn('[useBillingKanban] Erro ao buscar order_number standalone em lote:', error);
        }
      }

      return groupedData;
    },
    {
      // AIDEV-NOTE: Configurações otimizadas para sincronização em tempo real
      staleTime: 30 * 1000, // 30 segundos - dados mais frescos
      gcTime: 2 * 60 * 1000, // 2 minutos de cache
      refetchOnWindowFocus: true, // Reativar para sincronização automática
      refetchInterval: 60 * 1000, // Refetch automático a cada 1 minuto
      refetchIntervalInBackground: false, // Não refetch em background
    }
  );

  // AIDEV-NOTE: Fallback para dados vazios quando não há acesso
  const safeKanbanData = kanbanData || {
    'faturar-hoje': [],
    'pendente': [],
    'faturados': [],
    'renovar': []
  };

  /**
   * AIDEV-NOTE: Função para mapear status do período para status do componente
   */
  const mapKanbanColumnToStatus = (periodStatus: string): KanbanContract['status'] => {
    switch (periodStatus) {
      case 'DUE_TODAY':
        return 'Faturar Hoje';
      case 'PENDING':
      case 'LATE':
        return 'Faturamento Pendente';
      case 'BILLED':
        return 'Faturados no Mês';
      case 'EXPIRED':
        return 'Contratos a Renovar';
      default:
        return 'Faturamento Pendente'; // Fallback
    }
  };

  // AIDEV-NOTE: Função para recarregar dados usando refetch do useSecureTenantQuery
  const loadKanbanData = useCallback(async () => {
    console.log('🚀 [DEBUG] loadKanbanData chamado via refetch');
    await refetch();
  }, [refetch]);

  /**
   * AIDEV-NOTE: Função para marcar período como faturado
   * Usa a nova função SQL mark_period_billed com invalidação global de cache
   */
  const markPeriodBilled = useCallback(async (periodId: string, reason: string = 'Período faturado via Kanban') => {
    if (!currentTenant?.id || !periodId) return;

    try {
      console.log('💰 Marcando período como faturado:', { periodId, reason });

      // AIDEV-NOTE: Usar query segura para operações de mutação
      const { data, error } = await supabase.rpc('mark_period_billed', {
        p_billing_period_id: periodId,
        p_actor: currentTenant.id,
        p_reason: reason
      });

      if (error) {
        throw new Error(`Erro ao marcar período como faturado: ${error.message}`);
      }

      console.log('✅ Período marcado como faturado:', data);
      
      // AIDEV-NOTE: Invalidação global de cache para sincronização automática
      invalidateBillingCache(currentTenant.id);
      
      return { success: true, data };
    } catch (err) {
      console.error('❌ Erro ao marcar período como faturado:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  }, [currentTenant?.id]);

  /**
   * AIDEV-NOTE: Função para pular período
   * Usa a nova função SQL skip_period com invalidação global de cache
   */
  const skipPeriod = useCallback(async (periodId: string, reason: string = 'Período pulado via Kanban') => {
    if (!currentTenant?.id || !periodId) return;

    try {
      console.log('⏭️ Pulando período:', { periodId, reason });

      // AIDEV-NOTE: Usar query segura para operações de mutação
      const { data, error } = await supabase.rpc('skip_period', {
        p_billing_period_id: periodId,
        p_actor: currentTenant.id,
        p_reason: reason
      });

      if (error) {
        throw new Error(`Erro ao pular período: ${error.message}`);
      }

      console.log('✅ Período pulado:', data);
      
      // AIDEV-NOTE: Invalidação global de cache para sincronização automática
      invalidateBillingCache(currentTenant.id);
      
      return { success: true, data };
    } catch (err) {
      console.error('❌ Erro ao pular período:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  }, [currentTenant?.id]);

  /**
   * AIDEV-NOTE: Função atualizada para trabalhar com períodos usando queries seguras
   * Mantém compatibilidade com o componente existente com invalidação global
   */
  const updateContractStatus = useCallback(async (contractId: string, chargeId: string | undefined, newStatus: string) => {
    if (!currentTenant?.id) return;

    try {
      console.log('🔄 Atualizando status do contrato:', { contractId, chargeId, newStatus });

      if (newStatus === 'RECEIVED') {
        // AIDEV-NOTE: Se há chargeId, atualizar a charge usando query segura
        if (chargeId) {
          const { error } = await supabase
            .from('charges')
            .update({ 
               status: 'RECEIVED'
             })
            .eq('id', chargeId)
            .eq('tenant_id', currentTenant.id); // Garantir isolamento de tenant

          if (error) {
            throw new Error(`Erro ao atualizar status da cobrança: ${error.message}`);
          }
        }
        
        // AIDEV-NOTE: Buscar período correspondente usando query segura
        const { data: periods, error: periodError } = await supabase
          .from('contract_billing_periods')
          .select('id')
          .eq('contract_id', contractId)
          .eq('tenant_id', currentTenant.id)
          .in('status', ['PENDING', 'DUE_TODAY', 'LATE'])
          .order('bill_date', { ascending: true })
          .limit(1);

        if (periodError) {
          console.warn('Erro ao buscar período para marcar como faturado:', periodError);
        } else if (periods && periods.length > 0) {
          await markPeriodBilled(periods[0].id, 'Marcado como pago via drag & drop');
        }
      }
      
      // AIDEV-NOTE: Invalidação global de cache para sincronização automática
      invalidateBillingCache(currentTenant.id);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  }, [currentTenant?.id, markPeriodBilled]);

  // 🔍 [DEBUG] Log do estado do hook antes do return
  console.log('🔄 [HOOK] useBillingKanban return:', {
    isLoading,
    error,
    kanbanDataKeys: Object.keys(safeKanbanData),
    kanbanDataCounts: {
      'faturar-hoje': safeKanbanData['faturar-hoje']?.length || 0,
      'pendente': safeKanbanData['pendente']?.length || 0,
      'faturados': safeKanbanData['faturados']?.length || 0,
      'renovar': safeKanbanData['renovar']?.length || 0
    }
  });

  return {
    kanbanData: safeKanbanData,
    isLoading,
    error: error?.message || null,
    refreshData: loadKanbanData,
    updateContractStatus,
    // AIDEV-NOTE: Novas funções para operações com períodos
    markPeriodBilled,
    skipPeriod
  };
}

export default useBillingKanban;

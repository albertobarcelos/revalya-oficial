import { useState, useCallback } from 'react';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { format, startOfMonth, endOfMonth, addDays, isToday, isBefore, isAfter } from 'date-fns';

// AIDEV-NOTE: Interface atualizada para refletir dados da VIEW billing_kanban corrigida
export interface KanbanContract {
  id: string;
  contract_id: string;
  customer_id: string;
  customer_name: string;
  contract_number: string;
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

// AIDEV-NOTE: Função para categorizar registros em colunas do kanban baseado no kanban_column da view
const categorizeRecord = (record: { kanban_column: string }): string => {
  switch (record.kanban_column) {
    case 'Faturar Hoje':
      return 'faturar-hoje';
    case 'Faturados no Mês':
      return 'faturados';
    case 'Contratos a Renovar':
      return 'renovar';
    case 'Faturamento Pendente':
    default:
      return 'pendente';
  }
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
      }

      // AIDEV-NOTE: Agrupar dados por categoria
      const groupedData: KanbanData = {
        'faturar-hoje': [],
        'pendente': [],
        'faturados': [],
        'renovar': []
      };

      // AIDEV-NOTE: Processar cada registro da VIEW e categorizar
      (billingKanbanData || []).forEach(row => {
        const category = categorizeRecord(row);
        
        // AIDEV-NOTE: Debug temporário - verificar valores antes de criar o contrato
        console.log('🔍 [DEBUG] Processando registro:', {
          customer_name: row.customer_name,
          amount: row.amount,
          amount_planned: row.amount_planned,
          amount_billed: row.amount_billed,
          category
        });
        
        const contract: KanbanContract = {
          id: row.id,
          contract_id: row.contract_id,
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          contract_number: row.contract_number,
          amount: row.amount || row.amount_planned || 0, // AIDEV-NOTE: Fallback para amount_planned se amount for null
          status: getStatusLabel(category),
          bill_date: row.bill_date,
          billed_at: row.billed_at,
          period_start: row.period_start,
          period_end: row.period_end,
          amount_planned: row.amount_planned,
          amount_billed: row.amount_billed,
          billing_status: row.billing_status,
          priority: row.priority,
          kanban_column: row.kanban_column
        };

        groupedData[category as keyof KanbanData].push(contract);
      });

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

      if (newStatus === 'PAID') {
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

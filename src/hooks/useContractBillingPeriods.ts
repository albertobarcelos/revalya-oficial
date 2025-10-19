import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/core/tenant';
import { formatCurrency } from '@/lib/utils';

/**
 * Interface para representar um período de faturamento da tabela contract_billing_periods
 */
export interface ContractBillingPeriod {
  id: string;
  tenant_id: string;
  contract_id: string;
  period_start: string;
  period_end: string;
  bill_date: string;
  status: 'PENDING' | 'BILLED' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DUE_TODAY';
  billed_at?: string;
  created_at: string;
  updated_at: string;
  manual_mark: boolean;
  manual_reason?: string;
  amount_planned?: number;
  amount_billed?: number;
  actor_id?: string;
  from_status?: string;
  transition_reason?: string;
  // Relacionamentos
  contracts?: {
    customer_id: string;
    customers: {
      id: string;
      name: string;
      email?: string;
    };
  };
  // Cobranças relacionadas ao período
  charges?: Array<{
    id: string;
    valor: number;
    status: string;
    data_vencimento: string;
    data_pagamento?: string;
    descricao?: string;
  }>;
}

/**
 * Hook para gerenciar períodos de faturamento de um contrato específico
 * @param contractId - ID do contrato para filtrar os períodos
 */
export function useContractBillingPeriods(contractId?: string) {
  const [periods, setPeriods] = useState<ContractBillingPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialFetchAttempted, setInitialFetchAttempted] = useState(false);
  
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const isMountedRef = useRef(true);

  /**
   * Função para buscar períodos de faturamento do contrato
   */
  const fetchBillingPeriods = useCallback(async () => {
    if (!contractId || !currentTenant || tenantLoading) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // AIDEV-NOTE: Configurar contexto de tenant para segurança multi-tenant
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant.id 
      });

      // Verificar se o contrato pertence ao tenant
      const { data: contractVerification, error: contractError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contractId)
        .eq('tenant_id', currentTenant.id)
        .single();
        
      if (contractError || !contractVerification) {
        throw new Error('Contrato não encontrado ou você não tem permissão para acessá-lo.');
      }
      
      // AIDEV-NOTE: Buscar períodos de faturamento com cobranças relacionadas
      const { data, error } = await supabase
        .from('contract_billing_periods')
        .select(`
          *,
          contracts!inner(
            customer_id,
            customers(
              id,
              name,
              email
            )
          )
        `)
        .eq('contract_id', contractId)
        .eq('tenant_id', currentTenant.id)
        .order('period_start', { ascending: false });
      
      if (error) throw error;
      
      // AIDEV-NOTE: Para cada período, buscar as cobranças relacionadas
      const periodsWithCharges = await Promise.all(
        (data || []).map(async (period) => {
          const { data: charges, error: chargesError } = await supabase
            .from('charges')
            .select(`
              id,
              valor,
              status,
              data_vencimento,
              data_pagamento,
              descricao
            `)
            .eq('billing_periods', period.id)
            .eq('tenant_id', currentTenant.id);

          if (chargesError) {
            console.warn(`Erro ao buscar cobranças para período ${period.id}:`, chargesError);
          }

          return {
            ...period,
            charges: charges || []
          };
        })
      );
      
      if (isMountedRef.current) {
        setPeriods(periodsWithCharges);
        setError(null);
      }
      
    } catch (error: any) {
      console.error('Erro ao buscar períodos de faturamento:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error : new Error(error?.message || 'Erro desconhecido'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setInitialFetchAttempted(true);
      }
    }
  }, [contractId, currentTenant, tenantLoading]);
  
  // Efeito para buscar os períodos quando o componente for montado
  useEffect(() => {
    if (!initialFetchAttempted) {
      fetchBillingPeriods();
    }
  }, [fetchBillingPeriods, initialFetchAttempted]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Função para recarregar os dados
   */
  const refetch = useCallback(() => {
    setInitialFetchAttempted(false);
    fetchBillingPeriods();
  }, [fetchBillingPeriods]);



  /**
   * Função para formatar data
   */
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }, []);

  /**
   * Função para obter estatísticas dos períodos
   */
  const getStatistics = useCallback(() => {
    const totalPlanned = periods.reduce((sum, period) => sum + (period.amount_planned || 0), 0);
    const totalBilled = periods.reduce((sum, period) => sum + (period.amount_billed || 0), 0);
    const paidPeriods = periods.filter(period => period.status === 'PAID');
    const overduePeriods = periods.filter(period => period.status === 'OVERDUE');
    const pendingPeriods = periods.filter(period => period.status === 'PENDING');

    return {
      totalPlanned,
      totalBilled,
      totalPaid: paidPeriods.reduce((sum, period) => sum + (period.amount_billed || 0), 0),
      count: periods.length,
      paidCount: paidPeriods.length,
      overdueCount: overduePeriods.length,
      pendingCount: pendingPeriods.length
    };
  }, [periods]);

  /**
   * Função para obter o status traduzido
   */
  const getStatusLabel = useCallback((status: string) => {
    const statusMap = {
      'PENDING': 'Pendente',
      'BILLED': 'Faturado',
      'PAID': 'Pago',
      'OVERDUE': 'Em atraso',
      'CANCELLED': 'Cancelado',
      'DUE_TODAY': 'Vence hoje'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  }, []);

  /**
   * Função para obter a cor do status
   */
  const getStatusColor = useCallback((status: string) => {
    const colorMap = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'BILLED': 'bg-blue-100 text-blue-800',
      'PAID': 'bg-green-100 text-green-800',
      'OVERDUE': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-gray-100 text-gray-800',
      'DUE_TODAY': 'bg-orange-100 text-orange-800'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  }, []);

  return {
    periods,
    isLoading,
    error,
    refetch,
    formatCurrency,
    formatDate,
    getStatusLabel,
    getStatusColor,
    statistics: getStatistics(),
    // Funções utilitárias
    isEmpty: periods.length === 0,
    hasError: !!error
  };
}
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/core/tenant';

/**
 * Interface para representar um lançamento financeiro da tabela finance_entries
 */
export interface FinanceEntry {
  id: string;
  tenant_id: string;
  contract_id?: string;
  contract_billing_id?: string;
  charge_id?: string;

  entry_number?: string;
  reference?: string;
  entry_type: 'RECEIVABLE' | 'PAYABLE';
  category: string;
  subcategory?: string;
  description: string;
  notes?: string;
  gross_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  issue_date: string;
  due_date: string;
  payment_date?: string;
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED' | 'REFUNDED';
  payment_method?: string;
  payment_gateway_id?: string;
  external_payment_id?: string;
  invoice_number?: string;
  invoice_date?: string;
  invoice_status?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Relacionamentos
  contracts?: {
    customer_id: string;
    customers: {
      id: string;
      name: string;
      email?: string;
    };
  };
}

/**
 * Hook para gerenciar lançamentos financeiros relacionados a contratos
 * @param contractId - ID do contrato para filtrar os lançamentos
 * @param entryType - Tipo de lançamento (RECEIVABLE ou PAYABLE). Default: RECEIVABLE
 */
export function useFinanceEntries(contractId?: string, entryType: 'RECEIVABLE' | 'PAYABLE' = 'RECEIVABLE') {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialFetchAttempted, setInitialFetchAttempted] = useState(false);
  
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const isMountedRef = useRef(true);

  /**
   * Função para buscar lançamentos financeiros do contrato
   */
  const fetchFinanceEntries = useCallback(async () => {
    if (!contractId || !currentTenant || tenantLoading) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

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
      
      // Buscar os lançamentos financeiros
      const { data, error } = await supabase
        .from('finance_entries')
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
        .eq('type', entryType)
        .order('due_date', { ascending: false });
      
      if (error) throw error;
      
      if (isMountedRef.current) {
        setEntries(data || []);
        setError(null);
      }
      
    } catch (error: any) {
      console.error('Erro ao buscar lançamentos financeiros:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error : new Error(error?.message || 'Erro desconhecido'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setInitialFetchAttempted(true);
      }
    }
  }, [contractId, entryType, currentTenant?.id]); // AIDEV-NOTE: Otimizado - removido tenantLoading e usado currentTenant?.id
  
  // Efeito para buscar os lançamentos quando o componente for montado
  useEffect(() => {
    if (!initialFetchAttempted) {
      fetchFinanceEntries();
    }
  }, [fetchFinanceEntries, initialFetchAttempted]);

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
    fetchFinanceEntries();
  }, [fetchFinanceEntries]);

  /**
   * Função para formatar valor monetário
   */
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  /**
   * Função para obter estatísticas dos lançamentos
   */
  const getStatistics = useCallback(() => {
    const total = entries.reduce((sum, entry) => sum + entry.net_amount, 0);
    const paid = entries.filter(entry => entry.status === 'RECEIVED').reduce((sum, entry) => sum + entry.net_amount, 0);
    const pending = entries.filter(entry => entry.status === 'PENDING').reduce((sum, entry) => sum + entry.net_amount, 0);
    const overdue = entries.filter(entry => entry.status === 'OVERDUE').reduce((sum, entry) => sum + entry.net_amount, 0);

    return {
      total,
      paid,
      pending,
      overdue,
      count: entries.length,
      paidCount: entries.filter(entry => entry.status === 'RECEIVED').length,
    pendingCount: entries.filter(entry => entry.status === 'PENDING').length,
    overdueCount: entries.filter(entry => entry.status === 'OVERDUE').length
    };
  }, [entries]);

  return {
    entries,
    isLoading,
    error,
    refetch,
    formatCurrency,
    statistics: getStatistics(),
    // Funções utilitárias
    isEmpty: entries.length === 0,
    hasError: !!error
  };
}

/**
 * Hook específico para recebimentos (RECEIVABLE) de um contrato
 */
export function useContractReceivables(contractId?: string) {
  return useFinanceEntries(contractId, 'RECEIVABLE');
}

/**
 * Hook específico para pagamentos (PAYABLE) de um contrato
 */
export function useContractPayables(contractId?: string) {
  return useFinanceEntries(contractId, 'PAYABLE');
}

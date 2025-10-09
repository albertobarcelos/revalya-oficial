import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';

export interface KanbanContract {
  id: string;
  numero: string;
  cliente: string;
  valor: number;
  status: 'Faturar Hoje' | 'Faturamento Pendente' | 'Faturados no Mês' | 'Contratos a Renovar';
  contract_id: string;
  customer_id: string;
  due_date?: string;
  billing_id?: string;
  contract_status: string;
  final_date: string;
  // AIDEV-NOTE: Campo para controlar se o contrato deve gerar cobranças automaticamente
  generate_billing?: boolean;
}

export interface KanbanData {
  'faturar-hoje': KanbanContract[];
  'pendente': KanbanContract[];
  'faturados': KanbanContract[];
  'renovar': KanbanContract[];
}

/**
 * Hook para gerenciar os dados do Kanban de faturamento
 * Busca contratos reais do banco de dados organizados por status de faturamento
 */
export function useBillingKanban() {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const queryClient = useQueryClient();
  const [kanbanData, setKanbanData] = useState<KanbanData>({
    'faturar-hoje': [],
    'pendente': [],
    'faturados': [],
    'renovar': []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // AIDEV-NOTE: Controle de race conditions - cancelar requisições anteriores
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  /**
   * Busca contratos para faturar hoje
   * Contratos com billing_day igual ao dia atual que ainda não têm cobranças no mês atual
   */
  const fetchContractsToInvoiceToday = useCallback(async (tenantId: string): Promise<KanbanContract[]> => {
    // AIDEV-NOTE: Usar formato consistente de data para evitar problemas de comparação
    const today = new Date().getDate();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const startMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endMonth = format(endOfMonth(new Date()), 'yyyy-MM-dd') + ' 23:59:59';
    
    console.log('🔍 Buscando contratos para faturar hoje:', { tenantId, today, startMonth, endMonth });
    
    // AIDEV-NOTE: Buscar contratos ativos com billing_day igual ao dia atual e não têm cobranças no mês atual
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        status,
        final_date,
        total_amount,
        billing_day,
        customer:customers!inner(
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('billing_day', today)
      .eq('status', 'ACTIVE')
      .gt('final_date', todayStr); // Não expirados

    console.log('📋 Contratos encontrados para faturar hoje:', contracts);

    if (contractsError) {
      console.error('Erro ao buscar contratos para faturar hoje:', contractsError);
      return [];
    }

    if (!contracts || contracts.length === 0) {
      return [];
    }

    // AIDEV-NOTE: Filtrar contratos que não têm cobranças no mês atual
    const contractsWithoutCharges = [];
    
    for (const contract of contracts) {
      const { data: existingCharges } = await supabase
        .from('charges')
        .select('id')
        .eq('contract_id', contract.id)
        .gte('created_at', startMonth)
        .lte('created_at', endMonth)
        .limit(1);
      
      if (!existingCharges || existingCharges.length === 0) {
        contractsWithoutCharges.push(contract);
      }
    }

    return contractsWithoutCharges.map(contract => ({
      id: contract.id,
      numero: contract.contract_number,
      cliente: (contract.customer as any).name,
      valor: contract.total_amount,
      status: 'Faturar Hoje' as const,
      contract_id: contract.id,
      customer_id: (contract.customer as any).id,
      contract_status: contract.status,
      final_date: contract.final_date
    }));
  }, []);

  /**
   * Busca contratos com faturamento pendente
   * Contratos com billing_day menor que hoje e ainda não têm cobranças no mês atual
   */
  const fetchPendingInvoices = useCallback(async (tenantId: string): Promise<KanbanContract[]> => {
    // AIDEV-NOTE: Usar formato consistente de data para evitar problemas de comparação
    const today = new Date().getDate();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const startMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endMonth = format(endOfMonth(new Date()), 'yyyy-MM-dd') + ' 23:59:59';
    
    console.log('🔍 Buscando contratos pendentes:', { tenantId, today, startMonth, endMonth });
    
    // AIDEV-NOTE: Buscar contratos ativos com billing_day menor que hoje e não têm cobranças no mês atual
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        status,
        final_date,
        total_amount,
        billing_day,
        customer:customers!inner(
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .lt('billing_day', today)
      .eq('status', 'ACTIVE')
      .gt('final_date', todayStr); // Não expirados

    console.log('📋 Contratos pendentes encontrados:', contracts);

    if (error) {
      console.error('Erro ao buscar faturamentos pendentes:', error);
      return [];
    }

    if (!contracts || contracts.length === 0) {
      return [];
    }

    // AIDEV-NOTE: Filtrar contratos que não têm cobranças no mês atual
    const contractsWithoutCharges = [];
    
    for (const contract of contracts) {
      const { data: existingCharges } = await supabase
        .from('charges')
        .select('id')
        .eq('contract_id', contract.id)
        .gte('created_at', startMonth)
        .lte('created_at', endMonth)
        .limit(1);
      
      if (!existingCharges || existingCharges.length === 0) {
        contractsWithoutCharges.push(contract);
      }
    }

    return contractsWithoutCharges.map(contract => ({
      id: contract.id,
      numero: contract.contract_number,
      cliente: (contract.customer as any).name,
      valor: contract.total_amount,
      status: 'Faturamento Pendente' as const,
      contract_id: contract.id,
      customer_id: (contract.customer as any).id,
      contract_status: contract.status,
      final_date: contract.final_date
    }));
  }, []);

  /**
   * Busca contratos faturados no mês atual
   * Contratos que têm cobranças geradas na tabela charges no mês atual
   */
  const fetchInvoicedThisMonth = useCallback(async (tenantId: string): Promise<KanbanContract[]> => {
    const startMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endMonth = format(endOfMonth(new Date()), 'yyyy-MM-dd') + ' 23:59:59';
    
    console.log('🔍 Buscando contratos faturados no mês:', { tenantId, startMonth, endMonth });
    
    try {
      // AIDEV-NOTE: Buscar contratos que têm cobranças geradas no mês atual na tabela charges
      const { data, error } = await supabase
        .from('charges')
        .select(`
          contract_id,
          contracts!inner(
            id,
            contract_number,
            status,
            final_date,
            total_amount,
            customer:customers!inner(
              id,
              name
            )
          )
        `)
        .eq('contracts.tenant_id', tenantId)
        .gte('created_at', startMonth)
        .lte('created_at', endMonth)
        .not('contract_id', 'is', null)
        .limit(50); // Limitar para evitar queries muito pesadas

      console.log('📋 Contratos faturados encontrados:', data?.length || 0);

      if (error) {
        console.error('Erro ao buscar contratos faturados no mês:', error);
        return [];
      }

      // Remover duplicatas por contract_id
      const uniqueContracts = new Map();
      (data || []).forEach(charge => {
        const contract = (charge.contracts as any);
        if (!uniqueContracts.has(contract.id)) {
          uniqueContracts.set(contract.id, {
            id: contract.id,
            numero: contract.contract_number,
            cliente: contract.customer.name,
            valor: contract.total_amount,
            status: 'Faturados no Mês' as const,
            contract_id: contract.id,
            customer_id: contract.customer.id,
            contract_status: contract.status,
            final_date: contract.final_date
          });
        }
      });

      return Array.from(uniqueContracts.values());
    } catch (err) {
      console.error('Erro na busca de contratos faturados:', err);
      return [];
    }
  }, []);

  /**
   * Busca contratos que expiraram (para renovação)
   * Contratos com final_date menor ou igual à data atual
   */
  const fetchContractsToRenew = useCallback(async (tenantId: string): Promise<KanbanContract[]> => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    console.log('🔍 Buscando contratos para renovar:', { tenantId, todayStr });
    
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          status,
          final_date,
          total_amount,
          customer:customers!inner(
            id,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['ACTIVE', 'EXPIRED'])
        .lte('final_date', todayStr)
        .limit(50); // Limitar para evitar queries muito pesadas

      console.log('📋 Contratos para renovar encontrados:', data?.length || 0);

      if (error) {
        console.error('Erro ao buscar contratos para renovar:', error);
        return [];
      }

      return (data || []).map(contract => ({
        id: contract.id,
        numero: contract.contract_number,
        cliente: (contract.customer as any).name,
        valor: contract.total_amount,
        status: 'Contratos a Renovar' as const,
        contract_id: contract.id,
        customer_id: (contract.customer as any).id,
        contract_status: contract.status,
        final_date: contract.final_date
      }));
    } catch (err) {
      console.error('Erro na busca de contratos para renovar:', err);
      return [];
    }
  }, []);

  /**
   * Carrega todos os dados do Kanban
   */
  const loadKanbanData = useCallback(async () => {
    console.log('🚀 [DEBUG] loadKanbanData chamado:', { 
      tenantId: currentTenant?.id, 
      hasAccess, 
      timestamp: new Date().toISOString() 
    });
    
    // 🛡️ VALIDAÇÃO CRÍTICA DE ACESSO
    if (!hasAccess) {
      console.warn('⚠️ Acesso negado ao tenant:', accessError);
      setError(accessError || 'Acesso negado ao tenant');
      setIsLoading(false);
      return;
    }
    
    if (!currentTenant?.id) {
      console.warn('⚠️ Tentativa de carregar kanban sem tenant válido');
      setError('Tenant não encontrado');
      setIsLoading(false);
      return;
    }

    // AIDEV-NOTE: Gerar ID único para esta requisição para evitar race conditions
    const requestId = `${currentTenant.id}-${Date.now()}`;
    setCurrentRequestId(requestId);

    console.log('📊 Carregando dados do kanban para tenant:', currentTenant.id);

    try {
      setIsLoading(true);
      setError(null);

      const [toInvoiceToday, pending, invoicedThisMonth, toRenew] = await Promise.allSettled([
        fetchContractsToInvoiceToday(currentTenant.id),
        fetchPendingInvoices(currentTenant.id),
        fetchInvoicedThisMonth(currentTenant.id),
        fetchContractsToRenew(currentTenant.id)
      ]);

      // Extrair resultados ou arrays vazios em caso de erro
      const toInvoiceTodayData = toInvoiceToday.status === 'fulfilled' ? toInvoiceToday.value : [];
      const pendingData = pending.status === 'fulfilled' ? pending.value : [];
      const invoicedThisMonthData = invoicedThisMonth.status === 'fulfilled' ? invoicedThisMonth.value : [];
      const toRenewData = toRenew.status === 'fulfilled' ? toRenew.value : [];

      console.log('📊 Resultados das queries:', {
        toInvoiceToday: toInvoiceTodayData.length,
        pending: pendingData.length,
        invoicedThisMonth: invoicedThisMonthData.length,
        toRenew: toRenewData.length
      });

      console.log('🔍 [DEBUG] Verificando requestId:', { currentRequestId, requestId, match: currentRequestId === requestId });
      
      // AIDEV-NOTE: Sempre atualizar dados - removendo verificação de requestId que estava causando problema
      setKanbanData({
        'faturar-hoje': toInvoiceTodayData,
        'pendente': pendingData,
        'faturados': invoicedThisMonthData,
        'renovar': toRenewData
      });
      
      // AIDEV-NOTE: Invalidar cache das cobranças por tenant para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ['charges', currentTenant.id] });
      queryClient.invalidateQueries({ queryKey: ['contracts', currentTenant.id] });
      queryClient.invalidateQueries({ queryKey: ['kanban', currentTenant.id] });
      
      setIsLoading(false);
      console.log('✅ [DEBUG] Dados do kanban carregados com sucesso');
      console.log('✅ [DEBUG] Estado atualizado:', {
        isLoading: false,
        kanbanData: {
          'faturar-hoje': toInvoiceTodayData.length,
          'pendente': pendingData.length,
          'faturados': invoicedThisMonthData.length,
          'renovar': toRenewData.length
        }
      });
    } catch (err) {
      // AIDEV-NOTE: Só atualizar erro se esta ainda é a requisição atual
      if (currentRequestId === requestId) {
        console.error('Erro ao carregar dados do Kanban:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setIsLoading(false);
      }
    }
  }, [hasAccess, accessError, currentTenant?.id, currentRequestId, queryClient]);

  /**
   * Atualiza o status de uma cobrança
   */
  const updateContractStatus = useCallback(async (contractId: string, chargeId: string | undefined, newStatus: string) => {
    if (!currentTenant?.id) return;

    try {
      if (chargeId && newStatus === 'PAID') {
        // AIDEV-NOTE: Marcar cobrança como paga na tabela charges
        const { error } = await supabase
          .from('charges')
          .update({ 
             status: 'RECEIVED'
           })
          .eq('id', chargeId);

        if (error) {
          throw new Error(`Erro ao atualizar status da cobrança: ${error.message}`);
        }
      }

      // AIDEV-NOTE: Invalidar cache das cobranças por tenant antes de recarregar dados
      queryClient.invalidateQueries({ queryKey: ['charges', currentTenant.id] });
      queryClient.invalidateQueries({ queryKey: ['contracts', currentTenant.id] });
      queryClient.invalidateQueries({ queryKey: ['kanban', currentTenant.id] });
      
      // Recarregar dados após atualização
      await loadKanbanData();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status');
    }
  }, [currentTenant?.id]);

  // Carregar dados quando o tenant mudar ou quando o hook montar
  useEffect(() => {
    console.log('🔄 [DEBUG] useEffect disparado:', { 
      tenantId: currentTenant?.id, 
      hasAccess,
      timestamp: new Date().toISOString() 
    });
    
    if (currentTenant?.id && hasAccess) {
      loadKanbanData();
    } else {
      // Limpar dados quando não há tenant ou acesso
      setKanbanData({
        'faturar-hoje': [],
        'pendente': [],
        'faturados': [],
        'renovar': []
      });
      setIsLoading(false);
      setError(null);
    }
  }, [currentTenant?.id, hasAccess]); // Removido loadKanbanData para evitar loop

  // AIDEV-NOTE: Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      // Cancelar requisições pendentes ao desmontar
      setCurrentRequestId(null);
    };
  }, []);

  // 🔍 [DEBUG] Log do estado do hook antes do return
  console.log('🔄 [HOOK] useBillingKanban return:', {
    isLoading,
    error,
    kanbanDataKeys: Object.keys(kanbanData),
    kanbanDataCounts: {
      'faturar-hoje': kanbanData['faturar-hoje']?.length || 0,
      'pendente': kanbanData['pendente']?.length || 0,
      'faturados': kanbanData['faturados']?.length || 0,
      'renovar': kanbanData['renovar']?.length || 0
    }
  });

  return {
    kanbanData,
    isLoading,
    error,
    refreshData: loadKanbanData,
    updateContractStatus
  };
}

export default useBillingKanban;

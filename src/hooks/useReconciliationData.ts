// =====================================================
// USE RECONCILIATION DATA HOOK
// Descrição: Hook customizado para gerenciar dados de conciliação
// Padrão: Clean Code + React Query + Multi-tenant Security
// =====================================================

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useAuditLogger } from '@/hooks/useAuditLogger';

import { 
  ImportedMovement, 
  ReconciliationIndicators,
  PaymentStatus,
  ReconciliationStatus,
  ReconciliationSource
} from '@/types/reconciliation';

// AIDEV-NOTE: Interface para dados de retorno da query
interface ReconciliationData {
  movements: ImportedMovement[];
  indicators: ReconciliationIndicators;
}

// AIDEV-NOTE: Interface simplificada para o hook
interface UseReconciliationDataReturn {
  movements: ImportedMovement[];
  indicators: ReconciliationIndicators | null;
  isLoading: boolean;
  loadReconciliationData: () => Promise<void>;
  refreshData: () => Promise<void>;
  invalidateCache: () => Promise<void>;
}

// AIDEV-NOTE: Hook customizado usando padrão seguro com React Query
export const useReconciliationData = (isOpen: boolean): UseReconciliationDataReturn => {
  const { toast } = useToast();
  const { logAction } = useAuditLogger();
  const queryClient = useQueryClient();
  
  // AIDEV-NOTE: Hook de segurança obrigatório
  const { hasAccess: guardAccess, currentTenant: guardTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: Estado para controlar quando fazer a requisição
  const [shouldFetch, setShouldFetch] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // AIDEV-NOTE: Ativar fetch automaticamente quando o modal for aberto (apenas uma vez)
  useEffect(() => {
    if (isOpen && guardTenant?.id && !isInitialized) {
      console.log('🚀 Inicializando fetch de dados de conciliação');
      setShouldFetch(true);
      setIsInitialized(true);
    } else if (!isOpen) {
      // AIDEV-NOTE: Reset estados quando modal fechar
      setShouldFetch(false);
      setIsInitialized(false);
    }
  }, [isOpen, guardTenant?.id, isInitialized]);

  // AIDEV-NOTE: Função para mapear status de pagamento do banco para enum válido
  // Aceita valores em lowercase e uppercase para compatibilidade com dados reais
  const mapPaymentStatus = useCallback((status: string): PaymentStatus => {
    const normalizedStatus = status?.toUpperCase() || '';
    const statusMap: Record<string, PaymentStatus> = {
      'RECEIVED': 'PAID',
      'CONFIRMED': 'PAID', 
      'OVERDUE': 'OVERDUE',
      'PENDING': 'PENDING',
      'CANCELLED': 'CANCELLED'
    };
    return statusMap[normalizedStatus] || 'PENDING';
  }, []);

  // AIDEV-NOTE: Função para mapear status de conciliação
  // Aceita valores em português (salvos no banco) e inglês (enum)
  const mapReconciliationStatus = useCallback((status: string): ReconciliationStatus => {
    const normalizedStatus = status?.toUpperCase() || '';
    const statusMap: Record<string, ReconciliationStatus> = {
      // Valores em inglês (enum)
      'RECONCILED': 'RECONCILED',
      'DIVERGENT': 'DIVERGENT', 
      'CANCELLED': 'CANCELLED',
      'PENDING': 'PENDING',
      // Valores em português (banco de dados)
      'CONCILIADO': 'RECONCILED',
      'DIVERGENTE': 'DIVERGENT',
      'CANCELADO': 'CANCELLED',
      'PENDENTE': 'PENDING',
      'NAO_CONCILIADO': 'PENDING'
    };
    return statusMap[normalizedStatus] || 'PENDING';
  }, []);

  // AIDEV-NOTE: Função para calcular indicadores baseados nos dados filtrados
  const calculateIndicators = useCallback((data: ImportedMovement[]): ReconciliationIndicators => {
    const total = data.length;
    const reconciled = data.filter(m => m.reconciliationStatus === 'RECONCILED').length;
    const divergent = data.filter(m => m.reconciliationStatus === 'DIVERGENT').length;
    const pending = data.filter(m => m.reconciliationStatus === 'PENDING').length;
    const cancelled = data.filter(m => m.reconciliationStatus === 'CANCELLED').length;

    const totalAmount = data.reduce((sum, m) => sum + m.amount, 0);
    const reconciledAmount = data
      .filter(m => m.reconciliationStatus === 'RECONCILED')
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      total,
      reconciled,
      divergent,
      pending,
      cancelled,
      totalAmount,
      reconciledAmount,
      reconciledPercentage: total > 0 ? (reconciled / total) * 100 : 0
    };
  }, []);

  // AIDEV-NOTE: Query principal com cache otimizado e segurança multi-tenant
  const reconciliationQuery = useSecureTenantQuery(
    ['reconciliation-data', 'charges-asaas'], // AIDEV-NOTE: Atualizar cache key
    async (supabase, tenantId) => {
      console.log('🔄 Carregando movimentações de conciliação...');
      
      // AIDEV-NOTE: Configuração obrigatória do contexto de tenant antes da query
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId 
      });
      
      // AIDEV-NOTE: Query charges do ASAAS (apenas charges com asaas_id)
      const { data: rawData, error } = await supabase
        .from('charges')
        .select(`
          *,
          customers!inner(
            id,
            name,
            cpf_cnpj,
            customer_asaas_id
          ),
          contracts!left(
            id,
            contract_number,
            customer_id
          )
        `)
        .eq('tenant_id', tenantId)
        .not('asaas_id', 'is', null) // Apenas charges do ASAAS
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar movimentações:', error);
        throw error;
      }

      console.log('✅ Movimentações carregadas:', rawData?.length || 0);

      // AIDEV-NOTE: Mapear dados de charges para estrutura esperada pelo componente
      const mappedMovements: ImportedMovement[] = (rawData || []).map(item => ({
        id: item.id,
        tenant_id: item.tenant_id,
        origem: 'ASAAS' as ReconciliationSource, // Charges do ASAAS sempre têm origem ASAAS
        id_externo: item.asaas_id || item.id, // Usar asaas_id como id_externo
        valor_cobranca: item.valor || 0,
        valor_pago: item.data_pagamento ? item.valor : 0, // Se tem data_pagamento, considera pago
        status_externo: item.status || 'PENDING',
        status_conciliacao: item.contract_id ? 'RECONCILED' : 'PENDING', // Se tem contrato vinculado, está conciliado
        contrato_id: item.contract_id,
        cobranca_id: item.id, // Charge ID é o próprio ID
        charge_id: item.id,
        imported_at: item.created_at,
        juros_multa_diferenca: 0, // Não temos esses dados em charges
        valor_original: item.valor,
        valor_liquido: item.valor,
        valor_juros: 0,
        valor_multa: 0,
        valor_desconto: 0,
        data_vencimento: item.data_vencimento,
        data_pagamento: item.data_pagamento,
        data_vencimento_original: item.data_vencimento,
        data_pagamento_cliente: item.data_pagamento,
        data_credito: null,
        data_confirmacao: item.data_pagamento,
        observacao: item.descricao || '',
        external_reference: null, // Não temos em charges diretamente
        // AIDEV-NOTE: Campos de compatibilidade para componentes existentes
        externalId: item.asaas_id || item.id,
        amount: item.valor || 0,
        dueDate: item.data_vencimento,
        paymentDate: item.data_pagamento,
        description: item.descricao || '',
        source: 'ASAAS' as ReconciliationSource,
        paymentStatus: mapPaymentStatus(item.status || 'PENDING'),
        reconciliationStatus: item.contract_id ? 'RECONCILED' : 'PENDING',
        customerName: item.customers?.name || '',
        customerDocument: item.customers?.cpf_cnpj || '',
        // AIDEV-NOTE: hasContract baseado em contract_id
        hasContract: !!item.contract_id || !!item.contracts,
        contractId: item.contract_id || item.contracts?.id || null,
        contractNumber: item.contracts?.contract_number || null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        // AIDEV-NOTE: Campos críticos para exibição das colunas de valor
        chargeAmount: item.valor,
        paidAmount: item.data_pagamento ? item.valor : 0,
        // AIDEV-NOTE: Campos adicionais para compatibilidade
        customer_name: item.customers?.name,
        customer_document: item.customers?.cpf_cnpj,
        installment_number: null,
        total_installments: null,
        // AIDEV-NOTE: Campo payment_method para exibição do tipo de cobrança
        payment_method: item.tipo || 'BOLETO'
      }));
      
      // AIDEV-NOTE: Calcular indicadores
      const indicators = calculateIndicators(mappedMovements);

      // AIDEV-NOTE: Log de auditoria
      await logAction('DATA_ACCESS', {
        action: 'reconciliation_data_loaded',
        tenant_id: tenantId,
        records_count: mappedMovements.length,
        timestamp: new Date().toISOString()
      });

      return {
        movements: mappedMovements,
        indicators
      };
    },
    {
      enabled: isOpen && !!guardTenant?.id && shouldFetch,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchInterval: false, // AIDEV-NOTE: Desabilitar polling automático
      refetchIntervalInBackground: false,
      retry: 1, // AIDEV-NOTE: Reduzir tentativas de retry
      retryOnMount: false, // AIDEV-NOTE: Não tentar novamente no mount
      notifyOnChangeProps: ['data', 'error', 'isLoading'] // AIDEV-NOTE: Limitar notificações
    }
  );

  // AIDEV-NOTE: Função para invalidar cache e forçar refetch
  const invalidateReconciliationCache = useCallback(() => {
    if (guardTenant?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['reconciliation-data', guardTenant?.id] 
      });
      console.log(`[CACHE] Cache de conciliação invalidado para tenant: ${guardTenant?.id}`);
      
      // AIDEV-NOTE: Log de auditoria para invalidação de cache
        logAction('USER_ACTION', {
          action: 'reconciliation_cache_invalidated',
          tenant_id: guardTenant?.id,
          timestamp: new Date().toISOString()
        });
    }
  }, [guardTenant?.id, queryClient, logAction]);

  // AIDEV-NOTE: Função para refresh manual
  const refreshData = useCallback(() => {
    return reconciliationQuery.refetch();
  }, [reconciliationQuery]);

  // AIDEV-NOTE: Função de carregamento para compatibilidade
  const loadReconciliationData = useCallback(async (): Promise<void> => {
    setShouldFetch(true);
    await refreshData();
  }, [refreshData]);

  // AIDEV-NOTE: Memoizar dados para evitar re-renders desnecessários
  const memoizedData = useMemo(() => ({
    movements: reconciliationQuery.data?.movements || [],
    indicators: reconciliationQuery.data?.indicators || null,
    isLoading: reconciliationQuery.isLoading,
    loadReconciliationData,
    refreshData,
    invalidateCache: invalidateReconciliationCache,
  }), [
    reconciliationQuery.data,
    reconciliationQuery.isLoading,
    loadReconciliationData,
    refreshData,
    invalidateReconciliationCache
  ]);

  return memoizedData;
};
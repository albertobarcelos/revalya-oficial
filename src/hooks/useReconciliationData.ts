// =====================================================
// USE RECONCILIATION DATA HOOK
// Descrição: Hook customizado para gerenciar dados de conciliação
// Padrão: Clean Code + React Hooks Best Practices + Multi-tenant Security
// =====================================================

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useAuditLogger } from '@/hooks/useAuditLogger';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';

import { 
  ImportedMovement, 
  ReconciliationIndicators,
  PaymentStatus,
  ReconciliationStatus,
  ReconciliationSource
} from '@/types/reconciliation';

import {
  UseReconciliationDataProps,
  UseReconciliationDataReturn
} from '@/components/reconciliation/types/ReconciliationModalTypes';

// AIDEV-NOTE: Hook customizado para separar responsabilidades de dados
export const useReconciliationData = ({
  isOpen,
  hasAccess,
  currentTenant,
  validateTenantContext,
  logSecurityEvent,
  validateDataAccess
}: UseReconciliationDataProps): UseReconciliationDataReturn => {
  const { toast } = useToast();
  const { logAction } = useAuditLogger();
  
  // Estados locais
  const [movements, setMovements] = useState<ImportedMovement[]>([]);
  const [indicators, setIndicators] = useState<ReconciliationIndicators | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // AIDEV-NOTE: Função para mapear status de pagamento do banco para enum válido
  const mapPaymentStatus = useCallback((status: string): PaymentStatus => {
    const statusMap: Record<string, PaymentStatus> = {
      'RECEIVED': 'PAID',
      'CONFIRMED': 'PAID', 
      'OVERDUE': 'OVERDUE',
      'PENDING': 'PENDING',
      'CANCELLED': 'CANCELLED'
    };
    return statusMap[status] || 'PENDING';
  }, []);

  // AIDEV-NOTE: Função para mapear status de conciliação
  const mapReconciliationStatus = useCallback((status: string): ReconciliationStatus => {
    const statusMap: Record<string, ReconciliationStatus> = {
      'RECONCILED': 'RECONCILED',
      'DIVERGENT': 'DIVERGENT', 
      'CANCELLED': 'CANCELLED',
      'PENDING': 'PENDING'
    };
    return statusMap[status] || 'PENDING';
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

  // AIDEV-NOTE: Função principal para carregar dados de conciliação com segurança multi-tenant
  const loadReconciliationData = useCallback(async (): Promise<void> => {
    if (!hasAccess || !currentTenant) {
      console.warn('🚫 Acesso negado ou tenant não encontrado');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔄 Carregando movimentações de conciliação...');
      
      // AIDEV-NOTE: Aguardar validação de contexto antes de prosseguir
      const isValidContext = await validateTenantContext();
      if (!isValidContext) {
        console.error('❌ Contexto de tenant inválido, abortando carregamento');
        return;
      }
      
      // AIDEV-NOTE: Query segura com RLS automático usando conciliation_staging
      const { data: rawData, error } = await supabase
        .from('conciliation_staging')
        .select(`
          *,
          contracts!left (
            id,
            contract_number,
            customer_id,
            customers!inner (
              name,
              cpf_cnpj
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar movimentações:', error);
        throw error;
      }

      console.log('✅ Movimentações carregadas:', rawData?.length || 0);

      // AIDEV-NOTE: Mapear dados para estrutura esperada pelo componente
      const mappedMovements: ImportedMovement[] = (rawData || []).map(item => ({
        id: item.id,
        tenant_id: item.tenant_id,
        origem: item.origem as ReconciliationSource,
        id_externo: item.id_externo,
        valor_cobranca: item.valor_cobranca,
        valor_pago: parseFloat(item.valor_pago) || 0,
        status_externo: item.status_externo,
        status_conciliacao: mapReconciliationStatus(item.status_conciliacao || 'PENDING'),
        contrato_id: item.contrato_id,
        cobranca_id: item.cobranca_id,
        charge_id: item.charge_id,
        imported_at: item.imported_at,
        juros_multa_diferenca: parseFloat(item.juros_multa_diferenca) || 0,
        valor_original: item.valor_original,
        valor_liquido: item.valor_liquido,
        valor_juros: item.valor_juros,
        valor_multa: item.valor_multa,
        valor_desconto: item.valor_desconto,
        data_vencimento: item.data_vencimento,
        data_pagamento: item.data_pagamento,
        data_vencimento_original: item.data_vencimento_original,
        data_pagamento_cliente: item.data_pagamento_cliente,
        data_credito: item.data_credito,
        data_confirmacao: item.data_confirmacao,
        observacao: item.observacao,
        external_reference: item.external_reference,
        // AIDEV-NOTE: Campos de compatibilidade para componentes existentes
        externalId: item.id_externo,
        amount: parseFloat(item.valor_pago) || 0,
        dueDate: item.data_vencimento,
        paymentDate: item.data_pagamento,
        description: item.observacao || '',
        source: item.origem as any,
        paymentStatus: mapPaymentStatus(item.status_externo),
        reconciliationStatus: mapReconciliationStatus(item.status_conciliacao || 'PENDING'),
        customerName: item.customer_name || item.contracts?.customers?.name || '',
        customerDocument: item.customer_document || item.contracts?.customers?.cpf_cnpj?.toString() || '',
        hasContract: !!item.contracts,
        contractId: item.contracts?.id || null,
        contractNumber: item.contracts?.contract_number || null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        // AIDEV-NOTE: Campos adicionais para compatibilidade
        customer_name: item.customer_name,
        customer_document: item.customer_document,
        installment_number: item.installment_number,
        total_installments: item.total_installments
      }));

      setMovements(mappedMovements);
      
      // AIDEV-NOTE: Calcular indicadores iniciais
      const initialIndicators = calculateIndicators(mappedMovements);
      setIndicators(initialIndicators);

      // AIDEV-NOTE: Log de auditoria
      await logAction('reconciliation_data_loaded', {
        tenant: currentTenant.name,
        total_movements: mappedMovements.length,
        indicators: initialIndicators
      });

      toast({
        title: "✅ Dados carregados",
        description: `${mappedMovements.length} movimentações encontradas.`,
        variant: "default",
      });

    } catch (error: any) {
      console.error('❌ Erro ao carregar dados de conciliação:', error);
      
      toast({
        title: "❌ Erro ao carregar dados",
        description: error.response?.data?.error || error.message || "Não foi possível carregar as movimentações.",
        variant: "destructive",
      });
      
      // AIDEV-NOTE: Em caso de erro, manter array vazio
      setMovements([]);
      setIndicators(null);
    } finally {
      setIsLoading(false);
    }
  }, [hasAccess, currentTenant, toast, logAction, mapPaymentStatus, mapReconciliationStatus, calculateIndicators]);

  // AIDEV-NOTE: Função para refresh dos dados
  const refreshData = useCallback(async (): Promise<void> => {
    await loadReconciliationData();
  }, [loadReconciliationData]);

  // AIDEV-NOTE: Effect para carregar dados quando modal abre
  useEffect(() => {
    if (isOpen && hasAccess && currentTenant) {
      loadReconciliationData();
    }
  }, [isOpen, hasAccess, currentTenant, loadReconciliationData]);

  return {
    movements,
    indicators,
    isLoading,
    loadReconciliationData,
    refreshData
  };
};
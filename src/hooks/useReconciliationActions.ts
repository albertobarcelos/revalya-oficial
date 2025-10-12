// =====================================================
// USE RECONCILIATION ACTIONS HOOK
// Descrição: Hook customizado para gerenciar ações do modal de conciliação
// Padrão: Action Handlers + Export + Refresh + Modal Management + Cache Invalidation
// =====================================================

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuditLogger } from '@/hooks/useAuditLogger';
import { ReconciliationAction } from '@/types/reconciliation';
import { 
  ActionModalState, 
  ReconciliationMovement,
  INITIAL_ACTION_MODAL_STATE 
} from '@/components/reconciliation/types/ReconciliationModalTypes';

// AIDEV-NOTE: Interface para props do hook de ações
export interface UseReconciliationActionsProps {
  currentTenant: any;
  movements: ReconciliationMovement[];
  filteredMovements: ReconciliationMovement[];
  onRefreshData?: () => Promise<void>;
  onInvalidateCache?: () => void;
  validateTenantContext: () => Promise<boolean>;
  logSecurityEvent: (event: string, details?: any) => Promise<void>;
}

// AIDEV-NOTE: Interface para retorno do hook de ações
export interface UseReconciliationActionsReturn {
  actionModal: ActionModalState;
  isExporting: boolean;
  handleRefresh: () => Promise<void>;
  handleExport: () => Promise<void>;
  handleReconciliationAction: (movement: ReconciliationMovement) => void;
  handleActionModalConfirm: (movement: ReconciliationMovement, action: ReconciliationAction, formData?: any) => Promise<void>;
  closeActionModal: () => void;
}

// AIDEV-NOTE: Hook customizado para gerenciar ações do modal
export const useReconciliationActions = ({
  currentTenant,
  movements,
  filteredMovements,
  onRefreshData,
  onInvalidateCache,
  validateTenantContext,
  logSecurityEvent
}: UseReconciliationActionsProps): UseReconciliationActionsReturn => {
  const { toast } = useToast();
  const { logAction } = useAuditLogger();
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Estados locais para ações
  const [actionModal, setActionModal] = useState<ActionModalState>(INITIAL_ACTION_MODAL_STATE);
  const [isExporting, setIsExporting] = useState(false);

  // AIDEV-NOTE: Função para invalidar cache de conciliação
  const invalidateReconciliationCache = useCallback(async () => {
    if (!currentTenant?.id) return;

    try {
      // AIDEV-NOTE: Invalidar queries específicas de conciliação
      await queryClient.invalidateQueries({
        queryKey: ['reconciliation', currentTenant.id]
      });

      // AIDEV-NOTE: Invalidar queries relacionadas
      await queryClient.invalidateQueries({
        queryKey: ['conciliation_staging', currentTenant.id]
      });

      // AIDEV-NOTE: Chamar callback de invalidação se fornecido
      if (onInvalidateCache) {
        onInvalidateCache();
      }

      console.log('✅ Cache de conciliação invalidado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao invalidar cache:', error);
    }
  }, [currentTenant?.id, queryClient, onInvalidateCache]);

  // AIDEV-NOTE: Função para refresh dos dados
  const handleRefresh = useCallback(async (): Promise<void> => {
    try {
      // AIDEV-NOTE: Validar contexto de segurança antes do refresh
      const isValidContext = await validateTenantContext();
      if (!isValidContext) {
        toast({
          title: "🚫 Erro de Segurança",
          description: "Não foi possível validar o contexto para atualizar os dados.",
          variant: "destructive",
        });
        return;
      }

      await logSecurityEvent('data_refresh_initiated');
      
      toast({
        title: "🔄 Atualizando dados...",
        description: "Carregando informações mais recentes.",
      });

      // AIDEV-NOTE: Invalidar cache primeiro para forçar nova busca
      await invalidateReconciliationCache();

      // AIDEV-NOTE: Chamar refresh se fornecido, senão usar invalidação
      if (onRefreshData) {
        await onRefreshData();
      }

      await logAction('reconciliation_data_refreshed', {
        tenant_id: currentTenant?.id,
        total_movements: movements.length,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "✅ Dados atualizados",
        description: "As informações foram carregadas com sucesso.",
      });

    } catch (error: any) {
      console.error('❌ Erro ao atualizar dados:', error);
      
      await logAction('reconciliation_refresh_error', {
        tenant_id: currentTenant?.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "❌ Erro na atualização",
        description: "Não foi possível atualizar os dados. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [validateTenantContext, logSecurityEvent, onRefreshData, movements.length, currentTenant, logAction, toast, invalidateReconciliationCache]);

  // AIDEV-NOTE: Função para exportar dados
  const handleExport = useCallback(async (): Promise<void> => {
    if (!currentTenant) {
      toast({
        title: "🚫 Erro de Segurança",
        description: "Tenant não identificado para exportação.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // AIDEV-NOTE: Validar contexto de segurança antes da exportação
      const isValidContext = await validateTenantContext();
      if (!isValidContext) {
        toast({
          title: "🚫 Erro de Segurança",
          description: "Não foi possível validar o contexto para exportação.",
          variant: "destructive",
        });
        return;
      }

      await logSecurityEvent('export_initiated', {
        total_movements: filteredMovements.length
      });

      // AIDEV-NOTE: Preparar dados para exportação
      const exportData = filteredMovements.map(movement => ({
        id: movement.id,
        data: movement.date,
        valor: movement.amount,
        status_pagamento: movement.paymentStatus,
        status_conciliacao: movement.reconciliationStatus,
        origem: movement.source,
        cliente: movement.customerName,
        contrato: movement.contractNumber || 'N/A',
        parcela: movement.installmentNumber || 'N/A',
        metodo_pagamento: movement.paymentMethod || 'N/A',
        observacoes: movement.observations || ''
      }));

      // AIDEV-NOTE: Criar CSV
      const headers = [
        'ID', 'Data', 'Valor', 'Status Pagamento', 'Status Conciliação',
        'Origem', 'Cliente', 'Contrato', 'Parcela', 'Método Pagamento', 'Observações'
      ];

      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          Object.values(row).map(value => 
            typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          ).join(',')
        )
      ].join('\n');

      // AIDEV-NOTE: Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `conciliacao_${currentTenant.name}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await logAction('reconciliation_data_exported', {
        tenant_id: currentTenant.id,
        total_exported: filteredMovements.length,
        export_format: 'CSV',
        timestamp: new Date().toISOString()
      });

      toast({
        title: "✅ Exportação concluída",
        description: `${filteredMovements.length} registros exportados com sucesso.`,
      });

    } catch (error: any) {
      console.error('❌ Erro na exportação:', error);
      
      await logAction('reconciliation_export_error', {
        tenant_id: currentTenant?.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "❌ Erro na exportação",
        description: "Não foi possível exportar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [currentTenant, filteredMovements, validateTenantContext, logSecurityEvent, logAction, toast]);

  // AIDEV-NOTE: Função para abrir modal de ação
  const handleReconciliationAction = useCallback((action: any, movement: ReconciliationMovement): void => {
    setActionModal({
      isOpen: true,
      action,
      movement
    });

    logSecurityEvent('action_modal_opened', {
      movement_id: movement.id,
      action_type: action,
      current_status: movement.reconciliationStatus
    });
  }, [logSecurityEvent]);

  // AIDEV-NOTE: Função para confirmar ação no modal
  const handleActionModalConfirm = useCallback(async (
    movement: ReconciliationMovement, 
    action: ReconciliationAction, 
    formData?: any
  ): Promise<void> => {
    if (!currentTenant) {
      toast({
        title: "🚫 Erro de Segurança",
        description: "Tenant não identificado para ação.",
        variant: "destructive",
      });
      return;
    }

    try {
      // AIDEV-NOTE: Configurar contexto de tenant antes da validação
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant.id 
      });

      // AIDEV-NOTE: Validar contexto de segurança após configuração
      const isValidContext = await validateTenantContext();
      if (!isValidContext) {
        toast({
          title: "🚫 Erro de Segurança",
          description: "Não foi possível validar o contexto para executar a ação.",
          variant: "destructive",
        });
        return;
      }

      await logSecurityEvent('reconciliation_action_initiated', {
        action_type: action,
        movement_id: movement.id
      });

      // AIDEV-NOTE: Executar ação baseada no tipo
      let updateData: any = {};
      let successMessage = '';

      switch (action) {
        case ReconciliationAction.RECONCILE:
          updateData = { status_conciliacao: 'CONCILIADO' }; // AIDEV-NOTE: Status em MAIÚSCULO
          successMessage = 'Movimento conciliado com sucesso';
          break;
        case ReconciliationAction.MARK_DIVERGENT:
          updateData = { status_conciliacao: 'DIVERGENTE' }; // AIDEV-NOTE: Status em MAIÚSCULO
          successMessage = 'Movimento marcado como divergente';
          break;
        case ReconciliationAction.CANCEL:
          updateData = { status_conciliacao: 'CANCELADO' }; // AIDEV-NOTE: Status em MAIÚSCULO
          successMessage = 'Movimento cancelado';
          break;
        case ReconciliationAction.LINK_TO_CONTRACT:
          // AIDEV-NOTE: Para vincular contrato, usar dados do formulário
          if (!formData?.contractId) {
            throw new Error('ID do contrato é obrigatório para vinculação');
          }
          updateData = { 
            contrato_id: formData.contractId, // AIDEV-NOTE: Corrigido para contrato_id (nome correto da coluna)
            status_conciliacao: 'CONCILIADO' // AIDEV-NOTE: Status em MAIÚSCULO
          };
          successMessage = 'Movimento vinculado ao contrato com sucesso';
          break;
        default:
          throw new Error(`Ação não reconhecida: ${action}`);
      }

      // AIDEV-NOTE: Atualizar no banco de dados - usando tabela correta
      const { error } = await supabase
        .from('conciliation_staging')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', movement.id)
        .eq('tenant_id', currentTenant.id); // AIDEV-NOTE: Segurança adicional

      if (error) {
        throw error;
      }

      await logAction('reconciliation_action_completed', {
        tenant_id: currentTenant.id,
        action_type: action,
        movement_id: movement.id,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "✅ Ação executada",
        description: successMessage,
      });

      // AIDEV-NOTE: Fechar modal e invalidar cache para atualizar dados
      setActionModal(INITIAL_ACTION_MODAL_STATE);
      
      // AIDEV-NOTE: Invalidar cache primeiro para garantir dados atualizados
      await invalidateReconciliationCache();
      
      // AIDEV-NOTE: Chamar refresh se fornecido
      if (onRefreshData) {
        await onRefreshData();
      }

    } catch (error: any) {
      console.error('❌ Erro na ação de conciliação:', error);
      
      await logAction('reconciliation_action_error', {
        tenant_id: currentTenant?.id,
        action_type: action,
        movement_id: movement.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "❌ Erro na ação",
        description: "Não foi possível executar a ação. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [currentTenant, validateTenantContext, logSecurityEvent, logAction, toast, invalidateReconciliationCache, onRefreshData]);

  // AIDEV-NOTE: Função para fechar modal de ação
  const closeActionModal = useCallback((): void => {
    setActionModal(INITIAL_ACTION_MODAL_STATE);
    
    logSecurityEvent('action_modal_closed');
  }, [logSecurityEvent]);

  return {
    actionModal,
    isExporting,
    handleRefresh,
    handleExport,
    handleReconciliationAction,
    handleActionModalConfirm,
    closeActionModal
  };
};
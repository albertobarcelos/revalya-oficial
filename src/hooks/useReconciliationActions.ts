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
import { reconciliationImportService, ImportToChargesResult } from '@/services/reconciliationImportService';

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
  isImportingToCharges: boolean;
  handleRefresh: () => Promise<void>;
  handleExport: () => Promise<void>;
  handleBulkImportToCharges: (movementIds: string[]) => Promise<ImportToChargesResult>;
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
  const [isImportingToCharges, setIsImportingToCharges] = useState(false);

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
  const handleReconciliationAction = useCallback((movement: ReconciliationMovement, action: ReconciliationAction, selectedMovements?: ReconciliationMovement[]): void => {
    setActionModal({
      isOpen: true,
      action,
      movement,
      movements: selectedMovements // Adicionando suporte para múltiplas seleções
    });

    logSecurityEvent('action_modal_opened', {
      movement_id: movement.id,
      action_type: action,
      current_status: movement.reconciliationStatus,
      batch_size: selectedMovements?.length || 1
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
        case ReconciliationAction.IMPORT_TO_CHARGE:
          // AIDEV-NOTE: Para importar para charges, usar o serviço de importação
          try {
            const result = await handleBulkImportToCharges([movement.id]);
            
            if (result.success && result.imported_count > 0) {
              successMessage = 'Movimento importado para cobranças com sucesso';
              // AIDEV-NOTE: Fechar modal após sucesso
              setActionModal(INITIAL_ACTION_MODAL_STATE);
              
              // AIDEV-NOTE: Invalidar cache e refresh
              await invalidateReconciliationCache();
              if (onRefreshData) {
                await onRefreshData();
              }
              
              return; // AIDEV-NOTE: Sair da função pois já foi processado
            } else {
              throw new Error('Falha na importação para cobranças');
            }
          } catch (importError: any) {
            throw new Error(`Erro na importação: ${importError.message}`);
          }
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

  // AIDEV-NOTE: Função para importação em lote para charges
  const handleBulkImportToCharges = useCallback(async (movementIds: string[]): Promise<ImportToChargesResult> => {
    if (!currentTenant?.id) {
      throw new Error('Tenant não identificado');
    }

    if (movementIds.length === 0) {
      throw new Error('Nenhuma movimentação selecionada');
    }

    // AIDEV-NOTE: Validar contexto de tenant antes de prosseguir
    const isValidContext = await validateTenantContext();
    if (!isValidContext) {
      await logSecurityEvent('invalid_tenant_context_bulk_import', {
        tenant_id: currentTenant.id,
        movement_count: movementIds.length
      });
      throw new Error('Contexto de tenant inválido');
    }

    setIsImportingToCharges(true);

    try {
      // AIDEV-NOTE: Log de início da importação
      await logAction('bulk_import_to_charges_started', {
        tenant_id: currentTenant.id,
        movement_count: movementIds.length,
        movement_ids: movementIds,
        timestamp: new Date().toISOString()
      });

      // AIDEV-NOTE: Executar importação usando o serviço
      const result = await reconciliationImportService.importToCharges(
        movementIds,
        currentTenant.id
      );

      // AIDEV-NOTE: Log de resultado da importação
      await logAction('bulk_import_to_charges_completed', {
        tenant_id: currentTenant.id,
        result: result,
        timestamp: new Date().toISOString()
      });

      // AIDEV-NOTE: Mostrar toast de sucesso/erro baseado no resultado
      if (result.success) {
        const successMessage = `✅ Importação concluída: ${result.imported_count} cobranças criadas`;
        const warningMessage = result.skipped_count > 0 ? `, ${result.skipped_count} ignoradas` : '';
        const errorMessage = result.error_count > 0 ? `, ${result.error_count} com erro` : '';
        
        toast({
          title: "Importação para Cobranças",
          description: `${successMessage}${warningMessage}${errorMessage}`,
          variant: result.error_count > 0 ? "destructive" : "default",
        });
      } else {
        toast({
          title: "❌ Falha na Importação",
          description: "Não foi possível importar as movimentações. Verifique os logs.",
          variant: "destructive",
        });
      }

      // AIDEV-NOTE: Invalidar cache para atualizar dados
      await invalidateReconciliationCache();
      
      // AIDEV-NOTE: Invalidar cache de charges também
      await queryClient.invalidateQueries({
        queryKey: ['charges', currentTenant.id]
      });
      
      // AIDEV-NOTE: Chamar refresh se fornecido
      if (onRefreshData) {
        await onRefreshData();
      }

      return result;

    } catch (error: any) {
      console.error('❌ Erro na importação em lote:', error);
      
      await logAction('bulk_import_to_charges_error', {
        tenant_id: currentTenant.id,
        movement_count: movementIds.length,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "❌ Erro na Importação",
        description: error.message || "Não foi possível importar as movimentações.",
        variant: "destructive",
      });

      throw error;
    } finally {
      setIsImportingToCharges(false);
    }
  }, [currentTenant, validateTenantContext, logSecurityEvent, logAction, toast, reconciliationImportService, invalidateReconciliationCache, queryClient, onRefreshData]);

  return {
    actionModal,
    isExporting,
    isImportingToCharges,
    handleRefresh,
    handleExport,
    handleBulkImportToCharges,
    handleReconciliationAction,
    handleActionModalConfirm,
    closeActionModal
  };
};
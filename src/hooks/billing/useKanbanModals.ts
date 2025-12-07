// AIDEV-NOTE: Hook para gerenciamento de modais do Kanban de Faturamento
// Centraliza lógica de abertura/fechamento de modais

import { useState, useCallback } from 'react';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { toast } from '@/hooks/use-toast';
import type { KanbanModalState } from '@/types/billing/kanban.types';

/**
 * Estado inicial dos modais
 */
const getInitialState = (): KanbanModalState => ({
  isContractModalOpen: false,
  selectedPeriodId: null,
  contractMode: 'view',
  isStandaloneBillingOpen: false,
});

/**
 * Hook para gerenciar modais do Kanban
 *
 * @returns Objeto com estado dos modais e funções de controle
 */
export function useKanbanModals() {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const [modalState, setModalState] = useState<KanbanModalState>(getInitialState);

  /**
   * Abre modal de detalhes da ordem de faturamento com validações de segurança
   *
   * @param periodId - ID do período de faturamento
   */
  const openDetailsModal = useCallback(
    (periodId: string) => {
      // Previne múltiplos cliques rápidos
      if (modalState.isContractModalOpen) return;

      // AIDEV-NOTE: CAMADA 1 e 2 - Validação de acesso e tenant (conforme guia)
      if (!hasAccess || !currentTenant?.id) {
        console.warn('🚫 [SECURITY] Acesso negado ou tenant inválido ao abrir detalhes');
        toast({
          title: 'Erro de acesso',
          description: 'Não foi possível abrir os detalhes. Verifique suas permissões.',
          variant: 'destructive',
        });
        return;
      }

      // AIDEV-NOTE: CAMADA 5 - Validação crítica antes da operação (conforme guia)
      if (!periodId || periodId.trim() === '') {
        console.error('❌ [SECURITY] periodId está vazio ou inválido:', periodId);
        toast({
          title: 'Erro de validação',
          description: 'ID do período inválido.',
          variant: 'destructive',
        });
        return;
      }

      // AIDEV-NOTE: Validação adicional - garantir que tenant_id não está vazio
      if (!currentTenant.id || currentTenant.id.trim() === '') {
        console.error('❌ [SECURITY] Tenant ID está vazio ou inválido');
        toast({
          title: 'Erro de segurança',
          description: 'Tenant inválido. Tente fazer login novamente.',
          variant: 'destructive',
        });
        return;
      }

      // AIDEV-NOTE: Log de auditoria (conforme guia)
      console.log(
        `🔍 [AUDIT] Abrindo detalhes da ordem - Tenant: ${currentTenant.name}, PeriodId: ${periodId}`
      );

      setModalState((prev) => ({
        ...prev,
        selectedPeriodId: periodId,
        isContractModalOpen: true,
        contractMode: 'view',
      }));

      console.log('✅ [MODAL DEBUG] Modal aberto para período:', periodId);
    },
    [modalState.isContractModalOpen, hasAccess, currentTenant]
  );

  /**
   * Fecha modal de detalhes da ordem de faturamento
   */
  const closeDetailsModal = useCallback(() => {
    console.log('Fechando modal de ordem de faturamento');
    setModalState((prev) => ({
      ...prev,
      isContractModalOpen: false,
      selectedPeriodId: null,
    }));
  }, []);

  /**
   * Altera modo do modal para edição
   */
  const setEditMode = useCallback(() => {
    setModalState((prev) => ({
      ...prev,
      contractMode: 'edit',
    }));
  }, []);

  /**
   * Abre modal de faturamento avulso
   */
  const openStandaloneBillingModal = useCallback(() => {
    console.log('🔵 [STANDALONE] Abrindo dialog de faturamento avulso');
    setModalState((prev) => ({
      ...prev,
      isStandaloneBillingOpen: true,
    }));
  }, []);

  /**
   * Fecha modal de faturamento avulso
   */
  const closeStandaloneBillingModal = useCallback(() => {
    console.log('🔴 [STANDALONE] Fechando dialog de faturamento avulso');
    setModalState((prev) => ({
      ...prev,
      isStandaloneBillingOpen: false,
    }));
  }, []);

  /**
   * Reseta todos os modais para o estado inicial
   */
  const resetModals = useCallback(() => {
    setModalState(getInitialState());
  }, []);

  return {
    // Estado
    isContractModalOpen: modalState.isContractModalOpen,
    selectedPeriodId: modalState.selectedPeriodId,
    contractMode: modalState.contractMode,
    isStandaloneBillingOpen: modalState.isStandaloneBillingOpen,

    // Ações
    openDetailsModal,
    closeDetailsModal,
    setEditMode,
    openStandaloneBillingModal,
    closeStandaloneBillingModal,
    resetModals,
  };
}

export default useKanbanModals;

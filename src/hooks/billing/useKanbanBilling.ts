// AIDEV-NOTE: Hook para processamento de faturamento no Kanban
// Gerencia seleção de contratos, validações de segurança e processamento em lote

import { useState, useCallback } from 'react';
import { useTenantAccessGuard, useSecureTenantMutation } from '@/hooks/templates/useSecureTenantQuery';
import { useSupabase } from '@/hooks/useSupabase';
import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { forceSessionRefresh } from '@/utils/authGuard';
import type { BillingResult, BillingMutationVariables } from '@/types/billing/kanban.types';

interface UseKanbanBillingProps {
  refreshData: () => Promise<void>;
}

interface UseKanbanBillingReturn {
  // Estado
  selectedContracts: Set<string>;
  isBilling: boolean;
  showCheckboxes: boolean;

  // Ações
  handleSelectionChange: (periodId: string, selected: boolean) => void;
  toggleSelectionMode: () => void;
  handleBilling: () => Promise<void>;
  clearSelection: () => void;
}

/**
 * Hook para gerenciar faturamento no Kanban
 *
 * @param props - Propriedades do hook
 * @returns Objeto com estado e funções de faturamento
 */
export function useKanbanBilling({ refreshData }: UseKanbanBillingProps): UseKanbanBillingReturn {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const { user } = useSupabase();

  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [isBilling, setIsBilling] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  /**
   * Handler para mudança de seleção de contratos
   * Usa period_id (contract.id) em vez de contract_id
   */
  const handleSelectionChange = useCallback((periodId: string, selected: boolean) => {
    setSelectedContracts((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(periodId);
      } else {
        newSet.delete(periodId);
      }
      return newSet;
    });
  }, []);

  /**
   * Alterna modo de seleção
   */
  const toggleSelectionMode = useCallback(() => {
    setShowCheckboxes((prev) => !prev);
    if (showCheckboxes) {
      setSelectedContracts(new Set());
    }
  }, [showCheckboxes]);

  /**
   * Limpa seleção de contratos
   */
  const clearSelection = useCallback(() => {
    setSelectedContracts(new Set());
    setShowCheckboxes(false);
  }, []);

  // AIDEV-NOTE: Hook seguro para mutação de faturamento usando attempt_billing_period_charge
  const billingMutation = useSecureTenantMutation<BillingResult, BillingMutationVariables>(
    async (supabase, tenantId, variables) => {
      const { periodIds } = variables;
      let successCount = 0;
      let errorCount = 0;

      // AIDEV-NOTE: Forçar refresh da sessão antes de processar cobranças críticas
      const authCheck = await forceSessionRefresh();
      if (!authCheck.success) {
        throw new Error(
          `Falha na autenticação: ${authCheck.error}. Tente fazer login novamente.`
        );
      }

      console.log('✅ [BILLING] Sessão refreshada com sucesso para usuário:', authCheck.user?.id);
      console.log('🔒 [BILLING] Processando faturamento para tenant:', tenantId);

      // AIDEV-NOTE: CAMADA 4 - Configuração explícita de contexto de tenant (OBRIGATÓRIO)
      try {
        await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: tenantId,
        });
        console.log('🛡️ [SECURITY] Contexto de tenant configurado:', tenantId);
      } catch (contextError) {
        console.error('❌ [SECURITY] Falha ao configurar contexto de tenant:', contextError);
        throw new Error('Falha na configuração de segurança. Tente novamente.');
      }

      // AIDEV-NOTE: Processar cada período de faturamento
      for (const periodId of periodIds) {
        try {
          // AIDEV-NOTE: CAMADA 5 - Validação crítica antes da operação
          if (!tenantId || !periodId) {
            console.error('❌ [SECURITY] Parâmetros inválidos:', { tenantId, periodId });
            errorCount++;
            continue;
          }

          console.log(`📋 [BILLING] Processando período de faturamento: ${periodId}`);

          // AIDEV-NOTE: Verificar se é período avulso ou de contrato
          const { data: standalonePeriod } = await supabase
            .from('standalone_billing_periods')
            .select('id')
            .eq('id', periodId)
            .eq('tenant_id', tenantId)
            .single();

          let result: { success: boolean; charge_id?: string; error?: string };
          let billingError: Error | null = null;

          if (standalonePeriod) {
            // AIDEV-NOTE: É um faturamento avulso - usar serviço completo
            console.log(`📋 [BILLING] Processando faturamento avulso: ${periodId}`);
            try {
              const standaloneBillingServiceModule = await import(
                '@/services/standaloneBillingService'
              );
              const { standaloneBillingService } = standaloneBillingServiceModule;
              const processResult = await standaloneBillingService.processStandaloneBilling(
                supabase,
                tenantId,
                periodId
              );

              if (processResult.success) {
                result = {
                  success: true,
                  charge_id: processResult.charge_id,
                };
                billingError = null;
              } else {
                result = { success: false, error: processResult.error };
                billingError = new Error(
                  processResult.error || 'Erro ao processar faturamento avulso'
                );
              }
            } catch (serviceError) {
              console.error(
                '❌ [BILLING] Erro ao processar faturamento avulso via serviço:',
                serviceError
              );
              result = {
                success: false,
                error:
                  serviceError instanceof Error ? serviceError.message : 'Erro desconhecido',
              };
              billingError = serviceError instanceof Error ? serviceError : null;
            }
          } else {
            // AIDEV-NOTE: É um período de contrato - usar função original
            console.log(`📋 [BILLING] Processando período de contrato: ${periodId}`);
            const { data: contractResult, error: contractError } = await supabase.rpc(
              'attempt_billing_period_charge',
              {
                p_period_id: periodId,
                p_tenant_id: tenantId,
              }
            );

            result = contractResult || { success: false };
            billingError = contractError ? new Error(contractError.message) : null;
          }

          if (billingError) {
            console.error('❌ [BILLING] Erro ao processar período:', billingError);
            errorCount++;
            continue;
          }

          // AIDEV-NOTE: Verificar resultado da operação
          if (result?.success) {
            console.log(
              `✅ [BILLING] Período ${periodId} faturado com sucesso. Charge ID: ${result.charge_id}`
            );
            successCount++;
          } else {
            console.error(
              `❌ [BILLING] Falha ao faturar período ${periodId}:`,
              result?.error || 'Erro desconhecido'
            );
            errorCount++;
          }
        } catch (error) {
          console.error('❌ [BILLING] Erro no processamento do período:', error);
          errorCount++;
        }
      }

      return { successCount, errorCount };
    },
    {
      onSuccess: ({ successCount, errorCount }) => {
        // Mostrar resultado
        if (successCount > 0) {
          toast({
            title: 'Faturamento realizado',
            description: `${successCount} contrato(s) faturado(s) com sucesso.${
              errorCount > 0 ? ` ${errorCount} erro(s) encontrado(s).` : ''
            }`,
          });
        }

        if (errorCount > 0 && successCount === 0) {
          toast({
            title: 'Erro no faturamento',
            description: `Não foi possível faturar nenhum contrato. ${errorCount} erro(s) encontrado(s).`,
            variant: 'destructive',
          });
        }

        // Limpar seleção e atualizar dados
        setSelectedContracts(new Set());
        setShowCheckboxes(false);
        refreshData();
      },
      onError: (error) => {
        console.error('❌ [BILLING] Erro geral no faturamento:', error);
        toast({
          title: 'Erro no faturamento',
          description: error.message || 'Ocorreu um erro inesperado durante o faturamento.',
          variant: 'destructive',
        });
      },
      invalidateQueries: ['kanban', 'charges', 'contracts'],
    }
  );

  /**
   * Função wrapper para iniciar o faturamento
   * Usa period_ids em vez de contract_ids e attempt_billing_period_charge
   */
  const handleBilling = useCallback(async () => {
    if (!currentTenant || selectedContracts.size === 0) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione pelo menos um período para faturar.',
        variant: 'destructive',
      });
      return;
    }

    setIsBilling(true);
    try {
      const periodIds = Array.from(selectedContracts);
      console.log('🚀 [BILLING] Iniciando faturamento para períodos:', periodIds);

      // Log de auditoria - início do faturamento
      await logger.audit({
        userId: user?.id || 'anonymous',
        tenantId: currentTenant.id,
        action: 'CREATE',
        resourceType: 'BILLING',
        resourceId: periodIds.join(','),
        metadata: {
          operation: 'bulk_billing_started',
          period_count: periodIds.length,
          period_ids: periodIds,
        },
      });

      const result = await billingMutation.mutateAsync({ periodIds });

      // Log de auditoria - resultado do faturamento
      await logger.audit({
        userId: user?.id || 'anonymous',
        tenantId: currentTenant.id,
        action: 'CREATE',
        resourceType: 'BILLING',
        resourceId: periodIds.join(','),
        metadata: {
          operation: 'bulk_billing_completed',
          success_count: result?.successCount || 0,
          error_count: result?.errorCount || 0,
          total_processed: periodIds.length,
        },
      });
    } catch (error) {
      // Log de auditoria - erro no faturamento
      await logger.audit({
        userId: user?.id || 'anonymous',
        tenantId: currentTenant?.id || '',
        action: 'CREATE',
        resourceType: 'BILLING',
        resourceId: Array.from(selectedContracts).join(','),
        metadata: {
          operation: 'bulk_billing_failed',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido',
          period_count: selectedContracts.size,
          period_ids: Array.from(selectedContracts),
        },
      });

      // Erro já tratado no onError do mutation
      console.error('❌ [BILLING] Erro capturado no handleBilling:', error);
    } finally {
      setIsBilling(false);
    }
  }, [currentTenant, selectedContracts, billingMutation, user?.id]);

  return {
    // Estado
    selectedContracts,
    isBilling,
    showCheckboxes,

    // Ações
    handleSelectionChange,
    toggleSelectionMode,
    handleBilling,
    clearSelection,
  };
}

export default useKanbanBilling;

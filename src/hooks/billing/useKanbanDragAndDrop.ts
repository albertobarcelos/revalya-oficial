// AIDEV-NOTE: Hook para lógica de drag & drop no Kanban de Faturamento
// Gerencia eventos de arrastar e soltar contratos entre colunas

import { useState, useCallback } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { insertChargeWithAuthContext } from '@/utils/chargeUtils';
import { mapPaymentMethodToChargeType } from '@/utils/billing/paymentMethodMapper';
import { isValidColumnId, VALID_COLUMN_IDS } from '@/utils/billing/kanbanColumnConfig';
import { format, startOfDay } from 'date-fns';
import type { KanbanContract, KanbanData, KanbanColumnId } from '@/types/billing/kanban.types';

interface UseKanbanDragAndDropProps {
  kanbanData: KanbanData;
  updateContractStatus: (
    contractId: string,
    chargeId: string | undefined,
    newStatus: string
  ) => Promise<void>;
  refreshData: () => Promise<void>;
}

interface UseKanbanDragAndDropReturn {
  activeContract: KanbanContract | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  handleDragCancel: () => void;
}

/**
 * Hook para gerenciar drag & drop no Kanban
 *
 * @param props - Propriedades do hook
 * @returns Objeto com estado e handlers de drag & drop
 */
export function useKanbanDragAndDrop({
  kanbanData,
  updateContractStatus,
  refreshData,
}: UseKanbanDragAndDropProps): UseKanbanDragAndDropReturn {
  const { currentTenant } = useTenantAccessGuard();
  const [activeContract, setActiveContract] = useState<KanbanContract | null>(null);

  /**
   * Handler para início do drag
   */
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const contractId = active.id as string;

      // Encontrar o contrato ativo em todas as colunas
      const allContracts = Object.values(kanbanData).flat();
      const contract = allContracts.find((c) => c.id === contractId);
      setActiveContract(contract || null);
    },
    [kanbanData]
  );

  /**
   * Handler para fim do drag
   */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveContract(null);

      if (!over) return;

      const contractId = active.id as string;
      const newColumnId = over.id as string;

      // Verificar se é uma coluna válida
      if (!isValidColumnId(newColumnId)) {
        return;
      }

      // AIDEV-NOTE: Otimização - criar mapa de contratos para busca mais eficiente
      const contractMap = new Map<
        string,
        { contract: KanbanContract; columnId: KanbanColumnId }
      >();

      (Object.entries(kanbanData) as [KanbanColumnId, KanbanContract[]][]).forEach(
        ([columnId, columnContracts]) => {
          columnContracts.forEach((contract) => {
            contractMap.set(contract.id, { contract, columnId });
          });
        }
      );

      const contractInfo = contractMap.get(contractId);
      if (!contractInfo) {
        console.warn('Contrato não encontrado:', contractId);
        return;
      }

      const { contract: contractToMove, columnId: sourceColumnId } = contractInfo;

      if (!contractToMove || !sourceColumnId || sourceColumnId === newColumnId) {
        return;
      }

      // AIDEV-NOTE: Lógica corrigida para lidar com contratos sem billing_id
      try {
        if (newColumnId === 'faturados') {
          // Se o contrato não tem billing_id, precisamos criar uma cobrança primeiro
          if (!contractToMove.billing_id) {
            console.log(
              '🔄 Criando cobrança para contrato sem billing_id:',
              contractToMove.contract_id
            );

            // AIDEV-NOTE: Buscar método de pagamento do contrato com contexto seguro
            let paymentMethod = 'boleto'; // Default fallback
            try {
              // AIDEV-NOTE: Configura contexto de tenant antes de consulta para garantir RLS
              await supabase.rpc('set_tenant_context_simple', {
                p_tenant_id: currentTenant?.id,
              });
              const { data: contractData } = await supabase
                .from('contracts')
                .select('contract_services(payment_method), contract_products(payment_method)')
                .eq('id', contractToMove.contract_id)
                .eq('tenant_id', currentTenant?.id)
                .single();

              // Pegar o primeiro método de pagamento encontrado
              const serviceMethod = contractData?.contract_services?.[0]?.payment_method;
              const productMethod = contractData?.contract_products?.[0]?.payment_method;
              paymentMethod = serviceMethod || productMethod || 'boleto';
            } catch (error) {
              console.warn('Erro ao buscar método de pagamento, usando padrão:', error);
            }

            // AIDEV-NOTE: Criar cobrança usando a função de utilidade com parâmetros corretos
            const chargeData = {
              tenant_id: currentTenant?.id,
              contract_id: contractToMove.contract_id,
              customer_id: contractToMove.customer_id,
              valor: contractToMove.amount,
              data_vencimento: format(startOfDay(new Date()), 'yyyy-MM-dd'),
              descricao: `Faturamento do contrato ${contractToMove.contract_number}`,
              status: 'RECEIVED', // Já marcar como recebido pois foi movido para 'faturados'
              tipo: mapPaymentMethodToChargeType(paymentMethod, null, null),
            };

            const result = await insertChargeWithAuthContext(chargeData);
            if (result.success) {
              console.log('✅ Cobrança criada com sucesso:', result.data?.id);
              toast({
                title: 'Sucesso',
                description: `Contrato ${contractToMove.contract_number} faturado com sucesso!`,
              });
            } else {
              throw new Error(result.error || 'Erro ao criar cobrança');
            }
          } else {
            // Se já tem billing_id, apenas atualizar o status
            await updateContractStatus(
              contractToMove.contract_id!,
              contractToMove.billing_id,
              'PAID'
            );
          }
        } else if (newColumnId === 'pendente') {
          // Para mover para pendente, só atualizar se já tiver billing_id
          if (contractToMove.billing_id) {
            await updateContractStatus(
              contractToMove.contract_id!,
              contractToMove.billing_id,
              'SCHEDULED'
            );
          }
        }

        // AIDEV-NOTE: Recarregar dados do kanban após operação bem-sucedida
        await refreshData();

        console.log(`✅ Contrato ${contractId} movido de ${sourceColumnId} para ${newColumnId}`);
      } catch (error) {
        console.error('❌ Erro ao processar movimento do contrato:', error);

        // AIDEV-NOTE: Em caso de erro, recarregar dados para reverter qualquer mudança otimista
        await refreshData();

        toast({
          title: 'Erro',
          description: `Erro ao mover contrato: ${
            error instanceof Error ? error.message : 'Erro desconhecido'
          }`,
          variant: 'destructive',
        });
      }
    },
    [kanbanData, currentTenant?.id, updateContractStatus, refreshData]
  );

  /**
   * Handler para cancelamento do drag
   */
  const handleDragCancel = useCallback(() => {
    setActiveContract(null);
  }, []);

  return {
    activeContract,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}

export default useKanbanDragAndDrop;

import { useCharges } from "@/hooks/useCharges";
import { useToast } from "@/components/ui/use-toast";
import type { Cobranca } from "@/types/database";

/**
 * Hook customizado para ações de cobrança que gerencia atualizações de status
 * e invalidação automática do cache
 */
export function useChargeActions() {
  const { toast } = useToast();
  const { updateCharge, isUpdating } = useCharges();

  /**
   * Marca uma cobrança como recebida em dinheiro
   */
  const markAsReceivedInCash = async (chargeId: string) => {
    try {
      updateCharge({
        chargeId,
        data: {
          status: "RECEIVED_IN_CASH",
          tipo: "CASH",
          data_pagamento: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Erro ao marcar cobrança como recebida em dinheiro:", error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a cobrança como recebida em dinheiro.",
        variant: "destructive",
      });
    }
  };

  /**
   * Marca uma cobrança como recebida via PIX
   */
  const markAsReceivedPix = async (chargeId: string) => {
    try {
      updateCharge({
        chargeId,
        data: {
          status: "RECEIVED_PIX",
          tipo: "PIX",
          data_pagamento: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Erro ao marcar cobrança como recebida via PIX:", error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a cobrança como recebida via PIX.",
        variant: "destructive",
      });
    }
  };

  /**
   * Marca uma cobrança como recebida via boleto
   */
  const markAsReceivedBoleto = async (chargeId: string) => {
    try {
      updateCharge({
        chargeId,
        data: {
          status: "RECEIVED_BOLETO",
          tipo: "BOLETO",
          data_pagamento: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Erro ao marcar cobrança como recebida via boleto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a cobrança como recebida via boleto.",
        variant: "destructive",
      });
    }
  };

  /**
   * Atualiza o status de uma cobrança de forma genérica
   */
  const updateChargeStatus = async (chargeId: string, status: string, additionalData?: any) => {
    try {
      updateCharge({
        chargeId,
        data: {
          status,
          data_pagamento: new Date().toISOString(),
          ...additionalData
        }
      });
    } catch (error) {
      console.error("Erro ao atualizar status da cobrança:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da cobrança.",
        variant: "destructive",
      });
    }
  };

  return {
    markAsReceivedInCash,
    markAsReceivedPix,
    markAsReceivedBoleto,
    updateChargeStatus,
    isUpdating
  };
}

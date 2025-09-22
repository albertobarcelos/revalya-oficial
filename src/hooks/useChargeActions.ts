import { useCharges } from "@/hooks/useCharges";
import { useToast } from "@/components/ui/use-toast";
import type { Cobranca } from "@/types/database";

/**
 * Hook customizado para ações de cobrança que gerencia atualizações de status
 * e invalidação automática do cache
 */
export function useChargeActions() {
  const { toast } = useToast();
  const { updateCharge, isUpdating, cancelCharge, isCancelling } = useCharges();

  /**
   * Marca uma cobrança como recebida em dinheiro
   */
  const markAsReceivedInCash = async (chargeId: string) => {
    try {
      updateCharge({
        id: chargeId,
        status: "RECEIVED_IN_CASH",
        tipo: "CASH",
        data_pagamento: new Date().toISOString()
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
        id: chargeId,
        status: "RECEIVED_PIX",
        tipo: "PIX",
        data_pagamento: new Date().toISOString()
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
   * Marca uma cobrança como recebida via Boleto
   */
  const markAsReceivedBoleto = async (chargeId: string) => {
    try {
      updateCharge({
        id: chargeId,
        status: "RECEIVED_BOLETO",
        tipo: "BOLETO",
        data_pagamento: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao marcar cobrança como recebida via Boleto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a cobrança como recebida via Boleto.",
        variant: "destructive",
      });
    }
  };

  /**
   * Atualiza o status de uma cobrança
   */
  const updateChargeStatus = async (chargeId: string, status: string) => {
    try {
      updateCharge({
        id: chargeId,
        status
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

  /**
   * Marca uma cobrança como paga baseado no tipo de pagamento
   */
  const markAsPaid = async (chargeId: string, paymentType: string) => {
    try {
      const statusMap: { [key: string]: string } = {
        'PIX': 'RECEIVED_PIX',
        'BOLETO': 'RECEIVED_BOLETO',
        'CASH': 'RECEIVED_IN_CASH',
        'DINHEIRO': 'RECEIVED_IN_CASH'
      };

      const status = statusMap[paymentType.toUpperCase()] || 'RECEIVED';

      updateCharge({
        id: chargeId,
        status,
        tipo: paymentType.toUpperCase(),
        data_pagamento: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao marcar cobrança como paga:", error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a cobrança como paga.",
        variant: "destructive",
      });
    }
  };

  /**
   * AIDEV-NOTE: Imprime boleto abrindo em nova aba
   */
  const printBoleto = (boletoUrl: string) => {
    try {
      window.open(boletoUrl, '_blank');
      toast({
        title: "Boleto aberto",
        description: "O boleto foi aberto em uma nova aba.",
      });
    } catch (error) {
      console.error("Erro ao abrir boleto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o boleto.",
        variant: "destructive",
      });
    }
  };

  /**
   * AIDEV-NOTE: Copia código PIX para a área de transferência
   */
  const copyPixCode = async (pixCode: string) => {
    try {
      await navigator.clipboard.writeText(pixCode);
      toast({
        title: "Código PIX copiado",
        description: "O código PIX foi copiado para a área de transferência.",
      });
    } catch (error) {
      console.error("Erro ao copiar código PIX:", error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar o código PIX.",
        variant: "destructive",
      });
    }
  };

  /**
   * AIDEV-NOTE: Envia mensagem para o cliente (placeholder - implementar integração)
   */
  const sendMessage = async (chargeId: string) => {
    try {
      // TODO: Implementar integração com sistema de mensagens
      console.log("Enviando mensagem para cobrança:", chargeId);
      toast({
        title: "Mensagem enviada",
        description: "A mensagem foi enviada para o cliente.",
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    }
  };

  return {
    // Funções de marcar como recebido específicas
    markAsReceivedInCash,
    markAsReceivedPix,
    markAsReceivedBoleto,
    
    // Função genérica para dar baixa
    markAsPaid,
    
    // Outras ações
    updateChargeStatus,
    cancelCharge,
    printBoleto,
    copyPixCode,
    sendMessage,
    
    // Estados de loading
    isUpdating,
    isCancelling
  };
}

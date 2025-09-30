import { useCharges } from "@/hooks/useCharges";
import { useToast } from "@/components/ui/use-toast";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { messageService } from "@/services/messageService";
import type { Cobranca } from "@/types/database";

/**
 * Hook customizado para ações de cobrança que gerencia atualizações de status
 * e invalidação automática do cache
 */
export function useChargeActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateCharge, isUpdating, cancelCharge, isCancelling } = useCharges();
  const { slug: tenantSlug } = useParams<{ slug: string }>();

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
   * AIDEV-NOTE: Envia mensagem padrão para o cliente via WhatsApp
   * Template: Olá {Cliente}! Você possui uma cobrança pendente...
   */
  const sendMessage = async (chargeId: string) => {
    try {
      // AIDEV-NOTE: Validar se tenantSlug está disponível
      if (!tenantSlug) {
        throw new Error("Tenant não identificado");
      }

      // AIDEV-NOTE: Buscar dados completos da cobrança incluindo customer
      const { data: charge, error: chargeError } = await supabase
        .from('charges')
        .select(`
          *,
          customers(name, phone)
        `)
        .eq('id', chargeId)
        .single();

      if (chargeError || !charge) {
        throw new Error("Cobrança não encontrada");
      }

      // AIDEV-NOTE: Validar se o cliente tem telefone
      if (!charge.customers?.phone) {
        throw new Error("Cliente não possui telefone cadastrado");
      }

      // AIDEV-NOTE: Formatar data de vencimento (ex: terça-feira, 30 de setembro de 2025)
      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        };
        return date.toLocaleDateString('pt-BR', options);
      };

      // AIDEV-NOTE: Formatar valor monetário
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      };

      // AIDEV-NOTE: Criar template de mensagem seguindo o padrão especificado
      const messageTemplate = `Olá ${charge.customers.name}!

Você possui uma cobrança pendente:

💰 Valor: ${formatCurrency(charge.valor)}
📅 Vencimento: ${formatDate(charge.data_vencimento)}
📝 Descrição: ${charge.descricao || 'Cobrança pendente'}

Por favor, entre em contato para regularizar sua situação.

Atenciosamente,

${tenantSlug}`;

      // AIDEV-NOTE: Limpar e formatar número de telefone
      const phoneNumber = charge.customers.phone.replace(/\D/g, '');

      // AIDEV-NOTE: Enviar mensagem via messageService
      const result = await messageService.sendMessage(
        tenantSlug,
        phoneNumber,
        messageTemplate,
        {
          delay: 1000,
          linkPreview: false
        }
      );

      if (!result.success) {
        throw new Error(result.error || "Erro ao enviar mensagem");
      }

      // AIDEV-NOTE: Registrar automaticamente no histórico de mensagens
      try {
        await messageService.recordMessageHistory(
          [charge], // Array com a cobrança
          [{
            charge: { id: charge.id },
            template: { message: messageTemplate }
          }], // Array com a mensagem
          'individual-message', // Template ID para mensagens individuais
          'Mensagem Individual', // Nome do template
          charge.tenant_id // Tenant ID obrigatório
        );
        console.log('✅ Histórico de mensagem individual registrado com sucesso');
        
        // AIDEV-NOTE: Invalidar cache do histórico de mensagens para atualização imediata
        queryClient.invalidateQueries({
          queryKey: ['message_history', charge.tenant_id, chargeId]
        });
        console.log('🔄 Cache do histórico de mensagens invalidado para sincronização');
        
      } catch (historyError) {
        console.error('⚠️ Erro ao registrar histórico da mensagem:', historyError);
        // Não falha o envio se o histórico falhar
      }

      toast({
        title: "Mensagem enviada",
        description: `A mensagem foi enviada para ${charge.customers.name}.`,
      });

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível enviar a mensagem.",
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

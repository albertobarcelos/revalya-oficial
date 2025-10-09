import { useCharges } from "@/hooks/useCharges";
import { useToast } from "@/components/ui/use-toast";
import { useTenantAccessGuard } from "@/hooks/useTenantAccessGuard";
import { supabase } from "@/lib/supabase";
import { edgeFunctionService } from "@/services/edgeFunctionService";
import type { Cobranca } from "@/types/database";

/**
 * Hook customizado para ações de cobrança que gerencia atualizações de status
 * e invalidação automática do cache
 */
export function useChargeActions() {
  const { toast } = useToast();
  const { updateCharge, isUpdating, cancelCharge, isCancelling } = useCharges();
  const { user, currentTenant } = useTenantAccessGuard();

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
   * AIDEV-NOTE: Função para enviar mensagem individual para o cliente
   * Utiliza a edge function send-bulk-messages que pode processar uma única cobrança
   */
  const sendMessage = async (chargeId: string, templateId?: string, customMessage?: string) => {
    if (!user || !currentTenant) {
      toast({
        title: "Erro",
        description: "Usuário ou tenant não identificado",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🚀 Enviando mensagem para cobrança:', chargeId);
      console.log('📋 Parâmetros:', { templateId, customMessage: customMessage ? 'presente' : 'ausente' });
      
      // AIDEV-NOTE: Configurar contexto de tenant para segurança
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant.id 
      });

      // AIDEV-NOTE: Buscar dados da cobrança para validação
      const { data: charge, error: chargeError } = await supabase
        .from('charges')
        .select('id, customer_name, customer_phone, amount, due_date, status')
        .eq('id', chargeId)
        .eq('tenant_id', currentTenant.id)
        .single();

      if (chargeError || !charge) {
        throw new Error('Cobrança não encontrada ou sem permissão de acesso');
      }

      // AIDEV-NOTE: Verificar se o cliente tem telefone para envio
      if (!charge.customer_phone) {
        toast({
          title: "Erro",
          description: "Cliente não possui telefone cadastrado para envio de mensagem",
          variant: "destructive",
        });
        return;
      }

      // AIDEV-NOTE: Usar edgeFunctionService para envio de mensagem individual
      // Se customMessage for fornecida, usar diretamente; senão usar templateId
      const result = await edgeFunctionService.sendBulkMessages(
        [chargeId],
        templateId || 'default_charge_reminder',
        true, // sendImmediately
        customMessage // customMessage será processada diretamente
      );

      // AIDEV-NOTE: Verificar resultado do envio
      if (result.success && result.summary.sent > 0) {
        toast({
          title: "Sucesso",
          description: "Mensagem enviada com sucesso para o cliente!",
        });
        console.log('✅ Mensagem enviada:', result);
        
        // AIDEV-NOTE: Log de auditoria para rastreabilidade
        console.log(`📋 [AUDIT] Mensagem enviada - Charge: ${chargeId}, Tenant: ${currentTenant.id}, User: ${user.id}, Template: ${templateId || 'custom'}`);
      } else {
        const errorMsg = result.results?.[0]?.message || 'Erro desconhecido no envio';
        toast({
          title: "Erro",
          description: `Erro ao enviar mensagem: ${errorMsg}`,
          variant: "destructive",
        });
        console.error('❌ Falha no envio:', result);
      }

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
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

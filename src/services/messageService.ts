import { supabase } from '@/lib/supabase';
import { processMessageTags } from '@/utils/messageUtils';
import type { Cobranca } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';
import { logService } from './logService';
import { whatsappService } from './whatsappService';
import { edgeFunctionService } from './edgeFunctionService';

interface MessageRecord {
  tenant_id: string;
  charge_id: string | null;
  template_id: string | null;
  customer_id: string | null;
  message: string | null;
  status: string | null;
  error_details: string | null;
  metadata: any | null;
  batch_id: string | null;
}

export const messageService = {
  // Crie uma propriedade na interface do serviço para armazenar a mensagem
  /** @type {string} */
  lastCustomMessage: '',

  /**
   * AIDEV-NOTE: Envia mensagens em massa usando Edge Function simplificada
   * Suporta tanto templates quanto mensagens diretas sem processamento complexo
   */
  async sendBulkMessages(chargeIds: string[], templateIdOrCustomMessage: string, customMessage?: string) {
    try {
      // AIDEV-NOTE: Validar chargeIds como array não vazio
      if (!Array.isArray(chargeIds) || chargeIds.length === 0) {
        throw new Error('chargeIds deve ser um array não vazio de strings');
      }

      // AIDEV-NOTE: Determinar se é mensagem customizada com validação rigorosa
      const hasValidCustomMessage = customMessage && customMessage.trim().length > 0;
      const hasValidTemplateMessage = templateIdOrCustomMessage && 
                                     !templateIdOrCustomMessage.startsWith('custom_') && 
                                     templateIdOrCustomMessage.trim().length > 0;
      
      // AIDEV-NOTE: Verificar se temos pelo menos uma mensagem válida
      if (!hasValidCustomMessage && !hasValidTemplateMessage) {
        throw new Error('É necessário fornecer templateId válido ou customMessage com conteúdo');
      }

      const isCustomMessage = hasValidCustomMessage;
      const directMessage = hasValidCustomMessage ? customMessage : undefined;
      
      console.log('📤 Enviando mensagens:', {
        chargeCount: chargeIds.length,
        isCustomMessage,
        hasDirectMessage: !!directMessage,
        templateId: isCustomMessage ? 'custom' : templateIdOrCustomMessage
      });

      // AIDEV-NOTE: Chamar Edge Function com payload corrigido
      const result = await edgeFunctionService.sendBulkMessages(
        chargeIds,
        templateIdOrCustomMessage,
        true, // sendImmediately (processado internamente, não enviado para Edge)
        directMessage // customMessage
      );

      console.log('✅ Resposta da Edge Function:', {
        success: result.success,
        summary: result.summary,
      });

      // AIDEV-NOTE: Verificar se houve sucesso
      if (!result.success) {
        throw new Error('Falha no envio de mensagens pela Edge Function');
      }

      // AIDEV-NOTE: Retornar formato compatível com o frontend
      return {
        success: true,
        count: result.summary.sent,
        data: {
          summary: result.summary,
          results: result.results,
        }
      };
    } catch (error) {
      console.error('❌ Erro no messageService.sendBulkMessages:', error);
      throw error;
    }
  },

  /**
   * Prepara as mensagens formatadas com tags processadas
   */
  prepareMessages(charges: Cobranca[], templateData: { message: string; name?: string }, templateId: string) {
    // Verificação reforçada da mensagem
    if (!templateData.message || templateData.message.trim() === '') {
      console.log('⚠️ Mensagem vazia detectada em prepareMessages');
      
      if (this.lastCustomMessage) {
        console.log('🔄 Recuperando mensagem do cache:', this.lastCustomMessage);
        templateData.message = this.lastCustomMessage;
      } else {
        console.log('❌ Não há mensagem em cache para recuperar');
        templateData.message = 'Mensagem não disponível';
      }
    }
    
    console.log('🔍 prepareMessages após verificação:', {
      templateMessage: templateData.message,
      templateId: templateId
    });

    return charges.map(charge => {
      // Garantir formato correto da data
      const dueDate = charge.data_vencimento.split('T')[0];
      
      // Processar tags na mensagem
      const processedMessage = processMessageTags(templateData.message, {
        customer: charge.customer || {},
        charge: {
          ...charge,
          data_vencimento: dueDate
        }
      });

      // Log para depuração do processamento de tags
      console.log(`✅ Mensagem processada para ${charge.id}:`, processedMessage);

      return {
        customer: {
          name: charge.customer?.name,
          phone: charge.customer?.phone?.replace(/\D/g, ''),
          document: charge.customer?.cpf_cnpj?.toString().replace(/\D/g, '') || '',
        },
        charge: {
          id: charge.id,
          amount: charge.valor,
          dueDate: dueDate,
          status: charge.status,
        },
        template: {
          id: templateId,
          message: processedMessage,
        }
      };
    });
  },

  /**
   * Envia mensagens para o serviço de WhatsApp
   */
  async sendToWebhook(messages: MessageRecord[], templateId: string) {
    // Verificação final antes de enviar
    const checkedMessages = messages.map(m => {
      if (!m.message_content && this.lastCustomMessage) {
        console.log('🛑 Corrigindo mensagem vazia antes do envio');
        m.message_content = this.lastCustomMessage;
      }
      return m;
    });
    
    console.log('📤 Enviando mensagens:', {
      messageCount: checkedMessages.length,
      firstMessageContent: checkedMessages[0]?.message_content?.substring(0, 50),
      templateId: templateId
    });
    
    return await whatsappService.sendMessages({
      messages: checkedMessages,
      templateId,
    });
  },

  /**
   * Registra o histórico das mensagens no banco de dados
   * AIDEV-NOTE: Função corrigida para segurança multi-tenant com filtros tenant_id obrigatórios
   */
  async recordMessageHistory(
    tenantId: string,
    charges: Cobranca[], 
    messages: { 
      charge: {
        id: string;
      };
      template: {
        message: string;
      };
    }[], 
    templateId: string, 
    templateName: string
  ) {
    console.log('📝 Registrando histórico com templateId:', templateId);
    
    // AIDEV-NOTE: Validação obrigatória de tenant_id
    if (!tenantId) {
      throw new Error('tenant_id é obrigatório para recordMessageHistory');
    }
    
    try {
      // AIDEV-NOTE: Buscar template válido APENAS do tenant correto para usar como fallback
      const { data: validTemplates } = await supabase
        .from('notification_templates')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1);
        
      // ID de template válido ou null se não encontrar nenhum
      const fallbackTemplateId = validTemplates && validTemplates.length > 0 ? validTemplates[0].id : null;
      console.log('Template de fallback encontrado:', fallbackTemplateId);
      
      // Verificar se é uma mensagem personalizada
      const isCustomMessage = templateId.startsWith('custom_') || this.lastCustomMessage;
      
      // AIDEV-NOTE: Verificar se o templateId existe na tabela APENAS para o tenant correto
      if (!isCustomMessage) {
        const { data: templateCheck } = await supabase
          .from('notification_templates')
          .select('id')
          .eq('id', templateId)
          .eq('tenant_id', tenantId)
          .single();
          
        if (!templateCheck) {
          console.log('⚠️ Template ID não existe na tabela para este tenant, usando fallback');
          templateId = fallbackTemplateId;
        }
      }
      
      // AIDEV-NOTE: Para mensagens personalizadas ou templates inválidos, usar fallback
      const historyRecords = charges.map(charge => {
        const messageObj = messages.find(m => m.charge.id === charge.id);
        
        return {
          tenant_id: tenantId, // AIDEV-NOTE: Campo obrigatório para RLS multi-tenant
          charge_id: charge.id,
          template_id: isCustomMessage ? fallbackTemplateId : templateId,
          customer_id: charge.customer_id,
          message: messageObj?.template.message || this.lastCustomMessage || '',
          status: 'success',
          error_details: null,
          metadata: {
            customer_name: charge.customer?.name || 'Cliente',
            customer_phone: charge.customer?.phone?.replace(/\D/g, '') || '0000000000'
          },
          batch_id: null
        };
      });
      
      // Inserir registros
      for (const record of historyRecords) {
        const { error } = await supabase
          .from('message_history')
          .insert([record]);
        
        if (error) {
          console.error(`Erro ao inserir registro para charge_id ${record.charge_id}:`, error);
        } else {
          console.log(`✅ Registro inserido com sucesso para ${record.charge_id}`);
        }
      }
      
      console.log('✅ Histórico registrado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao registrar histórico:', error);
    }
  },

  async processMessageTemplate(template: { message: string }, data: any): Promise<string> {
    return processMessageTags(template.message, data);
  },

  /**
   * Envia uma mensagem de texto via WhatsApp usando Edge Function
   * AIDEV-NOTE: Método seguro para envio de mensagens individuais via Edge Function
   * Não expõe credenciais da Evolution API no client
   */
  async sendMessage(
    tenantSlug: string, 
    phoneNumber: string, 
    message: string,
    options?: {
      delay?: number;
      linkPreview?: boolean;
      mentionsEveryOne?: boolean;
      mentioned?: string[];
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // AIDEV-NOTE: Validação de parâmetros obrigatórios
      if (!tenantSlug || !phoneNumber || !message) {
        throw new Error('Parâmetros obrigatórios não fornecidos: tenantSlug, phoneNumber, message');
      }

      // AIDEV-NOTE: Buscar tenant_id pelo slug para segurança
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single();

      if (tenantError || !tenant) {
        throw new Error(`Tenant não encontrado para slug: ${tenantSlug}`);
      }

      // AIDEV-NOTE: Configurar contexto de tenant para segurança
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenant.id 
      });

      // AIDEV-NOTE: Criar uma cobrança temporária para usar a Edge Function
      // Isso permite reutilizar a infraestrutura existente de forma segura
      const tempChargeId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // AIDEV-NOTE: Formatar número de telefone (garantir formato internacional)
      const formattedNumber = phoneNumber.startsWith('55') ? phoneNumber : `55${phoneNumber}`;
      
      logService.info('MessageService', `Enviando mensagem via Edge Function para ${formattedNumber}`);

      // AIDEV-NOTE: Usar Edge Function para envio seguro
      // Cria uma entrada temporária em charges para usar a infraestrutura existente
      const { data: tempCharge, error: chargeError } = await supabase
        .from('charges')
        .insert({
          id: tempChargeId,
          tenant_id: tenant.id,
          customer_name: 'Mensagem Direta',
          customer_phone: formattedNumber,
          amount: 0,
          due_date: new Date().toISOString(),
          status: 'temp_message',
          description: 'Mensagem direta via API'
        })
        .select('id')
        .single();

      if (chargeError) {
        throw new Error('Erro ao criar entrada temporária para mensagem');
      }

      try {
        // AIDEV-NOTE: Usar Edge Function send-bulk-messages com mensagem customizada
        const result = await edgeFunctionService.sendBulkMessages(
          [tempChargeId],
          'direct_message', // templateId para identificar como mensagem direta
          true, // sendImmediately
          message // customMessage
        );

        // AIDEV-NOTE: Verificar resultado do envio
        if (result.success && result.summary.sent > 0) {
          logService.info('MessageService', `Mensagem enviada com sucesso via Edge Function:`, {
            tempChargeId,
            phoneNumber: formattedNumber,
            tenant: tenantSlug,
            summary: result.summary
          });

          return {
            success: true,
            messageId: result.results?.[0]?.charge_id || tempChargeId
          };
        } else {
          const errorMsg = result.results?.[0]?.message || 'Erro desconhecido no envio via Edge Function';
          throw new Error(errorMsg);
        }

      } finally {
        // AIDEV-NOTE: Limpar entrada temporária após envio
        await supabase
          .from('charges')
          .delete()
          .eq('id', tempChargeId)
          .eq('tenant_id', tenant.id);
      }

    } catch (error) {
      logService.error('MessageService', `Erro ao enviar mensagem para ${phoneNumber} via tenant ${tenantSlug}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar mensagem'
      };
    }
  }
};

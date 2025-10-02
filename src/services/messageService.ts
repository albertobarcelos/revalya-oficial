import { supabase } from '@/lib/supabase';
import { processMessageTags } from '@/utils/messageUtils';
import type { Cobranca } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';
import { logService } from './logService';
import { whatsappService } from './whatsappService';
import { edgeFunctionService } from './edgeFunctionService';

interface MessageRecord {
  charge_id: string;
  template_id: string;
  message_content: string;
  customer_name: string;
  customer_phone: string;
  status?: string;
  error_message?: string;
}

export const messageService = {
  // Crie uma propriedade na interface do serviço para armazenar a mensagem
  /** @type {string} */
  lastCustomMessage: '',

  /**
   * AIDEV-NOTE: Envia mensagens em massa usando Edge Function
   * Migrado de N8N direto para Edge Function com segurança JWT + RLS
   */
  async sendBulkMessages(chargeIds: string[], templateIdOrCustom: string, customMessage?: string) {
    // AIDEV-NOTE: Verificação crítica - se for um template customizado mas a mensagem estiver vazia, buscar do elemento DOM
    if ((customMessage === '' || customMessage === undefined) && templateIdOrCustom.startsWith('custom_')) {
      // Tentar buscar diretamente do textarea
      const textareaElement = document.getElementById('custom-message') as HTMLTextAreaElement;
      if (textareaElement && textareaElement.value) {
        customMessage = textareaElement.value;
        console.log('🔄 Recuperando mensagem diretamente do DOM:', customMessage);
      }
    }

    // AIDEV-NOTE: Determinar se é mensagem customizada
    const isCustom = customMessage || templateIdOrCustom.startsWith('custom_');
    const directMessage = customMessage || '';
    console.log('📌 Mensagem original recebida:', directMessage);
    
    try {
      // AIDEV-NOTE: Determinar o templateId final
      let finalTemplateId = templateIdOrCustom;
      
      if (isCustom) {
        // AIDEV-NOTE: Para mensagens customizadas, usar apenas ID temporário para identificação
        // Não é necessário inserir na tabela notification_templates
        const tempTemplateId = uuidv4();
        console.log('📝 Usando template temporário para mensagem customizada:', tempTemplateId);
        
        finalTemplateId = tempTemplateId;
      }

      console.log('📤 Enviando para Edge Function:', {
        chargeCount: chargeIds.length,
        templateId: finalTemplateId,
        isCustom,
      });

      // AIDEV-NOTE: Chamar Edge Function com segurança JWT + RLS
      const result = await edgeFunctionService.sendBulkMessages(
        chargeIds,
        finalTemplateId,
        true // sendImmediately = true
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
          paymentLink: charge.link_pagamento || '',
        },
        template: {
          id: templateId,
          message: processedMessage,
        }
      };
    });
  },

  /**
   * Envia mensagens para o webhook do n8n
   */
  async sendToWebhook(messages: MessageRecord[], templateId: string) {
    // Verificação final antes de enviar
    const checkedMessages = messages.map(m => {
      if (!m.message_content && this.lastCustomMessage) {
        console.log('🛑 Corrigindo mensagem vazia antes do envio ao webhook');
        m.message_content = this.lastCustomMessage;
      }
      return m;
    });
    
    console.log('📤 Enviando para webhook:', {
      messageCount: checkedMessages.length,
      firstMessageContent: checkedMessages[0]?.message_content?.substring(0, 50),
      templateId: templateId
    });
    
    const response = await fetch('https://n8n-wh.nexsyn.com.br/webhook/asaas/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: checkedMessages,
        templateId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar mensagens: ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Registra o histórico das mensagens no banco de dados
   */
  async recordMessageHistory(charges: Cobranca[], messages: { 
    charge: {
      id: string;
    };
    template: {
      message: string;
    };
  }[], templateId: string, templateName: string) {
    console.log('📝 Registrando histórico com templateId:', templateId);
    
    try {
      // Sempre buscar um template válido existente para usar como fallback
      const { data: validTemplates } = await supabase
        .from('notification_templates')
        .select('id')
        .limit(1);
        
      // ID de template válido ou null se não encontrar nenhum
      const fallbackTemplateId = validTemplates && validTemplates.length > 0 ? validTemplates[0].id : null;
      console.log('Template de fallback encontrado:', fallbackTemplateId);
      
      // Verificar se é uma mensagem personalizada
      const isCustomMessage = templateId.startsWith('custom_') || this.lastCustomMessage;
      
      // Verificar se o templateId existe na tabela
      if (!isCustomMessage) {
        const { data: templateCheck } = await supabase
          .from('notification_templates')
          .select('id')
          .eq('id', templateId)
          .single();
          
        if (!templateCheck) {
          console.log('⚠️ Template ID não existe na tabela, usando fallback');
          templateId = fallbackTemplateId;
        }
      }
      
      // Para mensagens personalizadas ou templates inválidos, usar fallback
      const historyRecords = charges.map(charge => {
        const messageObj = messages.find(m => m.charge.id === charge.id);
        
        return {
          charge_id: charge.id,
          template_id: isCustomMessage ? fallbackTemplateId : templateId,
          sent_at: new Date().toISOString(),
          status: 'success',
          message_content: messageObj?.template.message || this.lastCustomMessage || '',
          customer_name: charge.customer?.name || 'Cliente',
          customer_phone: charge.customer?.phone?.replace(/\D/g, '') || '0000000000'
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
   * Envia uma mensagem de texto via WhatsApp
   * AIDEV-NOTE: Método para envio de mensagens com isolamento por tenant
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

      // AIDEV-NOTE: Buscar instância ativa para o tenant
      const instanceName = await whatsappService.getFullInstanceName(tenantSlug);
      if (!instanceName) {
        throw new Error(`Nenhuma instância ativa encontrada para o tenant: ${tenantSlug}`);
      }

      // AIDEV-NOTE: Verificar se a instância está conectada
      const status = await whatsappService.checkInstanceStatus(instanceName);
      if (status !== 'open') {
        throw new Error(`Instância ${instanceName} não está conectada. Status: ${status}`);
      }

      // AIDEV-NOTE: Formatar número de telefone (garantir formato internacional)
      const formattedNumber = phoneNumber.startsWith('55') ? phoneNumber : `55${phoneNumber}`;
      
      logService.info('MessageService', `Enviando mensagem via ${instanceName} para ${formattedNumber}`);

      // AIDEV-NOTE: Preparar payload para envio de mensagem
      const messagePayload = {
        number: formattedNumber,
        text: message,
        delay: options?.delay || 1000,
        linkPreview: options?.linkPreview ?? true,
        mentionsEveryOne: options?.mentionsEveryOne ?? false,
        ...(options?.mentioned && { mentioned: options.mentioned })
      };

      // AIDEV-NOTE: Enviar mensagem via Evolution API usando o whatsappService
      const response = await (whatsappService as any).callEvolutionApi(
        `/message/sendText/${instanceName}`,
        'POST',
        messagePayload
      );

      // AIDEV-NOTE: Validar resposta da API
      if (!response || !response.key) {
        throw new Error('Resposta inválida da Evolution API');
      }

      logService.info('MessageService', `Mensagem enviada com sucesso:`, {
        messageId: response.key.id,
        instanceName,
        phoneNumber: formattedNumber,
        tenant: tenantSlug
      });

      return {
        success: true,
        messageId: response.key.id
      };

    } catch (error) {
      logService.error('MessageService', `Erro ao enviar mensagem para ${phoneNumber} via tenant ${tenantSlug}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar mensagem'
      };
    }
  }
};

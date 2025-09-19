import { supabase } from '@/lib/supabase';
import { processMessageTags } from '@/utils/messageUtils';
import type { Cobranca } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

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
   * Envia mensagens em massa e registra no histórico
   */
  async sendBulkMessages(chargeIds: string[], templateIdOrCustom: string, customMessage?: string) {
    // Verificação crítica - se for um template customizado mas a mensagem estiver vazia, buscar do elemento DOM
    if ((customMessage === '' || customMessage === undefined) && templateIdOrCustom.startsWith('custom_')) {
      // Tentar buscar diretamente do textarea
      const textareaElement = document.getElementById('custom-message') as HTMLTextAreaElement;
      if (textareaElement && textareaElement.value) {
        customMessage = textareaElement.value;
        console.log('🔄 Recuperando mensagem diretamente do DOM:', customMessage);
      }
    }

    // Armazenar e logar a mensagem personalizada
    const isCustom = customMessage || templateIdOrCustom.startsWith('custom_');
    const directMessage = customMessage || '';
    console.log('📌 Mensagem original recebida:', directMessage);
    
    try {
      // 1. Buscar dados das cobranças
      const { data: selectedChargesData, error: chargesError } = await supabase
        .from('charges')
        .select(`*,
          customers(name, email, phone, cpf_cnpj, company)
        `)
        .in('id', chargeIds);

      if (chargesError) {
        throw new Error('Erro ao buscar dados das cobranças');
      }

      // 2. Gerar UUID e preparar dados
      const actualTemplateId = uuidv4();
      let templateData;
      
      if (isCustom) {
        templateData = {
          id: actualTemplateId,
          name: 'Mensagem Personalizada',
          message: directMessage
        };
      } else {
        // Buscar template existente do banco de dados
        const { data, error: templateError } = await supabase
          .from('notification_templates')
          .select('*')
          .eq('id', templateIdOrCustom)
          .single();

        if (templateError) {
          throw new Error('Erro ao buscar template');
        }
        templateData = data;
      }
      
      // 3. Processar manualmente as mensagens
      const directMessages = selectedChargesData.map(charge => {
        // Preparar os dados para substituição
        const dueDate = charge.data_vencimento.split('T')[0];
        
        // Formatar a data no formato brasileiro e incluir o dia da semana
        const dateOptions = { weekday: 'long' as const };
        const dateParts = dueDate.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        
        // Obter o dia da semana em português
        let weekDay = '';
        try {
          const date = new Date(dueDate);
          weekDay = date.toLocaleDateString('pt-BR', dateOptions);
          weekDay = weekDay.charAt(0).toUpperCase() + weekDay.slice(1); // Capitalizar
        } catch (error) {
          console.error('Erro ao formatar data com dia da semana:', error);
        }
        
        // Data formatada completa (ex: 09/03/2025, Domingo)
        const fullFormattedDate = weekDay ? `${formattedDate}, ${weekDay}` : formattedDate;
        
        const customerName = charge.customer?.name || 'Cliente';
        const customerPhone = charge.customer?.phone || '';
        const chargeAmount = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(charge.valor || 0);
        const paymentLink = charge.link_pagamento || '';
        const description = charge.descricao || 'Sem descrição';
        
        // Processar a mensagem manualmente para garantir que funcionem
        let finalMessage = isCustom ? directMessage : templateData.message;
        
        // Substituições diretas para garantir que funcionem
        // Incluir múltiplas versões da mesma tag (camelCase, snake_case, etc.)
        finalMessage = finalMessage
          // Cliente
          .replace(/\{cliente\.nome\}/gi, customerName)
          .replace(/\{cliente\.telefone\}/gi, customerPhone)
          .replace(/\{cliente\.company\}/gi, charge.customer?.company || '')
          .replace(/\{cliente\.empresa\}/gi, charge.customer?.company || '')
          .replace(/\{cliente\.cpf_cnpj\}/gi, charge.customer?.cpf_cnpj?.toString() || '')
          .replace(/\{cliente\.email\}/gi, charge.customer?.email || '')
          
          // Cobrança - valores
          .replace(/\{cobranca\.valor\}/gi, chargeAmount)
          
          // Cobrança - datas (múltiplos formatos)
          .replace(/\{cobranca\.vencimento\}/gi, formattedDate) // Formato simples: 09/03/2025
          .replace(/\{cobranca\.data_vencimento\}/gi, formattedDate)
          .replace(/\{cobranca\.dataVencimento\}/gi, formattedDate)
          .replace(/\{cobranca\.vencimento_completo\}/gi, fullFormattedDate) // Formato completo com dia da semana
          
          // Cobrança - links e descrições
          .replace(/\{cobranca\.link_pagamento\}/gi, paymentLink)
          .replace(/\{cobranca\.linkPagamento\}/gi, paymentLink)
          .replace(/\{cobranca\.link\}/gi, paymentLink)
          .replace(/\{cobranca\.descricao\}/gi, description)
          .replace(/\{cobranca\.descrição\}/gi, description);
        
        console.log('✅ Mensagem processada final:', finalMessage);
        
        // Construir objeto para envio
        return {
          customer: {
            name: customerName,
            phone: customerPhone.replace(/\D/g, ''),
            document: charge.customer?.cpf_cnpj?.toString().replace(/\D/g, '') || '',
          },
          charge: {
            id: charge.id,
            amount: charge.valor,
            dueDate: dueDate,
            status: charge.status,
            paymentLink: paymentLink,
            description: description
          },
          template: {
            id: actualTemplateId,
            message: finalMessage,
          }
        };
      });
      
      // 4. Log final antes de enviar
      console.log('📦 Conteúdo exato a ser enviado:', JSON.stringify({
        messageCount: directMessages.length,
        sampleMessage: directMessages[0]?.template?.message
      }));
      
      // 5. Enviar diretamente
      const response = await fetch('https://n8n-wh.nexsyn.com.br/webhook/asaas/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: directMessages,
          templateId: actualTemplateId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao enviar mensagens: ${response.status}`);
      }
      
      // 6. Registrar no histórico
      await this.recordMessageHistory(selectedChargesData, directMessages, actualTemplateId, 
        isCustom ? 'Mensagem Personalizada' : templateData.name);
      
      return {
        success: true,
        count: directMessages.length,
        data: await response.json()
      };
    } catch (error) {
      console.error('❌ Erro:', error);
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
    let processedMessage = template.message;

    // Processar tags do cliente
    if (data.customer) {
      processedMessage = processedMessage
        .replace(/\{cliente\.nome\}/g, data.customer.name || '')
        .replace(/\{cliente\.empresa\}/g, data.customer.company || '')
        .replace(/\{cliente\.cpf_cnpj\}/g, data.customer.cpf_cnpj || '')
        .replace(/\{cliente\.email\}/g, data.customer.email || '')
        .replace(/\{cliente\.telefone\}/g, data.customer.phone || '');
    }

    // Processar tags da cobrança
    if (data.charge) {
      const valor = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(data.charge.valor || 0);

      const dataVencimento = data.charge.data_vencimento
        ? new Date(data.charge.data_vencimento).toLocaleDateString('pt-BR')
        : '';

      processedMessage = processedMessage
        .replace(/\{cobranca\.valor\}/g, valor)
        .replace(/\{cobranca\.vencimento\}/g, dataVencimento)
        .replace(/\{cobranca\.descricao\}/g, data.charge.descricao || '')
        .replace(/\{cobranca\.status\}/g, data.charge.status || '');
    }

    return processedMessage;
  }
};

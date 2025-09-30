import { supabase } from '@/lib/supabase';
import { processMessageTags } from '@/utils/messageUtils';
import type { Cobranca } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';
import { logService } from './logService';
import { whatsappService } from './whatsappService';
import { rateLimitService } from './rateLimitService';
import { SecurityLogger } from '@/lib/securityLogger';

interface MessageRecord {
  charge_id: string;
  template_id: string;
  message_content: string;
  customer_name: string;
  customer_phone: string;
  status?: string;
  error_message?: string;
}

// AIDEV-NOTE: Interface para resultado de envio de mensagem individual
interface MessageSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  chargeId: string;
  phoneNumber: string;
}

// AIDEV-NOTE: Interface para resultado de envio em massa
interface BulkMessageResult {
  success: boolean;
  totalMessages: number;
  successCount: number;
  failureCount: number;
  results: MessageSendResult[];
  errors: string[];
}

export const messageService = {
  // Crie uma propriedade na interface do serviço para armazenar a mensagem
  /** @type {string} */
  lastCustomMessage: '',

  /**
   * AIDEV-NOTE: Nova implementação de envio em massa seguindo a arquitetura documentada
   * Utiliza Evolution API diretamente via whatsappService com isolamento por tenant
   */
  async sendBulkMessages(chargeIds: string[], templateIdOrCustom: string, customMessage?: string): Promise<BulkMessageResult> {
    // AIDEV-NOTE: Obter tenant atual do contexto
    const tenantSlug = this.getCurrentTenantSlug();
    if (!tenantSlug) {
      throw new Error('Tenant não identificado. Não é possível enviar mensagens sem contexto de tenant.');
    }

    logService.info('MessageService', `Iniciando envio em massa para tenant: ${tenantSlug}`, {
      chargeCount: chargeIds.length,
      templateId: templateIdOrCustom,
      hasCustomMessage: !!customMessage
    });

    // AIDEV-NOTE: Validar instância ativa para o tenant usando a mesma lógica das mensagens individuais
    const instanceName = await whatsappService.getFullInstanceName(tenantSlug);
    if (!instanceName) {
      const errorMessage = `Nenhuma instância ativa encontrada para o tenant: ${tenantSlug}`;
      logService.error('MessageService', `Validação de instância falhou para tenant ${tenantSlug}:`, {
        error: errorMessage
      });
      throw new Error(errorMessage);
    }

    // AIDEV-NOTE: Verificar se a instância está conectada (mesma validação das mensagens individuais)
    const status = await whatsappService.checkInstanceStatus(instanceName);
    if (status !== 'open' && status !== 'connected') {
      const errorMessage = `Instância ${instanceName} não está conectada. Status: ${status}`;
      logService.error('MessageService', `Status de instância inválido para tenant ${tenantSlug}:`, {
        instanceName,
        status
      });
      throw new Error(errorMessage);
    }

    logService.info('MessageService', `Instância validada com sucesso: ${instanceName}`, {
      tenantSlug,
      instanceName,
      status
    });

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

      // AIDEV-NOTE: Validar se todas as cobranças pertencem ao tenant atual
      const invalidCharges = selectedChargesData.filter(charge => {
        // Assumindo que existe um campo tenant_id ou similar
        return charge.tenant_id && charge.tenant_id !== tenantSlug;
      });

      if (invalidCharges.length > 0) {
        throw new Error(`Algumas cobranças não pertencem ao tenant atual: ${invalidCharges.map(c => c.id).join(', ')}`);
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
      
      // AIDEV-NOTE: Preparar resultados e contadores
      const results: MessageSendResult[] = [];
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      // AIDEV-NOTE: Configurar delay entre mensagens para evitar rate limiting
      const MESSAGE_DELAY = 2000; // 2 segundos entre mensagens
      
      // 3. Processar e enviar mensagens uma por uma
      for (let i = 0; i < selectedChargesData.length; i++) {
        const charge = selectedChargesData[i];
        
        try {
          // AIDEV-NOTE: Verificar rate limit antes de cada envio
          const canProceed = await rateLimitService.checkLimit(tenantSlug, 'bulk_message');
          if (!canProceed) {
            const error = 'Rate limit excedido para envio de mensagens';
            logService.warn('MessageService', error, { tenantSlug, chargeId: charge.id });
            results.push({
              success: false,
              error,
              chargeId: charge.id,
              phoneNumber: charge.customer?.phone || ''
            });
            failureCount++;
            continue;
          }

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

          // AIDEV-NOTE: Validar se o telefone está presente
          if (!customerPhone) {
            const error = 'Telefone do cliente não encontrado';
            logService.warn('MessageService', error, { chargeId: charge.id, customerName });
            results.push({
              success: false,
              error,
              chargeId: charge.id,
              phoneNumber: ''
            });
            failureCount++;
            continue;
          }

          // AIDEV-NOTE: Enviar mensagem via Evolution API usando o método correto
          const sendResult = await this.sendMessage(tenantSlug, customerPhone, finalMessage, {
            delay: MESSAGE_DELAY,
            linkPreview: true
          });

          if (sendResult.success) {
            logService.info('MessageService', `Mensagem enviada com sucesso`, {
              chargeId: charge.id,
              customerName,
              phoneNumber: customerPhone,
              messageId: sendResult.messageId,
              tenantSlug
            });

            results.push({
              success: true,
              messageId: sendResult.messageId,
              chargeId: charge.id,
              phoneNumber: customerPhone
            });
            successCount++;
          } else {
            const error = sendResult.error || 'Erro desconhecido ao enviar mensagem';
            logService.error('MessageService', `Falha ao enviar mensagem`, {
              chargeId: charge.id,
              customerName,
              phoneNumber: customerPhone,
              error,
              tenantSlug
            });

            results.push({
              success: false,
              error,
              chargeId: charge.id,
              phoneNumber: customerPhone
            });
            failureCount++;
            errors.push(`${customerName} (${customerPhone}): ${error}`);
          }

          // AIDEV-NOTE: Delay entre mensagens para evitar sobrecarga
          if (i < selectedChargesData.length - 1) {
            await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY));
          }

        } catch (messageError) {
          const error = messageError instanceof Error ? messageError.message : 'Erro desconhecido';
          logService.error('MessageService', `Erro ao processar mensagem para cobrança ${charge.id}:`, messageError);
          
          results.push({
            success: false,
            error,
            chargeId: charge.id,
            phoneNumber: charge.customer?.phone || ''
          });
          failureCount++;
          errors.push(`${charge.customer?.name || 'Cliente'}: ${error}`);
        }
      }
      
      // AIDEV-NOTE: Registrar no histórico apenas as mensagens enviadas com sucesso
      const successfulCharges = selectedChargesData.filter((_, index) => results[index]?.success);
      if (successfulCharges.length > 0) {
        const tenantId = selectedChargesData[0]?.tenant_id;
        await this.recordMessageHistory(
          successfulCharges, 
          results.filter(r => r.success).map(r => ({
            customer: { name: '', phone: r.phoneNumber, document: '' },
            charge: { id: r.chargeId, amount: 0, dueDate: '', status: '', paymentLink: '', description: '' },
            template: { id: actualTemplateId, message: '' }
          })), 
          actualTemplateId, 
          isCustom ? 'Mensagem Personalizada' : templateData.name, 
          tenantId
        );
      }

      const finalResult: BulkMessageResult = {
        success: successCount > 0,
        totalMessages: selectedChargesData.length,
        successCount,
        failureCount,
        results,
        errors
      };

      logService.info('MessageService', `Envio em massa concluído para tenant ${tenantSlug}`, {
        totalMessages: finalResult.totalMessages,
        successCount: finalResult.successCount,
        failureCount: finalResult.failureCount,
        instanceName
      });

      return finalResult;

    } catch (error) {
      logService.error('MessageService', `Erro crítico no envio em massa para tenant ${tenantSlug}:`, error);
      throw error;
    }
  },

  /**
   * AIDEV-NOTE: Método auxiliar para obter o tenant atual do contexto
   * Tenta múltiplas fontes para garantir compatibilidade
   */
  getCurrentTenantSlug(): string | null {
    try {
      // 1. Tentar obter do sessionStorage (método mais direto)
      const tenantData = sessionStorage.getItem('tenant_token');
      if (tenantData) {
        const token = JSON.parse(tenantData);
        if (token.tenant_slug) {
          return token.tenant_slug;
        }
      }

      // 2. Tentar obter da URL (fallback)
      const pathSegments = window.location.pathname.split('/').filter(segment => segment);
      if (pathSegments.length > 0) {
        const urlSlug = pathSegments[0];
        // Validar se não é uma rota especial
        if (urlSlug && !['login', 'admin', 'meus-aplicativos'].includes(urlSlug)) {
          return urlSlug;
        }
      }

      // 3. Tentar obter do contexto do tenant (se disponível)
      const tenantContext = sessionStorage.getItem('tenant_context');
      if (tenantContext) {
        const context = JSON.parse(tenantContext);
        if (context.tenant?.slug) {
          return context.tenant.slug;
        }
      }

      return null;
    } catch (error) {
      logService.error('MessageService', 'Erro ao obter tenant atual:', error);
      return null;
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
   * 🔐 Registra o histórico das mensagens no banco de dados com segurança multi-tenant
   * AIDEV-NOTE: Função crítica que registra automaticamente cada mensagem enviada
   * Garante integridade dos dados e isolamento por tenant
   * CORRIGIDO: Agora usa o padrão de segurança multi-tenant adequado
   */
  async recordMessageHistory(charges: Cobranca[], messages: { 
    charge: {
      id: string;
    };
    template: {
      message: string;
    };
  }[], templateId: string, templateName: string, tenantId?: string) {
    console.log('📝 [AUDIT] Registrando histórico de mensagens:', {
      templateId,
      templateName,
      chargeCount: charges.length,
      messageCount: messages.length,
      tenantId
    });
    
    try {
      // 🛡️ VALIDAÇÃO CRÍTICA: Obter tenant_id se não fornecido
      let currentTenantId = tenantId;
      if (!currentTenantId) {
        // Buscar tenant_id da primeira cobrança (todas devem ter o mesmo tenant)
        if (charges.length > 0) {
          const { data: chargeData, error: chargeError } = await supabase
            .from('charges')
            .select('tenant_id')
            .eq('id', charges[0].id)
            .single();
            
          if (chargeError || !chargeData?.tenant_id) {
            console.error('🚨 [CRITICAL] Não foi possível obter tenant_id da cobrança:', chargeError);
            throw new Error('Violação de segurança: tenant_id não encontrado');
          }
          
          currentTenantId = chargeData.tenant_id;
          console.log('🔍 [SECURITY] Tenant ID obtido da cobrança:', currentTenantId);
        } else {
          throw new Error('Nenhuma cobrança fornecida para registro de histórico');
        }
      }

      // 🔍 Buscar template válido existente para usar como fallback
      const { data: validTemplates } = await supabase
        .from('notification_templates')
        .select('id')
        .eq('tenant_id', currentTenantId) // 🛡️ Filtro por tenant obrigatório
        .limit(1);
        
      const fallbackTemplateId = validTemplates && validTemplates.length > 0 ? validTemplates[0].id : null;
      console.log('🔍 Template de fallback encontrado:', fallbackTemplateId);
      
      // Verificar se é uma mensagem personalizada
      const isCustomMessage = templateId.startsWith('custom_') || this.lastCustomMessage;
      
      // Verificar se o templateId existe na tabela (com filtro de tenant)
      if (!isCustomMessage && templateId) {
        const { data: templateCheck } = await supabase
          .from('notification_templates')
          .select('id')
          .eq('id', templateId)
          .eq('tenant_id', currentTenantId) // 🛡️ Validação de tenant
          .single();
          
        if (!templateCheck) {
          console.log('⚠️ Template ID não existe ou não pertence ao tenant, usando fallback');
          templateId = fallbackTemplateId;
        }
      }
      
      // 📝 Preparar registros com todos os campos obrigatórios (schema correto)
      const historyRecords = charges.map(charge => {
        const messageObj = messages.find(m => m.charge.id === charge.id);
        
        // AIDEV-NOTE: Ajustando para o schema real da tabela message_history
        // Colunas disponíveis: id, tenant_id, charge_id, template_id, customer_id, message, status, error_details, metadata, created_at, updated_at
        return {
          charge_id: charge.id,
          customer_id: charge.customer_id, // 🔗 FK obrigatória
          tenant_id: currentTenantId, // 🛡️ CAMPO CRÍTICO para isolamento
          template_id: isCustomMessage ? fallbackTemplateId : templateId,
          status: 'SENT', // 📊 Status padrão
          message: messageObj?.template.message || this.lastCustomMessage || '', // Campo correto: 'message'
          metadata: {
            // Armazenando dados extras no campo metadata (JSONB)
            customer_name: charge.customer?.name || 'Cliente',
            customer_phone: charge.customer?.phone?.replace(/\D/g, '') || '0000000000',
            template_name: templateName || 'Mensagem Enviada',
            sent_at: new Date().toISOString()
          }
        };
      });
      
      // AIDEV-NOTE: Inserir registros no histórico de mensagens usando função RPC
      // A função RPC contorna as políticas RLS para operações de sistema
      const insertPromises = historyRecords.map(async (record) => {
        try {
          const { data, error } = await supabase.rpc('insert_message_history_system', {
            p_charge_id: record.charge_id,
            p_customer_id: record.customer_id,
            p_tenant_id: record.tenant_id,
            p_template_id: record.template_id,
            p_status: record.status,
            p_message: record.message,
            p_metadata: record.metadata
          });

          if (error) {
            console.error('❌ Erro ao inserir registro de histórico via RPC:', error);
            return { success: false, error: error.message, record };
          }

          console.log('✅ Registro de histórico inserido com sucesso via RPC:', { id: data, record });
          return { success: true, data: { id: data }, record };
        } catch (err) {
          console.error('❌ Erro inesperado ao inserir registro via RPC:', err);
          return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido', record };
        }
      });
      
      // Aguardar todas as inserções
      const results = await Promise.all(insertPromises);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      console.log(`📊 [SUMMARY] Histórico registrado - Sucessos: ${successCount}, Erros: ${errorCount}`);
      
      if (errorCount > 0) {
        console.warn(`⚠️ [WARNING] ${errorCount} registros falharam ao ser inseridos`);
      }
      
    } catch (error) {
      console.error('🚨 [CRITICAL] Erro crítico ao registrar histórico:', error);
      throw error; // Re-throw para que o chamador possa tratar
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
      if (status !== 'open' && status !== 'connected') {
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


/**
 * AIDEV-NOTE: Envia mensagens em lote para múltiplos clientes via WhatsApp
 * Implementa validação robusta de instância ativa e logging de segurança detalhado
 * 
 * @param charges - Array de cobranças para envio
 * @param message - Mensagem personalizada ou template
 * @param templateId - ID do template (opcional)
 * @param tenantSlug - Slug do tenant para validação de segurança
 * @param tenantId - ID do tenant para auditoria
 */
export async function sendBulkMessages(
  charges: any[],
  message: string,
  templateId?: string,
  tenantSlug?: string,
  tenantId?: string
): Promise<{
  success: boolean;
  results: any[];
  successCount: number;
  failureCount: number;
  errors: string[];
}> {
  // AIDEV-NOTE: Log de início da operação de envio em lote
  const operationId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  SecurityLogger.logSecurityEvent({
    event: 'bulk_message_operation_start',
    tenant_id: tenantId || 'unknown',
    success: true,
    metadata: {
      operation_id: operationId,
      tenant_slug: tenantSlug,
      charges_count: charges.length,
      has_template: !!templateId,
      message_length: message.length
    }
  });

  logService.info('MessageService', `[${operationId}] Iniciando envio em lote para ${charges.length} cobranças`);

  // AIDEV-NOTE: Inicializar variáveis de controle
  const results: any[] = [];
  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];
  const MESSAGE_DELAY = 2000; // 2 segundos entre mensagens

  try {
    // AIDEV-NOTE: Validação robusta de instância ativa com logging de segurança
    logService.info('MessageService', `[${operationId}] Validando instância ativa para tenant: ${tenantSlug}`);
    
    const instanceValidation = await whatsappService.validateTenantActiveInstance(tenantSlug!);
    
    if (!instanceValidation.isValid) {
      // AIDEV-NOTE: Log de falha na validação de instância
      SecurityLogger.logSecurityEvent({
        event: 'bulk_message_instance_validation_failed',
        tenant_id: tenantId || 'unknown',
        success: false,
        metadata: {
          operation_id: operationId,
          tenant_slug: tenantSlug,
          validation_error: instanceValidation.error,
          instance_name: instanceValidation.instanceName
        }
      });

      logService.error('MessageService', `[${operationId}] Validação de instância falhou: ${instanceValidation.error}`);
      
      return {
        success: false,
        results: [],
        successCount: 0,
        failureCount: charges.length,
        errors: [`Instância WhatsApp não está ativa: ${instanceValidation.error}`]
      };
    }

    // AIDEV-NOTE: Log de sucesso na validação de instância
    SecurityLogger.logSecurityEvent({
      event: 'bulk_message_instance_validation_success',
      tenant_id: tenantId || 'unknown',
      success: true,
      metadata: {
        operation_id: operationId,
        tenant_slug: tenantSlug,
        instance_name: instanceValidation.instanceName
      }
    });

    logService.info('MessageService', `[${operationId}] Instância validada com sucesso: ${instanceValidation.instanceName}`);

    // AIDEV-NOTE: Log de início do processamento de mensagens
    logService.info('MessageService', `[${operationId}] Iniciando processamento de ${charges.length} mensagens`);

    for (let i = 0; i < charges.length; i++) {
      const charge = charges[i];
      
      try {
        // AIDEV-NOTE: Validação de rate limit com logging
        const rateLimitCheck = await rateLimitService.checkLimit(tenantSlug!, 'whatsapp_message');
        
        if (!rateLimitCheck.allowed) {
          // AIDEV-NOTE: Log de rate limit excedido
          SecurityLogger.logSecurityEvent({
            event: 'bulk_message_rate_limit_exceeded',
            tenant_id: tenantId || 'unknown',
            success: false,
            metadata: {
              operation_id: operationId,
              tenant_slug: tenantSlug,
              charge_index: i,
              charge_id: charge.id,
              rate_limit_info: rateLimitCheck
            }
          });

          const errorMsg = `Rate limit excedido para ${charge.customer_name}`;
          logService.warn('MessageService', `[${operationId}] ${errorMsg}`);
          
          results.push({
            chargeId: charge.id,
            customerName: charge.customer_name,
            success: false,
            error: errorMsg
          });
          
          failureCount++;
          errors.push(errorMsg);
          continue;
        }

        // AIDEV-NOTE: Preparar mensagem final (usar a mensagem passada como parâmetro)
        const finalMessage = message;

        // AIDEV-NOTE: Log antes do envio da mensagem
        logService.info('MessageService', `[${operationId}] Enviando mensagem ${i + 1}/${charges.length} para ${charge.customer_name}`);

        const result = await whatsappService.sendMessage(
          instanceValidation.instanceName,
          charge.customer_phone,
          finalMessage
        );

        if (result.success) {
          // AIDEV-NOTE: Log de sucesso no envio
          SecurityLogger.logSecurityEvent({
            event: 'bulk_message_sent_success',
            tenant_id: tenantId || 'unknown',
            success: true,
            metadata: {
              operation_id: operationId,
              tenant_slug: tenantSlug,
              charge_id: charge.id,
              customer_phone_hash: charge.customer_phone ? 
                charge.customer_phone.substring(0, 4) + '****' + charge.customer_phone.substring(charge.customer_phone.length - 2) : 
                'unknown',
              message_length: finalMessage.length
            }
          });

          logService.info('MessageService', `[${operationId}] Mensagem enviada com sucesso para ${charge.customer_name}`);
          
          results.push({
            chargeId: charge.id,
            customerName: charge.customer_name,
            success: true,
            messageId: result.messageId
          });
          
          successCount++;
        } else {
          // AIDEV-NOTE: Log de falha no envio
          SecurityLogger.logSecurityEvent({
            event: 'bulk_message_sent_failed',
            tenant_id: tenantId || 'unknown',
            success: false,
            metadata: {
              operation_id: operationId,
              tenant_slug: tenantSlug,
              charge_id: charge.id,
              customer_phone_hash: charge.customer_phone ? 
                charge.customer_phone.substring(0, 4) + '****' + charge.customer_phone.substring(charge.customer_phone.length - 2) : 
                'unknown',
              error: result.error
            }
          });

          const errorMsg = `Falha ao enviar para ${charge.customer_name}: ${result.error}`;
          logService.error('MessageService', `[${operationId}] ${errorMsg}`);
          
          results.push({
            chargeId: charge.id,
            customerName: charge.customer_name,
            success: false,
            error: result.error
          });
          
          failureCount++;
          errors.push(errorMsg);
        }

        // AIDEV-NOTE: Delay entre mensagens para evitar rate limiting
        if (i < charges.length - 1) {
          logService.debug('MessageService', `[${operationId}] Aguardando ${MESSAGE_DELAY}ms antes da próxima mensagem`);
          await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY));
        }

      } catch (error) {
        // AIDEV-NOTE: Log de erro inesperado durante o processamento
        SecurityLogger.logSecurityEvent({
          event: 'bulk_message_processing_error',
          tenant_id: tenantId || 'unknown',
          success: false,
          metadata: {
            operation_id: operationId,
            tenant_slug: tenantSlug,
            charge_index: i,
            charge_id: charge.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });

        const errorMsg = `Erro ao processar mensagem para ${charge.customer_name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        logService.error('MessageService', `[${operationId}] ${errorMsg}`, error);
        
        results.push({
          chargeId: charge.id,
          customerName: charge.customer_name,
          success: false,
          error: errorMsg
        });
        
        failureCount++;
        errors.push(errorMsg);
      }
    }

    // AIDEV-NOTE: Log de conclusão da operação
    const operationSuccess = successCount > 0;
    
    SecurityLogger.logSecurityEvent({
      event: 'bulk_message_operation_completed',
      tenant_id: tenantId || 'unknown',
      success: operationSuccess,
      metadata: {
        operation_id: operationId,
        tenant_slug: tenantSlug,
        total_charges: charges.length,
        success_count: successCount,
        failure_count: failureCount,
        success_rate: ((successCount / charges.length) * 100).toFixed(2) + '%'
      }
    });

    logService.info('MessageService', `[${operationId}] Operação concluída - Sucessos: ${successCount}, Falhas: ${failureCount}`);

    return {
      success: operationSuccess,
      results,
      successCount,
      failureCount,
      errors
    };

  } catch (error) {
    // AIDEV-NOTE: Log de erro crítico na operação
    SecurityLogger.logSecurityEvent({
      event: 'bulk_message_operation_critical_error',
      tenant_id: tenantId || 'unknown',
      success: false,
      metadata: {
        operation_id: operationId,
        tenant_slug: tenantSlug,
        error: error instanceof Error ? error.message : 'Unknown critical error',
        stack_trace: error instanceof Error ? error.stack : undefined
      }
    });

    logService.error('MessageService', `[${operationId}] Erro crítico na operação de envio em lote`, error);
    
    return {
      success: false,
      results: [],
      successCount: 0,
      failureCount: charges.length,
      errors: [`Erro crítico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
    };
  }
}

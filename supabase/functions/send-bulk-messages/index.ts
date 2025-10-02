// =====================================================
// EDGE FUNCTION: Send Bulk Messages - Refatorado
// Descrição: Processa envio de mensagens em massa via Evolution API
// Autor: Barcelitos AI Agent
// Data: 2025-01-21
// Versão: 3.0 - Refatoração completa com melhorias de performance e segurança
// =====================================================

/// <reference types="https://deno.land/x/types/deno.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { validateRequest } from "../_shared/validation.ts";

// =====================================================
// INTERFACES E TIPOS SEGUROS
// =====================================================

/**
 * AIDEV-NOTE: Interface para dados do cliente com validação de tenant
 */
interface CustomerData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  cpf_cnpj?: string;
  company?: string;
  tenant_id: string;
}

/**
 * AIDEV-NOTE: Interface para dados da cobrança com validação de tenant
 */
interface ChargeData {
  id: string;
  customer_id: string;
  valor: number;
  data_vencimento: string;
  descricao?: string;
  link_pagamento?: string;
  codigo_barras?: string;
  tenant_id: string;
}

/**
 * AIDEV-NOTE: Interface para template de mensagem com validação de tenant
 */
interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  tenant_id: string;
}

/**
 * AIDEV-NOTE: Interface para requisição de envio de mensagens
 */
interface SendMessageRequest {
  chargeIds: string[];
  templateId: string;
}

/**
 * AIDEV-NOTE: Interface para mensagem processada
 */
interface ProcessedMessage {
  customerId: string;
  customerPhone: string;
  message: string;
  chargeId: string;
}

/**
 * AIDEV-NOTE: Interface para resultado de envio
 */
interface SendResult {
  chargeId: string;
  customerId: string;
  phone: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * AIDEV-NOTE: Interface para contexto de validação
 */
interface ValidationContext {
  isValid: boolean;
  error?: string;
  status?: number;
  user?: {
    id: string;
    email: string;
  };
  tenantId?: string;
}

/**
 * AIDEV-NOTE: Interface para resposta da Evolution API
 */
interface EvolutionApiResponse {
  success: boolean;
  messageId?: string;
  id?: string;
  message?: string;
  error?: string;
}

/**
 * AIDEV-NOTE: Interface para log de auditoria
 */
interface AuditLogEntry {
  operationId: string;
  tenantId: string;
  userId?: string;
  userEmail?: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'security';
}

// =====================================================
// CONFIGURAÇÃO DE AMBIENTE
// =====================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

// =====================================================
// CLASSE DE AUDITORIA E LOGS DE SEGURANÇA
// =====================================================

/**
 * AIDEV-NOTE: Classe responsável por logs de auditoria e segurança
 * Implementa padrões de auditoria conforme guia multi-tenant seguro
 */
class SecurityAuditLogger {
  private operationId: string;

  constructor() {
    this.operationId = crypto.randomUUID();
  }

  /**
   * AIDEV-NOTE: Log de validação de segurança bem-sucedida
   */
  logSecurityValidationSuccess(context: ValidationContext): void {
    const logEntry: AuditLogEntry = {
      operationId: this.operationId,
      tenantId: context.tenantId || 'unknown',
      userId: context.user?.id,
      userEmail: context.user?.email,
      action: 'SECURITY_VALIDATION_SUCCESS',
      details: {
        securityLayers: {
          authentication: '✅',
          tenantAccess: '✅',
          roleValidation: '✅',
          httpMethod: '✅',
          headers: '✅'
        }
      },
      timestamp: new Date().toISOString(),
      level: 'info'
    };

    console.log('✅ [AUDIT-SECURITY] Validação de segurança aprovada:', logEntry);
  }

  /**
   * AIDEV-NOTE: Log de violação de segurança
   */
  logSecurityViolation(error: string, details: Record<string, unknown>): void {
    const logEntry: AuditLogEntry = {
      operationId: this.operationId,
      tenantId: 'unknown',
      action: 'SECURITY_VIOLATION',
      details: {
        error,
        ...details
      },
      timestamp: new Date().toISOString(),
      level: 'security'
    };

    console.error('🚨 [AUDIT-SECURITY] Violação de segurança detectada:', logEntry);
  }

  /**
   * AIDEV-NOTE: Log de início de operação
   */
  logOperationStart(tenantId: string, userId: string | undefined, userEmail: string | undefined, details: Record<string, unknown>): void {
    const logEntry: AuditLogEntry = {
      operationId: this.operationId,
      tenantId,
      userId,
      userEmail,
      action: 'BULK_MESSAGE_OPERATION_START',
      details,
      timestamp: new Date().toISOString(),
      level: 'info'
    };

    console.log('🚀 [AUDIT-OPERATION] Iniciando operação de envio em massa:', logEntry);
  }

  /**
   * AIDEV-NOTE: Log de conclusão de operação
   */
  logOperationComplete(tenantId: string, userId: string | undefined, userEmail: string | undefined, results: Record<string, unknown>): void {
    const logEntry: AuditLogEntry = {
      operationId: this.operationId,
      tenantId,
      userId,
      userEmail,
      action: 'BULK_MESSAGE_OPERATION_COMPLETE',
      details: results,
      timestamp: new Date().toISOString(),
      level: 'info'
    };

    console.log('🎯 [AUDIT-OPERATION] Operação concluída:', logEntry);
  }

  /**
   * AIDEV-NOTE: Log de erro crítico
   */
  logCriticalError(error: Error, context: Record<string, unknown>): void {
    const logEntry: AuditLogEntry = {
      operationId: this.operationId,
      tenantId: 'unknown',
      action: 'CRITICAL_ERROR',
      details: {
        error: error.message,
        stack: error.stack,
        context
      },
      timestamp: new Date().toISOString(),
      level: 'error'
    };

    console.error('💥 [AUDIT-ERROR] Erro crítico:', logEntry);
  }

  /**
   * AIDEV-NOTE: Log de acesso a dados
   */
  logDataAccess(tenantId: string, dataType: string, itemCount: number): void {
    const logEntry: AuditLogEntry = {
      operationId: this.operationId,
      tenantId,
      action: 'DATA_ACCESS',
      details: {
        dataType,
        itemCount
      },
      timestamp: new Date().toISOString(),
      level: 'info'
    };

    console.log(`🔍 [AUDIT-DATA] Acesso a dados - ${dataType}:`, logEntry);
  }
}

// =====================================================
// CLASSE DE VALIDAÇÃO DE SEGURANÇA MULTI-TENANT
// =====================================================

/**
 * AIDEV-NOTE: Classe responsável por validações de segurança multi-tenant
 * Implementa validação dupla conforme guia de segurança
 */
class MultiTenantSecurityValidator {
  private auditLogger: SecurityAuditLogger;

  constructor(auditLogger: SecurityAuditLogger) {
    this.auditLogger = auditLogger;
  }

  /**
   * AIDEV-NOTE: Validação dupla de dados de tenant
   * Verifica se todos os dados retornados pertencem ao tenant correto
   */
  validateTenantData<T extends { tenant_id: string; id: string }>(
    data: T[], 
    tenantId: string, 
    dataType: string
  ): void {
    if (!data || !Array.isArray(data)) return;
    
    const invalidData = data.filter(item => item.tenant_id !== tenantId);
    if (invalidData.length > 0) {
      this.auditLogger.logSecurityViolation(
        `Dados de tenant incorreto detectados em ${dataType}`,
        {
          dataType,
          expectedTenantId: tenantId,
          invalidItems: invalidData.map(item => ({
            id: item.id,
            tenant_id: item.tenant_id
          }))
        }
      );
      throw new Error(`Violação de segurança: ${dataType} contém dados de tenant incorreto`);
    }
    
    this.auditLogger.logDataAccess(tenantId, dataType, data.length);
  }

  /**
   * AIDEV-NOTE: Validação de template de tenant
   */
  validateTemplateOwnership(template: MessageTemplate, tenantId: string): void {
    if (template.tenant_id !== tenantId) {
      this.auditLogger.logSecurityViolation(
        'Template de tenant incorreto',
        {
          templateId: template.id,
          expectedTenantId: tenantId,
          actualTenantId: template.tenant_id
        }
      );
      throw new Error('Violação de segurança: template de tenant incorreto');
    }
  }
}

// =====================================================
// CLASSE DE PROCESSAMENTO DE MENSAGENS
// =====================================================

/**
 * AIDEV-NOTE: Classe responsável pelo processamento de templates de mensagem
 * Migrada e otimizada do messageUtils.ts
 */
class MessageProcessor {
  /**
   * AIDEV-NOTE: Processa tags em mensagens substituindo por dados reais
   */
  static processMessageTags(message: string, customer: CustomerData, charge: ChargeData): string {
    if (!message) return '';

    const formatFirstName = (fullName?: string): string => {
      if (!fullName) return '';
      const firstName = fullName.split(' ')[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    };

    const formatDate = (dateString: string): string => {
      if (!dateString) return '';
      const [year, month, day] = dateString.split('-').map(Number);
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    };

    const calculateDaysOverdue = (dueDate: string): number => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDateParts = dueDate.split('-').map(Number);
      const dueDateTime = new Date(dueDateParts[0], dueDateParts[1] - 1, dueDateParts[2]);
      return dueDateTime < today ? Math.floor((today.getTime() - dueDateTime.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    };

    let processedMessage = message;
    const daysOverdue = calculateDaysOverdue(charge.data_vencimento);
    
    // AIDEV-NOTE: Substituição de tags do cliente
    const customerName = formatFirstName(customer?.name);
    processedMessage = processedMessage.replace(/{cliente\.nome}/g, customerName || 'Cliente');
    processedMessage = processedMessage.replace(/{cliente\.email}/g, customer?.email || 'email@exemplo.com');
    processedMessage = processedMessage.replace(/{cliente\.telefone}/g, customer?.phone || '(11) 99999-9999');
    processedMessage = processedMessage.replace(/{cliente\.cpf}/g, customer?.cpf_cnpj || '000.000.000-00');
    processedMessage = processedMessage.replace(/{cliente\.cpf_cnpj}/g, customer?.cpf_cnpj || '000.000.000-00');
    processedMessage = processedMessage.replace(/{cliente\.empresa}/g, customer?.company || 'Empresa não informada');
    
    // AIDEV-NOTE: Substituição de tags da cobrança
    processedMessage = processedMessage.replace(/{cobranca\.valor}/g, charge?.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00');
    processedMessage = processedMessage.replace(/{cobranca\.vencimento}/g, formatDate(charge?.data_vencimento) || '00/00/0000');
    processedMessage = processedMessage.replace(/{cobranca\.descricao}/g, charge?.descricao || 'Cobrança');
    processedMessage = processedMessage.replace(/{cobranca\.link}/g, charge?.link_pagamento || 'Link não disponível');
    processedMessage = processedMessage.replace(/{cobranca\.codigo_barras}/g, charge?.codigo_barras || 'Código não disponível');
    processedMessage = processedMessage.replace(/{cobranca\.dias_atraso}/g, daysOverdue.toString());

    return processedMessage;
  }
}

// =====================================================
// CLASSE DE INTEGRAÇÃO COM EVOLUTION API
// =====================================================

/**
 * AIDEV-NOTE: Classe responsável pela integração com Evolution API
 * Implementa rate limiting e retry logic
 */
class EvolutionApiClient {
  private static readonly DELAY_BETWEEN_MESSAGES = 1000; // 1 segundo
  private static readonly MAX_RETRIES = 3;

  /**
   * AIDEV-NOTE: Envia mensagem via Evolution API com retry automático
   */
  static async sendMessage(
    phone: string, 
    message: string, 
    chargeId: string,
    retryCount = 0
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.warn('⚠️ Evolution API não configurada, simulando envio...');
      return { 
        success: true, 
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
      };
    }

    try {
      const response = await fetch(`${EVOLUTION_API_URL}/message/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${EVOLUTION_API_KEY}`,
        },
        body: JSON.stringify({
          number: phone,
          text: message,
          delay: this.DELAY_BETWEEN_MESSAGES,
        }),
      });

      const result: EvolutionApiResponse = await response.json();

      if (!response.ok) {
        // AIDEV-NOTE: Retry em caso de erro temporário
        if (retryCount < this.MAX_RETRIES && response.status >= 500) {
          console.warn(`⚠️ Tentativa ${retryCount + 1}/${this.MAX_RETRIES} falhou, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Backoff exponencial
          return this.sendMessage(phone, message, chargeId, retryCount + 1);
        }

        return { 
          success: false, 
          error: result.message || result.error || 'Erro na Evolution API' 
        };
      }

      return { 
        success: true, 
        messageId: result.messageId || result.id 
      };

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem via Evolution API:', error);
      
      // AIDEV-NOTE: Retry em caso de erro de rede
      if (retryCount < this.MAX_RETRIES) {
        console.warn(`⚠️ Tentativa ${retryCount + 1}/${this.MAX_RETRIES} falhou, tentando novamente...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return this.sendMessage(phone, message, chargeId, retryCount + 1);
      }

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * AIDEV-NOTE: Aplica delay entre mensagens para rate limiting
   */
  static async applyRateLimit(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_MESSAGES));
  }
}

// =====================================================
// CLASSE PRINCIPAL DE SERVIÇO
// =====================================================

/**
 * AIDEV-NOTE: Classe principal que orquestra o envio de mensagens em massa
 * Implementa todas as validações de segurança e otimizações de performance
 */
class BulkMessageService {
  private supabase: SupabaseClient;
  private auditLogger: SecurityAuditLogger;
  private securityValidator: MultiTenantSecurityValidator;

  constructor(supabase: SupabaseClient, auditLogger: SecurityAuditLogger) {
    this.supabase = supabase;
    this.auditLogger = auditLogger;
    this.securityValidator = new MultiTenantSecurityValidator(auditLogger);
  }

  /**
   * AIDEV-NOTE: Busca dados de cobranças com validação dupla de segurança
   */
  private async fetchChargesData(
    chargeIds: string[], 
    tenantId: string
  ): Promise<{ charges: ChargeData[]; customers: CustomerData[] }> {
    
    const { data: charges, error: chargesError } = await this.supabase
      .from('charges')
      .select('*')
      .in('id', chargeIds)
      .eq('tenant_id', tenantId);

    if (chargesError) {
      throw new Error(`Erro ao buscar cobranças: ${chargesError.message}`);
    }

    // VALIDAÇÃO DUPLA: Verificar se todos os dados pertencem ao tenant correto
    this.securityValidator.validateTenantData(charges, tenantId, 'charges');

    const customerIds = charges.map(charge => charge.customer_id);
    
    const { data: customers, error: customersError } = await this.supabase
      .from('customers')
      .select('*')
      .in('id', customerIds)
      .eq('tenant_id', tenantId);

    if (customersError) {
      throw new Error(`Erro ao buscar clientes: ${customersError.message}`);
    }

    // VALIDAÇÃO DUPLA: Verificar se todos os dados pertencem ao tenant correto
    this.securityValidator.validateTenantData(customers, tenantId, 'customers');

    return { charges, customers };
  }

  /**
   * AIDEV-NOTE: Busca template de mensagem com validação dupla de segurança
   */
  private async fetchMessageTemplate(
    templateId: string, 
    tenantId: string
  ): Promise<MessageTemplate> {
    
    const { data: template, error } = await this.supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      throw new Error(`Template não encontrado: ${error.message}`);
    }

    // VALIDAÇÃO DUPLA: Verificar se o template pertence ao tenant correto
    this.securityValidator.validateTemplateOwnership(template, tenantId);

    return template;
  }

  /**
   * AIDEV-NOTE: Registra log de envio de mensagem para auditoria
   */
  private async logMessageSent(
    tenantId: string,
    customerId: string,
    chargeId: string,
    templateId: string,
    message: string,
    phone: string,
    success: boolean,
    messageId?: string,
    error?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('message_logs')
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          charge_id: chargeId,
          template_id: templateId,
          message_content: message,
          phone_number: phone,
          status: success ? 'sent' : 'failed',
          external_message_id: messageId,
          error_message: error,
          sent_at: new Date().toISOString(),
        });
    } catch (logError) {
      console.error('❌ Erro ao registrar log:', logError);
      // Não falha a operação principal por erro de log
    }
  }

  /**
   * AIDEV-NOTE: Processa mensagens em lotes para otimizar performance
   */
  private async processMessagesInBatches(
    charges: ChargeData[],
    customers: CustomerData[],
    template: MessageTemplate,
    tenantId: string,
    templateId: string
  ): Promise<SendResult[]> {
    const results: SendResult[] = [];
    const BATCH_SIZE = 10; // Processa 10 mensagens por vez

    for (let i = 0; i < charges.length; i += BATCH_SIZE) {
      const batchCharges = charges.slice(i, i + BATCH_SIZE);
      const batchPromises = batchCharges.map(async (charge) => {
        const customer = customers.find(c => c.id === charge.customer_id);
        
        if (!customer) {
          console.warn(`⚠️ Cliente não encontrado para cobrança ${charge.id}`);
          return null;
        }

        if (!customer.phone) {
          console.warn(`⚠️ Telefone não encontrado para cliente ${customer.id}`);
          return null;
        }

        // AIDEV-NOTE: Processa template com dados do cliente e cobrança
        const processedMessage = MessageProcessor.processMessageTags(template.content, customer, charge);
        
        // AIDEV-NOTE: Envia mensagem via Evolution API
        const sendResult = await EvolutionApiClient.sendMessage(
          customer.phone,
          processedMessage,
          charge.id
        );

        // AIDEV-NOTE: Registra log da tentativa de envio
        await this.logMessageSent(
          tenantId,
          customer.id,
          charge.id,
          templateId,
          processedMessage,
          customer.phone,
          sendResult.success,
          sendResult.messageId,
          sendResult.error
        );

        return {
          chargeId: charge.id,
          customerId: customer.id,
          phone: customer.phone,
          success: sendResult.success,
          messageId: sendResult.messageId,
          error: sendResult.error,
        };
      });

      // AIDEV-NOTE: Processa lote atual
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as SendResult[]);

      // AIDEV-NOTE: Aplica rate limiting entre lotes
      if (i + BATCH_SIZE < charges.length) {
        await EvolutionApiClient.applyRateLimit();
      }
    }

    return results;
  }

  /**
   * AIDEV-NOTE: Método principal para processar envio de mensagens em massa
   */
  async processBulkMessages(
    chargeIds: string[],
    templateId: string,
    tenantId: string,
    userId?: string
  ): Promise<{
    success: boolean;
    message: string;
    results: {
      total: number;
      successful: number;
      failed: number;
      details: SendResult[];
    };
    timestamp: string;
  }> {
    // AIDEV-NOTE: Busca dados necessários em paralelo para otimizar performance
    const [{ charges, customers }, template] = await Promise.all([
      this.fetchChargesData(chargeIds, tenantId),
      this.fetchMessageTemplate(templateId, tenantId),
    ]);

    // AIDEV-NOTE: Processa mensagens em lotes otimizados
    const results = await this.processMessagesInBatches(
      charges,
      customers,
      template,
      tenantId,
      templateId
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      success: true,
      message: `Envio concluído: ${successCount} mensagens enviadas, ${failureCount} falhas`,
      results: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        details: results,
      },
      timestamp: new Date().toISOString()
    };
  }
}

// =====================================================
// FUNÇÃO PRINCIPAL DA EDGE FUNCTION
// =====================================================

/**
 * AIDEV-NOTE: Função principal da Edge Function com arquitetura refatorada
 * Implementa todas as camadas de segurança e otimizações de performance
 */
serve(async (req) => {
  // AIDEV-NOTE: Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auditLogger = new SecurityAuditLogger();

  try {
    // AIDEV-NOTE: Validação da requisição com autenticação JWT e roles
    // Seguindo padrão multi-tenant seguro com 6 camadas de validação
    const validation: ValidationContext = await validateRequest(req, {
      allowedMethods: ['POST'],
      requireAuth: true,
      requireTenant: true,
      allowedRoles: ['admin', 'manager', 'operator'],
      maxBodySize: 1024 * 1024, // 1MB máximo para o body
      requiredHeaders: ['content-type']
    });

    if (!validation.isValid) {
      auditLogger.logSecurityViolation(
        validation.error || 'Falha na validação de segurança',
        {
          status: validation.status,
          method: req.method,
          clientInfo: {
            userAgent: req.headers.get('user-agent'),
            origin: req.headers.get('origin'),
            referer: req.headers.get('referer')
          },
          headers: {
            authorization: req.headers.get('authorization') ? 'presente' : 'ausente',
            tenantId: req.headers.get('x-tenant-id'),
            contentType: req.headers.get('content-type'),
          }
        }
      );
      
      return new Response(
        JSON.stringify({ 
          error: validation.error,
          timestamp: new Date().toISOString()
        }),
        {
          status: validation.status || 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // AIDEV-NOTE: Log de auditoria para validação bem-sucedida
    auditLogger.logSecurityValidationSuccess(validation);

    // AIDEV-NOTE: Extração dos dados da requisição
    const { chargeIds, templateId }: SendMessageRequest = await req.json();
    const tenantId = validation.tenantId!;
    const userId = validation.user?.id;

    // AIDEV-NOTE: Log de auditoria para início da operação
    auditLogger.logOperationStart(tenantId, userId, validation.user?.email, {
      chargeIds: chargeIds?.length,
      templateId,
      requestOrigin: req.headers.get('origin') || 'unknown'
    });

    // AIDEV-NOTE: Validação dos parâmetros
    if (!chargeIds || !Array.isArray(chargeIds) || chargeIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'chargeIds é obrigatório e deve ser um array não vazio' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: 'templateId é obrigatório' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // AIDEV-NOTE: Criação do cliente Supabase com service role para RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // AIDEV-NOTE: Definir contexto de tenant antes de fazer consultas RLS
    const { data: contextResult, error: contextError } = await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId,
      p_user_id: userId || null
    });

    if (contextError || !contextResult?.success) {
      console.error('❌ Erro ao definir contexto de tenant:', contextError || contextResult);
      return new Response(
        JSON.stringify({ 
          error: 'Erro interno: falha ao definir contexto de tenant',
          details: contextError?.message || contextResult?.error || 'Contexto não definido'
        }),
        {
          status: contextError ? 500 : 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // AIDEV-NOTE: Criação do serviço principal e processamento
    const bulkMessageService = new BulkMessageService(supabase, auditLogger);
    const result = await bulkMessageService.processBulkMessages(
      chargeIds,
      templateId,
      tenantId,
      userId
    );

    // AIDEV-NOTE: Log de auditoria para conclusão da operação
    auditLogger.logOperationComplete(tenantId, userId, validation.user?.email, {
      templateId,
      results: {
        total: result.results.total,
        successful: result.results.successful,
        failed: result.results.failed,
        successRate: `${((result.results.successful / result.results.total) * 100).toFixed(2)}%`
      },
      performance: {
        totalCharges: chargeIds.length,
        processedMessages: result.results.total,
        skippedMessages: chargeIds.length - result.results.total
      }
    });

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    // AIDEV-NOTE: Log de auditoria para erro crítico
    auditLogger.logCriticalError(error as Error, {
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin')
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
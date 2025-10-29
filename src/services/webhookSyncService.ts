import { supabase } from '@/lib/supabase';

// AIDEV-NOTE: Interface para dados do webhook ASAAS
export interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    value: number;
    netValue?: number;
    originalValue?: number;
    interestValue?: number;
    description?: string;
    billingType: string;
    status: string;
    pixTransaction?: any;
    creditCard?: any;
    dueDate: string;
    originalDueDate?: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    installmentNumber?: number;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    transactionReceiptUrl?: string;
    customer: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      mobilePhone?: string;
      cpfCnpj?: string;
    };
  };
}

// AIDEV-NOTE: Interface para resultado da sincronização
export interface WebhookSyncResult {
  success: boolean;
  updated_staging: boolean;
  updated_charge: boolean;
  created_staging: boolean;
  errors: string[];
  movement_id?: string;
  charge_id?: string;
}

/**
 * Serviço responsável pela sincronização automática via webhooks
 * AIDEV-NOTE: Mantém espelhamento entre conciliation_staging e charges
 */
export class WebhookSyncService {

  /**
   * Processa webhook do ASAAS e sincroniza dados
   * AIDEV-NOTE: Ponto de entrada principal para webhooks
   */
  async processAsaasWebhook(
    payload: AsaasWebhookPayload,
    tenantId: string
  ): Promise<WebhookSyncResult> {
    
    const result: WebhookSyncResult = {
      success: false,
      updated_staging: false,
      updated_charge: false,
      created_staging: false,
      errors: []
    };

    try {
      // AIDEV-NOTE: 1. Configurar contexto de tenant
      await this.setTenantContext(tenantId);
      
      // AIDEV-NOTE: 2. Processar dados do webhook
      const processedData = this.processWebhookData(payload);
      
      // AIDEV-NOTE: 3. Sincronizar conciliation_staging
      const stagingResult = await this.syncConciliationStaging(
        processedData, 
        tenantId
      );
      
      result.updated_staging = stagingResult.updated;
      result.created_staging = stagingResult.created;
      result.movement_id = stagingResult.movement_id;
      
      // AIDEV-NOTE: 4. Sincronizar charges (se existir linkagem)
      if (stagingResult.movement_id) {
        const chargeResult = await this.syncLinkedCharge(
          stagingResult.movement_id,
          processedData,
          tenantId
        );
        
        result.updated_charge = chargeResult.updated;
        result.charge_id = chargeResult.charge_id;
      }

      result.success = true;
      
      // AIDEV-NOTE: 5. Log de auditoria
      await this.logWebhookSync(payload.event, result, tenantId);
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Erro na sincronização webhook:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Configura contexto de tenant para segurança RLS
   */
  private async setTenantContext(tenantId: string): Promise<void> {
    const { error } = await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });
    
    if (error) {
      throw new Error(`Erro ao configurar contexto: ${error.message}`);
    }
  }

  /**
   * Processa e normaliza dados do webhook
   * AIDEV-NOTE: Transforma payload ASAAS em formato interno
   */
  private processWebhookData(payload: AsaasWebhookPayload) {
    const { payment } = payload;
    
    return {
      id_externo: payment.id,
      valor_cobranca: payment.originalValue || payment.value,
      valor_pago: payment.netValue || (payment.status === 'RECEIVED' ? payment.value : null),
      status_externo: payment.status,
      data_vencimento: payment.dueDate,
      data_pagamento: payment.paymentDate || payment.clientPaymentDate || null,
      customer_name: payment.customer.name,
      customer_email: payment.customer.email || null,
      customer_document: payment.customer.cpfCnpj || null,
      customer_phone: payment.customer.phone || payment.customer.mobilePhone || null,
      description: payment.description || null,
      payment_method: payment.billingType,
      juros_multa_diferenca: this.calculateInterestDifference(payment),
      dados_brutos: JSON.stringify(payload),
      webhook_event: payload.event,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Calcula diferença de juros/multa
   * AIDEV-NOTE: Lógica para calcular valores adicionais
   */
  private calculateInterestDifference(payment: any): number {
    const originalValue = payment.originalValue || payment.value;
    const paidValue = payment.netValue || payment.value;
    const interestValue = payment.interestValue || 0;
    
    // AIDEV-NOTE: Se há juros explícitos, usar esse valor
    if (interestValue > 0) {
      return interestValue;
    }
    
    // AIDEV-NOTE: Calcular diferença entre valor original e pago
    if (paidValue > originalValue) {
      return paidValue - originalValue;
    }
    
    return 0;
  }

  /**
   * Sincroniza dados com conciliation_staging
   * AIDEV-NOTE: Atualiza ou cria registro na staging
   */
  private async syncConciliationStaging(
    data: any,
    tenantId: string
  ): Promise<{ updated: boolean; created: boolean; movement_id?: string }> {
    
    // AIDEV-NOTE: 1. Verificar se já existe registro
    const { data: existing, error: searchError } = await supabase
      .from('conciliation_staging')
      .select('id, charge_id')
      .eq('tenant_id', tenantId)
      .eq('id_externo', data.id_externo)
      .limit(1);

    if (searchError) {
      throw new Error(`Erro ao buscar staging: ${searchError.message}`);
    }

    if (existing && existing.length > 0) {
      // AIDEV-NOTE: 2a. Atualizar registro existente
      const { error: updateError } = await supabase
        .from('conciliation_staging')
        .update({
          valor_cobranca: data.valor_cobranca,
          valor_pago: data.valor_pago,
          status_externo: data.status_externo,
          data_vencimento: data.data_vencimento,
          data_pagamento: data.data_pagamento,
          juros_multa_diferenca: data.juros_multa_diferenca,
          dados_brutos: data.dados_brutos,
          updated_at: data.updated_at
        })
        .eq('id', existing[0].id);

      if (updateError) {
        throw new Error(`Erro ao atualizar staging: ${updateError.message}`);
      }

      return {
        updated: true,
        created: false,
        movement_id: existing[0].id
      };
      
    } else {
      // AIDEV-NOTE: 2b. Criar novo registro
      const { data: newRecord, error: insertError } = await supabase
        .from('conciliation_staging')
        .insert({
          tenant_id: tenantId,
          origem: 'ASAAS_WEBHOOK',
          ...data,
          status_conciliacao: 'PENDENTE',
          processed: false,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Erro ao criar staging: ${insertError.message}`);
      }

      return {
        updated: false,
        created: true,
        movement_id: newRecord.id
      };
    }
  }

  /**
   * Sincroniza cobrança linkada (se existir)
   * AIDEV-NOTE: Atualiza charge espelhada automaticamente
   */
  private async syncLinkedCharge(
    movementId: string,
    data: any,
    tenantId: string
  ): Promise<{ updated: boolean; charge_id?: string }> {
    
    // AIDEV-NOTE: 1. Buscar cobrança linkada
    const { data: movement, error: movementError } = await supabase
      .from('conciliation_staging')
      .select('charge_id')
      .eq('id', movementId)
      .eq('tenant_id', tenantId)
      .single();

    if (movementError || !movement?.charge_id) {
      // AIDEV-NOTE: Não há cobrança linkada, não é erro
      return { updated: false };
    }

    // AIDEV-NOTE: 2. Atualizar cobrança linkada
    const chargeUpdateData = this.prepareChargeUpdateData(data);
    
    const { error: chargeError } = await supabase
      .from('charges')
      .update(chargeUpdateData)
      .eq('id', movement.charge_id)
      .eq('tenant_id', tenantId);

    if (chargeError) {
      throw new Error(`Erro ao atualizar charge: ${chargeError.message}`);
    }

    return {
      updated: true,
      charge_id: movement.charge_id
    };
  }

  /**
   * Prepara dados para atualização da cobrança
   * AIDEV-NOTE: Mapeia campos específicos para charges
   */
  private prepareChargeUpdateData(data: any) {
    const statusMapping: { [key: string]: string } = {
      'PENDING': 'PENDING',
      'RECEIVED': 'RECEIVED',
      'CONFIRMED': 'CONFIRMED',
      'OVERDUE': 'OVERDUE',
      'REFUNDED': 'REFUNDED',
      'RECEIVED_IN_CASH': 'RECEIVED_IN_CASH',
      'AWAITING_RISK_ANALYSIS': 'PENDING'
    };

    return {
      valor: data.valor_cobranca,
      status: statusMapping[data.status_externo] || 'PENDING',
      data_vencimento: data.data_vencimento,
      data_pagamento: data.data_pagamento,
      updated_at: data.updated_at
    };
  }

  /**
   * Registra log de auditoria da sincronização
   * AIDEV-NOTE: Importante para rastreabilidade
   */
  private async logWebhookSync(
    event: string,
    result: WebhookSyncResult,
    tenantId: string
  ): Promise<void> {
    
    try {
      const logData = {
        tenant_id: tenantId,
        event_type: 'WEBHOOK_SYNC',
        event_data: {
          webhook_event: event,
          result: result
        },
        created_at: new Date().toISOString()
      };

      // AIDEV-NOTE: Inserir no log de auditoria (se existir tabela)
      await supabase
        .from('audit_logs')
        .insert(logData);
        
    } catch (error) {
      // AIDEV-NOTE: Não falhar por erro de log
      console.error('Erro ao registrar log de auditoria:', error);
    }
  }

  /**
   * Processa webhook de pagamento recebido
   * AIDEV-NOTE: Especialização para evento PAYMENT_RECEIVED
   */
  async processPaymentReceived(
    payload: AsaasWebhookPayload,
    tenantId: string
  ): Promise<WebhookSyncResult> {
    
    // AIDEV-NOTE: Validar se é realmente um pagamento recebido
    if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(payload.event)) {
      throw new Error('Evento não é de pagamento recebido');
    }

    return await this.processAsaasWebhook(payload, tenantId);
  }

  /**
   * Processa webhook de pagamento vencido
   * AIDEV-NOTE: Especialização para evento PAYMENT_OVERDUE
   */
  async processPaymentOverdue(
    payload: AsaasWebhookPayload,
    tenantId: string
  ): Promise<WebhookSyncResult> {
    
    if (payload.event !== 'PAYMENT_OVERDUE') {
      throw new Error('Evento não é de pagamento vencido');
    }

    return await this.processAsaasWebhook(payload, tenantId);
  }
}

// AIDEV-NOTE: Instância singleton do serviço
export const webhookSyncService = new WebhookSyncService();
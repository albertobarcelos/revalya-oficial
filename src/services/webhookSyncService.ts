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
  updated_charge: boolean;
  errors: string[];
  charge_id?: string;
}

/**
 * Serviço responsável pela sincronização automática via webhooks
 * AIDEV-NOTE: Atualiza charges diretamente (webhooks já criam charges)
 */
export class WebhookSyncService {

  /**
   * Processa webhook do ASAAS e sincroniza dados
   * AIDEV-NOTE: Atualiza charge existente se necessário
   */
  async processAsaasWebhook(
    payload: AsaasWebhookPayload,
    tenantId: string
  ): Promise<WebhookSyncResult> {
    
    const result: WebhookSyncResult = {
      success: false,
      updated_charge: false,
      errors: []
    };

    try {
      // AIDEV-NOTE: 1. Configurar contexto de tenant
      await this.setTenantContext(tenantId);
      
      // AIDEV-NOTE: 2. Buscar charge existente pelo asaas_id
      const { data: existingCharge } = await supabase
        .from('charges')
        .select('id, status, valor, data_pagamento')
        .eq('tenant_id', tenantId)
        .eq('asaas_id', payload.payment.id)
        .maybeSingle();

      if (!existingCharge) {
        // AIDEV-NOTE: Charge não existe - webhook deve criar via edge function
        result.success = true;
        return result;
      }

      // AIDEV-NOTE: 3. Mapear status
      const mappedStatus = this.mapAsaasStatusToChargeStatus(payload.payment.status);
      
      // AIDEV-NOTE: 4. Verificar se precisa atualizar
      const needsUpdate = 
        existingCharge.status !== mappedStatus ||
        existingCharge.valor !== payload.payment.value ||
        (payload.payment.paymentDate && existingCharge.data_pagamento !== payload.payment.paymentDate);

      if (!needsUpdate) {
        result.success = true;
        result.charge_id = existingCharge.id;
        return result;
      }

      // AIDEV-NOTE: 5. Atualizar charge
      const updateData: any = {
        status: mappedStatus,
        valor: payload.payment.value,
        updated_at: new Date().toISOString()
      };

      if (payload.payment.paymentDate) {
        updateData.data_pagamento = new Date(payload.payment.paymentDate).toISOString();
      }

      const { error: updateError } = await supabase
        .from('charges')
        .update(updateData)
        .eq('id', existingCharge.id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw new Error(`Erro ao atualizar charge: ${updateError.message}`);
      }

      result.success = true;
      result.updated_charge = true;
      result.charge_id = existingCharge.id;
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Erro na sincronização webhook:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Mapeia status ASAAS para status de charges
   */
  private mapAsaasStatusToChargeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      "PENDING": "PENDING",
      "RECEIVED": "RECEIVED",
      "CONFIRMED": "CONFIRMED",
      "OVERDUE": "OVERDUE",
      "REFUNDED": "REFUNDED",
      "RECEIVED_IN_CASH": "RECEIVED",
      "AWAITING_RISK_ANALYSIS": "PENDING",
      "CREATED": "PENDING",
      "DELETED": "PENDING",
      "CHECKOUT_VIEWED": "PENDING",
      "ANTICIPATED": "RECEIVED"
    };
    return statusMap[status] || "PENDING";
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

  // AIDEV-NOTE: Métodos processWebhookData, calculateInterestDifference e prepareChargeUpdateData removidos
  // Não são mais necessários - webhooks criam/atualizam charges diretamente

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
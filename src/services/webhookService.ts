import { supabase } from '@/lib/supabase';
import { gatewayService, type WebhookData } from './gatewayService';
import { financeEntriesService } from './financeEntriesService';
import { queryClient } from '@/lib/queryClient';
import type { Database } from '@/types/database';

type Charge = Database['public']['Tables']['charges']['Row'];
type PaymentGateway = Database['public']['Tables']['payment_gateways']['Row'];

export interface WebhookProcessResult {
  success: boolean;
  charge_id?: string;
  finance_entry_id?: string;
  action_taken?: string;
  error?: string;
  webhook_data?: WebhookData;
}

export interface WebhookLog {
  id: string;
  tenant_id: string;
  provider: string;
  event_type: string;
  external_id: string;
  payload: Record<string, any>;
  processed: boolean;
  success: boolean;
  error_message?: string;
  created_at: string;
}

class WebhookService {
  /**
   * Processa webhook de pagamento
   */
  async processPaymentWebhook(
    provider: string,
    payload: any,
    signature?: string
  ): Promise<WebhookProcessResult> {
    const result: WebhookProcessResult = {
      success: false
    };

    try {
      // 1. Validar assinatura do webhook (se fornecida)
      if (signature) {
        const isValid = await this.validateWebhookSignature(provider, payload, signature);
        if (!isValid) {
          throw new Error('Assinatura do webhook inválida');
        }
      }

      // 2. Processar dados do webhook
      const webhookData = await gatewayService.processWebhook(provider, payload);
      result.webhook_data = webhookData;

      // 3. Log do webhook
      await this.logWebhook({
        provider,
        event_type: webhookData.event,
        external_id: webhookData.external_id,
        payload,
        processed: false,
        success: false
      });

      // 4. Buscar cobrança local
      const charge = await this.findChargeByExternalId(webhookData.external_id);
      if (!charge) {
        throw new Error(`Cobrança não encontrada: ${webhookData.external_id}`);
      }

      result.charge_id = charge.id;

      // 5. Processar evento específico
      const actionResult = await this.processWebhookEvent(charge, webhookData);
      result.action_taken = actionResult.action;
      result.finance_entry_id = actionResult.finance_entry_id;

      // 6. Atualizar log como processado
      await this.updateWebhookLog(webhookData.external_id, true, null);

      result.success = true;

      if (process.env.NODE_ENV === 'development') {
        console.debug('[Webhook] Processado com sucesso:', {
          provider,
          event: webhookData.event,
          charge_id: charge.id,
          action: actionResult.action
        });
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      result.error = errorMsg;

      // Log do erro
      if (result.webhook_data) {
        await this.updateWebhookLog(result.webhook_data.external_id, true, errorMsg);
      }

      if (process.env.NODE_ENV === 'development') {
        console.error('[Webhook] Erro ao processar:', errorMsg);
      }
    }

    return result;
  }

  /**
   * Processa evento específico do webhook
   */
  private async processWebhookEvent(
    charge: Charge,
    webhookData: WebhookData
  ): Promise<{ action: string; finance_entry_id?: string }> {
    const eventType = webhookData.event.toLowerCase();
    
    switch (eventType) {
      case 'payment_received':
      case 'payment_confirmed':
      case 'payment_approved':
        return await this.handlePaymentReceived(charge, webhookData);
      
      case 'payment_overdue':
      case 'payment_expired':
        return await this.handlePaymentOverdue(charge, webhookData);
      
      case 'payment_cancelled':
      case 'payment_refunded':
        return await this.handlePaymentCancelled(charge, webhookData);
      
      case 'payment_pending':
      case 'payment_waiting':
        return await this.handlePaymentPending(charge, webhookData);
      
      default:
        return { action: `Evento não processado: ${eventType}` };
    }
  }

  /**
   * Processa pagamento recebido
   */
  private async handlePaymentReceived(
    charge: Charge,
    webhookData: WebhookData
  ): Promise<{ action: string; finance_entry_id?: string }> {
    // Atualizar status da cobrança
    await this.updateChargeStatus(charge.id, 'RECEIVED', {
      data_pagamento: webhookData.payment_date,
      metadata: {
        ...charge.metadata,
        webhook_payment: {
          date: webhookData.payment_date,
          method: webhookData.payment_method,
          amount: webhookData.amount
        }
      }
    });

    // Atualizar lançamento financeiro
    const financeEntry = await financeEntriesService.updateFromWebhook(
      webhookData.external_id,
      {
        status: 'paid',
        payment_date: webhookData.payment_date,
        amount: webhookData.amount,
        payment_method: webhookData.payment_method
      }
    );

    return {
      action: 'Pagamento confirmado',
      finance_entry_id: financeEntry?.id
    };
  }

  /**
   * Processa pagamento vencido
   */
  private async handlePaymentOverdue(
    charge: Charge,
    webhookData: WebhookData
  ): Promise<{ action: string; finance_entry_id?: string }> {
    // Atualizar status da cobrança
    await this.updateChargeStatus(charge.id, 'OVERDUE', {
      metadata: {
        ...charge.metadata,
        overdue_notification: {
          date: new Date().toISOString(),
          external_id: webhookData.external_id
        }
      }
    });

    // Atualizar lançamento financeiro
    const financeEntry = await financeEntriesService.updateFromWebhook(
      webhookData.external_id,
      { status: 'overdue' }
    );

    return {
      action: 'Marcado como vencido',
      finance_entry_id: financeEntry?.id
    };
  }

  /**
   * Processa pagamento cancelado
   */
  private async handlePaymentCancelled(
    charge: Charge,
    webhookData: WebhookData
  ): Promise<{ action: string; finance_entry_id?: string }> {
    const newStatus = webhookData.event.includes('refund') ? 'REFUNDED' : 'PENDING';
    
    // Atualizar status da cobrança
    await this.updateChargeStatus(charge.id, newStatus, {
      metadata: {
        ...charge.metadata,
        cancellation: {
          date: new Date().toISOString(),
          event: webhookData.event,
          external_id: webhookData.external_id
        }
      }
    });

    // Atualizar lançamento financeiro
    const financeEntry = await financeEntriesService.updateFromWebhook(
      webhookData.external_id,
      { status: 'cancelled' }
    );

    return {
      action: newStatus === 'REFUNDED' ? 'Estornado' : 'Cancelado',
      finance_entry_id: financeEntry?.id
    };
  }

  /**
   * Processa pagamento pendente
   */
  private async handlePaymentPending(
    charge: Charge,
    webhookData: WebhookData
  ): Promise<{ action: string; finance_entry_id?: string }> {
    // Atualizar metadata da cobrança
    await this.updateChargeStatus(charge.id, 'PENDING', {
      metadata: {
        ...charge.metadata,
        status_update: {
          date: new Date().toISOString(),
          event: webhookData.event,
          external_id: webhookData.external_id
        }
      }
    });

    return { action: 'Status atualizado para pendente' };
  }

  /**
   * Busca cobrança pelo ID externo
   */
  private async findChargeByExternalId(external_id: string): Promise<Charge | null> {
    const { data, error } = await supabase
      .from('charges')
      .select('*')
      .eq('asaas_id', external_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      throw new Error(`Erro ao buscar cobrança: ${error.message}`);
    }

    return data;
  }

  /**
   * Atualiza status da cobrança
   */
  private async updateChargeStatus(
    charge_id: string,
    status: 'PENDING' | 'RECEIVED' | 'RECEIVED_IN_CASH' | 'OVERDUE' | 'REFUNDED' | 'CONFIRMED',
    additionalData: Partial<Charge> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('charges')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      })
      .eq('id', charge_id);

    if (error) {
      throw new Error(`Erro ao atualizar cobrança: ${error.message}`);
    }

    // Invalidar cache do React Query para atualizar o dashboard
    try {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      console.log('Cache de cobranças invalidado após atualização via webhook');
    } catch (cacheError) {
      console.warn('Erro ao invalidar cache:', cacheError);
    }
  }

  /**
   * Valida assinatura do webhook
   */
  private async validateWebhookSignature(
    provider: string,
    payload: any,
    signature: string
  ): Promise<boolean> {
    try {
      // Buscar configuração do gateway
      const { data: gateway, error } = await supabase
        .from('payment_gateways')
        .select('webhook_secret')
        .eq('provider', provider)
        .eq('is_active', true)
        .single();

      if (error || !gateway?.webhook_secret) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Webhook] Secret não configurado para', provider);
        }
        return true; // Permitir em desenvolvimento
      }

      // Implementar validação específica por gateway
      switch (provider.toLowerCase()) {
        case 'asaas':
          return this.validateAsaasSignature(payload, signature, gateway.webhook_secret);
        case 'cora':
          return this.validateCoraSignature(payload, signature, gateway.webhook_secret);
        case 'itau':
          return this.validateItauSignature(payload, signature, gateway.webhook_secret);
        default:
          return true; // Permitir por padrão
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Webhook] Erro na validação:', error);
      }
      return false;
    }
  }

  /**
   * Valida assinatura do Asaas
   */
  private validateAsaasSignature(payload: any, signature: string, secret: string): boolean {
    // Implementar validação HMAC SHA-256 do Asaas
    const crypto = require('crypto');
    const payloadString = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
    
    return signature === expectedSignature;
  }

  /**
   * Valida assinatura do Cora
   */
  private validateCoraSignature(payload: any, signature: string, secret: string): boolean {
    // Implementar validação específica do Cora
    return true; // Placeholder
  }

  /**
   * Valida assinatura do Itaú
   */
  private validateItauSignature(payload: any, signature: string, secret: string): boolean {
    // Implementar validação específica do Itaú
    return true; // Placeholder
  }

  /**
   * Registra webhook no log
   */
  private async logWebhook(data: {
    provider: string;
    event_type: string;
    external_id: string;
    payload: Record<string, any>;
    processed: boolean;
    success: boolean;
    error_message?: string;
  }): Promise<void> {
    // Buscar tenant_id baseado no external_id
    const charge = await this.findChargeByExternalId(data.external_id);
    const tenant_id = charge?.tenant_id || 'unknown';

    const logData = {
      tenant_id,
      provider: data.provider,
      event_type: data.event_type,
      external_id: data.external_id,
      payload: data.payload,
      processed: data.processed,
      success: data.success,
      error_message: data.error_message
    };

    // Salvar em uma tabela de logs (se existir)
    // Por enquanto, apenas log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Webhook] Log:', logData);
    }
  }

  /**
   * Atualiza log do webhook
   */
  private async updateWebhookLog(
    external_id: string,
    processed: boolean,
    error_message: string | null
  ): Promise<void> {
    // Implementar atualização do log
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Webhook] Log atualizado:', {
        external_id,
        processed,
        error_message
      });
    }
  }

  /**
   * Reprocessa webhook que falhou
   */
  async retryWebhook(external_id: string): Promise<WebhookProcessResult> {
    // Buscar dados do webhook no log
    // Por enquanto, retornar erro
    throw new Error('Funcionalidade de retry não implementada');
  }

  /**
   * Busca logs de webhook com filtros
   */
  async getWebhookLogs(filters: {
    tenant_id: string;
    provider?: string;
    start_date?: Date;
    end_date?: Date;
    processed?: boolean;
    success?: boolean;
  }): Promise<WebhookLog[]> {
    // Implementar busca nos logs
    // Por enquanto, retornar array vazio
    return [];
  }

  /**
   * Testa webhook manualmente
   */
  async testWebhook(
    provider: string,
    external_id: string,
    event_type: string
  ): Promise<WebhookProcessResult> {
    // Buscar cobrança
    const charge = await this.findChargeByExternalId(external_id);
    if (!charge) {
      throw new Error('Cobrança não encontrada');
    }

    // Simular dados do webhook
    const mockWebhookData: WebhookData = {
      event: event_type,
      charge_id: charge.id,
      external_id,
      status: 'paid',
      amount: charge.valor,
      payment_date: new Date().toISOString(),
      payment_method: 'PIX'
    };

    // Processar evento
    const actionResult = await this.processWebhookEvent(charge, mockWebhookData);

    return {
      success: true,
      charge_id: charge.id,
      action_taken: actionResult.action,
      finance_entry_id: actionResult.finance_entry_id,
      webhook_data: mockWebhookData
    };
  }

  /**
   * Configura URL de webhook para um gateway
   */
  async configureWebhookUrl(
    gateway_id: string,
    webhook_url: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('payment_gateways')
        .update({ 
          webhook_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', gateway_id);

      if (error) {
        throw new Error(`Erro ao configurar webhook: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

export const webhookService = new WebhookService();
export default webhookService;

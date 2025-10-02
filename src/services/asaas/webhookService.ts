/**
 * ASAAS Webhook Configuration Service
 * 
 * Serviço para configurar webhooks ASAAS via API automaticamente.
 * Permite criar, listar, atualizar e deletar webhooks programaticamente.
 * 
 * AIDEV-NOTE: Este serviço automatiza a configuração de webhooks ASAAS,
 * eliminando a necessidade de configuração manual no painel.
 */

import { AsaasEnvironment } from '@/types/asaas';

// Interfaces para configuração de webhook
export interface AsaasWebhookConfig {
  name: string;
  url: string;
  email: string;
  enabled: boolean;
  interrupted: boolean;
  authToken?: string;
  sendType: 'SEQUENTIALLY' | 'NON_SEQUENTIALLY';
  events: AsaasWebhookEvent[];
}

export interface AsaasWebhookResponse {
  id: string;
  name: string;
  url: string;
  email: string;
  enabled: boolean;
  interrupted: boolean;
  authToken?: string;
  sendType: 'SEQUENTIALLY' | 'NON_SEQUENTIALLY';
  events: AsaasWebhookEvent[];
}

// Eventos de cobrança que queremos monitorar
export type AsaasWebhookEvent = 
  | 'PAYMENT_CREATED'
  | 'PAYMENT_UPDATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_RESTORED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_REFUND_IN_PROGRESS'
  | 'PAYMENT_RECEIVED_IN_CASH_UNDONE'
  | 'PAYMENT_CHARGEBACK_REQUESTED'
  | 'PAYMENT_CHARGEBACK_DISPUTE'
  | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
  | 'PAYMENT_DUNNING_REQUESTED'
  | 'PAYMENT_DUNNING_RECEIVED'
  | 'PAYMENT_BANK_SLIP_VIEWED'
  | 'PAYMENT_CHECKOUT_VIEWED'
  | 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED'
  | 'PAYMENT_ANTICIPATED'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_AWAITING_RISK_ANALYSIS'
  | 'PAYMENT_APPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_REPROVED_BY_RISK_ANALYSIS';

export class AsaasWebhookService {
  private apiKey: string;
  private environment: AsaasEnvironment;
  private baseUrl: string;

  constructor(apiKey: string, environment: AsaasEnvironment = 'sandbox') {
    this.apiKey = apiKey;
    this.environment = environment;
    this.baseUrl = environment === 'production' 
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';
  }

  /**
   * Cria um novo webhook ASAAS
   * AIDEV-NOTE: Configura automaticamente todos os eventos de cobrança relevantes
   */
  async createWebhook(config: AsaasWebhookConfig): Promise<AsaasWebhookResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': this.apiKey,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao criar webhook ASAAS: ${JSON.stringify(errorData)}`);
      }

      const webhook = await response.json();
      console.log('✅ Webhook ASAAS criado com sucesso:', webhook.id);
      
      return webhook;
    } catch (error) {
      console.error('❌ Erro ao criar webhook ASAAS:', error);
      throw error;
    }
  }

  /**
   * Lista todos os webhooks configurados
   */
  async listWebhooks(): Promise<AsaasWebhookResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks`, {
        method: 'GET',
        headers: {
          'access_token': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao listar webhooks ASAAS: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('❌ Erro ao listar webhooks ASAAS:', error);
      throw error;
    }
  }

  /**
   * Atualiza um webhook existente
   */
  async updateWebhook(webhookId: string, config: Partial<AsaasWebhookConfig>): Promise<AsaasWebhookResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks/${webhookId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': this.apiKey,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao atualizar webhook ASAAS: ${JSON.stringify(errorData)}`);
      }

      const webhook = await response.json();
      console.log('✅ Webhook ASAAS atualizado com sucesso:', webhook.id);
      
      return webhook;
    } catch (error) {
      console.error('❌ Erro ao atualizar webhook ASAAS:', error);
      throw error;
    }
  }

  /**
   * Deleta um webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'access_token': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao deletar webhook ASAAS: ${JSON.stringify(errorData)}`);
      }

      console.log('✅ Webhook ASAAS deletado com sucesso:', webhookId);
    } catch (error) {
      console.error('❌ Erro ao deletar webhook ASAAS:', error);
      throw error;
    }
  }

  /**
   * Gera configuração padrão para webhook de cobranças
   * AIDEV-NOTE: Inclui todos os eventos relevantes para reconciliação
   */
  static generateChargesWebhookConfig(
    webhookUrl: string,
    email: string,
    authToken?: string
  ): AsaasWebhookConfig {
    return {
      name: 'Revalya - Webhook Cobranças',
      url: webhookUrl,
      email,
      enabled: true,
      interrupted: false,
      authToken,
      sendType: 'SEQUENTIALLY',
      events: [
        'PAYMENT_CREATED',
        'PAYMENT_UPDATED',
        'PAYMENT_CONFIRMED',
        'PAYMENT_RECEIVED',
        'PAYMENT_OVERDUE',
        'PAYMENT_DELETED',
        'PAYMENT_RESTORED',
        'PAYMENT_REFUNDED',
        'PAYMENT_REFUND_IN_PROGRESS',
        'PAYMENT_RECEIVED_IN_CASH_UNDONE',
        'PAYMENT_CHARGEBACK_REQUESTED',
        'PAYMENT_CHARGEBACK_DISPUTE',
        'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
        'PAYMENT_DUNNING_REQUESTED',
        'PAYMENT_DUNNING_RECEIVED',
        'PAYMENT_BANK_SLIP_VIEWED',
        'PAYMENT_CHECKOUT_VIEWED',
        'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
        'PAYMENT_ANTICIPATED',
        'PAYMENT_AUTHORIZED',
        'PAYMENT_AWAITING_RISK_ANALYSIS',
        'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
        'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
      ],
    };
  }
}

/**
 * Função utilitária para configurar webhook ASAAS automaticamente
 * AIDEV-NOTE: Simplifica o processo de configuração para uso em scripts/migrations
 */
export async function setupAsaasWebhook(
  apiKey: string,
  environment: AsaasEnvironment,
  webhookUrl: string,
  email: string,
  authToken?: string
): Promise<AsaasWebhookResponse> {
  const webhookService = new AsaasWebhookService(apiKey, environment);
  
  // Verifica se já existe um webhook com a mesma URL
  const existingWebhooks = await webhookService.listWebhooks();
  const existingWebhook = existingWebhooks.find(webhook => webhook.url === webhookUrl);
  
  if (existingWebhook) {
    console.log('⚠️ Webhook já existe para esta URL:', existingWebhook.id);
    return existingWebhook;
  }
  
  // Cria novo webhook
  const config = AsaasWebhookService.generateChargesWebhookConfig(
    webhookUrl,
    email,
    authToken
  );
  
  return await webhookService.createWebhook(config);
}
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type PaymentGateway = Database['public']['Tables']['payment_gateways']['Row'];

export interface CustomerData {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
}

export interface ChargeRequest {
  customer: CustomerData;
  amount: number;
  due_date: string;
  description: string;
  payment_method: string;
  reference?: string;
  installments?: number;
  metadata?: Record<string, any>;
}

export interface ChargeResponse {
  id: string;
  status: string;
  amount: number;
  due_date: string;
  payment_url?: string;
  barcode?: string;
  pix_code?: string;
  qr_code?: string;
  external_reference?: string;
  metadata?: Record<string, any>;
}

export interface WebhookData {
  event: string;
  charge_id: string;
  external_id: string;
  status: string;
  amount?: number;
  payment_date?: string;
  payment_method?: string;
  metadata?: Record<string, any>;
}

// Interfaces específicas para cada gateway
interface AsaasChargeRequest {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
}

interface CoraChargeRequest {
  customer_id: string;
  amount: number;
  due_date: string;
  description: string;
  payment_method: string;
  reference?: string;
}

interface ItauChargeRequest {
  beneficiario: {
    nome: string;
    documento: string;
  };
  pagador: {
    nome: string;
    documento: string;
  };
  valor: number;
  vencimento: string;
  descricao: string;
}

class GatewayService {
  /**
   * Cria uma cobrança usando o gateway especificado
   */
  async createCharge(provider: string, request: ChargeRequest): Promise<ChargeResponse> {
    // AIDEV-NOTE: Validação de credenciais antes de criar cobrança
    // Verifica se o gateway está configurado e tem credenciais válidas
    const gateway = await this.getGatewayConfig(provider);
    const validation = this.validateGatewayConfig(gateway);
    
    if (!validation.isValid) {
      throw new Error(`Gateway ${provider} não configurado: ${validation.errors.join(', ')}`);
    }

    switch (provider.toLowerCase()) {
      case 'asaas':
        return await this.createAsaasCharge(request);
      case 'cora':
        return await this.createCoraCharge(request);
      case 'itau':
        return await this.createItauCharge(request);
      case 'omie':
        return await this.createOmieCharge(request);
      default:
        throw new Error(`Gateway não suportado: ${provider}`);
    }
  }

  /**
   * Processa webhook de pagamento
   */
  async processWebhook(provider: string, payload: any): Promise<WebhookData> {
    // AIDEV-NOTE: Validação de credenciais antes de processar webhook
    const gateway = await this.getGatewayConfig(provider);
    const validation = this.validateGatewayConfig(gateway);
    
    if (!validation.isValid) {
      throw new Error(`Gateway ${provider} não configurado: ${validation.errors.join(', ')}`);
    }

    switch (provider.toLowerCase()) {
      case 'asaas':
        return await this.processAsaasWebhook(payload);
      case 'cora':
        return await this.processCoraWebhook(payload);
      case 'itau':
        return await this.processItauWebhook(payload);
      case 'omie':
        return await this.processOmieWebhook(payload);
      default:
        throw new Error(`Webhook não suportado para: ${provider}`);
    }
  }

  /**
   * Busca status de uma cobrança
   */
  async getChargeStatus(provider: string, external_id: string): Promise<ChargeResponse> {
    // AIDEV-NOTE: Validação de credenciais antes de consultar status
    const gateway = await this.getGatewayConfig(provider);
    const validation = this.validateGatewayConfig(gateway);
    
    if (!validation.isValid) {
      throw new Error(`Gateway ${provider} não configurado: ${validation.errors.join(', ')}`);
    }

    switch (provider.toLowerCase()) {
      case 'asaas':
        return await this.getAsaasChargeStatus(external_id);
      case 'cora':
        return await this.getCoraChargeStatus(external_id);
      case 'itau':
        return await this.getItauChargeStatus(external_id);
      case 'omie':
        return await this.getOmieChargeStatus(external_id);
      default:
        throw new Error(`Consulta não suportada para: ${provider}`);
    }
  }

  // ========== ASAAS ==========
  private async createAsaasCharge(request: ChargeRequest): Promise<ChargeResponse> {
    const gateway = await this.getGatewayConfig('asaas');
    
    // Primeiro, criar/buscar cliente no Asaas
    const customerId = await this.getOrCreateAsaasCustomer(request.customer, gateway);
    
    const asaasRequest: AsaasChargeRequest = {
      customer: customerId,
      billingType: this.mapPaymentMethodToAsaas(request.payment_method),
      value: request.amount,
      dueDate: request.due_date,
      description: request.description,
      externalReference: request.reference
    };

    if (request.installments && request.installments > 1) {
      asaasRequest.installmentCount = request.installments;
      asaasRequest.installmentValue = request.amount / request.installments;
    }

    const response = await fetch(`${gateway.api_url}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': gateway.api_key
      },
      body: JSON.stringify(asaasRequest)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro Asaas: ${error}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      status: this.mapAsaasStatus(data.status),
      amount: data.value,
      due_date: data.dueDate,
      payment_url: data.invoiceUrl,
      barcode: data.bankSlipUrl,
      pix_code: data.pixTransaction?.qrCode?.payload,
      qr_code: data.pixTransaction?.qrCode?.encodedImage,
      external_reference: data.externalReference,
      metadata: request.metadata
    };
  }

  private async getOrCreateAsaasCustomer(customer: CustomerData, gateway: PaymentGateway): Promise<string> {
    if (customer.id) {
      return customer.id;
    }

    const customerRequest = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      cpfCnpj: customer.document,
      externalReference: customer.id
    };

    const response = await fetch(`${gateway.api_url}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': gateway.api_key
      },
      body: JSON.stringify(customerRequest)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao criar cliente Asaas: ${error}`);
    }

    const data = await response.json();
    return data.id;
  }

  private mapPaymentMethodToAsaas(method: string): 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED' {
    const methodMap: Record<string, 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'> = {
      'BOLETO': 'BOLETO',
      'PIX': 'PIX',
      'CREDIT_CARD': 'CREDIT_CARD',
      'CARTAO': 'CREDIT_CARD'
    };
    return methodMap[method?.toUpperCase()] || 'UNDEFINED';
  }

  private mapAsaasStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'PENDING',
      'RECEIVED': 'PAID',
      'CONFIRMED': 'CONFIRMED',
      'OVERDUE': 'OVERDUE',
      'REFUNDED': 'REFUNDED'
    };
    return statusMap[status] || status;
  }

  private async getAsaasChargeStatus(external_id: string): Promise<ChargeResponse> {
    const gateway = await this.getGatewayConfig('asaas');
    
    const response = await fetch(`${gateway.api_url}/payments/${external_id}`, {
      headers: {
        'access_token': gateway.api_key
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao consultar Asaas: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      status: this.mapAsaasStatus(data.status),
      amount: data.value,
      due_date: data.dueDate,
      payment_url: data.invoiceUrl,
      barcode: data.bankSlipUrl,
      pix_code: data.pixTransaction?.qrCode?.payload
    };
  }

  private async processAsaasWebhook(payload: any): Promise<WebhookData> {
    return {
      event: payload.event,
      charge_id: payload.payment?.id,
      external_id: payload.payment?.id,
      status: this.mapAsaasStatus(payload.payment?.status),
      amount: payload.payment?.value,
      payment_date: payload.payment?.paymentDate,
      payment_method: payload.payment?.billingType,
      metadata: {
        external_reference: payload.payment?.externalReference
      }
    };
  }

  // ========== CORA ==========
  private async createCoraCharge(request: ChargeRequest): Promise<ChargeResponse> {
    const gateway = await this.getGatewayConfig('cora');
    
    const coraRequest: CoraChargeRequest = {
      customer_id: request.customer.id || 'default',
      amount: request.amount,
      due_date: request.due_date,
      description: request.description,
      payment_method: request.payment_method,
      reference: request.reference
    };

    // Implementar chamada para API do Cora
    // Esta é uma implementação de exemplo
    const response = await fetch(`${gateway.api_url}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gateway.api_key}`
      },
      body: JSON.stringify(coraRequest)
    });

    if (!response.ok) {
      throw new Error(`Erro Cora: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      status: data.status,
      amount: data.amount,
      due_date: data.due_date,
      payment_url: data.payment_url,
      barcode: data.barcode,
      pix_code: data.pix_code
    };
  }

  private async getCoraChargeStatus(external_id: string): Promise<ChargeResponse> {
    const gateway = await this.getGatewayConfig('cora');
    
    const response = await fetch(`${gateway.api_url}/charges/${external_id}`, {
      headers: {
        'Authorization': `Bearer ${gateway.api_key}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao consultar Cora: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      status: data.status,
      amount: data.amount,
      due_date: data.due_date,
      payment_url: data.payment_url,
      barcode: data.barcode
    };
  }

  private async processCoraWebhook(payload: any): Promise<WebhookData> {
    return {
      event: payload.event,
      charge_id: payload.charge_id,
      external_id: payload.charge_id,
      status: payload.status,
      amount: payload.amount,
      payment_date: payload.payment_date,
      payment_method: payload.payment_method
    };
  }

  // ========== ITAÚ ==========
  private async createItauCharge(request: ChargeRequest): Promise<ChargeResponse> {
    const gateway = await this.getGatewayConfig('itau');
    
    const itauRequest: ItauChargeRequest = {
      beneficiario: {
        nome: 'Sua Empresa',
        documento: '00000000000'
      },
      pagador: {
        nome: request.customer.name,
        documento: request.customer.document || ''
      },
      valor: request.amount,
      vencimento: request.due_date,
      descricao: request.description
    };

    // Implementar chamada para API do Itaú
    const response = await fetch(`${gateway.api_url}/cobrancas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gateway.api_key}`
      },
      body: JSON.stringify(itauRequest)
    });

    if (!response.ok) {
      throw new Error(`Erro Itaú: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      status: data.status,
      amount: data.valor,
      due_date: data.vencimento,
      payment_url: data.url_pagamento,
      barcode: data.codigo_barras
    };
  }

  private async getItauChargeStatus(external_id: string): Promise<ChargeResponse> {
    const gateway = await this.getGatewayConfig('itau');
    
    const response = await fetch(`${gateway.api_url}/cobrancas/${external_id}`, {
      headers: {
        'Authorization': `Bearer ${gateway.api_key}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao consultar Itaú: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      status: data.status,
      amount: data.valor,
      due_date: data.vencimento,
      payment_url: data.url_pagamento,
      barcode: data.codigo_barras
    };
  }

  private async processItauWebhook(payload: any): Promise<WebhookData> {
    return {
      event: payload.evento,
      charge_id: payload.cobranca_id,
      external_id: payload.cobranca_id,
      status: payload.status,
      amount: payload.valor,
      payment_date: payload.data_pagamento,
      payment_method: payload.forma_pagamento
    };
  }

  // ========== OMIE ==========
  private async createOmieCharge(request: ChargeRequest): Promise<ChargeResponse> {
    const gateway = await this.getGatewayConfig('omie');
    
    // Omie é mais focado em ERP/Fiscal, implementação específica
    const omieRequest = {
      call: 'IncluirContasReceber',
      app_key: gateway.api_key,
      app_secret: gateway.api_secret,
      param: [{
        codigo_cliente_fornecedor: request.customer.id,
        data_vencimento: request.due_date,
        valor_documento: request.amount,
        codigo_categoria: '1.01.01',
        observacao: request.description
      }]
    };

    const response = await fetch(`${gateway.api_url}/geral/contasreceber/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(omieRequest)
    });

    if (!response.ok) {
      throw new Error(`Erro Omie: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.codigo_lancamento_omie,
      status: 'PENDING',
      amount: request.amount,
      due_date: request.due_date
    };
  }

  private async getOmieChargeStatus(external_id: string): Promise<ChargeResponse> {
    // Implementar consulta no Omie
    throw new Error('Consulta Omie não implementada');
  }

  private async processOmieWebhook(payload: any): Promise<WebhookData> {
    return {
      event: payload.event,
      charge_id: payload.codigo_lancamento,
      external_id: payload.codigo_lancamento,
      status: payload.status,
      amount: payload.valor,
      payment_date: payload.data_pagamento
    };
  }

  // ========== UTILITÁRIOS ==========
  private async getGatewayConfig(provider: string): Promise<PaymentGateway> {
    // AIDEV-NOTE: Buscar credenciais específicas do tenant na nova tabela tenant_integrations
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar tenant_id do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      throw new Error('Tenant não encontrado para o usuário');
    }

    // Buscar credenciais do tenant para o provider específico
    const { data: integration, error } = await supabase
      .from('tenant_integrations')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('integration_type', provider.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !integration) {
      throw new Error(`Integração ${provider} não configurada ou inativa para este tenant. Configure as credenciais em Configurações > Integrações.`);
    }

    // Retornar no formato esperado pelo PaymentGateway
    return {
      id: integration.id,
      provider: integration.integration_type,
      api_key: integration.api_key,
      api_url: integration.api_url,
      is_active: integration.is_active,
      created_at: integration.created_at,
      updated_at: integration.updated_at
    } as PaymentGateway;
  }

  /**
   * Valida configuração de um gateway
   */
  async validateGatewayConfig(gateway_id: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const { data: gateway, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('id', gateway_id)
        .single();

      if (error || !gateway) {
        return { valid: false, error: 'Gateway não encontrado' };
      }

      if (!gateway.api_key) {
        return { valid: false, error: 'API Key não configurada' };
      }

      if (!gateway.api_url) {
        return { valid: false, error: 'URL da API não configurada' };
      }

      // Fazer uma chamada de teste para validar as credenciais
      // Implementar conforme necessário para cada gateway
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }
}

export const gatewayService = new GatewayService();
export default gatewayService;

// =====================================================
// CHARGE ASAAS SERVICE
// Descrição: Serviço para gerenciar charges do ASAAS
// Padrão: Clean Architecture + Security First
// =====================================================

import { supabase } from '@/lib/supabase';

// AIDEV-NOTE: Interface para dados do customer ASAAS
interface AsaasCustomerData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  city?: string;
  state?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

// AIDEV-NOTE: Interface para dados de pagamento ASAAS
interface AsaasPaymentData {
  id: string;
  customer: string | AsaasCustomerData;
  value: number;
  status: string;
  dueDate: string;
  paymentDate?: string;
  description?: string;
  externalReference?: string;
  billingType: string;
}

// AIDEV-NOTE: Mapeamento de status ASAAS para status de charges (MAIÚSCULAS)
function mapAsaasStatusToChargeStatus(status: string): string {
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

// AIDEV-NOTE: Mapeamento de payment method para tipo
function mapPaymentMethodToTipo(billingType: string | null | undefined): string {
  if (!billingType) return "BOLETO";
  
  const typeMap: Record<string, string> = {
    "PIX": "PIX",
    "BOLETO": "BOLETO",
    "BANK_SLIP": "BOLETO",
    "CREDIT_CARD": "CREDIT_CARD",
    "CASH": "CASH",
    "TRANSFER": "PIX"
  };
  
  return typeMap[billingType.toUpperCase()] || "BOLETO";
}

/**
 * Serviço para gerenciar charges do ASAAS
 * AIDEV-NOTE: Centraliza lógica de criação e atualização de charges do ASAAS
 */
export class ChargeAsaasService {
  /**
   * Busca ou cria customer baseado em dados ASAAS
   */
  async findOrCreateCustomer(
    tenantId: string,
    asaasCustomerId: string | null,
    customerData: AsaasCustomerData | null
  ): Promise<string> {
    if (!asaasCustomerId && !customerData) {
      throw new Error('Não é possível criar customer sem asaasCustomerId ou customerData');
    }

    // AIDEV-NOTE: Configurar contexto de tenant
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });

    // AIDEV-NOTE: Primeiro tentar buscar por customer_asaas_id
    if (asaasCustomerId) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("customer_asaas_id", asaasCustomerId)
        .maybeSingle();

      if (existingCustomer) {
        return existingCustomer.id;
      }
    }

    // AIDEV-NOTE: Tentar buscar por documento se disponível
    if (customerData?.cpfCnpj) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("cpf_cnpj", customerData.cpfCnpj)
        .maybeSingle();

      if (existingCustomer) {
        // AIDEV-NOTE: Atualizar customer_asaas_id se não tiver
        if (asaasCustomerId) {
          await supabase
            .from("customers")
            .update({ customer_asaas_id: asaasCustomerId })
            .eq("id", existingCustomer.id);
        }
        return existingCustomer.id;
      }
    }

    // AIDEV-NOTE: Criar novo customer
    const { data: newCustomer, error: createError } = await supabase
      .from("customers")
      .insert({
        tenant_id: tenantId,
        customer_asaas_id: asaasCustomerId,
        name: customerData?.name || "Cliente não identificado",
        email: customerData?.email || null,
        phone: customerData?.phone || customerData?.mobilePhone || null,
        cpf_cnpj: customerData?.cpfCnpj || null,
      })
      .select("id")
      .single();

    if (createError || !newCustomer) {
      throw new Error(`Erro ao criar customer: ${createError?.message || 'Erro desconhecido'}`);
    }

    return newCustomer.id;
  }

  /**
   * Busca contrato por externalReference
   */
  async findContractByExternalReference(
    tenantId: string,
    externalReference: string | null
  ): Promise<string | null> {
    if (!externalReference) {
      return null;
    }

    // AIDEV-NOTE: Configurar contexto de tenant
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });

    // AIDEV-NOTE: Tentar buscar contrato pelo número ou ID na externalReference
    const { data: contract } = await supabase
      .from("contracts")
      .select("id")
      .eq("tenant_id", tenantId)
      .or(`contract_number.eq.${externalReference},id.eq.${externalReference}`)
      .maybeSingle();

    return contract?.id || null;
  }

  /**
   * Cria ou atualiza charge do ASAAS
   */
  async createOrUpdateCharge(
    tenantId: string,
    payment: AsaasPaymentData,
    customerData?: AsaasCustomerData | null
  ): Promise<{ id: string; created: boolean }> {
    // AIDEV-NOTE: Configurar contexto de tenant
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });

    // AIDEV-NOTE: Extrair customer ID
    const asaasCustomerId = typeof payment.customer === 'string' 
      ? payment.customer 
      : payment.customer?.id || null;

    // AIDEV-NOTE: Buscar ou criar customer
    const customerUuid = await this.findOrCreateCustomer(
      tenantId,
      asaasCustomerId,
      customerData || (typeof payment.customer === 'object' ? payment.customer : null)
    );

    // AIDEV-NOTE: Tentar vincular contrato por externalReference
    const contractId = await this.findContractByExternalReference(
      tenantId,
      payment.externalReference
    );

    // AIDEV-NOTE: Mapear status e tipo
    const mappedStatus = mapAsaasStatusToChargeStatus(payment.status);
    const mappedTipo = mapPaymentMethodToTipo(payment.billingType);

    // AIDEV-NOTE: Garantir data_vencimento válida
    const dueDate = payment.dueDate 
      ? new Date(payment.dueDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0];
    
    // AIDEV-NOTE: Garantir valor válido
    const valor = payment.value || 0;

    // AIDEV-NOTE: Verificar se charge já existe
    const { data: existingCharge } = await supabase
      .from('charges')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('asaas_id', payment.id)
      .maybeSingle();

    // AIDEV-NOTE: Preparar dados para charge
    const chargeData: any = {
      tenant_id: tenantId,
      customer_id: customerUuid,
      contract_id: contractId,
      asaas_id: payment.id,
      valor: valor,
      status: mappedStatus,
      tipo: mappedTipo,
      data_vencimento: dueDate,
      descricao: payment.description || `Cobrança ASAAS ${payment.id}`,
      updated_at: new Date().toISOString()
    };

    // AIDEV-NOTE: Adicionar data_pagamento se disponível
    if (payment.paymentDate) {
      chargeData.data_pagamento = new Date(payment.paymentDate).toISOString();
    }

    if (existingCharge) {
      // AIDEV-NOTE: Atualizar charge existente
      const { error: updateError } = await supabase
        .from('charges')
        .update(chargeData)
        .eq('id', existingCharge.id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw new Error(`Erro ao atualizar charge: ${updateError.message}`);
      }

      return { id: existingCharge.id, created: false };
    } else {
      // AIDEV-NOTE: Criar nova charge
      const { data: newCharge, error: createError } = await supabase
        .from('charges')
        .insert(chargeData)
        .select('id')
        .single();

      if (createError || !newCharge) {
        throw new Error(`Erro ao criar charge: ${createError?.message || 'Erro desconhecido'}`);
      }

      return { id: newCharge.id, created: true };
    }
  }
}

// AIDEV-NOTE: Instância singleton do serviço
export const chargeAsaasService = new ChargeAsaasService();


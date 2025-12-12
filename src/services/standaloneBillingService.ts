import { supabase } from '@/lib/supabase';
import { gatewayService } from './gatewayService';
import { financeEntriesService } from './financeEntriesService';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * AIDEV-NOTE: Interface para criar faturamento avulso
 */
export interface CreateStandaloneBillingData {
  tenant_id: string;
  customer_id: string;
  contract_id?: string | null; // Opcional: cliente pode ter contrato
  bill_date: string;
  due_date: string;
  payment_method: string;
  payment_gateway_id?: string;
  description?: string;
  items: Array<{
    product_id?: string;
    service_id?: string;
    quantity: number;
    unit_price: number;
    storage_location_id?: string;
    description?: string;
  }>;
}

/**
 * AIDEV-NOTE: Interface para resultado de processamento
 */
export interface ProcessStandaloneBillingResult {
  success: boolean;
  charge_id?: string;
  period_id: string;
  finance_entry_id?: string;
  external_id?: string;
  error?: string;
  items_processed?: number;
  errors?: string[];
}

/**
 * AIDEV-NOTE: Interface para período avulso com relacionamentos
 */
export interface StandaloneBillingPeriod {
  id: string;
  tenant_id: string;
  customer_id: string;
  contract_id?: string | null;
  bill_date: string;
  due_date: string;
  status: 'PENDING' | 'DUE_TODAY' | 'BILLED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  amount_planned: number;
  amount_billed?: number;
  billed_at?: string;
  payment_method?: string;
  payment_gateway_id?: string;
  description?: string;
  order_number?: string; // AIDEV-NOTE: Número sequencial da Ordem de Serviço (001, 002, ...)
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    customer_asaas_id?: string;
  };
  items?: StandaloneBillingItem[];
}

/**
 * AIDEV-NOTE: Interface para item de faturamento avulso
 * AIDEV-NOTE: Tabela renomeada de standalone_billing_items para billing_period_items
 */
export interface StandaloneBillingItem {
  id: string;
  billing_period_id: string; // AIDEV-NOTE: Renomeado de standalone_billing_period_id
  product_id?: string;
  service_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  storage_location_id?: string;
  description?: string;
  stock_movement_id?: string;
  product?: {
    id: string;
    name: string;
    description?: string;
  };
  service?: {
    id: string;
    name: string;
    description?: string;
  };
}

/**
 * AIDEV-NOTE: Serviço para gerenciar faturamentos avulsos
 */
class StandaloneBillingService {
  /**
   * AIDEV-NOTE: Criar período de faturamento avulso com itens
   */
  async createStandaloneBilling(
    supabaseClient: SupabaseClient,
    tenantId: string,
    data: CreateStandaloneBillingData
  ): Promise<StandaloneBillingPeriod> {
    // AIDEV-NOTE: Configurar contexto de tenant
    await supabaseClient.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });

    // AIDEV-NOTE: Calcular total dos itens
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );

    // AIDEV-NOTE: Criar período avulso na tabela unificada contract_billing_periods
    // O order_number será gerado automaticamente pelo trigger no banco de dados
    const { data: period, error: periodError } = await supabaseClient
      .from('contract_billing_periods')
      .insert({
        tenant_id: tenantId,
        customer_id: data.customer_id,
        contract_id: data.contract_id || null,
        bill_date: data.bill_date,
        due_date: data.due_date,
        period_start: data.bill_date, // AIDEV-NOTE: Usar bill_date como period_start para standalone
        period_end: data.due_date, // AIDEV-NOTE: Usar due_date como period_end para standalone
        amount_planned: totalAmount,
        status: 'PENDING',
        payment_method: data.payment_method,
        payment_gateway_id: data.payment_gateway_id || null,
        description: data.description || null,
        is_standalone: true // AIDEV-NOTE: Flag para identificar como faturamento avulso
        // AIDEV-NOTE: order_number será gerado automaticamente pelo trigger
      })
      .select()
      .single();

    if (periodError) {
      console.error('[StandaloneBillingService] Erro ao criar período:', periodError);
      throw new Error(`Erro ao criar período de faturamento avulso: ${periodError.message || periodError.code || 'Erro desconhecido'}`);
    }

    if (!period) {
      throw new Error('Período de faturamento avulso não foi criado');
    }

    // AIDEV-NOTE: Criar itens do faturamento na tabela unificada billing_period_items
    if (data.items.length > 0) {
      const itemsToInsert = data.items.map(item => ({
        tenant_id: tenantId,
        billing_period_id: period.id, // AIDEV-NOTE: Renomeado de standalone_billing_period_id
        product_id: item.product_id || null,
        service_id: item.service_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        storage_location_id: item.storage_location_id || null,
        description: item.description || null
      }));

      const { error: itemsError } = await supabaseClient
        .from('billing_period_items') // AIDEV-NOTE: Tabela renomeada
        .insert(itemsToInsert);

      if (itemsError) {
        // AIDEV-NOTE: Rollback - deletar período criado
        await supabaseClient
          .from('contract_billing_periods')
          .delete()
          .eq('id', period.id);

        throw new Error(`Erro ao criar itens: ${itemsError.message}`);
      }
    }

    // AIDEV-NOTE: Buscar período completo com relacionamentos da tabela unificada
    const { data: fullPeriod, error: fetchError } = await supabaseClient
      .from('contract_billing_periods')
      .select(`
        *,
        customer:customers(*),
        items:billing_period_items(
          *,
          product:products(id, name, description),
          service:services(id, name, description)
        )
      `)
      .eq('id', period.id)
      .eq('is_standalone', true)
      .single();

    if (fetchError || !fullPeriod) {
      throw new Error(`Erro ao buscar período criado: ${fetchError?.message}`);
    }

    return fullPeriod as unknown as StandaloneBillingPeriod;
  }

  /**
   * AIDEV-NOTE: Processar faturamento avulso (criar charge, baixar estoque, etc)
   */
  async processStandaloneBilling(
    supabaseClient: SupabaseClient,
    tenantId: string,
    periodId: string
  ): Promise<ProcessStandaloneBillingResult> {
    // AIDEV-NOTE: Configurar contexto de tenant
    await supabaseClient.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });

    // AIDEV-NOTE: Chamar função RPC para processar faturamento
    const { data: result, error: rpcError } = await supabaseClient.rpc(
      'attempt_standalone_billing_charge',
      {
        p_period_id: periodId,
        p_tenant_id: tenantId
      }
    );

    if (rpcError) {
      return {
        success: false,
        period_id: periodId,
        error: `Erro ao processar faturamento: ${rpcError.message}`
      };
    }

    if (!result || !result.success) {
      return {
        success: false,
        period_id: periodId,
        error: result?.error || 'Erro desconhecido ao processar faturamento',
        items_processed: result?.items_processed || 0,
        errors: result?.errors || []
      };
    }

    const chargeId = result.charge_id;
    if (!chargeId) {
      return {
        success: false,
        period_id: periodId,
        error: 'Charge não foi criada pela função RPC'
      };
    }

    // AIDEV-NOTE: Criar charge no gateway externo (ASAAS)
    try {
      const gatewayCode = result.gateway_code || 'ASAAS';
      const chargeRequest = {
        customer: {
          id: result.customer_asaas_id || result.customer_id,
          name: result.customer_name,
          email: result.customer_email,
          phone: result.customer_phone,
          document: result.customer_document
        },
        amount: result.amount,
        due_date: result.due_date,
        description: result.description,
        payment_method: result.payment_method || 'BOLETO',
        reference: `STANDALONE-${periodId.substring(0, 8)}`,
        metadata: {
          standalone_billing_period_id: periodId,
          tenant_id: tenantId,
          customer_id: result.customer_id
        }
      };

      const gatewayResponse = await gatewayService.createCharge(
        gatewayCode.toLowerCase(),
        chargeRequest
      );

      // AIDEV-NOTE: ChargeResponse retorna id (external_id), não success
      if (gatewayResponse && gatewayResponse.id) {
        // AIDEV-NOTE: Atualizar charge com dados do gateway
        await supabaseClient
          .from('charges')
          .update({
            asaas_id: gatewayResponse.id, // id é o external_id do gateway
            payment_link: gatewayResponse.payment_url,
            codigo_barras: gatewayResponse.barcode,
            pix_code: gatewayResponse.pix_code,
            qr_code: gatewayResponse.qr_code,
            updated_at: new Date().toISOString()
          })
          .eq('id', chargeId)
          .eq('tenant_id', tenantId);
      }
    } catch (gatewayError) {
      // AIDEV-NOTE: Log do erro mas não falha o processamento
      console.error('Erro ao criar charge no gateway:', gatewayError);
      // Charge local já foi criada, apenas não tem dados do gateway
    }

    // AIDEV-NOTE: Criar lançamento financeiro
    let financeEntryId: string | undefined;
    try {
      const { data: charge } = await supabaseClient
        .from('charges')
        .select('*')
        .eq('id', chargeId)
        .single();

      if (charge) {
        const financeEntry = await financeEntriesService.createEntry({
          tenant_id: tenantId,
          type: 'RECEIVABLE',
          category: 'REVENUE',
          description: result.description || 'Faturamento Avulso',
          charge_id: chargeId,
          contract_id: result.contract_id || null,
          customer_id: result.customer_id,
          gross_amount: result.amount,
          net_amount: result.amount,
          due_date: result.due_date,
          status: 'PENDING',
          payment_method: result.payment_method || 'BOLETO',
          metadata: {
            standalone_billing_period_id: periodId,
            created_from_standalone_billing: true
          }
        });

        financeEntryId = financeEntry.id;
      }
    } catch (financeError) {
      // AIDEV-NOTE: Log do erro mas não falha o processamento
      console.error('Erro ao criar lançamento financeiro:', financeError);
    }

    return {
      success: true,
      charge_id: chargeId,
      period_id: periodId,
      finance_entry_id: financeEntryId,
      items_processed: result.items_processed || 0,
      errors: result.errors || []
    };
  }

  /**
   * AIDEV-NOTE: Buscar itens de um faturamento avulso da tabela unificada
   */
  async getStandaloneBillingItems(
    supabaseClient: SupabaseClient,
    tenantId: string,
    periodId: string
  ): Promise<StandaloneBillingItem[]> {
    // AIDEV-NOTE: Configurar contexto de tenant
    await supabaseClient.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });

    const { data: items, error } = await supabaseClient
      .from('billing_period_items') // AIDEV-NOTE: Tabela renomeada
      .select(`
        *,
        product:products(id, name, description),
        service:services(id, name, description)
      `)
      .eq('billing_period_id', periodId) // AIDEV-NOTE: Coluna renomeada
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Erro ao buscar itens: ${error.message}`);
    }

    return (items || []) as unknown as StandaloneBillingItem[];
  }

  /**
   * AIDEV-NOTE: Buscar período avulso completo da tabela unificada
   */
  async getStandaloneBillingPeriod(
    supabaseClient: SupabaseClient,
    tenantId: string,
    periodId: string
  ): Promise<StandaloneBillingPeriod | null> {
    // AIDEV-NOTE: Configurar contexto de tenant
    await supabaseClient.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });

    const { data: period, error } = await supabaseClient
      .from('contract_billing_periods') // AIDEV-NOTE: Tabela unificada
      .select(`
        *,
        customer:customers(*),
        items:billing_period_items(
          *,
          product:products(id, name, description),
          service:services(id, name, description)
        )
      `)
      .eq('id', periodId)
      .eq('tenant_id', tenantId)
      .eq('is_standalone', true) // AIDEV-NOTE: Filtrar apenas standalone
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      throw new Error(`Erro ao buscar período: ${error.message}`);
    }

    return period as unknown as StandaloneBillingPeriod;
  }
}

// AIDEV-NOTE: Instância singleton do serviço
export const standaloneBillingService = new StandaloneBillingService();


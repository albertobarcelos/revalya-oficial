import { supabase } from '@/lib/supabase';
import { gatewayService } from './gatewayService';
import { webhookService } from './webhookService';
import type { Database } from '@/types/database';
import { addDays, format, isAfter, isBefore } from 'date-fns';

type ContractBilling = Database['public']['Tables']['contract_billings']['Row'];
// AIDEV-NOTE: Tipo removido - usar tenant_integrations
// type PaymentGateway = Database['public']['Tables']['payment_gateways']['Row'];

// AIDEV-NOTE: Interface para compatibilidade com código existente
interface PaymentGateway {
  id: string;
  provider: string;
  api_key: string;
  api_url: string;
  api_secret?: string;
  is_active: boolean;
  environment?: string;
  created_at?: string;
  updated_at?: string;
}
type PaymentReconciliation = Database['public']['Tables']['payment_reconciliations']['Row'];

export interface ChargeIntegrationResult {
  success: boolean;
  external_id?: string;
  payment_url?: string;
  barcode?: string;
  error?: string;
  gateway_response?: any;
}

export interface SyncStatusResult {
  success: boolean;
  updated_count: number;
  errors: Array<{
    billing_id: string;
    error: string;
  }>;
}

export interface CancellationResult {
  success: boolean;
  cancelled_count: number;
  errors: Array<{
    external_id: string;
    error: string;
  }>;
}

export interface ChargeStatusUpdate {
  billing_id: string;
  external_status: string;
  payment_date?: Date;
  payment_method?: string;
  transaction_id?: string;
  amount_paid?: number;
}

/**
 * Serviço para integração e gerenciamento de cobranças externas
 * Responsável por criar, sincronizar e cancelar cobranças nos gateways de pagamento
 */
class ChargeIntegrationService {
  /**
   * Cria uma cobrança externa no gateway de pagamento
   */
  async createExternalCharge(
    billing_id: string,
    gateway_code: string,
    force_recreate: boolean = false
  ): Promise<ChargeIntegrationResult> {
    try {
      // Buscar dados do faturamento com informações do contrato e cliente
      const { data: billing, error: billingError } = await supabase
        .from('contract_billings')
        .select(`
          *,
          contract:contracts!inner(
            id,
            customer:customers!inner(
              id,
              name,
              email,
              phone,
              document,
              customer_asaas_id
            )
          )
        `)
        .eq('id', billing_id)
        .single();

      if (billingError || !billing) {
        return {
          success: false,
          error: `Faturamento não encontrado: ${billingError?.message}`
        };
      }

      // Verificar se já existe cobrança externa (a menos que force_recreate seja true)
      if (billing.external_id && !force_recreate) {
        return {
          success: false,
          error: 'Cobrança externa já existe. Use force_recreate=true para recriar.'
        };
      }

      // AIDEV-NOTE: Buscar configuração do gateway de tenant_integrations
      const { data: gateway, error: gatewayError } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', billing.tenant_id)
        .eq('integration_type', gateway_code.toLowerCase())
        .eq('is_active', true)
        .single();

      if (gatewayError || !gateway) {
        return {
          success: false,
          error: `Gateway ${gateway_code} não encontrado ou inativo`
        };
      }

      // Preparar dados da cobrança
      const chargeRequest = {
        customer: {
          id: billing.contract.customer.customer_asaas_id || billing.contract.customer.id,
          name: billing.contract.customer.name,
          email: billing.contract.customer.email,
          phone: billing.contract.customer.phone,
          document: billing.contract.customer.document
        },
        amount: billing.net_amount,
        due_date: billing.due_date,
        description: `Faturamento ${billing.billing_number} - ${billing.reference_period}`,
        payment_method: 'BOLETO', // Padrão, pode ser configurável
        reference: billing.billing_number,
        metadata: {
          contract_id: billing.contract_id,
          billing_id: billing.id,
          tenant_id: billing.tenant_id,
          reference_period: billing.reference_period
        }
      };

      // Criar cobrança no gateway
      const gatewayResponse = await gatewayService.createCharge(
        gateway.code.toLowerCase(),
        chargeRequest
      );

      if (!gatewayResponse.success) {
        return {
          success: false,
          error: gatewayResponse.error || 'Erro ao criar cobrança no gateway',
          gateway_response: gatewayResponse
        };
      }

      // Atualizar faturamento com dados da cobrança externa
      const { error: updateError } = await supabase
        .from('contract_billings')
        .update({
          payment_gateway_id: gateway.id,
          external_id: gatewayResponse.external_id,
          payment_link: gatewayResponse.payment_url,
          synchronization_status: 'SYNCED',
          last_sync_attempt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', billing_id);

      if (updateError) {
        return {
          success: false,
          error: `Erro ao atualizar faturamento: ${updateError.message}`
        };
      }

      return {
        success: true,
        external_id: gatewayResponse.external_id,
        payment_url: gatewayResponse.payment_url,
        barcode: gatewayResponse.barcode,
        gateway_response: gatewayResponse
      };

    } catch (error) {
      console.error('[ChargeIntegration] Erro ao criar cobrança externa:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Sincroniza status de cobranças pendentes com os gateways
   */
  async syncChargeStatuses(tenant_id: string, limit: number = 50): Promise<SyncStatusResult> {
    const result: SyncStatusResult = {
      success: true,
      updated_count: 0,
      errors: []
    };

    try {
      // AIDEV-NOTE: Buscar cobranças pendentes com external_id
      const { data: billings, error: billingsError } = await supabase
        .from('contract_billings')
        .select(`
          id,
          external_id,
          status,
          payment_gateway_id
        `)
        .eq('tenant_id', tenant_id)
        .in('status', ['PENDING', 'PARTIALLY_PAID'])
        .not('external_id', 'is', null)
        .limit(limit);

      if (billingsError) {
        result.success = false;
        result.errors.push({
          billing_id: 'query',
          error: billingsError.message
        });
        return result;
      }

      if (!billings || billings.length === 0) {
        return result;
      }

      // Processar cada cobrança
      for (const billing of billings) {
        try {
          // AIDEV-NOTE: Buscar gateway de tenant_integrations
          if (!billing.payment_gateway_id) {
            continue;
          }
          
          const { data: gateway } = await supabase
            .from('tenant_integrations')
            .select('integration_type')
            .eq('id', billing.payment_gateway_id)
            .eq('tenant_id', tenant_id)
            .single();
          
          if (!gateway) {
            continue;
          }
          
          const gatewayCode = gateway.integration_type.toLowerCase();
          const statusResponse = await gatewayService.getChargeStatus(
            gatewayCode,
            billing.external_id!
          );

          if (statusResponse.success && statusResponse.status) {
            await this.updateBillingFromGatewayStatus({
              billing_id: billing.id,
              external_status: statusResponse.status,
              payment_date: statusResponse.payment_date,
              payment_method: statusResponse.payment_method,
              transaction_id: statusResponse.transaction_id,
              amount_paid: statusResponse.amount_paid
            });

            result.updated_count++;
          }
        } catch (error) {
          result.errors.push({
            billing_id: billing.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      // Atualizar timestamp de sincronização
      await supabase
        .from('contract_billings')
        .update({ last_sync_attempt: new Date().toISOString() })
        .eq('tenant_id', tenant_id)
        .in('id', billings.map(b => b.id));

    } catch (error) {
      console.error('[ChargeIntegration] Erro na sincronização:', error);
      result.success = false;
      result.errors.push({
        billing_id: 'sync',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }

    return result;
  }

  /**
   * Atualiza status do faturamento baseado na resposta do gateway
   */
  private async updateBillingFromGatewayStatus(update: ChargeStatusUpdate): Promise<void> {
    const { billing_id, external_status, payment_date, payment_method, transaction_id, amount_paid } = update;

    // Mapear status do gateway para status interno
    let internalStatus = 'PENDING';
    switch (external_status?.toUpperCase()) {
      case 'PAID':
      case 'RECEIVED':
      case 'CONFIRMED':
        internalStatus = 'PAID';
        break;
      case 'OVERDUE':
      case 'EXPIRED':
        internalStatus = 'OVERDUE';
        break;
      case 'CANCELLED':
      case 'REFUNDED':
        internalStatus = 'CANCELED';
        break;
      default:
        internalStatus = 'PENDING';
    }

    // Atualizar faturamento
    const updateData: any = {
      synchronization_status: 'SYNCED',
      last_sync_attempt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (internalStatus !== 'PENDING') {
      updateData.status = internalStatus;
    }

    if (payment_date && internalStatus === 'PAID') {
      updateData.payment_date = payment_date.toISOString();
      updateData.payment_method = payment_method || 'EXTERNAL';
    }

    await supabase
      .from('contract_billings')
      .update(updateData)
      .eq('id', billing_id);

    // Se foi pago, registrar o pagamento
    if (internalStatus === 'PAID' && amount_paid && payment_date) {
      await supabase
        .from('contract_billing_payments')
        .insert({
          billing_id,
          payment_date: payment_date.toISOString(),
          amount: amount_paid,
          payment_method: payment_method || 'EXTERNAL',
          transaction_id,
          external_id: transaction_id,
          notes: 'Pagamento sincronizado automaticamente do gateway'
        });
    }
  }

  /**
   * Cancela cobranças que precisam ser canceladas nos gateways
   */
  async processPendingCancellations(tenant_id: string): Promise<CancellationResult> {
    const result: CancellationResult = {
      success: true,
      cancelled_count: 0,
      errors: []
    };

    try {
      // AIDEV-NOTE: Buscar reconciliações que precisam de cancelamento
      const { data: reconciliations, error: reconciliationsError } = await supabase
        .from('payment_reconciliations')
        .select(`
          id,
          external_id,
          cancellation_status,
          billing_id,
          contract_billings!inner(
            payment_gateway_id
          )
        `)
        .eq('tenant_id', tenant_id)
        .eq('needs_cancellation', true)
        .in('cancellation_status', ['PENDING', 'FAILED'])
        .not('external_id', 'is', null);

      if (reconciliationsError) {
        result.success = false;
        result.errors.push({
          external_id: 'query',
          error: reconciliationsError.message
        });
        return result;
      }

      if (!reconciliations || reconciliations.length === 0) {
        return result;
      }

      // Processar cada cancelamento
      for (const reconciliation of reconciliations) {
        try {
          // Atualizar status para PROCESSING
          await supabase
            .from('payment_reconciliations')
            .update({ cancellation_status: 'PROCESSING' })
            .eq('id', reconciliation.id);

          // AIDEV-NOTE: Buscar gateway de tenant_integrations
          if (!reconciliation.contract_billings.payment_gateway_id) {
            continue;
          }
          
          const { data: gateway } = await supabase
            .from('tenant_integrations')
            .select('integration_type')
            .eq('id', reconciliation.contract_billings.payment_gateway_id)
            .eq('tenant_id', tenant_id)
            .single();
          
          if (!gateway) {
            continue;
          }
          
          const gatewayCode = gateway.integration_type.toLowerCase();
          
          // Tentar cancelar no gateway
          const cancelResponse = await gatewayService.cancelCharge(
            gatewayCode,
            reconciliation.external_id!
          );

          if (cancelResponse.success) {
            // Cancelamento bem-sucedido
            await supabase
              .from('payment_reconciliations')
              .update({
                cancellation_status: 'COMPLETED',
                needs_cancellation: false,
                processed_at: new Date().toISOString()
              })
              .eq('id', reconciliation.id);

            result.cancelled_count++;
          } else {
            // Falha no cancelamento
            await supabase
              .from('payment_reconciliations')
              .update({ cancellation_status: 'FAILED' })
              .eq('id', reconciliation.id);

            result.errors.push({
              external_id: reconciliation.external_id!,
              error: cancelResponse.error || 'Erro desconhecido no cancelamento'
            });
          }
        } catch (error) {
          // Erro no processamento
          await supabase
            .from('payment_reconciliations')
            .update({ cancellation_status: 'FAILED' })
            .eq('id', reconciliation.id);

          result.errors.push({
            external_id: reconciliation.external_id!,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

    } catch (error) {
      console.error('[ChargeIntegration] Erro no processamento de cancelamentos:', error);
      result.success = false;
      result.errors.push({
        external_id: 'process',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }

    return result;
  }

  /**
   * Processa webhook de pagamento e atualiza status da cobrança
   */
  async processPaymentWebhook(
    provider: string,
    payload: any,
    signature?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await webhookService.processPaymentWebhook(provider, payload, signature);
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('[ChargeIntegration] Erro no processamento de webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Verifica e atualiza cobranças vencidas
   */
  async updateOverdueCharges(tenant_id: string): Promise<{ updated_count: number }> {
    const today = new Date();
    
    const { data, error } = await supabase
      .from('contract_billings')
      .update({ 
        status: 'OVERDUE',
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenant_id)
      .eq('status', 'PENDING')
      .lt('due_date', format(today, 'yyyy-MM-dd'))
      .select('id');

    if (error) {
      console.error('[ChargeIntegration] Erro ao atualizar cobranças vencidas:', error);
      return { updated_count: 0 };
    }

    return { updated_count: data?.length || 0 };
  }

  /**
   * Obtém estatísticas de integração para um tenant
   */
  async getIntegrationStats(tenant_id: string): Promise<{
    total_billings: number;
    with_external_id: number;
    pending_sync: number;
    pending_cancellations: number;
    sync_success_rate: number;
  }> {
    try {
      // Total de faturamentos
      const { count: totalBillings } = await supabase
        .from('contract_billings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id);

      // Com external_id
      const { count: withExternalId } = await supabase
        .from('contract_billings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .not('external_id', 'is', null);

      // Pendentes de sincronização
      const { count: pendingSync } = await supabase
        .from('contract_billings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .eq('synchronization_status', 'PENDING')
        .not('external_id', 'is', null);

      // Cancelamentos pendentes
      const { count: pendingCancellations } = await supabase
        .from('payment_reconciliations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .eq('needs_cancellation', true)
        .in('cancellation_status', ['PENDING', 'FAILED']);

      const syncSuccessRate = withExternalId && withExternalId > 0 
        ? ((withExternalId - (pendingSync || 0)) / withExternalId) * 100 
        : 100;

      return {
        total_billings: totalBillings || 0,
        with_external_id: withExternalId || 0,
        pending_sync: pendingSync || 0,
        pending_cancellations: pendingCancellations || 0,
        sync_success_rate: Math.round(syncSuccessRate * 100) / 100
      };
    } catch (error) {
      console.error('[ChargeIntegration] Erro ao obter estatísticas:', error);
      return {
        total_billings: 0,
        with_external_id: 0,
        pending_sync: 0,
        pending_cancellations: 0,
        sync_success_rate: 0
      };
    }
  }
}

export const chargeIntegrationService = new ChargeIntegrationService();
export default chargeIntegrationService;

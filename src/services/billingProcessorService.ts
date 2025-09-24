import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import type { Database } from '@/types/database';
import { billingForecastService } from './billingForecastService';
import { gatewayService } from './gatewayService';
import { financeEntriesService } from './financeEntriesService';

type ContractBilling = Database['public']['Tables']['contract_billings']['Row'];
type Charge = Database['public']['Tables']['charges']['Row'];
type FinanceEntry = Database['public']['Tables']['finance_entries']['Row'];

export interface ProcessBillingResult {
  success: boolean;
  billing_id: string;
  charge_id?: string;
  finance_entry_id?: string;
  external_id?: string;
  error?: string;
}

export interface DailyProcessingReport {
  date: string;
  total_billings: number;
  processed_successfully: number;
  failed_processing: number;
  total_amount: number;
  results: ProcessBillingResult[];
  errors: string[];
}

class BillingProcessorService {
  /**
   * Processa todas as faturas programadas para hoje
   */
  async processDailyBillings(tenant_id: string, target_date?: Date): Promise<DailyProcessingReport> {
    const processDate = target_date || new Date();
    const dateStr = format(processDate, 'yyyy-MM-dd');
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[BillingProcessor] Processando faturas para', dateStr);
    }

    // Buscar faturas programadas para hoje
    const billingsToProcess = await billingForecastService.getBillingsToProcess(
      tenant_id, 
      processDate
    );

    const report: DailyProcessingReport = {
      date: dateStr,
      total_billings: billingsToProcess.length,
      processed_successfully: 0,
      failed_processing: 0,
      total_amount: 0,
      results: [],
      errors: []
    };

    if (billingsToProcess.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[BillingProcessor] Nenhuma fatura para processar hoje');
      }
      return report;
    }

    // Processar cada fatura
    for (const billing of billingsToProcess) {
      try {
        const result = await this.processSingleBilling(billing);
        report.results.push(result);
        
        if (result.success) {
          report.processed_successfully++;
          report.total_amount += billing.net_amount;
        } else {
          report.failed_processing++;
          if (result.error) {
            report.errors.push(`Fatura ${billing.billing_number}: ${result.error}`);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        report.failed_processing++;
        report.errors.push(`Fatura ${billing.billing_number}: ${errorMsg}`);
        
        report.results.push({
          success: false,
          billing_id: billing.id,
          error: errorMsg
        });
      }
    }

    // Log do relatório
    if (process.env.NODE_ENV === 'development') {
      console.debug('[BillingProcessor] Relatório:', {
        processadas: report.processed_successfully,
        falharam: report.failed_processing,
        valor_total: report.total_amount
      });
    }

    return report;
  }

  /**
   * Processa uma única fatura
   */
  async processSingleBilling(billing: ContractBilling): Promise<ProcessBillingResult> {
    const result: ProcessBillingResult = {
      success: false,
      billing_id: billing.id
    };

    try {
      // 1. Buscar dados do contrato e cliente
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select(`
          *,
          customer:customers(*),
          contract_services(*)
        `)
        .eq('id', billing.contract_id)
        .single();

      if (contractError || !contractData) {
        throw new Error(`Contrato não encontrado: ${contractError?.message}`);
      }

      // 2. Buscar gateway de pagamento
      const { data: gateway, error: gatewayError } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('id', billing.payment_gateway_id)
        .single();

      if (gatewayError || !gateway) {
        throw new Error(`Gateway não encontrado: ${gatewayError?.message}`);
      }

      // 3. Criar cobrança no gateway externo
      const chargeData = await this.createExternalCharge(billing, contractData, gateway);
      
      // 4. Salvar cobrança local
      const charge = await this.createLocalCharge(billing, contractData, chargeData);
      result.charge_id = charge.id;
      result.external_id = chargeData.external_id;

      // 5. Criar lançamento financeiro
      const financeEntry = await this.createFinanceEntry(billing, charge);
      result.finance_entry_id = financeEntry.id;

      // 6. Atualizar status da previsão
      await billingForecastService.markBillingAsProcessed(billing.id);

      // 7. Criar itens de faturamento
      await this.createBillingItems(billing.id, contractData.contract_services);

      result.success = true;
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[BillingProcessor] Fatura processada:', billing.billing_number);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      result.error = errorMsg;
      
      if (process.env.NODE_ENV === 'development') {
        console.error('[BillingProcessor] Erro ao processar fatura:', errorMsg);
      }
    }

    return result;
  }

  /**
   * Cria cobrança no gateway externo
   */
  private async createExternalCharge(
    billing: ContractBilling,
    contractData: any,
    gateway: any
  ): Promise<{ external_id: string; payment_url?: string; barcode?: string }> {
    // AIDEV-NOTE: Validação de credenciais já é feita no gatewayService.createCharge
    // Não precisamos duplicar a validação aqui
    
    const chargeRequest = {
      customer: {
        name: contractData.customer.name,
        email: contractData.customer.email,
        document: contractData.customer.document,
        external_id: contractData.customer.customer_asaas_id
      },
      amount: billing.net_amount,
      due_date: billing.due_date,
      description: `Fatura ${billing.billing_number}`,
      payment_method: this.mapPaymentMethodToChargeType(billing.payment_method)
    };

    // Usar o gatewayService para criar a cobrança
    const chargeResponse = await gatewayService.createCharge(
      gateway.provider,
      chargeRequest
    );

    return {
      external_id: chargeResponse.external_id,
      payment_url: chargeResponse.payment_url,
      barcode: chargeResponse.barcode
    };
  }

  /**
   * Cria cobrança local
   */
  private async createLocalCharge(
    billing: ContractBilling,
    contract: any,
    externalData: { external_id: string; payment_url?: string; barcode?: string }
  ): Promise<Charge> {
    const chargeData = {
      tenant_id: billing.tenant_id,
      customer_id: contract.customer_id,
      valor: billing.net_amount,
      status: 'PENDING' as const,
      tipo: this.mapPaymentMethodToChargeType(billing.payment_method),
      data_vencimento: billing.due_date,
      descricao: `${contract.customer.name} - ${billing.reference_period}`,
      link_pagamento: externalData.payment_url,
      asaas_id: externalData.external_id,
      codigo_barras: externalData.barcode,
      metadata: {
        contract_id: contract.id,
        billing_id: billing.id,
        reference_period: billing.reference_period
      }
    };

    const { data, error } = await supabase
      .from('charges')
      .insert(chargeData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar cobrança local: ${error.message}`);
    }

    return data;
  }

  /**
   * Cria lançamento financeiro
   */
  private async createFinanceEntry(
    billing: ContractBilling,
    charge: Charge
  ): Promise<FinanceEntry> {
    const entryData = {
      tenant_id: billing.tenant_id,
      type: 'RECEIVABLE' as const,
      category: 'REVENUE',
      description: `Faturamento - ${billing.reference_period}`,
      contract_id: billing.contract_id,
      charge_id: charge.id,
      customer_id: charge.customer_id,
      gross_amount: billing.gross_amount,
      discount_amount: billing.discount_amount,
      tax_amount: billing.tax_amount,
      net_amount: billing.net_amount,
      currency: billing.currency,
      issue_date: billing.issue_date,
      due_date: billing.due_date,
      status: 'PENDING',
      payment_method: billing.payment_method,
      metadata: {
        billing_id: billing.id,
        reference_period: billing.reference_period,
        billing_number: billing.billing_number
      }
    };

    return await financeEntriesService.createEntry(entryData);
  }

  /**
   * Cria itens de faturamento
   */
  private async createBillingItems(
    billing_id: string,
    contractServices: any[]
  ): Promise<void> {
    const items = contractServices
      .filter(service => service.is_active)
      .map(service => ({
        billing_id,
        service_id: service.service_id,
        description: service.description || '',
        quantity: service.quantity,
        unit_price: service.unit_price,
        discount_amount: service.discount_amount || 0,
        total_amount: service.total_amount,
        tax_rate: service.tax_rate || 0,
        tax_amount: service.tax_amount || 0
      }));

    if (items.length > 0) {
      const { error } = await supabase
        .from('contract_billing_items')
        .insert(items);

      if (error) {
        throw new Error(`Erro ao criar itens de faturamento: ${error.message}`);
      }
    }
  }

  /**
   * Mapeia método de pagamento para tipo de cobrança
   */
  private mapPaymentMethodToChargeType(paymentMethod: string): 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'CASH' {
    const methodMap: Record<string, 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'CASH'> = {
      'BOLETO': 'BOLETO',
      'PIX': 'PIX',
      'CREDIT_CARD': 'CREDIT_CARD',
      'CARTAO': 'CREDIT_CARD',
      'DINHEIRO': 'CASH',
      'CASH': 'CASH'
    };

    return methodMap[paymentMethod?.toUpperCase()] || 'PIX';
  }

  /**
   * Reprocessa uma fatura que falhou
   */
  async retryBilling(billing_id: string): Promise<ProcessBillingResult> {
    const { data: billing, error } = await supabase
      .from('contract_billings')
      .select('*')
      .eq('id', billing_id)
      .single();

    if (error || !billing) {
      throw new Error(`Fatura não encontrada: ${error?.message}`);
    }

    // Resetar status para permitir reprocessamento
    await supabase
      .from('contract_billings')
      .update({ status: 'SCHEDULED' })
      .eq('id', billing_id);

    return await this.processSingleBilling(billing);
  }

  /**
   * Cancela uma fatura programada
   */
  async cancelBilling(billing_id: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('contract_billings')
      .update({ 
        status: 'CANCELLED',
        notes: reason ? `Cancelado: ${reason}` : 'Cancelado',
        updated_at: new Date().toISOString()
      })
      .eq('id', billing_id);

    if (error) {
      throw new Error(`Erro ao cancelar fatura: ${error.message}`);
    }
  }

  /**
   * Agenda processamento para uma data específica
   */
  async scheduleBillingProcessing(
    tenant_id: string,
    target_date: Date
  ): Promise<{ scheduled_count: number }> {
    // Esta função pode ser usada para agendar processamentos futuros
    // Por exemplo, em um sistema de filas ou cron jobs
    
    const billingsToSchedule = await billingForecastService.getBillingsToProcess(
      tenant_id,
      target_date
    );

    // Aqui você poderia integrar com um sistema de filas como Bull/BullMQ
    // ou simplesmente marcar as faturas como agendadas
    
    return {
      scheduled_count: billingsToSchedule.length
    };
  }
}

export const billingProcessorService = new BillingProcessorService();
export default billingProcessorService;

import { supabase } from '@/lib/supabase';
import { addMonths, addDays, format, startOfMonth, endOfMonth } from 'date-fns';
import type { Database } from '@/types/database';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractService = Database['public']['Tables']['contract_services']['Row'];
type ContractBilling = Database['public']['Tables']['contract_billings']['Row'];

export interface BillingForecast {
  id: string;
  contract_id: string;
  contract_number: string;
  customer_name: string;
  service_description: string;
  reference_period: string;
  due_date: string;
  gross_amount: number;
  net_amount: number;
  status: 'SCHEDULED' | 'GENERATED' | 'PAID';
  payment_method: string;
  gateway_name: string;
  billing_type: string;
}

export interface BillingForecastParams {
  tenant_id: string;
  start_date: Date;
  end_date: Date;
  contract_id?: string;
  status?: string;
}

class BillingForecastService {
  /**
   * Gera previsões de faturamento para contratos ativos
   */
  async generateBillingForecasts(tenant_id: string, months_ahead: number = 12): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[BillingForecast] Gerando previsões para', months_ahead, 'meses');
    }

    // Buscar contratos ativos com faturamento automático habilitado
    // AIDEV-NOTE: Filtrando apenas contratos com generate_billing = true para previsões
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        *,
        customer:customers(*),
        contract_services(*)
      `)
      .eq('tenant_id', tenant_id)
      .eq('status', 'ACTIVE')
      .eq('generate_billing', true);

    if (contractsError) {
      throw new Error(`Erro ao buscar contratos: ${contractsError.message}`);
    }

    if (!contracts || contracts.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[BillingForecast] Nenhum contrato ativo encontrado');
      }
      return;
    }

    const forecasts: Omit<ContractBilling, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const contract of contracts) {
      const contractForecasts = await this.generateContractForecasts(
        contract as any,
        months_ahead
      );
      forecasts.push(...contractForecasts);
    }

    // Inserir previsões no banco
    if (forecasts.length > 0) {
      const { error: insertError } = await supabase
        .from('contract_billings')
        .insert(forecasts);

      if (insertError) {
        throw new Error(`Erro ao inserir previsões: ${insertError.message}`);
      }

      if (process.env.NODE_ENV === 'development') {
        console.debug('[BillingForecast] Inseridas', forecasts.length, 'previsões');
      }
    }
  }

  /**
   * Gera previsões para um contrato específico
   */
  private async generateContractForecasts(
    contract: Contract & { 
      customer: any;
      contract_services: ContractService[];
    },
    months_ahead: number
  ): Promise<Omit<ContractBilling, 'id' | 'created_at' | 'updated_at'>[]> {
    const forecasts: Omit<ContractBilling, 'id' | 'created_at' | 'updated_at'>[] = [];
    
    // Verificar se já existem previsões para este contrato
    const { data: existingBillings } = await supabase
      .from('contract_billings')
      .select('reference_period')
      .eq('contract_id', contract.id)
      .gte('due_date', format(new Date(), 'yyyy-MM-dd'));

    const existingPeriods = new Set(
      existingBillings?.map(b => b.reference_period) || []
    );

    const currentDate = new Date();
    const billingDay = contract.billing_day || 1;

    for (let i = 0; i < months_ahead; i++) {
      const targetMonth = addMonths(currentDate, i);
      const referencePeriod = format(targetMonth, 'MM/yyyy');
      
      // Pular se já existe previsão para este período
      if (existingPeriods.has(referencePeriod)) {
        continue;
      }

      // Calcular data de vencimento
      let dueDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), billingDay);
      
      // Se o dia já passou no mês atual, usar o próximo mês
      if (i === 0 && dueDate <= currentDate) {
        dueDate = addMonths(dueDate, 1);
      }

      // Calcular valores do faturamento
      const billingItems = this.calculateBillingItems(contract.contract_services);
      const grossAmount = billingItems.reduce((sum, item) => sum + item.total_amount, 0);
      const taxAmount = billingItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const netAmount = grossAmount;

      // Determinar gateway padrão (primeiro ativo)
      const { data: defaultGateway } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('tenant_id', contract.tenant_id)
        .eq('is_active', true)
        .limit(1)
        .single();

      const forecast: Omit<ContractBilling, 'id' | 'created_at' | 'updated_at'> = {
        contract_id: contract.id,
        tenant_id: contract.tenant_id,
        billing_number: '', // Será gerado automaticamente
        reference_period: referencePeriod,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        issue_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'SCHEDULED',
        billing_type: contract.billing_type,
        payment_method: this.getDefaultPaymentMethod(contract.contract_services),
        payment_gateway_id: defaultGateway?.id || null,
        gross_amount: grossAmount,
        discount_amount: 0,
        tax_amount: taxAmount,
        net_amount: netAmount,
        currency: 'BRL',
        notes: `Faturamento automático - ${referencePeriod}`,
        metadata: {
          generated_automatically: true,
          contract_number: contract.number,
          customer_name: contract.customer?.name
        }
      };

      forecasts.push(forecast);
    }

    return forecasts;
  }

  /**
   * Calcula itens de faturamento baseado nos serviços do contrato
   */
  private calculateBillingItems(services: ContractService[]) {
    return services
      .filter(service => service.is_active)
      .map(service => ({
        service_id: service.service_id,
        description: service.description || '',
        quantity: service.quantity,
        unit_price: service.unit_price,
        discount_amount: service.discount_amount,
        total_amount: service.total_amount,
        tax_rate: service.tax_rate,
        tax_amount: service.tax_amount
      }));
  }

  /**
   * Determina método de pagamento padrão baseado nos serviços
   */
  private getDefaultPaymentMethod(services: ContractService[]): string {
    const methods = services
      .filter(s => s.is_active && s.payment_method)
      .map(s => s.payment_method);
    
    // Retorna o método mais comum ou PIX como padrão
    return methods[0] || 'PIX';
  }

  /**
   * Busca previsões de faturamento com filtros
   */
  async getBillingForecasts(params: BillingForecastParams): Promise<BillingForecast[]> {
    let query = supabase
      .from('contract_billings')
      .select(`
        *,
        contract:contracts(
          number,
          customer:customers(name)
        ),
        payment_gateway:payment_gateways(name)
      `)
      .eq('tenant_id', params.tenant_id)
      .gte('due_date', format(params.start_date, 'yyyy-MM-dd'))
      .lte('due_date', format(params.end_date, 'yyyy-MM-dd'))
      .order('due_date', { ascending: true });

    if (params.contract_id) {
      query = query.eq('contract_id', params.contract_id);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar previsões: ${error.message}`);
    }

    return (data || []).map(billing => ({
      id: billing.id,
      contract_id: billing.contract_id,
      contract_number: (billing.contract as any)?.number || '',
      customer_name: (billing.contract as any)?.customer?.name || '',
      service_description: billing.notes || '',
      reference_period: billing.reference_period,
      due_date: billing.due_date,
      gross_amount: billing.gross_amount,
      net_amount: billing.net_amount,
      status: billing.status as any,
      payment_method: billing.payment_method || '',
      gateway_name: (billing.payment_gateway as any)?.name || '',
      billing_type: billing.billing_type
    }));
  }

  /**
   * Identifica faturas que devem ser processadas hoje
   */
  async getBillingsToProcess(tenant_id: string, target_date?: Date): Promise<ContractBilling[]> {
    const processDate = target_date || new Date();
    const dateStr = format(processDate, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('contract_billings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('status', 'SCHEDULED')
      .eq('due_date', dateStr);

    if (error) {
      throw new Error(`Erro ao buscar faturas para processar: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Marca uma previsão como processada
   */
  async markBillingAsProcessed(billing_id: string): Promise<void> {
    const { error } = await supabase
      .from('contract_billings')
      .update({ 
        status: 'GENERATED',
        updated_at: new Date().toISOString()
      })
      .eq('id', billing_id);

    if (error) {
      throw new Error(`Erro ao marcar faturamento como processado: ${error.message}`);
    }
  }

  /**
   * Remove previsões antigas ou canceladas
   */
  async cleanupOldForecasts(tenant_id: string, days_old: number = 90): Promise<void> {
    const cutoffDate = addDays(new Date(), -days_old);
    
    const { error } = await supabase
      .from('contract_billings')
      .delete()
      .eq('tenant_id', tenant_id)
      .eq('status', 'SCHEDULED')
      .lt('due_date', format(cutoffDate, 'yyyy-MM-dd'));

    if (error) {
      throw new Error(`Erro ao limpar previsões antigas: ${error.message}`);
    }
  }
}

export const billingForecastService = new BillingForecastService();
export default billingForecastService;

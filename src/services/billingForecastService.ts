import { supabase } from '@/lib/supabase';
import { addMonths, addDays, format, startOfMonth, endOfMonth } from 'date-fns';
import type { Database } from '@/types/database';
import { 
  isRetroactiveContract, 
  calculateRetroactiveBillingPeriods,
  logRetroactiveLogicApplication,
  canApplyRetroactiveLogic,
  calculateRetroactiveStats,
  type Contract as RetroactiveContract,
  type BillingPeriod
} from '@/utils/retroactiveBillingUtils';
import { RetroactiveBillingAuditService } from './retroactiveBillingAuditService';

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
  private auditService: RetroactiveBillingAuditService

  constructor() {
    this.auditService = new RetroactiveBillingAuditService()
  }
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
        customer:customers(*)
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
      // AIDEV-NOTE: Buscar serviços do contrato usando view otimizada
      const { data: contractServices, error: servicesError } = await supabase
        .from('vw_contract_services_detailed')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('contract_id', contract.id);

      if (servicesError) {
        console.error(`Erro ao buscar serviços do contrato ${contract.id}:`, servicesError);
        continue;
      }

      // Enriquecer contrato com serviços
      const enrichedContract = {
        ...contract,
        contract_services: contractServices || []
      };

      const contractForecasts = await this.generateContractForecasts(
        enrichedContract as any,
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
    // AIDEV-NOTE: Verificar se é contrato retroativo e processar com lógica específica
    if (isRetroactiveContract(contract as RetroactiveContract)) {
      return this.generateRetroactiveContractForecasts(
        contract as RetroactiveContract & { 
          customer: any;
          contract_services: ContractService[];
        },
        months_ahead
      );
    }

    // AIDEV-NOTE: Processamento normal para contratos não retroativos
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
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', contract.tenant_id)
        .eq('is_active', true)
        .in('integration_type', ['asaas', 'cora', 'itau', 'omie']) // AIDEV-NOTE: Gateways de pagamento
        .limit(1)
        .maybeSingle();

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
        payment_gateway:tenant_integrations(
          integration_type,
          config
        )
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
      gateway_name: (billing.payment_gateway as any)?.integration_type?.toUpperCase() || 
                    ((billing.payment_gateway as any)?.config as any)?.name || '',
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
   * Gera previsões específicas para contratos retroativos
   * AIDEV-NOTE: Implementa lógica específica para contratos retroativos conforme documentação
   */
  private async generateRetroactiveContractForecasts(
    contract: RetroactiveContract & { 
      customer: any;
      contract_services: ContractService[];
    },
    months_ahead: number
  ): Promise<Omit<ContractBilling, 'id' | 'created_at' | 'updated_at'>[]> {
    const forecasts: Omit<ContractBilling, 'id' | 'created_at' | 'updated_at'>[] = [];
    const startTime = Date.now();

    // Verificar se pode aplicar lógica retroativa
    if (!canApplyRetroactiveLogic(contract)) {
      await this.auditService.logRetroactiveSkipped(contract.id, 'Lógica retroativa não pode ser aplicada para previsões');
      // Se não pode aplicar lógica retroativa, usar processamento normal
      return this.generateNormalContractForecasts(contract, months_ahead);
    }

    try {
      // Registrar início do processamento de previsões retroativas
      await this.auditService.logRetroactiveStart(contract.id, contract);

      // Calcular períodos retroativos
      const retroactivePeriods = calculateRetroactiveBillingPeriods(contract);
      const calculationTime = Date.now() - startTime;
      
      // Registrar cálculo dos períodos
      await this.auditService.logRetroactiveCalculation(contract.id, retroactivePeriods, calculationTime);
      
      // Verificar previsões existentes
      const { data: existingBillings } = await supabase
        .from('contract_billings')
        .select('reference_period')
        .eq('contract_id', contract.id)
        .gte('due_date', format(new Date(), 'yyyy-MM-dd'));

      const existingPeriods = new Set(
        existingBillings?.map(b => b.reference_period) || []
      );

      // Gerar previsões para períodos retroativos
      for (const period of retroactivePeriods) {
        const referencePeriod = format(period.start_date, 'MM/yyyy');
        
        // Pular se já existe previsão para este período
        if (existingPeriods.has(referencePeriod)) {
          continue;
        }

        // Calcular valores do faturamento
        const billingItems = this.calculateBillingItems(contract.contract_services);
        const grossAmount = billingItems.reduce((sum, item) => sum + item.total_amount, 0);
        const taxAmount = billingItems.reduce((sum, item) => sum + item.tax_amount, 0);
        const netAmount = grossAmount;

        // Determinar gateway padrão
        const { data: defaultGateway } = await supabase
          .from('tenant_integrations')
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
          due_date: format(period.bill_date, 'yyyy-MM-dd'),
          issue_date: format(period.bill_date, 'yyyy-MM-dd'),
          status: 'SCHEDULED',
          billing_type: contract.billing_type,
          payment_method: this.getDefaultPaymentMethod(contract.contract_services),
          payment_gateway_id: defaultGateway?.id || null,
          gross_amount: grossAmount,
          discount_amount: 0,
          tax_amount: taxAmount,
          net_amount: netAmount,
          currency: 'BRL',
          notes: `Faturamento retroativo - ${referencePeriod}`,
          metadata: {
            generated_automatically: true,
            contract_number: contract.number,
            customer_name: contract.customer?.name,
            is_retroactive: true,
            retroactive_period: {
              start_date: format(period.start_date, 'yyyy-MM-dd'),
              end_date: format(period.end_date, 'yyyy-MM-dd'),
              bill_date: format(period.bill_date, 'yyyy-MM-dd')
            }
          }
        };

        forecasts.push(forecast);
        
        // Registrar criação de previsão retroativa
        await this.auditService.logRetroactiveForecastCreation(
          contract.id,
          period,
          { success: true }
        );
      }

      // Gerar previsões futuras normais (após períodos retroativos)
      const futureForecasts = await this.generateFutureForecasts(
        contract,
        months_ahead,
        existingPeriods
      );
      forecasts.push(...futureForecasts);

      // Registrar aplicação da lógica retroativa
      await logRetroactiveLogicApplication(
        contract.id,
        'billing_forecast',
        {
          retroactive_periods_count: retroactivePeriods.length,
          future_periods_count: futureForecasts.length,
          total_forecasts: forecasts.length
        }
      );

      return forecasts;

    } catch (error) {
      console.error('[BillingForecast] Erro ao processar contrato retroativo:', error);
      
      // Registrar falha na criação de previsões
      await this.auditService.logRetroactiveValidationFailure(contract.id, [
        error instanceof Error ? error.message : 'Erro desconhecido na geração de previsões retroativas'
      ]);
      
      // Em caso de erro, usar processamento normal como fallback
      return this.generateNormalContractForecasts(contract, months_ahead);
    }
  }

  /**
   * Gera previsões futuras para contratos retroativos (após períodos retroativos)
   */
  private async generateFutureForecasts(
    contract: RetroactiveContract & { 
      customer: any;
      contract_services: ContractService[];
    },
    months_ahead: number,
    existingPeriods: Set<string>
  ): Promise<Omit<ContractBilling, 'id' | 'created_at' | 'updated_at'>[]> {
    const forecasts: Omit<ContractBilling, 'id' | 'created_at' | 'updated_at'>[] = [];
    const currentDate = new Date();
    const billingDay = contract.billing_day || 1;

    // Começar do próximo mês após a data atual
    for (let i = 1; i <= months_ahead; i++) {
      const targetMonth = addMonths(currentDate, i);
      const referencePeriod = format(targetMonth, 'MM/yyyy');
      
      // Pular se já existe previsão para este período
      if (existingPeriods.has(referencePeriod)) {
        continue;
      }

      // Calcular data de vencimento
      const dueDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), billingDay);

      // Calcular valores do faturamento
      const billingItems = this.calculateBillingItems(contract.contract_services);
      const grossAmount = billingItems.reduce((sum, item) => sum + item.total_amount, 0);
      const taxAmount = billingItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const netAmount = grossAmount;

      // Determinar gateway padrão
      const { data: defaultGateway } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', contract.tenant_id)
        .eq('is_active', true)
        .in('integration_type', ['asaas', 'cora', 'itau', 'omie']) // AIDEV-NOTE: Gateways de pagamento
        .limit(1)
        .maybeSingle();

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
        notes: `Faturamento futuro - ${referencePeriod}`,
        metadata: {
          generated_automatically: true,
          contract_number: contract.number,
          customer_name: contract.customer?.name,
          is_future_billing: true
        }
      };

      forecasts.push(forecast);
    }

    return forecasts;
  }

  /**
   * Processamento normal para contratos não retroativos (extraído da função original)
   */
  private async generateNormalContractForecasts(
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
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', contract.tenant_id)
        .eq('is_active', true)
        .in('integration_type', ['asaas', 'cora', 'itau', 'omie']) // AIDEV-NOTE: Gateways de pagamento
        .limit(1)
        .maybeSingle();

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

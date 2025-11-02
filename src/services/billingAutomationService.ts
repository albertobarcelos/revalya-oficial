import { supabase } from '@/lib/supabase';
import { chargeIntegrationService } from './chargeIntegrationService';
import type { Database } from '@/types/database';
import { 
  addDays, 
  addMonths, 
  addYears, 
  format, 
  isAfter, 
  isBefore, 
  startOfMonth, 
  endOfMonth,
  differenceInDays,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Decimal from 'decimal.js';
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
type PaymentGateway = Database['public']['Tables']['payment_gateways']['Row'];

export interface BillingGenerationResult {
  success: boolean;
  generated_count: number;
  errors: Array<{
    contract_id: string;
    error: string;
  }>;
  billings: Array<{
    id: string;
    contract_id: string;
    billing_number: string;
    net_amount: number;
    due_date: string;
  }>;
}

export interface FinancialCalculation {
  gross_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  interest_amount?: number;
  fine_amount?: number;
  total_amount: number;
}

export interface ContractFinancialRules {
  interest_rate_monthly: number; // Taxa de juros mensal (%)
  fine_rate: number; // Taxa de multa (%)
  grace_period_days: number; // Período de carência em dias
  discount_rate?: number; // Desconto para pagamento antecipado (%)
  discount_days?: number; // Dias para desconto antecipado
  payment_terms: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL';
  due_day: number; // Dia do vencimento (1-31)
  auto_generate: boolean;
  auto_integrate_gateway: boolean;
  preferred_gateway?: string;
}

export interface BillingProcessingOptions {
  tenant_id: string;
  contract_ids?: string[];
  reference_date?: Date;
  auto_integrate?: boolean;
  force_regenerate?: boolean;
  dry_run?: boolean;
}

/**
 * Serviço de automação de faturamento
 * Responsável por gerar cobranças recorrentes, aplicar regras financeiras e gerenciar vencimentos
 */
export class BillingAutomationService {
  private auditService: RetroactiveBillingAuditService

  constructor() {
    this.auditService = new RetroactiveBillingAuditService()
  }
  
  /**
   * AIDEV-NOTE: Processa contratos retroativos aplicando a nova lógica de faturamento
   * Implementa a lógica documentada em NOVA_LOGICA_FATURAMENTO_RETROATIVO.md
   */
  async processRetroactiveContract(contract: Contract, options: BillingProcessingOptions): Promise<BillingGenerationResult> {
    const startTime = Date.now();
    const result: BillingGenerationResult = {
      success: true,
      generated_count: 0,
      errors: [],
      billings: []
    };

    try {
      // Converter para o formato esperado pelas funções retroativas
      const retroactiveContract: RetroactiveContract = {
        id: contract.id,
        tenant_id: contract.tenant_id,
        customer_id: contract.customer_id,
        start_date: contract.start_date,
        end_date: contract.end_date,
        billing_day: contract.billing_day || 10,
        billing_interval: contract.billing_interval || 1,
        billing_interval_type: contract.billing_interval_type || 'MONTHLY',
        status: contract.status,
        created_at: contract.created_at
      };

      // Verificar se é retroativo e pode aplicar a lógica
      if (!isRetroactiveContract(retroactiveContract)) {
        await this.auditService.logRetroactiveSkipped(contract.id, 'Contrato não é retroativo');
        return result; // Não é retroativo, retorna vazio
      }

      if (!canApplyRetroactiveLogic(retroactiveContract)) {
        await this.auditService.logRetroactiveSkipped(contract.id, 'Lógica retroativa não pode ser aplicada');
        result.errors.push({
          contract_id: contract.id,
          error: 'Contrato retroativo detectado, mas não pode aplicar a lógica retroativa'
        });
        return result;
      }

      // Registrar início do processamento
      await this.auditService.logRetroactiveStart(contract.id, retroactiveContract);

      // Calcular períodos retroativos
      const retroactivePeriods = calculateRetroactiveBillingPeriods(retroactiveContract);
      
      // Calcular estatísticas
      const stats = calculateRetroactiveStats(retroactivePeriods, retroactiveContract);
      
      const calculationTime = Date.now() - startTime;

      // Registrar cálculo dos períodos
      await this.auditService.logRetroactiveCalculation(contract.id, retroactivePeriods, calculationTime);
      
      // Log da aplicação da lógica (mantendo log original)
      await logRetroactiveLogicApplication(retroactiveContract, retroactivePeriods, stats);

      // Gerar faturamentos para cada período retroativo
      for (const period of retroactivePeriods) {
        try {
          // Verificar se já existe faturamento para este período
          if (!options.force_regenerate) {
            const { data: existingBilling } = await supabase
              .from('contract_billings')
              .select('id')
              .eq('contract_id', contract.id)
              .eq('reference_period', format(new Date(period.period_start), 'yyyy-MM'))
              .single();

            if (existingBilling) {
              continue; // Já existe faturamento para este período
            }
          }

          // Calcular valores do faturamento para este período
          const calculation = await this.calculateBillingAmounts(
            contract,
            contract.contract_services || [],
            new Date(period.bill_date)
          );

          // Gerar número do faturamento
          const billingNumber = await this.generateBillingNumber(
            options.tenant_id,
            new Date(period.bill_date)
          );

          const billingData = {
            tenant_id: options.tenant_id,
            contract_id: contract.id,
            billing_number: billingNumber,
            installment_number: 1,
            total_installments: 1,
            reference_period: format(new Date(period.period_start), 'yyyy-MM'),
            issue_date: format(new Date(period.bill_date), 'yyyy-MM-dd'),
            due_date: format(new Date(period.bill_date), 'yyyy-MM-dd'),
            gross_amount: calculation.gross_amount,
            discount_amount: calculation.discount_amount,
            tax_amount: calculation.tax_amount,
            net_amount: calculation.net_amount,
            status: 'PENDING' as const,
            synchronization_status: 'PENDING' as const,
            // Marcar como gerado pela lógica retroativa
            notes: `Gerado pela lógica retroativa - Período: ${period.period_start} a ${period.period_end}`
          };

          if (options.dry_run) {
            result.billings.push({
              id: 'dry-run-retroactive-' + contract.id + '-' + period.period_start,
              contract_id: contract.id,
              billing_number: billingNumber,
              net_amount: calculation.net_amount,
              due_date: format(new Date(period.bill_date), 'yyyy-MM-dd')
            });
            result.generated_count++;
            continue;
          }

          // Inserir faturamento
          const { data: billing, error: billingError } = await supabase
            .from('contract_billings')
            .insert(billingData)
            .select('id, billing_number, net_amount, due_date')
            .single();

          if (billingError) {
            result.errors.push({
              contract_id: contract.id,
              error: `Erro ao criar faturamento retroativo: ${billingError.message}`
            });
            continue;
          }

          // Inserir itens do faturamento
          const billingItems = (contract.contract_services || []).map(service => ({
            billing_id: billing.id,
            service_id: service.service_id,
            description: service.services?.name || 'Serviço',
            quantity: service.quantity,
            unit_price: service.unit_price,
            discount_percentage: service.discount_percentage || 0,
            tax_percentage: service.tax_percentage || 0,
            gross_amount: new Decimal(service.quantity).mul(service.unit_price).toNumber(),
            discount_amount: new Decimal(service.quantity)
              .mul(service.unit_price)
              .mul(service.discount_percentage || 0)
              .div(100)
              .toNumber(),
            tax_amount: new Decimal(service.quantity)
              .mul(service.unit_price)
              .mul(1 - (service.discount_percentage || 0) / 100)
              .mul(service.tax_percentage || 0)
              .div(100)
              .toNumber(),
            net_amount: new Decimal(service.quantity)
              .mul(service.unit_price)
              .mul(1 - (service.discount_percentage || 0) / 100)
              .mul(1 + (service.tax_percentage || 0) / 100)
              .toNumber()
          }));

          if (billingItems.length > 0) {
            const { error: itemsError } = await supabase
              .from('contract_billing_items')
              .insert(billingItems);

            if (itemsError) {
              result.errors.push({
                contract_id: contract.id,
                error: `Erro ao criar itens do faturamento retroativo: ${itemsError.message}`
              });
              continue;
            }
          }

          result.billings.push({
            id: billing.id,
            contract_id: contract.id,
            billing_number: billing.billing_number,
            net_amount: billing.net_amount,
            due_date: billing.due_date
          });

          result.generated_count++;

          // Registrar geração de faturamento para o período
          await this.auditService.logRetroactiveBillingGeneration(
            contract.id, 
            period, 
            { success: true }
          );

        } catch (error) {
          const errorMessage = `Erro ao processar período retroativo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
          result.errors.push({
            contract_id: contract.id,
            error: errorMessage
          });
          
          // Registrar falha na geração do faturamento para o período
          await this.auditService.logRetroactiveBillingGeneration(
            contract.id, 
            period, 
            { success: false, error: errorMessage }
          );
        }
      }

    } catch (error) {
      result.success = false;
      const errorMessage = `Erro ao processar contrato retroativo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      result.errors.push({
        contract_id: contract.id,
        error: errorMessage
      });
      
      // Registrar falha no processamento
      await this.auditService.logRetroactiveValidationFailure(contract.id, [errorMessage]);
    }

    return result;
  }
  /**
   * Gera faturamentos automáticos para contratos ativos
   */
  async generateRecurringBillings(options: BillingProcessingOptions): Promise<BillingGenerationResult> {
    const result: BillingGenerationResult = {
      success: true,
      generated_count: 0,
      errors: [],
      billings: []
    };

    try {
      const referenceDate = options.reference_date || new Date();
      const currentMonth = startOfMonth(referenceDate);
      const nextMonth = addMonths(currentMonth, 1);

      // Buscar contratos ativos que precisam de faturamento
      // AIDEV-NOTE: Agora consideramos o campo generate_billing para controlar se o contrato deve gerar cobrança
      let contractsQuery = supabase
        .from('contracts')
        .select(`
          *,
          customer:customers!inner(
            id,
            name,
            email,
            document,
            customer_asaas_id
          )
        `)
        .eq('tenant_id', options.tenant_id)
        .eq('status', 'ACTIVE')
        .eq('auto_billing', true)
        .eq('generate_billing', true);

      if (options.contract_ids && options.contract_ids.length > 0) {
        contractsQuery = contractsQuery.in('id', options.contract_ids);
      }

      const { data: contracts, error: contractsError } = await contractsQuery;

      if (contractsError) {
        result.success = false;
        result.errors.push({
          contract_id: 'query',
          error: contractsError.message
        });
        return result;
      }

      if (!contracts || contracts.length === 0) {
        return result;
      }

      // Processar cada contrato
      for (const contract of contracts) {
        try {
          // AIDEV-NOTE: Buscar serviços do contrato usando a view otimizada
          const { data: contractServices, error: servicesError } = await supabase
            .from('vw_contract_services_detailed')
            .select('*')
            .eq('tenant_id', options.tenant_id)
            .eq('contract_id', contract.id);

          if (servicesError) {
            result.errors.push({
              contract_id: contract.id,
              error: `Erro ao buscar serviços do contrato: ${servicesError.message}`
            });
            continue;
          }

          // Enriquecer o contrato com os serviços
          const enrichedContract = {
            ...contract,
            contract_services: contractServices || []
          };
          // AIDEV-NOTE: Verificar se é contrato retroativo e processar com lógica específica
          if (isRetroactiveContract(enrichedContract as RetroactiveContract)) {
            // Processar contrato retroativo com lógica específica
            const retroactiveResult = await this.processRetroactiveContract(
              enrichedContract as RetroactiveContract,
              options,
              referenceDate
            );
            
            if (retroactiveResult.success) {
              result.generated_billings.push(...retroactiveResult.generated_billings);
            } else {
              result.errors.push(...retroactiveResult.errors);
            }
            
            // Continuar para o próximo contrato (retroativo já foi processado)
            continue;
          }

          // AIDEV-NOTE: Processamento normal para contratos não retroativos
          // Verificar se já existe faturamento para o período
          if (!options.force_regenerate) {
            const { data: existingBilling } = await supabase
              .from('contract_billings')
              .select('id')
              .eq('contract_id', enrichedContract.id)
              .eq('reference_period', format(currentMonth, 'yyyy-MM'))
              .single();

            if (existingBilling) {
              continue; // Já existe faturamento para este período
            }
          }

          // Calcular valores do faturamento
          const calculation = await this.calculateBillingAmounts(
            enrichedContract,
            enrichedContract.contract_services || [],
            referenceDate
          );

          // AIDEV-NOTE: Corrigido - usar billing_type dos serviços do contrato ao invés de payment_terms inexistente
          // Pegar o billing_type do primeiro serviço do contrato (assumindo que todos têm o mesmo)
          const contractBillingType = enrichedContract.contract_services?.[0]?.billing_type;
          const paymentTerms = this.mapBillingTypeToPaymentTerms(contractBillingType);

          // Determinar data de vencimento
          const dueDate = this.calculateDueDate(
            paymentTerms,
            enrichedContract.due_day || 10,
            referenceDate
          );

          // Gerar número do faturamento
          const billingNumber = await this.generateBillingNumber(
            options.tenant_id,
            referenceDate
          );

          const billingData = {
            tenant_id: options.tenant_id,
            contract_id: enrichedContract.id,
            billing_number: billingNumber,
            installment_number: 1, // Para faturamento recorrente
            total_installments: 1,
            reference_period: format(currentMonth, 'yyyy-MM'),
            issue_date: format(referenceDate, 'yyyy-MM-dd'),
            due_date: format(dueDate, 'yyyy-MM-dd'),
            gross_amount: calculation.gross_amount,
            discount_amount: calculation.discount_amount,
            tax_amount: calculation.tax_amount,
            net_amount: calculation.net_amount,
            status: 'PENDING' as const,
            // AIDEV-NOTE: Removido payment_terms pois não existe na estrutura do contrato
            synchronization_status: 'PENDING' as const
          };

          if (options.dry_run) {
            // Modo de teste - não salvar no banco
            result.billings.push({
              id: 'dry-run-' + enrichedContract.id,
              contract_id: enrichedContract.id,
              billing_number: billingNumber,
              net_amount: calculation.net_amount,
              due_date: format(dueDate, 'yyyy-MM-dd')
            });
            result.generated_count++;
            continue;
          }

          // Inserir faturamento
          const { data: billing, error: billingError } = await supabase
            .from('contract_billings')
            .insert(billingData)
            .select('id, billing_number, net_amount, due_date')
            .single();

          if (billingError) {
            result.errors.push({
              contract_id: enrichedContract.id,
              error: `Erro ao criar faturamento: ${billingError.message}`
            });
            continue;
          }

          // Inserir itens do faturamento
          const billingItems = (enrichedContract.contract_services || []).map(service => ({
            billing_id: billing.id,
            service_id: service.service_id,
            description: service.services?.name || 'Serviço',
            quantity: service.quantity,
            unit_price: service.unit_price,
            discount_percentage: service.discount_percentage || 0,
            tax_percentage: service.tax_percentage || 0,
            gross_amount: new Decimal(service.quantity).mul(service.unit_price).toNumber(),
            discount_amount: new Decimal(service.quantity)
              .mul(service.unit_price)
              .mul(service.discount_percentage || 0)
              .div(100)
              .toNumber(),
            tax_amount: new Decimal(service.quantity)
              .mul(service.unit_price)
              .mul(1 - (service.discount_percentage || 0) / 100)
              .mul(service.tax_percentage || 0)
              .div(100)
              .toNumber(),
            net_amount: new Decimal(service.quantity)
              .mul(service.unit_price)
              .mul(1 - (service.discount_percentage || 0) / 100)
              .mul(1 + (service.tax_percentage || 0) / 100)
              .toNumber()
          }));

          if (billingItems.length > 0) {
            const { error: itemsError } = await supabase
              .from('contract_billing_items')
              .insert(billingItems);

            if (itemsError) {
              result.errors.push({
                contract_id: enrichedContract.id,
                error: `Erro ao criar itens do faturamento: ${itemsError.message}`
              });
              continue;
            }
          }

          result.billings.push({
            id: billing.id,
            contract_id: enrichedContract.id,
            billing_number: billing.billing_number,
            net_amount: billing.net_amount,
            due_date: billing.due_date
          });

          result.generated_count++;

          // Integrar automaticamente com gateway se configurado
          if (options.auto_integrate && enrichedContract.auto_integrate_gateway) {
            try {
              const gatewayCode = enrichedContract.preferred_gateway || 'ASAAS';
              await chargeIntegrationService.createExternalCharge(
                billing.id,
                gatewayCode
              );
            } catch (integrationError) {
              console.warn(`Erro na integração automática para contrato ${enrichedContract.id}:`, integrationError);
              // Não falhar o processo por erro de integração
            }
          }

        } catch (error) {
          result.errors.push({
            contract_id: enrichedContract.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

    } catch (error) {
      console.error('[BillingAutomation] Erro na geração de faturamentos:', error);
      result.success = false;
      result.errors.push({
        contract_id: 'process',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }

    return result;
  }

  /**
   * Calcula valores do faturamento aplicando regras financeiras
   */
  private async calculateBillingAmounts(
    contract: any,
    services: any[],
    referenceDate: Date
  ): Promise<FinancialCalculation> {
    let grossAmount = new Decimal(0);
    let discountAmount = new Decimal(0);
    let taxAmount = new Decimal(0);

    // Calcular valores dos serviços
    for (const service of services) {
      const serviceGross = new Decimal(service.quantity).mul(service.unit_price);
      const serviceDiscount = serviceGross.mul(service.discount_percentage || 0).div(100);
      const serviceNet = serviceGross.minus(serviceDiscount);
      const serviceTax = serviceNet.mul(service.tax_percentage || 0).div(100);

      grossAmount = grossAmount.plus(serviceGross);
      discountAmount = discountAmount.plus(serviceDiscount);
      taxAmount = taxAmount.plus(serviceTax);
    }

    // Aplicar desconto do contrato
    if (contract.discount_percentage) {
      const contractDiscount = grossAmount.mul(contract.discount_percentage).div(100);
      discountAmount = discountAmount.plus(contractDiscount);
    }

    const netAmount = grossAmount.minus(discountAmount).plus(taxAmount);

    return {
      gross_amount: grossAmount.toNumber(),
      discount_amount: discountAmount.toNumber(),
      tax_amount: taxAmount.toNumber(),
      net_amount: netAmount.toNumber(),
      total_amount: netAmount.toNumber()
    };
  }

  /**
   * Calcula data de vencimento baseada nas condições de pagamento
   */
  private calculateDueDate(
    paymentTerms: string,
    dueDay: number,
    referenceDate: Date
  ): Date {
    let dueDate: Date;

    switch (paymentTerms) {
      case 'MONTHLY':
        dueDate = addMonths(referenceDate, 1);
        break;
      case 'QUARTERLY':
        dueDate = addMonths(referenceDate, 3);
        break;
      case 'SEMIANNUAL':
        dueDate = addMonths(referenceDate, 6);
        break;
      case 'ANNUAL':
        dueDate = addYears(referenceDate, 1);
        break;
      default:
        dueDate = addMonths(referenceDate, 1);
    }

    // Ajustar para o dia específico do mês
    const year = dueDate.getFullYear();
    const month = dueDate.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const adjustedDay = Math.min(dueDay, lastDayOfMonth);

    return new Date(year, month, adjustedDay);
  }

  /**
   * Gera número sequencial do faturamento
   */
  private async generateBillingNumber(
    tenantId: string,
    referenceDate: Date
  ): Promise<string> {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;
    const prefix = `${year}${month.toString().padStart(2, '0')}`;

    // Buscar último número do mês
    const { data: lastBilling } = await supabase
      .from('contract_billings')
      .select('billing_number')
      .eq('tenant_id', tenantId)
      .like('billing_number', `${prefix}%`)
      .order('billing_number', { ascending: false })
      .limit(1)
      .single();

    let sequence = 1;
    if (lastBilling?.billing_number) {
      const lastSequence = parseInt(lastBilling.billing_number.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Aplica juros e multa para cobranças vencidas
   */
  async applyInterestAndFines(
    tenantId: string,
    gracePeriodDays: number = 5
  ): Promise<{
    updated_count: number;
    total_interest: number;
    total_fines: number;
  }> {
    const today = new Date();
    const cutoffDate = addDays(today, -gracePeriodDays);

    try {
      // Buscar cobranças vencidas sem juros aplicados
      const { data: overdueBillings, error } = await supabase
        .from('contract_billings')
        .select(`
          id,
          net_amount,
          due_date,
          interest_amount,
          fine_amount,
          contracts!inner(
            interest_rate_monthly,
            fine_rate
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'OVERDUE')
        .lt('due_date', format(cutoffDate, 'yyyy-MM-dd'))
        .is('interest_applied_date', null);

      if (error || !overdueBillings) {
        return { updated_count: 0, total_interest: 0, total_fines: 0 };
      }

      let updatedCount = 0;
      let totalInterest = 0;
      let totalFines = 0;

      for (const billing of overdueBillings) {
        const dueDate = parseISO(billing.due_date);
        const daysOverdue = differenceInDays(today, dueDate);

        if (daysOverdue <= gracePeriodDays) continue;

        const contract = billing.contracts;
        const netAmount = new Decimal(billing.net_amount);

        // Calcular multa (aplicada uma vez)
        const fineRate = new Decimal(contract.fine_rate || 2); // 2% padrão
        const fineAmount = netAmount.mul(fineRate).div(100);

        // Calcular juros (proporcional aos dias)
        const monthlyRate = new Decimal(contract.interest_rate_monthly || 1); // 1% ao mês padrão
        const dailyRate = monthlyRate.div(30);
        const interestAmount = netAmount.mul(dailyRate).mul(daysOverdue).div(100);

        const totalInterestAmount = (billing.interest_amount || 0) + interestAmount.toNumber();
        const totalFineAmount = (billing.fine_amount || 0) + fineAmount.toNumber();

        // Atualizar faturamento
        const { error: updateError } = await supabase
          .from('contract_billings')
          .update({
            interest_amount: totalInterestAmount,
            fine_amount: totalFineAmount,
            interest_applied_date: today.toISOString(),
            updated_at: today.toISOString()
          })
          .eq('id', billing.id);

        if (!updateError) {
          updatedCount++;
          totalInterest += interestAmount.toNumber();
          totalFines += fineAmount.toNumber();
        }
      }

      return {
        updated_count: updatedCount,
        total_interest: totalInterest,
        total_fines: totalFines
      };

    } catch (error) {
      console.error('[BillingAutomation] Erro ao aplicar juros e multas:', error);
      return { updated_count: 0, total_interest: 0, total_fines: 0 };
    }
  }

  /**
   * Processa desconto para pagamento antecipado
   */
  async processEarlyPaymentDiscount(
    billingId: string,
    paymentDate: Date
  ): Promise<{ discount_amount: number; eligible: boolean }> {
    try {
      const { data: billing, error } = await supabase
        .from('contract_billings')
        .select(`
          id,
          due_date,
          net_amount,
          contracts!inner(
            discount_rate,
            discount_days
          )
        `)
        .eq('id', billingId)
        .single();

      if (error || !billing) {
        return { discount_amount: 0, eligible: false };
      }

      const contract = billing.contracts;
      const dueDate = parseISO(billing.due_date);
      const discountDays = contract.discount_days || 0;
      const discountRate = contract.discount_rate || 0;

      if (discountDays === 0 || discountRate === 0) {
        return { discount_amount: 0, eligible: false };
      }

      const discountDeadline = addDays(dueDate, -discountDays);
      const isEligible = isBefore(paymentDate, discountDeadline) || 
                        paymentDate.toDateString() === discountDeadline.toDateString();

      if (!isEligible) {
        return { discount_amount: 0, eligible: false };
      }

      const discountAmount = new Decimal(billing.net_amount)
        .mul(discountRate)
        .div(100)
        .toNumber();

      return {
        discount_amount: discountAmount,
        eligible: true
      };

    } catch (error) {
      console.error('[BillingAutomation] Erro ao processar desconto antecipado:', error);
      return { discount_amount: 0, eligible: false };
    }
  }

  /**
   * Gera relatório de faturamento para um período
   */
  async generateBillingReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total_billings: number;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    overdue_amount: number;
    interest_amount: number;
    fine_amount: number;
    by_status: Record<string, { count: number; amount: number }>;
    by_month: Record<string, { count: number; amount: number }>;
  }> {
    try {
      const { data: billings, error } = await supabase
        .from('contract_billings')
        .select(`
          id,
          status,
          net_amount,
          interest_amount,
          fine_amount,
          due_date,
          payment_date,
          reference_period
        `)
        .eq('tenant_id', tenantId)
        .gte('issue_date', format(startDate, 'yyyy-MM-dd'))
        .lte('issue_date', format(endDate, 'yyyy-MM-dd'));

      if (error || !billings) {
        throw new Error(error?.message || 'Erro ao buscar faturamentos');
      }

      const report = {
        total_billings: billings.length,
        total_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
        overdue_amount: 0,
        interest_amount: 0,
        fine_amount: 0,
        by_status: {} as Record<string, { count: number; amount: number }>,
        by_month: {} as Record<string, { count: number; amount: number }>
      };

      for (const billing of billings) {
        const amount = billing.net_amount + (billing.interest_amount || 0) + (billing.fine_amount || 0);
        
        report.total_amount += amount;
        report.interest_amount += billing.interest_amount || 0;
        report.fine_amount += billing.fine_amount || 0;

        // Por status
        if (!report.by_status[billing.status]) {
          report.by_status[billing.status] = { count: 0, amount: 0 };
        }
        report.by_status[billing.status].count++;
        report.by_status[billing.status].amount += amount;

        // Por mês
        const month = billing.reference_period;
        if (!report.by_month[month]) {
          report.by_month[month] = { count: 0, amount: 0 };
        }
        report.by_month[month].count++;
        report.by_month[month].amount += amount;

        // Totais por status
        switch (billing.status) {
          case 'PAID':
            report.paid_amount += amount;
            break;
          case 'PENDING':
            report.pending_amount += amount;
            break;
          case 'OVERDUE':
            report.overdue_amount += amount;
            break;
        }
      }

      return report;

    } catch (error) {
      console.error('[BillingAutomation] Erro ao gerar relatório:', error);
      throw error;
    }
  }

  /**
   * Agenda processamento automático de faturamento
   */
  async scheduleAutomaticProcessing(
    tenantId: string,
    processingDay: number = 1
  ): Promise<{ success: boolean; next_run: Date }> {
    try {
      const today = new Date();
      const nextMonth = addMonths(today, 1);
      const nextRun = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), processingDay);

      // Aqui você pode integrar com um sistema de agendamento como cron jobs
      // Por exemplo, salvar na tabela de agendamentos ou usar um serviço externo
      
      return {
        success: true,
        next_run: nextRun
      };

    } catch (error) {
      console.error('[BillingAutomation] Erro ao agendar processamento:', error);
      return {
        success: false,
        next_run: new Date()
      };
    }
  }
}

  /**
   * AIDEV-NOTE: Função para mapear billing_type (português) para payment_terms (inglês)
   * Resolve o erro "case not found" ao converter valores do banco para a função calculateDueDate
   */
  private mapBillingTypeToPaymentTerms(billingType?: string): 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' {
    if (!billingType) return 'MONTHLY';
    
    const mappings: Record<string, 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'> = {
      'Mensal': 'MONTHLY',
      'Trimestral': 'QUARTERLY', 
      'Semestral': 'SEMIANNUAL',
      'Anual': 'ANNUAL',
      // Fallbacks para valores em inglês (caso existam)
      'MONTHLY': 'MONTHLY',
      'QUARTERLY': 'QUARTERLY',
      'SEMIANNUAL': 'SEMIANNUAL', 
      'ANNUAL': 'ANNUAL'
    };
    
    return mappings[billingType] || 'MONTHLY';
  }
}

export const billingAutomationService = new BillingAutomationService();
export default billingAutomationService;

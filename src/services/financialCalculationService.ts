import Decimal from 'decimal.js';
import { 
  addDays, 
  addMonths, 
  addYears, 
  differenceInDays, 
  differenceInMonths,
  differenceInYears,
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isAfter,
  isBefore
} from 'date-fns';

// Configuração de precisão para cálculos financeiros
Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

export interface InterestCalculationParams {
  principal: number;
  rate: number; // Taxa em porcentagem
  period: number; // Período em dias, meses ou anos
  periodType: 'DAILY' | 'MONTHLY' | 'YEARLY';
  compoundType: 'SIMPLE' | 'COMPOUND';
  gracePeriod?: number; // Período de carência em dias
}

export interface InterestCalculationResult {
  principal: number;
  interest: number;
  total: number;
  effectiveRate: number;
  dailyRate: number;
  monthlyRate: number;
  yearlyRate: number;
}

export interface AmortizationParams {
  principal: number;
  annualRate: number; // Taxa anual em porcentagem
  periods: number; // Número de parcelas
  paymentType: 'SAC' | 'PRICE' | 'AMERICAN'; // Sistema de amortização
  gracePeriod?: number; // Carência em meses
  firstPaymentDate?: Date;
}

export interface AmortizationInstallment {
  installment: number;
  date: Date;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  accumulatedPrincipal: number;
  accumulatedInterest: number;
}

export interface AmortizationTable {
  installments: AmortizationInstallment[];
  summary: {
    totalPayments: number;
    totalInterest: number;
    totalPrincipal: number;
    effectiveRate: number;
  };
}

export interface ContractAdjustmentParams {
  originalValue: number;
  adjustmentIndex: 'IPCA' | 'IGP-M' | 'INPC' | 'CDI' | 'SELIC' | 'CUSTOM';
  adjustmentRate?: number; // Para índice customizado
  baseDate: Date;
  adjustmentDate: Date;
  adjustmentType: 'ANNUAL' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL';
  capRate?: number; // Taxa de teto em porcentagem
  floorRate?: number; // Taxa de piso em porcentagem
}

export interface ContractAdjustmentResult {
  originalValue: number;
  adjustmentRate: number;
  adjustmentAmount: number;
  adjustedValue: number;
  adjustmentPeriod: number;
  effectiveDate: Date;
  nextAdjustmentDate: Date;
}

export interface PaymentSimulationParams {
  totalAmount: number;
  paymentDate: Date;
  dueDate: Date;
  interestRate: number; // Taxa mensal
  fineRate: number; // Taxa de multa
  discountRate?: number; // Desconto para pagamento antecipado
  discountDays?: number; // Dias para desconto
  gracePeriod?: number; // Período de carência
}

export interface PaymentSimulationResult {
  originalAmount: number;
  interestAmount: number;
  fineAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentType: 'EARLY' | 'ON_TIME' | 'LATE';
  daysFromDue: number;
  effectiveRate: number;
}

export interface FinancialMetrics {
  npv: number; // Valor Presente Líquido
  irr: number; // Taxa Interna de Retorno
  paybackPeriod: number; // Período de Payback
  profitabilityIndex: number; // Índice de Lucratividade
}

export interface CashFlowEntry {
  date: Date;
  amount: number;
  description?: string;
  type: 'INFLOW' | 'OUTFLOW';
}

/**
 * Serviço especializado em cálculos financeiros complexos
 * Implementa fórmulas precisas para juros, amortização, reajustes e simulações
 */
class FinancialCalculationService {
  /**
   * Calcula juros simples ou compostos
   */
  calculateInterest(params: InterestCalculationParams): InterestCalculationResult {
    const principal = new Decimal(params.principal);
    const rate = new Decimal(params.rate).div(100); // Converter para decimal
    const period = new Decimal(params.period);
    const gracePeriod = new Decimal(params.gracePeriod || 0);

    // Ajustar período pela carência
    const effectivePeriod = period.minus(gracePeriod).max(0);

    let interest: Decimal;
    let effectiveRate: number;

    // Converter taxa para o período apropriado
    let periodRate: Decimal;
    switch (params.periodType) {
      case 'DAILY':
        periodRate = rate.div(30); // Taxa diária baseada em mês de 30 dias
        break;
      case 'MONTHLY':
        periodRate = rate;
        break;
      case 'YEARLY':
        periodRate = rate.div(12); // Taxa mensal baseada em taxa anual
        break;
      default:
        periodRate = rate;
    }

    if (params.compoundType === 'SIMPLE') {
      // Juros simples: J = P * i * t
      interest = principal.mul(periodRate).mul(effectivePeriod);
      effectiveRate = periodRate.mul(effectivePeriod).toNumber();
    } else {
      // Juros compostos: M = P * (1 + i)^t
      const factor = new Decimal(1).plus(periodRate).pow(effectivePeriod.toNumber());
      const total = principal.mul(factor);
      interest = total.minus(principal);
      effectiveRate = factor.minus(1).toNumber();
    }

    // Calcular taxas equivalentes
    const dailyRate = this.convertRate(periodRate.toNumber(), params.periodType, 'DAILY');
    const monthlyRate = this.convertRate(periodRate.toNumber(), params.periodType, 'MONTHLY');
    const yearlyRate = this.convertRate(periodRate.toNumber(), params.periodType, 'YEARLY');

    return {
      principal: principal.toNumber(),
      interest: interest.toNumber(),
      total: principal.plus(interest).toNumber(),
      effectiveRate: effectiveRate * 100, // Converter para porcentagem
      dailyRate: dailyRate * 100,
      monthlyRate: monthlyRate * 100,
      yearlyRate: yearlyRate * 100
    };
  }

  /**
   * Gera tabela de amortização
   */
  generateAmortizationTable(params: AmortizationParams): AmortizationTable {
    const principal = new Decimal(params.principal);
    const monthlyRate = new Decimal(params.annualRate).div(100).div(12);
    const periods = params.periods;
    const gracePeriod = params.gracePeriod || 0;
    const firstPaymentDate = params.firstPaymentDate || new Date();

    const installments: AmortizationInstallment[] = [];
    let balance = principal;
    let accumulatedPrincipal = new Decimal(0);
    let accumulatedInterest = new Decimal(0);

    for (let i = 1; i <= periods + gracePeriod; i++) {
      const installmentDate = addMonths(firstPaymentDate, i - 1);
      const isGracePeriod = i <= gracePeriod;

      let payment: Decimal;
      let principalPayment: Decimal;
      let interestPayment: Decimal;

      if (isGracePeriod) {
        // Durante a carência, pagar apenas juros
        interestPayment = balance.mul(monthlyRate);
        principalPayment = new Decimal(0);
        payment = interestPayment;
      } else {
        const effectiveInstallment = i - gracePeriod;
        const remainingPeriods = periods - effectiveInstallment + 1;

        switch (params.paymentType) {
          case 'SAC':
            // Sistema de Amortização Constante
            principalPayment = principal.div(periods);
            interestPayment = balance.mul(monthlyRate);
            payment = principalPayment.plus(interestPayment);
            break;

          case 'PRICE':
            // Sistema Francês (Tabela Price)
            if (monthlyRate.toNumber() === 0) {
              payment = principal.div(periods);
              principalPayment = payment;
              interestPayment = new Decimal(0);
            } else {
              const factor = new Decimal(1).plus(monthlyRate).pow(remainingPeriods);
              payment = balance.mul(monthlyRate).mul(factor).div(factor.minus(1));
              interestPayment = balance.mul(monthlyRate);
              principalPayment = payment.minus(interestPayment);
            }
            break;

          case 'AMERICAN':
            // Sistema Americano
            if (effectiveInstallment === periods) {
              // Última parcela: principal + juros
              interestPayment = balance.mul(monthlyRate);
              principalPayment = balance;
              payment = principalPayment.plus(interestPayment);
            } else {
              // Parcelas intermediárias: apenas juros
              interestPayment = balance.mul(monthlyRate);
              principalPayment = new Decimal(0);
              payment = interestPayment;
            }
            break;

          default:
            throw new Error(`Sistema de amortização não suportado: ${params.paymentType}`);
        }

        balance = balance.minus(principalPayment);
      }

      accumulatedPrincipal = accumulatedPrincipal.plus(principalPayment);
      accumulatedInterest = accumulatedInterest.plus(interestPayment);

      installments.push({
        installment: i,
        date: installmentDate,
        payment: payment.toNumber(),
        principal: principalPayment.toNumber(),
        interest: interestPayment.toNumber(),
        balance: balance.toNumber(),
        accumulatedPrincipal: accumulatedPrincipal.toNumber(),
        accumulatedInterest: accumulatedInterest.toNumber()
      });
    }

    const totalPayments = installments.reduce((sum, inst) => sum + inst.payment, 0);
    const totalInterest = installments.reduce((sum, inst) => sum + inst.interest, 0);

    return {
      installments,
      summary: {
        totalPayments,
        totalInterest,
        totalPrincipal: principal.toNumber(),
        effectiveRate: (totalInterest / principal.toNumber()) * 100
      }
    };
  }

  /**
   * Calcula reajuste contratual
   */
  calculateContractAdjustment(params: ContractAdjustmentParams): ContractAdjustmentResult {
    const originalValue = new Decimal(params.originalValue);
    const baseDate = params.baseDate;
    const adjustmentDate = params.adjustmentDate;

    // Calcular período de reajuste
    let adjustmentPeriod: number;
    switch (params.adjustmentType) {
      case 'MONTHLY':
        adjustmentPeriod = differenceInMonths(adjustmentDate, baseDate);
        break;
      case 'QUARTERLY':
        adjustmentPeriod = differenceInMonths(adjustmentDate, baseDate) / 3;
        break;
      case 'SEMIANNUAL':
        adjustmentPeriod = differenceInMonths(adjustmentDate, baseDate) / 6;
        break;
      case 'ANNUAL':
        adjustmentPeriod = differenceInYears(adjustmentDate, baseDate);
        break;
      default:
        adjustmentPeriod = differenceInMonths(adjustmentDate, baseDate);
    }

    // Obter taxa de reajuste
    let adjustmentRate: number;
    if (params.adjustmentIndex === 'CUSTOM') {
      adjustmentRate = params.adjustmentRate || 0;
    } else {
      // Aqui você integraria com APIs de índices econômicos
      // Por enquanto, usar taxa simulada
      adjustmentRate = this.getIndexRate(params.adjustmentIndex, baseDate, adjustmentDate);
    }

    // Aplicar teto e piso se definidos
    if (params.capRate !== undefined) {
      adjustmentRate = Math.min(adjustmentRate, params.capRate);
    }
    if (params.floorRate !== undefined) {
      adjustmentRate = Math.max(adjustmentRate, params.floorRate);
    }

    // Calcular valor reajustado
    const adjustmentFactor = new Decimal(1).plus(new Decimal(adjustmentRate).div(100));
    const adjustedValue = originalValue.mul(adjustmentFactor);
    const adjustmentAmount = adjustedValue.minus(originalValue);

    // Calcular próxima data de reajuste
    let nextAdjustmentDate: Date;
    switch (params.adjustmentType) {
      case 'MONTHLY':
        nextAdjustmentDate = addMonths(adjustmentDate, 1);
        break;
      case 'QUARTERLY':
        nextAdjustmentDate = addMonths(adjustmentDate, 3);
        break;
      case 'SEMIANNUAL':
        nextAdjustmentDate = addMonths(adjustmentDate, 6);
        break;
      case 'ANNUAL':
        nextAdjustmentDate = addYears(adjustmentDate, 1);
        break;
      default:
        nextAdjustmentDate = addYears(adjustmentDate, 1);
    }

    return {
      originalValue: originalValue.toNumber(),
      adjustmentRate,
      adjustmentAmount: adjustmentAmount.toNumber(),
      adjustedValue: adjustedValue.toNumber(),
      adjustmentPeriod,
      effectiveDate: adjustmentDate,
      nextAdjustmentDate
    };
  }

  /**
   * Simula pagamento com juros, multas e descontos
   */
  simulatePayment(params: PaymentSimulationParams): PaymentSimulationResult {
    const totalAmount = new Decimal(params.totalAmount);
    const paymentDate = params.paymentDate;
    const dueDate = params.dueDate;
    const interestRate = new Decimal(params.interestRate).div(100); // Taxa mensal
    const fineRate = new Decimal(params.fineRate).div(100);
    const discountRate = new Decimal(params.discountRate || 0).div(100);
    const discountDays = params.discountDays || 0;
    const gracePeriod = params.gracePeriod || 0;

    const daysFromDue = differenceInDays(paymentDate, dueDate);
    let paymentType: 'EARLY' | 'ON_TIME' | 'LATE';
    let interestAmount = new Decimal(0);
    let fineAmount = new Decimal(0);
    let discountAmount = new Decimal(0);

    if (daysFromDue < -discountDays) {
      // Pagamento antecipado com desconto
      paymentType = 'EARLY';
      discountAmount = totalAmount.mul(discountRate);
    } else if (daysFromDue <= 0) {
      // Pagamento em dia
      paymentType = 'ON_TIME';
    } else if (daysFromDue <= gracePeriod) {
      // Dentro do período de carência
      paymentType = 'ON_TIME';
    } else {
      // Pagamento em atraso
      paymentType = 'LATE';
      
      // Calcular multa (aplicada uma vez)
      fineAmount = totalAmount.mul(fineRate);
      
      // Calcular juros proporcionais aos dias de atraso
      const dailyRate = interestRate.div(30); // Taxa diária baseada em mês de 30 dias
      const effectiveDays = daysFromDue - gracePeriod;
      interestAmount = totalAmount.mul(dailyRate).mul(effectiveDays);
    }

    const finalAmount = totalAmount
      .plus(interestAmount)
      .plus(fineAmount)
      .minus(discountAmount);

    const effectiveRate = finalAmount.div(totalAmount).minus(1).toNumber();

    return {
      originalAmount: totalAmount.toNumber(),
      interestAmount: interestAmount.toNumber(),
      fineAmount: fineAmount.toNumber(),
      discountAmount: discountAmount.toNumber(),
      totalAmount: finalAmount.toNumber(),
      paymentType,
      daysFromDue,
      effectiveRate: effectiveRate * 100
    };
  }

  /**
   * Calcula métricas financeiras (VPL, TIR, Payback)
   */
  calculateFinancialMetrics(
    cashFlows: CashFlowEntry[],
    discountRate: number
  ): FinancialMetrics {
    const rate = new Decimal(discountRate).div(100);
    const sortedFlows = cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime());
    const baseDate = sortedFlows[0].date;

    // Calcular VPL (Valor Presente Líquido)
    let npv = new Decimal(0);
    for (const flow of sortedFlows) {
      const periods = differenceInMonths(flow.date, baseDate);
      const presentValue = new Decimal(flow.amount).div(
        new Decimal(1).plus(rate.div(12)).pow(periods)
      );
      npv = npv.plus(presentValue);
    }

    // Calcular TIR (Taxa Interna de Retorno) usando método iterativo
    const irr = this.calculateIRR(sortedFlows);

    // Calcular Período de Payback
    const paybackPeriod = this.calculatePaybackPeriod(sortedFlows);

    // Calcular Índice de Lucratividade
    const initialInvestment = Math.abs(sortedFlows[0].amount);
    const profitabilityIndex = npv.div(initialInvestment).plus(1).toNumber();

    return {
      npv: npv.toNumber(),
      irr: irr * 100, // Converter para porcentagem
      paybackPeriod,
      profitabilityIndex
    };
  }

  /**
   * Converte taxa entre diferentes períodos
   */
  private convertRate(
    rate: number,
    fromPeriod: 'DAILY' | 'MONTHLY' | 'YEARLY',
    toPeriod: 'DAILY' | 'MONTHLY' | 'YEARLY'
  ): number {
    if (fromPeriod === toPeriod) return rate;

    const rateDecimal = new Decimal(rate);

    // Converter para taxa diária primeiro
    let dailyRate: Decimal;
    switch (fromPeriod) {
      case 'DAILY':
        dailyRate = rateDecimal;
        break;
      case 'MONTHLY':
        dailyRate = rateDecimal.div(30);
        break;
      case 'YEARLY':
        dailyRate = rateDecimal.div(365);
        break;
    }

    // Converter da taxa diária para o período desejado
    switch (toPeriod) {
      case 'DAILY':
        return dailyRate.toNumber();
      case 'MONTHLY':
        return dailyRate.mul(30).toNumber();
      case 'YEARLY':
        return dailyRate.mul(365).toNumber();
      default:
        return dailyRate.toNumber();
    }
  }

  /**
   * Obtém taxa de índice econômico (simulado)
   */
  private getIndexRate(
    index: string,
    baseDate: Date,
    adjustmentDate: Date
  ): number {
    // Aqui você integraria com APIs reais de índices econômicos
    // Por enquanto, retornar taxas simuladas
    const months = differenceInMonths(adjustmentDate, baseDate);
    
    switch (index) {
      case 'IPCA':
        return 0.5 * months; // 0.5% ao mês simulado
      case 'IGP-M':
        return 0.6 * months; // 0.6% ao mês simulado
      case 'INPC':
        return 0.45 * months; // 0.45% ao mês simulado
      case 'CDI':
        return 0.75 * months; // 0.75% ao mês simulado
      case 'SELIC':
        return 0.8 * months; // 0.8% ao mês simulado
      default:
        return 0.5 * months;
    }
  }

  /**
   * Calcula TIR usando método de Newton-Raphson
   */
  private calculateIRR(cashFlows: CashFlowEntry[]): number {
    const baseDate = cashFlows[0].date;
    let rate = 0.1; // Taxa inicial de 10%
    const tolerance = 0.0001;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      let npv = new Decimal(0);
      let dnpv = new Decimal(0);

      for (const flow of cashFlows) {
        const periods = differenceInMonths(flow.date, baseDate);
        const factor = new Decimal(1).plus(rate).pow(periods);
        
        npv = npv.plus(new Decimal(flow.amount).div(factor));
        dnpv = dnpv.minus(
          new Decimal(flow.amount).mul(periods).div(factor.mul(new Decimal(1).plus(rate)))
        );
      }

      if (Math.abs(npv.toNumber()) < tolerance) {
        return rate;
      }

      rate = rate - npv.div(dnpv).toNumber();
    }

    return rate;
  }

  /**
   * Calcula período de payback
   */
  private calculatePaybackPeriod(cashFlows: CashFlowEntry[]): number {
    let cumulativeFlow = new Decimal(0);
    const baseDate = cashFlows[0].date;

    for (const flow of cashFlows) {
      cumulativeFlow = cumulativeFlow.plus(flow.amount);
      
      if (cumulativeFlow.toNumber() >= 0) {
        return differenceInMonths(flow.date, baseDate);
      }
    }

    return -1; // Payback não atingido
  }

  /**
   * Calcula valor futuro com capitalização composta
   */
  calculateFutureValue(
    presentValue: number,
    rate: number,
    periods: number,
    periodType: 'MONTHLY' | 'YEARLY' = 'MONTHLY'
  ): number {
    const pv = new Decimal(presentValue);
    const r = new Decimal(rate).div(100);
    const n = new Decimal(periods);

    const factor = new Decimal(1).plus(r).pow(n.toNumber());
    return pv.mul(factor).toNumber();
  }

  /**
   * Calcula valor presente
   */
  calculatePresentValue(
    futureValue: number,
    rate: number,
    periods: number,
    periodType: 'MONTHLY' | 'YEARLY' = 'MONTHLY'
  ): number {
    const fv = new Decimal(futureValue);
    const r = new Decimal(rate).div(100);
    const n = new Decimal(periods);

    const factor = new Decimal(1).plus(r).pow(n.toNumber());
    return fv.div(factor).toNumber();
  }
}

export const financialCalculationService = new FinancialCalculationService();
export default financialCalculationService;

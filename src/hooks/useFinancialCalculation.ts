import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  financialCalculationService,
  InterestCalculationParams,
  InterestCalculationResult,
  AmortizationParams,
  AmortizationTable,
  ContractAdjustmentParams,
  ContractAdjustmentResult,
  PaymentSimulationParams,
  PaymentSimulationResult,
  FinancialMetrics,
  CashFlowEntry
} from '../services/financialCalculationService';

export interface UseFinancialCalculationReturn {
  // Estados de carregamento
  isCalculatingInterest: boolean;
  isGeneratingAmortization: boolean;
  isCalculatingAdjustment: boolean;
  isSimulatingPayment: boolean;
  isCalculatingMetrics: boolean;
  isCalculatingFutureValue: boolean;
  isCalculatingPresentValue: boolean;

  // Resultados
  interestResult: InterestCalculationResult | null;
  amortizationTable: AmortizationTable | null;
  adjustmentResult: ContractAdjustmentResult | null;
  paymentSimulation: PaymentSimulationResult | null;
  financialMetrics: FinancialMetrics | null;
  futureValue: number | null;
  presentValue: number | null;

  // Funções
  calculateInterest: (params: InterestCalculationParams) => Promise<InterestCalculationResult>;
  generateAmortizationTable: (params: AmortizationParams) => Promise<AmortizationTable>;
  calculateContractAdjustment: (params: ContractAdjustmentParams) => Promise<ContractAdjustmentResult>;
  simulatePayment: (params: PaymentSimulationParams) => Promise<PaymentSimulationResult>;
  calculateFinancialMetrics: (cashFlows: CashFlowEntry[], discountRate: number) => Promise<FinancialMetrics>;
  calculateFutureValue: (presentValue: number, rate: number, periods: number, periodType?: 'MONTHLY' | 'YEARLY') => Promise<number>;
  calculatePresentValue: (futureValue: number, rate: number, periods: number, periodType?: 'MONTHLY' | 'YEARLY') => Promise<number>;

  // Utilitários
  clearResults: () => void;
  exportAmortizationToCSV: () => string | null;
  exportCalculationReport: () => object | null;
}

/**
 * Hook para gerenciar cálculos financeiros complexos
 * Encapsula o financialCalculationService com estados de carregamento e tratamento de erros
 */
export const useFinancialCalculation = (): UseFinancialCalculationReturn => {
  // Estados de carregamento
  const [isCalculatingInterest, setIsCalculatingInterest] = useState(false);
  const [isGeneratingAmortization, setIsGeneratingAmortization] = useState(false);
  const [isCalculatingAdjustment, setIsCalculatingAdjustment] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  const [isCalculatingFutureValue, setIsCalculatingFutureValue] = useState(false);
  const [isCalculatingPresentValue, setIsCalculatingPresentValue] = useState(false);

  // Estados de resultados
  const [interestResult, setInterestResult] = useState<InterestCalculationResult | null>(null);
  const [amortizationTable, setAmortizationTable] = useState<AmortizationTable | null>(null);
  const [adjustmentResult, setAdjustmentResult] = useState<ContractAdjustmentResult | null>(null);
  const [paymentSimulation, setPaymentSimulation] = useState<PaymentSimulationResult | null>(null);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [futureValue, setFutureValue] = useState<number | null>(null);
  const [presentValue, setPresentValue] = useState<number | null>(null);

  /**
   * Calcula juros simples ou compostos
   */
  const calculateInterest = useCallback(async (params: InterestCalculationParams): Promise<InterestCalculationResult> => {
    setIsCalculatingInterest(true);
    try {
      const result = financialCalculationService.calculateInterest(params);
      setInterestResult(result);
      
      toast.success(
        `Cálculo de juros concluído: ${params.compoundType === 'SIMPLE' ? 'Simples' : 'Compostos'} - ` +
        `Total: R$ ${result.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );
      
      return result;
    } catch (error) {
      console.error('Erro ao calcular juros:', error);
      toast.error('Erro ao calcular juros. Verifique os parâmetros informados.');
      throw error;
    } finally {
      setIsCalculatingInterest(false);
    }
  }, []);

  /**
   * Gera tabela de amortização
   */
  const generateAmortizationTable = useCallback(async (params: AmortizationParams): Promise<AmortizationTable> => {
    setIsGeneratingAmortization(true);
    try {
      const result = financialCalculationService.generateAmortizationTable(params);
      setAmortizationTable(result);
      
      toast.success(
        `Tabela de amortização gerada: ${params.paymentType} - ` +
        `${result.installments.length} parcelas - ` +
        `Total: R$ ${result.summary.totalPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );
      
      return result;
    } catch (error) {
      console.error('Erro ao gerar tabela de amortização:', error);
      toast.error('Erro ao gerar tabela de amortização. Verifique os parâmetros informados.');
      throw error;
    } finally {
      setIsGeneratingAmortization(false);
    }
  }, []);

  /**
   * Calcula reajuste contratual
   */
  const calculateContractAdjustment = useCallback(async (params: ContractAdjustmentParams): Promise<ContractAdjustmentResult> => {
    setIsCalculatingAdjustment(true);
    try {
      const result = financialCalculationService.calculateContractAdjustment(params);
      setAdjustmentResult(result);
      
      toast.success(
        `Reajuste calculado: ${params.adjustmentIndex} - ` +
        `${result.adjustmentRate.toFixed(2)}% - ` +
        `Novo valor: R$ ${result.adjustedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );
      
      return result;
    } catch (error) {
      console.error('Erro ao calcular reajuste:', error);
      toast.error('Erro ao calcular reajuste contratual. Verifique os parâmetros informados.');
      throw error;
    } finally {
      setIsCalculatingAdjustment(false);
    }
  }, []);

  /**
   * Simula pagamento com juros, multas e descontos
   */
  const simulatePayment = useCallback(async (params: PaymentSimulationParams): Promise<PaymentSimulationResult> => {
    setIsSimulatingPayment(true);
    try {
      const result = financialCalculationService.simulatePayment(params);
      setPaymentSimulation(result);
      
      const paymentTypeText = {
        'EARLY': 'Antecipado',
        'ON_TIME': 'Em dia',
        'LATE': 'Em atraso'
      }[result.paymentType];
      
      toast.success(
        `Simulação de pagamento: ${paymentTypeText} - ` +
        `Total: R$ ${result.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );
      
      return result;
    } catch (error) {
      console.error('Erro ao simular pagamento:', error);
      toast.error('Erro ao simular pagamento. Verifique os parâmetros informados.');
      throw error;
    } finally {
      setIsSimulatingPayment(false);
    }
  }, []);

  /**
   * Calcula métricas financeiras (VPL, TIR, Payback)
   */
  const calculateFinancialMetrics = useCallback(async (
    cashFlows: CashFlowEntry[],
    discountRate: number
  ): Promise<FinancialMetrics> => {
    setIsCalculatingMetrics(true);
    try {
      const result = financialCalculationService.calculateFinancialMetrics(cashFlows, discountRate);
      setFinancialMetrics(result);
      
      toast.success(
        `Métricas calculadas - VPL: R$ ${result.npv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ` +
        `TIR: ${result.irr.toFixed(2)}%`
      );
      
      return result;
    } catch (error) {
      console.error('Erro ao calcular métricas financeiras:', error);
      toast.error('Erro ao calcular métricas financeiras. Verifique os dados informados.');
      throw error;
    } finally {
      setIsCalculatingMetrics(false);
    }
  }, []);

  /**
   * Calcula valor futuro
   */
  const calculateFutureValue = useCallback(async (
    presentValue: number,
    rate: number,
    periods: number,
    periodType: 'MONTHLY' | 'YEARLY' = 'MONTHLY'
  ): Promise<number> => {
    setIsCalculatingFutureValue(true);
    try {
      const result = financialCalculationService.calculateFutureValue(presentValue, rate, periods, periodType);
      setFutureValue(result);
      
      toast.success(
        `Valor futuro calculado: R$ ${result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );
      
      return result;
    } catch (error) {
      console.error('Erro ao calcular valor futuro:', error);
      toast.error('Erro ao calcular valor futuro. Verifique os parâmetros informados.');
      throw error;
    } finally {
      setIsCalculatingFutureValue(false);
    }
  }, []);

  /**
   * Calcula valor presente
   */
  const calculatePresentValue = useCallback(async (
    futureValue: number,
    rate: number,
    periods: number,
    periodType: 'MONTHLY' | 'YEARLY' = 'MONTHLY'
  ): Promise<number> => {
    setIsCalculatingPresentValue(true);
    try {
      const result = financialCalculationService.calculatePresentValue(futureValue, rate, periods, periodType);
      setPresentValue(result);
      
      toast.success(
        `Valor presente calculado: R$ ${result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );
      
      return result;
    } catch (error) {
      console.error('Erro ao calcular valor presente:', error);
      toast.error('Erro ao calcular valor presente. Verifique os parâmetros informados.');
      throw error;
    } finally {
      setIsCalculatingPresentValue(false);
    }
  }, []);

  /**
   * Limpa todos os resultados
   */
  const clearResults = useCallback(() => {
    setInterestResult(null);
    setAmortizationTable(null);
    setAdjustmentResult(null);
    setPaymentSimulation(null);
    setFinancialMetrics(null);
    setFutureValue(null);
    setPresentValue(null);
    toast.success('Resultados limpos com sucesso.');
  }, []);

  /**
   * Exporta tabela de amortização para CSV
   */
  const exportAmortizationToCSV = useCallback((): string | null => {
    if (!amortizationTable) {
      toast.error('Nenhuma tabela de amortização disponível para exportar.');
      return null;
    }

    try {
      const headers = [
        'Parcela',
        'Data',
        'Pagamento',
        'Principal',
        'Juros',
        'Saldo',
        'Principal Acumulado',
        'Juros Acumulado'
      ];

      const csvContent = [
        headers.join(';'),
        ...amortizationTable.installments.map(inst => [
          inst.installment,
          inst.date.toLocaleDateString('pt-BR'),
          inst.payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          inst.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          inst.interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          inst.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          inst.accumulatedPrincipal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          inst.accumulatedInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        ].join(';')),
        '',
        'RESUMO',
        `Total de Pagamentos;${amortizationTable.summary.totalPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Total de Juros;${amortizationTable.summary.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Principal;${amortizationTable.summary.totalPrincipal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Taxa Efetiva;${amortizationTable.summary.effectiveRate.toFixed(2)}%`
      ].join('\n');

      toast.success('Tabela de amortização exportada para CSV.');
      return csvContent;
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar tabela de amortização.');
      return null;
    }
  }, [amortizationTable]);

  /**
   * Exporta relatório completo de cálculos
   */
  const exportCalculationReport = useCallback((): object | null => {
    const hasResults = interestResult || amortizationTable || adjustmentResult || 
                      paymentSimulation || financialMetrics || futureValue || presentValue;

    if (!hasResults) {
      toast.error('Nenhum resultado disponível para exportar.');
      return null;
    }

    try {
      const report = {
        timestamp: new Date().toISOString(),
        calculations: {
          interest: interestResult,
          amortization: amortizationTable,
          adjustment: adjustmentResult,
          paymentSimulation: paymentSimulation,
          financialMetrics: financialMetrics,
          futureValue: futureValue,
          presentValue: presentValue
        }
      };

      toast.success('Relatório de cálculos exportado.');
      return report;
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Erro ao exportar relatório de cálculos.');
      return null;
    }
  }, [interestResult, amortizationTable, adjustmentResult, paymentSimulation, financialMetrics, futureValue, presentValue]);

  return {
    // Estados de carregamento
    isCalculatingInterest,
    isGeneratingAmortization,
    isCalculatingAdjustment,
    isSimulatingPayment,
    isCalculatingMetrics,
    isCalculatingFutureValue,
    isCalculatingPresentValue,

    // Resultados
    interestResult,
    amortizationTable,
    adjustmentResult,
    paymentSimulation,
    financialMetrics,
    futureValue,
    presentValue,

    // Funções
    calculateInterest,
    generateAmortizationTable,
    calculateContractAdjustment,
    simulatePayment,
    calculateFinancialMetrics,
    calculateFutureValue,
    calculatePresentValue,

    // Utilitários
    clearResults,
    exportAmortizationToCSV,
    exportCalculationReport
  };
};

export default useFinancialCalculation;

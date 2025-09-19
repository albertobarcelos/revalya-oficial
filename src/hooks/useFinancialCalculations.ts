// =====================================================
// FINANCIAL CALCULATIONS HOOK
// Descrição: Hook para gerenciar cálculos financeiros
// =====================================================

import { useState, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import {
  CalculationType,
  CalculationRequest,
  CalculationResponse,
  FinancialCalculation,
  SimpleInterestParams,
  CompoundInterestParams,
  LoanPaymentParams,
  NPVParams,
  IRRParams,
  PaybackParams,
  AmortizationParams,
  DepreciationParams,
  PaginationParams,
  PaginatedResponse,
} from '../types/models/financial';

interface UseFinancialCalculationsReturn {
  // State
  calculations: FinancialCalculation[];
  loading: boolean;
  error: string | null;
  
  // Actions
  calculateSimpleInterest: (params: SimpleInterestParams, save?: boolean) => Promise<CalculationResponse | null>;
  calculateCompoundInterest: (params: CompoundInterestParams, save?: boolean) => Promise<CalculationResponse | null>;
  calculateLoanPayment: (params: LoanPaymentParams, save?: boolean) => Promise<CalculationResponse | null>;
  calculateNPV: (params: NPVParams, save?: boolean) => Promise<CalculationResponse | null>;
  calculateIRR: (params: IRRParams, save?: boolean) => Promise<CalculationResponse | null>;
  calculatePayback: (params: PaybackParams, save?: boolean) => Promise<CalculationResponse | null>;
  calculateAmortization: (params: AmortizationParams, save?: boolean) => Promise<CalculationResponse | null>;
  calculateDepreciation: (params: DepreciationParams, save?: boolean) => Promise<CalculationResponse | null>;
  
  // Data management
  getCalculations: (params?: PaginationParams) => Promise<PaginatedResponse<FinancialCalculation> | null>;
  getCalculation: (id: string) => Promise<FinancialCalculation | null>;
  deleteCalculation: (id: string) => Promise<boolean>;
  
  // Utilities
  clearError: () => void;
  refresh: () => Promise<void>;
}

export const useFinancialCalculations = (): UseFinancialCalculationsReturn => {
  const { supabase, user } = useSupabase();
  const [calculations, setCalculations] = useState<FinancialCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: any, context: string) => {
    console.error(`[useFinancialCalculations] ${context}:`, error);
    setError(error.message || `Erro ao ${context}`);
    setLoading(false);
  }, []);

  // Generic calculation function
  const performCalculation = useCallback(async (
    type: CalculationType,
    parameters: any,
    save: boolean = false
  ): Promise<CalculationResponse | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const request: CalculationRequest = {
        type,
        parameters,
        saveResult: save,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      };

      const { data, error } = await supabase.functions.invoke('financial-calculations', {
        body: request,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao realizar cálculo');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido no cálculo');
      }

      setLoading(false);
      return data.data as CalculationResponse;
    } catch (err) {
      handleError(err, 'realizar cálculo');
      return null;
    }
  }, [supabase, user, handleError]);

  // Specific calculation methods
  const calculateSimpleInterest = useCallback(async (
    params: SimpleInterestParams,
    save: boolean = false
  ): Promise<CalculationResponse | null> => {
    return performCalculation('simple_interest', params, save);
  }, [performCalculation]);

  const calculateCompoundInterest = useCallback(async (
    params: CompoundInterestParams,
    save: boolean = false
  ): Promise<CalculationResponse | null> => {
    return performCalculation('compound_interest', params, save);
  }, [performCalculation]);

  const calculateLoanPayment = useCallback(async (
    params: LoanPaymentParams,
    save: boolean = false
  ): Promise<CalculationResponse | null> => {
    return performCalculation('loan_payment', params, save);
  }, [performCalculation]);

  const calculateNPV = useCallback(async (
    params: NPVParams,
    save: boolean = false
  ): Promise<CalculationResponse | null> => {
    return performCalculation('npv', params, save);
  }, [performCalculation]);

  const calculateIRR = useCallback(async (
    params: IRRParams,
    save: boolean = false
  ): Promise<CalculationResponse | null> => {
    return performCalculation('irr', params, save);
  }, [performCalculation]);

  const calculatePayback = useCallback(async (
    params: PaybackParams,
    save: boolean = false
  ): Promise<CalculationResponse | null> => {
    return performCalculation('payback', params, save);
  }, [performCalculation]);

  const calculateAmortization = useCallback(async (
    params: AmortizationParams,
    save: boolean = false
  ): Promise<CalculationResponse | null> => {
    return performCalculation('amortization', params, save);
  }, [performCalculation]);

  const calculateDepreciation = useCallback(async (
    params: DepreciationParams,
    save: boolean = false
  ): Promise<CalculationResponse | null> => {
    return performCalculation('depreciation', params, save);
  }, [performCalculation]);

  // Data management methods
  const getCalculations = useCallback(async (
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<FinancialCalculation> | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_financial_calculations', {
        p_limit: params.limit || 50,
        p_offset: params.offset || 0,
        p_sort_by: params.sortBy || 'created_at',
        p_sort_order: params.sortOrder || 'desc',
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar cálculos');
      }

      const result: PaginatedResponse<FinancialCalculation> = {
        data: data?.calculations || [],
        total: data?.total || 0,
        limit: params.limit || 50,
        offset: params.offset || 0,
        hasMore: (data?.total || 0) > (params.offset || 0) + (params.limit || 50),
      };

      setCalculations(result.data);
      setLoading(false);
      return result;
    } catch (err) {
      handleError(err, 'buscar cálculos');
      return null;
    }
  }, [supabase, user, handleError]);

  const getCalculation = useCallback(async (
    id: string
  ): Promise<FinancialCalculation | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('financial_calculations')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', user.user_metadata?.tenant_id)
        .single();

      if (error) {
        throw new Error(error.message || 'Erro ao buscar cálculo');
      }

      setLoading(false);
      return data as FinancialCalculation;
    } catch (err) {
      handleError(err, 'buscar cálculo');
      return null;
    }
  }, [supabase, user, handleError]);

  const deleteCalculation = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('financial_calculations')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.user_metadata?.tenant_id);

      if (error) {
        throw new Error(error.message || 'Erro ao deletar cálculo');
      }

      // Remove from local state
      setCalculations(prev => prev.filter(calc => calc.id !== id));
      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'deletar cálculo');
      return false;
    }
  }, [supabase, user, handleError]);

  const refresh = useCallback(async (): Promise<void> => {
    await getCalculations();
  }, [getCalculations]);

  return {
    // State
    calculations,
    loading,
    error,
    
    // Calculation methods
    calculateSimpleInterest,
    calculateCompoundInterest,
    calculateLoanPayment,
    calculateNPV,
    calculateIRR,
    calculatePayback,
    calculateAmortization,
    calculateDepreciation,
    
    // Data management
    getCalculations,
    getCalculation,
    deleteCalculation,
    
    // Utilities
    clearError,
    refresh,
  };
};

// =====================================================
// CALCULATION UTILITIES HOOK
// =====================================================

interface UseCalculationUtilitiesReturn {
  formatCurrency: (value: number, currency?: string) => string;
  formatPercentage: (value: number, decimals?: number) => string;
  validateCalculationParams: (type: CalculationType, params: any) => { isValid: boolean; errors: string[] };
  getCalculationDescription: (type: CalculationType) => string;
  getCalculationFormula: (type: CalculationType) => string;
}

export const useCalculationUtilities = (): UseCalculationUtilitiesReturn => {
  const formatCurrency = useCallback((value: number, currency: string = 'BRL'): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, []);

  const formatPercentage = useCallback((value: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  }, []);

  const validateCalculationParams = useCallback((
    type: CalculationType,
    params: any
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (type) {
      case 'simple_interest':
      case 'compound_interest':
        if (!params.principal || params.principal <= 0) {
          errors.push('Principal deve ser maior que zero');
        }
        if (!params.rate || params.rate <= 0) {
          errors.push('Taxa deve ser maior que zero');
        }
        if (!params.time || params.time <= 0) {
          errors.push('Tempo deve ser maior que zero');
        }
        if (type === 'compound_interest' && (!params.compoundingFrequency || params.compoundingFrequency <= 0)) {
          errors.push('Frequência de capitalização deve ser maior que zero');
        }
        break;

      case 'loan_payment':
        if (!params.principal || params.principal <= 0) {
          errors.push('Principal deve ser maior que zero');
        }
        if (!params.rate || params.rate <= 0) {
          errors.push('Taxa deve ser maior que zero');
        }
        if (!params.periods || params.periods <= 0) {
          errors.push('Número de períodos deve ser maior que zero');
        }
        break;

      case 'npv':
        if (!params.rate || params.rate < 0) {
          errors.push('Taxa de desconto deve ser maior ou igual a zero');
        }
        if (!params.cashFlows || !Array.isArray(params.cashFlows) || params.cashFlows.length === 0) {
          errors.push('Fluxos de caixa devem ser fornecidos');
        }
        break;

      case 'irr':
        if (!params.cashFlows || !Array.isArray(params.cashFlows) || params.cashFlows.length < 2) {
          errors.push('Pelo menos dois fluxos de caixa devem ser fornecidos');
        }
        break;

      case 'payback':
        if (!params.initialInvestment || params.initialInvestment <= 0) {
          errors.push('Investimento inicial deve ser maior que zero');
        }
        if (!params.cashFlows || !Array.isArray(params.cashFlows) || params.cashFlows.length === 0) {
          errors.push('Fluxos de caixa devem ser fornecidos');
        }
        break;

      case 'amortization':
        if (!params.principal || params.principal <= 0) {
          errors.push('Principal deve ser maior que zero');
        }
        if (!params.rate || params.rate <= 0) {
          errors.push('Taxa deve ser maior que zero');
        }
        if (!params.periods || params.periods <= 0) {
          errors.push('Número de períodos deve ser maior que zero');
        }
        break;

      case 'depreciation':
        if (!params.cost || params.cost <= 0) {
          errors.push('Custo deve ser maior que zero');
        }
        if (params.salvageValue < 0) {
          errors.push('Valor residual não pode ser negativo');
        }
        if (!params.usefulLife || params.usefulLife <= 0) {
          errors.push('Vida útil deve ser maior que zero');
        }
        if (!params.method || !['straight_line', 'declining_balance', 'sum_of_years'].includes(params.method)) {
          errors.push('Método de depreciação inválido');
        }
        break;

      default:
        errors.push('Tipo de cálculo não suportado');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  const getCalculationDescription = useCallback((type: CalculationType): string => {
    const descriptions: Record<CalculationType, string> = {
      simple_interest: 'Calcula juros simples sobre um capital inicial',
      compound_interest: 'Calcula juros compostos com capitalização periódica',
      loan_payment: 'Calcula o valor da parcela de um empréstimo',
      npv: 'Calcula o Valor Presente Líquido de fluxos de caixa',
      irr: 'Calcula a Taxa Interna de Retorno de um investimento',
      payback: 'Calcula o período de retorno do investimento',
      amortization: 'Gera tabela de amortização de empréstimo',
      depreciation: 'Calcula a depreciação de um ativo',
      cash_flow: 'Analisa fluxos de caixa',
      roi: 'Calcula o Retorno sobre Investimento',
      break_even: 'Calcula o ponto de equilíbrio',
      present_value: 'Calcula o valor presente',
      future_value: 'Calcula o valor futuro',
    };

    return descriptions[type] || 'Cálculo financeiro';
  }, []);

  const getCalculationFormula = useCallback((type: CalculationType): string => {
    const formulas: Record<CalculationType, string> = {
      simple_interest: 'J = P × i × t',
      compound_interest: 'M = P × (1 + i)^t',
      loan_payment: 'PMT = P × [i(1+i)^n] / [(1+i)^n - 1]',
      npv: 'NPV = Σ[CFt / (1+r)^t] - C0',
      irr: 'NPV = 0 = Σ[CFt / (1+IRR)^t] - C0',
      payback: 'Payback = Investimento / Fluxo de Caixa Médio',
      amortization: 'Saldo = Principal - Σ Amortizações',
      depreciation: 'Depreciação = (Custo - Valor Residual) / Vida Útil',
      cash_flow: 'FCL = Receitas - Despesas',
      roi: 'ROI = (Ganho - Investimento) / Investimento × 100',
      break_even: 'PE = Custos Fixos / (Preço - Custo Variável)',
      present_value: 'PV = FV / (1 + r)^n',
      future_value: 'FV = PV × (1 + r)^n',
    };

    return formulas[type] || 'Fórmula não disponível';
  }, []);

  return {
    formatCurrency,
    formatPercentage,
    validateCalculationParams,
    getCalculationDescription,
    getCalculationFormula,
  };
};

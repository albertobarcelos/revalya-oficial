import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { billingAutomationService } from '@/services/billingAutomationService';
import type {
  BillingGenerationResult,
  BillingProcessingOptions,
  FinancialCalculation
} from '@/services/billingAutomationService';

export interface UseBillingAutomationReturn {
  // Estados de carregamento
  isGenerating: boolean;
  isApplyingInterest: boolean;
  isProcessingDiscount: boolean;
  isGeneratingReport: boolean;
  isScheduling: boolean;

  // Resultados das operações
  lastGenerationResult: BillingGenerationResult | null;
  lastInterestResult: { updated_count: number; total_interest: number; total_fines: number } | null;
  lastDiscountResult: { discount_amount: number; eligible: boolean } | null;
  lastReport: any | null;
  lastScheduleResult: { success: boolean; next_run: Date } | null;

  // Funções de ação
  generateRecurringBillings: (options: BillingProcessingOptions) => Promise<BillingGenerationResult>;
  applyInterestAndFines: (tenantId: string, gracePeriodDays?: number) => Promise<void>;
  processEarlyPaymentDiscount: (billingId: string, paymentDate: Date) => Promise<void>;
  generateBillingReport: (tenantId: string, startDate: Date, endDate: Date) => Promise<void>;
  scheduleAutomaticProcessing: (tenantId: string, processingDay?: number) => Promise<void>;

  // Utilitários
  clearResults: () => void;
  error: string | null;
}

/**
 * Hook para gerenciar automação de faturamento
 * Encapsula a lógica do billingAutomationService com estados de UI
 */
export function useBillingAutomation(): UseBillingAutomationReturn {
  // Estados de carregamento
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplyingInterest, setIsApplyingInterest] = useState(false);
  const [isProcessingDiscount, setIsProcessingDiscount] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Estados de resultado
  const [lastGenerationResult, setLastGenerationResult] = useState<BillingGenerationResult | null>(null);
  const [lastInterestResult, setLastInterestResult] = useState<{ updated_count: number; total_interest: number; total_fines: number } | null>(null);
  const [lastDiscountResult, setLastDiscountResult] = useState<{ discount_amount: number; eligible: boolean } | null>(null);
  const [lastReport, setLastReport] = useState<any | null>(null);
  const [lastScheduleResult, setLastScheduleResult] = useState<{ success: boolean; next_run: Date } | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Gera faturamentos recorrentes
   */
  const generateRecurringBillings = useCallback(async (options: BillingProcessingOptions): Promise<BillingGenerationResult> => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await billingAutomationService.generateRecurringBillings(options);
      setLastGenerationResult(result);

      if (result.success) {
        if (options.dry_run) {
          toast.success(
            `Simulação concluída: ${result.generated_count} faturamentos seriam gerados`,
            { duration: 4000 }
          );
        } else {
          toast.success(
            `${result.generated_count} faturamentos gerados com sucesso!`,
            { duration: 4000 }
          );
        }

        if (result.errors.length > 0) {
          toast.error(
            `${result.errors.length} contratos apresentaram erros`,
            { duration: 6000 }
          );
        }
      } else {
        toast.error('Erro na geração de faturamentos');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro na geração: ${errorMessage}`);
      
      const errorResult: BillingGenerationResult = {
        success: false,
        generated_count: 0,
        errors: [{ contract_id: 'system', error: errorMessage }],
        billings: []
      };
      setLastGenerationResult(errorResult);
      return errorResult;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Aplica juros e multas para cobranças vencidas
   */
  const applyInterestAndFines = useCallback(async (
    tenantId: string, 
    gracePeriodDays: number = 5
  ): Promise<void> => {
    setIsApplyingInterest(true);
    setError(null);

    try {
      const result = await billingAutomationService.applyInterestAndFines(tenantId, gracePeriodDays);
      setLastInterestResult(result);

      if (result.updated_count > 0) {
        toast.success(
          `Juros e multas aplicados em ${result.updated_count} faturamentos. ` +
          `Total de juros: R$ ${result.total_interest.toFixed(2)}, ` +
          `Total de multas: R$ ${result.total_fines.toFixed(2)}`,
          { duration: 6000 }
        );
      } else {
        toast.info('Nenhum faturamento elegível para aplicação de juros e multas');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao aplicar juros e multas: ${errorMessage}`);
    } finally {
      setIsApplyingInterest(false);
    }
  }, []);

  /**
   * Processa desconto para pagamento antecipado
   */
  const processEarlyPaymentDiscount = useCallback(async (
    billingId: string,
    paymentDate: Date
  ): Promise<void> => {
    setIsProcessingDiscount(true);
    setError(null);

    try {
      const result = await billingAutomationService.processEarlyPaymentDiscount(billingId, paymentDate);
      setLastDiscountResult(result);

      if (result.eligible) {
        toast.success(
          `Desconto de R$ ${result.discount_amount.toFixed(2)} aplicado para pagamento antecipado`,
          { duration: 4000 }
        );
      } else {
        toast.info('Pagamento não elegível para desconto antecipado');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao processar desconto: ${errorMessage}`);
    } finally {
      setIsProcessingDiscount(false);
    }
  }, []);

  /**
   * Gera relatório de faturamento
   */
  const generateBillingReport = useCallback(async (
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> => {
    setIsGeneratingReport(true);
    setError(null);

    try {
      const report = await billingAutomationService.generateBillingReport(tenantId, startDate, endDate);
      setLastReport(report);

      toast.success(
        `Relatório gerado: ${report.total_billings} faturamentos, ` +
        `Total: R$ ${report.total_amount.toFixed(2)}`,
        { duration: 4000 }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao gerar relatório: ${errorMessage}`);
    } finally {
      setIsGeneratingReport(false);
    }
  }, []);

  /**
   * Agenda processamento automático
   */
  const scheduleAutomaticProcessing = useCallback(async (
    tenantId: string,
    processingDay: number = 1
  ): Promise<void> => {
    setIsScheduling(true);
    setError(null);

    try {
      const result = await billingAutomationService.scheduleAutomaticProcessing(tenantId, processingDay);
      setLastScheduleResult(result);

      if (result.success) {
        toast.success(
          `Processamento automático agendado para ${result.next_run.toLocaleDateString('pt-BR')}`,
          { duration: 4000 }
        );
      } else {
        toast.error('Erro ao agendar processamento automático');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro no agendamento: ${errorMessage}`);
    } finally {
      setIsScheduling(false);
    }
  }, []);

  /**
   * Limpa todos os resultados
   */
  const clearResults = useCallback(() => {
    setLastGenerationResult(null);
    setLastInterestResult(null);
    setLastDiscountResult(null);
    setLastReport(null);
    setLastScheduleResult(null);
    setError(null);
  }, []);

  return {
    // Estados de carregamento
    isGenerating,
    isApplyingInterest,
    isProcessingDiscount,
    isGeneratingReport,
    isScheduling,

    // Resultados
    lastGenerationResult,
    lastInterestResult,
    lastDiscountResult,
    lastReport,
    lastScheduleResult,
    error,

    // Funções
    generateRecurringBillings,
    applyInterestAndFines,
    processEarlyPaymentDiscount,
    generateBillingReport,
    scheduleAutomaticProcessing,
    clearResults
  };
}

export default useBillingAutomation;

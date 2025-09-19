import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  financialReportService,
  ReportConfig,
  ReportGenerationResult,
  FinancialReport,
  ReportSearchFilters,
  ReportSchedule,
  ReportType,
  ReportFormat,
  IncomeStatementData,
  CashFlowData,
  AccountsReceivableData,
  RevenueAnalysisData,
  ProfitabilityAnalysisData,
  BudgetVarianceData
} from '../services/financialReportService';

interface UseFinancialReportState {
  // Estados de carregamento
  isGenerating: boolean;
  isSearching: boolean;
  isDeleting: boolean;
  isScheduling: boolean;
  isProcessingScheduled: boolean;
  
  // Dados
  reports: FinancialReport[];
  currentReport: FinancialReport | null;
  generationResult: ReportGenerationResult | null;
  searchTotal: number;
  
  // Dados específicos dos relatórios
  incomeStatementData: IncomeStatementData | null;
  cashFlowData: CashFlowData | null;
  accountsReceivableData: AccountsReceivableData | null;
  revenueAnalysisData: RevenueAnalysisData | null;
  profitabilityAnalysisData: ProfitabilityAnalysisData | null;
  budgetVarianceData: BudgetVarianceData | null;
}

interface UseFinancialReportActions {
  // Ações principais
  generateReport: (config: ReportConfig, userId: string) => Promise<ReportGenerationResult | null>;
  searchReports: (filters: ReportSearchFilters) => Promise<void>;
  getReport: (reportId: string) => Promise<FinancialReport | null>;
  deleteReport: (reportId: string, userId: string) => Promise<boolean>;
  scheduleReport: (schedule: Omit<ReportSchedule, 'id'>) => Promise<string | null>;
  processScheduledReports: () => Promise<void>;
  
  // Ações de dados específicos
  generateIncomeStatement: (config: ReportConfig, userId: string) => Promise<void>;
  generateCashFlow: (config: ReportConfig, userId: string) => Promise<void>;
  generateAccountsReceivable: (config: ReportConfig, userId: string) => Promise<void>;
  generateRevenueAnalysis: (config: ReportConfig, userId: string) => Promise<void>;
  generateProfitabilityAnalysis: (config: ReportConfig, userId: string) => Promise<void>;
  generateBudgetVariance: (config: ReportConfig, userId: string) => Promise<void>;
  
  // Utilitários
  clearResults: () => void;
  clearCurrentReport: () => void;
  exportReportData: (reportId: string, format: ReportFormat) => Promise<string | null>;
  
  // Validação
  validateReportConfig: (config: Partial<ReportConfig>) => string[];
  formatReportData: (data: any, reportType: ReportType) => any;
}

export function useFinancialReport(): UseFinancialReportState & UseFinancialReportActions {
  const [state, setState] = useState<UseFinancialReportState>({
    isGenerating: false,
    isSearching: false,
    isDeleting: false,
    isScheduling: false,
    isProcessingScheduled: false,
    reports: [],
    currentReport: null,
    generationResult: null,
    searchTotal: 0,
    incomeStatementData: null,
    cashFlowData: null,
    accountsReceivableData: null,
    revenueAnalysisData: null,
    profitabilityAnalysisData: null,
    budgetVarianceData: null
  });

  /**
   * Gera um relatório financeiro
   */
  const generateReport = useCallback(async (
    config: ReportConfig, 
    userId: string
  ): Promise<ReportGenerationResult | null> => {
    setState(prev => ({ ...prev, isGenerating: true, generationResult: null }));
    
    try {
      const result = await financialReportService.generateReport(config, userId);
      
      setState(prev => ({ ...prev, generationResult: result }));
      
      if (result.status === 'COMPLETED') {
        toast.success('Relatório gerado com sucesso!');
      } else if (result.status === 'FAILED') {
        toast.error(`Erro ao gerar relatório: ${result.error}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
      return null;
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, []);

  /**
   * Busca relatórios existentes
   */
  const searchReports = useCallback(async (filters: ReportSearchFilters): Promise<void> => {
    setState(prev => ({ ...prev, isSearching: true }));
    
    try {
      const result = await financialReportService.searchReports(filters);
      
      setState(prev => ({
        ...prev,
        reports: result.reports,
        searchTotal: result.total
      }));
      
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
      toast.error('Erro ao buscar relatórios');
    } finally {
      setState(prev => ({ ...prev, isSearching: false }));
    }
  }, []);

  /**
   * Obtém um relatório específico
   */
  const getReport = useCallback(async (reportId: string): Promise<FinancialReport | null> => {
    try {
      const report = await financialReportService.getReport(reportId);
      
      if (report) {
        setState(prev => ({ ...prev, currentReport: report }));
      }
      
      return report;
      
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      toast.error('Erro ao buscar relatório');
      return null;
    }
  }, []);

  /**
   * Exclui um relatório
   */
  const deleteReport = useCallback(async (reportId: string, userId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isDeleting: true }));
    
    try {
      const success = await financialReportService.deleteReport(reportId, userId);
      
      if (success) {
        toast.success('Relatório excluído com sucesso!');
        
        // Remover da lista local
        setState(prev => ({
          ...prev,
          reports: prev.reports.filter(r => r.id !== reportId),
          currentReport: prev.currentReport?.id === reportId ? null : prev.currentReport
        }));
      } else {
        toast.error('Erro ao excluir relatório');
      }
      
      return success;
      
    } catch (error) {
      console.error('Erro ao excluir relatório:', error);
      toast.error('Erro ao excluir relatório');
      return false;
    } finally {
      setState(prev => ({ ...prev, isDeleting: false }));
    }
  }, []);

  /**
   * Agenda um relatório recorrente
   */
  const scheduleReport = useCallback(async (
    schedule: Omit<ReportSchedule, 'id'>
  ): Promise<string | null> => {
    setState(prev => ({ ...prev, isScheduling: true }));
    
    try {
      const scheduleId = await financialReportService.scheduleReport(schedule);
      
      if (scheduleId) {
        toast.success('Relatório agendado com sucesso!');
      } else {
        toast.error('Erro ao agendar relatório');
      }
      
      return scheduleId;
      
    } catch (error) {
      console.error('Erro ao agendar relatório:', error);
      toast.error('Erro ao agendar relatório');
      return null;
    } finally {
      setState(prev => ({ ...prev, isScheduling: false }));
    }
  }, []);

  /**
   * Processa relatórios agendados
   */
  const processScheduledReports = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isProcessingScheduled: true }));
    
    try {
      await financialReportService.processScheduledReports();
      toast.success('Relatórios agendados processados com sucesso!');
      
    } catch (error) {
      console.error('Erro ao processar relatórios agendados:', error);
      toast.error('Erro ao processar relatórios agendados');
    } finally {
      setState(prev => ({ ...prev, isProcessingScheduled: false }));
    }
  }, []);

  /**
   * Gera Demonstrativo de Resultados
   */
  const generateIncomeStatement = useCallback(async (
    config: ReportConfig, 
    userId: string
  ): Promise<void> => {
    const incomeConfig = { ...config, report_type: 'INCOME_STATEMENT' as ReportType };
    const result = await generateReport(incomeConfig, userId);
    
    if (result?.status === 'COMPLETED' && result.data) {
      setState(prev => ({ ...prev, incomeStatementData: result.data }));
    }
  }, [generateReport]);

  /**
   * Gera Fluxo de Caixa
   */
  const generateCashFlow = useCallback(async (
    config: ReportConfig, 
    userId: string
  ): Promise<void> => {
    const cashFlowConfig = { ...config, report_type: 'CASH_FLOW' as ReportType };
    const result = await generateReport(cashFlowConfig, userId);
    
    if (result?.status === 'COMPLETED' && result.data) {
      setState(prev => ({ ...prev, cashFlowData: result.data }));
    }
  }, [generateReport]);

  /**
   * Gera Relatório de Contas a Receber
   */
  const generateAccountsReceivable = useCallback(async (
    config: ReportConfig, 
    userId: string
  ): Promise<void> => {
    const receivableConfig = { ...config, report_type: 'ACCOUNTS_RECEIVABLE' as ReportType };
    const result = await generateReport(receivableConfig, userId);
    
    if (result?.status === 'COMPLETED' && result.data) {
      setState(prev => ({ ...prev, accountsReceivableData: result.data }));
    }
  }, [generateReport]);

  /**
   * Gera Análise de Receitas
   */
  const generateRevenueAnalysis = useCallback(async (
    config: ReportConfig, 
    userId: string
  ): Promise<void> => {
    const revenueConfig = { ...config, report_type: 'REVENUE_ANALYSIS' as ReportType };
    const result = await generateReport(revenueConfig, userId);
    
    if (result?.status === 'COMPLETED' && result.data) {
      setState(prev => ({ ...prev, revenueAnalysisData: result.data }));
    }
  }, [generateReport]);

  /**
   * Gera Análise de Lucratividade
   */
  const generateProfitabilityAnalysis = useCallback(async (
    config: ReportConfig, 
    userId: string
  ): Promise<void> => {
    const profitabilityConfig = { ...config, report_type: 'PROFITABILITY_ANALYSIS' as ReportType };
    const result = await generateReport(profitabilityConfig, userId);
    
    if (result?.status === 'COMPLETED' && result.data) {
      setState(prev => ({ ...prev, profitabilityAnalysisData: result.data }));
    }
  }, [generateReport]);

  /**
   * Gera Análise de Variação Orçamentária
   */
  const generateBudgetVariance = useCallback(async (
    config: ReportConfig, 
    userId: string
  ): Promise<void> => {
    const budgetConfig = { ...config, report_type: 'BUDGET_VARIANCE' as ReportType };
    const result = await generateReport(budgetConfig, userId);
    
    if (result?.status === 'COMPLETED' && result.data) {
      setState(prev => ({ ...prev, budgetVarianceData: result.data }));
    }
  }, [generateReport]);

  /**
   * Limpa resultados
   */
  const clearResults = useCallback((): void => {
    setState(prev => ({
      ...prev,
      generationResult: null,
      incomeStatementData: null,
      cashFlowData: null,
      accountsReceivableData: null,
      revenueAnalysisData: null,
      profitabilityAnalysisData: null,
      budgetVarianceData: null
    }));
  }, []);

  /**
   * Limpa relatório atual
   */
  const clearCurrentReport = useCallback((): void => {
    setState(prev => ({ ...prev, currentReport: null }));
  }, []);

  /**
   * Exporta dados do relatório
   */
  const exportReportData = useCallback(async (
    reportId: string, 
    format: ReportFormat
  ): Promise<string | null> => {
    try {
      const report = await getReport(reportId);
      
      if (!report || !report.data) {
        toast.error('Dados do relatório não encontrados');
        return null;
      }

      // Gerar conteúdo baseado no formato
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'CSV':
          content = convertToCSV(report.data, report.report_type);
          filename = `${report.title}_${report.id}.csv`;
          mimeType = 'text/csv';
          break;
          
        case 'JSON':
          content = JSON.stringify(report.data, null, 2);
          filename = `${report.title}_${report.id}.json`;
          mimeType = 'application/json';
          break;
          
        default:
          toast.error('Formato de exportação não suportado');
          return null;
      }

      // Criar e baixar arquivo
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast.success('Relatório exportado com sucesso!');
      return filename;
      
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Erro ao exportar relatório');
      return null;
    }
  }, [getReport]);

  /**
   * Valida configuração do relatório
   */
  const validateReportConfig = useCallback((config: Partial<ReportConfig>): string[] => {
    const errors: string[] = [];

    if (!config.tenant_id) {
      errors.push('ID do tenant é obrigatório');
    }

    if (!config.report_type) {
      errors.push('Tipo de relatório é obrigatório');
    }

    if (!config.period_start) {
      errors.push('Data de início é obrigatória');
    }

    if (!config.period_end) {
      errors.push('Data de fim é obrigatória');
    }

    if (config.period_start && config.period_end && config.period_start >= config.period_end) {
      errors.push('Data de início deve ser anterior à data de fim');
    }

    // Validações específicas por tipo de relatório
    if (config.report_type === 'BUDGET_VARIANCE' && !config.parameters?.comparison_period) {
      errors.push('Período de comparação é obrigatório para análise de variação orçamentária');
    }

    return errors;
  }, []);

  /**
   * Formata dados do relatório para exibição
   */
  const formatReportData = useCallback((data: any, reportType: ReportType): any => {
    if (!data) return null;

    switch (reportType) {
      case 'INCOME_STATEMENT':
        return formatIncomeStatementData(data);
      case 'CASH_FLOW':
        return formatCashFlowData(data);
      case 'ACCOUNTS_RECEIVABLE':
        return formatAccountsReceivableData(data);
      case 'REVENUE_ANALYSIS':
        return formatRevenueAnalysisData(data);
      case 'PROFITABILITY_ANALYSIS':
        return formatProfitabilityAnalysisData(data);
      case 'BUDGET_VARIANCE':
        return formatBudgetVarianceData(data);
      default:
        return data;
    }
  }, []);

  return {
    // Estado
    ...state,
    
    // Ações
    generateReport,
    searchReports,
    getReport,
    deleteReport,
    scheduleReport,
    processScheduledReports,
    generateIncomeStatement,
    generateCashFlow,
    generateAccountsReceivable,
    generateRevenueAnalysis,
    generateProfitabilityAnalysis,
    generateBudgetVariance,
    clearResults,
    clearCurrentReport,
    exportReportData,
    validateReportConfig,
    formatReportData
  };
}

// Funções auxiliares para conversão e formatação

/**
 * Converte dados para CSV
 */
function convertToCSV(data: any, reportType: ReportType): string {
  switch (reportType) {
    case 'INCOME_STATEMENT':
      return convertIncomeStatementToCSV(data);
    case 'CASH_FLOW':
      return convertCashFlowToCSV(data);
    case 'ACCOUNTS_RECEIVABLE':
      return convertAccountsReceivableToCSV(data);
    case 'REVENUE_ANALYSIS':
      return convertRevenueAnalysisToCSV(data);
    case 'PROFITABILITY_ANALYSIS':
      return convertProfitabilityAnalysisToCSV(data);
    case 'BUDGET_VARIANCE':
      return convertBudgetVarianceToCSV(data);
    default:
      return JSON.stringify(data);
  }
}

function convertIncomeStatementToCSV(data: IncomeStatementData): string {
  const lines = [
    'Demonstrativo de Resultados',
    `Período: ${data.period.start} a ${data.period.end}`,
    '',
    'RECEITAS',
    `Receita Bruta,${data.revenue.gross_revenue}`,
    `Receita Líquida,${data.revenue.net_revenue}`,
    '',
    'DESPESAS',
    `Total de Despesas,${data.expenses.total_expenses}`,
    `Despesas Fixas,${data.expenses.fixed_expenses}`,
    `Despesas Variáveis,${data.expenses.variable_expenses}`,
    '',
    'LUCRO',
    `Lucro Bruto,${data.profit.gross_profit}`,
    `Lucro Líquido,${data.profit.net_profit}`,
    `Margem de Lucro (%),${data.profit.profit_margin}`
  ];
  
  return lines.join('\n');
}

function convertCashFlowToCSV(data: CashFlowData): string {
  const lines = [
    'Fluxo de Caixa',
    `Período: ${data.period.start} a ${data.period.end}`,
    '',
    'RESUMO',
    `Saldo Inicial,${data.opening_balance}`,
    `Saldo Final,${data.closing_balance}`,
    `Fluxo Líquido,${data.net_cash_flow}`,
    '',
    'ATIVIDADES OPERACIONAIS',
    `Recebimentos,${data.operating_activities.cash_receipts}`,
    `Pagamentos,${data.operating_activities.cash_payments}`,
    `Fluxo Operacional Líquido,${data.operating_activities.net_operating_cash}`,
    '',
    'SALDOS DIÁRIOS',
    'Data,Saldo,Entrada,Saída'
  ];
  
  data.daily_balances.forEach(balance => {
    lines.push(`${balance.date},${balance.balance},${balance.inflow},${balance.outflow}`);
  });
  
  return lines.join('\n');
}

function convertAccountsReceivableToCSV(data: AccountsReceivableData): string {
  const lines = [
    'Contas a Receber',
    '',
    'RESUMO',
    `Total a Receber,${data.total_receivable}`,
    `Valor em Atraso,${data.overdue_amount}`,
    `Valor Atual,${data.current_amount}`,
    '',
    'AGING',
    `Atual (0-30 dias),${data.aging_buckets.current}`,
    `31-60 dias,${data.aging_buckets.days_31_60}`,
    `61-90 dias,${data.aging_buckets.days_61_90}`,
    `91-120 dias,${data.aging_buckets.days_91_120}`,
    `Mais de 120 dias,${data.aging_buckets.over_120_days}`,
    '',
    'PRINCIPAIS DEVEDORES',
    'Cliente,Valor,Dias em Atraso'
  ];
  
  data.top_debtors.forEach(debtor => {
    lines.push(`${debtor.customer_name},${debtor.amount},${debtor.overdue_days}`);
  });
  
  return lines.join('\n');
}

function convertRevenueAnalysisToCSV(data: RevenueAnalysisData): string {
  const lines = [
    'Análise de Receitas',
    '',
    'RESUMO',
    `Receita Total,${data.total_revenue}`,
    `Receita Recorrente,${data.recurring_revenue}`,
    `Receita Única,${data.one_time_revenue}`,
    '',
    'RECEITA POR MÊS',
    'Mês,Receita,Taxa de Crescimento (%)'
  ];
  
  data.revenue_by_month.forEach(month => {
    lines.push(`${month.month},${month.revenue},${month.growth_rate}`);
  });
  
  return lines.join('\n');
}

function convertProfitabilityAnalysisToCSV(data: ProfitabilityAnalysisData): string {
  const lines = [
    'Análise de Lucratividade',
    '',
    'MARGENS',
    `Margem Bruta (%),${data.gross_margin}`,
    `Margem Líquida (%),${data.net_margin}`,
    `Margem Operacional (%),${data.operating_margin}`,
    `EBITDA,${data.ebitda}`,
    `Margem EBITDA (%),${data.ebitda_margin}`,
    '',
    'LUCRATIVIDADE POR PRODUTO',
    'Produto,Receita,Custo,Margem (%)'
  ];
  
  Object.entries(data.profitability_by_product).forEach(([product, profitability]) => {
    lines.push(`${product},${profitability.revenue},${profitability.cost},${profitability.margin}`);
  });
  
  return lines.join('\n');
}

function convertBudgetVarianceToCSV(data: BudgetVarianceData): string {
  const lines = [
    'Variação Orçamentária',
    '',
    'RESUMO GERAL',
    'Item,Orçado,Real,Variação,Variação (%)',
    `Receita,${data.budget_vs_actual.revenue.budget},${data.budget_vs_actual.revenue.actual},${data.budget_vs_actual.revenue.variance},${data.budget_vs_actual.revenue.variance_percentage}`,
    `Despesas,${data.budget_vs_actual.expenses.budget},${data.budget_vs_actual.expenses.actual},${data.budget_vs_actual.expenses.variance},${data.budget_vs_actual.expenses.variance_percentage}`,
    `Lucro,${data.budget_vs_actual.profit.budget},${data.budget_vs_actual.profit.actual},${data.budget_vs_actual.profit.variance},${data.budget_vs_actual.profit.variance_percentage}`,
    '',
    'VARIAÇÃO POR CATEGORIA',
    'Categoria,Orçado,Real,Variação,Variação (%)'
  ];
  
  Object.entries(data.variance_by_category).forEach(([category, variance]) => {
    lines.push(`${category},${variance.budget},${variance.actual},${variance.variance},${variance.variance_percentage}`);
  });
  
  return lines.join('\n');
}

// Funções de formatação para exibição

function formatIncomeStatementData(data: IncomeStatementData): any {
  return {
    ...data,
    revenue: {
      ...data.revenue,
      gross_revenue: formatCurrency(data.revenue.gross_revenue),
      net_revenue: formatCurrency(data.revenue.net_revenue)
    },
    expenses: {
      ...data.expenses,
      total_expenses: formatCurrency(data.expenses.total_expenses),
      fixed_expenses: formatCurrency(data.expenses.fixed_expenses),
      variable_expenses: formatCurrency(data.expenses.variable_expenses)
    },
    profit: {
      ...data.profit,
      gross_profit: formatCurrency(data.profit.gross_profit),
      net_profit: formatCurrency(data.profit.net_profit),
      profit_margin: formatPercentage(data.profit.profit_margin)
    }
  };
}

function formatCashFlowData(data: CashFlowData): any {
  return {
    ...data,
    opening_balance: formatCurrency(data.opening_balance),
    closing_balance: formatCurrency(data.closing_balance),
    net_cash_flow: formatCurrency(data.net_cash_flow),
    daily_balances: data.daily_balances.map(balance => ({
      ...balance,
      balance: formatCurrency(balance.balance),
      inflow: formatCurrency(balance.inflow),
      outflow: formatCurrency(balance.outflow)
    }))
  };
}

function formatAccountsReceivableData(data: AccountsReceivableData): any {
  return {
    ...data,
    total_receivable: formatCurrency(data.total_receivable),
    overdue_amount: formatCurrency(data.overdue_amount),
    current_amount: formatCurrency(data.current_amount),
    collection_efficiency: formatPercentage(data.collection_efficiency),
    top_debtors: data.top_debtors.map(debtor => ({
      ...debtor,
      amount: formatCurrency(debtor.amount)
    }))
  };
}

function formatRevenueAnalysisData(data: RevenueAnalysisData): any {
  return {
    ...data,
    total_revenue: formatCurrency(data.total_revenue),
    recurring_revenue: formatCurrency(data.recurring_revenue),
    one_time_revenue: formatCurrency(data.one_time_revenue),
    revenue_by_month: data.revenue_by_month.map(month => ({
      ...month,
      revenue: formatCurrency(month.revenue),
      growth_rate: formatPercentage(month.growth_rate)
    }))
  };
}

function formatProfitabilityAnalysisData(data: ProfitabilityAnalysisData): any {
  return {
    ...data,
    gross_margin: formatPercentage(data.gross_margin),
    net_margin: formatPercentage(data.net_margin),
    operating_margin: formatPercentage(data.operating_margin),
    ebitda: formatCurrency(data.ebitda),
    ebitda_margin: formatPercentage(data.ebitda_margin)
  };
}

function formatBudgetVarianceData(data: BudgetVarianceData): any {
  return {
    budget_vs_actual: {
      revenue: {
        ...data.budget_vs_actual.revenue,
        budget: formatCurrency(data.budget_vs_actual.revenue.budget),
        actual: formatCurrency(data.budget_vs_actual.revenue.actual),
        variance: formatCurrency(data.budget_vs_actual.revenue.variance),
        variance_percentage: formatPercentage(data.budget_vs_actual.revenue.variance_percentage)
      },
      expenses: {
        ...data.budget_vs_actual.expenses,
        budget: formatCurrency(data.budget_vs_actual.expenses.budget),
        actual: formatCurrency(data.budget_vs_actual.expenses.actual),
        variance: formatCurrency(data.budget_vs_actual.expenses.variance),
        variance_percentage: formatPercentage(data.budget_vs_actual.expenses.variance_percentage)
      },
      profit: {
        ...data.budget_vs_actual.profit,
        budget: formatCurrency(data.budget_vs_actual.profit.budget),
        actual: formatCurrency(data.budget_vs_actual.profit.actual),
        variance: formatCurrency(data.budget_vs_actual.profit.variance),
        variance_percentage: formatPercentage(data.budget_vs_actual.profit.variance_percentage)
      }
    },
    variance_by_category: Object.fromEntries(
      Object.entries(data.variance_by_category).map(([category, variance]) => [
        category,
        {
          budget: formatCurrency(variance.budget),
          actual: formatCurrency(variance.actual),
          variance: formatCurrency(variance.variance),
          variance_percentage: formatPercentage(variance.variance_percentage)
        }
      ])
    )
  };
}

// Utilitários de formatação

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatPercentage(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
}

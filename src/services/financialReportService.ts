import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Decimal from 'decimal.js';
import { financialAuditService } from './financialAuditService';

// Interfaces para Relatórios Financeiros
export interface FinancialReport {
  id?: string;
  tenant_id: string;
  report_type: ReportType;
  title: string;
  description?: string;
  period_start: Date;
  period_end: Date;
  generated_at: Date;
  generated_by: string;
  data: ReportData;
  format: ReportFormat;
  status: ReportStatus;
  file_url?: string;
  parameters?: ReportParameters;
}

export type ReportType = 
  | 'INCOME_STATEMENT' // Demonstrativo de Resultados
  | 'BALANCE_SHEET' // Balanço Patrimonial
  | 'CASH_FLOW' // Fluxo de Caixa
  | 'ACCOUNTS_RECEIVABLE' // Contas a Receber
  | 'ACCOUNTS_PAYABLE' // Contas a Pagar
  | 'AGING_REPORT' // Relatório de Vencimentos
  | 'REVENUE_ANALYSIS' // Análise de Receitas
  | 'EXPENSE_ANALYSIS' // Análise de Despesas
  | 'PROFITABILITY_ANALYSIS' // Análise de Lucratividade
  | 'BUDGET_VARIANCE' // Variação Orçamentária
  | 'TAX_REPORT' // Relatório Fiscal
  | 'CUSTOM'; // Personalizado

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
export type ReportStatus = 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ReportParameters {
  include_details?: boolean;
  group_by?: string[];
  filters?: Record<string, unknown>;
  comparison_period?: {
    start: Date;
    end: Date;
  };
  currency?: string;
  decimal_places?: number;
}

// Interfaces para Dados dos Relatórios
export interface IncomeStatementComparison {
  revenue_growth: number;
  expense_growth: number;
  profit_growth: number;
}

export interface IncomeStatementData {
  period: {
    start: Date;
    end: Date;
  };
  revenue: {
    gross_revenue: number;
    net_revenue: number;
    revenue_by_category: Record<string, number>;
  };
  expenses: {
    total_expenses: number;
    expenses_by_category: Record<string, number>;
    fixed_expenses: number;
    variable_expenses: number;
  };
  profit: {
    gross_profit: number;
    net_profit: number;
    profit_margin: number;
  };
  comparison?: IncomeStatementComparison;
}

export interface CashFlowData {
  period: {
    start: Date;
    end: Date;
  };
  opening_balance: number;
  closing_balance: number;
  operating_activities: {
    cash_receipts: number;
    cash_payments: number;
    net_operating_cash: number;
  };
  investing_activities: {
    investments: number;
    divestments: number;
    net_investing_cash: number;
  };
  financing_activities: {
    financing_received: number;
    financing_paid: number;
    net_financing_cash: number;
  };
  net_cash_flow: number;
  daily_balances: Array<{
    date: Date;
    balance: number;
    inflow: number;
    outflow: number;
  }>;
}

export interface AccountsReceivableData {
  total_receivable: number;
  overdue_amount: number;
  current_amount: number;
  aging_buckets: {
    current: number; // 0-30 dias
    days_31_60: number;
    days_61_90: number;
    days_91_120: number;
    over_120_days: number;
  };
  top_debtors: Array<{
    customer_id: string;
    customer_name: string;
    amount: number;
    overdue_days: number;
  }>;
  collection_efficiency: number;
  average_collection_period: number;
}

export interface RevenueAnalysisData {
  total_revenue: number;
  revenue_by_month: Array<{
    month: string;
    revenue: number;
    growth_rate: number;
  }>;
  revenue_by_product: Record<string, number>;
  revenue_by_customer: Record<string, number>;
  recurring_revenue: number;
  one_time_revenue: number;
  revenue_trends: {
    monthly_growth_rate: number;
    quarterly_growth_rate: number;
    annual_growth_rate: number;
  };
}

export interface ProfitabilityAnalysisData {
  gross_margin: number;
  net_margin: number;
  operating_margin: number;
  ebitda: number;
  ebitda_margin: number;
  roi: number;
  roe: number;
  profitability_by_product: Record<string, {
    revenue: number;
    cost: number;
    margin: number;
  }>;
  profitability_trends: Array<{
    period: string;
    gross_margin: number;
    net_margin: number;
  }>;
}

export interface BudgetVarianceData {
  budget_vs_actual: {
    revenue: {
      budget: number;
      actual: number;
      variance: number;
      variance_percentage: number;
    };
    expenses: {
      budget: number;
      actual: number;
      variance: number;
      variance_percentage: number;
    };
    profit: {
      budget: number;
      actual: number;
      variance: number;
      variance_percentage: number;
    };
  };
  variance_by_category: Record<string, {
    budget: number;
    actual: number;
    variance: number;
    variance_percentage: number;
  }>;
}

export type ReportData = 
  | IncomeStatementData
  | CashFlowData
  | AccountsReceivableData
  | RevenueAnalysisData
  | ProfitabilityAnalysisData
  | BudgetVarianceData
  | Record<string, unknown>; // Fallback para relatórios personalizados

// Interface para Configuração de Relatório
export interface ReportConfig {
  tenant_id: string;
  report_type: ReportType;
  period_start: Date;
  period_end: Date;
  parameters?: ReportParameters;
  format?: ReportFormat;
  title?: string;
  description?: string;
}

// Interface para Resultado de Geração
export interface ReportGenerationResult {
  report_id: string;
  status: ReportStatus;
  file_url?: string;
  data?: ReportData;
  error?: string;
}

// Interface para Filtros de Busca
export interface ReportSearchFilters {
  tenant_id: string;
  report_type?: ReportType;
  status?: ReportStatus;
  date_from?: Date;
  date_to?: Date;
  generated_by?: string;
  limit?: number;
  offset?: number;
}

// Interface para Agendamento de Relatórios
export interface ReportSchedule {
  id?: string;
  tenant_id: string;
  report_type: ReportType;
  title: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  parameters: ReportParameters;
  format: ReportFormat;
  recipients: string[]; // emails
  next_run: Date;
  last_run?: Date;
  is_active: boolean;
  created_by: string;
}

class FinancialReportService {
  /**
   * Gera um relatório financeiro
   */
  async generateReport(config: ReportConfig, userId: string): Promise<ReportGenerationResult> {
    try {
      // Registrar auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: config.tenant_id,
        user_id: userId,
        action: 'GENERATE_REPORT',
        entity_type: 'FINANCIAL_REPORT',
        entity_id: `${config.report_type}_${Date.now()}`,
        metadata: {
          report_type: config.report_type,
          period: {
            start: config.period_start,
            end: config.period_end
          },
          parameters: config.parameters
        },
        risk_level: 'LOW'
      });

      // Criar registro do relatório
      const { data: report, error: reportError } = await supabase
        .from('financial_reports')
        .insert({
          tenant_id: config.tenant_id,
          report_type: config.report_type,
          title: config.title || this.getDefaultTitle(config.report_type),
          description: config.description,
          period_start: config.period_start.toISOString(),
          period_end: config.period_end.toISOString(),
          generated_at: new Date().toISOString(),
          generated_by: userId,
          format: config.format || 'JSON',
          status: 'GENERATING',
          parameters: config.parameters
        })
        .select()
        .single();

      if (reportError) {
        throw new Error(`Erro ao criar relatório: ${reportError.message}`);
      }

      try {
        // Gerar dados do relatório
        const reportData = await this.generateReportData(config);

        // Atualizar relatório com dados
        const { error: updateError } = await supabase
          .from('financial_reports')
          .update({
            data: reportData,
            status: 'COMPLETED'
          })
          .eq('id', report.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar relatório: ${updateError.message}`);
        }

        // Gerar arquivo se necessário
        let fileUrl: string | undefined;
        if (config.format && config.format !== 'JSON') {
          fileUrl = await this.generateReportFile(report.id, reportData, config.format);
          
          // Atualizar com URL do arquivo
          await supabase
            .from('financial_reports')
            .update({ file_url: fileUrl })
            .eq('id', report.id);
        }

        return {
          report_id: report.id,
          status: 'COMPLETED',
          data: reportData,
          file_url: fileUrl
        };

      } catch (dataError) {
        // Marcar relatório como falhou
        await supabase
          .from('financial_reports')
          .update({
            status: 'FAILED',
            data: { error: dataError.message }
          })
          .eq('id', report.id);

        throw dataError;
      }

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return {
        report_id: '',
        status: 'FAILED',
        error: error.message
      };
    }
  }

  /**
   * Gera dados específicos do relatório baseado no tipo
   */
  private async generateReportData(config: ReportConfig): Promise<ReportData> {
    switch (config.report_type) {
      case 'INCOME_STATEMENT':
        return await this.generateIncomeStatement(config);
      case 'CASH_FLOW':
        return await this.generateCashFlow(config);
      case 'ACCOUNTS_RECEIVABLE':
        return await this.generateAccountsReceivable(config);
      case 'REVENUE_ANALYSIS':
        return await this.generateRevenueAnalysis(config);
      case 'PROFITABILITY_ANALYSIS':
        return await this.generateProfitabilityAnalysis(config);
      case 'BUDGET_VARIANCE':
        return await this.generateBudgetVariance(config);
      default:
        throw new Error(`Tipo de relatório não suportado: ${config.report_type}`);
    }
  }

  /**
   * Gera Demonstrativo de Resultados
   */
  private async generateIncomeStatement(config: ReportConfig): Promise<IncomeStatementData> {
    // Buscar receitas
    const { data: revenues } = await supabase
      .from('contract_billings')
      .select('net_amount, payment_date')
      .eq('tenant_id', config.tenant_id)
      .gte('due_date', config.period_start.toISOString())
      .lte('due_date', config.period_end.toISOString())
      .eq('status', 'PAID');

    // Buscar despesas
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category, expense_date, is_fixed')
      .eq('tenant_id', config.tenant_id)
      .gte('expense_date', config.period_start.toISOString())
      .lte('expense_date', config.period_end.toISOString());

    // Calcular receitas
    const grossRevenue = revenues?.reduce((sum, rev) => sum + rev.net_amount, 0) || 0;
    const netRevenue = grossRevenue; // Assumindo sem deduções por simplicidade
    
    const revenueByCategory = revenues?.reduce((acc, rev) => {
      acc['Faturamentos'] = (acc['Faturamentos'] || 0) + rev.net_amount;
      return acc;
    }, {} as Record<string, number>) || {};

    // Calcular despesas
    const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
    const fixedExpenses = expenses?.filter(exp => exp.is_fixed).reduce((sum, exp) => sum + exp.amount, 0) || 0;
    const variableExpenses = totalExpenses - fixedExpenses;
    
    const expensesByCategory = expenses?.reduce((acc, exp) => {
      acc[exp.category || 'Outros'] = (acc[exp.category || 'Outros'] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>) || {};

    // Calcular lucros
    const grossProfit = grossRevenue - totalExpenses;
    const netProfit = netRevenue - totalExpenses;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    // Comparação com período anterior (se solicitado)
    let comparison: IncomeStatementComparison | undefined = undefined;
    if (config.parameters?.comparison_period) {
      const prevPeriodConfig = {
        ...config,
        period_start: config.parameters.comparison_period.start,
        period_end: config.parameters.comparison_period.end
      };
      const prevData = await this.generateIncomeStatement(prevPeriodConfig);
      
      comparison = {
        revenue_growth: prevData.revenue.net_revenue > 0 ? 
          ((netRevenue - prevData.revenue.net_revenue) / prevData.revenue.net_revenue) * 100 : 0,
        expense_growth: prevData.expenses.total_expenses > 0 ? 
          ((totalExpenses - prevData.expenses.total_expenses) / prevData.expenses.total_expenses) * 100 : 0,
        profit_growth: prevData.profit.net_profit !== 0 ? 
          ((netProfit - prevData.profit.net_profit) / Math.abs(prevData.profit.net_profit)) * 100 : 0
      };
    }

    return {
      period: {
        start: config.period_start,
        end: config.period_end
      },
      revenue: {
        gross_revenue: grossRevenue,
        net_revenue: netRevenue,
        revenue_by_category: revenueByCategory
      },
      expenses: {
        total_expenses: totalExpenses,
        expenses_by_category: expensesByCategory,
        fixed_expenses: fixedExpenses,
        variable_expenses: variableExpenses
      },
      profit: {
        gross_profit: grossProfit,
        net_profit: netProfit,
        profit_margin: profitMargin
      },
      comparison
    };
  }

  /**
   * Gera Fluxo de Caixa
   */
  private async generateCashFlow(config: ReportConfig): Promise<CashFlowData> {
    // Buscar saldo inicial
    const { data: initialBalance } = await supabase
      .from('cash_balances')
      .select('balance')
      .eq('tenant_id', config.tenant_id)
      .lte('date', config.period_start.toISOString())
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const openingBalance = initialBalance?.balance || 0;

    // Buscar movimentações do período
    const { data: transactions } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('tenant_id', config.tenant_id)
      .gte('transaction_date', config.period_start.toISOString())
      .lte('transaction_date', config.period_end.toISOString())
      .order('transaction_date');

    // Categorizar transações
    const operatingReceipts = transactions?.filter(t => 
      t.type === 'INFLOW' && t.category === 'OPERATING'
    ).reduce((sum, t) => sum + t.amount, 0) || 0;

    const operatingPayments = transactions?.filter(t => 
      t.type === 'OUTFLOW' && t.category === 'OPERATING'
    ).reduce((sum, t) => sum + t.amount, 0) || 0;

    const investments = transactions?.filter(t => 
      t.type === 'OUTFLOW' && t.category === 'INVESTING'
    ).reduce((sum, t) => sum + t.amount, 0) || 0;

    const divestments = transactions?.filter(t => 
      t.type === 'INFLOW' && t.category === 'INVESTING'
    ).reduce((sum, t) => sum + t.amount, 0) || 0;

    const financingReceived = transactions?.filter(t => 
      t.type === 'INFLOW' && t.category === 'FINANCING'
    ).reduce((sum, t) => sum + t.amount, 0) || 0;

    const financingPaid = transactions?.filter(t => 
      t.type === 'OUTFLOW' && t.category === 'FINANCING'
    ).reduce((sum, t) => sum + t.amount, 0) || 0;

    // Calcular fluxos líquidos
    const netOperatingCash = operatingReceipts - operatingPayments;
    const netInvestingCash = divestments - investments;
    const netFinancingCash = financingReceived - financingPaid;
    const netCashFlow = netOperatingCash + netInvestingCash + netFinancingCash;
    const closingBalance = openingBalance + netCashFlow;

    // Gerar saldos diários
    const dailyBalances: Array<{
      date: Date;
      balance: number;
      inflow: number;
      outflow: number;
    }> = [];

    let currentBalance = openingBalance;
    const currentDate = new Date(config.period_start);
    const endDate = new Date(config.period_end);

    while (currentDate <= endDate) {
      const dayTransactions = transactions?.filter(t => 
        format(new Date(t.transaction_date), 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
      ) || [];

      const dayInflow = dayTransactions.filter(t => t.type === 'INFLOW').reduce((sum, t) => sum + t.amount, 0);
      const dayOutflow = dayTransactions.filter(t => t.type === 'OUTFLOW').reduce((sum, t) => sum + t.amount, 0);
      
      currentBalance += dayInflow - dayOutflow;

      dailyBalances.push({
        date: new Date(currentDate),
        balance: currentBalance,
        inflow: dayInflow,
        outflow: dayOutflow
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      period: {
        start: config.period_start,
        end: config.period_end
      },
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      operating_activities: {
        cash_receipts: operatingReceipts,
        cash_payments: operatingPayments,
        net_operating_cash: netOperatingCash
      },
      investing_activities: {
        investments,
        divestments,
        net_investing_cash: netInvestingCash
      },
      financing_activities: {
        financing_received: financingReceived,
        financing_paid: financingPaid,
        net_financing_cash: netFinancingCash
      },
      net_cash_flow: netCashFlow,
      daily_balances: dailyBalances
    };
  }

  /**
   * Gera Relatório de Contas a Receber
   */
  private async generateAccountsReceivable(config: ReportConfig): Promise<AccountsReceivableData> {
    // Buscar cobranças pendentes
    const { data: receivables } = await supabase
      .from('contract_billings')
      .select(`
        *,
        contracts!inner (
          customer_id,
          customers (
            name
          )
        )
      `)
      .eq('tenant_id', config.tenant_id)
      .in('status', ['PENDING', 'OVERDUE'])
      .lte('due_date', config.period_end.toISOString());

    const totalReceivable = receivables?.reduce((sum, bill) => sum + bill.net_amount, 0) || 0;
    
    const now = new Date();
    const overdueAmount = receivables?.filter(bill => 
      new Date(bill.due_date) < now
    ).reduce((sum, bill) => sum + bill.net_amount, 0) || 0;
    
    const currentAmount = totalReceivable - overdueAmount;

    // Calcular aging buckets
    const agingBuckets = {
      current: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_91_120: 0,
      over_120_days: 0
    };

    receivables?.forEach(bill => {
      const dueDate = new Date(bill.due_date);
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysPastDue <= 0) {
        agingBuckets.current += bill.net_amount;
      } else if (daysPastDue <= 60) {
        agingBuckets.days_31_60 += bill.net_amount;
      } else if (daysPastDue <= 90) {
        agingBuckets.days_61_90 += bill.net_amount;
      } else if (daysPastDue <= 120) {
        agingBuckets.days_91_120 += bill.net_amount;
      } else {
        agingBuckets.over_120_days += bill.net_amount;
      }
    });

    // Top devedores
    const debtorMap = new Map<string, { name: string; amount: number; maxOverdueDays: number }>();
    
    receivables?.forEach(bill => {
      const customerId = bill.contracts?.customer_id;
      const customerName = bill.contracts?.customers?.name || 'Cliente Desconhecido';
      const dueDate = new Date(bill.due_date);
      const daysPastDue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      if (debtorMap.has(customerId)) {
        const existing = debtorMap.get(customerId)!;
        existing.amount += bill.net_amount;
        existing.maxOverdueDays = Math.max(existing.maxOverdueDays, daysPastDue);
      } else {
        debtorMap.set(customerId, {
          name: customerName,
          amount: bill.net_amount,
          maxOverdueDays: daysPastDue
        });
      }
    });

    const topDebtors = Array.from(debtorMap.entries())
      .map(([customerId, data]) => ({
        customer_id: customerId,
        customer_name: data.name,
        amount: data.amount,
        overdue_days: data.maxOverdueDays
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Calcular eficiência de cobrança
    const { data: paidBills } = await supabase
      .from('contract_billings')
      .select('due_date, payment_date')
      .eq('tenant_id', config.tenant_id)
      .eq('status', 'PAID')
      .gte('payment_date', config.period_start.toISOString())
      .lte('payment_date', config.period_end.toISOString());

    const totalPaidBills = paidBills?.length || 0;
    const paidOnTime = paidBills?.filter(bill => 
      new Date(bill.payment_date) <= new Date(bill.due_date)
    ).length || 0;
    
    const collectionEfficiency = totalPaidBills > 0 ? (paidOnTime / totalPaidBills) * 100 : 0;
    
    const averageCollectionPeriod = paidBills?.length ? 
      paidBills.reduce((sum, bill) => {
        const dueDate = new Date(bill.due_date);
        const paidDate = new Date(bill.payment_date);
        const days = Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + Math.max(0, days);
      }, 0) / paidBills.length : 0;

    return {
      total_receivable: totalReceivable,
      overdue_amount: overdueAmount,
      current_amount: currentAmount,
      aging_buckets: agingBuckets,
      top_debtors: topDebtors,
      collection_efficiency: collectionEfficiency,
      average_collection_period: averageCollectionPeriod
    };
  }

  /**
   * Gera Análise de Receitas
   */
  private async generateRevenueAnalysis(config: ReportConfig): Promise<RevenueAnalysisData> {
    // Buscar receitas do período
    const { data: revenues } = await supabase
      .from('contract_billings')
      .select(`
        *,
        contracts!inner (
          customer_id,
          title,
          contract_type,
          customers (
            name
          )
        )
      `)
      .eq('tenant_id', config.tenant_id)
      .eq('status', 'PAID')
      .gte('payment_date', config.period_start.toISOString())
      .lte('payment_date', config.period_end.toISOString());

    const totalRevenue = revenues?.reduce((sum, rev) => sum + rev.net_amount, 0) || 0;

    // Receita por mês
    const revenueByMonth: Array<{ month: string; revenue: number; growth_rate: number }> = [];
    const monthlyData = new Map<string, number>();
    
    revenues?.forEach(rev => {
      const month = format(new Date(rev.payment_date), 'yyyy-MM');
      monthlyData.set(month, (monthlyData.get(month) || 0) + rev.net_amount);
    });

    const sortedMonths = Array.from(monthlyData.keys()).sort();
    sortedMonths.forEach((month, index) => {
      const revenue = monthlyData.get(month) || 0;
      const prevRevenue = index > 0 ? monthlyData.get(sortedMonths[index - 1]) || 0 : 0;
      const growthRate = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
      
      revenueByMonth.push({
        month: format(new Date(month + '-01'), 'MMM yyyy', { locale: ptBR }),
        revenue,
        growth_rate: growthRate
      });
    });

    // Receita por produto/serviço
    const revenueByProduct: Record<string, number> = {};
    revenues?.forEach(rev => {
      const product = rev.contracts?.title || rev.description || 'Outros';
      revenueByProduct[product] = (revenueByProduct[product] || 0) + rev.net_amount;
    });

    // Receita por cliente
    const revenueByCustomer: Record<string, number> = {};
    revenues?.forEach(rev => {
      const customer = rev.contracts?.customers?.name || 'Cliente Desconhecido';
      revenueByCustomer[customer] = (revenueByCustomer[customer] || 0) + rev.net_amount;
    });

    // Receita recorrente vs única
    const recurringRevenue = revenues?.filter(rev => 
      rev.contracts?.contract_type === 'SUBSCRIPTION_CONTRACT' || 
      rev.billing_cycle !== 'ONE_TIME'
    ).reduce((sum, rev) => sum + rev.net_amount, 0) || 0;
    
    const oneTimeRevenue = totalRevenue - recurringRevenue;

    // Tendências de crescimento
    const monthlyGrowthRates = revenueByMonth.slice(1).map(m => m.growth_rate);
    const monthlyGrowthRate = monthlyGrowthRates.length > 0 ? 
      monthlyGrowthRates.reduce((sum, rate) => sum + rate, 0) / monthlyGrowthRates.length : 0;

    // Para crescimento trimestral e anual, seria necessário mais dados históricos
    const quarterlyGrowthRate = 0; // Simplificado
    const annualGrowthRate = 0; // Simplificado

    return {
      total_revenue: totalRevenue,
      revenue_by_month: revenueByMonth,
      revenue_by_product: revenueByProduct,
      revenue_by_customer: revenueByCustomer,
      recurring_revenue: recurringRevenue,
      one_time_revenue: oneTimeRevenue,
      revenue_trends: {
        monthly_growth_rate: monthlyGrowthRate,
        quarterly_growth_rate: quarterlyGrowthRate,
        annual_growth_rate: annualGrowthRate
      }
    };
  }

  /**
   * Gera Análise de Lucratividade
   */
  private async generateProfitabilityAnalysis(config: ReportConfig): Promise<ProfitabilityAnalysisData> {
    // Buscar dados de receita e despesas
    const incomeData = await this.generateIncomeStatement(config);
    
    const grossRevenue = incomeData.revenue.gross_revenue;
    const netRevenue = incomeData.revenue.net_revenue;
    const totalExpenses = incomeData.expenses.total_expenses;
    const grossProfit = incomeData.profit.gross_profit;
    const netProfit = incomeData.profit.net_profit;

    // Calcular margens
    const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
    const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
    const operatingMargin = netMargin; // Simplificado

    // EBITDA (simplificado - sem depreciação e amortização)
    const ebitda = netProfit; // Simplificado
    const ebitdaMargin = netRevenue > 0 ? (ebitda / netRevenue) * 100 : 0;

    // ROI e ROE (simplificados)
    const roi = 0; // Necessário dados de investimento
    const roe = 0; // Necessário dados de patrimônio

    // Lucratividade por produto (simplificado)
    const profitabilityByProduct: Record<string, { revenue: number; cost: number; margin: number }> = {};
    Object.entries(incomeData.revenue.revenue_by_category).forEach(([category, revenue]) => {
      const cost = incomeData.expenses.expenses_by_category[category] || 0;
      const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
      
      profitabilityByProduct[category] = {
        revenue,
        cost,
        margin
      };
    });

    // Tendências de lucratividade (simplificado)
    const profitabilityTrends: Array<{
      period: string;
      gross_margin: number;
      net_margin: number;
    }> = [{
      period: format(config.period_start, 'MMM yyyy', { locale: ptBR }),
      gross_margin: grossMargin,
      net_margin: netMargin
    }];

    return {
      gross_margin: grossMargin,
      net_margin: netMargin,
      operating_margin: operatingMargin,
      ebitda,
      ebitda_margin: ebitdaMargin,
      roi,
      roe,
      profitability_by_product: profitabilityByProduct,
      profitability_trends: profitabilityTrends
    };
  }

  /**
   * Gera Análise de Variação Orçamentária
   */
  private async generateBudgetVariance(config: ReportConfig): Promise<BudgetVarianceData> {
    // Buscar dados orçamentários
    const { data: budgets } = await supabase
      .from('budgets')
      .select('*')
      .eq('tenant_id', config.tenant_id)
      .gte('period_start', config.period_start.toISOString())
      .lte('period_end', config.period_end.toISOString());

    // Buscar dados reais
    const actualData = await this.generateIncomeStatement(config);

    // Calcular orçamento total
    const budgetRevenue = budgets?.filter(b => b.type === 'REVENUE').reduce((sum, b) => sum + b.amount, 0) || 0;
    const budgetExpenses = budgets?.filter(b => b.type === 'EXPENSE').reduce((sum, b) => sum + b.amount, 0) || 0;
    const budgetProfit = budgetRevenue - budgetExpenses;

    // Dados reais
    const actualRevenue = actualData.revenue.net_revenue;
    const actualExpenses = actualData.expenses.total_expenses;
    const actualProfit = actualData.profit.net_profit;

    // Calcular variações
    const revenueVariance = actualRevenue - budgetRevenue;
    const revenueVariancePercentage = budgetRevenue > 0 ? (revenueVariance / budgetRevenue) * 100 : 0;

    const expenseVariance = actualExpenses - budgetExpenses;
    const expenseVariancePercentage = budgetExpenses > 0 ? (expenseVariance / budgetExpenses) * 100 : 0;

    const profitVariance = actualProfit - budgetProfit;
    const profitVariancePercentage = budgetProfit !== 0 ? (profitVariance / Math.abs(budgetProfit)) * 100 : 0;

    // Variação por categoria
    const varianceByCategory: Record<string, {
      budget: number;
      actual: number;
      variance: number;
      variance_percentage: number;
    }> = {};

    // Agrupar orçamentos por categoria
    const budgetByCategory = new Map<string, number>();
    budgets?.forEach(budget => {
      const category = budget.category || 'Outros';
      budgetByCategory.set(category, (budgetByCategory.get(category) || 0) + budget.amount);
    });

    // Combinar com dados reais
    const allCategories = new Set([
      ...Object.keys(actualData.revenue.revenue_by_category),
      ...Object.keys(actualData.expenses.expenses_by_category),
      ...budgetByCategory.keys()
    ]);

    allCategories.forEach(category => {
      const budgetAmount = budgetByCategory.get(category) || 0;
      const actualAmount = (actualData.revenue.revenue_by_category[category] || 0) + 
                          (actualData.expenses.expenses_by_category[category] || 0);
      const variance = actualAmount - budgetAmount;
      const variancePercentage = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;

      varianceByCategory[category] = {
        budget: budgetAmount,
        actual: actualAmount,
        variance,
        variance_percentage: variancePercentage
      };
    });

    return {
      budget_vs_actual: {
        revenue: {
          budget: budgetRevenue,
          actual: actualRevenue,
          variance: revenueVariance,
          variance_percentage: revenueVariancePercentage
        },
        expenses: {
          budget: budgetExpenses,
          actual: actualExpenses,
          variance: expenseVariance,
          variance_percentage: expenseVariancePercentage
        },
        profit: {
          budget: budgetProfit,
          actual: actualProfit,
          variance: profitVariance,
          variance_percentage: profitVariancePercentage
        }
      },
      variance_by_category: varianceByCategory
    };
  }

  /**
   * Busca relatórios existentes
   */
  async searchReports(filters: ReportSearchFilters): Promise<{
    reports: FinancialReport[];
    total: number;
  }> {
    try {
      let query = supabase
        .from('financial_reports')
        .select('*', { count: 'exact' })
        .eq('tenant_id', filters.tenant_id);

      if (filters.report_type) {
        query = query.eq('report_type', filters.report_type);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.date_from) {
        query = query.gte('generated_at', filters.date_from.toISOString());
      }

      if (filters.date_to) {
        query = query.lte('generated_at', filters.date_to.toISOString());
      }

      if (filters.generated_by) {
        query = query.eq('generated_by', filters.generated_by);
      }

      query = query
        .order('generated_at', { ascending: false })
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Erro ao buscar relatórios: ${error.message}`);
      }

      return {
        reports: data || [],
        total: count || 0
      };

    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
      throw error;
    }
  }

  /**
   * Obtém um relatório específico
   */
  async getReport(reportId: string): Promise<FinancialReport | null> {
    try {
      const { data, error } = await supabase
        .from('financial_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar relatório: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      return null;
    }
  }

  /**
   * Exclui um relatório
   */
  async deleteReport(reportId: string, userId: string): Promise<boolean> {
    try {
      // Buscar relatório para auditoria
      const report = await this.getReport(reportId);
      if (!report) {
        throw new Error('Relatório não encontrado');
      }

      // Registrar auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: report.tenant_id,
        user_id: userId,
        action: 'DELETE_REPORT',
        entity_type: 'FINANCIAL_REPORT',
        entity_id: reportId,
        metadata: {
          report_type: report.report_type,
          title: report.title
        },
        risk_level: 'MEDIUM'
      });

      // Excluir relatório
      const { error } = await supabase
        .from('financial_reports')
        .delete()
        .eq('id', reportId);

      if (error) {
        throw new Error(`Erro ao excluir relatório: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.error('Erro ao excluir relatório:', error);
      return false;
    }
  }

  /**
   * Gera arquivo do relatório
   */
  private async generateReportFile(reportId: string, data: unknown, format: ReportFormat): Promise<string> {
    // Implementação simplificada - em produção, usar biblioteca específica
    switch (format) {
      case 'CSV':
        return await this.generateCSVFile(reportId, data);
      case 'PDF':
        return await this.generatePDFFile(reportId, data);
      case 'EXCEL':
        return await this.generateExcelFile(reportId, data);
      default:
        throw new Error(`Formato não suportado: ${format}`);
    }
  }

  private async generateCSVFile(reportId: string, data: unknown): Promise<string> {
    // Implementação simplificada
    const csvContent = JSON.stringify(data);
    // Em produção, usar biblioteca CSV e upload para storage
    return `https://storage.example.com/reports/${reportId}.csv`;
  }

  private async generatePDFFile(reportId: string, data: unknown): Promise<string> {
    // Implementação simplificada
    // Em produção, usar biblioteca PDF como jsPDF ou Puppeteer
    return `https://storage.example.com/reports/${reportId}.pdf`;
  }

  private async generateExcelFile(reportId: string, data: unknown): Promise<string> {
    // Implementação simplificada
    // Em produção, usar biblioteca Excel como ExcelJS
    return `https://storage.example.com/reports/${reportId}.xlsx`;
  }

  /**
   * Obtém título padrão para tipo de relatório
   */
  private getDefaultTitle(reportType: ReportType): string {
    const titles = {
      'INCOME_STATEMENT': 'Demonstrativo de Resultados',
      'BALANCE_SHEET': 'Balanço Patrimonial',
      'CASH_FLOW': 'Fluxo de Caixa',
      'ACCOUNTS_RECEIVABLE': 'Contas a Receber',
      'ACCOUNTS_PAYABLE': 'Contas a Pagar',
      'AGING_REPORT': 'Relatório de Vencimentos',
      'REVENUE_ANALYSIS': 'Análise de Receitas',
      'EXPENSE_ANALYSIS': 'Análise de Despesas',
      'PROFITABILITY_ANALYSIS': 'Análise de Lucratividade',
      'BUDGET_VARIANCE': 'Variação Orçamentária',
      'TAX_REPORT': 'Relatório Fiscal',
      'CUSTOM': 'Relatório Personalizado'
    };
    
    return titles[reportType] || 'Relatório Financeiro';
  }

  /**
   * Agenda relatório recorrente
   */
  async scheduleReport(schedule: Omit<ReportSchedule, 'id'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('report_schedules')
        .insert(schedule)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao agendar relatório: ${error.message}`);
      }

      return data.id;

    } catch (error) {
      console.error('Erro ao agendar relatório:', error);
      return null;
    }
  }

  /**
   * Processa relatórios agendados
   */
  async processScheduledReports(): Promise<void> {
    try {
      const now = new Date();
      
      const { data: schedules } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('is_active', true)
        .lte('next_run', now.toISOString());

      for (const schedule of schedules || []) {
        try {
          // Gerar relatório
          const config: ReportConfig = {
            tenant_id: schedule.tenant_id,
            report_type: schedule.report_type,
            period_start: this.calculatePeriodStart(schedule.frequency),
            period_end: this.calculatePeriodEnd(schedule.frequency),
            parameters: schedule.parameters,
            format: schedule.format,
            title: schedule.title
          };

          const result = await this.generateReport(config, schedule.created_by);

          if (result.status === 'COMPLETED') {
            // Enviar por email (implementação simplificada)
            await this.sendReportByEmail(result.report_id, schedule.recipients);
          }

          // Atualizar próxima execução
          const nextRun = this.calculateNextRun(schedule.frequency, now);
          await supabase
            .from('report_schedules')
            .update({
              last_run: now.toISOString(),
              next_run: nextRun.toISOString()
            })
            .eq('id', schedule.id);

        } catch (error) {
          console.error(`Erro ao processar relatório agendado ${schedule.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Erro ao processar relatórios agendados:', error);
    }
  }

  private calculatePeriodStart(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'DAILY':
        return startOfMonth(now);
      case 'WEEKLY':
        return startOfMonth(now);
      case 'MONTHLY':
        return startOfMonth(subMonths(now, 1));
      case 'QUARTERLY':
        return startOfMonth(subMonths(now, 3));
      case 'ANNUALLY':
        return startOfYear(now);
      default:
        return startOfMonth(now);
    }
  }

  private calculatePeriodEnd(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'DAILY':
        return endOfMonth(now);
      case 'WEEKLY':
        return endOfMonth(now);
      case 'MONTHLY':
        return endOfMonth(subMonths(now, 1));
      case 'QUARTERLY':
        return endOfMonth(subMonths(now, 1));
      case 'ANNUALLY':
        return endOfYear(subMonths(now, 12));
      default:
        return endOfMonth(now);
    }
  }

  private calculateNextRun(frequency: string, lastRun: Date): Date {
    switch (frequency) {
      case 'DAILY':
        return addMonths(lastRun, 0); // Próximo dia
      case 'WEEKLY':
        return addMonths(lastRun, 0); // Próxima semana
      case 'MONTHLY':
        return addMonths(lastRun, 1);
      case 'QUARTERLY':
        return addMonths(lastRun, 3);
      case 'ANNUALLY':
        return addMonths(lastRun, 12);
      default:
        return addMonths(lastRun, 1);
    }
  }

  private async sendReportByEmail(reportId: string, recipients: string[]): Promise<void> {
    // Implementação simplificada
    console.log(`Enviando relatório ${reportId} para:`, recipients);
    // Em produção, integrar com serviço de email
  }
}

export const financialReportService = new FinancialReportService();

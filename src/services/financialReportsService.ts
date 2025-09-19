import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type FinanceEntry = Database['public']['Tables']['finance_entries']['Row'];
type Charge = Database['public']['Tables']['charges']['Row'];
type Contract = Database['public']['Tables']['contracts']['Row'];

export interface FinancialSummary {
  period: string;
  total_receivable: number;
  total_received: number;
  total_pending: number;
  total_overdue: number;
  total_cancelled: number;
  receivable_count: number;
  received_count: number;
  pending_count: number;
  overdue_count: number;
  cancelled_count: number;
  average_ticket: number;
  collection_rate: number; // Taxa de cobrança
  overdue_rate: number; // Taxa de inadimplência
}

export interface CashFlowData {
  date: string;
  inflow: number; // Entradas
  outflow: number; // Saídas
  balance: number; // Saldo
  accumulated_balance: number; // Saldo acumulado
}

export interface RevenueByPeriod {
  period: string;
  revenue: number;
  growth_rate?: number;
  contracts_count: number;
  average_contract_value: number;
}

export interface CustomerAnalysis {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  total_contracts: number;
  average_contract_value: number;
  payment_behavior: 'excellent' | 'good' | 'regular' | 'poor';
  overdue_rate: number;
  last_payment_date?: string;
  risk_score: number; // 0-100
}

export interface GatewayPerformance {
  gateway: string;
  total_charges: number;
  total_amount: number;
  success_rate: number;
  average_processing_time?: number;
  fees_paid?: number;
}

export interface ServicePerformance {
  service_id: string;
  service_name: string;
  total_revenue: number;
  active_contracts: number;
  churn_rate: number;
  average_monthly_revenue: number;
  growth_rate: number;
}

export interface FinancialForecast {
  period: string;
  predicted_revenue: number;
  confidence_level: number;
  factors: string[];
}

class FinancialReportsService {
  /**
   * Gera resumo financeiro para um período
   */
  async getFinancialSummary(
    tenant_id: string,
    start_date: Date,
    end_date: Date
  ): Promise<FinancialSummary> {
    const { data, error } = await supabase
      .from('finance_entries')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('type', 'RECEIVABLE')
      .gte('due_date', start_date.toISOString())
      .lte('due_date', end_date.toISOString());

    if (error) {
      throw new Error(`Erro ao buscar dados financeiros: ${error.message}`);
    }

    const entries = data || [];
    const period = `${start_date.toISOString().split('T')[0]} - ${end_date.toISOString().split('T')[0]}`;

    // Calcular métricas
    const total_receivable = entries.reduce((sum, entry) => sum + entry.gross_amount, 0);
    const received_entries = entries.filter(e => e.status === 'paid');
    const pending_entries = entries.filter(e => e.status === 'pending');
    const overdue_entries = entries.filter(e => e.status === 'overdue');
    const cancelled_entries = entries.filter(e => e.status === 'cancelled');

    const total_received = received_entries.reduce((sum, entry) => sum + entry.net_amount, 0);
    const total_pending = pending_entries.reduce((sum, entry) => sum + entry.gross_amount, 0);
    const total_overdue = overdue_entries.reduce((sum, entry) => sum + entry.gross_amount, 0);
    const total_cancelled = cancelled_entries.reduce((sum, entry) => sum + entry.gross_amount, 0);

    const collection_rate = total_receivable > 0 ? (total_received / total_receivable) * 100 : 0;
    const overdue_rate = total_receivable > 0 ? (total_overdue / total_receivable) * 100 : 0;
    const average_ticket = entries.length > 0 ? total_receivable / entries.length : 0;

    return {
      period,
      total_receivable,
      total_received,
      total_pending,
      total_overdue,
      total_cancelled,
      receivable_count: entries.length,
      received_count: received_entries.length,
      pending_count: pending_entries.length,
      overdue_count: overdue_entries.length,
      cancelled_count: cancelled_entries.length,
      average_ticket,
      collection_rate,
      overdue_rate
    };
  }

  /**
   * Gera dados de fluxo de caixa
   */
  async getCashFlowData(
    tenant_id: string,
    start_date: Date,
    end_date: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<CashFlowData[]> {
    // Buscar entradas (recebimentos)
    const { data: inflows, error: inflowError } = await supabase
      .from('finance_entries')
      .select('payment_date, net_amount')
      .eq('tenant_id', tenant_id)
      .eq('type', 'RECEIVABLE')
      .eq('status', 'paid')
      .gte('payment_date', start_date.toISOString())
      .lte('payment_date', end_date.toISOString())
      .not('payment_date', 'is', null);

    if (inflowError) {
      throw new Error(`Erro ao buscar recebimentos: ${inflowError.message}`);
    }

    // Buscar saídas (pagamentos)
    const { data: outflows, error: outflowError } = await supabase
      .from('finance_entries')
      .select('payment_date, net_amount')
      .eq('tenant_id', tenant_id)
      .eq('type', 'PAYABLE')
      .eq('status', 'paid')
      .gte('payment_date', start_date.toISOString())
      .lte('payment_date', end_date.toISOString())
      .not('payment_date', 'is', null);

    if (outflowError) {
      throw new Error(`Erro ao buscar pagamentos: ${outflowError.message}`);
    }

    // Agrupar por período
    const cashFlowMap = new Map<string, { inflow: number; outflow: number }>();
    
    // Processar entradas
    (inflows || []).forEach(entry => {
      const date = this.formatDateByInterval(new Date(entry.payment_date!), interval);
      const current = cashFlowMap.get(date) || { inflow: 0, outflow: 0 };
      current.inflow += entry.net_amount;
      cashFlowMap.set(date, current);
    });

    // Processar saídas
    (outflows || []).forEach(entry => {
      const date = this.formatDateByInterval(new Date(entry.payment_date!), interval);
      const current = cashFlowMap.get(date) || { inflow: 0, outflow: 0 };
      current.outflow += entry.net_amount;
      cashFlowMap.set(date, current);
    });

    // Converter para array e calcular saldos
    const cashFlowData: CashFlowData[] = [];
    let accumulated_balance = 0;

    Array.from(cashFlowMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        const balance = data.inflow - data.outflow;
        accumulated_balance += balance;
        
        cashFlowData.push({
          date,
          inflow: data.inflow,
          outflow: data.outflow,
          balance,
          accumulated_balance
        });
      });

    return cashFlowData;
  }

  /**
   * Gera análise de receita por período
   */
  async getRevenueByPeriod(
    tenant_id: string,
    start_date: Date,
    end_date: Date,
    interval: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<RevenueByPeriod[]> {
    const { data, error } = await supabase
      .from('finance_entries')
      .select(`
        payment_date,
        net_amount,
        contract_id
      `)
      .eq('tenant_id', tenant_id)
      .eq('type', 'RECEIVABLE')
      .eq('status', 'paid')
      .gte('payment_date', start_date.toISOString())
      .lte('payment_date', end_date.toISOString())
      .not('payment_date', 'is', null);

    if (error) {
      throw new Error(`Erro ao buscar receitas: ${error.message}`);
    }

    // Agrupar por período
    const revenueMap = new Map<string, {
      revenue: number;
      contracts: Set<string>;
      total_amount: number;
      count: number;
    }>();

    (data || []).forEach(entry => {
      const period = this.formatDateByInterval(new Date(entry.payment_date!), interval);
      const current = revenueMap.get(period) || {
        revenue: 0,
        contracts: new Set(),
        total_amount: 0,
        count: 0
      };
      
      current.revenue += entry.net_amount;
      current.total_amount += entry.net_amount;
      current.count += 1;
      if (entry.contract_id) {
        current.contracts.add(entry.contract_id);
      }
      
      revenueMap.set(period, current);
    });

    // Converter para array e calcular crescimento
    const revenueData: RevenueByPeriod[] = [];
    const sortedEntries = Array.from(revenueMap.entries()).sort(([a], [b]) => a.localeCompare(b));

    sortedEntries.forEach(([period, data], index) => {
      let growth_rate: number | undefined;
      
      if (index > 0) {
        const previousRevenue = sortedEntries[index - 1][1].revenue;
        growth_rate = previousRevenue > 0 
          ? ((data.revenue - previousRevenue) / previousRevenue) * 100 
          : 0;
      }

      revenueData.push({
        period,
        revenue: data.revenue,
        growth_rate,
        contracts_count: data.contracts.size,
        average_contract_value: data.contracts.size > 0 ? data.revenue / data.contracts.size : 0
      });
    });

    return revenueData;
  }

  /**
   * Gera análise de clientes
   */
  async getCustomerAnalysis(
    tenant_id: string,
    limit: number = 50
  ): Promise<CustomerAnalysis[]> {
    const { data, error } = await supabase
      .from('finance_entries')
      .select(`
        customer_id,
        net_amount,
        status,
        payment_date,
        due_date,
        contract_id,
        customer:customers(name)
      `)
      .eq('tenant_id', tenant_id)
      .eq('type', 'RECEIVABLE');

    if (error) {
      throw new Error(`Erro ao buscar dados de clientes: ${error.message}`);
    }

    // Agrupar por cliente
    const customerMap = new Map<string, {
      name: string;
      total_revenue: number;
      contracts: Set<string>;
      total_entries: number;
      paid_entries: number;
      overdue_entries: number;
      last_payment_date?: Date;
    }>();

    (data || []).forEach(entry => {
      if (!entry.customer_id) return;
      
      const current = customerMap.get(entry.customer_id) || {
        name: (entry.contracts?.customers as any)?.name || 'Cliente não identificado',
        total_revenue: 0,
        contracts: new Set(),
        total_entries: 0,
        paid_entries: 0,
        overdue_entries: 0
      };

      current.total_revenue += entry.net_amount;
      current.total_entries += 1;
      
      if (entry.contract_id) {
        current.contracts.add(entry.contract_id);
      }

      if (entry.status === 'paid') {
        current.paid_entries += 1;
        if (entry.payment_date) {
          const paymentDate = new Date(entry.payment_date);
          if (!current.last_payment_date || paymentDate > current.last_payment_date) {
            current.last_payment_date = paymentDate;
          }
        }
      } else if (entry.status === 'overdue') {
        current.overdue_entries += 1;
      }

      customerMap.set(entry.customer_id, current);
    });

    // Converter para array e calcular métricas
    const customerAnalysis: CustomerAnalysis[] = Array.from(customerMap.entries())
      .map(([customer_id, data]) => {
        const overdue_rate = data.total_entries > 0 
          ? (data.overdue_entries / data.total_entries) * 100 
          : 0;
        
        const payment_rate = data.total_entries > 0 
          ? (data.paid_entries / data.total_entries) * 100 
          : 0;

        // Calcular comportamento de pagamento
        let payment_behavior: 'excellent' | 'good' | 'regular' | 'poor';
        if (payment_rate >= 95 && overdue_rate <= 2) {
          payment_behavior = 'excellent';
        } else if (payment_rate >= 85 && overdue_rate <= 10) {
          payment_behavior = 'good';
        } else if (payment_rate >= 70 && overdue_rate <= 20) {
          payment_behavior = 'regular';
        } else {
          payment_behavior = 'poor';
        }

        // Calcular score de risco (0-100, onde 0 é menor risco)
        const risk_score = Math.min(100, Math.max(0, 
          (overdue_rate * 0.6) + 
          ((100 - payment_rate) * 0.3) + 
          (data.last_payment_date ? 
            Math.min(30, (Date.now() - data.last_payment_date.getTime()) / (1000 * 60 * 60 * 24)) * 0.1 
            : 30)
        ));

        return {
          customer_id,
          customer_name: data.name,
          total_revenue: data.total_revenue,
          total_contracts: data.contracts.size,
          average_contract_value: data.contracts.size > 0 ? data.total_revenue / data.contracts.size : 0,
          payment_behavior,
          overdue_rate,
          last_payment_date: data.last_payment_date?.toISOString(),
          risk_score: Math.round(risk_score)
        };
      })
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit);

    return customerAnalysis;
  }

  /**
   * Gera análise de performance dos gateways
   */
  async getGatewayPerformance(
    tenant_id: string,
    start_date: Date,
    end_date: Date
  ): Promise<GatewayPerformance[]> {
    const { data, error } = await supabase
      .from('charges')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('created_at', start_date.toISOString())
      .lte('created_at', end_date.toISOString());

    if (error) {
      throw new Error(`Erro ao buscar dados de cobrança: ${error.message}`);
    }

    // Agrupar por gateway (extrair do metadata ou campo específico)
    const gatewayMap = new Map<string, {
      total_charges: number;
      total_amount: number;
      successful_charges: number;
      processing_times: number[];
    }>();

    (data || []).forEach(charge => {
      // Assumindo que o gateway está no metadata ou em um campo específico
      const gateway = (charge.metadata as any)?.gateway || 'unknown';
      
      const current = gatewayMap.get(gateway) || {
        total_charges: 0,
        total_amount: 0,
        successful_charges: 0,
        processing_times: []
      };

      current.total_charges += 1;
      current.total_amount += charge.valor;

      if (charge.status === 'RECEIVED' || charge.status === 'CONFIRMED') {
        current.successful_charges += 1;
      }

      // Calcular tempo de processamento se disponível
      if (charge.data_pagamento && charge.created_at) {
        const processingTime = new Date(charge.data_pagamento).getTime() - new Date(charge.created_at).getTime();
        current.processing_times.push(processingTime / (1000 * 60 * 60)); // em horas
      }

      gatewayMap.set(gateway, current);
    });

    // Converter para array
    return Array.from(gatewayMap.entries()).map(([gateway, data]) => ({
      gateway,
      total_charges: data.total_charges,
      total_amount: data.total_amount,
      success_rate: data.total_charges > 0 ? (data.successful_charges / data.total_charges) * 100 : 0,
      average_processing_time: data.processing_times.length > 0 
        ? data.processing_times.reduce((sum, time) => sum + time, 0) / data.processing_times.length 
        : undefined
    }));
  }

  /**
   * Gera previsão financeira simples
   */
  async getFinancialForecast(
    tenant_id: string,
    months_ahead: number = 3
  ): Promise<FinancialForecast[]> {
    // Buscar dados históricos dos últimos 12 meses
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const revenueData = await this.getRevenueByPeriod(tenant_id, startDate, endDate, 'monthly');
    
    if (revenueData.length < 3) {
      throw new Error('Dados insuficientes para gerar previsão');
    }

    const forecasts: FinancialForecast[] = [];
    
    // Calcular média móvel e tendência
    const recentRevenues = revenueData.slice(-6).map(r => r.revenue);
    const averageRevenue = recentRevenues.reduce((sum, rev) => sum + rev, 0) / recentRevenues.length;
    
    // Calcular tendência (crescimento médio)
    const growthRates = revenueData.slice(-6).map(r => r.growth_rate || 0);
    const averageGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;

    // Gerar previsões
    for (let i = 1; i <= months_ahead; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i);
      
      const predicted_revenue = averageRevenue * (1 + (averageGrowth / 100) * i);
      
      // Calcular nível de confiança baseado na variabilidade dos dados
      const variance = recentRevenues.reduce((sum, rev) => sum + Math.pow(rev - averageRevenue, 2), 0) / recentRevenues.length;
      const standardDeviation = Math.sqrt(variance);
      const confidence_level = Math.max(60, Math.min(95, 95 - (standardDeviation / averageRevenue) * 100));

      forecasts.push({
        period: this.formatDateByInterval(futureDate, 'monthly'),
        predicted_revenue,
        confidence_level: Math.round(confidence_level),
        factors: [
          `Média histórica: R$ ${averageRevenue.toFixed(2)}`,
          `Crescimento médio: ${averageGrowth.toFixed(1)}%`,
          `Contratos ativos: ${revenueData[revenueData.length - 1]?.contracts_count || 0}`
        ]
      });
    }

    return forecasts;
  }

  /**
   * Gera relatório de aging (vencimentos)
   */
  async getAgingReport(
    tenant_id: string
  ): Promise<{
    current: number; // Não vencido
    days_1_30: number; // 1-30 dias
    days_31_60: number; // 31-60 dias
    days_61_90: number; // 61-90 dias
    days_over_90: number; // Mais de 90 dias
  }> {
    const { data, error } = await supabase
      .from('finance_entries')
      .select('due_date, gross_amount, status')
      .eq('tenant_id', tenant_id)
      .eq('type', 'RECEIVABLE')
      .in('status', ['pending', 'overdue']);

    if (error) {
      throw new Error(`Erro ao buscar dados de aging: ${error.message}`);
    }

    const today = new Date();
    const aging = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_over_90: 0
    };

    (data || []).forEach(entry => {
      const dueDate = new Date(entry.due_date);
      const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 0) {
        aging.current += entry.gross_amount;
      } else if (daysDiff <= 30) {
        aging.days_1_30 += entry.gross_amount;
      } else if (daysDiff <= 60) {
        aging.days_31_60 += entry.gross_amount;
      } else if (daysDiff <= 90) {
        aging.days_61_90 += entry.gross_amount;
      } else {
        aging.days_over_90 += entry.gross_amount;
      }
    });

    return aging;
  }

  /**
   * Formata data por intervalo
   */
  private formatDateByInterval(date: Date, interval: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
    switch (interval) {
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      case 'yearly':
        return String(date.getFullYear());
      default:
        return date.toISOString().split('T')[0];
    }
  }

  /**
   * Exporta relatório para CSV
   */
  async exportToCSV(
    tenant_id: string,
    report_type: 'summary' | 'cashflow' | 'customers' | 'aging',
    start_date?: Date,
    end_date?: Date
  ): Promise<string> {
    let data: any[];
    let headers: string[];

    const defaultStartDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = end_date || new Date();

    switch (report_type) {
      case 'summary':
        const summary = await this.getFinancialSummary(tenant_id, defaultStartDate, defaultEndDate);
        data = [summary];
        headers = Object.keys(summary);
        break;
      
      case 'cashflow':
        data = await this.getCashFlowData(tenant_id, defaultStartDate, defaultEndDate);
        headers = ['date', 'inflow', 'outflow', 'balance', 'accumulated_balance'];
        break;
      
      case 'customers':
        data = await this.getCustomerAnalysis(tenant_id);
        headers = ['customer_name', 'total_revenue', 'total_contracts', 'payment_behavior', 'overdue_rate', 'risk_score'];
        break;
      
      case 'aging':
        const aging = await this.getAgingReport(tenant_id);
        data = [aging];
        headers = Object.keys(aging);
        break;
      
      default:
        throw new Error('Tipo de relatório não suportado');
    }

    // Converter para CSV
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }
}

export const financialReportsService = new FinancialReportsService();
export default financialReportsService;

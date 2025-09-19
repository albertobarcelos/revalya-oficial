// =====================================================
// EDGE FUNCTION: Financial Reports
// Descrição: Geração e gerenciamento de relatórios financeiros
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, getAllHeaders, getErrorHeaders, getSuccessHeaders } from '../_shared/cors.ts';
import { validateRequest, ValidationOptions } from '../_shared/validation.ts';
import { createEmailService } from '../_shared/email.ts';

// Types for financial reports
interface ReportRequest {
  action: 'generate' | 'get' | 'list' | 'update_status' | 'schedule' | 'export';
  reportData?: {
    title: string;
    reportType: 'CASH_FLOW' | 'PROFIT_LOSS' | 'BALANCE_SHEET' | 'BUDGET_ANALYSIS' | 'CONTRACT_SUMMARY' | 'PAYMENT_ANALYSIS' | 'CUSTOM';
    dateRange: {
      startDate: string;
      endDate: string;
    };
    filters?: {
      contractIds?: string[];
      serviceIds?: string[];
      clientIds?: string[];
      categories?: string[];
      status?: string[];
    };
    groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'contract' | 'service' | 'client';
    includeProjections?: boolean;
    customQueries?: {
      name: string;
      query: string;
      parameters?: Record<string, any>;
    }[];
    metadata?: Record<string, any>;
  };
  reportId?: string;
  exportFormat?: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  scheduleData?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    time?: string; // HH:MM format
    recipients: string[];
    autoExport?: boolean;
    exportFormat?: 'PDF' | 'EXCEL' | 'CSV';
  };
  statusUpdate?: {
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    notes?: string;
  };
}

interface ReportResponse {
  id: string;
  title: string;
  reportType: string;
  status: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  data?: any;
  summary?: {
    totalRecords: number;
    totalValue: number;
    averageValue: number;
    trends?: {
      direction: 'UP' | 'DOWN' | 'STABLE';
      percentage: number;
      period: string;
    };
  };
  charts?: {
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: any[];
    config?: Record<string, any>;
  }[];
  createdAt: string;
  updatedAt: string;
  generatedBy: string;
  metadata?: Record<string, any>;
}

// Report generation class
class ReportGenerator {
  private supabase: any;
  private emailService: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.emailService = createEmailService();
  }

  async generateReport(
    reportData: ReportRequest['reportData'],
    tenantId: string,
    userId: string
  ): Promise<ReportResponse> {
    if (!reportData) {
      throw new Error('Report data is required');
    }

    // Create report record
    const { data: report, error: createError } = await this.supabase
      .rpc('create_financial_report', {
        p_tenant_id: tenantId,
        p_user_id: userId,
        p_title: reportData.title,
        p_report_type: reportData.reportType,
        p_date_range: reportData.dateRange,
        p_filters: reportData.filters || {},
        p_group_by: reportData.groupBy,
        p_include_projections: reportData.includeProjections || false,
        p_metadata: reportData.metadata || {},
      });

    if (createError) {
      throw new Error(`Failed to create report: ${createError.message}`);
    }

    try {
      // Update status to processing
      await this.updateReportStatus(report.id, 'PROCESSING', tenantId);

      // Generate report data based on type
      const reportResult = await this.generateReportData(
        reportData,
        tenantId,
        report.id
      );

      // Update report with generated data
      const { error: updateError } = await this.supabase
        .from('financial_reports')
        .update({
          data: reportResult.data,
          summary: reportResult.summary,
          charts: reportResult.charts,
          status: 'COMPLETED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw new Error(`Failed to update report: ${updateError.message}`);
      }

      return {
        id: report.id,
        title: reportData.title,
        reportType: reportData.reportType,
        status: 'COMPLETED',
        dateRange: reportData.dateRange,
        data: reportResult.data,
        summary: reportResult.summary,
        charts: reportResult.charts,
        createdAt: report.created_at,
        updatedAt: new Date().toISOString(),
        generatedBy: userId,
        metadata: reportData.metadata,
      };

    } catch (error) {
      // Update status to failed
      await this.updateReportStatus(report.id, 'FAILED', tenantId, error.message);
      throw error;
    }
  }

  private async generateReportData(
    reportData: ReportRequest['reportData'],
    tenantId: string,
    reportId: string
  ): Promise<{ data: any; summary: any; charts: any[] }> {
    const { reportType, dateRange, filters, groupBy } = reportData!;

    switch (reportType) {
      case 'CASH_FLOW':
        return await this.generateCashFlowReport(dateRange, filters, groupBy, tenantId);
      
      case 'PROFIT_LOSS':
        return await this.generateProfitLossReport(dateRange, filters, groupBy, tenantId);
      
      case 'BALANCE_SHEET':
        return await this.generateBalanceSheetReport(dateRange, filters, tenantId);
      
      case 'BUDGET_ANALYSIS':
        return await this.generateBudgetAnalysisReport(dateRange, filters, groupBy, tenantId);
      
      case 'CONTRACT_SUMMARY':
        return await this.generateContractSummaryReport(dateRange, filters, groupBy, tenantId);
      
      case 'PAYMENT_ANALYSIS':
        return await this.generatePaymentAnalysisReport(dateRange, filters, groupBy, tenantId);
      
      case 'CUSTOM':
        return await this.generateCustomReport(reportData.customQueries!, tenantId);
      
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  private async generateCashFlowReport(
    dateRange: any,
    filters: any,
    groupBy: string | undefined,
    tenantId: string
  ): Promise<{ data: any; summary: any; charts: any[] }> {
    // Query cash flow data from contract_billings and payments
    const { data: cashFlowData, error } = await this.supabase
      .from('contract_billings')
      .select(`
        *,
        contract_billing_payments(*),
        contracts(title, client_name)
      `)
      .eq('tenant_id', tenantId)
      .gte('due_date', dateRange.startDate)
      .lte('due_date', dateRange.endDate);

    if (error) {
      throw new Error(`Failed to fetch cash flow data: ${error.message}`);
    }

    // Process data by groupBy period
    const processedData = this.groupDataByPeriod(cashFlowData, groupBy || 'month', 'due_date');
    
    // Calculate summary
    const totalInflow = cashFlowData
      .filter((item: any) => item.status === 'PAID')
      .reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    
    const totalOutflow = 0; // Add expense calculations here
    const netCashFlow = totalInflow - totalOutflow;

    // Generate charts
    const charts = [
      {
        type: 'line' as const,
        title: 'Cash Flow Trend',
        data: processedData.map((item: any) => ({
          period: item.period,
          inflow: item.inflow,
          outflow: item.outflow,
          net: item.net,
        })),
      },
      {
        type: 'bar' as const,
        title: 'Monthly Cash Flow',
        data: processedData,
      },
    ];

    return {
      data: processedData,
      summary: {
        totalRecords: cashFlowData.length,
        totalValue: netCashFlow,
        averageValue: netCashFlow / (processedData.length || 1),
        trends: this.calculateTrends(processedData, 'net'),
      },
      charts,
    };
  }

  private async generateProfitLossReport(
    dateRange: any,
    filters: any,
    groupBy: string | undefined,
    tenantId: string
  ): Promise<{ data: any; summary: any; charts: any[] }> {
    // Query revenue and expense data
    const { data: revenueData, error: revenueError } = await this.supabase
      .from('contract_billings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'PAID')
      .gte('paid_at', dateRange.startDate)
      .lte('paid_at', dateRange.endDate);

    if (revenueError) {
      throw new Error(`Failed to fetch revenue data: ${revenueError.message}`);
    }

    // Process P&L data
    const processedData = this.groupDataByPeriod(revenueData, groupBy || 'month', 'paid_at');
    
    const totalRevenue = revenueData.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const totalExpenses = 0; // Add expense calculations
    const netProfit = totalRevenue - totalExpenses;

    const charts = [
      {
        type: 'bar' as const,
        title: 'Revenue vs Expenses',
        data: processedData.map((item: any) => ({
          period: item.period,
          revenue: item.revenue,
          expenses: item.expenses,
          profit: item.profit,
        })),
      },
    ];

    return {
      data: processedData,
      summary: {
        totalRecords: revenueData.length,
        totalValue: netProfit,
        averageValue: netProfit / (processedData.length || 1),
        trends: this.calculateTrends(processedData, 'profit'),
      },
      charts,
    };
  }

  private async generateBalanceSheetReport(
    dateRange: any,
    filters: any,
    tenantId: string
  ): Promise<{ data: any; summary: any; charts: any[] }> {
    // This would typically query from accounting tables
    // For now, we'll create a simplified version
    
    const balanceSheetData = {
      assets: {
        current: {
          cash: 0,
          accountsReceivable: 0,
          inventory: 0,
        },
        fixed: {
          equipment: 0,
          property: 0,
        },
      },
      liabilities: {
        current: {
          accountsPayable: 0,
          shortTermDebt: 0,
        },
        longTerm: {
          longTermDebt: 0,
        },
      },
      equity: {
        capital: 0,
        retainedEarnings: 0,
      },
    };

    const charts = [
      {
        type: 'pie' as const,
        title: 'Asset Distribution',
        data: [
          { name: 'Current Assets', value: balanceSheetData.assets.current.cash + balanceSheetData.assets.current.accountsReceivable },
          { name: 'Fixed Assets', value: balanceSheetData.assets.fixed.equipment + balanceSheetData.assets.fixed.property },
        ],
      },
    ];

    return {
      data: balanceSheetData,
      summary: {
        totalRecords: 1,
        totalValue: 0,
        averageValue: 0,
      },
      charts,
    };
  }

  private async generateBudgetAnalysisReport(
    dateRange: any,
    filters: any,
    groupBy: string | undefined,
    tenantId: string
  ): Promise<{ data: any; summary: any; charts: any[] }> {
    // Budget vs Actual analysis
    // This would compare budgeted amounts with actual performance
    
    const budgetData = {
      categories: [],
      variance: {
        favorable: 0,
        unfavorable: 0,
      },
    };

    return {
      data: budgetData,
      summary: {
        totalRecords: 0,
        totalValue: 0,
        averageValue: 0,
      },
      charts: [],
    };
  }

  private async generateContractSummaryReport(
    dateRange: any,
    filters: any,
    groupBy: string | undefined,
    tenantId: string
  ): Promise<{ data: any; summary: any; charts: any[] }> {
    // Query contract data
    const { data: contractData, error } = await this.supabase
      .from('contracts')
      .select(`
        *,
        contract_billings(*),
        contract_services(*, services(*))
      `)
      .eq('tenant_id', tenantId)
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);

    if (error) {
      throw new Error(`Failed to fetch contract data: ${error.message}`);
    }

    // Process contract summary
    const processedData = contractData.map((contract: any) => {
      const totalBilled = contract.contract_billings
        .reduce((sum: number, billing: any) => sum + (billing.amount || 0), 0);
      
      const totalPaid = contract.contract_billings
        .filter((billing: any) => billing.status === 'PAID')
        .reduce((sum: number, billing: any) => sum + (billing.amount || 0), 0);

      return {
        id: contract.id,
        title: contract.title,
        clientName: contract.client_name,
        status: contract.status,
        totalValue: contract.total_value,
        totalBilled,
        totalPaid,
        outstanding: totalBilled - totalPaid,
        services: contract.contract_services.length,
      };
    });

    const totalValue = processedData.reduce((sum: number, item: any) => sum + (item.totalValue || 0), 0);
    const totalPaid = processedData.reduce((sum: number, item: any) => sum + (item.totalPaid || 0), 0);

    const charts = [
      {
        type: 'pie' as const,
        title: 'Contract Status Distribution',
        data: this.groupByField(processedData, 'status'),
      },
      {
        type: 'bar' as const,
        title: 'Top Contracts by Value',
        data: processedData
          .sort((a: any, b: any) => b.totalValue - a.totalValue)
          .slice(0, 10),
      },
    ];

    return {
      data: processedData,
      summary: {
        totalRecords: contractData.length,
        totalValue,
        averageValue: totalValue / (contractData.length || 1),
      },
      charts,
    };
  }

  private async generatePaymentAnalysisReport(
    dateRange: any,
    filters: any,
    groupBy: string | undefined,
    tenantId: string
  ): Promise<{ data: any; summary: any; charts: any[] }> {
    // Query payment data
    const { data: paymentData, error } = await this.supabase
      .from('contract_billing_payments')
      .select(`
        *,
        contract_billings(*, contracts(title, client_name))
      `)
      .eq('tenant_id', tenantId)
      .gte('payment_date', dateRange.startDate)
      .lte('payment_date', dateRange.endDate);

    if (error) {
      throw new Error(`Failed to fetch payment data: ${error.message}`);
    }

    // Process payment analysis
    const processedData = this.groupDataByPeriod(paymentData, groupBy || 'month', 'payment_date');
    
    const totalPayments = paymentData.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const averagePayment = totalPayments / (paymentData.length || 1);

    const charts = [
      {
        type: 'line' as const,
        title: 'Payment Trends',
        data: processedData,
      },
      {
        type: 'pie' as const,
        title: 'Payment Methods',
        data: this.groupByField(paymentData, 'payment_method'),
      },
    ];

    return {
      data: processedData,
      summary: {
        totalRecords: paymentData.length,
        totalValue: totalPayments,
        averageValue: averagePayment,
        trends: this.calculateTrends(processedData, 'amount'),
      },
      charts,
    };
  }

  private async generateCustomReport(
    customQueries: any[],
    tenantId: string
  ): Promise<{ data: any; summary: any; charts: any[] }> {
    const results: any = {};

    for (const query of customQueries) {
      try {
        const { data, error } = await this.supabase
          .rpc('execute_custom_query', {
            query_sql: query.query,
            query_params: { ...query.parameters, tenant_id: tenantId },
          });

        if (error) {
          throw new Error(`Query '${query.name}' failed: ${error.message}`);
        }

        results[query.name] = data;
      } catch (error) {
        console.error(`Custom query error for '${query.name}':`, error);
        results[query.name] = { error: error.message };
      }
    }

    return {
      data: results,
      summary: {
        totalRecords: Object.keys(results).length,
        totalValue: 0,
        averageValue: 0,
      },
      charts: [],
    };
  }

  private groupDataByPeriod(data: any[], groupBy: string, dateField: string): any[] {
    const grouped: { [key: string]: any[] } = {};

    data.forEach(item => {
      const date = new Date(item[dateField]);
      let key: string;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return Object.entries(grouped).map(([period, items]) => ({
      period,
      count: items.length,
      amount: items.reduce((sum, item) => sum + (item.amount || 0), 0),
      items,
    }));
  }

  private groupByField(data: any[], field: string): any[] {
    const grouped: { [key: string]: number } = {};

    data.forEach(item => {
      const value = item[field] || 'Unknown';
      grouped[value] = (grouped[value] || 0) + 1;
    });

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }

  private calculateTrends(data: any[], valueField: string): any {
    if (data.length < 2) {
      return { direction: 'STABLE', percentage: 0, period: 'insufficient_data' };
    }

    const latest = data[data.length - 1][valueField] || 0;
    const previous = data[data.length - 2][valueField] || 0;
    
    if (previous === 0) {
      return { direction: 'STABLE', percentage: 0, period: 'no_baseline' };
    }

    const percentage = ((latest - previous) / previous) * 100;
    const direction = percentage > 5 ? 'UP' : percentage < -5 ? 'DOWN' : 'STABLE';

    return {
      direction,
      percentage: Math.abs(percentage),
      period: `${data[data.length - 2].period}_to_${data[data.length - 1].period}`,
    };
  }

  async getReport(reportId: string, tenantId: string): Promise<ReportResponse> {
    const { data: report, error } = await this.supabase
      .from('financial_reports')
      .select('*')
      .eq('id', reportId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !report) {
      throw new Error('Report not found or access denied');
    }

    return this.formatReportResponse(report);
  }

  async listReports(
    tenantId: string,
    filters?: any,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ reports: ReportResponse[]; total: number }> {
    let query = this.supabase
      .from('financial_reports')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters?.reportType) {
      query = query.eq('report_type', filters.reportType);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data: reports, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list reports: ${error.message}`);
    }

    return {
      reports: reports.map((report: any) => this.formatReportResponse(report)),
      total: count || 0,
    };
  }

  async updateReportStatus(
    reportId: string,
    status: string,
    tenantId: string,
    notes?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_report_status', {
        p_report_id: reportId,
        p_tenant_id: tenantId,
        p_status: status,
        p_notes: notes,
      });

    if (error) {
      throw new Error(`Failed to update report status: ${error.message}`);
    }
  }

  private formatReportResponse(report: any): ReportResponse {
    return {
      id: report.id,
      title: report.title,
      reportType: report.report_type,
      status: report.status,
      dateRange: report.date_range,
      data: report.data,
      summary: report.summary,
      charts: report.charts,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      generatedBy: report.generated_by,
      metadata: report.metadata,
    };
  }
}

// Main handler function
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request
    const validationOptions: ValidationOptions = {
      allowedMethods: ['POST', 'GET'],
      requireAuth: true,
      requireTenant: true,
      allowedRoles: ['ADMIN', 'FINANCIAL_MANAGER', 'FINANCIAL_ANALYST'],
      maxBodySize: 2 * 1024 * 1024, // 2MB
    };

    const validation = await validateRequest(req, validationOptions);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: validation.status || 400, 
          headers: getErrorHeaders(validation.status) 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const reportGenerator = new ReportGenerator(supabase);

    let result: any;

    if (req.method === 'GET') {
      // Handle GET requests (list reports or get specific report)
      const url = new URL(req.url);
      const reportId = url.searchParams.get('id');
      
      if (reportId) {
        // Get specific report
        result = await reportGenerator.getReport(reportId, validation.tenantId!);
      } else {
        // List reports with filters
        const filters = {
          reportType: url.searchParams.get('reportType') || undefined,
          status: url.searchParams.get('status') || undefined,
          dateFrom: url.searchParams.get('dateFrom') || undefined,
          dateTo: url.searchParams.get('dateTo') || undefined,
        };
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        
        result = await reportGenerator.listReports(validation.tenantId!, filters, limit, offset);
      }
    } else {
      // Handle POST requests
      const body: ReportRequest = await req.json();
      
      if (!body.action) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: action' }),
          { status: 400, headers: getErrorHeaders(400) }
        );
      }

      switch (body.action) {
        case 'generate':
          result = await reportGenerator.generateReport(
            body.reportData!,
            validation.tenantId!,
            validation.user!.id
          );
          break;

        case 'get':
          if (!body.reportId) {
            throw new Error('Report ID is required');
          }
          result = await reportGenerator.getReport(body.reportId, validation.tenantId!);
          break;

        case 'list':
          result = await reportGenerator.listReports(validation.tenantId!, {}, 50, 0);
          break;

        case 'update_status':
          if (!body.reportId || !body.statusUpdate) {
            throw new Error('Report ID and status update are required');
          }
          await reportGenerator.updateReportStatus(
            body.reportId,
            body.statusUpdate.status,
            validation.tenantId!,
            body.statusUpdate.notes
          );
          result = { success: true, message: 'Status updated successfully' };
          break;

        default:
          throw new Error(`Unsupported action: ${body.action}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: getSuccessHeaders() 
      }
    );

  } catch (error) {
    console.error('Financial reports error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: getErrorHeaders(500) 
      }
    );
  }
});
// =====================================================
// FINANCIAL REPORTS HOOK
// Descrição: Hook para gerenciar relatórios financeiros
// =====================================================

import { useState, useCallback, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import {
  FinancialReport,
  ReportType,
  ReportStatus,
  DateRange,
  ReportFilters,
  GroupByPeriod,
  ReportSummary,
  ReportChart,
  ReportTrend,
  GenerateReportRequest,
  ReportResponse,
  CustomQuery,
  PaginationParams,
  PaginatedResponse,
  FinancialMetrics,
  KPITarget,
} from '../types/models/financial';

interface UseFinancialReportsReturn {
  // State
  reports: FinancialReport[];
  currentReport: FinancialReport | null;
  loading: boolean;
  error: string | null;
  
  // Report generation
  generateReport: (request: GenerateReportRequest) => Promise<ReportResponse | null>;
  getReport: (id: string) => Promise<ReportResponse | null>;
  getReports: (params?: PaginationParams & { status?: ReportStatus; type?: ReportType }) => Promise<PaginatedResponse<FinancialReport> | null>;
  updateReportStatus: (id: string, status: ReportStatus) => Promise<boolean>;
  deleteReport: (id: string) => Promise<boolean>;
  
  // Report data
  exportReport: (id: string, format: 'pdf' | 'excel' | 'csv') => Promise<Blob | null>;
  shareReport: (id: string, emails: string[], message?: string) => Promise<boolean>;
  scheduleReport: (request: GenerateReportRequest, schedule: ReportSchedule) => Promise<boolean>;
  
  // Analytics and metrics
  getFinancialMetrics: (dateRange: DateRange, filters?: ReportFilters) => Promise<FinancialMetrics | null>;
  getKPITargets: () => Promise<KPITarget[]>;
  getDashboardData: (dateRange: DateRange) => Promise<DashboardData | null>;
  
  // Utilities
  validateReportRequest: (request: GenerateReportRequest) => { isValid: boolean; errors: string[] };
  previewReportData: (request: GenerateReportRequest) => Promise<any>;
  
  // State management
  setCurrentReport: (report: FinancialReport | null) => void;
  clearError: () => void;
  refresh: () => Promise<void>;
}

interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  timezone: string;
  recipients: string[];
  isActive: boolean;
}

interface DashboardData {
  metrics: FinancialMetrics;
  charts: ReportChart[];
  trends: ReportTrend[];
  alerts: DashboardAlert[];
  recentReports: FinancialReport[];
}

interface DashboardAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: string;
}

export const useFinancialReports = (): UseFinancialReportsReturn => {
  const { supabase, user } = useSupabase();
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [currentReport, setCurrentReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: any, context: string) => {
    console.error(`[useFinancialReports] ${context}:`, error);
    setError(error.message || `Erro ao ${context}`);
    setLoading(false);
  }, []);

  // Report generation methods
  const generateReport = useCallback(async (
    request: GenerateReportRequest
  ): Promise<ReportResponse | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-reports', {
        body: {
          action: 'generate',
          ...request,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao gerar relatório');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao gerar relatório');
      }

      const reportResponse = data.data as ReportResponse;
      
      // Add to local state
      setReports(prev => [reportResponse as FinancialReport, ...prev]);
      setCurrentReport(reportResponse as FinancialReport);
      
      setLoading(false);
      return reportResponse;
    } catch (err) {
      handleError(err, 'gerar relatório');
      return null;
    }
  }, [supabase, user, handleError]);

  const getReport = useCallback(async (id: string): Promise<ReportResponse | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-reports', {
        body: {
          action: 'get',
          reportId: id,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar relatório');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Relatório não encontrado');
      }

      const reportResponse = data.data as ReportResponse;
      setCurrentReport(reportResponse as FinancialReport);
      
      setLoading(false);
      return reportResponse;
    } catch (err) {
      handleError(err, 'buscar relatório');
      return null;
    }
  }, [supabase, user, handleError]);

  const getReports = useCallback(async (
    params: PaginationParams & { status?: ReportStatus; type?: ReportType } = {}
  ): Promise<PaginatedResponse<FinancialReport> | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-reports', {
        body: {
          action: 'list',
          ...params,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar relatórios');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao buscar relatórios');
      }

      const result = data.data as PaginatedResponse<FinancialReport>;
      setReports(result.data);
      
      setLoading(false);
      return result;
    } catch (err) {
      handleError(err, 'buscar relatórios');
      return null;
    }
  }, [supabase, user, handleError]);

  const updateReportStatus = useCallback(async (
    id: string,
    status: ReportStatus
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('update_report_status', {
        p_report_id: id,
        p_status: status,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao atualizar status do relatório');
      }

      // Update local state
      setReports(prev => 
        prev.map(report => 
          report.id === id ? { ...report, status } : report
        )
      );

      if (currentReport?.id === id) {
        setCurrentReport(prev => prev ? { ...prev, status } : null);
      }

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'atualizar status do relatório');
      return false;
    }
  }, [supabase, user, currentReport, handleError]);

  const deleteReport = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('financial_reports')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.user_metadata?.tenant_id);

      if (error) {
        throw new Error(error.message || 'Erro ao deletar relatório');
      }

      // Remove from local state
      setReports(prev => prev.filter(report => report.id !== id));
      
      if (currentReport?.id === id) {
        setCurrentReport(null);
      }

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'deletar relatório');
      return false;
    }
  }, [supabase, user, currentReport, handleError]);

  // Report data methods
  const exportReport = useCallback(async (
    id: string,
    format: 'pdf' | 'excel' | 'csv'
  ): Promise<Blob | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-reports', {
        body: {
          action: 'export',
          reportId: id,
          format,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao exportar relatório');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao exportar relatório');
      }

      // Convert base64 to blob
      const binaryString = atob(data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const mimeTypes = {
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
      };

      const blob = new Blob([bytes], { type: mimeTypes[format] });
      
      setLoading(false);
      return blob;
    } catch (err) {
      handleError(err, 'exportar relatório');
      return null;
    }
  }, [supabase, user, handleError]);

  const shareReport = useCallback(async (
    id: string,
    emails: string[],
    message?: string
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-reports', {
        body: {
          action: 'share',
          reportId: id,
          emails,
          message,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao compartilhar relatório');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao compartilhar relatório');
      }

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'compartilhar relatório');
      return false;
    }
  }, [supabase, user, handleError]);

  const scheduleReport = useCallback(async (
    request: GenerateReportRequest,
    schedule: ReportSchedule
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-reports', {
        body: {
          action: 'schedule',
          reportRequest: request,
          schedule,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao agendar relatório');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao agendar relatório');
      }

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'agendar relatório');
      return false;
    }
  }, [supabase, user, handleError]);

  // Analytics and metrics methods
  const getFinancialMetrics = useCallback(async (
    dateRange: DateRange,
    filters?: ReportFilters
  ): Promise<FinancialMetrics | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_financial_statistics', {
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate,
        p_filters: filters || {},
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar métricas financeiras');
      }

      setLoading(false);
      return data as FinancialMetrics;
    } catch (err) {
      handleError(err, 'buscar métricas financeiras');
      return null;
    }
  }, [supabase, user, handleError]);

  const getKPITargets = useCallback(async (): Promise<KPITarget[]> => {
    if (!user) {
      setError('Usuário não autenticado');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      // This would typically come from a KPI targets table
      // For now, we'll return mock data
      const mockKPIs: KPITarget[] = [
        {
          metric: 'Receita Mensal',
          target: 100000,
          current: 85000,
          period: 'monthly',
          unit: 'BRL',
          trend: 'UP',
        },
        {
          metric: 'Margem de Lucro',
          target: 25,
          current: 22,
          period: 'monthly',
          unit: '%',
          trend: 'STABLE',
        },
        {
          metric: 'Contratos Ativos',
          target: 50,
          current: 45,
          period: 'monthly',
          unit: 'count',
          trend: 'UP',
        },
      ];

      setLoading(false);
      return mockKPIs;
    } catch (err) {
      handleError(err, 'buscar metas de KPI');
      return [];
    }
  }, [user, handleError]);

  const getDashboardData = useCallback(async (
    dateRange: DateRange
  ): Promise<DashboardData | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const [metrics, recentReports] = await Promise.all([
        getFinancialMetrics(dateRange),
        getReports({ limit: 5, sortBy: 'created_at', sortOrder: 'desc' }),
      ]);

      if (!metrics) {
        throw new Error('Erro ao buscar métricas');
      }

      const dashboardData: DashboardData = {
        metrics,
        charts: [
          {
            type: 'line',
            title: 'Receita vs Despesas',
            data: [], // Would be populated with actual data
            config: {
              xAxis: 'date',
              yAxis: 'value',
              colors: ['#10B981', '#EF4444'],
              showLegend: true,
              showGrid: true,
            },
          },
          {
            type: 'pie',
            title: 'Distribuição de Despesas',
            data: [], // Would be populated with actual data
            config: {
              colors: ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'],
              showLegend: true,
            },
          },
        ],
        trends: [
          {
            direction: 'UP',
            percentage: 12.5,
            period: 'último mês',
          },
        ],
        alerts: [
          {
            id: '1',
            type: 'warning',
            title: 'Contratos Expirando',
            message: '3 contratos expiram nos próximos 7 dias',
            actionUrl: '/contracts?filter=expiring',
            createdAt: new Date().toISOString(),
          },
        ],
        recentReports: recentReports?.data || [],
      };

      setLoading(false);
      return dashboardData;
    } catch (err) {
      handleError(err, 'buscar dados do dashboard');
      return null;
    }
  }, [user, getFinancialMetrics, getReports, handleError]);

  // Utility methods
  const validateReportRequest = useCallback((
    request: GenerateReportRequest
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!request.title || request.title.trim().length === 0) {
      errors.push('Título é obrigatório');
    }

    if (!request.reportType) {
      errors.push('Tipo de relatório é obrigatório');
    }

    if (!request.dateRange) {
      errors.push('Período é obrigatório');
    } else {
      const startDate = new Date(request.dateRange.startDate);
      const endDate = new Date(request.dateRange.endDate);
      
      if (startDate >= endDate) {
        errors.push('Data de início deve ser anterior à data de fim');
      }
      
      if (endDate > new Date()) {
        errors.push('Data de fim não pode ser futura');
      }
    }

    if (request.customQueries) {
      request.customQueries.forEach((query, index) => {
        if (!query.name || query.name.trim().length === 0) {
          errors.push(`Nome da consulta ${index + 1} é obrigatório`);
        }
        if (!query.query || query.query.trim().length === 0) {
          errors.push(`SQL da consulta ${index + 1} é obrigatório`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  const previewReportData = useCallback(async (
    request: GenerateReportRequest
  ): Promise<any> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-reports', {
        body: {
          action: 'preview',
          ...request,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao visualizar dados do relatório');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao visualizar dados');
      }

      setLoading(false);
      return data.data;
    } catch (err) {
      handleError(err, 'visualizar dados do relatório');
      return null;
    }
  }, [supabase, user, handleError]);

  const refresh = useCallback(async (): Promise<void> => {
    await getReports();
  }, [getReports]);

  // Auto-refresh reports when user changes
  useEffect(() => {
    if (user) {
      getReports();
    }
  }, [user, getReports]);

  return {
    // State
    reports,
    currentReport,
    loading,
    error,
    
    // Report generation
    generateReport,
    getReport,
    getReports,
    updateReportStatus,
    deleteReport,
    
    // Report data
    exportReport,
    shareReport,
    scheduleReport,
    
    // Analytics and metrics
    getFinancialMetrics,
    getKPITargets,
    getDashboardData,
    
    // Utilities
    validateReportRequest,
    previewReportData,
    
    // State management
    setCurrentReport,
    clearError,
    refresh,
  };
};

// =====================================================
// REPORT UTILITIES HOOK
// =====================================================

interface UseReportUtilitiesReturn {
  getReportTypeLabel: (type: ReportType) => string;
  getReportStatusLabel: (status: ReportStatus) => string;
  getReportStatusColor: (status: ReportStatus) => string;
  getGroupByPeriodLabel: (period: GroupByPeriod) => string;
  formatReportValue: (value: number, type: 'currency' | 'percentage' | 'number') => string;
  calculateTrend: (current: number, previous: number) => ReportTrend;
  generateDateRangePresets: () => { label: string; dateRange: DateRange }[];
  validateDateRange: (dateRange: DateRange) => { isValid: boolean; error?: string };
}

export const useReportUtilities = (): UseReportUtilitiesReturn => {
  const getReportTypeLabel = useCallback((type: ReportType): string => {
    const labels: Record<ReportType, string> = {
      CASH_FLOW: 'Fluxo de Caixa',
      PROFIT_LOSS: 'Demonstração de Resultado (DRE)',
      BALANCE_SHEET: 'Balanço Patrimonial',
      BUDGET_ANALYSIS: 'Análise Orçamentária',
      CONTRACT_SUMMARY: 'Resumo de Contratos',
      PAYMENT_ANALYSIS: 'Análise de Pagamentos',
      TAX_REPORT: 'Relatório Fiscal',
      EXPENSE_ANALYSIS: 'Análise de Despesas',
      REVENUE_ANALYSIS: 'Análise de Receitas',
      CUSTOM: 'Relatório Personalizado',
    };
    return labels[type] || type;
  }, []);

  const getReportStatusLabel = useCallback((status: ReportStatus): string => {
    const labels: Record<ReportStatus, string> = {
      PENDING: 'Pendente',
      PROCESSING: 'Processando',
      COMPLETED: 'Concluído',
      FAILED: 'Falhou',
      CANCELLED: 'Cancelado',
    };
    return labels[status] || status;
  }, []);

  const getReportStatusColor = useCallback((status: ReportStatus): string => {
    const colors: Record<ReportStatus, string> = {
      PENDING: 'yellow',
      PROCESSING: 'blue',
      COMPLETED: 'green',
      FAILED: 'red',
      CANCELLED: 'gray',
    };
    return colors[status] || 'gray';
  }, []);

  const getGroupByPeriodLabel = useCallback((period: GroupByPeriod): string => {
    const labels: Record<GroupByPeriod, string> = {
      day: 'Diário',
      week: 'Semanal',
      month: 'Mensal',
      quarter: 'Trimestral',
      year: 'Anual',
      contract: 'Por Contrato',
      service: 'Por Serviço',
      client: 'Por Cliente',
      category: 'Por Categoria',
    };
    return labels[period] || period;
  }, []);

  const formatReportValue = useCallback((
    value: number,
    type: 'currency' | 'percentage' | 'number'
  ): string => {
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value);
      case 'percentage':
        return new Intl.NumberFormat('pt-BR', {
          style: 'percent',
          minimumFractionDigits: 2,
        }).format(value / 100);
      case 'number':
        return new Intl.NumberFormat('pt-BR').format(value);
      default:
        return value.toString();
    }
  }, []);

  const calculateTrend = useCallback((
    current: number,
    previous: number
  ): ReportTrend => {
    if (previous === 0) {
      return {
        direction: current > 0 ? 'UP' : current < 0 ? 'DOWN' : 'STABLE',
        percentage: 0,
        period: 'período anterior',
      };
    }

    const percentage = ((current - previous) / Math.abs(previous)) * 100;
    const direction = percentage > 5 ? 'UP' : percentage < -5 ? 'DOWN' : 'STABLE';

    return {
      direction,
      percentage: Math.abs(percentage),
      period: 'período anterior',
    };
  }, []);

  const generateDateRangePresets = useCallback((): { label: string; dateRange: DateRange }[] => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const lastQuarter = new Date(today);
    lastQuarter.setMonth(lastQuarter.getMonth() - 3);
    
    const lastYear = new Date(today);
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisYearStart = new Date(today.getFullYear(), 0, 1);

    return [
      {
        label: 'Hoje',
        dateRange: {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
      {
        label: 'Ontem',
        dateRange: {
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0],
        },
      },
      {
        label: 'Últimos 7 dias',
        dateRange: {
          startDate: lastWeek.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
      {
        label: 'Últimos 30 dias',
        dateRange: {
          startDate: lastMonth.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
      {
        label: 'Este mês',
        dateRange: {
          startDate: thisMonthStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
      {
        label: 'Últimos 3 meses',
        dateRange: {
          startDate: lastQuarter.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
      {
        label: 'Este ano',
        dateRange: {
          startDate: thisYearStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
      {
        label: 'Último ano',
        dateRange: {
          startDate: lastYear.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
    ];
  }, []);

  const validateDateRange = useCallback((
    dateRange: DateRange
  ): { isValid: boolean; error?: string } => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const today = new Date();

    if (isNaN(startDate.getTime())) {
      return { isValid: false, error: 'Data de início inválida' };
    }

    if (isNaN(endDate.getTime())) {
      return { isValid: false, error: 'Data de fim inválida' };
    }

    if (startDate >= endDate) {
      return { isValid: false, error: 'Data de início deve ser anterior à data de fim' };
    }

    if (endDate > today) {
      return { isValid: false, error: 'Data de fim não pode ser futura' };
    }

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 365 * 2) {
      return { isValid: false, error: 'Período não pode exceder 2 anos' };
    }

    return { isValid: true };
  }, []);

  return {
    getReportTypeLabel,
    getReportStatusLabel,
    getReportStatusColor,
    getGroupByPeriodLabel,
    formatReportValue,
    calculateTrend,
    generateDateRangePresets,
    validateDateRange,
  };
};

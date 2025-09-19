import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  PieChart,
  BarChart3,
  Clock,
  Filter,
  Search,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinancialReport } from '../../hooks/useFinancialReport';
import { 
  ReportType, 
  ReportFormat, 
  ReportConfig,
  ReportSearchFilters,
  ReportSchedule
} from '../../services/financialReportService';

interface FinancialReportManagerProps {
  tenantId: string;
  userId: string;
}

const REPORT_TYPES: Array<{ value: ReportType; label: string; icon: React.ReactNode; description: string }> = [
  {
    value: 'INCOME_STATEMENT',
    label: 'Demonstrativo de Resultados',
    icon: <TrendingUp className="w-5 h-5" />,
    description: 'Receitas, despesas e lucros do período'
  },
  {
    value: 'CASH_FLOW',
    label: 'Fluxo de Caixa',
    icon: <DollarSign className="w-5 h-5" />,
    description: 'Entradas e saídas de caixa'
  },
  {
    value: 'ACCOUNTS_RECEIVABLE',
    label: 'Contas a Receber',
    icon: <FileText className="w-5 h-5" />,
    description: 'Valores pendentes de recebimento'
  },
  {
    value: 'REVENUE_ANALYSIS',
    label: 'Análise de Receitas',
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'Análise detalhada das receitas'
  },
  {
    value: 'PROFITABILITY_ANALYSIS',
    label: 'Análise de Lucratividade',
    icon: <PieChart className="w-5 h-5" />,
    description: 'Margens e indicadores de lucratividade'
  },
  {
    value: 'BUDGET_VARIANCE',
    label: 'Variação Orçamentária',
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'Comparação entre orçado e realizado'
  }
];

const REPORT_FORMATS: Array<{ value: ReportFormat; label: string }> = [
  { value: 'JSON', label: 'JSON' },
  { value: 'CSV', label: 'CSV' },
  { value: 'PDF', label: 'PDF' },
  { value: 'EXCEL', label: 'Excel' }
];

export function FinancialReportManager({ tenantId, userId }: FinancialReportManagerProps) {
  const {
    // Estado
    isGenerating,
    isSearching,
    isDeleting,
    reports,
    currentReport,
    generationResult,
    searchTotal,
    incomeStatementData,
    cashFlowData,
    accountsReceivableData,
    revenueAnalysisData,
    profitabilityAnalysisData,
    budgetVarianceData,
    
    // Ações
    generateReport,
    searchReports,
    getReport,
    deleteReport,
    generateIncomeStatement,
    generateCashFlow,
    generateAccountsReceivable,
    generateRevenueAnalysis,
    generateProfitabilityAnalysis,
    generateBudgetVariance,
    clearResults,
    exportReportData,
    validateReportConfig
  } = useFinancialReport();

  // Estados locais
  const [activeTab, setActiveTab] = useState<'generate' | 'reports' | 'data'>('generate');
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('INCOME_STATEMENT');
  const [reportConfig, setReportConfig] = useState<Partial<ReportConfig>>({
    tenant_id: tenantId,
    format: 'JSON'
  });
  const [searchFilters, setSearchFilters] = useState<ReportSearchFilters>({
    tenant_id: tenantId,
    limit: 20,
    offset: 0
  });
  const [showReportDetails, setShowReportDetails] = useState<string | null>(null);

  // Carregar relatórios ao montar o componente
  useEffect(() => {
    searchReports(searchFilters);
  }, [searchReports]);

  // Handlers
  const handleGenerateReport = async () => {
    const config: ReportConfig = {
      tenant_id: tenantId,
      report_type: selectedReportType,
      period_start: reportConfig.period_start!,
      period_end: reportConfig.period_end!,
      format: reportConfig.format || 'JSON',
      title: reportConfig.title,
      description: reportConfig.description,
      parameters: reportConfig.parameters
    };

    const errors = validateReportConfig(config);
    if (errors.length > 0) {
      alert(`Erros de validação:\n${errors.join('\n')}`);
      return;
    }

    await generateReport(config, userId);
    
    // Recarregar lista de relatórios
    searchReports(searchFilters);
  };

  const handleGenerateSpecificReport = async (reportType: ReportType) => {
    const config: ReportConfig = {
      tenant_id: tenantId,
      report_type: reportType,
      period_start: reportConfig.period_start!,
      period_end: reportConfig.period_end!,
      format: 'JSON'
    };

    const errors = validateReportConfig(config);
    if (errors.length > 0) {
      alert(`Erros de validação:\n${errors.join('\n')}`);
      return;
    }

    switch (reportType) {
      case 'INCOME_STATEMENT':
        await generateIncomeStatement(config, userId);
        break;
      case 'CASH_FLOW':
        await generateCashFlow(config, userId);
        break;
      case 'ACCOUNTS_RECEIVABLE':
        await generateAccountsReceivable(config, userId);
        break;
      case 'REVENUE_ANALYSIS':
        await generateRevenueAnalysis(config, userId);
        break;
      case 'PROFITABILITY_ANALYSIS':
        await generateProfitabilityAnalysis(config, userId);
        break;
      case 'BUDGET_VARIANCE':
        await generateBudgetVariance(config, userId);
        break;
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este relatório?')) {
      const success = await deleteReport(reportId, userId);
      if (success) {
        searchReports(searchFilters);
      }
    }
  };

  const handleViewReport = async (reportId: string) => {
    await getReport(reportId);
    setShowReportDetails(reportId);
  };

  const handleExportReport = async (reportId: string, format: ReportFormat) => {
    await exportReportData(reportId, format);
  };

  const handleSearchReports = () => {
    searchReports({ ...searchFilters, offset: 0 });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'GENERATING':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Relatórios Financeiros</h2>
            <p className="text-gray-600 mt-1">
              Gere e gerencie relatórios financeiros detalhados
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Total de relatórios: {searchTotal}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'generate', label: 'Gerar Relatório', icon: <Plus className="w-4 h-4" /> },
              { id: 'reports', label: 'Relatórios Salvos', icon: <FileText className="w-4 h-4" /> },
              { id: 'data', label: 'Dados Específicos', icon: <BarChart3 className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Gerar Relatório */}
          {activeTab === 'generate' && (
            <div className="space-y-6">
              {/* Seleção de Tipo de Relatório */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tipo de Relatório</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {REPORT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedReportType(type.value)}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        selectedReportType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        {type.icon}
                        <span className="font-medium">{type.label}</span>
                      </div>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configurações do Relatório */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={reportConfig.period_start ? format(reportConfig.period_start, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      period_start: e.target.value ? new Date(e.target.value) : undefined
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Fim
                  </label>
                  <input
                    type="date"
                    value={reportConfig.period_end ? format(reportConfig.period_end, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      period_end: e.target.value ? new Date(e.target.value) : undefined
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato
                  </label>
                  <select
                    value={reportConfig.format || 'JSON'}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      format: e.target.value as ReportFormat
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {REPORT_FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título (Opcional)
                  </label>
                  <input
                    type="text"
                    value={reportConfig.title || ''}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      title: e.target.value
                    }))}
                    placeholder="Título personalizado do relatório"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição (Opcional)
                </label>
                <textarea
                  value={reportConfig.description || ''}
                  onChange={(e) => setReportConfig(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Descrição do relatório"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Botão de Geração */}
              <div className="flex justify-end">
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || !reportConfig.period_start || !reportConfig.period_end}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>{isGenerating ? 'Gerando...' : 'Gerar Relatório'}</span>
                </button>
              </div>

              {/* Resultado da Geração */}
              {generationResult && (
                <div className={`p-4 rounded-lg border ${
                  generationResult.status === 'COMPLETED'
                    ? 'bg-green-50 border-green-200'
                    : generationResult.status === 'FAILED'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-warning/10 border-warning/20'
                }`}>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(generationResult.status)}
                    <span className="font-medium">
                      {generationResult.status === 'COMPLETED' && 'Relatório gerado com sucesso!'}
                      {generationResult.status === 'FAILED' && 'Erro ao gerar relatório'}
                      {generationResult.status === 'GENERATING' && 'Gerando relatório...'}
                    </span>
                  </div>
                  {generationResult.error && (
                    <p className="text-sm text-red-600 mt-2">{generationResult.error}</p>
                  )}
                  {generationResult.file_url && (
                    <div className="mt-2">
                      <a
                        href={generationResult.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Baixar arquivo
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: Relatórios Salvos */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Filtros de Busca */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Relatório
                    </label>
                    <select
                      value={searchFilters.report_type || ''}
                      onChange={(e) => setSearchFilters(prev => ({
                        ...prev,
                        report_type: e.target.value as ReportType || undefined
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Todos os tipos</option>
                      {REPORT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={searchFilters.status || ''}
                      onChange={(e) => setSearchFilters(prev => ({
                        ...prev,
                        status: e.target.value as any || undefined
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Todos os status</option>
                      <option value="COMPLETED">Concluído</option>
                      <option value="GENERATING">Gerando</option>
                      <option value="FAILED">Falhou</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Geração
                    </label>
                    <input
                      type="date"
                      value={searchFilters.date_from ? format(searchFilters.date_from, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setSearchFilters(prev => ({
                        ...prev,
                        date_from: e.target.value ? new Date(e.target.value) : undefined
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleSearchReports}
                      disabled={isSearching}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSearching ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      <span>Buscar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Relatórios */}
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(report.status)}
                          <h4 className="font-medium text-gray-900">{report.title}</h4>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {REPORT_TYPES.find(t => t.value === report.report_type)?.label}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <span>Período: {format(new Date(report.period_start), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(report.period_end), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          <span className="mx-2">•</span>
                          <span>Gerado em: {format(new Date(report.generated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                        </div>
                        {report.description && (
                          <p className="mt-1 text-sm text-gray-600">{report.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewReport(report.id!)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {report.status === 'COMPLETED' && (
                          <div className="flex items-center space-x-1">
                            {REPORT_FORMATS.map((format) => (
                              <button
                                key={format.value}
                                onClick={() => handleExportReport(report.id!, format.value)}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                                title={`Exportar como ${format.label}`}
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            ))}
                          </div>
                        )}
                        
                        <button
                          onClick={() => handleDeleteReport(report.id!)}
                          disabled={isDeleting}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {reports.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum relatório encontrado</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Dados Específicos */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Configuração de Período */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configurar Período</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      value={reportConfig.period_start ? format(reportConfig.period_start, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        period_start: e.target.value ? new Date(e.target.value) : undefined
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Fim
                    </label>
                    <input
                      type="date"
                      value={reportConfig.period_end ? format(reportConfig.period_end, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        period_end: e.target.value ? new Date(e.target.value) : undefined
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Geração Rápida */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {REPORT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleGenerateSpecificReport(type.value)}
                    disabled={isGenerating || !reportConfig.period_start || !reportConfig.period_end}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      {type.icon}
                      <span className="font-medium">{type.label}</span>
                    </div>
                    <p className="text-sm text-gray-600 text-left">{type.description}</p>
                  </button>
                ))}
              </div>

              {/* Exibição de Dados */}
              <div className="space-y-6">
                {/* Demonstrativo de Resultados */}
                {incomeStatementData && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Demonstrativo de Resultados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Receitas</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Receita Bruta:</span>
                            <span className="font-medium">R$ {incomeStatementData.revenue.gross_revenue.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Receita Líquida:</span>
                            <span className="font-medium">R$ {incomeStatementData.revenue.net_revenue.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Despesas</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-medium">R$ {incomeStatementData.expenses.total_expenses.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fixas:</span>
                            <span className="font-medium">R$ {incomeStatementData.expenses.fixed_expenses.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Variáveis:</span>
                            <span className="font-medium">R$ {incomeStatementData.expenses.variable_expenses.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Lucro</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Lucro Bruto:</span>
                            <span className={`font-medium ${
                              incomeStatementData.profit.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              R$ {incomeStatementData.profit.gross_profit.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lucro Líquido:</span>
                            <span className={`font-medium ${
                              incomeStatementData.profit.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              R$ {incomeStatementData.profit.net_profit.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Margem:</span>
                            <span className="font-medium">{incomeStatementData.profit.profit_margin.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contas a Receber */}
                {accountsReceivableData && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Contas a Receber</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Resumo</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Total a Receber:</span>
                            <span className="font-medium">R$ {accountsReceivableData.total_receivable.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Em Atraso:</span>
                            <span className="font-medium text-red-600">R$ {accountsReceivableData.overdue_amount.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Atual:</span>
                            <span className="font-medium text-green-600">R$ {accountsReceivableData.current_amount.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Indicadores</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Eficiência de Cobrança:</span>
                            <span className="font-medium">{accountsReceivableData.collection_efficiency.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Prazo Médio de Recebimento:</span>
                            <span className="font-medium">{accountsReceivableData.average_collection_period.toFixed(0)} dias</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Análise de Receitas */}
                {revenueAnalysisData && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Análise de Receitas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Resumo</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Receita Total:</span>
                            <span className="font-medium">R$ {revenueAnalysisData.total_revenue.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recorrente:</span>
                            <span className="font-medium">R$ {revenueAnalysisData.recurring_revenue.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Única:</span>
                            <span className="font-medium">R$ {revenueAnalysisData.one_time_revenue.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <h4 className="font-medium text-gray-700 mb-2">Tendências</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Crescimento Mensal:</span>
                            <span className={`font-medium ${
                              revenueAnalysisData.revenue_trends.monthly_growth_rate >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {revenueAnalysisData.revenue_trends.monthly_growth_rate.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

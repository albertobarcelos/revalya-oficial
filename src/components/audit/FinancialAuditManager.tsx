import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Shield,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  UserX,
  BarChart3,
  Lock,
  Trash2
} from 'lucide-react';
import {
  useFinancialAudit,
  AuditActionType,
  AuditEntityType,
  RiskLevel,
  ComplianceRegulation,
  IntegrityCheckType
} from '../../hooks/useFinancialAudit';

interface FinancialAuditManagerProps {
  tenantId: string;
  userId: string;
  className?: string;
}

interface AuditFilters {
  start_date?: Date;
  end_date?: Date;
  user_id?: string;
  action_type?: AuditActionType;
  entity_type?: AuditEntityType;
  entity_id?: string;
  risk_level?: RiskLevel;
  limit: number;
  offset: number;
}

/**
 * Componente para gerenciar auditoria e compliance financeiro
 * Oferece interface completa para monitoramento, relatórios e verificações
 */
export const FinancialAuditManager: React.FC<FinancialAuditManagerProps> = ({
  tenantId,
  userId,
  className = ''
}) => {
  const {
    // Estados de carregamento
    isFetchingLogs,
    isGeneratingReport,
    isPerformingChecks,
    isAnonymizing,
    isExporting,

    // Resultados
    auditLogs,
    totalLogs,
    complianceReport,
    integrityChecks,

    // Funções
    fetchAuditLogs,
    generateComplianceReport,
    performIntegrityChecks,
    anonymizeData,
    exportAuditData,
    clearResults,
    clearLogs
  } = useFinancialAudit();

  // Estados locais
  const [activeTab, setActiveTab] = useState<'logs' | 'compliance' | 'integrity' | 'anonymization'>('logs');
  const [filters, setFilters] = useState<AuditFilters>({
    limit: 50,
    offset: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [reportPeriod, setReportPeriod] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    end: new Date()
  });
  const [selectedRegulations, setSelectedRegulations] = useState<ComplianceRegulation[]>(['LGPD', 'SOX']);
  const [selectedCheckTypes, setSelectedCheckTypes] = useState<IntegrityCheckType[]>([
    'BALANCE_RECONCILIATION',
    'PAYMENT_VERIFICATION'
  ]);
  const [anonymizationForm, setAnonymizationForm] = useState({
    entity_type: 'CUSTOMER' as AuditEntityType,
    entity_id: '',
    fields: [] as string[]
  });

  // Carregar logs iniciais
  useEffect(() => {
    handleFetchLogs();
  }, [tenantId]);

  /**
   * Busca logs de auditoria
   */
  const handleFetchLogs = async () => {
    await fetchAuditLogs({
      tenant_id: tenantId,
      ...filters
    });
  };

  /**
   * Gera relatório de compliance
   */
  const handleGenerateReport = async () => {
    await generateComplianceReport(
      tenantId,
      reportPeriod.start,
      reportPeriod.end,
      selectedRegulations
    );
  };

  /**
   * Executa verificações de integridade
   */
  const handleIntegrityChecks = async () => {
    await performIntegrityChecks(tenantId, selectedCheckTypes);
  };

  /**
   * Anonimiza dados
   */
  const handleAnonymizeData = async () => {
    if (!anonymizationForm.entity_id || anonymizationForm.fields.length === 0) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    await anonymizeData(
      tenantId,
      anonymizationForm.entity_type,
      anonymizationForm.entity_id,
      anonymizationForm.fields,
      userId
    );
  };

  /**
   * Exporta dados
   */
  const handleExport = async (type: 'CSV' | 'JSON' | 'PDF') => {
    await exportAuditData(tenantId, type, filters, userId);
  };

  /**
   * Aplica filtros
   */
  const handleApplyFilters = () => {
    setFilters({ ...filters, offset: 0 });
    handleFetchLogs();
    setShowFilters(false);
  };

  /**
   * Limpa filtros
   */
  const handleClearFilters = () => {
    setFilters({ limit: 50, offset: 0 });
    handleFetchLogs();
  };

  /**
   * Renderiza ícone de risco
   */
  const renderRiskIcon = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'LOW':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  /**
   * Renderiza cor do risco
   */
  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL': return 'text-danger bg-danger/10';
      case 'HIGH': return 'text-warning bg-warning/10';
      case 'MEDIUM': return 'text-warning bg-warning/10';
      case 'LOW': return 'text-success bg-success/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className={`bg-card rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-card-foreground">Auditoria e Compliance</h2>
              <p className="text-muted-foreground">Monitoramento e controle de segurança financeira</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>
            <button
              onClick={clearResults}
              className="flex items-center space-x-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-6">
          {[
            { id: 'logs', label: 'Logs de Auditoria', icon: Eye },
            { id: 'compliance', label: 'Compliance', icon: FileText },
            { id: 'integrity', label: 'Integridade', icon: CheckCircle },
            { id: 'anonymization', label: 'Anonimização', icon: UserX }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={filters.start_date ? format(filters.start_date, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilters({
                  ...filters,
                  start_date: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={filters.end_date ? format(filters.end_date, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilters({
                  ...filters,
                  end_date: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Ação
              </label>
              <select
                value={filters.action_type || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  action_type: e.target.value as AuditActionType || undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                <option value="CREATE">Criar</option>
                <option value="UPDATE">Atualizar</option>
                <option value="DELETE">Excluir</option>
                <option value="VIEW">Visualizar</option>
                <option value="EXPORT">Exportar</option>
                <option value="PAYMENT_RECEIVED">Pagamento Recebido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nível de Risco
              </label>
              <select
                value={filters.risk_level || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  risk_level: e.target.value as RiskLevel || undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="LOW">Baixo</option>
                <option value="MEDIUM">Médio</option>
                <option value="HIGH">Alto</option>
                <option value="CRITICAL">Crítico</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={handleApplyFilters}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aplicar
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="p-6">
        {/* Tab: Logs de Auditoria */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Ações */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {totalLogs} logs encontrados
                </span>
                <button
                  onClick={handleFetchLogs}
                  disabled={isFetchingLogs}
                  className="flex items-center space-x-2 px-3 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingLogs ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExport('CSV')}
                  disabled={isExporting}
                  className="flex items-center space-x-2 px-3 py-1 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => handleExport('JSON')}
                  disabled={isExporting}
                  className="flex items-center space-x-2 px-3 py-1 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={() => handleExport('PDF')}
                  disabled={isExporting}
                  className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Tabela de Logs */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Data/Hora</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Usuário</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Ação</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Entidade</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Risco</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        {log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }) : '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{log.user_id}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div>
                          <div className="font-medium">{log.entity_type}</div>
                          <div className="text-sm text-muted-foreground">{log.entity_id}</div>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs ${getRiskColor(log.risk_level)}`}>
                          {renderRiskIcon(log.risk_level)}
                          <span>{log.risk_level}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{log.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {auditLogs.length === 0 && !isFetchingLogs && (
              <div className="text-center py-8 text-gray-500">
                Nenhum log de auditoria encontrado
              </div>
            )}
          </div>
        )}

        {/* Tab: Compliance */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            {/* Configuração do Relatório */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gerar Relatório de Compliance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={format(reportPeriod.start, 'yyyy-MM-dd')}
                    onChange={(e) => setReportPeriod({
                      ...reportPeriod,
                      start: new Date(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={format(reportPeriod.end, 'yyyy-MM-dd')}
                    onChange={(e) => setReportPeriod({
                      ...reportPeriod,
                      end: new Date(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Regulamentações
                  </label>
                  <div className="space-y-2">
                    {['LGPD', 'SOX', 'PCI_DSS', 'ISO_27001'].map((reg) => (
                      <label key={reg} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedRegulations.includes(reg as ComplianceRegulation)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRegulations([...selectedRegulations, reg as ComplianceRegulation]);
                            } else {
                              setSelectedRegulations(selectedRegulations.filter(r => r !== reg));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{reg}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="mt-4 flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <BarChart3 className={`w-4 h-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                <span>{isGeneratingReport ? 'Gerando...' : 'Gerar Relatório'}</span>
              </button>
            </div>

            {/* Relatório de Compliance */}
            {complianceReport && (
              <div className="bg-white border border-gray-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Relatório de Compliance</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{complianceReport.total_operations}</div>
                    <div className="text-sm text-muted-foreground">Total de Operações</div>
                  </div>
                  <div className="bg-warning/10 p-4 rounded-lg">
                     <div className="text-2xl font-bold text-warning">{complianceReport.high_risk_operations}</div>
                     <div className="text-sm text-muted-foreground">Operações de Alto Risco</div>
                  </div>
                  <div className="bg-danger/10 p-4 rounded-lg">
                     <div className="text-2xl font-bold text-danger">{complianceReport.compliance_violations.length}</div>
                     <div className="text-sm text-muted-foreground">Violações</div>
                  </div>
                  <div className="bg-success/10 p-4 rounded-lg">
                     <div className="text-2xl font-bold text-success">{complianceReport.data_access_summary.export_operations}</div>
                     <div className="text-sm text-muted-foreground">Exportações</div>
                  </div>
                </div>

                {/* Recomendações */}
                {complianceReport.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Recomendações</h4>
                    <div className="space-y-2">
                      {complianceReport.recommendations.map((rec, index) => (
                        <div key={index} className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                            <span className="font-medium text-warning">{rec.category}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              rec.priority === 'CRITICAL' ? 'bg-danger/10 text-danger' :
                              rec.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{rec.description}</p>
                          <p className="text-sm text-gray-600 mt-1"><strong>Ação:</strong> {rec.action_required}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Verificações de Integridade */}
        {activeTab === 'integrity' && (
          <div className="space-y-6">
            {/* Configuração das Verificações */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Verificações de Integridade</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipos de Verificação
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'BALANCE_RECONCILIATION', label: 'Reconciliação de Saldos' },
                      { id: 'PAYMENT_VERIFICATION', label: 'Verificação de Pagamentos' },
                      { id: 'CALCULATION_ACCURACY', label: 'Precisão de Cálculos' },
                      { id: 'TOTALS_VALIDATION', label: 'Validação de Totais' }
                    ].map(({ id, label }) => (
                      <label key={id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCheckTypes.includes(id as IntegrityCheckType)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCheckTypes([...selectedCheckTypes, id as IntegrityCheckType]);
                            } else {
                              setSelectedCheckTypes(selectedCheckTypes.filter(t => t !== id));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleIntegrityChecks}
                disabled={isPerformingChecks}
                className="mt-4 flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className={`w-4 h-4 ${isPerformingChecks ? 'animate-spin' : ''}`} />
                <span>{isPerformingChecks ? 'Verificando...' : 'Executar Verificações'}</span>
              </button>
            </div>

            {/* Resultados das Verificações */}
            {integrityChecks.length > 0 && (
              <div className="bg-white border border-gray-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados das Verificações</h3>
                <div className="space-y-3">
                  {integrityChecks.map((check, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${
                      check.status === 'PASS' ? 'border-green-200 bg-green-50' :
                      check.status === 'WARNING' ? 'border-yellow-200 bg-yellow-50' :
                      'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {check.status === 'PASS' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : check.status === 'WARNING' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <div>
                            <div className="font-medium">{check.check_type}</div>
                            <div className="text-sm text-gray-600">{check.entity_type} - {check.entity_id}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{check.status}</div>
                          <div className="text-sm text-gray-600">
                            Variação: {check.variance_percentage.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      {check.details && (
                        <div className="mt-2 text-sm text-gray-700">
                          {check.details}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Anonimização */}
        {activeTab === 'anonymization' && (
          <div className="space-y-6">
            {/* Formulário de Anonimização */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Anonimização de Dados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Entidade
                  </label>
                  <select
                    value={anonymizationForm.entity_type}
                    onChange={(e) => setAnonymizationForm({
                      ...anonymizationForm,
                      entity_type: e.target.value as AuditEntityType
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="CUSTOMER">Cliente</option>
                    <option value="CONTRACT">Contrato</option>
                    <option value="BILLING">Faturamento</option>
                    <option value="PAYMENT">Pagamento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID da Entidade
                  </label>
                  <input
                    type="text"
                    value={anonymizationForm.entity_id}
                    onChange={(e) => setAnonymizationForm({
                      ...anonymizationForm,
                      entity_id: e.target.value
                    })}
                    placeholder="ID da entidade a ser anonimizada"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campos a Anonimizar
                  </label>
                  <div className="space-y-2">
                    {['cpf_cnpj', 'email', 'phone', 'name', 'address'].map((field) => (
                      <label key={field} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={anonymizationForm.fields.includes(field)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAnonymizationForm({
                                ...anonymizationForm,
                                fields: [...anonymizationForm.fields, field]
                              });
                            } else {
                              setAnonymizationForm({
                                ...anonymizationForm,
                                fields: anonymizationForm.fields.filter(f => f !== field)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{field}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleAnonymizeData}
                disabled={isAnonymizing}
                className="mt-4 flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <UserX className={`w-4 h-4 ${isAnonymizing ? 'animate-spin' : ''}`} />
                <span>{isAnonymizing ? 'Anonimizando...' : 'Anonimizar Dados'}</span>
              </button>
            </div>

            {/* Aviso de Segurança */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">Atenção: Operação Irreversível</span>
              </div>
              <p className="text-sm text-red-700 mt-2">
                A anonimização de dados é uma operação irreversível. Uma vez executada, os dados originais não poderão ser recuperados.
                Esta ação deve ser realizada apenas em conformidade com a LGPD e outras regulamentações aplicáveis.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialAuditManager;

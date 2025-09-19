import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  financialAuditService,
  AuditLogEntry,
  AuditActionType,
  AuditEntityType,
  RiskLevel,
  ComplianceReport,
  ComplianceRegulation,
  FinancialIntegrityCheck,
  IntegrityCheckType
} from '../services/financialAuditService';

export interface UseFinancialAuditReturn {
  // Estados de carregamento
  isLogging: boolean;
  isFetchingLogs: boolean;
  isGeneratingReport: boolean;
  isPerformingChecks: boolean;
  isAnonymizing: boolean;
  isExporting: boolean;

  // Resultados
  auditLogs: AuditLogEntry[];
  totalLogs: number;
  complianceReport: ComplianceReport | null;
  integrityChecks: FinancialIntegrityCheck[];
  exportResult: { content: string; filename: string } | null;

  // Funções
  logAuditEntry: (entry: Omit<AuditLogEntry, 'id' | 'created_at'>) => Promise<string | null>;
  fetchAuditLogs: (filters: {
    tenant_id: string;
    start_date?: Date;
    end_date?: Date;
    user_id?: string;
    action_type?: AuditActionType;
    entity_type?: AuditEntityType;
    entity_id?: string;
    risk_level?: RiskLevel;
    limit?: number;
    offset?: number;
  }) => Promise<void>;
  generateComplianceReport: (
    tenant_id: string,
    period_start: Date,
    period_end: Date,
    regulations?: ComplianceRegulation[]
  ) => Promise<void>;
  performIntegrityChecks: (
    tenant_id: string,
    check_types?: IntegrityCheckType[]
  ) => Promise<void>;
  anonymizeData: (
    tenant_id: string,
    entity_type: AuditEntityType,
    entity_id: string,
    fields_to_anonymize: string[],
    user_id: string
  ) => Promise<void>;
  exportAuditData: (
    tenant_id: string,
    export_type: 'CSV' | 'JSON' | 'PDF',
    filters: any,
    user_id: string
  ) => Promise<void>;
  clearResults: () => void;
  clearLogs: () => void;
}

/**
 * Hook para gerenciar operações de auditoria e compliance financeiro
 * Encapsula toda a lógica do financialAuditService
 */
export const useFinancialAudit = (): UseFinancialAuditReturn => {
  // Estados de carregamento
  const [isLogging, setIsLogging] = useState(false);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isPerformingChecks, setIsPerformingChecks] = useState(false);
  const [isAnonymizing, setIsAnonymizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Estados de resultados
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [integrityChecks, setIntegrityChecks] = useState<FinancialIntegrityCheck[]>([]);
  const [exportResult, setExportResult] = useState<{ content: string; filename: string } | null>(null);

  /**
   * Registra entrada de auditoria
   */
  const logAuditEntry = useCallback(async (
    entry: Omit<AuditLogEntry, 'id' | 'created_at'>
  ): Promise<string | null> => {
    setIsLogging(true);
    try {
      const auditId = await financialAuditService.logAuditEntry(entry);
      
      toast.success('Entrada de auditoria registrada com sucesso');
      return auditId;
    } catch (error) {
      console.error('Erro ao registrar auditoria:', error);
      toast.error('Erro ao registrar entrada de auditoria');
      return null;
    } finally {
      setIsLogging(false);
    }
  }, []);

  /**
   * Busca logs de auditoria
   */
  const fetchAuditLogs = useCallback(async (filters: {
    tenant_id: string;
    start_date?: Date;
    end_date?: Date;
    user_id?: string;
    action_type?: AuditActionType;
    entity_type?: AuditEntityType;
    entity_id?: string;
    risk_level?: RiskLevel;
    limit?: number;
    offset?: number;
  }): Promise<void> => {
    setIsFetchingLogs(true);
    try {
      const result = await financialAuditService.getAuditLogs(filters);
      
      setAuditLogs(result.logs);
      setTotalLogs(result.total);
      
      toast.success(`${result.logs.length} logs de auditoria carregados`);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      toast.error('Erro ao carregar logs de auditoria');
      setAuditLogs([]);
      setTotalLogs(0);
    } finally {
      setIsFetchingLogs(false);
    }
  }, []);

  /**
   * Gera relatório de compliance
   */
  const generateComplianceReport = useCallback(async (
    tenant_id: string,
    period_start: Date,
    period_end: Date,
    regulations?: ComplianceRegulation[]
  ): Promise<void> => {
    setIsGeneratingReport(true);
    try {
      const report = await financialAuditService.generateComplianceReport(
        tenant_id,
        period_start,
        period_end,
        regulations
      );
      
      setComplianceReport(report);
      
      toast.success('Relatório de compliance gerado com sucesso');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório de compliance');
      setComplianceReport(null);
    } finally {
      setIsGeneratingReport(false);
    }
  }, []);

  /**
   * Executa verificações de integridade
   */
  const performIntegrityChecks = useCallback(async (
    tenant_id: string,
    check_types?: IntegrityCheckType[]
  ): Promise<void> => {
    setIsPerformingChecks(true);
    try {
      const checks = await financialAuditService.performIntegrityChecks(
        tenant_id,
        check_types
      );
      
      setIntegrityChecks(checks);
      
      const failedChecks = checks.filter(check => check.status === 'FAIL').length;
      const warningChecks = checks.filter(check => check.status === 'WARNING').length;
      
      if (failedChecks > 0) {
        toast.error(`${failedChecks} verificações falharam`);
      } else if (warningChecks > 0) {
        toast.warning(`${warningChecks} verificações com alertas`);
      } else {
        toast.success('Todas as verificações de integridade passaram');
      }
    } catch (error) {
      console.error('Erro ao executar verificações:', error);
      toast.error('Erro ao executar verificações de integridade');
      setIntegrityChecks([]);
    } finally {
      setIsPerformingChecks(false);
    }
  }, []);

  /**
   * Anonimiza dados sensíveis
   */
  const anonymizeData = useCallback(async (
    tenant_id: string,
    entity_type: AuditEntityType,
    entity_id: string,
    fields_to_anonymize: string[],
    user_id: string
  ): Promise<void> => {
    setIsAnonymizing(true);
    try {
      await financialAuditService.anonymizeData(
        tenant_id,
        entity_type,
        entity_id,
        fields_to_anonymize,
        user_id
      );
      
      toast.success('Dados anonimizados com sucesso');
    } catch (error) {
      console.error('Erro ao anonimizar dados:', error);
      toast.error('Erro ao anonimizar dados');
    } finally {
      setIsAnonymizing(false);
    }
  }, []);

  /**
   * Exporta dados de auditoria
   */
  const exportAuditData = useCallback(async (
    tenant_id: string,
    export_type: 'CSV' | 'JSON' | 'PDF',
    filters: any,
    user_id: string
  ): Promise<void> => {
    setIsExporting(true);
    try {
      const result = await financialAuditService.exportAuditData(
        tenant_id,
        export_type,
        filters,
        user_id
      );
      
      setExportResult(result);
      
      // Criar download automático
      const blob = new Blob([result.content], {
        type: export_type === 'CSV' ? 'text/csv' : 
              export_type === 'JSON' ? 'application/json' : 
              'application/pdf'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Dados exportados: ${result.filename}`);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error('Erro ao exportar dados de auditoria');
      setExportResult(null);
    } finally {
      setIsExporting(false);
    }
  }, []);

  /**
   * Limpa todos os resultados
   */
  const clearResults = useCallback(() => {
    setComplianceReport(null);
    setIntegrityChecks([]);
    setExportResult(null);
  }, []);

  /**
   * Limpa logs de auditoria
   */
  const clearLogs = useCallback(() => {
    setAuditLogs([]);
    setTotalLogs(0);
  }, []);

  return {
    // Estados de carregamento
    isLogging,
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
    exportResult,

    // Funções
    logAuditEntry,
    fetchAuditLogs,
    generateComplianceReport,
    performIntegrityChecks,
    anonymizeData,
    exportAuditData,
    clearResults,
    clearLogs
  };
};

export default useFinancialAudit;

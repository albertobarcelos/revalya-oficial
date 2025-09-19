import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

export interface AuditLogEntry {
  id?: string;
  tenant_id: string;
  user_id: string;
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  risk_level: RiskLevel;
  compliance_flags?: ComplianceFlag[];
  created_at?: string;
  created_by?: string;
}

export type AuditActionType = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'IMPORT'
  | 'CALCULATE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'CONTRACT_SIGNED'
  | 'CONTRACT_TERMINATED'
  | 'DATA_ANONYMIZED'
  | 'DATA_MASKED';

export type AuditEntityType = 
  | 'CONTRACT'
  | 'BILLING'
  | 'PAYMENT'
  | 'CUSTOMER'
  | 'USER'
  | 'FINANCIAL_CALCULATION'
  | 'REPORT'
  | 'CONFIGURATION'
  | 'INTEGRATION'
  | 'WEBHOOK';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ComplianceFlag {
  regulation: ComplianceRegulation;
  requirement: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  details?: string;
}

export type ComplianceRegulation = 
  | 'LGPD'
  | 'SOX'
  | 'PCI_DSS'
  | 'ISO_27001'
  | 'BACEN'
  | 'CVM'
  | 'INTERNAL_POLICY';

export interface DataMaskingRule {
  field_name: string;
  mask_type: MaskType;
  mask_pattern?: string;
  preserve_length?: boolean;
  preserve_format?: boolean;
}

export type MaskType = 
  | 'FULL_MASK'
  | 'PARTIAL_MASK'
  | 'HASH'
  | 'ENCRYPT'
  | 'TOKENIZE'
  | 'REDACT';

export interface ComplianceReport {
  period_start: Date;
  period_end: Date;
  total_operations: number;
  high_risk_operations: number;
  compliance_violations: ComplianceViolation[];
  data_access_summary: DataAccessSummary;
  recommendations: ComplianceRecommendation[];
  generated_at: Date;
  generated_by: string;
}

export interface ComplianceViolation {
  id: string;
  regulation: ComplianceRegulation;
  violation_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  entity_type: AuditEntityType;
  entity_id: string;
  detected_at: Date;
  resolved_at?: Date;
  resolution_notes?: string;
}

export interface DataAccessSummary {
  total_data_access: number;
  sensitive_data_access: number;
  export_operations: number;
  failed_access_attempts: number;
  unusual_access_patterns: number;
}

export interface ComplianceRecommendation {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  description: string;
  action_required: string;
  estimated_effort: string;
  compliance_impact: string;
}

export interface FinancialIntegrityCheck {
  check_type: IntegrityCheckType;
  entity_type: AuditEntityType;
  entity_id: string;
  expected_value: number;
  actual_value: number;
  variance: number;
  variance_percentage: number;
  tolerance_threshold: number;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details?: string;
  checked_at: Date;
}

export type IntegrityCheckType = 
  | 'BALANCE_RECONCILIATION'
  | 'PAYMENT_VERIFICATION'
  | 'CALCULATION_ACCURACY'
  | 'TOTALS_VALIDATION'
  | 'SEQUENCE_INTEGRITY'
  | 'DUPLICATE_DETECTION';

/**
 * Serviço especializado em auditoria e compliance financeiro
 * Garante rastreabilidade total e conformidade com regulamentações
 */
class FinancialAuditService {
  private readonly SENSITIVE_FIELDS = [
    'cpf_cnpj',
    'email',
    'phone',
    'bank_account',
    'credit_card',
    'password',
    'token',
    'api_key'
  ];

  private readonly HIGH_RISK_ACTIONS = [
    'DELETE',
    'EXPORT',
    'DATA_ANONYMIZED',
    'PAYMENT_RECEIVED',
    'CONTRACT_TERMINATED'
  ];

  /**
   * Registra entrada de auditoria
   */
  async logAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<string> {
    try {
      // Mascarar dados sensíveis antes de salvar
      const maskedEntry = this.maskSensitiveData(entry);
      
      // Determinar nível de risco
      const riskLevel = this.calculateRiskLevel(maskedEntry);
      
      // Verificar compliance
      const complianceFlags = await this.checkCompliance(maskedEntry);
      
      const auditEntry: AuditLogEntry = {
        ...maskedEntry,
        risk_level: riskLevel,
        compliance_flags: complianceFlags,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('audit_logs')
        .insert([auditEntry])
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao registrar auditoria:', error);
        throw error;
      }

      // Se for operação de alto risco, enviar alerta
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        await this.sendRiskAlert(auditEntry);
      }

      return data.id;
    } catch (error) {
      console.error('Erro no serviço de auditoria:', error);
      throw error;
    }
  }

  /**
   * Busca logs de auditoria com filtros
   */
  async getAuditLogs(filters: {
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
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('tenant_id', filters.tenant_id)
        .order('created_at', { ascending: false });

      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date.toISOString());
      }

      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date.toISOString());
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }

      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }

      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }

      if (filters.risk_level) {
        query = query.eq('risk_level', filters.risk_level);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar logs de auditoria:', error);
        throw error;
      }

      return {
        logs: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Erro no serviço de auditoria:', error);
      throw error;
    }
  }

  /**
   * Gera relatório de compliance
   */
  async generateComplianceReport(
    tenant_id: string,
    period_start: Date,
    period_end: Date,
    regulations?: ComplianceRegulation[]
  ): Promise<ComplianceReport> {
    try {
      // Buscar logs do período
      const { logs } = await this.getAuditLogs({
        tenant_id,
        start_date: period_start,
        end_date: period_end,
        limit: 10000
      });

      // Analisar operações
      const totalOperations = logs.length;
      const highRiskOperations = logs.filter(log => 
        log.risk_level === 'HIGH' || log.risk_level === 'CRITICAL'
      ).length;

      // Identificar violações de compliance
      const violations = await this.identifyComplianceViolations(logs, regulations);

      // Gerar resumo de acesso a dados
      const dataAccessSummary = this.generateDataAccessSummary(logs);

      // Gerar recomendações
      const recommendations = await this.generateComplianceRecommendations(
        logs,
        violations,
        dataAccessSummary
      );

      return {
        period_start,
        period_end,
        total_operations: totalOperations,
        high_risk_operations: highRiskOperations,
        compliance_violations: violations,
        data_access_summary: dataAccessSummary,
        recommendations,
        generated_at: new Date(),
        generated_by: 'system'
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de compliance:', error);
      throw error;
    }
  }

  /**
   * Executa verificações de integridade financeira
   */
  async performIntegrityChecks(
    tenant_id: string,
    check_types?: IntegrityCheckType[]
  ): Promise<FinancialIntegrityCheck[]> {
    try {
      const checks: FinancialIntegrityCheck[] = [];
      const typesToCheck = check_types || [
        'BALANCE_RECONCILIATION',
        'PAYMENT_VERIFICATION',
        'CALCULATION_ACCURACY',
        'TOTALS_VALIDATION'
      ];

      for (const checkType of typesToCheck) {
        const checkResults = await this.executeIntegrityCheck(tenant_id, checkType);
        checks.push(...checkResults);
      }

      // Salvar resultados das verificações
      await this.saveIntegrityCheckResults(checks);

      return checks;
    } catch (error) {
      console.error('Erro ao executar verificações de integridade:', error);
      throw error;
    }
  }

  /**
   * Anonimiza dados sensíveis para compliance com LGPD
   */
  async anonymizeData(
    tenant_id: string,
    entity_type: AuditEntityType,
    entity_id: string,
    fields_to_anonymize: string[],
    user_id: string
  ): Promise<void> {
    try {
      // Buscar dados originais
      const originalData = await this.getEntityData(entity_type, entity_id);
      
      // Aplicar anonimização
      const anonymizedData = this.applyDataAnonymization(originalData, fields_to_anonymize);
      
      // Atualizar dados
      await this.updateEntityData(entity_type, entity_id, anonymizedData);
      
      // Registrar auditoria
      await this.logAuditEntry({
        tenant_id,
        user_id,
        action_type: 'DATA_ANONYMIZED',
        entity_type,
        entity_id,
        old_values: this.maskSensitiveData({ data: originalData }).data,
        new_values: anonymizedData,
        metadata: {
          anonymized_fields: fields_to_anonymize,
          reason: 'LGPD_COMPLIANCE'
        },
        risk_level: 'HIGH'
      });
    } catch (error) {
      console.error('Erro ao anonimizar dados:', error);
      throw error;
    }
  }

  /**
   * Exporta dados para auditoria externa
   */
  async exportAuditData(
    tenant_id: string,
    export_type: 'CSV' | 'JSON' | 'PDF',
    filters: any,
    user_id: string
  ): Promise<{ content: string; filename: string }> {
    try {
      const { logs } = await this.getAuditLogs({ tenant_id, ...filters });
      
      let content: string;
      let filename: string;
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');

      switch (export_type) {
        case 'CSV':
          content = this.generateCSVExport(logs);
          filename = `audit_export_${timestamp}.csv`;
          break;
        case 'JSON':
          content = JSON.stringify(logs, null, 2);
          filename = `audit_export_${timestamp}.json`;
          break;
        case 'PDF':
          content = await this.generatePDFExport(logs);
          filename = `audit_export_${timestamp}.pdf`;
          break;
        default:
          throw new Error(`Tipo de exportação não suportado: ${export_type}`);
      }

      // Registrar exportação
      await this.logAuditEntry({
        tenant_id,
        user_id,
        action_type: 'EXPORT',
        entity_type: 'REPORT',
        entity_id: `audit_export_${timestamp}`,
        metadata: {
          export_type,
          records_count: logs.length,
          filters
        },
        risk_level: 'HIGH'
      });

      return { content, filename };
    } catch (error) {
      console.error('Erro ao exportar dados de auditoria:', error);
      throw error;
    }
  }

  /**
   * Calcula nível de risco da operação
   */
  private calculateRiskLevel(entry: AuditLogEntry): RiskLevel {
    let riskScore = 0;

    // Ação de alto risco
    if (this.HIGH_RISK_ACTIONS.includes(entry.action_type)) {
      riskScore += 3;
    }

    // Dados sensíveis envolvidos
    if (this.containsSensitiveData(entry)) {
      riskScore += 2;
    }

    // Operação fora do horário comercial
    const hour = new Date().getHours();
    if (hour < 8 || hour > 18) {
      riskScore += 1;
    }

    // Múltiplas tentativas de acesso
    if (entry.metadata?.failed_attempts && entry.metadata.failed_attempts > 3) {
      riskScore += 2;
    }

    // Determinar nível baseado na pontuação
    if (riskScore >= 6) return 'CRITICAL';
    if (riskScore >= 4) return 'HIGH';
    if (riskScore >= 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Verifica compliance com regulamentações
   */
  private async checkCompliance(entry: AuditLogEntry): Promise<ComplianceFlag[]> {
    const flags: ComplianceFlag[] = [];

    // Verificar LGPD
    if (this.containsSensitiveData(entry)) {
      flags.push({
        regulation: 'LGPD',
        requirement: 'Proteção de dados pessoais',
        status: entry.old_values || entry.new_values ? 'PENDING_REVIEW' : 'COMPLIANT'
      });
    }

    // Verificar SOX (para operações financeiras)
    if (['BILLING', 'PAYMENT', 'FINANCIAL_CALCULATION'].includes(entry.entity_type)) {
      flags.push({
        regulation: 'SOX',
        requirement: 'Controles internos financeiros',
        status: 'COMPLIANT'
      });
    }

    return flags;
  }

  /**
   * Mascara dados sensíveis
   */
  private maskSensitiveData(entry: any): any {
    const masked = { ...entry };

    const maskValue = (value: any, key: string): any => {
      if (typeof value === 'string' && this.SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        if (key.toLowerCase().includes('cpf') || key.toLowerCase().includes('cnpj')) {
          return value.replace(/(\d{3})\d{6}(\d{2})/, '$1******$2');
        }
        if (key.toLowerCase().includes('email')) {
          const [user, domain] = value.split('@');
          return `${user.substring(0, 2)}***@${domain}`;
        }
        if (key.toLowerCase().includes('phone')) {
          return value.replace(/(\d{2})\d{5}(\d{4})/, '$1*****$2');
        }
        return '***MASKED***';
      }
      
      if (typeof value === 'object' && value !== null) {
        const maskedObj: any = {};
        for (const [k, v] of Object.entries(value)) {
          maskedObj[k] = maskValue(v, k);
        }
        return maskedObj;
      }
      
      return value;
    };

    if (masked.old_values) {
      masked.old_values = maskValue(masked.old_values, 'old_values');
    }
    
    if (masked.new_values) {
      masked.new_values = maskValue(masked.new_values, 'new_values');
    }

    return masked;
  }

  /**
   * Verifica se contém dados sensíveis
   */
  private containsSensitiveData(entry: AuditLogEntry): boolean {
    const checkObject = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;
      
      for (const [key, value] of Object.entries(obj)) {
        if (this.SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
          return true;
        }
        if (typeof value === 'object' && checkObject(value)) {
          return true;
        }
      }
      return false;
    };

    return checkObject(entry.old_values) || checkObject(entry.new_values);
  }

  /**
   * Envia alerta de risco
   */
  private async sendRiskAlert(entry: AuditLogEntry): Promise<void> {
    // Implementar notificação para administradores
    console.warn('ALERTA DE RISCO:', {
      risk_level: entry.risk_level,
      action: entry.action_type,
      entity: entry.entity_type,
      user: entry.user_id,
      timestamp: entry.created_at
    });
  }

  /**
   * Identifica violações de compliance
   */
  private async identifyComplianceViolations(
    logs: AuditLogEntry[],
    regulations?: ComplianceRegulation[]
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    
    // Implementar lógica de detecção de violações
    // Por exemplo: acessos não autorizados, exportações sem aprovação, etc.
    
    return violations;
  }

  /**
   * Gera resumo de acesso a dados
   */
  private generateDataAccessSummary(logs: AuditLogEntry[]): DataAccessSummary {
    return {
      total_data_access: logs.filter(log => log.action_type === 'VIEW').length,
      sensitive_data_access: logs.filter(log => 
        log.action_type === 'VIEW' && this.containsSensitiveData(log)
      ).length,
      export_operations: logs.filter(log => log.action_type === 'EXPORT').length,
      failed_access_attempts: logs.filter(log => 
        log.metadata?.status === 'FAILED'
      ).length,
      unusual_access_patterns: logs.filter(log => 
        log.risk_level === 'HIGH' || log.risk_level === 'CRITICAL'
      ).length
    };
  }

  /**
   * Gera recomendações de compliance
   */
  private async generateComplianceRecommendations(
    logs: AuditLogEntry[],
    violations: ComplianceViolation[],
    dataAccessSummary: DataAccessSummary
  ): Promise<ComplianceRecommendation[]> {
    const recommendations: ComplianceRecommendation[] = [];
    
    // Implementar lógica de geração de recomendações
    
    return recommendations;
  }

  /**
   * Executa verificação de integridade específica
   */
  private async executeIntegrityCheck(
    tenant_id: string,
    check_type: IntegrityCheckType
  ): Promise<FinancialIntegrityCheck[]> {
    const checks: FinancialIntegrityCheck[] = [];
    
    // Implementar verificações específicas baseadas no tipo
    
    return checks;
  }

  /**
   * Salva resultados das verificações de integridade
   */
  private async saveIntegrityCheckResults(checks: FinancialIntegrityCheck[]): Promise<void> {
    // Implementar salvamento dos resultados
  }

  /**
   * Busca dados da entidade
   */
  private async getEntityData(entity_type: AuditEntityType, entity_id: string): Promise<any> {
    // Implementar busca baseada no tipo de entidade
    return {};
  }

  /**
   * Atualiza dados da entidade
   */
  private async updateEntityData(
    entity_type: AuditEntityType,
    entity_id: string,
    data: any
  ): Promise<void> {
    // Implementar atualização baseada no tipo de entidade
  }

  /**
   * Aplica anonimização de dados
   */
  private applyDataAnonymization(data: any, fields: string[]): any {
    const anonymized = { ...data };
    
    for (const field of fields) {
      if (anonymized[field]) {
        anonymized[field] = '***ANONYMIZED***';
      }
    }
    
    return anonymized;
  }

  /**
   * Gera exportação CSV
   */
  private generateCSVExport(logs: AuditLogEntry[]): string {
    const headers = [
      'ID',
      'Data/Hora',
      'Usuário',
      'Ação',
      'Entidade',
      'ID da Entidade',
      'Nível de Risco',
      'IP'
    ];

    const rows = logs.map(log => [
      log.id || '',
      log.created_at || '',
      log.user_id,
      log.action_type,
      log.entity_type,
      log.entity_id,
      log.risk_level,
      log.ip_address || ''
    ]);

    return [headers, ...rows].map(row => row.join(';')).join('\n');
  }

  /**
   * Gera exportação PDF
   */
  private async generatePDFExport(logs: AuditLogEntry[]): Promise<string> {
    // Implementar geração de PDF
    return 'PDF content would be generated here';
  }
}

export const financialAuditService = new FinancialAuditService();
export default financialAuditService;

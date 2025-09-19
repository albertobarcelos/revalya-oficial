// =====================================================
// RISK MANAGEMENT TYPES
// Descrição: Tipos para gestão de risco financeiro
// =====================================================

// =====================================================
// RISK ASSESSMENT
// =====================================================

/**
 * Interface para avaliação de risco de crédito
 */
export interface CreditRiskAssessment {
  id: string;
  tenantId: string;
  customerId: string;
  assessmentDate: string;
  score: number; // 0-1000
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  recommendations: string[];
  validUntil: string;
  assessedBy: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type RiskLevel = 
  | 'VERY_LOW'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'VERY_HIGH'
  | 'CRITICAL';

/**
 * Interface para fatores de risco
 */
export interface RiskFactor {
  category: RiskCategory;
  factor: string;
  weight: number; // 0-1
  value: number;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  description?: string;
}

export type RiskCategory = 
  | 'FINANCIAL_HISTORY'
  | 'PAYMENT_BEHAVIOR'
  | 'DEBT_RATIO'
  | 'INCOME_STABILITY'
  | 'MARKET_CONDITIONS'
  | 'REGULATORY_COMPLIANCE'
  | 'OPERATIONAL_RISK'
  | 'CONCENTRATION_RISK';

// =====================================================
// PORTFOLIO RISK
// =====================================================

/**
 * Interface para análise de risco de portfólio
 */
export interface PortfolioRiskAnalysis {
  id: string;
  tenantId: string;
  portfolioId: string;
  analysisDate: string;
  totalValue: number;
  riskMetrics: RiskMetrics;
  concentrationRisk: ConcentrationRisk;
  stressTest: StressTestResult[];
  recommendations: RiskRecommendation[];
  nextReviewDate: string;
  createdBy: string;
  metadata: Record<string, any>;
}

/**
 * Interface para métricas de risco
 */
export interface RiskMetrics {
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  expectedShortfall: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  correlationMatrix?: number[][];
}

/**
 * Interface para risco de concentração
 */
export interface ConcentrationRisk {
  byCustomer: ConcentrationMetric[];
  byIndustry: ConcentrationMetric[];
  byGeography: ConcentrationMetric[];
  byProduct: ConcentrationMetric[];
  herfindahlIndex: number;
}

export interface ConcentrationMetric {
  category: string;
  exposure: number;
  percentage: number;
  riskLevel: RiskLevel;
}

/**
 * Interface para teste de estresse
 */
export interface StressTestResult {
  scenario: StressTestScenario;
  impact: number;
  impactPercentage: number;
  affectedContracts: number;
  recoveryTime: number; // em dias
  mitigationActions: string[];
}

export type StressTestScenario = 
  | 'ECONOMIC_RECESSION'
  | 'INTEREST_RATE_SHOCK'
  | 'CURRENCY_DEVALUATION'
  | 'SECTOR_CRISIS'
  | 'REGULATORY_CHANGE'
  | 'PANDEMIC_IMPACT'
  | 'CYBER_ATTACK'
  | 'NATURAL_DISASTER';

/**
 * Interface para recomendações de risco
 */
export interface RiskRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: RiskCategory;
  action: string;
  expectedImpact: number;
  implementationCost: number;
  timeframe: string;
  responsible?: string;
}

// =====================================================
// COMPLIANCE & REGULATORY
// =====================================================

/**
 * Interface para compliance regulatório
 */
export interface ComplianceCheck {
  id: string;
  tenantId: string;
  regulation: RegulationType;
  checkDate: string;
  status: ComplianceStatus;
  findings: ComplianceFinding[];
  score: number; // 0-100
  nextCheckDate: string;
  responsible: string;
  metadata: Record<string, any>;
}

export type RegulationType = 
  | 'LGPD'
  | 'BACEN_4658'
  | 'CVM_555'
  | 'SOX'
  | 'BASEL_III'
  | 'IFRS'
  | 'PCI_DSS'
  | 'ISO_27001'
  | 'CUSTOM';

export type ComplianceStatus = 
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'PARTIALLY_COMPLIANT'
  | 'UNDER_REVIEW'
  | 'REMEDIATION_REQUIRED';

/**
 * Interface para achados de compliance
 */
export interface ComplianceFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  description: string;
  requirement: string;
  evidence?: string;
  remediation: string;
  dueDate?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED_RISK';
}

// =====================================================
// FRAUD DETECTION
// =====================================================

/**
 * Interface para detecção de fraude
 */
export interface FraudDetection {
  id: string;
  tenantId: string;
  transactionId?: string;
  contractId?: string;
  customerId?: string;
  detectionDate: string;
  fraudScore: number; // 0-100
  riskLevel: RiskLevel;
  indicators: FraudIndicator[];
  status: FraudStatus;
  investigationNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  falsePositive: boolean;
  metadata: Record<string, any>;
}

export type FraudStatus = 
  | 'DETECTED'
  | 'UNDER_INVESTIGATION'
  | 'CONFIRMED_FRAUD'
  | 'FALSE_POSITIVE'
  | 'RESOLVED';

/**
 * Interface para indicadores de fraude
 */
export interface FraudIndicator {
  type: FraudIndicatorType;
  description: string;
  weight: number;
  confidence: number; // 0-1
  evidence: any;
}

export type FraudIndicatorType = 
  | 'UNUSUAL_TRANSACTION_PATTERN'
  | 'VELOCITY_CHECK'
  | 'GEOLOCATION_ANOMALY'
  | 'DEVICE_FINGERPRINT'
  | 'BEHAVIORAL_ANALYSIS'
  | 'BLACKLIST_MATCH'
  | 'DUPLICATE_DETECTION'
  | 'AMOUNT_THRESHOLD'
  | 'TIME_PATTERN'
  | 'NETWORK_ANALYSIS';

// =====================================================
// RISK MONITORING
// =====================================================

/**
 * Interface para monitoramento de risco em tempo real
 */
export interface RiskMonitor {
  id: string;
  tenantId: string;
  monitorType: MonitorType;
  name: string;
  description: string;
  rules: RiskRule[];
  thresholds: RiskThreshold[];
  isActive: boolean;
  lastTriggered?: string;
  alertCount: number;
  createdAt: string;
  updatedAt: string;
}

export type MonitorType = 
  | 'REAL_TIME'
  | 'BATCH'
  | 'SCHEDULED'
  | 'EVENT_DRIVEN';

/**
 * Interface para regras de risco
 */
export interface RiskRule {
  id: string;
  condition: string;
  operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'GTE' | 'LTE' | 'IN' | 'NOT_IN';
  value: any;
  weight: number;
  description: string;
}

/**
 * Interface para limites de risco
 */
export interface RiskThreshold {
  metric: string;
  warningLevel: number;
  criticalLevel: number;
  unit: string;
  action: ThresholdAction;
}

export type ThresholdAction = 
  | 'ALERT'
  | 'BLOCK'
  | 'REVIEW'
  | 'ESCALATE'
  | 'AUTO_ADJUST';

/**
 * Interface para alertas de risco
 */
export interface RiskAlert {
  id: string;
  tenantId: string;
  monitorId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  status: AlertStatus;
  metadata: Record<string, any>;
}

export type AlertSeverity = 
  | 'INFO'
  | 'WARNING'
  | 'CRITICAL'
  | 'EMERGENCY';

export type AlertStatus = 
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'SUPPRESSED';

// =====================================================
// API TYPES
// =====================================================

export interface RiskAssessmentRequest {
  customerId: string;
  assessmentType: 'CREDIT' | 'OPERATIONAL' | 'MARKET' | 'LIQUIDITY';
  factors?: Partial<RiskFactor>[];
  metadata?: Record<string, any>;
}

export interface PortfolioAnalysisRequest {
  portfolioId: string;
  analysisType: 'FULL' | 'QUICK' | 'STRESS_TEST';
  scenarios?: StressTestScenario[];
  timeHorizon?: number; // em dias
  confidenceLevel?: number; // 0.95, 0.99, etc.
}

export interface ComplianceCheckRequest {
  regulations: RegulationType[];
  scope: 'FULL' | 'INCREMENTAL';
  includeRemediation?: boolean;
}

export interface FraudDetectionRequest {
  transactionData: any;
  customerData: any;
  deviceData?: any;
  behavioralData?: any;
}

// =====================================================
// EXPORT TYPES
// =====================================================

export type {
  CreditRiskAssessment,
  PortfolioRiskAnalysis,
  ComplianceCheck,
  FraudDetection,
  RiskMonitor,
  RiskAlert
};

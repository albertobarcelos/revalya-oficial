// =====================================================
// AUDIT AND COMPLIANCE TYPES
// Descrição: Tipos para auditoria e compliance financeiro
// =====================================================

// =====================================================
// AUDIT TRAIL
// =====================================================

/**
 * Interface para trilha de auditoria
 */
export interface AuditTrail {
  id: string;
  tenantId: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  userId: string;
  userEmail: string;
  userRole: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  changes: AuditChange[];
  metadata: AuditMetadata;
  riskLevel: RiskLevel;
  complianceFlags: ComplianceFlag[];
  retention: RetentionPolicy;
  encrypted: boolean;
  signature?: string;
}

export type EntityType = 
  | 'USER'
  | 'TRANSACTION'
  | 'ACCOUNT'
  | 'CONTRACT'
  | 'PAYMENT'
  | 'INVOICE'
  | 'REPORT'
  | 'CONFIGURATION'
  | 'PERMISSION'
  | 'ROLE'
  | 'TENANT'
  | 'INTEGRATION'
  | 'WORKFLOW'
  | 'RULE'
  | 'CALCULATION'
  | 'NOTIFICATION'
  | 'DOCUMENT'
  | 'BACKUP'
  | 'SYSTEM';

export type AuditAction = 
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'PROCESS'
  | 'EXECUTE'
  | 'CONFIGURE'
  | 'BACKUP'
  | 'RESTORE'
  | 'ARCHIVE'
  | 'PURGE'
  | 'ENCRYPT'
  | 'DECRYPT'
  | 'SIGN'
  | 'VERIFY';

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  dataType: string;
  sensitive: boolean;
  encrypted: boolean;
}

export interface AuditMetadata {
  source: AuditSource;
  category: AuditCategory;
  severity: AuditSeverity;
  businessContext: string;
  regulatoryContext?: string[];
  tags: string[];
  correlationId?: string;
  parentAuditId?: string;
  batchId?: string;
  customFields: Record<string, any>;
}

export type AuditSource = 
  | 'WEB_APP'
  | 'MOBILE_APP'
  | 'API'
  | 'WEBHOOK'
  | 'BATCH_JOB'
  | 'SYSTEM'
  | 'INTEGRATION'
  | 'ADMIN_PANEL'
  | 'AUTOMATED_PROCESS';

export type AuditCategory = 
  | 'FINANCIAL'
  | 'SECURITY'
  | 'PRIVACY'
  | 'OPERATIONAL'
  | 'ADMINISTRATIVE'
  | 'TECHNICAL'
  | 'COMPLIANCE'
  | 'BUSINESS';

export type AuditSeverity = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type RiskLevel = 
  | 'MINIMAL'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export interface ComplianceFlag {
  regulation: ComplianceRegulation;
  requirement: string;
  status: ComplianceStatus;
  details?: string;
}

export type ComplianceRegulation = 
  | 'LGPD'
  | 'GDPR'
  | 'SOX'
  | 'PCI_DSS'
  | 'BACEN'
  | 'CVM'
  | 'SUSEP'
  | 'COAF'
  | 'FATCA'
  | 'CRS'
  | 'BASEL_III'
  | 'IFRS'
  | 'CUSTOM';

export type ComplianceStatus = 
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'PENDING_REVIEW'
  | 'REQUIRES_ACTION'
  | 'EXEMPTED';

export interface RetentionPolicy {
  category: RetentionCategory;
  period: number; // em anos
  unit: 'DAYS' | 'MONTHS' | 'YEARS';
  autoDelete: boolean;
  archiveAfter?: number;
  legalHold: boolean;
  reason: string;
}

export type RetentionCategory = 
  | 'FINANCIAL_RECORDS'
  | 'TRANSACTION_LOGS'
  | 'USER_DATA'
  | 'SYSTEM_LOGS'
  | 'COMPLIANCE_RECORDS'
  | 'SECURITY_LOGS'
  | 'COMMUNICATION_RECORDS'
  | 'BACKUP_DATA';

// =====================================================
// COMPLIANCE MONITORING
// =====================================================

/**
 * Interface para monitoramento de compliance
 */
export interface ComplianceMonitor {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  regulation: ComplianceRegulation;
  requirements: ComplianceRequirement[];
  controls: ComplianceControl[];
  assessments: ComplianceAssessment[];
  violations: ComplianceViolation[];
  status: ComplianceMonitorStatus;
  lastAssessment?: string;
  nextAssessment?: string;
  frequency: AssessmentFrequency;
  responsible: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export type ComplianceMonitorStatus = 
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'PARTIALLY_COMPLIANT'
  | 'UNDER_REVIEW'
  | 'PENDING_ASSESSMENT'
  | 'REMEDIATION_REQUIRED';

export interface ComplianceRequirement {
  id: string;
  code: string;
  title: string;
  description: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  applicability: RequirementApplicability;
  evidence: RequiredEvidence[];
  controls: string[]; // Control IDs
  status: ComplianceStatus;
  lastReview?: string;
  nextReview?: string;
  notes?: string;
}

export type RequirementCategory = 
  | 'DATA_PROTECTION'
  | 'FINANCIAL_REPORTING'
  | 'RISK_MANAGEMENT'
  | 'INTERNAL_CONTROLS'
  | 'CUSTOMER_PROTECTION'
  | 'ANTI_MONEY_LAUNDERING'
  | 'FRAUD_PREVENTION'
  | 'CYBERSECURITY'
  | 'OPERATIONAL_RISK'
  | 'GOVERNANCE';

export type RequirementPriority = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'MANDATORY';

export interface RequirementApplicability {
  entityTypes: EntityType[];
  businessLines: string[];
  geographies: string[];
  conditions: ApplicabilityCondition[];
}

export interface ApplicabilityCondition {
  field: string;
  operator: string;
  value: any;
}

export interface RequiredEvidence {
  type: EvidenceType;
  description: string;
  frequency: EvidenceFrequency;
  format: string[];
  retention: RetentionPolicy;
  isRequired: boolean;
}

export type EvidenceType = 
  | 'DOCUMENT'
  | 'REPORT'
  | 'SCREENSHOT'
  | 'LOG_FILE'
  | 'CERTIFICATE'
  | 'ATTESTATION'
  | 'POLICY'
  | 'PROCEDURE'
  | 'TRAINING_RECORD'
  | 'AUDIT_REPORT';

export type EvidenceFrequency = 
  | 'CONTINUOUS'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUALLY'
  | 'ON_DEMAND'
  | 'EVENT_DRIVEN';

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  type: ControlType;
  category: ControlCategory;
  objective: string;
  implementation: ControlImplementation;
  testing: ControlTesting;
  effectiveness: ControlEffectiveness;
  owner: string;
  status: ControlStatus;
  lastTested?: string;
  nextTest?: string;
  deficiencies: ControlDeficiency[];
  remediation: RemediationPlan[];
  metadata: Record<string, any>;
}

export type ControlType = 
  | 'PREVENTIVE'
  | 'DETECTIVE'
  | 'CORRECTIVE'
  | 'COMPENSATING'
  | 'DIRECTIVE';

export type ControlCategory = 
  | 'ACCESS_CONTROL'
  | 'DATA_VALIDATION'
  | 'SEGREGATION_OF_DUTIES'
  | 'AUTHORIZATION'
  | 'RECONCILIATION'
  | 'MONITORING'
  | 'BACKUP_RECOVERY'
  | 'ENCRYPTION'
  | 'AUDIT_LOGGING'
  | 'CHANGE_MANAGEMENT';

export interface ControlImplementation {
  method: ImplementationMethod;
  automation: AutomationLevel;
  frequency: ControlFrequency;
  procedures: string[];
  tools: string[];
  documentation: string[];
}

export type ImplementationMethod = 
  | 'MANUAL'
  | 'AUTOMATED'
  | 'SEMI_AUTOMATED'
  | 'SYSTEM_ENFORCED';

export type AutomationLevel = 
  | 'NONE'
  | 'PARTIAL'
  | 'FULL'
  | 'INTELLIGENT';

export type ControlFrequency = 
  | 'CONTINUOUS'
  | 'REAL_TIME'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUALLY'
  | 'EVENT_DRIVEN';

export interface ControlTesting {
  method: TestingMethod;
  frequency: TestingFrequency;
  sampleSize?: number;
  criteria: TestingCriteria[];
  lastResults?: TestingResults;
}

export type TestingMethod = 
  | 'INQUIRY'
  | 'OBSERVATION'
  | 'INSPECTION'
  | 'REPERFORMANCE'
  | 'ANALYTICAL_REVIEW'
  | 'AUTOMATED_TESTING';

export type TestingFrequency = 
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUALLY'
  | 'ANNUALLY'
  | 'AD_HOC';

export interface TestingCriteria {
  attribute: string;
  expectation: string;
  tolerance?: number;
  measurement: string;
}

export interface TestingResults {
  date: string;
  tester: string;
  outcome: TestingOutcome;
  findings: string[];
  recommendations: string[];
  evidence: string[];
}

export type TestingOutcome = 
  | 'EFFECTIVE'
  | 'INEFFECTIVE'
  | 'PARTIALLY_EFFECTIVE'
  | 'NOT_TESTED'
  | 'NOT_APPLICABLE';

export type ControlEffectiveness = 
  | 'EFFECTIVE'
  | 'INEFFECTIVE'
  | 'PARTIALLY_EFFECTIVE'
  | 'UNDER_REVIEW'
  | 'NOT_ASSESSED';

export type ControlStatus = 
  | 'ACTIVE'
  | 'INACTIVE'
  | 'UNDER_DEVELOPMENT'
  | 'UNDER_REVIEW'
  | 'RETIRED';

export interface ControlDeficiency {
  id: string;
  severity: DeficiencySeverity;
  description: string;
  impact: string;
  rootCause: string;
  identifiedDate: string;
  identifiedBy: string;
  status: DeficiencyStatus;
}

export type DeficiencySeverity = 
  | 'MINOR'
  | 'MODERATE'
  | 'SIGNIFICANT'
  | 'MATERIAL_WEAKNESS';

export type DeficiencyStatus = 
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'ACCEPTED_RISK'
  | 'DEFERRED';

export interface RemediationPlan {
  id: string;
  deficiencyId: string;
  description: string;
  actions: RemediationAction[];
  owner: string;
  dueDate: string;
  status: RemediationStatus;
  progress: number;
  cost?: number;
  resources: string[];
}

export interface RemediationAction {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: ActionStatus;
  dependencies: string[];
  evidence?: string[];
}

export type RemediationStatus = 
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DELAYED'
  | 'CANCELLED';

export type ActionStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'CANCELLED';

// =====================================================
// COMPLIANCE ASSESSMENT
// =====================================================

export interface ComplianceAssessment {
  id: string;
  monitorId: string;
  tenantId: string;
  type: AssessmentType;
  scope: AssessmentScope;
  period: AssessmentPeriod;
  assessor: Assessor;
  status: AssessmentStatus;
  startDate: string;
  endDate?: string;
  findings: AssessmentFinding[];
  recommendations: AssessmentRecommendation[];
  score: AssessmentScore;
  certification?: Certification;
  report: AssessmentReport;
  followUp: FollowUpPlan;
  metadata: Record<string, any>;
}

export type AssessmentType = 
  | 'SELF_ASSESSMENT'
  | 'INTERNAL_AUDIT'
  | 'EXTERNAL_AUDIT'
  | 'REGULATORY_EXAMINATION'
  | 'THIRD_PARTY_REVIEW'
  | 'CONTINUOUS_MONITORING';

export interface AssessmentScope {
  regulations: ComplianceRegulation[];
  requirements: string[];
  controls: string[];
  entities: string[];
  processes: string[];
  systems: string[];
  period: string;
}

export interface AssessmentPeriod {
  startDate: string;
  endDate: string;
  frequency: AssessmentFrequency;
}

export type AssessmentFrequency = 
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUALLY'
  | 'ANNUALLY'
  | 'BIANNUALLY'
  | 'AD_HOC';

export interface Assessor {
  type: AssessorType;
  name: string;
  organization?: string;
  credentials: string[];
  independence: boolean;
  conflicts?: string[];
}

export type AssessorType = 
  | 'INTERNAL'
  | 'EXTERNAL'
  | 'REGULATORY'
  | 'THIRD_PARTY';

export type AssessmentStatus = 
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DEFERRED';

export interface AssessmentFinding {
  id: string;
  requirementId: string;
  controlId?: string;
  severity: FindingSeverity;
  type: FindingType;
  description: string;
  evidence: string[];
  impact: string;
  recommendation: string;
  status: FindingStatus;
  dueDate?: string;
  owner?: string;
}

export type FindingSeverity = 
  | 'OBSERVATION'
  | 'MINOR'
  | 'MODERATE'
  | 'SIGNIFICANT'
  | 'CRITICAL';

export type FindingType = 
  | 'COMPLIANCE_GAP'
  | 'CONTROL_DEFICIENCY'
  | 'PROCESS_IMPROVEMENT'
  | 'BEST_PRACTICE'
  | 'REGULATORY_VIOLATION';

export type FindingStatus = 
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'ACCEPTED'
  | 'DEFERRED';

export interface AssessmentRecommendation {
  id: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  description: string;
  benefits: string[];
  costs?: number;
  timeline: string;
  resources: string[];
  dependencies: string[];
  status: RecommendationStatus;
}

export type RecommendationPriority = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type RecommendationCategory = 
  | 'POLICY'
  | 'PROCESS'
  | 'TECHNOLOGY'
  | 'TRAINING'
  | 'GOVERNANCE'
  | 'MONITORING';

export type RecommendationStatus = 
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IMPLEMENTED'
  | 'DEFERRED';

export interface AssessmentScore {
  overall: number;
  byRegulation: RegulationScore[];
  byCategory: CategoryScore[];
  byControl: ControlScore[];
  trend: ScoreTrend[];
}

export interface RegulationScore {
  regulation: ComplianceRegulation;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface CategoryScore {
  category: RequirementCategory;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface ControlScore {
  controlId: string;
  score: number;
  maxScore: number;
  effectiveness: ControlEffectiveness;
}

export interface ScoreTrend {
  date: string;
  score: number;
  change: number;
}

export interface Certification {
  type: CertificationType;
  issuer: string;
  validFrom: string;
  validTo: string;
  scope: string;
  conditions: string[];
  status: CertificationStatus;
}

export type CertificationType = 
  | 'ISO_27001'
  | 'SOC_2'
  | 'PCI_DSS'
  | 'LGPD_COMPLIANCE'
  | 'GDPR_COMPLIANCE'
  | 'CUSTOM';

export type CertificationStatus = 
  | 'VALID'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'PENDING';

export interface AssessmentReport {
  id: string;
  title: string;
  summary: string;
  methodology: string;
  scope: string;
  limitations: string[];
  conclusions: string[];
  attachments: ReportAttachment[];
  distribution: ReportDistribution[];
  confidentiality: ConfidentialityLevel;
}

export interface ReportAttachment {
  name: string;
  type: string;
  url: string;
  size: number;
  checksum: string;
}

export interface ReportDistribution {
  recipient: string;
  role: string;
  accessLevel: AccessLevel;
  deliveryMethod: DeliveryMethod;
}

export type ConfidentialityLevel = 
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED';

export type AccessLevel = 
  | 'READ'
  | 'COMMENT'
  | 'EDIT'
  | 'ADMIN';

export type DeliveryMethod = 
  | 'EMAIL'
  | 'PORTAL'
  | 'SECURE_LINK'
  | 'PHYSICAL';

export interface FollowUpPlan {
  actions: FollowUpAction[];
  milestones: Milestone[];
  reporting: ReportingSchedule;
  escalation: EscalationProcedure;
}

export interface FollowUpAction {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: ActionStatus;
  dependencies: string[];
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  targetDate: string;
  criteria: string[];
  status: MilestoneStatus;
}

export type MilestoneStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DELAYED'
  | 'AT_RISK';

export interface ReportingSchedule {
  frequency: ReportingFrequency;
  recipients: string[];
  format: ReportFormat[];
  channels: DeliveryMethod[];
}

export type ReportingFrequency = 
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'MILESTONE_BASED'
  | 'AD_HOC';

export type ReportFormat = 
  | 'DASHBOARD'
  | 'PDF_REPORT'
  | 'EXCEL'
  | 'EMAIL_SUMMARY'
  | 'PRESENTATION';

export interface EscalationProcedure {
  triggers: EscalationTrigger[];
  levels: EscalationLevel[];
  notifications: EscalationNotification[];
}

export interface EscalationTrigger {
  condition: string;
  threshold: any;
  timeframe: string;
}

export interface EscalationLevel {
  level: number;
  recipients: string[];
  actions: string[];
  timeframe: string;
}

export interface EscalationNotification {
  method: DeliveryMethod;
  template: string;
  frequency: string;
}

// =====================================================
// COMPLIANCE VIOLATIONS
// =====================================================

export interface ComplianceViolation {
  id: string;
  tenantId: string;
  regulation: ComplianceRegulation;
  requirementId: string;
  severity: ViolationSeverity;
  type: ViolationType;
  description: string;
  detectedAt: string;
  detectedBy: DetectionSource;
  affectedEntities: string[];
  impact: ViolationImpact;
  evidence: ViolationEvidence[];
  investigation: Investigation;
  remediation: ViolationRemediation;
  reporting: RegulatoryReporting;
  status: ViolationStatus;
  metadata: Record<string, any>;
}

export type ViolationSeverity = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type ViolationType = 
  | 'DATA_BREACH'
  | 'UNAUTHORIZED_ACCESS'
  | 'POLICY_VIOLATION'
  | 'PROCESS_DEVIATION'
  | 'CONTROL_FAILURE'
  | 'REPORTING_ERROR'
  | 'REGULATORY_BREACH';

export interface DetectionSource {
  type: DetectionType;
  system?: string;
  user?: string;
  automated: boolean;
  confidence: number;
}

export type DetectionType = 
  | 'AUTOMATED_MONITORING'
  | 'MANUAL_REVIEW'
  | 'AUDIT_FINDING'
  | 'WHISTLEBLOWER'
  | 'CUSTOMER_COMPLAINT'
  | 'REGULATORY_NOTIFICATION'
  | 'THIRD_PARTY_ALERT';

export interface ViolationImpact {
  financial?: number;
  operational: string[];
  reputational: string[];
  regulatory: string[];
  customers: number;
  dataRecords: number;
}

export interface ViolationEvidence {
  type: EvidenceType;
  description: string;
  location: string;
  collectedAt: string;
  collectedBy: string;
  integrity: EvidenceIntegrity;
}

export interface EvidenceIntegrity {
  hash: string;
  signature?: string;
  chainOfCustody: CustodyRecord[];
}

export interface CustodyRecord {
  timestamp: string;
  custodian: string;
  action: string;
  location: string;
}

export interface Investigation {
  id: string;
  lead: string;
  team: string[];
  startDate: string;
  endDate?: string;
  methodology: string[];
  findings: InvestigationFinding[];
  conclusions: string[];
  status: InvestigationStatus;
}

export interface InvestigationFinding {
  category: string;
  description: string;
  evidence: string[];
  significance: string;
}

export type InvestigationStatus = 
  | 'INITIATED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SUSPENDED'
  | 'CLOSED';

export interface ViolationRemediation {
  plan: RemediationPlan;
  actions: RemediationAction[];
  timeline: string;
  cost?: number;
  effectiveness: RemediationEffectiveness;
}

export interface RemediationEffectiveness {
  preventsFutureViolations: boolean;
  addressesRootCause: boolean;
  measurable: boolean;
  timeline: string;
}

export interface RegulatoryReporting {
  required: boolean;
  regulations: ComplianceRegulation[];
  deadlines: ReportingDeadline[];
  status: ReportingStatus;
  submissions: RegulatorySubmission[];
}

export interface ReportingDeadline {
  regulation: ComplianceRegulation;
  deadline: string;
  submitted: boolean;
  submissionId?: string;
}

export type ReportingStatus = 
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'CLOSED';

export interface RegulatorySubmission {
  id: string;
  regulation: ComplianceRegulation;
  submittedAt: string;
  submittedBy: string;
  content: string;
  attachments: string[];
  acknowledgment?: string;
  response?: string;
}

export type ViolationStatus = 
  | 'DETECTED'
  | 'UNDER_INVESTIGATION'
  | 'CONFIRMED'
  | 'REMEDIATED'
  | 'CLOSED'
  | 'FALSE_POSITIVE';

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface AuditSearchRequest {
  entityType?: EntityType;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  riskLevel?: RiskLevel;
  regulations?: ComplianceRegulation[];
  limit?: number;
  offset?: number;
}

export interface ComplianceAssessmentRequest {
  monitorId: string;
  type: AssessmentType;
  scope: AssessmentScope;
  assessor: Assessor;
  scheduledDate?: string;
}

export interface ViolationReportRequest {
  regulation: ComplianceRegulation;
  type: ViolationType;
  description: string;
  severity: ViolationSeverity;
  affectedEntities: string[];
  evidence?: ViolationEvidence[];
}

export interface ComplianceReportRequest {
  regulations?: ComplianceRegulation[];
  period: {
    start: string;
    end: string;
  };
  format: ReportFormat;
  includeViolations?: boolean;
  includeAssessments?: boolean;
  includeControls?: boolean;
}

// =====================================================
// EXPORT TYPES
// =====================================================

export type {
  AuditTrail,
  ComplianceMonitor,
  ComplianceAssessment,
  ComplianceViolation,
  ComplianceControl,
  AuditChange,
  AssessmentFinding,
  ViolationEvidence
};

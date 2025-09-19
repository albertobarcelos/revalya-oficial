// =====================================================
// INVESTMENT ANALYSIS TYPES
// Descrição: Tipos para análise de investimentos e gestão de portfólio
// =====================================================

// =====================================================
// PORTFOLIO MANAGEMENT
// =====================================================

/**
 * Interface para portfólio de investimentos
 */
export interface InvestmentPortfolio {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  portfolioType: PortfolioType;
  riskProfile: RiskProfile;
  objective: InvestmentObjective;
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  returnPercentage: number;
  currency: string;
  positions: PortfolioPosition[];
  allocations: AssetAllocation[];
  benchmarks: Benchmark[];
  rebalancingRules: RebalancingRule[];
  lastRebalancing?: string;
  nextRebalancing?: string;
  createdAt: string;
  updatedAt: string;
  managedBy: string;
  metadata: Record<string, any>;
}

export type PortfolioType = 
  | 'CONSERVATIVE'
  | 'MODERATE'
  | 'AGGRESSIVE'
  | 'BALANCED'
  | 'GROWTH'
  | 'INCOME'
  | 'CUSTOM';

export type RiskProfile = 
  | 'VERY_LOW'
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'VERY_HIGH';

export type InvestmentObjective = 
  | 'CAPITAL_PRESERVATION'
  | 'INCOME_GENERATION'
  | 'CAPITAL_APPRECIATION'
  | 'BALANCED_GROWTH'
  | 'SPECULATION'
  | 'RETIREMENT'
  | 'EDUCATION'
  | 'EMERGENCY_FUND';

/**
 * Interface para posição no portfólio
 */
export interface PortfolioPosition {
  id: string;
  portfolioId: string;
  assetId: string;
  assetType: AssetType;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercentage: number;
  realizedGainLoss: number;
  dividends: number;
  weight: number; // Peso no portfólio (0-1)
  targetWeight?: number;
  sector?: string;
  industry?: string;
  country?: string;
  currency: string;
  lastUpdated: string;
  metadata: Record<string, any>;
}

export type AssetType = 
  | 'STOCK'
  | 'BOND'
  | 'ETF'
  | 'MUTUAL_FUND'
  | 'REIT'
  | 'COMMODITY'
  | 'CRYPTOCURRENCY'
  | 'CASH'
  | 'ALTERNATIVE'
  | 'DERIVATIVE';

/**
 * Interface para alocação de ativos
 */
export interface AssetAllocation {
  category: AllocationCategory;
  targetPercentage: number;
  currentPercentage: number;
  deviation: number;
  rebalanceNeeded: boolean;
  minPercentage?: number;
  maxPercentage?: number;
}

export type AllocationCategory = 
  | 'STOCKS'
  | 'BONDS'
  | 'CASH'
  | 'REAL_ESTATE'
  | 'COMMODITIES'
  | 'ALTERNATIVES'
  | 'INTERNATIONAL'
  | 'DOMESTIC'
  | 'GROWTH'
  | 'VALUE'
  | 'LARGE_CAP'
  | 'MID_CAP'
  | 'SMALL_CAP';

/**
 * Interface para benchmark
 */
export interface Benchmark {
  id: string;
  name: string;
  symbol: string;
  weight: number; // Peso na comparação
  currentValue: number;
  returnPeriod: number;
  returnPercentage: number;
}

/**
 * Interface para regras de rebalanceamento
 */
export interface RebalancingRule {
  id: string;
  name: string;
  type: RebalancingType;
  frequency?: RebalancingFrequency;
  threshold?: number; // Desvio percentual para trigger
  conditions: RebalancingCondition[];
  isActive: boolean;
}

export type RebalancingType = 
  | 'PERIODIC'
  | 'THRESHOLD'
  | 'CALENDAR'
  | 'TACTICAL'
  | 'MANUAL';

export type RebalancingFrequency = 
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUALLY'
  | 'ANNUALLY';

export interface RebalancingCondition {
  metric: string;
  operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE';
  value: number;
  description: string;
}

// =====================================================
// INVESTMENT ANALYSIS
// =====================================================

/**
 * Interface para análise de investimento
 */
export interface InvestmentAnalysis {
  id: string;
  tenantId: string;
  portfolioId?: string;
  assetId?: string;
  analysisType: AnalysisType;
  timeframe: AnalysisTimeframe;
  startDate: string;
  endDate: string;
  metrics: InvestmentMetrics;
  riskMetrics: RiskMetrics;
  performanceMetrics: PerformanceMetrics;
  attribution: PerformanceAttribution;
  recommendations: AnalysisRecommendation[];
  createdAt: string;
  createdBy: string;
  metadata: Record<string, any>;
}

export type AnalysisType = 
  | 'PERFORMANCE'
  | 'RISK'
  | 'ATTRIBUTION'
  | 'SCENARIO'
  | 'STRESS_TEST'
  | 'MONTE_CARLO'
  | 'FACTOR_ANALYSIS'
  | 'STYLE_ANALYSIS';

export type AnalysisTimeframe = 
  | '1D'
  | '1W'
  | '1M'
  | '3M'
  | '6M'
  | '1Y'
  | '3Y'
  | '5Y'
  | '10Y'
  | 'YTD'
  | 'INCEPTION'
  | 'CUSTOM';

/**
 * Interface para métricas de investimento
 */
export interface InvestmentMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio: number;
  treynorRatio: number;
  jensenAlpha: number;
  beta: number;
  rSquared: number;
  trackingError: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  winRate: number;
  profitFactor: number;
  valueAtRisk95: number;
  valueAtRisk99: number;
  conditionalVaR: number;
}

/**
 * Interface para métricas de risco
 */
export interface RiskMetrics {
  standardDeviation: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  downside_deviation: number;
  upside_deviation: number;
  semi_variance: number;
  var_historic: number;
  var_parametric: number;
  var_monte_carlo: number;
  expected_shortfall: number;
  maximum_drawdown: number;
  calmar_ratio: number;
  sterling_ratio: number;
  burke_ratio: number;
}

/**
 * Interface para métricas de performance
 */
export interface PerformanceMetrics {
  cumulativeReturn: number;
  periodicReturns: PeriodicReturn[];
  rollingReturns: RollingReturn[];
  benchmarkComparison: BenchmarkComparison;
  attribution: PerformanceAttribution;
  consistency: ConsistencyMetrics;
}

export interface PeriodicReturn {
  period: string;
  return: number;
  benchmark?: number;
  excess?: number;
}

export interface RollingReturn {
  period: string;
  window: number; // em dias
  return: number;
  volatility: number;
  sharpe: number;
}

export interface BenchmarkComparison {
  benchmarkReturn: number;
  excessReturn: number;
  trackingError: number;
  informationRatio: number;
  upCapture: number;
  downCapture: number;
  correlation: number;
}

/**
 * Interface para atribuição de performance
 */
export interface PerformanceAttribution {
  assetAllocation: AttributionComponent[];
  stockSelection: AttributionComponent[];
  interaction: AttributionComponent[];
  currency: AttributionComponent[];
  total: number;
}

export interface AttributionComponent {
  category: string;
  contribution: number;
  percentage: number;
}

export interface ConsistencyMetrics {
  hitRatio: number; // % de períodos com retorno positivo
  gainLossRatio: number;
  averageGain: number;
  averageLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  recoveryFactor: number;
}

/**
 * Interface para recomendações de análise
 */
export interface AnalysisRecommendation {
  type: RecommendationType;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  rationale: string;
  expectedImpact: number;
  timeframe: string;
  actionItems: string[];
  riskLevel: RiskProfile;
}

export type RecommendationType = 
  | 'BUY'
  | 'SELL'
  | 'HOLD'
  | 'REBALANCE'
  | 'HEDGE'
  | 'DIVERSIFY'
  | 'REDUCE_RISK'
  | 'INCREASE_ALLOCATION'
  | 'DECREASE_ALLOCATION'
  | 'REVIEW';

// =====================================================
// SCENARIO ANALYSIS
// =====================================================

/**
 * Interface para análise de cenários
 */
export interface ScenarioAnalysis {
  id: string;
  tenantId: string;
  portfolioId: string;
  name: string;
  description: string;
  scenarios: InvestmentScenario[];
  baseCase: ScenarioResult;
  summary: ScenarioSummary;
  createdAt: string;
  createdBy: string;
  metadata: Record<string, any>;
}

/**
 * Interface para cenário de investimento
 */
export interface InvestmentScenario {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-1
  assumptions: ScenarioAssumption[];
  result: ScenarioResult;
}

export interface ScenarioAssumption {
  variable: string;
  currentValue: number;
  scenarioValue: number;
  change: number;
  changeType: 'ABSOLUTE' | 'PERCENTAGE';
  description: string;
}

export interface ScenarioResult {
  portfolioValue: number;
  totalReturn: number;
  returnPercentage: number;
  volatility: number;
  maxDrawdown: number;
  probabilityOfLoss: number;
  valueAtRisk: number;
  timeToRecovery?: number;
}

export interface ScenarioSummary {
  bestCase: ScenarioResult;
  worstCase: ScenarioResult;
  mostLikely: ScenarioResult;
  expectedValue: number;
  standardDeviation: number;
  probabilityOfPositiveReturn: number;
  probabilityOfTargetReturn: number;
  targetReturn?: number;
}

// =====================================================
// MONTE CARLO SIMULATION
// =====================================================

/**
 * Interface para simulação Monte Carlo
 */
export interface MonteCarloSimulation {
  id: string;
  tenantId: string;
  portfolioId: string;
  name: string;
  parameters: MonteCarloParameters;
  results: MonteCarloResults;
  distributions: ProbabilityDistribution[];
  confidenceIntervals: ConfidenceInterval[];
  createdAt: string;
  createdBy: string;
  metadata: Record<string, any>;
}

export interface MonteCarloParameters {
  simulations: number;
  timeHorizon: number; // em anos
  initialValue: number;
  expectedReturn: number;
  volatility: number;
  correlationMatrix?: number[][];
  distributionType: 'NORMAL' | 'LOG_NORMAL' | 'T_DISTRIBUTION' | 'CUSTOM';
  randomSeed?: number;
}

export interface MonteCarloResults {
  finalValues: number[];
  paths: number[][];
  statistics: SimulationStatistics;
  percentiles: Record<string, number>;
  probabilityAnalysis: ProbabilityAnalysis;
}

export interface SimulationStatistics {
  mean: number;
  median: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
  minimum: number;
  maximum: number;
  range: number;
}

export interface ProbabilityDistribution {
  value: number;
  probability: number;
  cumulativeProbability: number;
}

export interface ConfidenceInterval {
  confidence: number; // 0.95, 0.99, etc.
  lowerBound: number;
  upperBound: number;
  width: number;
}

export interface ProbabilityAnalysis {
  probabilityOfLoss: number;
  probabilityOfGain: number;
  probabilityAboveTarget?: number;
  probabilityBelowTarget?: number;
  targetValue?: number;
  expectedShortfall: number;
  conditionalValueAtRisk: number;
}

// =====================================================
// FACTOR ANALYSIS
// =====================================================

/**
 * Interface para análise de fatores
 */
export interface FactorAnalysis {
  id: string;
  tenantId: string;
  portfolioId: string;
  model: FactorModel;
  factors: Factor[];
  exposures: FactorExposure[];
  attribution: FactorAttribution[];
  riskDecomposition: RiskDecomposition;
  createdAt: string;
  createdBy: string;
  metadata: Record<string, any>;
}

export type FactorModel = 
  | 'CAPM'
  | 'FAMA_FRENCH_3'
  | 'FAMA_FRENCH_5'
  | 'CARHART_4'
  | 'CUSTOM';

export interface Factor {
  id: string;
  name: string;
  description: string;
  category: FactorCategory;
  value: number;
  volatility: number;
  correlation: number;
}

export type FactorCategory = 
  | 'MARKET'
  | 'SIZE'
  | 'VALUE'
  | 'MOMENTUM'
  | 'QUALITY'
  | 'VOLATILITY'
  | 'PROFITABILITY'
  | 'INVESTMENT'
  | 'SECTOR'
  | 'COUNTRY'
  | 'CURRENCY'
  | 'MACRO';

export interface FactorExposure {
  factorId: string;
  exposure: number;
  tStatistic: number;
  pValue: number;
  significance: boolean;
}

export interface FactorAttribution {
  factorId: string;
  contribution: number;
  percentage: number;
  activeExposure: number;
  factorReturn: number;
}

export interface RiskDecomposition {
  totalRisk: number;
  factorRisk: number;
  specificRisk: number;
  factorContributions: FactorRiskContribution[];
}

export interface FactorRiskContribution {
  factorId: string;
  contribution: number;
  percentage: number;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface PortfolioAnalysisRequest {
  portfolioId: string;
  analysisTypes: AnalysisType[];
  timeframe: AnalysisTimeframe;
  benchmarks?: string[];
  includeProjections?: boolean;
  customParameters?: Record<string, any>;
}

export interface ScenarioAnalysisRequest {
  portfolioId: string;
  scenarios: Partial<InvestmentScenario>[];
  timeHorizon: number;
  includeMonteCarloSimulation?: boolean;
  simulationParameters?: Partial<MonteCarloParameters>;
}

export interface RebalancingRequest {
  portfolioId: string;
  targetAllocations: AssetAllocation[];
  constraints?: RebalancingConstraint[];
  method: 'PROPORTIONAL' | 'THRESHOLD' | 'OPTIMIZATION';
  dryRun?: boolean;
}

export interface RebalancingConstraint {
  type: 'MIN_WEIGHT' | 'MAX_WEIGHT' | 'MAX_TURNOVER' | 'TRANSACTION_COST';
  assetId?: string;
  value: number;
}

// =====================================================
// EXPORT TYPES
// =====================================================

export type {
  InvestmentPortfolio,
  PortfolioPosition,
  InvestmentAnalysis,
  ScenarioAnalysis,
  MonteCarloSimulation,
  FactorAnalysis
};

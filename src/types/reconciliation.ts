// =====================================================
// RECONCILIATION SYSTEM TYPES
// Descrição: Tipos TypeScript para o sistema de conciliação
// =====================================================

// AIDEV-NOTE: Tipos base para o sistema de conciliação de contas a receber
// Este arquivo define todas as interfaces necessárias para o hub central de conciliação

// =====================================================
// ENUMS E TIPOS BASE
// =====================================================

/**
 * Origens possíveis das movimentações importadas
 */
export enum ReconciliationSource {
  ASAAS = 'ASAAS',
  CORA = 'CORA',
  ITAU = 'ITAU',
  STONE = 'STONE',
  MANUAL = 'MANUAL'
}

/**
 * Status de conciliação dos itens
 */
export enum ReconciliationStatus {
  PENDING = 'PENDING',           // Não conciliado
  RECONCILED = 'RECONCILED',     // Conciliado
  DIVERGENT = 'DIVERGENT',       // Com divergência de valores
  CANCELLED = 'CANCELLED'        // Cancelado/Excluído
}

/**
 * Status de pagamento das movimentações
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE'
}

/**
 * Tipos de ações possíveis na conciliação
 */
export enum ReconciliationAction {
  LINK_TO_CONTRACT = 'LINK_TO_CONTRACT',           // Vincular a contrato existente
  CREATE_STANDALONE = 'CREATE_STANDALONE',         // Criar cobrança avulsa
  COMPLEMENT_EXISTING = 'COMPLEMENT_EXISTING',     // Complementar cobrança existente
  DELETE_IMPORTED = 'DELETE_IMPORTED'              // Excluir item importado
}

// =====================================================
// INTERFACES PRINCIPAIS
// =====================================================

/**
 * Movimentação importada de fonte externa - Estrutura da tabela conciliation_staging
 */
export interface ImportedMovement {
  id: string;                            // Chave primária interna
  origem: ReconciliationSource;          // GET → Asaas, Cora, Itaú etc.
  id_externo: string;                    // ex.: charge_id Asaas
  valor_cobranca?: number;               // Valor interno, se houver
  valor_pago: number;                    // Valor importado, real
  status_externo: string;                // pendente, pago, cancelado
  status_conciliacao: ReconciliationStatus; // não conciliado, conciliado, divergente
  contrato_id?: string;                  // nullable, se vinculado
  cobranca_id?: string;                  // nullable, se vinculada a cobrança existente
  juros_multa_diferenca: number;         // decimal
  data_vencimento?: string;              // Data de vencimento
  data_pagamento?: string;               // Data de pagamento
  observacao?: string;                   // Texto livre do usuário
  created_at: string;                    // Timestamp de criação
  updated_at: string;                    // Timestamp de atualização
  
  // AIDEV-NOTE: Campos computados para compatibilidade com componentes existentes
  tenantId?: string;                     // Derivado do contexto
  hasContract?: boolean;                 // Derivado de contrato_id
  customerName?: string;                 // Derivado de outras tabelas
  customerDocument?: string;             // Derivado de outras tabelas
  description?: string;                  // Derivado de observacao
}

/**
 * Filtros para a tela de conciliação
 */
export interface ReconciliationFilters {
  status: ReconciliationStatus | 'ALL';
  source: ReconciliationSource | 'ALL';
  hasContract: 'WITH_CONTRACT' | 'WITHOUT_CONTRACT' | 'ALL';
  dateFrom: string;
  dateTo: string;
  search?: string;                       // Busca por nome, documento, ID externo
  accountFilter?: string;                // Filtro por conta
  
  // AIDEV-NOTE: Filtros específicos ASAAS
  asaasNossoNumero?: string;            // Filtro por nosso número ASAAS
  asaasBillingType?: string;            // Filtro por tipo de cobrança ASAAS
  asaasPaymentStatus?: string;          // Filtro por status de pagamento ASAAS
}

/**
 * Indicadores rápidos da tela
 */
export interface ReconciliationIndicators {
  notReconciled: number;                 // Não conciliados
  reconciledThisMonth: number;           // Conciliados no mês
  valueDifferences: number;              // Diferenças de valor
  totalAmount: number;                   // Valor total das movimentações
}

/**
 * Configuração de ação de conciliação
 */
export interface ReconciliationActionConfig {
  type: ReconciliationAction;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  confirmMessage?: string;
  requiresObservation?: boolean;
}

/**
 * Resultado de uma ação de conciliação
 */
export interface ReconciliationActionResult {
  success: boolean;
  message: string;
  updatedMovement?: ImportedMovement;
  createdChargeId?: string;
  errors?: string[];
}

/**
 * Dados para vincular a contrato existente
 */
export interface LinkToContractData {
  movementId: string;
  contractId: string;
  chargeId?: string;
  observations?: string;
  adjustments?: {
    interestAmount?: number;
    fineAmount?: number;
    discountAmount?: number;
  };
}

/**
 * Dados para criar cobrança avulsa
 */
export interface CreateStandaloneChargeData {
  movementId: string;
  customerName: string;
  customerDocument: string;
  customerEmail?: string;
  description: string;
  observations?: string;
}

/**
 * Dados para complementar cobrança existente
 */
export interface ComplementExistingChargeData {
  movementId: string;
  chargeId: string;
  observations?: string;
  updateValues: {
    paidAmount: boolean;
    paymentDate: boolean;
    status: boolean;
  };
}

/**
 * Histórico de conciliação
 */
export interface ReconciliationHistory {
  id: string;
  movementId: string;
  action: ReconciliationAction;
  performedBy: string;
  performedAt: string;
  observations?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Configuração de exportação
 */
export interface ReconciliationExportConfig {
  format: 'CSV' | 'EXCEL' | 'PDF';
  filters: ReconciliationFilters;
  includeFields: string[];
  filename?: string;
}

/**
 * Estatísticas de conciliação
 */
export interface ReconciliationStats {
  period: {
    startDate: string;
    endDate: string;
  };
  bySource: Record<ReconciliationSource, {
    total: number;
    reconciled: number;
    pending: number;
    divergent: number;
    totalAmount: number;
  }>;
  byStatus: Record<ReconciliationStatus, number>;
  averageReconciliationTime: number;     // Em horas
  topDivergentSources: {
    source: ReconciliationSource;
    count: number;
    totalDifference: number;
  }[];
}

// =====================================================
// TIPOS PARA COMPONENTES
// =====================================================

/**
 * Props para componente de filtros
 */
export interface ReconciliationFiltersProps {
  filters: ReconciliationFilters;
  onFiltersChange: (filters: ReconciliationFilters) => void;
  loading?: boolean;
}

/**
 * Props para componente de indicadores
 */
export interface ReconciliationIndicatorsProps {
  indicators: ReconciliationIndicators;
  loading?: boolean;
}

/**
 * Props para tabela de conciliação
 */
export interface ReconciliationTableProps {
  movements: ImportedMovement[];
  loading?: boolean;
  isLoading?: boolean;
  onAction: (action: ReconciliationAction, movement: ImportedMovement) => void;
  selectedMovements?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
  };
}

/**
 * Props para modal de ação
 */
export interface ReconciliationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: ReconciliationAction;
  movement: ImportedMovement;
  onConfirm: (data: any) => Promise<void>;
  loading?: boolean;
}

// =====================================================
// TIPOS DE RESPOSTA DA API
// =====================================================

export interface ReconciliationApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedReconciliationResponse {
  movements: ImportedMovement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  indicators: ReconciliationIndicators;
}

// =====================================================
// MOCK DATA TYPES
// =====================================================

/**
 * Configuração para geração de dados mock
 */
export interface MockDataConfig {
  count: number;
  sources: ReconciliationSource[];
  statusDistribution: Record<ReconciliationStatus, number>;
  dateRange: {
    start: string;
    end: string;
  };
  includeContracts: boolean;
  includeDivergences: boolean;
}
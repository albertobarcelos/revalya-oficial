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
  REGISTER_CUSTOMER = 'REGISTER_CUSTOMER',         // Cadastrar novo cliente
  DELETE_IMPORTED = 'DELETE_IMPORTED',             // Excluir item importado
  IMPORT_TO_CHARGE = 'IMPORT_TO_CHARGE',           // Importar para tabela de cobranças
  MARK_AS_RECONCILED = 'MARK_AS_RECONCILED',       // Marcar como reconciliado
  EXPORT = 'EXPORT',                               // Exportar selecionados
  IGNORE = 'IGNORE'                                // Ignorar selecionados
}

// =====================================================
// INTERFACES PRINCIPAIS
// =====================================================

/**
 * Movimentação importada de fonte externa - Estrutura da tabela conciliation_staging
 * AIDEV-NOTE: Interface atualizada para corresponder exatamente à estrutura da tabela conforme supabase-tabela.md
 */
export interface ImportedMovement {
  // AIDEV-NOTE: Campos principais obrigatórios
  id: string;                            // Chave primária interna
  tenant_id: string;                     // ID do tenant (obrigatório)
  origem: ReconciliationSource;          // GET → Asaas, Cora, Itaú etc.
  id_externo: string;                    // ex.: charge_id Asaas
  valor_cobranca?: number;               // Valor interno, se houver
  valor_pago: number;                    // Valor importado, real
  status_externo: string;                // pendente, pago, cancelado
  status_conciliacao: ReconciliationStatus; // não conciliado, conciliado, divergente
  
  // AIDEV-NOTE: Campos de relacionamento
  contrato_id?: string;                  // nullable, se vinculado
  cobranca_id?: string;                  // nullable, se vinculada a cobrança existente
  charge_id?: string;                    // nullable, referência à tabela charges quando importado
  imported_at?: string;                  // nullable, timestamp de quando foi importado para charges
  
  // AIDEV-NOTE: Campos financeiros adicionais
  juros_multa_diferenca: number;         // decimal
  valor_original?: number;               // Valor original da cobrança
  valor_liquido?: number;                // Valor líquido recebido
  valor_juros?: number;                  // Valor de juros
  valor_multa?: number;                  // Valor de multa
  valor_desconto?: number;               // Valor de desconto
  
  // AIDEV-NOTE: Campos de datas
  data_vencimento?: string;              // Data de vencimento
  data_pagamento?: string;               // Data de pagamento
  data_vencimento_original?: string;     // Data de vencimento original
  data_pagamento_cliente?: string;       // Data de pagamento informada pelo cliente
  data_credito?: string;                 // Data de crédito
  data_confirmacao?: string;             // Data de confirmação
  
  // AIDEV-NOTE: Campos de observação e referência
  observacao?: string;                   // Texto livre do usuário
  external_reference?: string;           // Referência externa
  
  // AIDEV-NOTE: Campos ASAAS específicos (apenas os que existem na tabela)
  asaas_customer_id?: string;            // ID do cliente no ASAAS
  asaas_subscription_id?: string;        // ID da assinatura no ASAAS
  
  // AIDEV-NOTE: Campos de método de pagamento
  payment_method?: string;               // Método de pagamento
  billing_type?: string;                 // Tipo de cobrança
  
  // AIDEV-NOTE: Campos de status e flags
  status_anterior?: string;              // Status anterior
  deleted_flag?: boolean;                // Flag de exclusão
  anticipated_flag?: boolean;            // Flag de antecipação
  
  // AIDEV-NOTE: Campos do cliente
  customer_name?: string;                // Nome do cliente
  customer_email?: string;               // Email do cliente
  customer_document?: string;            // Documento do cliente (CPF/CNPJ)
  customer_phone?: string;               // Telefone do cliente
  customer_address?: string;             // Endereço do cliente
  customer_city?: string;                // Cidade do cliente
  customer_state?: string;               // Estado do cliente
  customer_postal_code?: string;         // CEP do cliente
  customer_country?: string;             // País do cliente
  
  // AIDEV-NOTE: Campos de parcelamento
  installment_number?: number;           // Número da parcela
  installment_count?: number;            // Total de parcelas
  
  // AIDEV-NOTE: Campos de pagamento
  pix_key?: string;                      // Chave PIX
  barcode?: string;                      // Código de barras
  
  // AIDEV-NOTE: URLs e documentos
  invoice_url?: string;                  // URL da fatura
  bank_slip_url?: string;                // URL do boleto
  transaction_receipt_url?: string;      // URL do comprovante
  
  // AIDEV-NOTE: Campos de webhook
  webhook_event?: string;                // Evento do webhook
  webhook_signature?: string;            // Assinatura do webhook
  
  // AIDEV-NOTE: Dados brutos e processamento
  raw_data?: Record<string, unknown>;    // Dados brutos do webhook/API
  processed?: boolean;                   // Flag de processamento
  processed_at?: string;                 // Data de processamento
  processing_attempts?: number;          // Tentativas de processamento
  processing_error?: string;             // Erro de processamento
  
  // AIDEV-NOTE: Campos de conciliação
  reconciled?: boolean;                  // Flag de conciliação
  reconciled_at?: string;                // Data de conciliação
  reconciled_by?: string;                // Usuário que conciliou
  reconciliation_notes?: string;         // Notas da conciliação
  
  // AIDEV-NOTE: Campos de auditoria
  created_at: string;                    // Timestamp de criação
  updated_at: string;                    // Timestamp de atualização
  created_by?: string;                   // Usuário que criou
  updated_by?: string;                   // Usuário que atualizou
  
  // AIDEV-NOTE: Campos computados para compatibilidade com componentes existentes
  tenantId?: string;                     // Derivado do tenant_id
  hasContract?: boolean;                 // Derivado de contrato_id
  customerName?: string;                 // Alias para customer_name
  customerDocument?: string;             // Alias para customer_document
  description?: string;                  // Derivado de observacao
  
  // AIDEV-NOTE: Campos críticos para exibição das colunas de valor na tabela
  chargeAmount?: number;                 // Valor da cobrança (derivado de valor_cobranca)
  paidAmount: number;                    // Valor pago (derivado de valor_pago)
  
  // AIDEV-NOTE: Campos de status mapeados para compatibilidade com hooks
  paymentStatus?: PaymentStatus;         // Status de pagamento mapeado do status_externo
  reconciliationStatus?: ReconciliationStatus; // Status de conciliação mapeado do status_conciliacao
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
  
  // AIDEV-NOTE: Novos filtros baseados na tabela conciliation_staging
  paymentMethod?: string | 'ALL';       // Filtro por método de pagamento (PIX, BOLETO, etc.)
  customerDocument?: string;            // Filtro por documento do cliente
  valorOriginalMin?: number;            // Valor original mínimo
  valorOriginalMax?: number;            // Valor original máximo
  statusAnterior?: string | 'ALL';      // Filtro por status anterior
  deletedFlag?: boolean | 'ALL';        // Filtro por registros deletados
  anticipatedFlag?: boolean | 'ALL';    // Filtro por registros antecipados
  processed?: boolean | 'ALL';          // Filtro por registros processados
  reconciled?: boolean | 'ALL';         // Filtro por registros conciliados
  hasProcessingError?: boolean | 'ALL'; // Filtro por registros com erro de processamento
  installmentNumber?: number;           // Filtro por número da parcela
  externalReference?: string;           // Filtro por referência externa
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
 * Dados para cadastrar novo cliente
 */
export interface RegisterCustomerData {
  movementId: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  company?: string;
  observations?: string;
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
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
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
  onAction: (action: ReconciliationAction, movement: ImportedMovement) => Promise<void>;
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
  onConfirm: (data: Record<string, unknown>) => Promise<void>;
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
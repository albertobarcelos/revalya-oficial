// =====================================================
// RECONCILIATION MODAL CONFIGURATION
// Descrição: Configurações centralizadas para o modal de conciliação
// Padrão: Configuration as Code + Type Safety + Maintainability
// =====================================================

import { ReconciliationModalConfig } from '../types/ReconciliationModalTypes';

// AIDEV-NOTE: Configurações principais do modal de conciliação
export const RECONCILIATION_CONFIG: ReconciliationModalConfig = {
  // AIDEV-NOTE: Configurações de paginação
  pagination: {
    defaultPageSize: 50,
    pageSizeOptions: [25, 50, 100, 200],
    maxPageSize: 500
  },

  // AIDEV-NOTE: Configurações de filtros
  filters: {
    enableAdvancedSearch: true,
    searchDebounceMs: 300,
    maxSearchLength: 100,
    enableDateRangeFilter: true,
    enableStatusFilter: true,
    enableSourceFilter: true,
    enableContractFilter: true
  },

  // AIDEV-NOTE: Configurações de UI/UX
  ui: {
    enableAnimations: true,
    collapsibleSidebar: true,
    showIndicators: true,
    enableExport: true,
    enableRefresh: true,
    autoRefreshInterval: 0, // 0 = desabilitado, valor em ms
    loadingTimeout: 30000 // 30 segundos
  },

  // AIDEV-NOTE: Configurações de segurança
  security: {
    enableTenantValidation: true,
    enableDataValidation: true,
    enableAuditLogging: true,
    maxRetries: 3,
    timeoutMs: 10000
  },

  // AIDEV-NOTE: Configurações de performance
  performance: {
    enableVirtualization: false, // Para listas muito grandes
    enableMemoization: true,
    enableLazyLoading: false,
    cacheTimeout: 300000 // 5 minutos
  }
};

// AIDEV-NOTE: Mapeamento de status de pagamento
export const PAYMENT_STATUS_MAP = {
  'PAID': 'PAID',
  'CANCELLED': 'CANCELLED', 
  'OVERDUE': 'OVERDUE',
  'PENDING': 'PENDING',
  'paid': 'PAID',
  'cancelled': 'CANCELLED',
  'overdue': 'OVERDUE', 
  'pending': 'PENDING',
  'pago': 'PAID',
  'cancelado': 'CANCELLED',
  'vencido': 'OVERDUE',
  'pendente': 'PENDING'
} as const;

// AIDEV-NOTE: Mapeamento de status de conciliação
export const RECONCILIATION_STATUS_MAP = {
  'RECONCILED': 'RECONCILED',
  'DIVERGENT': 'DIVERGENT',
  'CANCELLED': 'CANCELLED',
  'PENDING': 'PENDING',
  'reconciled': 'RECONCILED',
  'divergent': 'DIVERGENT', 
  'cancelled': 'CANCELLED',
  'pending': 'PENDING',
  'conciliado': 'RECONCILED',
  'divergente': 'DIVERGENT',
  'cancelado': 'CANCELLED',
  'pendente': 'PENDING'
} as const;

// AIDEV-NOTE: Configurações de cores para status
export const STATUS_COLORS = {
  payment: {
    PAID: 'text-green-600 bg-green-50 border-green-200',
    CANCELLED: 'text-red-600 bg-red-50 border-red-200',
    OVERDUE: 'text-orange-600 bg-orange-50 border-orange-200',
    PENDING: 'text-yellow-600 bg-yellow-50 border-yellow-200'
  },
  reconciliation: {
    RECONCILED: 'text-green-600 bg-green-50 border-green-200',
    DIVERGENT: 'text-red-600 bg-red-50 border-red-200',
    CANCELLED: 'text-gray-600 bg-gray-50 border-gray-200',
    PENDING: 'text-blue-600 bg-blue-50 border-blue-200'
  }
} as const;

// AIDEV-NOTE: Labels para exibição
export const STATUS_LABELS = {
  payment: {
    PAID: 'Pago',
    CANCELLED: 'Cancelado',
    OVERDUE: 'Vencido',
    PENDING: 'Pendente'
  },
  reconciliation: {
    RECONCILED: 'Conciliado',
    DIVERGENT: 'Divergente',
    CANCELLED: 'Cancelado',
    PENDING: 'Pendente'
  }
} as const;

// AIDEV-NOTE: Configurações de campos para busca
export const SEARCHABLE_FIELDS = [
  'customerName',
  'contractNumber', 
  'installmentNumber',
  'paymentMethod',
  'observations',
  'source'
] as const;

// AIDEV-NOTE: Configurações de campos obrigatórios
export const REQUIRED_FIELDS = [
  'id',
  'amount',
  'date',
  'paymentStatus',
  'reconciliationStatus',
  'source'
] as const;

// AIDEV-NOTE: Configurações de validação
export const VALIDATION_RULES = {
  amount: {
    min: 0,
    max: 999999999.99,
    decimals: 2
  },
  search: {
    minLength: 2,
    maxLength: 100
  },
  dateRange: {
    maxDays: 365 // Máximo 1 ano
  }
} as const;

// AIDEV-NOTE: Configurações de animações
export const ANIMATION_CONFIG = {
  modal: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 }
  },
  sidebar: {
    initial: { x: -300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -300, opacity: 0 },
    transition: { duration: 0.3 }
  },
  button: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.1 }
  },
  indicator: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: 0.1 }
  }
} as const;

// AIDEV-NOTE: Configurações de toast/notificações
export const TOAST_CONFIG = {
  success: {
    duration: 3000,
    position: 'top-right' as const
  },
  error: {
    duration: 5000,
    position: 'top-right' as const
  },
  loading: {
    duration: Infinity,
    position: 'top-right' as const
  }
} as const;

// AIDEV-NOTE: Configurações de export
export const EXPORT_CONFIG = {
  formats: ['CSV', 'XLSX'] as const,
  maxRecords: 10000,
  filename: {
    prefix: 'conciliacao',
    includeDate: true,
    includeTenant: true
  },
  headers: {
    pt: [
      'ID', 'Data', 'Valor', 'Status Pagamento', 'Status Conciliação',
      'Origem', 'Cliente', 'Contrato', 'Parcela', 'Método Pagamento', 'Observações'
    ],
    en: [
      'ID', 'Date', 'Amount', 'Payment Status', 'Reconciliation Status',
      'Source', 'Customer', 'Contract', 'Installment', 'Payment Method', 'Observations'
    ]
  }
} as const;

// AIDEV-NOTE: Função para obter configuração baseada no ambiente
export const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    ...RECONCILIATION_CONFIG,
    ui: {
      ...RECONCILIATION_CONFIG.ui,
      enableAnimations: isDevelopment ? true : RECONCILIATION_CONFIG.ui.enableAnimations,
      autoRefreshInterval: isDevelopment ? 0 : RECONCILIATION_CONFIG.ui.autoRefreshInterval
    },
    security: {
      ...RECONCILIATION_CONFIG.security,
      enableAuditLogging: true, // Sempre habilitado
      maxRetries: isDevelopment ? 1 : RECONCILIATION_CONFIG.security.maxRetries
    }
  };
};
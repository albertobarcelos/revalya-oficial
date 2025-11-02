// =====================================================
// RECONCILIATION MODAL TYPES
// Descrição: Tipos e interfaces específicas do ReconciliationModal
// Padrão: Clean Code + TypeScript Best Practices
// =====================================================

import { 
  ImportedMovement, 
  ReconciliationFilters,
  ReconciliationStatus,
  ReconciliationSource,
  ReconciliationIndicators,
  ReconciliationAction
} from '@/types/reconciliation';

// AIDEV-NOTE: Interface principal do componente ReconciliationModal
export interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators?: ReconciliationIndicators;
}

// AIDEV-NOTE: Estado interno do modal de ações
export interface ActionModalState {
  isOpen: boolean;
  action: ReconciliationAction | null;
  movement: ReconciliationMovement | null;
  movements?: ReconciliationMovement[]; // Array para processamento em lote
}

// AIDEV-NOTE: Estado de paginação específico do modal
export interface ReconciliationPagination {
  page: number;
  limit: number;
  total: number;
}

// AIDEV-NOTE: Configurações do modal
export interface ReconciliationModalConfig {
  pagination: {
    defaultPageSize: number;
    pageSizeOptions: number[];
    maxItemsPerPage: number;
  };
  filters: {
    searchDebounceMs: number;
    defaultDateRange: () => { start: string; end: string };
  };
  animation: {
    modalVariants: {
      hidden: { opacity: number; scale: number };
      visible: { opacity: number; scale: number };
      exit: { opacity: number; scale: number };
    };
    buttonHover: {
      scale: number;
      transition: { duration: number };
    };
    panelToggle: {
      type: string;
      stiffness: number;
      damping: number;
    };
  };
}

// AIDEV-NOTE: Estado interno completo do modal
export interface ReconciliationModalState {
  movements: ImportedMovement[];
  filteredMovements: ImportedMovement[];
  indicators: ReconciliationIndicators | null;
  isLoading: boolean;
  actionModal: ActionModalState;
  isCollapsed: boolean;
  pagination: ReconciliationPagination;
  filters: ReconciliationFilters;
}

// AIDEV-NOTE: Props para hooks customizados
export interface UseReconciliationDataProps {
  isOpen: boolean;
  hasAccess: boolean;
  currentTenant: any;
  validateTenantContext: () => Promise<boolean>;
  logSecurityEvent: (event: string, details?: any) => Promise<void>;
  validateDataAccess: (data: any[]) => boolean;
}

export interface UseReconciliationFiltersProps {
  movements: ImportedMovement[];
  onFilteredChange: (filtered: ImportedMovement[]) => void;
  onIndicatorsChange: (indicators: ReconciliationIndicators) => void;
  onPaginationChange: (pagination: Partial<ReconciliationPagination>) => void;
}

// AIDEV-NOTE: Retorno dos hooks customizados
export interface UseReconciliationDataReturn {
  movements: ImportedMovement[];
  indicators: ReconciliationIndicators | null;
  isLoading: boolean;
  loadReconciliationData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export interface UseReconciliationFiltersReturn {
  filters: ReconciliationFilters;
  filteredMovements: ImportedMovement[];
  setFilters: (filters: ReconciliationFilters) => void;
  applyFilters: (data: ImportedMovement[], filters: ReconciliationFilters) => ImportedMovement[];
  resetFilters: () => void;
}

// AIDEV-NOTE: Constantes de configuração
export const RECONCILIATION_MODAL_CONFIG: ReconciliationModalConfig = {
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
    maxItemsPerPage: 100
  },
  filters: {
    searchDebounceMs: 300,
    defaultDateRange: () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
      };
    }
  },
  animation: {
    modalVariants: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 }
    },
    buttonHover: {
      scale: 1.05,
      transition: { duration: 0.2 }
    },
    panelToggle: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  }
};

// AIDEV-NOTE: Estado inicial padrão para filtros - Ajustado para mostrar todos os registros inicialmente
export const getInitialFilters = (): ReconciliationFilters => {
  // AIDEV-NOTE: Removendo filtros restritivos para mostrar todos os dados importados
  return {
    status: 'ALL' as any, // Mudança: era PENDING, agora ALL
    source: 'ALL' as any,
    hasContract: 'ALL' as any,
    dateFrom: '', // Mudança: era monthRange.start, agora vazio (sem filtro de data)
    dateTo: '', // Mudança: era monthRange.end, agora vazio (sem filtro de data)
    search: '',
    accountFilter: '',
    asaasNossoNumero: '',
    asaasBillingType: 'ALL',
    asaasPaymentStatus: 'ALL'
  };
};

// AIDEV-NOTE: Estado inicial padrão para paginação
export const getInitialPagination = (): ReconciliationPagination => ({
  page: 1,
  limit: RECONCILIATION_MODAL_CONFIG.pagination.defaultPageSize,
  total: 0
});

// AIDEV-NOTE: Estado inicial padrão para modal de ações
export const getInitialActionModal = (): ActionModalState => ({
  isOpen: false,
  action: null,
  movement: null
});

// AIDEV-NOTE: Constante para estado inicial do modal de ações (compatibilidade)
export const INITIAL_ACTION_MODAL_STATE: ActionModalState = {
  isOpen: false,
  action: null,
  movement: null
};

// AIDEV-NOTE: Constante para estado inicial de paginação (compatibilidade)
export const INITIAL_PAGINATION_STATE: ReconciliationPagination = {
  page: 1,
  limit: 10,
  total: 0
};

// AIDEV-NOTE: Constante para estado inicial de filtros (compatibilidade) - Ajustado para mostrar todos os registros
export const INITIAL_FILTERS_STATE: ReconciliationFilters = {
  status: 'ALL' as any, // Mudança: era PENDING, agora ALL
  source: 'ALL' as any,
  hasContract: 'ALL' as any,
  dateFrom: '', // Mudança: era vazio, mantido vazio (sem filtro de data)
  dateTo: '', // Mudança: era vazio, mantido vazio (sem filtro de data)
  search: '',
  accountFilter: '',
  asaasNossoNumero: '',
  asaasBillingType: 'ALL',
  asaasPaymentStatus: 'ALL'
};
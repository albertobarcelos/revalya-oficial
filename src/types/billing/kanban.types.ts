// AIDEV-NOTE: Tipos centralizados para o Kanban de Faturamento
// Seguindo padrão de nomenclatura em português-BR para comentários

import type { KanbanContract, KanbanData } from '@/hooks/useBillingKanban';

// AIDEV-NOTE: Exportando tipos existentes do hook para centralização
export type { KanbanContract, KanbanData };

/**
 * Status possíveis de um contrato no Kanban
 */
export type ContractStatus =
  | 'Faturar Hoje'
  | 'Faturamento Pendente'
  | 'Faturados no Mês'
  | 'Contratos a Renovar';

/**
 * IDs das colunas do Kanban
 */
export type KanbanColumnId = 'faturar-hoje' | 'pendente' | 'faturados' | 'renovar';

/**
 * Mapeamento de status para ID de coluna
 */
export const STATUS_TO_COLUMN: Record<ContractStatus, KanbanColumnId> = {
  'Faturar Hoje': 'faturar-hoje',
  'Faturamento Pendente': 'pendente',
  'Faturados no Mês': 'faturados',
  'Contratos a Renovar': 'renovar',
};

/**
 * Mapeamento de ID de coluna para status
 */
export const COLUMN_TO_STATUS: Record<KanbanColumnId, ContractStatus> = {
  'faturar-hoje': 'Faturar Hoje',
  pendente: 'Faturamento Pendente',
  faturados: 'Faturados no Mês',
  renovar: 'Contratos a Renovar',
};

/**
 * Props do componente KanbanCard
 */
export interface KanbanCardProps {
  contract: KanbanContract;
  isDragging?: boolean;
  columnId?: KanbanColumnId;
  onViewDetails: (periodId: string, isStandalone?: boolean) => void;
  dragHandleProps?: Record<string, unknown>;
  isSelected?: boolean;
  onSelectionChange?: (periodId: string, selected: boolean) => void;
  showCheckbox?: boolean;
}

/**
 * Props do componente KanbanColumn
 */
export interface KanbanColumnProps {
  title: string;
  contracts: KanbanContract[];
  columnId: KanbanColumnId;
  icon: React.ReactNode;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  onViewDetails: (periodId: string, isStandalone?: boolean) => void;
  selectedContracts?: Set<string>;
  onSelectionChange?: (periodId: string, selected: boolean) => void;
  showCheckboxes?: boolean;
  itemsPerPage?: number;
  onLoadMore?: (columnId: string) => void;
  hasMore?: boolean;
}

/**
 * Props do componente KanbanEmptyState
 */
export interface KanbanEmptyStateProps {
  message?: string;
  description?: string;
}

/**
 * Props do componente BillingActionButton
 */
export interface BillingActionButtonProps {
  selectedCount: number;
  isLoading: boolean;
  onBilling: () => void;
}

/**
 * Configuração de uma coluna do Kanban
 */
export interface KanbanColumnConfig {
  id: KanbanColumnId;
  title: string;
  icon: React.ReactNode;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  accentColor: {
    bar: string;
    badge: string;
    iconBg: string;
  };
}

/**
 * Tipo de resultado do faturamento
 */
export interface BillingResult {
  successCount: number;
  errorCount: number;
}

/**
 * Variáveis para a mutation de faturamento
 */
export interface BillingMutationVariables {
  periodIds: string[];
}

/**
 * Estado de paginação por coluna
 */
export type ColumnPaginationState = Record<KanbanColumnId, number>;

/**
 * Estado dos modais do Kanban
 */
export interface KanbanModalState {
  isContractModalOpen: boolean;
  selectedPeriodId: string | null;
  contractMode: 'view' | 'edit' | 'create';
  isStandaloneBillingOpen: boolean;
  /** Indica se o período selecionado é um faturamento avulso (standalone) */
  isStandalone?: boolean;
}

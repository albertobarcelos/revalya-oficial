// =====================================================
// TABLE PARTS TYPES
// Descrição: Tipos específicos para componentes da ReconciliationTable
// =====================================================

import { 
  ImportedMovement, 
  ReconciliationAction, 
  ReconciliationStatus, 
  PaymentStatus 
} from '@/types/reconciliation';

// AIDEV-NOTE: Tipos específicos para componentes extraídos da ReconciliationTable
// Cada interface define as props necessárias para seu respectivo componente

export interface TableHeaderProps {
  hasSelection: boolean;
  selectedCount: number;
  totalCount: number;
  onSelectAll: (selected: boolean) => void;
  allSelected: boolean;
  partiallySelected: boolean;
}

export interface TableRowProps {
  movement: ImportedMovement;
  isSelected: boolean;
  hasSelection: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onAction: (action: ReconciliationAction, movement: ImportedMovement) => void;
}

export interface ActionButtonsProps {
  movement: ImportedMovement;
  onAction: (action: ReconciliationAction, movement: ImportedMovement) => void;
}

export interface StatusBadgeProps {
  status: ReconciliationStatus;
  paymentStatus?: PaymentStatus;
  className?: string;
}

export interface ValueCellProps {
  value: number;
  type: 'currency' | 'percentage';
  className?: string;
  highlight?: boolean;
}

export interface SelectionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

// Componente para controles de paginação
export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

// Componente para formatação de valores monetários
export interface ValueCellProps {
  value: number | null | undefined;
  type?: 'default' | 'difference' | 'optional' | 'semibold';
  className?: string;
  showEmptyState?: boolean;
}
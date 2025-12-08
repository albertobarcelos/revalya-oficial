// AIDEV-NOTE: Coluna do Kanban de Faturamento
// Design clean: cabeçalho branco, bordas sutis e sem gradientes

import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortableItem } from '@/components/ui/sortable-item';
import { KanbanCard } from './KanbanCard';
import { KanbanEmptyState } from './KanbanEmptyState';
import {
  getColumnAccentClasses,
  COLUMN_HEADER_STYLES,
  SCROLL_LOAD_THRESHOLD,
} from '@/utils/billing/kanbanColumnConfig';
import type { KanbanColumnProps } from '@/types/billing/kanban.types';

/**
 * KanbanColumn
 * Responsável por renderizar uma coluna do Kanban.
 * Refatorado para um visual mais clean: cabeçalho branco, bordas sutis e sem gradientes.
 */
export function KanbanColumn({
  title,
  contracts,
  columnId,
  icon,
  badgeVariant,
  onViewDetails,
  selectedContracts = new Set(),
  onSelectionChange,
  showCheckboxes = false,
  itemsPerPage = 10,
  onLoadMore,
  hasMore = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  const accents = getColumnAccentClasses(columnId);

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl overflow-hidden',
        'border transition-all duration-200',
        'hover:shadow-sm',
        COLUMN_HEADER_STYLES.borderColor,
        COLUMN_HEADER_STYLES.bgColor,
        isOver && 'ring-1 ring-blue-600/20 bg-blue-50/30',
        // Altura fixa - ocupa 100% do container pai
        'h-full min-h-0 max-h-full'
      )}
    >
      {/* Header clean com acento sutil de cor por coluna */}
      <div className={cn('relative overflow-hidden flex-shrink-0', COLUMN_HEADER_STYLES.headerBg)}>
        {/* Barra sutil de acento de cor indicando a coluna (2px) */}
        <div className={cn('absolute left-0 top-0 h-full w-[2px]', accents.bar)} aria-hidden="true" />
        <div className="relative flex items-center justify-between p-3 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div
              className={cn('p-2 rounded-md', accents.iconBg, COLUMN_HEADER_STYLES.iconColor)}
            >
              {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
            </div>
            <div>
              <h3
                className={cn('font-semibold text-sm tracking-tight', COLUMN_HEADER_STYLES.titleColor)}
              >
                {title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {contracts.length} {contracts.length === 1 ? 'contrato' : 'contratos'}
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              'font-medium text-xs px-2 py-0.5 rounded-full',
              'border',
              accents.badge
            )}
          >
            {contracts.length}
          </Badge>
        </div>
      </div>

      {/* Área de drop com scroll customizado - altura fixa */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-3 space-y-3 overflow-y-auto overflow-x-hidden',
          'min-h-0',
          'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent',
          'hover:scrollbar-thumb-gray-400'
        )}
        onScroll={(e) => {
          const target = e.currentTarget;
          // AIDEV-NOTE: Carregar mais itens quando o usuário chega perto do final do scroll
          if (
            onLoadMore &&
            hasMore &&
            target.scrollTop + target.clientHeight >= target.scrollHeight * SCROLL_LOAD_THRESHOLD
          ) {
            onLoadMore(columnId);
          }
        }}
      >
        <SortableContext
          items={contracts.slice(0, itemsPerPage).map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {contracts.slice(0, itemsPerPage).map((contract) => (
            <SortableItem key={contract.id} id={contract.id} disabled={false} useHandle={true}>
              <KanbanCard
                contract={contract}
                columnId={columnId}
                onViewDetails={onViewDetails}
                isSelected={selectedContracts.has(contract.id)}
                onSelectionChange={onSelectionChange}
                showCheckbox={showCheckboxes && (columnId === 'faturar-hoje' || columnId === 'pendente')}
              />
            </SortableItem>
          ))}

          {/* Estado vazio melhorado */}
          {contracts.length === 0 && <KanbanEmptyState />}

          {/* AIDEV-NOTE: Indicador de carregamento de mais itens */}
          {hasMore && contracts.length > itemsPerPage && (
            <div className="text-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">Carregando mais...</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default KanbanColumn;

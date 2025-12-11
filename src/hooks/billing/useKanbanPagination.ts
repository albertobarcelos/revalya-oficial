// AIDEV-NOTE: Hook para gerenciamento de paginação por coluna do Kanban
// Evita carregar todos os cards de uma vez, melhorando performance

import { useState, useCallback } from 'react';
import type { KanbanColumnId, ColumnPaginationState } from '@/types/billing/kanban.types';
import { DEFAULT_ITEMS_PER_PAGE, ITEMS_INCREMENT } from '@/utils/billing/kanbanColumnConfig';

/**
 * Estado inicial da paginação por coluna
 */
const getInitialState = (): ColumnPaginationState => ({
  'faturar-hoje': DEFAULT_ITEMS_PER_PAGE,
  pendente: DEFAULT_ITEMS_PER_PAGE,
  faturados: DEFAULT_ITEMS_PER_PAGE,
  renovar: DEFAULT_ITEMS_PER_PAGE,
});

/**
 * Hook para gerenciar paginação por coluna no Kanban
 *
 * @returns Objeto com estado de paginação e funções de controle
 */
export function useKanbanPagination() {
  const [itemsPerColumn, setItemsPerColumn] = useState<ColumnPaginationState>(getInitialState);

  /**
   * Carrega mais itens em uma coluna específica
   *
   * @param columnId - ID da coluna para carregar mais itens
   */
  const handleLoadMore = useCallback((columnId: string) => {
    setItemsPerColumn((prev) => ({
      ...prev,
      [columnId]: (prev[columnId as KanbanColumnId] || DEFAULT_ITEMS_PER_PAGE) + ITEMS_INCREMENT,
    }));
  }, []);

  /**
   * Reseta a paginação para o estado inicial
   */
  const resetPagination = useCallback(() => {
    setItemsPerColumn(getInitialState());
  }, []);

  /**
   * Obtém o número de itens para uma coluna específica
   *
   * @param columnId - ID da coluna
   * @returns Número de itens a exibir
   */
  const getItemsForColumn = useCallback(
    (columnId: KanbanColumnId): number => {
      return itemsPerColumn[columnId] || DEFAULT_ITEMS_PER_PAGE;
    },
    [itemsPerColumn]
  );

  /**
   * Verifica se há mais itens para carregar em uma coluna
   *
   * @param columnId - ID da coluna
   * @param totalItems - Total de itens na coluna
   * @returns true se há mais itens para carregar
   */
  const hasMoreItems = useCallback(
    (columnId: KanbanColumnId, totalItems: number): boolean => {
      const currentLimit = itemsPerColumn[columnId] || DEFAULT_ITEMS_PER_PAGE;
      return totalItems > currentLimit;
    },
    [itemsPerColumn]
  );

  return {
    itemsPerColumn,
    handleLoadMore,
    resetPagination,
    getItemsForColumn,
    hasMoreItems,
  };
}

export default useKanbanPagination;

// AIDEV-NOTE: Configuração das colunas do Kanban de Faturamento
// Centraliza definições de cores, ícones e labels para consistência visual

import { CalendarDays, DollarSign, RotateCcw } from 'lucide-react';
import type { KanbanColumnId, KanbanColumnConfig } from '@/types/billing/kanban.types';

/**
 * Configuração de acentos de cor por coluna
 * Usado para identificação visual consistente em cards e cabeçalhos
 */
export const COLUMN_ACCENT_COLORS: Record<
  KanbanColumnId,
  { bar: string; badge: string; iconBg: string }
> = {
  'faturar-hoje': {
    bar: 'bg-blue-400',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-50',
  },
  pendente: {
    bar: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-50',
  },
  faturados: {
    bar: 'bg-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-50',
  },
  renovar: {
    bar: 'bg-violet-400',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    iconBg: 'bg-violet-50',
  },
};

/**
 * Configuração padrão (fallback) para colunas não mapeadas
 */
export const DEFAULT_ACCENT_COLORS = {
  bar: 'bg-gray-200',
  badge: 'bg-gray-100 text-gray-700 border-gray-200',
  iconBg: 'bg-gray-50',
};

/**
 * Obtém as classes de acento de cor para uma coluna específica
 *
 * @param columnId - ID da coluna
 * @returns Objeto com classes de cor para bar, badge e iconBg
 */
export function getColumnAccentClasses(
  columnId?: KanbanColumnId | string
): (typeof DEFAULT_ACCENT_COLORS) {
  if (!columnId) return DEFAULT_ACCENT_COLORS;
  return COLUMN_ACCENT_COLORS[columnId as KanbanColumnId] || DEFAULT_ACCENT_COLORS;
}

/**
 * Lista de IDs de colunas válidas
 */
export const VALID_COLUMN_IDS: KanbanColumnId[] = [
  'faturar-hoje',
  'pendente',
  'faturados',
  'renovar',
];

/**
 * Verifica se um ID de coluna é válido
 *
 * @param columnId - ID a ser verificado
 * @returns true se for uma coluna válida
 */
export function isValidColumnId(columnId: string): columnId is KanbanColumnId {
  return VALID_COLUMN_IDS.includes(columnId as KanbanColumnId);
}

/**
 * Estilos minimalistas para o card do Kanban
 */
export const CARD_STYLES = {
  border: 'border-gray-200 hover:border-gray-300',
  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-700',
  badgeNeutral: 'bg-gray-100 text-gray-700 border-gray-200',
};

/**
 * Estilos minimalistas para o cabeçalho da coluna
 */
export const COLUMN_HEADER_STYLES = {
  headerBg: 'bg-white',
  borderColor: 'border-gray-200',
  bgColor: 'bg-transparent',
  iconColor: 'text-gray-600',
  titleColor: 'text-gray-900',
  badgeStyle: 'bg-gray-100 text-gray-700 border-gray-200',
};

/**
 * Número padrão de itens por página na paginação
 */
export const DEFAULT_ITEMS_PER_PAGE = 10;

/**
 * Incremento de itens ao carregar mais
 */
export const ITEMS_INCREMENT = 10;

/**
 * Threshold de scroll para carregar mais itens (porcentagem)
 */
export const SCROLL_LOAD_THRESHOLD = 0.8;

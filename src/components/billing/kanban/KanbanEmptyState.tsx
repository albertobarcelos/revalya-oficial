// AIDEV-NOTE: Componente de estado vazio para colunas do Kanban
// Design minimalista com ícone e mensagem informativa

import React from 'react';
import { FileText } from 'lucide-react';
import type { KanbanEmptyStateProps } from '@/types/billing/kanban.types';

/**
 * Estado vazio para coluna do Kanban
 * Exibido quando não há contratos na coluna
 */
export function KanbanEmptyState({
  message = 'Nenhum contrato',
  description = 'Os contratos aparecerão aqui',
}: KanbanEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">{message}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}

export default KanbanEmptyState;

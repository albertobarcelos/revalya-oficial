// =====================================================
// AIDEV-NOTE: ReconciliationMainContent Component
// =====================================================
// Componente principal que renderiza o conteúdo da reconciliação
// Gerencia a tabela de movimentos e paginação
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import ReconciliationTable from '../ReconciliationTable';
import { ReconciliationMovement, ReconciliationAction } from '@/types/reconciliation';

interface ReconciliationMainContentProps {
  paginatedMovements: ReconciliationMovement[];
  isLoading: boolean;
  onAction: (movement: ReconciliationMovement, action: ReconciliationAction) => void;
  selectedMovements?: string[];
  onSelectionChange?: (selected: string[]) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
}

export function ReconciliationMainContent({
  paginatedMovements,
  isLoading,
  onAction,
  selectedMovements = [],
  onSelectionChange,
  pagination
}: ReconciliationMainContentProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 overflow-hidden p-3 lg:p-4"
      >
        <ReconciliationTable
          movements={paginatedMovements}
          isLoading={isLoading}
          onAction={onAction}
          selectedMovements={selectedMovements}
          onSelectionChange={onSelectionChange}
          pagination={pagination}
        />
      </motion.div>
    </div>
  );
}
import { motion } from "framer-motion";
import ReconciliationTable from "../ReconciliationTable";
import type { ReconciliationMovement } from "../types/reconciliation";

// AIDEV-NOTE: Interface para props do ReconciliationMainContent
interface ReconciliationMainContentProps {
  paginatedMovements: ReconciliationMovement[];
  isLoading: boolean;
  onAction: (action: string, movement: ReconciliationMovement) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
}

// AIDEV-NOTE: Componente extraído da área principal do ReconciliationModal
// Responsável por renderizar a tabela de reconciliação com paginação
export function ReconciliationMainContent({
  paginatedMovements,
  isLoading,
  onAction,
  pagination
}: ReconciliationMainContentProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 order-1 lg:order-1">
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
          pagination={pagination}
        />
      </motion.div>
    </div>
  );
}
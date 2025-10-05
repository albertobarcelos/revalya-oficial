// =====================================================
// RECONCILIATION TABLE COMPONENT
// Descrição: Tabela principal para visualização e ações de conciliação
// =====================================================

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Badge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody } from '@/components/ui/table';

// AIDEV-NOTE: Importações dos componentes extraídos
import { TableHeader } from './parts/TableHeader';
import { TableRow } from './parts/TableRow';
import { LoadingState } from './parts/LoadingState';
import { EmptyState } from './parts/EmptyState';
import { ExpandedRowDetails } from './parts/ExpandedRowDetails';
import { AsaasDetailsModal } from './parts/AsaasDetailsModal';
import { PaginationFooter } from './parts/PaginationFooter';

// AIDEV-NOTE: Importações dos helpers extraídos
import { 
  formatDate, 
  getSourceBadge, 
  createSelectionHandlers 
} from './utils/reconciliationHelpers.tsx';

// AIDEV-NOTE: Importações de tipos
import type { 
  ImportedMovement, 
  ReconciliationAction, 
  ReconciliationTableProps 
} from '@/types/reconciliation';

// AIDEV-NOTE: Tabela completa com todas as funcionalidades de conciliação
// Inclui ações por linha, seleção múltipla, paginação e indicadores visuais

const ReconciliationTable: React.FC<ReconciliationTableProps> = ({
  movements,
  loading = false,
  isLoading = false,
  onAction,
  selectedMovements = [],
  onSelectionChange,
  pagination
}) => {
  // =====================================================
  // LOCAL STATE
  // =====================================================

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [asaasDetailsModal, setAsaasDetailsModal] = useState<{
    isOpen: boolean;
    movement: ImportedMovement | null;
  }>({
    isOpen: false,
    movement: null
  });

  // =====================================================
  // HANDLERS
  // =====================================================

  const { handleSelectAll, handleSelectMovement } = createSelectionHandlers(
    movements,
    selectedMovements,
    onSelectionChange
  );

  const toggleRowExpansion = (movementId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(movementId)) {
      newExpanded.delete(movementId);
    } else {
      newExpanded.add(movementId);
    }
    setExpandedRows(newExpanded);
  };

  // AIDEV-NOTE: Handlers para modal ASAAS
  const handleViewAsaasDetails = (movement: ImportedMovement) => {
    setAsaasDetailsModal({
      isOpen: true,
      movement
    });
  };

  const handleCloseAsaasDetails = () => {
    setAsaasDetailsModal({
      isOpen: false,
      movement: null
    });
  };

  // =====================================================
  // RENDER CONDITIONS
  // =====================================================

  if (loading) {
    return <LoadingState />;
  }

  if (movements.length === 0) {
    return <EmptyState />;
  }
  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            Movimentações ({movements.length})
          </CardTitle>
          
          {selectedMovements.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedMovements.length} selecionado{selectedMovements.length > 1 ? 's' : ''}
              </Badge>
              <Button variant="outline" size="sm">
                Ações em Lote
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* AIDEV-NOTE: Container com altura fixa e scroll único externo */}
        <div className="relative h-[420px] overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto h-full">
            <Table className="min-w-[1400px] relative">
              <TableHeader
                hasSelection={!!onSelectionChange}
                selectedCount={selectedMovements.length}
                totalCount={movements.length}
                onSelectAll={handleSelectAll}
                allSelected={selectedMovements.length === movements.length}
                partiallySelected={selectedMovements.length > 0 && selectedMovements.length < movements.length}
              />
            
              <TableBody>
              {/* AIDEV-NOTE: Renderização das linhas com componente extraído */}
              {movements.map((movement) => {
                const isSelected = selectedMovements.includes(movement.id);
                const isExpanded = expandedRows.has(movement.id);
                
                return (
                  <React.Fragment key={movement.id}>
                    <TableRow
                      movement={movement}
                      isSelected={isSelected}
                      hasSelection={!!onSelectionChange}
                      onSelect={handleSelectMovement}
                      onAction={onAction}
                      isExpanded={isExpanded}
                      onToggleExpansion={toggleRowExpansion}
                      onViewAsaasDetails={handleViewAsaasDetails}
                      getSourceBadge={getSourceBadge}
                    />
                    
                    {/* AIDEV-NOTE: Linha expandida com detalhes completos */}
                    {isExpanded && (
                      <ExpandedRowDetails 
                        movement={movement}
                        formatDate={formatDate}
                      />
                    )}
                  </React.Fragment>
                );
              })}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* AIDEV-NOTE: Paginação com props obrigatórias */}
        {pagination && (
          <PaginationFooter
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit)}
            pageSize={pagination.limit}
            totalItems={pagination.total}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onLimitChange || (() => {})}
          />
        )}
      </CardContent>

      <AsaasDetailsModal
        isOpen={asaasDetailsModal.isOpen}
        movement={asaasDetailsModal.movement}
        onClose={handleCloseAsaasDetails}
      />
    </Card>
  );
};
export default ReconciliationTable;
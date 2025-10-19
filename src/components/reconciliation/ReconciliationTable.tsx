// =====================================================
// RECONCILIATION TABLE COMPONENT
// Descrição: Tabela principal para visualização e ações de conciliação
// =====================================================

import React, { useState, useCallback, useMemo } from 'react';
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
import { BulkActionsDropdown } from './parts/BulkActionsDropdown';

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
  // HANDLERS MEMOIZADOS PARA PERFORMANCE
  // =====================================================

  const { handleSelectAll, handleSelectMovement } = useMemo(() => 
    createSelectionHandlers(
      movements,
      selectedMovements,
      onSelectionChange
    ), [movements, selectedMovements, onSelectionChange]
  );

  // AIDEV-NOTE: Handler para ações em lote - CORRIGIDO para aguardar todas as ações
  const handleBulkAction = useCallback(async (action: ReconciliationAction) => {
    if (selectedMovements.length === 0) return;
    
    try {
      // AIDEV-NOTE: Criar array de promises para aguardar todas as ações
      const actionPromises = selectedMovements.map(async (movementId) => {
        const movement = movements.find(m => m.id === movementId);
        if (movement && onAction) {
          // AIDEV-NOTE: Aguardar cada ação individualmente
          return await onAction(action, movement);
        }
        return Promise.resolve();
      });
      
      // AIDEV-NOTE: Aguardar todas as ações serem concluídas
      await Promise.all(actionPromises);
      
      // AIDEV-NOTE: Limpar seleção APENAS após todas as ações serem concluídas
      if (onSelectionChange) {
        onSelectionChange([]);
      }
      
    } catch (error) {
      console.error('❌ Erro no processamento em lote:', error);
      // AIDEV-NOTE: Não limpar seleção em caso de erro para permitir retry
    }
  }, [selectedMovements, movements, onAction, onSelectionChange]);

  // AIDEV-NOTE: Handler para expandir/contrair linhas da tabela (memoizado)
  const toggleRowExpansion = useCallback((movementId: string) => {
    setExpandedRows(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(movementId)) {
        newExpanded.delete(movementId);
      } else {
        newExpanded.add(movementId);
      }
      return newExpanded;
    });
  }, []);

  // AIDEV-NOTE: Handlers para modal ASAAS (memoizados)
  const handleViewAsaasDetails = useCallback((movement: ImportedMovement) => {
    setAsaasDetailsModal({
      isOpen: true,
      movement
    });
  }, []);

  const handleCloseAsaasDetails = useCallback(() => {
    setAsaasDetailsModal({
      isOpen: false,
      movement: null
    });
  }, []);

  // =====================================================
  // RENDER CONDITIONS
  // =====================================================

  // AIDEV-NOTE: Loading state robusto - prioridade para loading prop
  if (loading || isLoading) {
    return <LoadingState />;
  }

  if (movements.length === 0) {
    return <EmptyState />;
  }

  // =====================================================
  // RENDER
  // =====================================================

  // AIDEV-NOTE: Memoizar componente para evitar re-renders desnecessários
  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Movimentações Importadas
            {movements.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {movements.length}
              </Badge>
            )}
          </CardTitle>
          
          {/* AIDEV-NOTE: Ações em lote quando há seleções */}
          {selectedMovements.length > 0 && (
            <BulkActionsDropdown
              selectedCount={selectedMovements.length}
              onBulkAction={handleBulkAction}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
        {/* AIDEV-NOTE: Estados de loading e vazio */}
        {(loading || isLoading) && <LoadingState />}
        
        {!loading && !isLoading && movements.length === 0 && <EmptyState />}
        
        {/* AIDEV-NOTE: Tabela principal com dados */}
        {!loading && !isLoading && movements.length > 0 && (
          <div className="h-full overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
            <div className="min-w-full">
              <Table>
                <TableHeader
                  hasSelection={true}
                  selectedCount={selectedMovements.length}
                  totalCount={movements.length}
                  onSelectAll={handleSelectAll}
                  allSelected={selectedMovements.length === movements.length && movements.length > 0}
                  partiallySelected={selectedMovements.length > 0 && selectedMovements.length < movements.length}
                />
                
                <TableBody>
                  {movements.map((movement) => {
                    const isSelected = selectedMovements.includes(movement.id);
                    const isExpanded = expandedRows.has(movement.id);
                    
                    return (
                      <React.Fragment key={movement.id}>
                        <TableRow
                          movement={movement}
                          isSelected={isSelected}
                          hasSelection={true}
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
        )}
      </CardContent>

      {/* AIDEV-NOTE: Rodapé fixo - sempre visível independente do conteúdo, fora do CardContent */}
      {pagination && (
        <div className="flex-shrink-0 p-0 border-t bg-background">
          <PaginationFooter
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit)}
            pageSize={pagination.limit}
            totalItems={pagination.total}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onLimitChange || (() => {})}
          />
        </div>
      )}

      <AsaasDetailsModal
        isOpen={asaasDetailsModal.isOpen}
        movement={asaasDetailsModal.movement}
        onClose={handleCloseAsaasDetails}
      />
    </Card>
  );
};

// AIDEV-NOTE: Exportar componente memoizado para evitar re-renders desnecessários
export default React.memo(ReconciliationTable);
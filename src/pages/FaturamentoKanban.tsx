// AIDEV-NOTE: Página principal do Kanban de Faturamento (refatorada)
// Componente de orquestração usando hooks e componentes especializados

import React, { useCallback } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { Dialog } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CalendarDays, DollarSign, RotateCcw, Loader2, AlertCircle } from 'lucide-react';

// Componentes locais
import { Layout } from '@/components/layout/Layout';
import { KanbanFilters } from '@/components/billing/KanbanFilters';
import { BillingOrderDetails } from '@/components/billing/BillingOrderDetails';
import { CreateStandaloneBillingDialog } from '@/components/billing/CreateStandaloneBillingDialog';
import { ContractFormSkeleton } from '@/components/contracts/ContractFormSkeleton';

// Componentes do Kanban refatorados
import {
  KanbanCard,
  KanbanColumn,
  BillingDialogContent,
  BillingActionButton,
} from '@/components/billing/kanban';

// Hooks
import { useBillingKanban, type KanbanData } from '@/hooks/useBillingKanban';
import { useKanbanFilters } from '@/hooks/useKanbanFilters';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import {
  useKanbanPagination,
  useKanbanModals,
  useKanbanDragAndDrop,
  useKanbanBilling,
} from '@/hooks/billing';

// Tipos
import type { KanbanColumnId } from '@/types/billing/kanban.types';

/**
 * AIDEV-NOTE: FaturamentoKanban
 * Página principal do Kanban de Faturamento. Versão refatorada com separação
 * clara de responsabilidades usando hooks e componentes especializados.
 */
export default function FaturamentoKanban() {
  // AIDEV-NOTE: Hooks de segurança e acesso
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: Hook principal do Kanban
  const { kanbanData, isLoading, error, refreshData, updateContractStatus } = useBillingKanban();

  // AIDEV-NOTE: Fallback seguro para garantir que kanbanData tem todas as propriedades
  const typedKanbanData: KanbanData = {
    'faturar-hoje': kanbanData['faturar-hoje'] || [],
    pendente: kanbanData['pendente'] || [],
    faturados: kanbanData['faturados'] || [],
    renovar: kanbanData['renovar'] || [],
  };

  // AIDEV-NOTE: Hook de filtros
  const { filters, filteredData, updateFilter, clearFilters, hasActiveFilters } =
    useKanbanFilters(typedKanbanData);

  // AIDEV-NOTE: Hook de paginação
  const { itemsPerColumn, handleLoadMore, hasMoreItems } = useKanbanPagination();

  // AIDEV-NOTE: Hook de modais
  const {
    isContractModalOpen,
    selectedPeriodId,
    isStandaloneBillingOpen,
    openDetailsModal,
    closeDetailsModal,
    openStandaloneBillingModal,
    closeStandaloneBillingModal,
  } = useKanbanModals();

  // AIDEV-NOTE: Hook de faturamento
  const {
    selectedContracts,
    isBilling,
    showCheckboxes,
    handleSelectionChange,
    toggleSelectionMode,
    handleBilling,
  } = useKanbanBilling({ refreshData });

  // AIDEV-NOTE: Hook de drag & drop
  const { activeContract, handleDragStart, handleDragEnd, handleDragCancel } = useKanbanDragAndDrop(
    {
      kanbanData: typedKanbanData,
      updateContractStatus,
      refreshData,
    }
  );

  // AIDEV-NOTE: Handler para sucesso no faturamento avulso
  const handleStandaloneBillingSuccess = useCallback(() => {
    console.log('✅ [STANDALONE] Faturamento criado com sucesso');
    refreshData();
    closeStandaloneBillingModal();
  }, [refreshData, closeStandaloneBillingModal]);

  // 🔍 [DEBUG] Log do estado do componente
  console.log('🎯 [COMPONENT] FaturamentoKanban render:', {
    hasAccess,
    isLoading,
    error,
    kanbanDataCounts: {
      'faturar-hoje': typedKanbanData['faturar-hoje']?.length || 0,
      pendente: typedKanbanData['pendente']?.length || 0,
      faturados: typedKanbanData['faturados']?.length || 0,
      renovar: typedKanbanData['renovar']?.length || 0,
    },
    currentTenant: currentTenant?.name,
  });

  // AIDEV-NOTE: Configuração das colunas
  const columns: Array<{
    id: KanbanColumnId;
    title: string;
    icon: React.ReactNode;
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  }> = [
    {
      id: 'faturar-hoje',
      title: 'Faturar Hoje',
      icon: <CalendarDays className="h-4 w-4" />,
      badgeVariant: 'destructive',
    },
    {
      id: 'pendente',
      title: 'Faturamento Pendente',
      icon: <CalendarDays className="h-4 w-4" />,
      badgeVariant: 'secondary',
    },
    {
      id: 'faturados',
      title: 'Faturados no Mês',
      icon: <DollarSign className="h-4 w-4" />,
      badgeVariant: 'default',
    },
    {
      id: 'renovar',
      title: 'Contratos a Renovar',
      icon: <RotateCcw className="h-4 w-4" />,
      badgeVariant: 'outline',
    },
  ];

  // 🛡️ VALIDAÇÃO CRÍTICA DE ACESSO
  if (!hasAccess) {
    return (
      <Layout title="Kanban de Faturamento">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{accessError || 'Acesso negado ao tenant'}</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  // Mostrar loading
  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Carregando contratos...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Mostrar erro
  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar dados: {error}
              <Button variant="outline" size="sm" className="ml-2" onClick={refreshData}>
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden min-h-0">
        {/* AIDEV-NOTE: Área de filtros - altura fixa, padding reduzido */}
        <div className="flex-shrink-0 px-3 md:px-4 pt-2 pb-1">
          {/* Filtros com botão integrado */}
          <KanbanFilters
            filters={filters}
            onFilterChange={updateFilter}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            onToggleSelectionMode={toggleSelectionMode}
            isSelectionMode={showCheckboxes}
            isLoading={isLoading}
            onOpenStandaloneBilling={openStandaloneBillingModal}
          />

          {/* Botão de faturamento - aparece quando há contratos selecionados */}
          <BillingActionButton
            selectedCount={selectedContracts.size}
            isLoading={isBilling}
            onBilling={handleBilling}
          />
        </div>

        {/* AIDEV-NOTE: Área das colunas - ocupa espaço restante com scroll */}
        <div className="flex-1 min-h-0 overflow-hidden px-3 md:px-4 pb-3">
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 h-full min-h-0 auto-rows-fr">
              {columns.map((column) => {
                // Usar dados filtrados se houver filtros ativos
                const columnContracts = hasActiveFilters
                  ? filteredData[column.id] || []
                  : typedKanbanData[column.id];

                return (
                  <KanbanColumn
                    key={column.id}
                    title={column.title}
                    contracts={columnContracts}
                    columnId={column.id}
                    icon={column.icon}
                    badgeVariant={column.badgeVariant}
                    onViewDetails={openDetailsModal}
                    selectedContracts={selectedContracts}
                    onSelectionChange={handleSelectionChange}
                    showCheckboxes={showCheckboxes}
                    itemsPerPage={itemsPerColumn[column.id] || 10}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMoreItems(column.id, columnContracts.length)}
                  />
                );
              })}
            </div>

            <DragOverlay>
              {activeContract ? (
                <KanbanCard contract={activeContract} isDragging onViewDetails={openDetailsModal} />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* AIDEV-NOTE: Modal de detalhes do contrato */}
        <Dialog
          open={isContractModalOpen}
          onOpenChange={(open) => {
            if (!open) closeDetailsModal();
          }}
          modal
        >
          <BillingDialogContent className="p-0 m-0 border-0">
            <DialogPrimitive.Title className="sr-only">
              Detalhes da Ordem de Faturamento
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Visualização dos detalhes da ordem de faturamento. Ordens faturadas estão congeladas e
              não refletem alterações no contrato.
            </DialogPrimitive.Description>
            {/* AIDEV-NOTE: Container otimizado para scroll com altura controlada */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {!selectedPeriodId ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <ContractFormSkeleton />
                </div>
              ) : (
                <BillingOrderDetails periodId={selectedPeriodId} onClose={closeDetailsModal} />
              )}
            </div>
          </BillingDialogContent>
        </Dialog>

        {/* AIDEV-NOTE: Modal de faturamento avulso */}
        {isStandaloneBillingOpen && (
          <CreateStandaloneBillingDialog
            isOpen={isStandaloneBillingOpen}
            onClose={closeStandaloneBillingModal}
            onSuccess={handleStandaloneBillingSuccess}
          />
        )}
      </div>
    </Layout>
  );
}

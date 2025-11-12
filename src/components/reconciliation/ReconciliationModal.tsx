// =====================================================
// RECONCILIATION MODAL - REFATORADO
// Descrição: Modal de conciliação refatorado com hooks customizados e configurações centralizadas
// Tecnologias: Shadcn/UI + Tailwind + Motion.dev + Custom Hooks
// Padrão: Clean Architecture + Security First + Performance Optimized
// =====================================================

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X,
  Download, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// AIDEV-NOTE: Componentes específicos da conciliação
import ReconciliationFilters from './ReconciliationFilters';
import ReconciliationHeaderIndicators from './ReconciliationHeaderIndicators';
import ReconciliationTable from './ReconciliationTable';
import ReconciliationActionModal from './ReconciliationActionModal';
import CustomerValidationGuard from './CustomerValidationGuard';
import AccessDeniedDialog from './parts/AccessDeniedDialog';
import ReconciliationModalHeader from './parts/ReconciliationModalHeader';
import SidebarToggleButton from './parts/SidebarToggleButton';
import { ReconciliationSidebar } from './parts/ReconciliationSidebar';
import { ReconciliationMainContent } from './parts/ReconciliationMainContent';

// AIDEV-NOTE: Hooks customizados refatorados
import { useReconciliationData } from '@/hooks/useReconciliationData';
import { useReconciliationFilters } from '@/hooks/useReconciliationFilters';
import { useReconciliationSecurity } from '@/hooks/useReconciliationSecurity';
import { useReconciliationActions } from '@/hooks/useReconciliationActions';

// AIDEV-NOTE: Tipos e configurações centralizadas
import { 
  ReconciliationModalProps,
  INITIAL_PAGINATION_STATE,
  INITIAL_FILTERS_STATE,
  ReconciliationPagination,
  ReconciliationMovement
} from './types/ReconciliationModalTypes';
import { 
  RECONCILIATION_CONFIG,
  ANIMATION_CONFIG,
  getEnvironmentConfig
} from './config/ReconciliationConfig';
import { 
  ImportedMovement,
  ReconciliationIndicators
} from '@/types/reconciliation';

// AIDEV-NOTE: Imports removidos - funcionalidades agora fornecidas pelos hooks customizados

// Hooks
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useAuditLogger } from '@/hooks/useAuditLogger';
import { useTenantLoading } from '@/hooks/useZustandTenant';

// AIDEV-NOTE: Componente principal refatorado com hooks customizados
const ReconciliationModal: React.FC<ReconciliationModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  // =====================================================
  // HOOKS CUSTOMIZADOS - ARQUITETURA LIMPA
  // =====================================================
  
  // AIDEV-NOTE: Hook de segurança multi-tenant obrigatório
  const {
    hasAccess,
    accessError,
    currentTenant,
    isValidatingAccess,
    validateTenantContext,
    logSecurityEvent,
    checkPermissions,
    validateDataAccess
  } = useReconciliationSecurity();

  // AIDEV-NOTE: Hook para gerenciamento de dados com cache otimizado
  const {
    movements,
    indicators,
    isLoading,
    loadReconciliationData,
    refreshData,
    invalidateCache
  } = useReconciliationData(isOpen);

  // =====================================================
  // CALLBACKS PARA HOOKS
  // =====================================================
  
  // AIDEV-NOTE: Callback para mudanças nos dados filtrados (memoizado e otimizado)
  const handleFilteredChange = useCallback((filtered: ImportedMovement[]) => {
    // AIDEV-NOTE: Callback vazio para evitar re-renders desnecessários
    // Os dados filtrados já são gerenciados pelo hook useReconciliationFilters
  }, []);

  // AIDEV-NOTE: Callback para mudanças nos indicadores (memoizado e otimizado)
  const handleIndicatorsChange = useCallback((newIndicators: ReconciliationIndicators) => {
    // AIDEV-NOTE: Callback vazio para evitar re-renders desnecessários
    // Os indicadores já são gerenciados pelo hook useReconciliationFilters
  }, []);

  // AIDEV-NOTE: Callback para mudanças na paginação (memoizado)
  const handlePaginationChange = useCallback((paginationUpdate: Partial<ReconciliationPagination>) => {
    setPagination(prev => ({
      ...prev,
      ...paginationUpdate
    }));
  }, []);

  // AIDEV-NOTE: Hook para gerenciamento de filtros
  const {
    filters,
    filteredMovements,
    updateFilters,
    resetFilters
  } = useReconciliationFilters({
    movements,
    onFilteredChange: handleFilteredChange,
    onIndicatorsChange: handleIndicatorsChange,
    onPaginationChange: handlePaginationChange
  });

  // AIDEV-NOTE: Hook para gerenciamento de ações com invalidação de cache
  const {
    actionModal,
    isExporting,
    handleRefresh,
    handleExport,
    handleReconciliationAction,
    handleActionModalConfirm,
    // AIDEV-NOTE: handleBulkImportToCharges removido - charges já são criadas diretamente
    closeActionModal
  } = useReconciliationActions({
    currentTenant,
    movements,
    filteredMovements,
    onRefreshData: refreshData,
    onInvalidateCache: invalidateCache, // AIDEV-NOTE: Adicionar invalidação de cache
    validateTenantContext,
    logSecurityEvent
  });

  // =====================================================
  // ESTADOS LOCAIS SIMPLIFICADOS
  // =====================================================
  
  // AIDEV-NOTE: Estados locais simplificados
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedMovements, setSelectedMovements] = useState<string[]>([]);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION_STATE);

  // AIDEV-NOTE: Configurações do ambiente
  const config = getEnvironmentConfig();

  // =====================================================
  // PAGINAÇÃO DOS DADOS FILTRADOS
  // =====================================================
  
  // AIDEV-NOTE: Cálculo da paginação baseado nos dados filtrados
  const paginatedMovements = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredMovements.slice(startIndex, endIndex);
  }, [filteredMovements, pagination.page, pagination.limit]);

  // =====================================================
  // LOADING & ACCESS CONTROL
  // =====================================================
  
  // AIDEV-NOTE: Funções de carregamento e ações são fornecidas pelos hooks customizados

  // =====================================================
  // SIDEBAR RESIZE FUNCTIONS
  // =====================================================
  
  // =====================================================
  // LOADING & ACCESS CONTROL
  // =====================================================
  if (!hasAccess) {
    return (
      <AccessDeniedDialog
        isOpen={isOpen}
        onClose={onClose}
        accessError={accessError}
      />
    );
  }

  // =====================================================
  // MODAL ANIMATIONS
  // =====================================================
  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
        duration: 0.3
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.2 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog key="reconciliation-modal" open={isOpen} onOpenChange={onClose}>
          <DialogContent 
          className="!max-w-none !w-[90vw] !h-[90vh] !max-h-[90vh] p-0 gap-0 overflow-hidden bg-transparent border-0 !left-[5vw] !top-[5vh] !transform-none !translate-x-0 !translate-y-0"
          style={{ 
            backdropFilter: 'blur(8px)',
            position: 'fixed',
            width: '90vw',
            height: '90vh',
            left: '5vw',
            top: '5vh'
          }}
        >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-background rounded-2xl shadow-2xl h-full w-full flex flex-col overflow-hidden"
            >
              {/* HEADER */}
              <ReconciliationModalHeader
                currentTenant={currentTenant}
                refreshData={refreshData}
                handleExport={handleExport}
                onClose={onClose}
                isLoading={isLoading}
                isExporting={isExporting}
                indicators={indicators}
                onImportComplete={refreshData}
              />

              {/* CONTENT - Two Column Layout */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden reconciliation-container relative">
                
                {/* Toggle Button - Posicionamento elegante no meio */}
                <SidebarToggleButton
                  isCollapsed={isCollapsed}
                  onToggle={() => setIsCollapsed(!isCollapsed)}
                />

                {/* LEFT COLUMN - Main Content with Table */}
                <ReconciliationMainContent
                  paginatedMovements={paginatedMovements}
                  isLoading={isLoading}
                  onAction={(movement, action) => {
                    // AIDEV-NOTE: Convertendo selectedMovements (IDs) para objetos completos
                    const selectedMovementObjects = selectedMovements
                      .map(id => movements.find(mov => mov.id === id))
                      .filter(Boolean) as ReconciliationMovement[];
                    
                    handleReconciliationAction(movement, action, selectedMovementObjects);
                  }}
                  selectedMovements={selectedMovements}
                  onSelectionChange={setSelectedMovements}
                  pagination={{
                    page: pagination.page,
                    limit: pagination.limit,
                    total: filteredMovements.length,
                    onPageChange: (page: number) => setPagination(prev => ({ ...prev, page })),
                    onLimitChange: (limit: number) => setPagination(prev => ({ ...prev, limit, page: 1 }))
                  }}
                />

                {/* Painel lateral refinado e elegante */}
                <ReconciliationSidebar
                  isCollapsed={isCollapsed}
                  filters={filters}
                  onFiltersChange={updateFilters}
                  isLoading={isLoading}
                />
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Modal de Ações */}
       <ReconciliationActionModal
         isOpen={actionModal.isOpen}
         action={actionModal.action}
         movement={actionModal.movement}
         movements={actionModal.movements}
         onClose={closeActionModal}
         onActionComplete={async (movement, action, data) => {
           // AIDEV-NOTE: Usando a função do hook customizado com parâmetros corretos
           await handleActionModalConfirm(movement, action, data);
         }}
         // AIDEV-NOTE: onBulkImportToCharges removido - charges já são criadas diretamente
       />
    </AnimatePresence>
  );
};

export default ReconciliationModal;
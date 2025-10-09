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
  ReconciliationPagination
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

// API Client
import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';

// Hooks
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useAuditLogger } from '@/hooks/useAuditLogger';
import { useTenantLoading } from '@/hooks/useZustandTenant';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

  // AIDEV-NOTE: Hook para gerenciamento de dados
  const {
    movements,
    indicators,
    isLoading,
    loadReconciliationData,
    refreshData
  } = useReconciliationData({
    isOpen,
    hasAccess,
    currentTenant,
    validateTenantContext,
    logSecurityEvent,
    validateDataAccess
  });

  // =====================================================
  // CALLBACKS PARA HOOKS
  // =====================================================
  
  // AIDEV-NOTE: Callback para mudanças nos dados filtrados
  const handleFilteredChange = useCallback((filtered: ImportedMovement[]) => {
    // Atualizar indicadores baseados nos dados filtrados
    // Pode ser usado para sincronizar com outros componentes
  }, []);

  // AIDEV-NOTE: Callback para mudanças nos indicadores
  const handleIndicatorsChange = useCallback((newIndicators: ReconciliationIndicators) => {
    // Atualizar indicadores no estado local se necessário
    // Pode ser usado para notificações ou logs
  }, []);

  // AIDEV-NOTE: Callback para mudanças na paginação
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

  // AIDEV-NOTE: Hook para gerenciamento de ações
  const {
    actionModal,
    isExporting,
    handleRefresh,
    handleExport,
    handleReconciliationAction,
    handleActionModalConfirm,
    closeActionModal
  } = useReconciliationActions({
    currentTenant,
    movements,
    filteredMovements,
    onRefreshData: refreshData,
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

  const loadReconciliationData = async () => {
    setIsLoading(true);
    try {
      // AIDEV-NOTE: Consulta direta ao Supabase - sem necessidade de endpoint Next.js
      const { data, error } = await supabase
        .from('conciliation_staging')
        .select(`
          id,
          origem,
          id_externo,
          valor_cobranca,
          valor_pago,
          status_externo,
          status_conciliacao,
          contrato_id,
          cobranca_id,
          juros_multa_diferenca,
          data_vencimento,
          data_pagamento,
          observacao,
          created_at,
          updated_at
        `)
        .eq('tenant_id', currentTenant?.id)
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) {
        throw error;
      }
      
      // AIDEV-NOTE: Mapear dados do banco para o formato correto
      const mappedMovements = mapStagingDataToImportedMovement(data || []);
      setMovements(mappedMovements);
      
      toast({
        title: "Dados carregados",
        description: `${mappedMovements.length} movimentações carregadas com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao carregar dados de conciliação:', error);
      
      toast({
        title: "Erro ao carregar dados",
        description: error.response?.data?.error || error.message || "Não foi possível carregar as movimentações.",
        variant: "destructive",
      });
      
      // Em caso de erro, manter array vazio
      setMovements([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    logAction('reconciliation_refresh', { tenant: currentTenant?.name });
    loadReconciliationData();
  };

  const handleExport = () => {
    logAction('reconciliation_export', { 
      tenant: currentTenant?.name,
      recordCount: filteredMovements.length 
    });
    
    toast({
      title: "Exportação iniciada",
      description: `Exportando ${filteredMovements.length} registros...`,
    });
  };

  const handleReconciliationAction = async (action: ReconciliationAction, movementId: string) => {
    try {
      setIsLoading(true);
      
      logAction('reconciliation_action', { 
        action, 
        movementId, 
        tenant: currentTenant?.name 
      });

      // AIDEV-NOTE: Atualização direta no Supabase - sem necessidade de endpoint Next.js
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Definir status baseado na ação
      switch (action) {
        case 'vincular_contrato':
          updateData.status_conciliacao = 'vinculado';
          updateData.observacao = 'Contrato vinculado automaticamente';
          break;
        case 'criar_avulsa':
          updateData.status_conciliacao = 'avulsa_criada';
          updateData.observacao = 'Cobrança avulsa criada';
          break;
        case 'marcar_divergente':
          updateData.status_conciliacao = 'divergente';
          updateData.observacao = 'Marcado como divergente';
          break;
        case 'aprovar':
          updateData.status_conciliacao = 'aprovado';
          updateData.observacao = 'Movimento aprovado';
          break;
        case 'rejeitar':
          updateData.status_conciliacao = 'rejeitado';
          updateData.observacao = 'Movimento rejeitado';
          break;
      }

      const { error } = await supabase
        .from('conciliation_staging')
        .update(updateData)
        .eq('id', movementId)
        .eq('tenant_id', currentTenant?.id);

      if (error) {
        throw error;
      }

      const actionMessages = {
        vincular_contrato: "Contrato vinculado com sucesso",
        criar_avulsa: "Cobrança avulsa criada com sucesso",
        marcar_divergente: "Movimento marcado como divergente",
        aprovar: "Movimento aprovado com sucesso",
        rejeitar: "Movimento rejeitado"
      };

      toast({
        title: "Ação executada",
        description: actionMessages[action] || "Ação executada com sucesso",
      });

      // Recarregar dados para refletir as mudanças
      await loadReconciliationData();
    } catch (error: any) {
      console.error('Erro ao executar ação de conciliação:', error);
      
      toast({
        title: "Erro na ação",
        description: error.response?.data?.error || error.message || "Não foi possível executar a ação.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                  onAction={handleReconciliationAction}
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
         onClose={closeActionModal}
         onActionComplete={async (movement, action, data) => {
           // AIDEV-NOTE: Usando a função do hook customizado com parâmetros corretos
           await handleActionModalConfirm(movement, action, data);
         }}
       />
    </AnimatePresence>
  );
};

export default ReconciliationModal;
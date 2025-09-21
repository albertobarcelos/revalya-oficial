// =====================================================
// RECONCILIATION MODAL
// Descrição: Modal de conciliação que substitui a página separada
// Tecnologias: Shadcn/UI + Tailwind + Motion.dev
// =====================================================

import React, { useState, useEffect, useMemo } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
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

// Components
import ReconciliationFilters from './ReconciliationFilters';
import ReconciliationHeaderIndicators from './ReconciliationHeaderIndicators';
import ReconciliationTable from './ReconciliationTable';

// Types
import { 
  ImportedMovement, 
  ReconciliationFilters as FilterType,
  ReconciliationStatus,
  PaymentStatus,
  ReconciliationSource,
  ReconciliationIndicators as IndicatorsType,
  ReconciliationAction
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

const ReconciliationModal: React.FC<ReconciliationModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  // =====================================================
  // HOOKS & STATE
  // =====================================================
  const { toast } = useToast();
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const { logAction } = useAuditLogger();
  const tenantLoading = useTenantLoading();

  // Estados locais
  const [movements, setMovements] = useState<ImportedMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<ImportedMovement[]>([]);
  const [indicators, setIndicators] = useState<IndicatorsType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // AIDEV-NOTE: Estado para controlar colapso do sidebar de filtros
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // AIDEV-NOTE: Estado de paginação para controlar exibição da tabela
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  
  // AIDEV-NOTE: Inicialização correta dos filtros para evitar inputs não controlados
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  const [filters, setFilters] = useState<FilterType>(() => {
    const monthRange = getCurrentMonthRange();
    return {
      status: 'PENDING' as any,
      source: 'ALL' as any,
      hasContract: 'ALL' as any,
      dateFrom: monthRange.start,
      dateTo: monthRange.end,
      search: '',
      accountFilter: '',
      asaasNossoNumero: '',
      asaasBillingType: 'ALL',
      asaasPaymentStatus: 'ALL'
    };
  });

  // =====================================================
  // EFFECTS
  // =====================================================
  useEffect(() => {
    if (isOpen && hasAccess) {
      loadReconciliationData();
      logAction('reconciliation_modal_opened', { tenant: currentTenant?.name });
    }
  }, [isOpen, hasAccess, currentTenant]);

  useEffect(() => {
    if (movements.length > 0) {
      const filtered = applyFilters(movements, filters);
      setFilteredMovements(filtered);
      setIndicators(calculateIndicators(filtered));
      
      // AIDEV-NOTE: Atualizar total de registros filtrados para paginação
      setPagination(prev => ({ ...prev, total: filtered.length, page: 1 }));
    }
  }, [movements, filters]);

  // AIDEV-NOTE: Movimentações paginadas
  const paginatedMovements = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredMovements.slice(startIndex, endIndex);
  }, [filteredMovements, pagination.page, pagination.limit]);

  // =====================================================
  // FUNCTIONS
  // =====================================================
  
  // AIDEV-NOTE: Função para aplicar filtros localmente - corrigida para usar ReconciliationFilters
  const applyFilters = (data: ImportedMovement[], filters: FilterType): ImportedMovement[] => {
    return data.filter(movement => {
      // Filtro por status - usando a propriedade correta
      if (filters.status !== 'ALL' && filters.status !== movement.reconciliationStatus) {
        return false;
      }
      
      // Filtro por origem - usando a propriedade correta
      if (filters.source !== 'ALL' && filters.source !== movement.source) {
        return false;
      }
      
      // Filtro por contrato
      if (filters.hasContract !== 'ALL') {
        if (filters.hasContract === 'WITH_CONTRACT' && !movement.hasContract) {
          return false;
        }
        if (filters.hasContract === 'WITHOUT_CONTRACT' && movement.hasContract) {
          return false;
        }
      }
      
      // Filtro por termo de busca - usando a propriedade correta 'search'
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          movement.externalId?.toLowerCase().includes(searchLower) ||
          movement.customerName?.toLowerCase().includes(searchLower) ||
          movement.customerDocument?.toLowerCase().includes(searchLower) ||
          movement.description?.toLowerCase().includes(searchLower) ||
          movement.amount.toString().includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      // Filtro por conta
      if (filters.accountFilter && filters.accountFilter.trim()) {
        const accountLower = filters.accountFilter.toLowerCase();
        if (!movement.account?.toLowerCase().includes(accountLower)) {
          return false;
        }
      }
      
      // Filtro por data - usando dateFrom e dateTo
      if (filters.dateFrom && movement.paymentDate) {
        if (new Date(movement.paymentDate) < new Date(filters.dateFrom)) {
          return false;
        }
      }
      
      if (filters.dateTo && movement.paymentDate) {
        if (new Date(movement.paymentDate) > new Date(filters.dateTo)) {
          return false;
        }
      }
      
      // Filtros específicos ASAAS
      if (filters.source === ReconciliationSource.ASAAS) {
        if (filters.asaasNossoNumero && filters.asaasNossoNumero.trim()) {
          if (!movement.externalId?.includes(filters.asaasNossoNumero)) {
            return false;
          }
        }
        
        if (filters.asaasBillingType && filters.asaasBillingType !== 'ALL') {
          // Assumindo que temos essa propriedade no movimento
          if (movement.billingType !== filters.asaasBillingType) {
            return false;
          }
        }
        
        if (filters.asaasPaymentStatus && filters.asaasPaymentStatus !== 'ALL') {
          // Assumindo que temos essa propriedade no movimento
          if (movement.paymentStatus !== filters.asaasPaymentStatus) {
            return false;
          }
        }
      }
      
      return true;
    });
  };

  // AIDEV-NOTE: Função para calcular indicadores baseados nos dados filtrados - corrigida
  const calculateIndicators = (data: ImportedMovement[]): IndicatorsType => {
    const total = data.length;
    const reconciled = data.filter(m => m.reconciliationStatus === ReconciliationStatus.RECONCILED).length;
    const pending = data.filter(m => m.reconciliationStatus === ReconciliationStatus.PENDING).length;
    const divergent = data.filter(m => m.reconciliationStatus === ReconciliationStatus.DIVERGENT).length;
    
    const totalValue = data.reduce((sum, m) => sum + m.amount, 0);
    const reconciledValue = data
      .filter(m => m.reconciliationStatus === ReconciliationStatus.RECONCILED)
      .reduce((sum, m) => sum + m.amount, 0);
    
    return {
      notReconciled: pending,
      reconciledThisMonth: reconciled,
      valueDifferences: divergent,
      totalAmount: totalValue
    };
  };

  // AIDEV-NOTE: Função para mapear dados do banco para o formato ImportedMovement
  const mapStagingDataToImportedMovement = (stagingData: any[]): ImportedMovement[] => {
    return stagingData.map(item => {
      // AIDEV-NOTE: Mapear paymentStatus do banco para enum válido
      let paymentStatus = PaymentStatus.PENDING;
      if (item.payment_status) {
        switch (item.payment_status.toUpperCase()) {
          case 'PAID':
          case 'CONFIRMED':
          case 'RECEIVED':
            paymentStatus = PaymentStatus.PAID;
            break;
          case 'CANCELLED':
          case 'CANCELED':
            paymentStatus = PaymentStatus.CANCELLED;
            break;
          case 'OVERDUE':
          case 'EXPIRED':
            paymentStatus = PaymentStatus.OVERDUE;
            break;
          default:
            paymentStatus = PaymentStatus.PENDING;
        }
      }

      return {
        id: item.id,
        externalId: item.id_externo,
        amount: item.valor_pago || item.valor_cobranca || 0,
        chargeAmount: item.valor_cobranca || 0,
        paidAmount: item.valor_pago || 0,
        source: item.origem as ReconciliationSource,
        reconciliationStatus: item.status_conciliacao === 'conciliado' 
          ? ReconciliationStatus.RECONCILED 
          : item.status_conciliacao === 'divergente'
          ? ReconciliationStatus.DIVERGENT
          : ReconciliationStatus.PENDING,
        externalStatus: item.status_externo,
        contractId: item.contrato_id,
        chargeId: item.cobranca_id,
        interestDifference: item.juros_multa_diferenca || 0,
        dueDate: item.data_vencimento,
        paymentDate: item.data_pagamento,
        description: item.observacao,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        // Campos computados
        hasContract: !!item.contrato_id,
        customerName: '', // Será preenchido se necessário
        customerDocument: '', // Será preenchido se necessário
        account: '', // Será preenchido se necessário
        tenantId: currentTenant?.id || '',
        // Campos específicos ASAAS (se aplicável)
        billingType: item.billing_type,
        paymentStatus
      };
    });
  };

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
      let updateData: any = {
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
  if (tenantLoading) {
    return null; // Modal não aparece durante loading
  }

  if (!hasAccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Acesso Negado
            </DialogTitle>
            <DialogDescription>
              {accessError || 'Você não tem permissão para acessar a conciliação.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
        <Dialog open={isOpen} onOpenChange={onClose}>
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
              <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FileText className="h-6 w-6 text-primary" />
                    </motion.div>
                    <div>
                      <DialogTitle className="text-xl font-semibold">
                        Conciliação Financeira
                      </DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground">
                        {currentTenant?.name} • Sistema de conciliação de contas a receber
                      </DialogDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                      </Button>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Exportar
                      </Button>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* INDICADORES MINIMALISTAS NO HEADER */}
                <div className="mt-4 pt-4 border-t border-border/30">
                  {indicators && (
                    <ReconciliationHeaderIndicators 
                      indicators={indicators} 
                      isLoading={isLoading}
                    />
                  )}
                </div>
              </DialogHeader>

              {/* CONTENT - Two Column Layout */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden reconciliation-container relative">
                
                {/* Toggle Button - Posicionamento elegante no meio */}
                <motion.div 
                  className="absolute z-[999999]"
                  style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    right: isCollapsed ? '20px' : '380px',
                  }}
                  animate={{
                    right: isCollapsed ? 20 : 380,
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30,
                    duration: 0.4
                  }}
                >
                  {/* Container com glassmorphism */}
                  <motion.div
                    className="relative group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Background com glassmorphism - mais sutil */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-slate-50/90 to-white/80 backdrop-blur-lg rounded-xl border border-slate-200/60 shadow-lg"></div>
                    
                    {/* Glow effect sutil */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-slate-300/5 to-blue-400/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    
                    {/* Botão principal */}
                    <motion.button
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      className="relative w-10 h-8 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:bg-slate-100/50"
                      animate={{ 
                        backgroundColor: isCollapsed ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0.1)"
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Ícone com animação suave */}
                      <motion.div
                        animate={{ 
                          rotate: isCollapsed ? 180 : 0,
                          color: isCollapsed ? "rgb(59, 130, 246)" : "rgb(100, 116, 139)"
                        }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 25 
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </motion.div>
                    </motion.button>
                    
                    {/* Tooltip discreto */}
                    <motion.div
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-slate-700/90 text-white text-xs rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-[999999]"
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 0, y: -3 }}
                      whileHover={{ opacity: 1, y: 0 }}
                    >
                      {isCollapsed ? 'Expandir' : 'Recolher'}
                      <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-slate-700/90 rotate-45"></div>
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* LEFT COLUMN - Main Content with Table */}
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
                      onAction={handleReconciliationAction}
                      pagination={{
                        page: pagination.page,
                        limit: pagination.limit,
                        total: pagination.total,
                        onPageChange: (page: number) => setPagination(prev => ({ ...prev, page })),
                        onLimitChange: (limit: number) => setPagination(prev => ({ ...prev, limit, page: 1 }))
                      }}
                    />
                  </motion.div>
                </div>

                {/* Painel lateral refinado e elegante */}
                <motion.div 
                  className="flex-shrink-0 overflow-y-auto relative order-2 lg:order-2"
                  style={{ 
                    width: isCollapsed ? '60px' : '380px',
                    minWidth: isCollapsed ? '60px' : '380px',
                    maxWidth: isCollapsed ? '60px' : '380px',
                    zIndex: 1
                  }}
                  animate={{ 
                    width: isCollapsed ? 60 : 380 
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30 
                  }}
                >

                  {/* Background premium com gradiente sutil */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50/95 via-white/98 to-slate-50/95 backdrop-blur-md"></div>
                  
                  {/* Borda lateral com efeito glass */}
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-200/30 to-transparent shadow-sm"></div>
                  
                  {/* Sombra interna sutil */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-900/[0.02] to-transparent pointer-events-none"></div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                    className="relative p-6 space-y-6"
                  >

                    {/* Container dos filtros com design premium */}
                    <motion.div 
                      className="relative"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      {/* Container principal com glass effect */}
                      <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden">
                        {/* Highlight sutil no topo */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300/40 to-transparent"></div>
                        
                        {/* Conteúdo dos filtros */}
                        <div className="p-5">
                          {!isCollapsed && (
                            <ReconciliationFilters
                              filters={filters}
                              onFiltersChange={setFilters}
                              isLoading={isLoading}
                            />
                          )}
                          
                          {/* Estado colapsado com ícone elegante */}
                          {isCollapsed && (
                            <div className="flex flex-col items-center space-y-4 py-6">
                              <motion.div
                                className="w-10 h-10 bg-gradient-to-br from-blue-500/90 to-purple-600/90 rounded-xl flex items-center justify-center shadow-lg"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                              >
                                <FileText className="h-5 w-5 text-white" />
                              </motion.div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default ReconciliationModal;
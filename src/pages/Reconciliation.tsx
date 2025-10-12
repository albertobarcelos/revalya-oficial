// =====================================================
// RECONCILIATION PAGE
// Descrição: Página principal do sistema de conciliação - hub central de contas a receber
// =====================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Upload
} from 'lucide-react';

// Components
import ReconciliationFilters from '@/components/reconciliation/ReconciliationFilters';
import ReconciliationIndicators from '@/components/reconciliation/ReconciliationIndicators';
import ReconciliationTable from '@/components/reconciliation/ReconciliationTable';
import { LinkToContractModal } from '@/components/reconciliation/modals/LinkToContractModal';
import { Skeleton } from '@/components/ui/skeleton';

// Types
import { 
  ImportedMovement, 
  ReconciliationFilters as FilterType,
  ReconciliationStatus,
  ReconciliationSource,
  ReconciliationIndicators as IndicatorsType,
  ReconciliationAction
} from '@/types/reconciliation';

// Mock Data
import { 
  mockReconciliationMovements,
  generateMockIndicators,
  filterMockMovements
} from '@/data/mockReconciliationData';

// Hooks
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useAuditLogger } from '@/hooks/useAuditLogger';
import { useTenantLoading } from '@/hooks/useZustandTenant';

// =====================================================
// MAIN COMPONENT
// =====================================================

const ReconciliationPage: React.FC = () => {
  // AIDEV-NOTE: Proteção multi-tenant obrigatória para todas as páginas do sistema
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const { logAction } = useAuditLogger();
  const tenantLoading = useTenantLoading();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [movements, setMovements] = useState<ImportedMovement[]>(mockReconciliationMovements);
  
  // Filters state
  const [filters, setFilters] = useState<FilterType>({
    status: ReconciliationStatus.PENDING, // Default: Não conciliado
    source: 'ALL',
    hasContract: 'ALL',
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      end: new Date().toISOString()
    },
    search: ''
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Selection state for bulk import
  const [selectedMovements, setSelectedMovements] = useState<string[]>([]);
  
  // AIDEV-NOTE: Estado para modal de vincular contrato
  const [isLinkToContractModalOpen, setIsLinkToContractModalOpen] = useState(false);
  const [movementsToLink, setMovementsToLink] = useState<ImportedMovement[]>([]);

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  // Filter movements based on current filters
  const filteredMovements = useMemo(() => {
    return filterMockMovements(movements, {
      status: filters.status,
      source: filters.source === 'ALL' ? undefined : filters.source,
      hasContract: filters.hasContract,
      search: filters.search
    });
  }, [movements, filters]);

  // Paginated movements
  const paginatedMovements = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredMovements.slice(startIndex, endIndex);
  }, [filteredMovements, currentPage, itemsPerPage]);

  // Calculate indicators
  const indicators = useMemo(() => {
    return generateMockIndicators(movements);
  }, [movements]);

  // Total pages for pagination
  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);

  // =====================================================
  // EFFECTS
  // =====================================================

  useEffect(() => {
    // AIDEV-NOTE: Log de auditoria para acesso à página de conciliação
    logAction('USER_ACTION', {
      action: 'page_access',
      resource: 'reconciliation',
      filters: filters,
      totalMovements: movements.length
    });
  }, [logAction, filters, movements.length]);

  useEffect(() => {
    // Reset pagination when filters change
    setCurrentPage(1);
  }, [filters]);

  // AIDEV-NOTE: Validação de acesso - redireciona se não tiver permissão
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              {accessError || 'Você não tem permissão para acessar esta página.'}
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
    
    // Update URL params for better UX
    const params = new URLSearchParams();
    if (newFilters.status !== ReconciliationStatus.PENDING) {
      params.set('status', newFilters.status);
    }
    if (newFilters.source !== 'ALL') {
      params.set('source', newFilters.source);
    }
    if (newFilters.hasContract !== 'ALL') {
      params.set('contract', newFilters.hasContract);
    }
    if (newFilters.search) {
      params.set('search', newFilters.search);
    }
    
    setSearchParams(params);
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    
    try {
      // AIDEV-NOTE: Em produção, aqui seria feita a chamada real para a API
      // Simulando delay de requisição
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular atualização dos dados
      setMovements([...mockReconciliationMovements]);
      
      toast({
        title: "Dados atualizados",
        description: "As movimentações foram sincronizadas com sucesso.",
        variant: "default"
      });

      logAction('USER_ACTION', {
        action: 'data_refresh',
        resource: 'reconciliation',
        timestamp: new Date().toISOString(),
        movementsCount: movements.length
      });
      
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível sincronizar os dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportData = () => {
    // AIDEV-NOTE: Funcionalidade de exportação para CSV/Excel
    const csvData = filteredMovements.map(movement => ({
      'Origem': movement.source,
      'ID Externo': movement.externalId,
      'Cliente': movement.customerName,
      'Documento': movement.customerDocument,
      'Valor Cobrança': movement.chargeAmount || 'N/A',
      'Valor Pago': movement.paidAmount,
      'Diferença': movement.difference || 0,
      'Status': movement.reconciliationStatus,
      'Contrato': movement.contractId || 'Sem contrato',
      'Data Vencimento': movement.dueDate ? new Date(movement.dueDate).toLocaleDateString('pt-BR') : 'N/A',
      'Data Pagamento': movement.paymentDate ? new Date(movement.paymentDate).toLocaleDateString('pt-BR') : 'N/A',
      'Observações': movement.observations || ''
    }));

    // Simular download (em produção seria gerado arquivo real)
    console.log('Exportando dados:', csvData);
    
    toast({
      title: "Exportação iniciada",
      description: `Exportando ${filteredMovements.length} movimentações...`,
      variant: "default"
    });

    logAction('data_export', 'reconciliation', {
      recordsCount: filteredMovements.length,
      filters: filters
    });
  };

  // AIDEV-NOTE: Handler para seleção múltipla de movimentações
  const handleSelectionChange = (movementIds: string[]) => {
    setSelectedMovements(movementIds);
  };

  // AIDEV-NOTE: Handler para importação em lote para cobranças
  const handleBulkImportToCharges = async () => {
    if (selectedMovements.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione pelo menos uma movimentação para importar.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // AIDEV-NOTE: Em produção, aqui seria feita a chamada para a API de importação em lote
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular importação - marcar como importado
      setMovements(prev => prev.map(movement => {
        if (selectedMovements.includes(movement.id)) {
          return {
            ...movement,
            charge_id: `CHG-${Date.now()}-${movement.id.slice(-4)}`, // Simular ID da cobrança
            imported_at: new Date().toISOString(),
            reconciliationStatus: ReconciliationStatus.RECONCILED
          };
        }
        return movement;
      }));
      
      // Limpar seleção
      setSelectedMovements([]);
      
      toast({
        title: "Importação concluída",
        description: `${selectedMovements.length} movimentações foram importadas para cobranças com sucesso.`,
        variant: "default"
      });

      logAction('USER_ACTION', {
        action: 'bulk_import_to_charges',
        resource: 'reconciliation',
        movementIds: selectedMovements,
        count: selectedMovements.length
      });
      
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar as movimentações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // AIDEV-NOTE: Handler para confirmar vinculação de contrato
  const handleConfirmLinkToContract = useCallback(async (contractId: string, observations?: string) => {
    setIsLoading(true);
    
    try {
      // AIDEV-NOTE: Aplicar vinculação a todos os movimentos selecionados
      const updatePromises = movementsToLink.map(async (movement) => {
        return handleReconciliationAction(
          ReconciliationAction.LINK_TO_CONTRACT,
          movement,
          { contractId, observations }
        );
      });
      
      await Promise.all(updatePromises);
      
      // Limpar seleção após sucesso
      setSelectedMovements([]);
      
      toast({
        title: "Contratos vinculados com sucesso",
        description: `${movementsToLink.length} movimento(s) vinculado(s) ao contrato.`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Erro ao vincular contratos:', error);
      toast({
        title: "Erro na vinculação",
        description: "Não foi possível vincular os movimentos ao contrato.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [movementsToLink, handleReconciliationAction, toast]);

  const handleReconciliationAction = async (
    action: ReconciliationAction,
    movement: ImportedMovement,
    data?: { contractId?: string; chargeId?: string; [key: string]: unknown }
  ) => {
    // AIDEV-NOTE: Se for LINK_TO_CONTRACT e não tiver contractId, abrir modal para seleção
    if (action === ReconciliationAction.LINK_TO_CONTRACT && !data?.contractId) {
      // Verificar se é ação em lote (múltiplos movimentos selecionados)
      const selectedMovementsList = selectedMovements.map(id => 
        movements.find(m => m.id === id)
      ).filter(Boolean) as ImportedMovement[];
      
      if (selectedMovementsList.length > 0) {
        // Ação em lote - abrir modal com todos os movimentos selecionados
        setMovementsToLink(selectedMovementsList);
      } else {
        // Ação individual - abrir modal com apenas este movimento
        setMovementsToLink([movement]);
      }
      
      setIsLinkToContractModalOpen(true);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // AIDEV-NOTE: Em produção, aqui seria feita a chamada para a API de conciliação
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update movement status
      setMovements(prev => prev.map(mov => {
        if (mov.id === movement.id) {
          const updatedMovement = { ...mov };
          
          switch (action) {
            case ReconciliationAction.LINK_TO_CONTRACT:
              updatedMovement.reconciliationStatus = ReconciliationStatus.RECONCILED;
              updatedMovement.reconciledAt = new Date().toISOString();
              updatedMovement.reconciledBy = 'admin@revalya.com'; // Em produção seria o usuário atual
              updatedMovement.contractId = data?.contractId;
              updatedMovement.hasContract = true;
              break;
              
            case ReconciliationAction.CREATE_STANDALONE_CHARGE:
              updatedMovement.reconciliationStatus = ReconciliationStatus.RECONCILED;
              updatedMovement.reconciledAt = new Date().toISOString();
              updatedMovement.reconciledBy = 'admin@revalya.com';
              updatedMovement.chargeId = `CHG-${Date.now()}`;
              break;
              
            case ReconciliationAction.COMPLEMENT_EXISTING_CHARGE:
              updatedMovement.reconciliationStatus = ReconciliationStatus.RECONCILED;
              updatedMovement.reconciledAt = new Date().toISOString();
              updatedMovement.reconciledBy = 'admin@revalya.com';
              break;
              
            case ReconciliationAction.DELETE_IMPORTED_ITEM:
              // Em produção, o item seria removido da lista
              return null;
          }
          
          return updatedMovement;
        }
        return mov;
      }).filter(Boolean) as ImportedMovement[]);
      
      const actionLabels = {
        [ReconciliationAction.LINK_TO_CONTRACT]: 'vinculado ao contrato',
        [ReconciliationAction.CREATE_STANDALONE_CHARGE]: 'criado como cobrança avulsa',
        [ReconciliationAction.COMPLEMENT_EXISTING_CHARGE]: 'complementado na cobrança existente',
        [ReconciliationAction.DELETE_IMPORTED_ITEM]: 'removido da lista'
      };
      
      toast({
        title: "Ação executada com sucesso",
        description: `Item ${actionLabels[action]}.`,
        variant: "default"
      });

      logAction('reconciliation_action', 'reconciliation', {
        movementId: movement.id,
        action,
        data,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      toast({
        title: "Erro na conciliação",
        description: "Não foi possível executar a ação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // LOADING STATES
  // =====================================================

  if (tenantLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-9 w-20" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Indicators Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-2 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-0">
            <div className="p-4 space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 pb-2 border-b">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              
              {/* Table Rows */}
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="grid grid-cols-6 gap-4 py-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Conciliação</h1>
            <p className="text-muted-foreground">
              Hub central de contas a receber - Gerencie todas as movimentações importadas
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            disabled={filteredMovements.length === 0}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReconciliationFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </CardContent>
      </Card>

      {/* Quick Indicators */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Indicadores Rápidos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReconciliationIndicators
            indicators={indicators}
            isLoading={isRefreshing}
          />
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center space-x-1">
            <span>{filteredMovements.length}</span>
            <span>movimentações encontradas</span>
          </Badge>
          
          {selectedMovements.length > 0 && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>{selectedMovements.length}</span>
              <span>selecionadas</span>
            </Badge>
          )}
          
          {filters.status === ReconciliationStatus.PENDING && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Aguardando conciliação</span>
            </Badge>
          )}
          
          {filters.status === ReconciliationStatus.RECONCILED && (
            <Badge variant="default" className="flex items-center space-x-1 bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3" />
              <span>Conciliadas</span>
            </Badge>
          )}
          
          {filters.status === ReconciliationStatus.DIVERGENT && (
            <Badge variant="destructive" className="flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Com divergências</span>
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {selectedMovements.length > 0 && (
            <Button
              onClick={handleBulkImportToCharges}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Importar para Cobranças</span>
            </Button>
          )}

          {filteredMovements.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <Card className="flex-1 min-h-0">
        <CardContent className="p-0 h-full">
          <ReconciliationTable
            movements={paginatedMovements}
            isLoading={isLoading || isRefreshing}
            onAction={handleReconciliationAction}
            selectedMovements={selectedMovements}
            onSelectionChange={handleSelectionChange}
            pagination={{
              page: currentPage,
              limit: itemsPerPage,
              total: filteredMovements.length,
              onPageChange: setCurrentPage,
              onLimitChange: (limit: number) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground border-t pt-4 flex-shrink-0">
        <p>
          💡 <strong>Importante:</strong> Nada entra no financeiro sem passar por esta tela de conciliação.
          Uma vez conciliado, o item permanece no histórico para auditoria.
        </p>
      </div>

      {/* AIDEV-NOTE: Modal para vincular contratos */}
      <LinkToContractModal
        isOpen={isLinkToContractModalOpen}
        onClose={() => setIsLinkToContractModalOpen(false)}
        selectedMovements={movementsToLink}
        onConfirm={handleConfirmLinkToContract}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ReconciliationPage;
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
  TrendingUp
} from 'lucide-react';

// Components
import ReconciliationFilters from '@/components/reconciliation/ReconciliationFilters';
import ReconciliationIndicators from '@/components/reconciliation/ReconciliationIndicators';
import ReconciliationTable from '@/components/reconciliation/ReconciliationTable';

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
  }, []);

  useEffect(() => {
    // Reset pagination when filters change
    setCurrentPage(1);
  }, [filters]);

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

  const handleReconciliationAction = async (
    movementId: string, 
    action: ReconciliationAction,
    data?: any
  ) => {
    setIsLoading(true);
    
    try {
      // AIDEV-NOTE: Em produção, aqui seria feita a chamada para a API de conciliação
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update movement status
      setMovements(prev => prev.map(movement => {
        if (movement.id === movementId) {
          const updatedMovement = { ...movement };
          
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
        return movement;
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
        movementId,
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
      <Card>
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
      <Card>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center space-x-1">
            <span>{filteredMovements.length}</span>
            <span>movimentações encontradas</span>
          </Badge>
          
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

        {filteredMovements.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </div>
        )}
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          <ReconciliationTable
            movements={paginatedMovements}
            isLoading={isLoading || isRefreshing}
            onAction={handleReconciliationAction}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredMovements.length}
          />
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground border-t pt-4">
        <p>
          💡 <strong>Importante:</strong> Nada entra no financeiro sem passar por esta tela de conciliação.
          Uma vez conciliado, o item permanece no histórico para auditoria.
        </p>
      </div>
    </div>
  );
};

export default ReconciliationPage;
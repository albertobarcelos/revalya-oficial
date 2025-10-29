// =====================================================
// RECONCILIATION FILTERS COMPONENT - MINIMALISTA
// Descrição: Componente de filtros com design extremamente minimalista e cores sólidas
// Design: Minimalista, header fino, alinhamento à direita
// =====================================================

import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ReconciliationFilters as IReconciliationFilters, 
  ReconciliationFiltersProps,
  ReconciliationSource,
  ReconciliationStatus 
} from '@/types/reconciliation';

// AIDEV-NOTE: Componente de filtros redesenhado com foco em minimalismo extremo
// Header fino, cores sólidas, sem gradientes ou efeitos complexos, alinhamento à direita

const ReconciliationFilters: React.FC<ReconciliationFiltersProps> = ({
  filters,
  onFiltersChange,
  loading = false
}) => {
  // =====================================================
  // HANDLERS
  // =====================================================

  const handleFilterChange = (key: keyof IReconciliationFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  // AIDEV-NOTE: Função para limpar filtros com valores padrão bem definidos - Ajustado para mostrar todos os registros
  const clearFilters = () => {
    const defaultFilters: IReconciliationFilters = {
      status: 'ALL' as any, // Mudança: era PENDING, agora ALL para mostrar todos os registros
      source: 'ALL',
      hasContract: 'ALL',
      dateFrom: '', // Mudança: removido filtro de data padrão
      dateTo: '', // Mudança: removido filtro de data padrão
      search: '',
      accountFilter: '',
      asaasNossoNumero: '',
      asaasBillingType: 'ALL',
      asaasPaymentStatus: 'ALL',
      // AIDEV-NOTE: Novos filtros com valores padrão
      paymentMethod: 'ALL',
      customerDocument: '',
      valorOriginalMin: undefined,
      valorOriginalMax: undefined,
      statusAnterior: 'ALL',
      deletedFlag: 'ALL',
      anticipatedFlag: 'ALL',
      processed: 'ALL',
      reconciled: 'ALL',
      hasProcessingError: 'ALL',
      installmentNumber: undefined,
      externalReference: ''
    };
    
    onFiltersChange(defaultFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status !== ReconciliationStatus.PENDING) count++;
    if (filters.source !== 'ALL') count++;
    if (filters.hasContract !== 'ALL') count++;
    if (filters.search && filters.search.trim()) count++;
    if (filters.accountFilter && filters.accountFilter.trim()) count++;
    
    // AIDEV-NOTE: Contabilizar filtros específicos ASAAS
    if (filters.asaasNossoNumero && filters.asaasNossoNumero.trim()) count++;
    if (filters.asaasBillingType && filters.asaasBillingType !== 'ALL') count++;
    if (filters.asaasPaymentStatus && filters.asaasPaymentStatus !== 'ALL') count++;
    
    // AIDEV-NOTE: Contabilizar novos filtros
    if (filters.paymentMethod && filters.paymentMethod !== 'ALL') count++;
    if (filters.customerDocument && filters.customerDocument.trim()) count++;
    if (filters.valorOriginalMin !== undefined) count++;
    if (filters.valorOriginalMax !== undefined) count++;
    if (filters.statusAnterior && filters.statusAnterior !== 'ALL') count++;
    if (filters.deletedFlag !== 'ALL') count++;
    if (filters.anticipatedFlag !== 'ALL') count++;
    if (filters.processed !== 'ALL') count++;
    if (filters.reconciled !== 'ALL') count++;
    if (filters.hasProcessingError !== 'ALL') count++;
    if (filters.installmentNumber !== undefined) count++;
    if (filters.externalReference && filters.externalReference.trim()) count++;
    
    return count;
  };

  // =====================================================
  // LOADING STATE - AIDEV-NOTE: Estado de loading robusto com skeleton
  // =====================================================

  if (loading) {
    return (
      <div className="bg-white border-b border-gray-200">
        {/* Header Loading */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
        
        {/* Filters Loading */}
        <div className="px-6 pb-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            {[1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="flex items-center gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER - Design Extremamente Minimalista
  // =====================================================

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Header Fino e Minimalista */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
          {getActiveFiltersCount() > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {getActiveFiltersCount()}
            </span>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          disabled={loading}
          className="text-gray-500 hover:text-gray-700 h-8 px-3 text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Limpar
        </Button>
      </div>
      
      {/* Filtros Alinhados à Direita - Design Minimalista */}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Status:</span>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
              disabled={loading}
            >
              <SelectTrigger className="h-8 w-32 text-xs border-gray-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ReconciliationStatus.PENDING}>Pendente</SelectItem>
                <SelectItem value={ReconciliationStatus.RECONCILED}>Conciliado</SelectItem>
                <SelectItem value={ReconciliationStatus.DIVERGENT}>Divergente</SelectItem>
                <SelectItem value="ALL">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Origem:</span>
            <Select
              value={filters.source}
              onValueChange={(value) => handleFilterChange('source', value)}
              disabled={loading}
            >
              <SelectTrigger className="h-8 w-32 text-xs border-gray-300">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value={ReconciliationSource.BANK}>Banco</SelectItem>
                <SelectItem value={ReconciliationSource.MANUAL}>Manual</SelectItem>
                <SelectItem value={ReconciliationSource.API}>API</SelectItem>
                <SelectItem value={ReconciliationSource.ASAAS}>ASAAS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contract Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Contrato:</span>
            <Select
              value={filters.hasContract}
              onValueChange={(value) => handleFilterChange('hasContract', value)}
              disabled={loading}
            >
              <SelectTrigger className="h-8 w-32 text-xs border-gray-300">
                <SelectValue placeholder="Contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="WITH_CONTRACT">Com Contrato</SelectItem>
                <SelectItem value="WITHOUT_CONTRACT">Sem Contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">De:</span>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              disabled={loading}
              className="h-8 w-32 text-xs border-gray-300"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Até:</span>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              disabled={loading}
              className="h-8 w-32 text-xs border-gray-300"
            />
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Buscar:</span>
            <Input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              disabled={loading}
              className="h-8 w-40 text-xs border-gray-300"
              placeholder="Buscar movimentações..."
            />
          </div>

          {/* Account Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Conta:</span>
            <Input
              type="text"
              value={filters.accountFilter || ''}
              onChange={(e) => handleFilterChange('accountFilter', e.target.value)}
              disabled={loading}
              className="h-8 w-32 text-xs border-gray-300"
              placeholder="Filtrar conta"
            />
          </div>

          {/* AIDEV-NOTE: Filtros específicos ASAAS - aparecem apenas quando ASAAS está selecionado */}
          {filters.source === ReconciliationSource.ASAAS && (
            <>
              {/* Observações Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600">Observações:</span>
                <Input
                  type="text"
                  value={filters.asaasNossoNumero || ''}
                  onChange={(e) => handleFilterChange('asaasNossoNumero', e.target.value)}
                  disabled={loading}
                  className="h-8 w-32 text-xs border-blue-300 focus:border-blue-500"
                  placeholder="Observações"
                />
              </div>

              {/* Tipo de Cobrança Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600">Tipo:</span>
                <Select
                  value={filters.asaasBillingType || 'ALL'}
                  onValueChange={(value) => handleFilterChange('asaasBillingType', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-8 w-32 text-xs border-blue-300 focus:border-blue-500">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="UNDEFINED">Indefinido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status de Pagamento ASAAS */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600">Status ASAAS:</span>
                <Select
                  value={filters.asaasPaymentStatus || 'ALL'}
                  onValueChange={(value) => handleFilterChange('asaasPaymentStatus', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-8 w-32 text-xs border-blue-300 focus:border-blue-500">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="RECEIVED">Recebido</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                    <SelectItem value="OVERDUE">Vencido</SelectItem>
                    <SelectItem value="REFUNDED">Estornado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* AIDEV-NOTE: Novos filtros avançados - seção expansível */}
          <div className="w-full border-t border-gray-200 pt-3 mt-3">
            <div className="flex flex-wrap items-center justify-end gap-3">
              
              {/* Método de Pagamento */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Método:</span>
                <Select
                  value={filters.paymentMethod || 'ALL'}
                  onValueChange={(value) => handleFilterChange('paymentMethod', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-8 w-32 text-xs border-gray-300">
                    <SelectValue placeholder="Método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão</SelectItem>
                    <SelectItem value="DEBIT_CARD">Débito</SelectItem>
                    <SelectItem value="TRANSFER">Transferência</SelectItem>
                    <SelectItem value="UNDEFINED">Indefinido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Documento do Cliente */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">CPF/CNPJ:</span>
                <Input
                  type="text"
                  value={filters.customerDocument || ''}
                  onChange={(e) => handleFilterChange('customerDocument', e.target.value)}
                  disabled={loading}
                  className="h-8 w-32 text-xs border-gray-300"
                  placeholder="000.000.000-00"
                />
              </div>

              {/* Valor Original - Mínimo */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Valor Min:</span>
                <Input
                  type="number"
                  value={filters.valorOriginalMin || ''}
                  onChange={(e) => handleFilterChange('valorOriginalMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={loading}
                  className="h-8 w-24 text-xs border-gray-300"
                  placeholder="0,00"
                  step="0.01"
                />
              </div>

              {/* Valor Original - Máximo */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Valor Max:</span>
                <Input
                  type="number"
                  value={filters.valorOriginalMax || ''}
                  onChange={(e) => handleFilterChange('valorOriginalMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={loading}
                  className="h-8 w-24 text-xs border-gray-300"
                  placeholder="0,00"
                  step="0.01"
                />
              </div>

              {/* Status Processamento */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Processado:</span>
                <Select
                  value={filters.processed || 'ALL'}
                  onValueChange={(value) => handleFilterChange('processed', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-8 w-28 text-xs border-gray-300">
                    <SelectValue placeholder="Processado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="true">Processados</SelectItem>
                    <SelectItem value="false">Não Processados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Conciliação */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Conciliado:</span>
                <Select
                  value={filters.reconciled || 'ALL'}
                  onValueChange={(value) => handleFilterChange('reconciled', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-8 w-28 text-xs border-gray-300">
                    <SelectValue placeholder="Conciliado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="true">Conciliados</SelectItem>
                    <SelectItem value="false">Não Conciliados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Número da Parcela */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Parcela:</span>
                <Input
                  type="number"
                  value={filters.installmentNumber || ''}
                  onChange={(e) => handleFilterChange('installmentNumber', e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={loading}
                  className="h-8 w-20 text-xs border-gray-300"
                  placeholder="1"
                  min="1"
                />
              </div>

              {/* Referência Externa */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Ref. Externa:</span>
                <Input
                  type="text"
                  value={filters.externalReference || ''}
                  onChange={(e) => handleFilterChange('externalReference', e.target.value)}
                  disabled={loading}
                  className="h-8 w-32 text-xs border-gray-300"
                  placeholder="Referência"
                />
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationFilters;
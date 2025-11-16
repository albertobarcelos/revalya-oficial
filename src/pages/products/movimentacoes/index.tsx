/**
 * Página de Movimentações de Estoque
 * 
 * AIDEV-NOTE: Página completa para gerenciar movimentações de estoque
 * com tabs, filtros, tabela, gráfico e estatísticas conforme especificado no plano
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ArrowUpDown, RefreshCw, X, ArrowDown, ArrowUp, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/layout/Layout';
import { useStockMovements } from '@/hooks/useStockMovements';
import { useStorageLocations } from '@/hooks/useStorageLocations';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { ProductSearchInput } from '@/components/products/ProductSearchInput';
import { StockMovementsTable } from '@/components/products/StockMovementsTable';
import { StockForecastChart } from '@/components/products/StockForecastChart';
import { CreateStockMovementDialog } from '@/components/products/CreateStockMovementDialog';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatStockQuantity } from '@/utils/stockUtils';

export default function StockMovementsPage() {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const { toast } = useToast();

  // Estados de filtros
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedMovementType, setSelectedMovementType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current-month');
  const [sortColumn, setSortColumn] = useState<string>('movement_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Calcular período baseado na seleção
  const periodDates = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    
    if (selectedPeriod === 'current-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd')
      };
    } else if (selectedPeriod === 'last-month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd')
      };
    } else if (selectedPeriod.startsWith('month-')) {
      const [year, month] = selectedPeriod.replace('month-', '').split('-');
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      return {
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd')
      };
    }
    
    return {
      start_date: undefined,
      end_date: undefined
    };
  }, [selectedPeriod]);

  // Hook para buscar movimentações
  const {
    movements,
    isLoading,
    error,
    refetch,
    deleteMovement,
    isDeleting
  } = useStockMovements({
    product_id: selectedProductId || undefined,
    storage_location_id: selectedLocationId || undefined,
    movement_type: selectedMovementType !== 'all' ? selectedMovementType as any : undefined,
    start_date: periodDates.start_date,
    end_date: periodDates.end_date
  });

  // Hook para buscar locais de estoque
  const { locations } = useStorageLocations({ is_active: true });

  // Gerar opções de período (últimos 12 meses)
  const periodOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    
    // Mês atual
    options.push({
      value: 'current-month',
      label: format(now, 'MMMM de yyyy', { locale: ptBR })
    });
    
    // Mês anterior
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    options.push({
      value: 'last-month',
      label: format(lastMonth, 'MMMM de yyyy', { locale: ptBR })
    });
    
    // Últimos 10 meses
    for (let i = 2; i <= 11; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: `month-${format(month, 'yyyy-MM')}`,
        label: format(month, 'MMMM de yyyy', { locale: ptBR })
      });
    }
    
    return options;
  }, []);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // AIDEV-NOTE: Separar movimentos reais (passado/hoje) de previsões (futuro)
    const realMovements = movements.filter(m => {
      const movementDate = new Date(m.movement_date);
      movementDate.setHours(0, 0, 0, 0);
      return movementDate <= today;
    });
    
    const forecastMovements = movements.filter(m => {
      const movementDate = new Date(m.movement_date);
      movementDate.setHours(0, 0, 0, 0);
      return movementDate > today;
    });
    
    // Previsão de saída: apenas movimentos futuros de SAIDA
    const outboundForecast = forecastMovements
      .filter(m => m.movement_type === 'SAIDA')
      .reduce((sum, m) => sum + m.quantity, 0);
    
    // Previsão de entrada: apenas movimentos futuros de ENTRADA
    const inboundForecast = forecastMovements
      .filter(m => m.movement_type === 'ENTRADA')
      .reduce((sum, m) => sum + m.quantity, 0);
    
    // Estoque disponível: usar o último accumulated_balance dos movimentos reais (passado/hoje)
    // Se não houver movimentos reais, usar o último de todos os movimentos
    const available = realMovements.length > 0
      ? realMovements[realMovements.length - 1]?.accumulated_balance || 0
      : movements.length > 0
      ? movements[movements.length - 1]?.accumulated_balance || 0
      : 0;
    
    const unit = movements[0]?.product?.unit_of_measure || 'UN';
    
    return {
      outboundForecast,
      inboundForecast,
      availableStock: available,
      unit
    };
  }, [movements]);

  // Dados para o gráfico
  const chartData = useMemo(() => {
    // Agrupar por data e calcular previsão e disponível
    const grouped = movements.reduce((acc, movement) => {
      const date = format(new Date(movement.movement_date), 'dd/MM');
      if (!acc[date]) {
        acc[date] = { date, previsao: 0, disponivel: 0 };
      }
      
      if (movement.movement_type === 'ENTRADA') {
        acc[date].previsao += movement.quantity;
      } else if (movement.movement_type === 'SAIDA') {
        acc[date].previsao -= movement.quantity;
      }
      
      acc[date].disponivel = movement.accumulated_balance;
      
      return acc;
    }, {} as Record<string, { date: string; previsao: number; disponivel: number }>);
    
    return Object.values(grouped).sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });
  }, [movements]);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  }, [sortColumn, sortDirection]);

  const handleDelete = useCallback((movementId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta movimentação?')) {
      deleteMovement(movementId, {
        onSuccess: () => {
          toast({
            title: 'Sucesso',
            description: 'Movimentação excluída com sucesso!',
          });
          refetch();
        },
        onError: (error: any) => {
          toast({
            title: 'Erro',
            description: error?.message || 'Erro ao excluir movimentação',
            variant: 'destructive',
          });
        }
      } as any);
    }
  }, [deleteMovement, toast, refetch]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCreateSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    setSelectedProductId(null);
    setSelectedLocationId(null);
    setSelectedMovementType('all');
    setSelectedPeriod('current-month');
  }, []);

  if (!hasAccess) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Acesso negado</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 space-y-4 p-2 md:p-6 pt-4 md:pt-6">
        {/* AIDEV-NOTE: Abas no topo com design moderno */}
        <Tabs defaultValue="estoque" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="compras-estoque-producao" className="text-body font-medium">
                Compras, Estoque e Produção
              </TabsTrigger>
              <TabsTrigger value="estoque" className="text-body font-medium">
                Estoque
              </TabsTrigger>
            </TabsList>
            
            {/* Botão de ação no topo */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-9"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white h-9"
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Novo Movimento
              </Button>
            </div>
          </div>

            <TabsContent value="estoque" className="space-y-6 mt-6">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="product">Produto</Label>
                  <ProductSearchInput
                    value={selectedProductId || undefined}
                    onValueChange={(productId, product) => setSelectedProductId(productId || null)}
                    placeholder="Selecione o produto"
                    height="default"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storage_location">Local de Estoque</Label>
                  <Select
                    value={selectedLocationId || 'all'}
                    onValueChange={(value) => setSelectedLocationId(value === 'all' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os locais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Locais de Estoque</SelectItem>
                      {locations.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="movement_type">Tipo de Movimento</Label>
                  <Select
                    value={selectedMovementType}
                    onValueChange={setSelectedMovementType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos de Movimento</SelectItem>
                      <SelectItem value="ENTRADA">Entrada</SelectItem>
                      <SelectItem value="SAIDA">Saída</SelectItem>
                      <SelectItem value="AJUSTE">Ajuste</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Período</Label>
                  <Select
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar Filtros
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              {/* Tabela de movimentações */}
              <StockMovementsTable
                movements={movements}
                isLoading={isLoading}
                error={error}
                onDelete={handleDelete}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />

              {/* Gráfico e Estatísticas Integrados - Componente Único */}
              <div className="w-full bg-white rounded-lg border p-4">
                <div className="flex gap-4">
                  {/* Gráfico à esquerda (menor) */}
                  <div className="flex-1 min-w-0">
                    <StockForecastChart data={chartData} height={400} />
                  </div>
                  
                  {/* Cards empilhados à direita */}
                  <div className="flex flex-col gap-3 w-[240px] flex-shrink-0">
                    {/* Previsão de Saída */}
                    <div className="bg-white rounded-lg border shadow-sm p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-small font-medium text-muted-foreground mb-1">
                            Previsão de Saída
                          </p>
                          <p className="text-heading-3 font-bold">
                            {formatStockQuantity(stats.outboundForecast, stats.unit)}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 ml-2">
                          <ArrowDown className="h-4 w-4 text-red-600" />
                        </div>
                      </div>
                    </div>

                    {/* Previsão de Entrada */}
                    <div className="bg-white rounded-lg border shadow-sm p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-small font-medium text-muted-foreground mb-1">
                            Previsão de Entrada
                          </p>
                          <p className="text-heading-3 font-bold">
                            {formatStockQuantity(stats.inboundForecast, stats.unit)}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 ml-2">
                          <ArrowUp className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                    </div>

                    {/* Estoque disponível até o momento */}
                    <div className="bg-white rounded-lg border-2 border-blue-500 shadow-sm p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-small font-medium text-muted-foreground mb-1">
                            Estoque disponível até o momento
                          </p>
                          <p className="text-heading-1 font-bold text-blue-600">
                            {formatStockQuantity(stats.availableStock, stats.unit)}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                          <Package className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="compras-estoque-producao" className="space-y-6 mt-6">
              <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg border border-dashed">
                <p className="text-muted-foreground text-heading-3">Em desenvolvimento</p>
              </div>
            </TabsContent>
          </Tabs>

        {/* Modal de criação */}
        <CreateStockMovementDialog
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
          initialProductId={selectedProductId || undefined}
        />
      </div>
    </Layout>
  );
}


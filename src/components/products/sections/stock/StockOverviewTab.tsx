/**
 * Sub-aba: Estoque
 * 
 * AIDEV-NOTE: Exibe resumo e tabela detalhada de estoque por local
 * Permite edição inline do estoque mínimo
 */

import { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Info } from 'lucide-react';
import type { ProductStockByLocation } from '@/hooks/useProductStock';
import { formatCMC } from '@/utils/stockUtils';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface StockOverviewTabProps {
  productId: string | null;
  isLoading: boolean;
  error: Error | string | null | undefined;
  stock: ProductStockByLocation[];
  updateStock: (productId: string, locationId: string, stockData: { min_stock?: number }) => Promise<any>;
}

// AIDEV-NOTE: Componente interno para evitar chamada duplicada de useProductStock
// A função updateStock é recebida como prop do componente pai
function StockOverviewTabComponent({ productId, isLoading, error, stock, updateStock }: StockOverviewTabProps) {
  const { toast } = useToast();
  
  // AIDEV-NOTE: Estado para controlar edição inline do estoque mínimo
  const [editingMinStock, setEditingMinStock] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // AIDEV-NOTE: Focar no input quando entrar em modo de edição
  useEffect(() => {
    if (editingMinStock && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingMinStock]);
  
  // AIDEV-NOTE: Iniciar edição do estoque mínimo
  const handleStartEdit = useCallback((itemId: string, currentValue: number) => {
    setEditingMinStock(itemId);
    setEditingValue(currentValue.toString());
  }, []);
  
  // AIDEV-NOTE: Salvar estoque mínimo (chamado ao perder foco)
  const handleSaveMinStock = useCallback(async (item: ProductStockByLocation) => {
    if (!productId || !item.storage_location_id) {
      setEditingMinStock(null);
      setEditingValue('');
      return;
    }
    
    const newValue = parseFloat(editingValue);
    if (isNaN(newValue) || newValue < 0) {
      // AIDEV-NOTE: Se valor inválido, restaurar valor original
      setEditingMinStock(null);
      setEditingValue('');
      toast({
        title: 'Valor inválido',
        description: 'O estoque mínimo deve ser um número maior ou igual a zero',
        variant: 'destructive',
      });
      return;
    }
    
    // AIDEV-NOTE: Verificar se o valor realmente mudou
    if (newValue === (item.min_stock || 0)) {
      setEditingMinStock(null);
      setEditingValue('');
      return;
    }
    
    setIsSaving(true);
    try {
      await updateStock(item.product_id, item.storage_location_id, {
        min_stock: newValue,
      });
      
      setEditingMinStock(null);
      setEditingValue('');
    } catch (error) {
      console.error('Erro ao atualizar estoque mínimo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o estoque mínimo',
        variant: 'destructive',
      });
      // AIDEV-NOTE: Manter em modo de edição em caso de erro para o usuário tentar novamente
    } finally {
      setIsSaving(false);
    }
  }, [editingValue, productId, updateStock, toast]);
  
  // AIDEV-NOTE: Calcular totais e estatísticas
  const stats = useMemo(() => {
    if (!stock || stock.length === 0) {
      return {
        totalAvailable: 0,
        totalCMC: 0,
        totalMinStock: 0,
        locationsCount: 0,
      };
    }

    return stock.reduce(
      (acc, item) => ({
        totalAvailable: acc.totalAvailable + (item.available_stock || 0),
        totalCMC: acc.totalCMC + (item.total_cmc || 0),
        totalMinStock: acc.totalMinStock + (item.min_stock || 0),
        locationsCount: acc.locationsCount + 1,
      }),
      { totalAvailable: 0, totalCMC: 0, totalMinStock: 0, locationsCount: 0 }
    );
  }, [stock]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Cards de resumo - Loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Tabela - Loading */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableHead key={index}>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 5 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div className="space-y-2">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <p className="text-sm text-destructive">
            Erro ao carregar estoque: {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </div>
    );
  }

  if (!stock || stock.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div className="space-y-2">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum estoque registrado para este produto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div>
        <h4 className="text-sm font-medium mb-4">
          Abaixo um resumo das informações de estoque deste produto
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Estoque Total</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalAvailable.toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Valor Total (CMC)</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCMC(stats.totalCMC)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Estoque Mínimo</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.totalMinStock.toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Locais de Estoque</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.locationsCount}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Instrução sobre Estoque Mínimo */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md border">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Clique diretamente em qualquer célula desta coluna para atualizar o estoque mínimo de cada local de estoque.
        </p>
      </div>

      {/* Tabela Detalhada */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Local de Estoque</TableHead>
              <TableHead className="text-right">Estoque Disponível</TableHead>
              <TableHead className="text-right">CMC Unitário</TableHead>
              <TableHead className="text-right">CMC Total</TableHead>
              <TableHead className="text-right">Estoque Mínimo</TableHead>
              <TableHead className="text-right">Previsão de Entrada</TableHead>
              <TableHead className="text-right">Previsão de Saída</TableHead>
              <TableHead>Tipo de Local de Estoque</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.map((item: ProductStockByLocation) => {
              const isLowStock = (item.available_stock || 0) < (item.min_stock || 0);
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.storage_location?.name || 'Local não encontrado'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      isLowStock 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' 
                        : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                    }`}>
                      {item.available_stock?.toLocaleString('pt-BR') || '0'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCMC(item.unit_cmc || 0)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCMC(item.total_cmc || 0)}
                  </TableCell>
                  <TableCell 
                    className="text-right"
                    onClick={() => {
                      if (editingMinStock !== item.id) {
                        handleStartEdit(item.id, item.min_stock || 0);
                      }
                    }}
                  >
                    <div className="flex justify-end items-center">
                      {editingMinStock === item.id ? (
                        <Input
                          ref={inputRef}
                          type="number"
                          min="0"
                          step="1"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveMinStock(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur(); // AIDEV-NOTE: Trigger blur para salvar
                            } else if (e.key === 'Escape') {
                              setEditingMinStock(null);
                              setEditingValue('');
                            }
                          }}
                          className="w-12 h-8 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          disabled={isSaving}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className={cn(
                          "inline-block px-1 py-1 rounded cursor-pointer w-12 text-right",
                          "hover:bg-muted/50 transition-colors"
                        )}>
                          {item.min_stock?.toLocaleString('pt-BR') || '0'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    0
                  </TableCell>
                  <TableCell className="text-right">
                    0
                  </TableCell>
                  <TableCell>
                    Estoque próprio da empresa
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Linha de totais */}
            <TableRow className="bg-muted/50 font-medium">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">
                {stats.totalAvailable.toLocaleString('pt-BR')}
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">
                {formatCMC(stats.totalCMC)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <span className="w-12 text-right">
                    {stats.totalMinStock.toLocaleString('pt-BR')}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// AIDEV-NOTE: Memoizar componente para evitar re-renders desnecessários quando a aba muda de foco
// Comparar apenas props relevantes para otimizar performance
// AIDEV-NOTE: Não comparar updateStock (função) pois pode mudar a cada render sem afetar a UI
export const StockOverviewTab = memo(StockOverviewTabComponent, (prevProps, nextProps) => {
  // AIDEV-NOTE: Só re-renderizar se as props relevantes mudarem
  // Retornar true = props são iguais = NÃO re-renderizar
  // Retornar false = props são diferentes = re-renderizar
  // AIDEV-NOTE: Comparar stock por referência e comprimento para evitar re-renders desnecessários
  const stockChanged = prevProps.stock.length !== nextProps.stock.length ||
    prevProps.stock.some((item, index) => item.id !== nextProps.stock[index]?.id);
  
  return (
    prevProps.productId === nextProps.productId &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.error === nextProps.error &&
    !stockChanged
  );
});


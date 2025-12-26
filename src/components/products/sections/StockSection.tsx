/**
 * Seção: Estoque
 * 
 * AIDEV-NOTE: Componente principal com sub-abas para:
 * - Estoque (visão geral com cards de resumo e tabela)
 * - Histórico de Compra (movimentações ENTRADA)
 * - Histórico de Venda (movimentações SAIDA)
 */

import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useProductStock } from '@/hooks/useProductStock';
import { StockOverviewTab } from './stock/StockOverviewTab';
import { PurchaseHistoryTab } from './stock/PurchaseHistoryTab';
import { SaleHistoryTab } from './stock/SaleHistoryTab';
import type { FormSectionProps } from '../types/product-form.types';

function StockSectionComponent({
  formData,
  isEditMode,
  product,
  onLoadingChange,
}: FormSectionProps) {
  // AIDEV-NOTE: Buscar estoque apenas se estiver em modo de edição e tiver product_id
  // Usar product.id diretamente ao invés de formData.id (formData não tem id)
  // AIDEV-NOTE: Estabilizar productId com useMemo para evitar re-renders desnecessários
  const productId = useMemo(() => {
    return isEditMode && product?.id ? product.id : null;
  }, [isEditMode, product?.id]);
  
  const [activeTab, setActiveTab] = useState('overview');
  
  const {
    stock,
    isLoading,
    error,
    refetch: refetchStock,
    updateStock,
  } = useProductStock(productId ? { product_id: productId, limit: 100 } : undefined);
  
  // AIDEV-NOTE: Notificar mudanças no estado de loading para o componente pai
  // AIDEV-NOTE: Usar ref para evitar re-renders desnecessários
  const onLoadingChangeRef = useRef(onLoadingChange);
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
  }, [onLoadingChange]);
  
  useEffect(() => {
    onLoadingChangeRef.current?.(isLoading);
  }, [isLoading]);
  
  // AIDEV-NOTE: Removido refetch manual - o React Query já faz isso automaticamente
  // com refetchOnMount: false para evitar múltiplas requisições

  if (!isEditMode) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div className="space-y-2">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Salve o produto primeiro para visualizar o estoque por local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Estoque</TabsTrigger>
          <TabsTrigger value="purchases">Histórico de Compra</TabsTrigger>
          <TabsTrigger value="sales">Histórico de Venda</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          <StockOverviewTab
            productId={productId}
            isLoading={isLoading}
            error={error}
            stock={stock || []}
            updateStock={updateStock}
          />
        </TabsContent>
        
        <TabsContent value="purchases" className="mt-4">
          <PurchaseHistoryTab productId={productId} />
        </TabsContent>
        
        <TabsContent value="sales" className="mt-4">
          <SaleHistoryTab productId={productId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// AIDEV-NOTE: Usar React.memo para evitar remontagens desnecessárias
// Comparar todas as props relevantes para evitar re-renders desnecessários
export const StockSection = memo(StockSectionComponent, (prevProps, nextProps) => {
  // AIDEV-NOTE: Só re-renderizar se as props relevantes mudarem
  // Retornar true = props são iguais = NÃO re-renderizar
  // Retornar false = props são diferentes = re-renderizar
  return (
    prevProps.product?.id === nextProps.product?.id &&
    prevProps.isEditMode === nextProps.isEditMode &&
    prevProps.formData === nextProps.formData
  );
});


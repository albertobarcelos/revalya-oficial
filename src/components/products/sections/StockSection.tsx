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
// AIDEV-NOTE: Tabs não usados - substituído por botões customizados para evitar remontagem
// import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

  // AIDEV-NOTE: Renderizar TODAS as abas, mas esconder as inativas via CSS (estilo SPA)
  // Isso evita remontagem dos componentes e o "piscar" ao trocar de aba
  return (
    <div className="space-y-4">
      {/* Tabs apenas para controle visual - não usa TabsContent para evitar remontagem */}
      <div className="w-full">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
              activeTab === 'overview'
                ? 'bg-background text-foreground shadow-sm'
                : ''
            }`}
          >
            Estoque
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
              activeTab === 'purchases'
                ? 'bg-background text-foreground shadow-sm'
                : ''
            }`}
          >
            Histórico de Compra
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 ${
              activeTab === 'sales'
                ? 'bg-background text-foreground shadow-sm'
                : ''
            }`}
          >
            Histórico de Venda
          </button>
        </div>
        
        {/* AIDEV-NOTE: Conteúdo das abas - SEMPRE montado, visibilidade via CSS */}
        <div className="mt-4">
          <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
            <StockOverviewTab
              productId={productId}
              isLoading={isLoading}
              error={error}
              stock={stock || []}
              updateStock={updateStock}
            />
          </div>
          
          <div style={{ display: activeTab === 'purchases' ? 'block' : 'none' }}>
            <PurchaseHistoryTab productId={productId} />
          </div>
          
          <div style={{ display: activeTab === 'sales' ? 'block' : 'none' }}>
            <SaleHistoryTab productId={productId} />
          </div>
        </div>
      </div>
    </div>
  );
}

// AIDEV-NOTE: Usar React.memo para evitar remontagens desnecessárias ao trocar de abas
// Comparar apenas props essenciais para evitar re-renders desnecessários
// AIDEV-NOTE: Ignorar completamente mudanças em formData - não afeta a seção de estoque
export const StockSection = memo(StockSectionComponent, (prevProps, nextProps) => {
  // AIDEV-NOTE: Só re-renderizar se o produto mudar (ID diferente) ou modo de edição mudar
  // Retornar true = props são iguais = NÃO re-renderizar
  // Retornar false = props são diferentes = re-renderizar
  // AIDEV-NOTE: NÃO comparar formData - ele muda constantemente mas não afeta estoque
  
  const productIdChanged = prevProps.product?.id !== nextProps.product?.id;
  const editModeChanged = prevProps.isEditMode !== nextProps.isEditMode;
  
  // AIDEV-NOTE: Log removido para reduzir verbosidade - usar React DevTools para debug
  
  // Retornar true = NÃO re-renderizar (props são iguais)
  // Retornar false = re-renderizar (props são diferentes)
  return (
    prevProps.product?.id === nextProps.product?.id &&
    prevProps.isEditMode === nextProps.isEditMode
  );
});


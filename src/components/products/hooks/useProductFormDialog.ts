/**
 * Hook: useProductFormDialog
 * 
 * Responsabilidade: Gerenciar lógica principal do dialog de produto
 * - Validação de acesso
 * - Gerenciamento de produto atual
 * - Estado de seção ativa
 * - Chave única do produto
 * 
 * Clean Code: Single Responsibility Principle
 */

import { useMemo, useEffect, useRef } from 'react';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useProductById } from '@/hooks/useSecureProducts';
import type { Product } from '@/hooks/useSecureProducts';

interface UseProductFormDialogProps {
  open: boolean;
  product: Product | null | undefined;
  isEditMode: boolean;
}

interface UseProductFormDialogReturn {
  hasAccess: boolean;
  accessError: string | null;
  currentTenant: { id: string; name: string } | null;
  currentProduct: Product | null;
  productKey: string;
  isLoadingProduct: boolean;
}

export function useProductFormDialog({
  open,
  product,
  isEditMode,
}: UseProductFormDialogProps): UseProductFormDialogReturn {
  // 🔐 VALIDAÇÃO DE ACESSO OBRIGATÓRIA (Padrão Multi-Tenant)
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: Passar hasAccess e currentTenant para useProductById para evitar chamada duplicada
  // de useTenantAccessGuard que causa erro "Should have a queue" do React
  // Buscar produto atualizado sempre que o modal abrir em modo de edição
  // AIDEV-NOTE: Calcular enabled separadamente para garantir que todos os requisitos sejam atendidos
  const isQueryEnabled = open && isEditMode && !!product?.id && hasAccess && !!currentTenant?.id;
  
  const {
    product: updatedProduct,
    isLoading: isLoadingProduct,
    refetch: refetchProduct,
    error: productError,
  } = useProductById(
    isEditMode && product?.id ? product.id : null,
    { 
      enabled: isQueryEnabled,
      hasAccess,
      currentTenant,
      accessError,
    }
  );
  
  // AIDEV-NOTE: Debug temporário para identificar problema de carregamento
  useEffect(() => {
    if (open && isEditMode && product?.id) {
      console.log('[DEBUG] useProductFormDialog - Estado:', {
        open,
        isEditMode,
        productId: product.id,
        hasAccess,
        currentTenantId: currentTenant?.id,
        updatedProduct: updatedProduct ? 'loaded' : 'null',
        isLoadingProduct,
        productError: productError?.message,
      });
    }
  }, [open, isEditMode, product?.id, hasAccess, currentTenant?.id, updatedProduct, isLoadingProduct, productError]);

  // AIDEV-NOTE: Refetch quando modal abre para garantir dados atualizados
  // AIDEV-NOTE: Refazer busca APENAS quando modal abre pela primeira vez (não quando já estava aberto)
  // Isso garante que dados salvos sejam exibidos corretamente na próxima abertura
  // AIDEV-NOTE: NÃO refetch quando produto muda durante edição - isso causa "piscar" desnecessário
  const wasOpenRef = useRef(false);
  const hasRefetchedRef = useRef(false);
  
  useEffect(() => {
    // AIDEV-NOTE: Detectar quando modal muda de fechado para aberto
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    
    // AIDEV-NOTE: Resetar flag quando modal fecha para permitir refetch na próxima abertura
    if (!open) {
      hasRefetchedRef.current = false;
      return;
    }
    
    // AIDEV-NOTE: Refetch APENAS quando modal abre pela primeira vez e ainda não fez refetch
    // AIDEV-NOTE: O React Query já gerencia o cache, então não precisamos de timeout
    if (justOpened && isEditMode && product?.id && hasAccess && currentTenant?.id && !hasRefetchedRef.current) {
      hasRefetchedRef.current = true;
      // AIDEV-NOTE: Refetch imediatamente - React Query gerencia o cache automaticamente
      refetchProduct();
    }
  }, [open, isEditMode, product?.id, hasAccess, currentTenant?.id, refetchProduct]);

  // AIDEV-NOTE: Usar useMemo com comparação específica para evitar re-renders desnecessários
  // Isso evita "piscar" quando o cache é atualizado após salvar
  // AIDEV-NOTE: Comparar apenas ID do produto para determinar se produto realmente mudou
  // AIDEV-NOTE: Em modo de edição, usar updatedProduct quando disponível, senão usar product da prop como fallback
  // Usar product como fallback evita loading state desnecessário ao reabrir o modal
  const currentProduct = useMemo(() => {
    if (isEditMode) {
      // AIDEV-NOTE: Priorizar updatedProduct (dados do servidor/cache)
      // Usar product da prop como fallback para evitar null e loading state
      // Isso garante que o formulário tenha dados imediatos ao abrir
      return updatedProduct || product || null;
    }
    // AIDEV-NOTE: Em modo de criação, não há produto
    return null;
  }, [
    isEditMode,
    // AIDEV-NOTE: Usar apenas ID para comparação - evita re-renders quando outros campos mudam
    updatedProduct?.id,
    product?.id,
  ]);

  // Chave única baseada no produto para preservar estado entre remontagens
  const productKey = useMemo(() => {
    if (isEditMode && currentProduct?.id) {
      return `edit-${currentProduct.id}`;
    }
    return 'create';
  }, [isEditMode, currentProduct?.id]);

  return {
    hasAccess,
    accessError,
    currentTenant,
    currentProduct,
    productKey,
    isLoadingProduct,
  };
}


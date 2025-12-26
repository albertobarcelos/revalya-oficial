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
  // AIDEV-NOTE: useProductById já tem refetchOnMount: 'always', então recarregará automaticamente
  // quando o modal abrir, garantindo dados atualizados
  const {
    product: updatedProduct,
    refetch: refetchProduct,
  } = useProductById(
    isEditMode && product?.id ? product.id : null,
    { 
      enabled: open && isEditMode && !!product?.id,
      hasAccess,
      currentTenant,
      accessError,
    }
  );

  // AIDEV-NOTE: Refetch apenas quando modal abre pela primeira vez
  // AIDEV-NOTE: NÃO refetch quando a query é invalidada durante a edição (após salvar)
  // Isso evita "piscar" do modal quando o usuário salva
  // AIDEV-NOTE: Usar ref para rastrear se já fez refetch neste ciclo de abertura do modal
  const hasRefetchedRef = useRef(false);
  const wasOpenRef = useRef(false);
  
  useEffect(() => {
    // AIDEV-NOTE: Detectar quando modal muda de fechado para aberto
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    
    if (justOpened && isEditMode && product?.id && hasAccess && currentTenant?.id) {
      // AIDEV-NOTE: Refetch apenas quando modal abre pela primeira vez (não quando já estava aberto)
      if (!hasRefetchedRef.current) {
        hasRefetchedRef.current = true;
        // AIDEV-NOTE: Refetch quando modal abre para garantir dados atualizados
        // Usar requestAnimationFrame para garantir que seja após o próximo frame
        requestAnimationFrame(() => {
          refetchProduct();
        });
      }
    } else if (!open) {
      // AIDEV-NOTE: Resetar flag quando modal fecha para permitir refetch na próxima abertura
      hasRefetchedRef.current = false;
    }
  }, [open, isEditMode, product?.id, hasAccess, currentTenant?.id, refetchProduct]);

  // AIDEV-NOTE: Usar useMemo com comparação específica para evitar re-renders desnecessários
  // Isso evita "piscar" quando o cache é atualizado após salvar
  // AIDEV-NOTE: Comparar apenas campos essenciais para determinar se produto realmente mudou
  const currentProduct = useMemo(() => {
    // Priorizar updatedProduct (produto buscado do servidor) sobre product (prop inicial)
    return (updatedProduct || product) as Product | null;
  }, [
    // AIDEV-NOTE: Usar apenas campos essenciais como dependências para evitar atualizações desnecessárias
    updatedProduct?.id,
    updatedProduct?.name,
    updatedProduct?.updated_at,
    product?.id,
    product?.name,
    product?.updated_at,
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
  };
}


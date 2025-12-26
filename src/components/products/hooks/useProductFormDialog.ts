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

import { useMemo, useRef, useEffect } from 'react';
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
  const {
    product: updatedProduct,
  } = useProductById(
    isEditMode && product?.id ? product.id : null,
    { 
      enabled: open && isEditMode && !!product?.id,
      hasAccess,
      currentTenant,
      accessError,
    }
  );

  // Estabilizar referência do produto para evitar re-renders desnecessários
  const currentProductRef = useRef<Product | null>(null);
  
  useEffect(() => {
    const newProduct = (updatedProduct || product) as Product | null;
    const newId = newProduct?.id || null;
    const currentId = currentProductRef.current?.id || null;
    
    if (newId !== currentId) {
      currentProductRef.current = newProduct;
    }
  }, [updatedProduct, product]);

  const currentProduct = currentProductRef.current;

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


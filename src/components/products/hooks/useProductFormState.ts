/**
 * Hook para gerenciar estado unificado do formulário de produto
 * 
 * AIDEV-NOTE: Unifica lógica de criação e edição em um único hook
 * 🔐 Segurança Multi-Tenant: Implementa validação dupla de tenant_id conforme manual
 */

import { useCallback, useMemo } from 'react';
import { useCreateProductForm } from './useCreateProductForm';
import { useProductForm } from './useProductForm';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import type { Product } from '@/hooks/useSecureProducts';
import type { FiscalData } from '../types/product-form.types';

interface UseProductFormStateProps {
  product: Product | null;
  isEditMode: boolean;
  onSuccess?: (() => void) | undefined;
  fiscalData?: FiscalData;
}

export function useProductFormState({
  product,
  isEditMode,
  onSuccess,
  fiscalData,
}: UseProductFormStateProps) {
  // 🔐 VALIDAÇÃO DE ACESSO OBRIGATÓRIA (Padrão Multi-Tenant)
  const { currentTenant } = useTenantAccessGuard();
  
  // 🛡️ VALIDAÇÃO DUPLA DE TENANT_ID (Conforme Manual de Segurança)
  // AIDEV-NOTE: Validar que o produto pertence ao tenant atual antes de usar
  const validatedProduct = useMemo(() => {
    if (!isEditMode || !product) {
      return null;
    }
    
    // AIDEV-NOTE: Validar tenant_id do produto corresponde ao tenant atual
    if (product.tenant_id && currentTenant?.id && product.tenant_id !== currentTenant.id) {
      console.error('[SECURITY] Violação de segurança: produto não pertence ao tenant atual', {
        productTenantId: product.tenant_id,
        currentTenantId: currentTenant.id,
        productId: product.id
      });
      // AIDEV-NOTE: Retornar null para bloquear uso do produto inválido
      return null;
    }
    
    return product;
  }, [product, currentTenant?.id, isEditMode]);
  
  // AIDEV-NOTE: Sempre chamar ambos os hooks para manter a ordem consistente
  // Isso evita erro "Should have a queue" do React causado por mudança na ordem dos hooks
  const createForm = useCreateProductForm(fiscalData);
  
  // AIDEV-NOTE: Sempre chamar useProductForm, mas usar um produto dummy se não estiver em modo de edição
  // Isso garante que a ordem dos hooks seja sempre a mesma entre renders
  const dummyProduct: Product = {
    id: '',
    name: '',
    description: '',
    code: '',
    sku: '',
    barcode: null,
    unit_price: 0,
    cost_price: 0,
    stock_quantity: 0,
    min_stock_quantity: 0,
    category_id: '',
    brand_id: '',
    supplier: '',
    unit_of_measure: '',
    tax_rate: 0,
    has_inventory: false,
    is_active: true,
    image_url: '',
    tenant_id: '',
    created_at: '',
    updated_at: '',
    created_by: '',
  };
  
  const editForm = useProductForm(
    (isEditMode && validatedProduct) ? validatedProduct : dummyProduct,
    onSuccess || (() => {}),
    fiscalData
  );

  // AIDEV-NOTE: Usar valores do hook relevante baseado no modo
  // AIDEV-NOTE: Usar validatedProduct ao invés de product para garantir segurança
  const formData = useMemo(() => 
    (isEditMode && validatedProduct) ? editForm.formData : createForm.formData,
    [isEditMode, validatedProduct, editForm.formData, createForm.formData]
  );

  const isLoading = useMemo(() => 
    (isEditMode && validatedProduct) ? editForm.isLoading : createForm.isLoading,
    [isEditMode, validatedProduct, editForm.isLoading, createForm.isLoading]
  );

  // AIDEV-NOTE: Wrapper para unificar assinaturas diferentes dos hooks
  const unifiedHandleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: any } }
  ) => {
    if (isEditMode && validatedProduct) {
      // useProductForm usa (field, value)
      const name = 'target' in e ? e.target.name : (e as any).name;
      const value = 'target' in e ? e.target.value : (e as any).value;
      editForm.handleChange(name as any, value);
    } else {
      // useCreateProductForm usa evento
      createForm.handleChange(e as any);
    }
  }, [isEditMode, validatedProduct, editForm, createForm]);

  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (isEditMode && validatedProduct) {
      // AIDEV-NOTE: useProductForm.handleSubmit() agora retorna Promise<boolean>
      // A mutação já tem onSuccess configurado, então aguardamos a Promise
      try {
        const result = await editForm.handleSubmit(); // Chama sem evento (opcional) e aguarda Promise
        // AIDEV-NOTE: O onSuccess do hook será chamado quando a mutação for bem-sucedida
        return result;
      } catch (error) {
        console.error('[ERROR] Erro ao submeter formulário de edição:', error);
        return false;
      }
    }
    // AIDEV-NOTE: useCreateProductForm.handleSubmit() retorna Promise<boolean>
    return createForm.handleSubmit();
  }, [isEditMode, validatedProduct, editForm, createForm]);

  const resetForm = useCallback(() => {
    if (!isEditMode) {
      createForm.resetForm();
    }
    // AIDEV-NOTE: Em modo de edição, não há necessidade de resetar
    // pois os dados vêm do produto existente
  }, [isEditMode, createForm]);

  return {
    formData,
    isLoading,
    handleChange: unifiedHandleChange,
    handleSubmit,
    resetForm,
  };
}


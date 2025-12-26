/**
 * Modal Unificado de Produto (Criação e Edição)
 * 
 * Clean Code Refactored:
 * - Separação de responsabilidades (SRP)
 * - Hooks customizados para lógica complexa
 * - Componentes menores e focados
 * - Código mais legível e manutenível
 * 
 * 🔐 Segurança Multi-Tenant: Implementa padrão obrigatório de segurança
 * - useTenantAccessGuard para validação de acesso
 * - Logs de auditoria em operações críticas
 * - Validação dupla de tenant_id
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogTitle, DialogDescription, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useProductFormState } from './hooks/useProductFormState';
import { useCFOPs } from './hooks/useCFOPs';
import { useFiscalData } from './hooks/useFiscalData';
import { useActiveProductCategories } from '@/hooks/useProductCategories';
import { useActiveProductBrands } from '@/hooks/useProductBrands';
import { useProductCodeGenerator } from '@/hooks/useProductCodeGenerator';
import { useProductFormDialog } from './hooks/useProductFormDialog';
import { useProductFormLoading } from './hooks/useProductFormLoading';
import { useProductFormHandlers } from './hooks/useProductFormHandlers';
import { ProductFormDialogContent } from './components/ProductFormDialogContent';
import { ProductFormSectionRenderer } from './components/ProductFormSectionRenderer';
import { FORM_SECTIONS } from './constants/form-sections';
import type { ProductFormDialogProps, FormSection } from './types/product-form.types';
import { cn } from '@/lib/utils';

// DialogContent customizado com sistema de scroll otimizado
// Evita re-animações quando o conteúdo muda
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh] translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl overflow-hidden flex flex-col",
        className
      )}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
      }}
      {...props}
    >
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormDialogProps) {
  const isEditMode = !!product;

  // Estado de seção ativa (movido para o componente principal para evitar problemas com hooks)
  // AIDEV-NOTE: Resetar para dados-gerais quando modal abre
  const [activeSection, setActiveSection] = useState<FormSection>('dados-gerais');
  
  // AIDEV-NOTE: Resetar seção ativa quando modal abre
  useEffect(() => {
    if (open) {
      setActiveSection('dados-gerais');
    }
  }, [open]);

  // Hook: Gerenciamento principal do dialog
  const {
    hasAccess,
    accessError,
    currentTenant,
    currentProduct,
    productKey,
  } = useProductFormDialog({ open, product, isEditMode });

  // 🔍 AUDIT LOG: Acesso ao modal de produto
  useEffect(() => {
    if (open && currentTenant) {
      console.log(
        `[AUDIT] Acessando modal de ${isEditMode ? 'edição' : 'criação'} de produto - Tenant: ${currentTenant.name} (${currentTenant.id})`
      );
    }
  }, [open, currentTenant, isEditMode]);

  // Data fetching hooks
  const { categories, isLoading: isLoadingCategories } = useActiveProductCategories();
  const {
    brands,
    isLoading: isLoadingBrands,
    createBrand,
    isCreating: isCreatingBrand,
    error: brandsError,
    refetch: refetchBrands,
  } = useActiveProductBrands();
  const {
    validateCodeExists,
    nextAvailableCode,
    isLoadingMaxCode,
    hasAccess: hasCodeAccess,
  } = useProductCodeGenerator();

  // Hook: Dados fiscais
  const { fiscalData, updateFiscalData, resetFiscalData } = useFiscalData(currentProduct);

  // Hook: Estado do formulário
  const {
    formData,
    isLoading: isLoadingForm,
    handleChange,
    handleSubmit,
    resetForm,
  } = useProductFormState({
    product: currentProduct || null,
    isEditMode,
    fiscalData,
    onSuccess: () => {
      onSuccess?.();
    },
  });

  // Hook: CFOPs (carregados sob demanda)
  const { validCFOPs, isLoading: isLoadingCFOPs } = useCFOPs({
    enabled: open && activeSection === 'tributos-fiscais',
    category: 'saida',
  });

  // Hook: Gerenciamento de loading
  const { isInitialLoading, isSectionLoading, onStockLoadingChange } = useProductFormLoading({
    open,
    productKey,
    activeSection,
    isLoadingCategories,
    isLoadingBrands,
    isLoadingMaxCode,
    isLoadingCFOPs,
    isLoadingStock: false, // Gerenciado pelo StockSection via callback
  });

  // Hook: Event handlers
  const {
    handleFormSubmit,
    handleCancel,
    handleSaveAndAddAnother,
    handleSaveAndRegisterStock,
  } = useProductFormHandlers({
    isEditMode,
    currentTenant,
    handleSubmit,
    resetForm,
    resetFiscalData,
    onOpenChange,
    onSuccess,
    setActiveSection,
  });

  // 🛡️ GUARD CLAUSE: Bloquear acesso se não tiver permissão
  // IMPORTANTE: Deve estar DEPOIS de todos os hooks para não violar as regras dos hooks do React
  if (!hasAccess) {
    console.error('[SECURITY] Acesso negado ao modal de produto:', accessError);
    return null;
  }

  // Props comuns para todas as seções
  // AIDEV-NOTE: Memoização otimizada para evitar re-renders desnecessários
  const commonProps = useMemo(
    () => ({
      formData,
      isEditMode,
      onChange: handleChange,
      categories,
      isLoadingCategories: false, // Loading gerenciado localmente
      product: currentProduct || null,
    }),
    [formData, isEditMode, handleChange, categories, currentProduct?.id]
  );

  // Props específicas para GeneralDataSection
  const generalDataProps = useMemo(
    () => ({
      brands,
      isLoadingBrands: open ? isLoadingBrands : false,
      validateCodeExists,
      nextAvailableCode,
      isLoadingMaxCode: open ? isLoadingMaxCode : false,
      hasCodeAccess,
      createBrand,
      isCreatingBrand,
      brandsError,
      refetchBrands,
      ...(currentProduct?.id ? { productId: currentProduct.id } : {}),
    }),
    [
      brands,
      isLoadingBrands,
      open,
      validateCodeExists,
      nextAvailableCode,
      isLoadingMaxCode,
      hasCodeAccess,
      createBrand,
      isCreatingBrand,
      brandsError,
      refetchBrands,
      currentProduct?.id,
    ]
  );

  // Props específicas para FiscalSection
  const fiscalProps = useMemo(
    () => ({
      fiscalData,
      onFiscalDataChange: updateFiscalData,
      validCFOPs,
      isLoadingCFOPs,
    }),
    [fiscalData, updateFiscalData, validCFOPs, isLoadingCFOPs]
  );

  // Label da seção ativa
  const activeSectionLabel = FORM_SECTIONS.find((s) => s.id === activeSection)?.label || '';

  // Loading combinado (produto + formulário)
  const isLoading = isLoadingForm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <CustomDialogContent className="p-0 m-0 border-0">
        <DialogTitle className="sr-only">
          {isEditMode ? 'Editar produto' : 'Novo produto'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isEditMode
            ? 'Edite as informações do produto'
            : 'Preencha as informações para criar um novo produto'}
        </DialogDescription>

        <ProductFormDialogContent
          isEditMode={isEditMode}
          isLoading={isLoading}
          activeSection={activeSection}
          activeSectionLabel={activeSectionLabel}
          isInitialLoading={isInitialLoading}
          isSectionLoading={isSectionLoading}
          onSectionChange={setActiveSection}
          onSave={async () => {
            const fakeEvent = {
              preventDefault: () => {},
              currentTarget: null,
              target: null,
            } as unknown as React.FormEvent<HTMLFormElement>;
            await handleFormSubmit(fakeEvent);
          }}
          onSaveAndAddAnother={handleSaveAndAddAnother}
          onSaveAndRegisterStock={handleSaveAndRegisterStock}
          onBack={handleCancel}
          onSubmit={handleFormSubmit}
        >
          <ProductFormSectionRenderer
            activeSection={activeSection}
            commonProps={commonProps}
            generalDataProps={generalDataProps}
            fiscalProps={fiscalProps}
            onStockLoadingChange={onStockLoadingChange}
          />
        </ProductFormDialogContent>
      </CustomDialogContent>
    </Dialog>
  );
}

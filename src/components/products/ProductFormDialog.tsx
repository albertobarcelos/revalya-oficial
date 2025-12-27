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

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogTitle, DialogDescription, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useProductFormState } from './hooks/useProductFormState';
import { useCFOPs } from './hooks/useCFOPs';
import { useFiscalData } from './hooks/useFiscalData';
import { useActiveProductCategories } from '@/hooks/useProductCategories';
import { useActiveProductBrands } from '@/hooks/useProductBrands';
import { useProductCodeGenerator } from '@/hooks/useProductCodeGenerator';
import { useProductFormDialog } from './hooks/useProductFormDialog';
import { useProductFormLoading } from './hooks/useProductFormLoading';
import { useProductFormHandlers } from './hooks/useProductFormHandlers';
import { useUnsavedChanges } from './hooks/useUnsavedChanges';
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
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Estados para prevenção de perda de dados e feedback visual
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const pendingCloseRef = useRef(false);

  // Estado de seção ativa (movido para o componente principal para evitar problemas com hooks)
  // AIDEV-NOTE: Resetar para dados-gerais quando modal abre
  const [activeSection, setActiveSection] = useState<FormSection>('dados-gerais');
  
  // AIDEV-NOTE: Estabilizar setActiveSection com useCallback para evitar re-renders desnecessários
  const handleSectionChange = useCallback((section: FormSection) => {
    console.log('[ProductFormDialog] Mudando seção para:', section);
    setActiveSection(section);
  }, []);
  
  // AIDEV-NOTE: Resetar seção ativa e status de salvamento quando modal abre/fecha
  useEffect(() => {
    if (open) {
      setActiveSection('dados-gerais');
      setSaveStatus('idle');
    } else {
      // AIDEV-NOTE: Resetar status quando modal fecha
      setSaveStatus('idle');
    }
  }, [open]);

  // Hook: Gerenciamento principal do dialog
  const {
    hasAccess,
    accessError,
    currentTenant,
    currentProduct,
    productKey,
    isLoadingProduct,
  } = useProductFormDialog({ open, product, isEditMode });

  // AIDEV-NOTE: NÃO remover ou invalidar cache do produto ao fechar o modal
  // Isso causa "piscar" ao reabrir porque currentProduct fica null durante loading
  // O cache é atualizado diretamente via setQueryData no useProductForm.onSuccess
  // Quando o modal reabrir, usaremos o cache existente + refetch para atualizar


  // Data fetching hooks
  // AIDEV-NOTE: Habilitar queries apenas quando modal estiver aberto e tiver acesso
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
      // AIDEV-NOTE: Marcar como salvo e resetar status após sucesso
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      onSuccess?.();
    },
  });

  // AIDEV-NOTE: Rastrear mudanças não salvas para prevenir perda de dados
  // Criar dados iniciais baseados no produto atual ou formulário vazio
  const [initialFormData, setInitialFormData] = useState(formData);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (open && currentProduct && !isLoadingProduct && !hasInitialized) {
      // AIDEV-NOTE: Só atualizar dados iniciais quando produto está COMPLETAMENTE carregado
      // Isso evita que formData parcial seja considerado como "inicial"
      setInitialFormData(formData);
      setHasInitialized(true);
    } else if (!open && hasInitialized) {
      // AIDEV-NOTE: Resetar quando modal fecha
      setHasInitialized(false);
    }
  }, [open, currentProduct?.id, isLoadingProduct, formData, hasInitialized]);

  const { hasUnsavedChanges, markAsSaved } = useUnsavedChanges({
    currentData: formData,
    initialData: initialFormData,
    // AIDEV-NOTE: Só habilitar detecção após dados completamente carregados
    enabled: isEditMode && open && hasInitialized && !isLoadingProduct,
  });

  // Hook: CFOPs (carregados quando modal está aberto em modo edição)
  // AIDEV-NOTE: Carregar CFOPs sempre que o modal estiver aberto em modo edição
  // para garantir que estejam disponíveis quando o usuário navegar para a seção fiscal
  const { validCFOPs, isLoading: isLoadingCFOPs } = useCFOPs({
    enabled: open && isEditMode,
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

  // AIDEV-NOTE: Handler para fechar modal após salvar com sucesso (sem verificar mudanças não salvas)
  const handleCloseAfterSave = useCallback(() => {
    markAsSaved(); // AIDEV-NOTE: Marcar como salvo antes de fechar
    pendingCloseRef.current = true; // AIDEV-NOTE: Marcar flag para indicar que é um fechamento após salvar
    onOpenChange(false); // AIDEV-NOTE: Fechar diretamente, sem passar pelo interceptor
  }, [markAsSaved, onOpenChange]);

  // Hook: Event handlers (declarar primeiro para usar nos wrappers)
  const {
    handleFormSubmit: originalHandleFormSubmit,
  } = useProductFormHandlers({
    isEditMode,
    currentTenant,
    handleSubmit: async () => {
      setSaveStatus('saving');
      const result = await handleSubmit();
      if (result) {
        markAsSaved(); // AIDEV-NOTE: Marcar como salvo imediatamente após sucesso
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
      return result;
    },
    resetForm,
    resetFiscalData,
    onOpenChange: handleCloseAfterSave, // AIDEV-NOTE: Usar handler que fecha diretamente após salvar
    onSuccess,
    setActiveSection: handleSectionChange,
  });

  // AIDEV-NOTE: Interceptar fechamento do modal para verificar mudanças não salvas
  // AIDEV-NOTE: Este handler é usado apenas quando o usuário tenta fechar manualmente (X, ESC, seta de voltar, etc)
  // Quando salvamos com sucesso, usamos handleCloseAfterSave que fecha diretamente
  const handleOpenChangeWithConfirm = useCallback((newOpen: boolean) => {
    // AIDEV-NOTE: Se está abrindo, não precisa verificar
    if (newOpen) {
      onOpenChange(newOpen);
      return;
    }
    
    // AIDEV-NOTE: Se está fechando e há mudanças não salvas, mostrar confirmação
    if (hasUnsavedChanges && isEditMode) {
      setShowConfirmDialog(true);
      pendingCloseRef.current = true;
    } else {
      // AIDEV-NOTE: Se não há mudanças não salvas, resetar formulário e fechar normalmente
      resetForm();
      resetFiscalData();
      onOpenChange(newOpen);
    }
  }, [hasUnsavedChanges, isEditMode, onOpenChange, resetForm, resetFiscalData]);

  // AIDEV-NOTE: Wrapper para handleCancel que verifica mudanças não salvas antes de fechar
  const handleCancel = useCallback(() => {
    // AIDEV-NOTE: Chamar o interceptor para verificar mudanças não salvas
    handleOpenChangeWithConfirm(false);
  }, [handleOpenChangeWithConfirm]);

  // AIDEV-NOTE: Handler para confirmar fechamento (descartar mudanças)
  const handleConfirmClose = useCallback(() => {
    setShowConfirmDialog(false);
    pendingCloseRef.current = false;
    // AIDEV-NOTE: Resetar formulário quando usuário confirma descartar mudanças
    resetForm();
    resetFiscalData();
    onOpenChange(false);
  }, [onOpenChange, resetForm, resetFiscalData]);

  // AIDEV-NOTE: Handler para cancelar fechamento
  const handleCancelClose = useCallback(() => {
    setShowConfirmDialog(false);
    pendingCloseRef.current = false;
  }, []);

  // AIDEV-NOTE: Wrapper para handleFormSubmit com feedback visual
  const handleFormSubmitWithFeedback = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setSaveStatus('saving');
    try {
      const fakeEvent = {
        preventDefault: () => {},
        currentTarget: null,
        target: null,
      } as unknown as React.FormEvent<HTMLFormElement>;
      await originalHandleFormSubmit(fakeEvent);
      // AIDEV-NOTE: Status será atualizado pelo onSuccess do useProductFormState
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [originalHandleFormSubmit]);

  // AIDEV-NOTE: Wrapper para onSave (sem evento)
  const handleSaveWithoutEvent = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const fakeEvent = {
        preventDefault: () => {},
        currentTarget: null,
        target: null,
      } as unknown as React.FormEvent<HTMLFormElement>;
      await originalHandleFormSubmit(fakeEvent);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [originalHandleFormSubmit]);

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

  // AIDEV-NOTE: Loading combinado inclui também o carregamento do produto
  // Em modo de edição, mostrar loading se:
  // 1. Está carregando E
  // 2. Não temos currentProduct (nem do cache nem da prop)
  // Isso garante que o formulário só seja renderizado quando tivermos dados
  const isProductLoading = isEditMode && isLoadingProduct && !currentProduct;
  
  // AIDEV-NOTE: Debug temporário para identificar problema de carregamento
  useEffect(() => {
    if (open && isEditMode) {
      console.log('[DEBUG] ProductFormDialog - Estado do produto:', {
        currentProduct: currentProduct ? 'loaded' : 'null',
        isLoadingProduct,
        isProductLoading,
        productFromProp: product ? 'exists' : 'null',
      });
    }
  }, [open, isEditMode, currentProduct, isLoadingProduct, isProductLoading, product]);

  // Loading combinado (produto + formulário)
  const isLoading = isLoadingForm || isProductLoading;

  return (
    <>
      <Dialog 
        open={open} 
        onOpenChange={(newOpen) => {
          // AIDEV-NOTE: Se está abrindo, resetar flag
          if (newOpen) {
            pendingCloseRef.current = false;
            onOpenChange(newOpen);
            return;
          }
          
          // AIDEV-NOTE: Se está fechando e não é um salvamento bem-sucedido, verificar mudanças não salvas
          if (!pendingCloseRef.current) {
            handleOpenChangeWithConfirm(newOpen);
          } else {
            // AIDEV-NOTE: É um fechamento após salvar, fechar diretamente
            pendingCloseRef.current = false;
            onOpenChange(newOpen);
          }
        }} 
        modal
      >
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
          onSectionChange={handleSectionChange}
          onSave={handleSaveWithoutEvent}
          onBack={handleCancel}
          onSubmit={handleFormSubmitWithFeedback}
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
      
      {/* AIDEV-NOTE: Feedback visual de status de salvamento */}
      {saveStatus !== 'idle' && (
        <div className="fixed top-4 right-4 z-50">
          <Badge
            variant={saveStatus === 'saved' ? 'default' : saveStatus === 'error' ? 'destructive' : 'secondary'}
            className="flex items-center gap-2 px-4 py-2"
          >
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Salvando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Salvo!</span>
              </>
            )}
            {saveStatus === 'error' && (
              <span>Erro ao salvar</span>
            )}
          </Badge>
        </div>
      )}

      {/* AIDEV-NOTE: Diálogo de confirmação para mudanças não salvas */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas neste produto. Se você fechar agora, todas as alterações serão perdidas.
              <br />
              <br />
              Deseja realmente fechar sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Fechar sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

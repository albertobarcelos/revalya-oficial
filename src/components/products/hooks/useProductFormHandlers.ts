/**
 * Hook: useProductFormHandlers
 * 
 * Responsabilidade: Gerenciar event handlers do formulário
 * - Submit do formulário
 * - Cancelar
 * - Salvar e adicionar outro
 * - Salvar e cadastrar estoque
 * 
 * Clean Code: Single Responsibility Principle
 */

import { useCallback } from 'react';
import type { Product } from '@/hooks/useSecureProducts';

interface UseProductFormHandlersProps {
  isEditMode: boolean;
  currentTenant: { id: string; name: string } | null;
  handleSubmit: () => Promise<boolean>;
  resetForm: () => void;
  resetFiscalData: () => void;
  onOpenChange: (open: boolean) => void;
  onSuccess: (() => void) | undefined;
  setActiveSection: (section: 'dados-gerais' | 'codigos-barras' | 'tributos-fiscais' | 'imagens' | 'informacoes-adicionais' | 'estoque') => void;
}

interface UseProductFormHandlersReturn {
  handleFormSubmit: (e: React.FormEvent) => Promise<void>;
  handleCancel: () => void;
  handleSaveAndAddAnother: () => Promise<void>;
  handleSaveAndRegisterStock: () => Promise<void>;
}

export function useProductFormHandlers({
  isEditMode,
  currentTenant,
  handleSubmit,
  resetForm,
  resetFiscalData,
  onOpenChange,
  onSuccess,
  setActiveSection,
}: UseProductFormHandlersProps): UseProductFormHandlersReturn {
  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!currentTenant?.id) {
        console.error('[SECURITY] Tentativa de submeter formulário sem tenant válido');
        return;
      }

      console.log(
        `[AUDIT] Submetendo formulário de ${isEditMode ? 'edição' : 'criação'} de produto - Tenant: ${currentTenant.name} (${currentTenant.id})`
      );

      try {
        const success = await handleSubmit();

        if (success && !isEditMode) {
          // AIDEV-NOTE: Em modo de criação, fechar modal após salvar
          console.log(`[AUDIT] Produto criado com sucesso - Tenant: ${currentTenant.name}`);
          resetForm();
          resetFiscalData();
          onOpenChange(false);
          onSuccess?.();
        } else if (success && isEditMode) {
          // AIDEV-NOTE: Em modo de edição, NÃO fechar modal - apenas mostrar toast
          // O toast já é exibido pelo hook useProductForm
          console.log(`[AUDIT] Produto atualizado com sucesso - Tenant: ${currentTenant.name}`);
          // Modal permanece aberto para permitir continuar editando
        }
      } catch (error) {
        console.error('[ERROR] Erro ao submeter formulário:', error);
      }
    },
    [handleSubmit, isEditMode, resetForm, resetFiscalData, onOpenChange, onSuccess, currentTenant]
  );

  const handleCancel = useCallback(() => {
    resetForm();
    resetFiscalData();
    if (onOpenChange && typeof onOpenChange === 'function') {
      onOpenChange(false);
    }
  }, [resetForm, resetFiscalData, onOpenChange]);

  const handleSaveAndAddAnother = useCallback(async () => {
    if (!currentTenant?.id) {
      console.error('[SECURITY] Tentativa de salvar produto sem tenant válido');
      return;
    }

    console.log(
      `[AUDIT] Salvando produto e adicionando outro - Tenant: ${currentTenant.name} (${currentTenant.id})`
    );

    try {
      const success = await handleSubmit();
      if (success) {
        console.log(
          `[AUDIT] Produto salvo com sucesso, preparando para adicionar outro - Tenant: ${currentTenant.name}`
        );
        resetForm();
        resetFiscalData();
        setActiveSection('dados-gerais');
        onSuccess?.();
      }
    } catch (error) {
      console.error('[ERROR] Erro ao salvar e adicionar outro:', error);
    }
  }, [handleSubmit, resetForm, resetFiscalData, onSuccess, currentTenant, setActiveSection]);

  const handleSaveAndRegisterStock = useCallback(async () => {
    if (!currentTenant?.id) {
      console.error('[SECURITY] Tentativa de salvar produto sem tenant válido');
      return;
    }

    console.log(
      `[AUDIT] Salvando produto e cadastrando estoque - Tenant: ${currentTenant.name} (${currentTenant.id})`
    );

    try {
      const success = await handleSubmit();
      if (success) {
        console.log(
          `[AUDIT] Produto salvo com sucesso, preparando para cadastrar estoque - Tenant: ${currentTenant.name}`
        );
        resetForm();
        resetFiscalData();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error('[ERROR] Erro ao salvar e cadastrar estoque:', error);
    }
  }, [handleSubmit, resetForm, resetFiscalData, onOpenChange, onSuccess, currentTenant]);

  return {
    handleFormSubmit,
    handleCancel,
    handleSaveAndAddAnother,
    handleSaveAndRegisterStock,
  };
}


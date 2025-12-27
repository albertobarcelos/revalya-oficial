/**
 * Componente: ProductFormSectionRenderer
 * 
 * Responsabilidade: Renderizar seção ativa do formulário
 * - Renderização condicional sem desmontar componentes (evita piscar)
 * - Passar props corretas para cada seção
 * - Performance: Mantém componentes montados, apenas esconde/mostra
 * 
 * Clean Code: Single Responsibility Principle
 * Performance: Evita remontagem desnecessária de componentes
 */

import React, { useMemo, memo } from 'react';
import {
  GeneralDataSection,
  BarcodeSection,
  FiscalSection,
  ImageSection,
  AdditionalInfoSection,
  StockSection,
} from '../sections';
import type { FormSection, FormSectionProps, GeneralDataSectionProps, FiscalSectionProps } from '../types/product-form.types';

interface ProductFormSectionRendererProps {
  activeSection: FormSection;
  commonProps: FormSectionProps;
  generalDataProps: Omit<GeneralDataSectionProps, keyof FormSectionProps>;
  fiscalProps: Omit<FiscalSectionProps, keyof FormSectionProps>;
  onStockLoadingChange: (isLoading: boolean) => void;
}

// AIDEV-NOTE: Renderizar todas as seções mas esconder as inativas
// Isso evita remontagem e o "piscar" ao trocar de aba
function ProductFormSectionRendererComponent({
  activeSection,
  commonProps,
  generalDataProps,
  fiscalProps,
  onStockLoadingChange,
}: ProductFormSectionRendererProps) {
  // AIDEV-NOTE: Log removido para reduzir verbosidade - usar React DevTools para debug
  
  // AIDEV-NOTE: Renderizar todas as seções de uma vez, mas esconder as inativas
  // Isso mantém o estado dos componentes e evita remontagem
  return (
    <>
      {/* Seção: Dados Gerais */}
      <div
        key="dados-gerais"
        style={{ display: activeSection === 'dados-gerais' ? 'block' : 'none' }}
      >
        <GeneralDataSection
          {...commonProps}
          {...generalDataProps}
        />
      </div>

      {/* Seção: Códigos de Barras */}
      <div
        key="codigos-barras"
        style={{ display: activeSection === 'codigos-barras' ? 'block' : 'none' }}
      >
        <BarcodeSection {...commonProps} />
      </div>

      {/* Seção: Tributos Fiscais */}
      <div
        key="tributos-fiscais"
        style={{ display: activeSection === 'tributos-fiscais' ? 'block' : 'none' }}
      >
        <FiscalSection
          {...commonProps}
          {...fiscalProps}
        />
      </div>

      {/* Seção: Imagens */}
      <div
        key="imagens"
        style={{ display: activeSection === 'imagens' ? 'block' : 'none' }}
      >
        <ImageSection {...commonProps} />
      </div>

      {/* Seção: Informações Adicionais */}
      <div
        key="informacoes-adicionais"
        style={{ display: activeSection === 'informacoes-adicionais' ? 'block' : 'none' }}
      >
        <AdditionalInfoSection {...commonProps} />
      </div>

      {/* Seção: Estoque */}
      <div
        key="estoque"
        style={{ display: activeSection === 'estoque' ? 'block' : 'none' }}
      >
        <StockSection
          {...commonProps}
          onLoadingChange={onStockLoadingChange}
        />
      </div>
    </>
  );
}

// AIDEV-NOTE: Memoizar para evitar re-renders quando apenas dados de query mudam
// Só re-renderizar se activeSection, productId, formData ou as funções mudarem
export const ProductFormSectionRenderer = memo(
  ProductFormSectionRendererComponent,
  (prevProps, nextProps) => {
    const activeChanged = prevProps.activeSection !== nextProps.activeSection;
    const productChanged = prevProps.commonProps.product?.id !== nextProps.commonProps.product?.id;
    const loadingChangeChanged = prevProps.onStockLoadingChange !== nextProps.onStockLoadingChange;
    
    // AIDEV-NOTE: Comparar campos críticos do formData que afetam os selects
    // Comparar apenas os campos que são usados nos componentes de formulário
    const prevFormData = prevProps.commonProps.formData as any;
    const nextFormData = nextProps.commonProps.formData as any;
    
    const formDataChanged = 
      prevFormData?.unit_of_measure !== nextFormData?.unit_of_measure ||
      prevFormData?.category_id !== nextFormData?.category_id ||
      prevFormData?.brand_id !== nextFormData?.brand_id ||
      prevFormData?.name !== nextFormData?.name ||
      prevFormData?.code !== nextFormData?.code ||
      prevFormData?.unit_price !== nextFormData?.unit_price ||
      prevFormData?.description !== nextFormData?.description;
    
    // AIDEV-NOTE: Comparar campos críticos do fiscalData que afetam os selects fiscais
    // AIDEV-NOTE: Também comparar a referência do fiscalProps para garantir que mudanças sejam detectadas
    const prevFiscalProps = prevProps.fiscalProps;
    const nextFiscalProps = nextProps.fiscalProps;
    const fiscalPropsRefChanged = prevFiscalProps !== nextFiscalProps;
    
    const prevFiscalData = prevFiscalProps?.fiscalData as any;
    const nextFiscalData = nextFiscalProps?.fiscalData as any;
    
    const fiscalDataChanged = 
      fiscalPropsRefChanged || // AIDEV-NOTE: Se a referência mudou, considerar como mudança
      prevFiscalData?.cfop_id !== nextFiscalData?.cfop_id ||
      prevFiscalData?.product_type_id !== nextFiscalData?.product_type_id ||
      prevFiscalData?.origem !== nextFiscalData?.origem ||
      prevFiscalData?.cst_icms_id !== nextFiscalData?.cst_icms_id ||
      prevFiscalData?.cst_ipi_id !== nextFiscalData?.cst_ipi_id ||
      prevFiscalData?.cst_pis_id !== nextFiscalData?.cst_pis_id ||
      prevFiscalData?.cst_cofins_id !== nextFiscalData?.cst_cofins_id ||
      prevFiscalData?.cst_ibs_cbs !== nextFiscalData?.cst_ibs_cbs ||
      prevFiscalData?.cclass_trib !== nextFiscalData?.cclass_trib ||
      prevFiscalData?.ncm !== nextFiscalData?.ncm ||
      prevFiscalData?.cest !== nextFiscalData?.cest ||
      prevFiscalData?.use_default_pis_cofins !== nextFiscalData?.use_default_pis_cofins;
    
    // AIDEV-NOTE: Log apenas quando formData ou fiscalData muda para debug
    if ((formDataChanged || fiscalDataChanged) && process.env.NODE_ENV === 'development') {
      if (formDataChanged) {
        console.log('[ProductFormSectionRenderer memo] formData mudou:', {
          unit_of_measure: { prev: prevFormData?.unit_of_measure, next: nextFormData?.unit_of_measure },
          category_id: { prev: prevFormData?.category_id, next: nextFormData?.category_id },
          brand_id: { prev: prevFormData?.brand_id, next: nextFormData?.brand_id },
        });
      }
      if (fiscalDataChanged) {
        console.log('[ProductFormSectionRenderer memo] fiscalData mudou:', {
          cfop_id: { prev: prevFiscalData?.cfop_id, next: nextFiscalData?.cfop_id },
          product_type_id: { prev: prevFiscalData?.product_type_id, next: nextFiscalData?.product_type_id },
          origem: { prev: prevFiscalData?.origem, next: nextFiscalData?.origem },
        });
      }
    }
    
    // Retornar true = NÃO re-renderizar
    return !activeChanged && !productChanged && !loadingChangeChanged && !formDataChanged && !fiscalDataChanged;
  }
);


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

import React, { useMemo } from 'react';
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
export function ProductFormSectionRenderer({
  activeSection,
  commonProps,
  generalDataProps,
  fiscalProps,
  onStockLoadingChange,
}: ProductFormSectionRendererProps) {
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


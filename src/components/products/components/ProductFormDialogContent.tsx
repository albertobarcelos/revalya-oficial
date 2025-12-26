/**
 * Componente: ProductFormDialogContent
 * 
 * Responsabilidade: Renderizar conteúdo do dialog de produto
 * - Sidebar de navegação
 * - Área principal com seções
 * - Loading states
 * 
 * Clean Code: Single Responsibility Principle
 */

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductLoader } from '@/components/ui/product-loader';
import { ProductFormSidebar } from '../sections';
import { FORM_SECTIONS } from '../constants/form-sections';
import type { FormSection } from '../types/product-form.types';

interface ProductFormDialogContentProps {
  isEditMode: boolean;
  isLoading: boolean;
  activeSection: FormSection;
  activeSectionLabel: string;
  isInitialLoading: boolean;
  isSectionLoading: boolean;
  onSectionChange: (section: FormSection) => void;
  onSave: () => Promise<void>;
  onSaveAndAddAnother: () => Promise<void>;
  onSaveAndRegisterStock: () => Promise<void>;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  children: React.ReactNode;
}

export function ProductFormDialogContent({
  isEditMode,
  isLoading,
  activeSection,
  activeSectionLabel,
  isInitialLoading,
  isSectionLoading,
  onSectionChange,
  onSave,
  onSaveAndAddAnother,
  onSaveAndRegisterStock,
  onBack,
  onSubmit,
  children,
}: ProductFormDialogContentProps) {
  return (
    <div className="flex flex-1 overflow-hidden min-w-0">
      {/* Sidebar de Navegação */}
      <ProductFormSidebar
        sections={FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        isEditMode={isEditMode}
        isLoading={isLoading}
        onSaveAndAddAnother={onSaveAndAddAnother}
        onSaveAndRegisterStock={onSaveAndRegisterStock}
        onSave={onSave}
        onBack={onBack}
      />

      {/* Área Principal do Formulário */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 w-full relative">
        {/* Loading inicial - overlay sem mudar estrutura do DOM */}
        {isInitialLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
            <ProductLoader />
          </div>
        )}

        {/* Conteúdo sempre renderizado - estrutura estável */}
        <div className="p-6 border-b flex-shrink-0">
          <h3 className="text-xl font-semibold">{activeSectionLabel}</h3>
        </div>

        <div className="flex-1 min-h-0 w-full relative">
          {/* Loading localizado apenas na área de conteúdo quando mudar de aba */}
          {/* AIDEV-NOTE: Usar opacity transition para evitar piscar */}
          <div
            className={`absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg transition-opacity duration-150 ${
              isSectionLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {isSectionLoading && <ProductLoader />}
          </div>
          <ScrollArea className="h-full w-full">
            <form id="product-form" onSubmit={onSubmit} className="p-6 w-full">
              {children}
            </form>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}


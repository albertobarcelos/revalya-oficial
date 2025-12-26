/**
 * Sidebar de Navegação do Formulário de Produto
 * 
 * AIDEV-NOTE: Componente reutilizável para navegação entre seções
 */

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Save, Plus, Warehouse, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormSection, FormSectionConfig } from '../types/product-form.types';

interface ProductFormSidebarProps {
  sections: FormSectionConfig[];
  activeSection: FormSection;
  onSectionChange: (section: FormSection) => void;
  isEditMode: boolean;
  isLoading: boolean;
  onSaveAndAddAnother: () => void;
  onSaveAndRegisterStock: () => void;
  onSave: () => void;
  onBack?: () => void;
}

export function ProductFormSidebar({
  sections,
  activeSection,
  onSectionChange,
  isEditMode,
  isLoading,
  onSaveAndAddAnother,
  onSaveAndRegisterStock,
  onSave,
  onBack,
}: ProductFormSidebarProps) {
  return (
    <div className="w-64 flex-shrink-0 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 hover:bg-muted rounded-md transition-colors"
              disabled={isLoading}
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
          <h2 className="text-lg font-semibold">
            {isEditMode ? 'Editar produto' : 'Novo produto'}
          </h2>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <section.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{section.label}</span>
              {activeSection === section.id && (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ))}
        </nav>
      </ScrollArea>

      {/* Botões de Ação no Rodapé */}
      <div className="p-4 border-t space-y-2">
        <Button
          type="button"
          onClick={onSaveAndAddAnother}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar e adicionar outro'}
        </Button>
        <Button
          type="button"
          onClick={onSaveAndRegisterStock}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading}
        >
          <Warehouse className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar e cadastrar estoque'}
        </Button>
        <Button
          type="submit"
          form="product-form"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar produto'}
        </Button>
      </div>
    </div>
  );
}


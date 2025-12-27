/**
 * Sidebar de Navegação do Formulário de Produto
 * 
 * AIDEV-NOTE: Componente reutilizável para navegação entre seções
 */

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Save, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormSection, FormSectionConfig } from '../types/product-form.types';

interface ProductFormSidebarProps {
  sections: FormSectionConfig[];
  activeSection: FormSection;
  onSectionChange: (section: FormSection) => void;
  isEditMode: boolean;
  isLoading: boolean;
  onSave: () => void;
  onBack?: () => void;
}

export function ProductFormSidebar({
  sections,
  activeSection,
  onSectionChange,
  isEditMode,
  isLoading,
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

      {/* Botão de Salvar no Rodapé */}
      <div className="p-4 border-t">
        <Button
          type="submit"
          form="product-form"
          className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
          <Save className="h-4 w-4 mr-2" />
              Salvar Produto
            </>
          )}
        </Button>
      </div>
    </div>
  );
}


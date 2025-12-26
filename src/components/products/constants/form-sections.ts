/**
 * Constantes: Configuração de Seções do Formulário
 * 
 * AIDEV-NOTE: Centralização de configuração das seções
 */

import { 
  Package, 
  Barcode, 
  Receipt, 
  Image as ImageIcon, 
  FileText,
  Warehouse,
  LucideIcon,
} from 'lucide-react';
import type { FormSection } from '../types/product-form.types';

// AIDEV-NOTE: Interface simplificada sem JSX
export interface FormSectionConfig {
  id: FormSection;
  label: string;
  icon: LucideIcon;
}

export const FORM_SECTIONS: FormSectionConfig[] = [
  { id: 'dados-gerais', label: 'Dados gerais', icon: Package },
  { id: 'codigos-barras', label: 'Códigos de barras', icon: Barcode },
  { id: 'tributos-fiscais', label: 'Tributos e dados fiscais', icon: Receipt },
  { id: 'imagens', label: 'Imagens do produto', icon: ImageIcon },
  { id: 'informacoes-adicionais', label: 'Informações adicionais', icon: FileText },
  { id: 'estoque', label: 'Estoque', icon: Warehouse },
];


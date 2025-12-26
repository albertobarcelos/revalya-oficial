/**
 * Tipos e Interfaces para Formulário de Produto
 * 
 * AIDEV-NOTE: Centralização de tipos para melhor manutenibilidade
 */

import type { Product } from '@/hooks/useSecureProducts';

// AIDEV-NOTE: Seções do formulário (sidebar navigation)
export type FormSection = 
  | 'dados-gerais'
  | 'codigos-barras'
  | 'tributos-fiscais'
  | 'imagens'
  | 'informacoes-adicionais'
  | 'estoque';

// AIDEV-NOTE: Configuração de seção da sidebar
// AIDEV-NOTE: Icon é um componente LucideIcon, não JSX
import type { LucideIcon } from 'lucide-react';

export interface FormSectionConfig {
  id: FormSection;
  label: string;
  icon: LucideIcon;
}

// AIDEV-NOTE: Dados fiscais do produto
export interface FiscalData {
  // Campos básicos
  ncm: string;
  // AIDEV-NOTE: ncm_id removido - NCM validado via API FocusNFe, não precisa de FK
  cest?: string;
  // AIDEV-NOTE: cest_id removido - CEST não possui API pública, campo será apenas formatado
  product_type_id?: string | null; // AIDEV-NOTE: Foreign key para product_type_reference
  cfop_id: string | null;
  origem: string;
  
  // CSTs com foreign keys
  cst_icms: string;
  cst_icms_id?: string | null; // AIDEV-NOTE: Foreign key para cst_icms_reference
  cst_ipi: string;
  cst_ipi_id?: string | null; // AIDEV-NOTE: Foreign key para cst_ipi_reference
  cst_pis: string;
  cst_pis_id?: string | null; // AIDEV-NOTE: Foreign key para cst_pis_cofins_reference
  cst_cofins: string;
  cst_cofins_id?: string | null; // AIDEV-NOTE: Foreign key para cst_pis_cofins_reference
  
  // Campos adicionais
  use_default_pis_cofins?: boolean;
  aliquota_pis?: string;
  aliquota_cofins?: string;
  cst_ibs_cbs?: string;
  cclass_trib?: string;
}

// AIDEV-NOTE: CFOP válido retornado da API
export interface ValidCFOP {
  id: string;
  code: string;
  description: string;
  is_default: boolean;
}

// AIDEV-NOTE: Props do formulário de produto
export interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess?: () => void;
}

// AIDEV-NOTE: Props compartilhadas entre seções do formulário
export interface FormSectionProps {
  formData: any;
  isEditMode: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: any } }) => void;
  categories?: Array<{ id: string; name: string }>;
  isLoadingCategories?: boolean;
  product?: Product | null; // AIDEV-NOTE: Produto completo para acesso ao ID
  onLoadingChange?: (isLoading: boolean) => void; // AIDEV-NOTE: Callback para notificar mudanças no estado de loading
}

// AIDEV-NOTE: Props específicas para seção de dados gerais
export interface GeneralDataSectionProps extends FormSectionProps {
  brands?: Array<{ id: string; name: string }>;
  isLoadingBrands?: boolean;
  validateCodeExists?: (code: string, productId?: string) => Promise<boolean>;
  productId?: string | undefined; // AIDEV-NOTE: ID do produto para ignorar na validação de código
  nextAvailableCode?: string;
  isLoadingMaxCode?: boolean;
  hasCodeAccess?: boolean;
  createBrand?: (data: { name: string; is_active?: boolean }) => Promise<{ id: string; name: string }>;
  isCreatingBrand?: boolean;
  brandsError?: Error | string | null;
  refetchBrands?: () => Promise<any>;
}

// AIDEV-NOTE: Props específicas para seção de tributos fiscais
export interface FiscalSectionProps extends FormSectionProps {
  fiscalData: FiscalData;
  onFiscalDataChange: (data: Partial<FiscalData>) => void;
  validCFOPs: ValidCFOP[];
  isLoadingCFOPs: boolean;
}


export interface Service {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  default_price: number;
  cost_price?: number; // AIDEV-NOTE: Preço de custo para cálculo de margem
  tax_rate: number;
  tax_code?: string | null;
  municipality_code?: string | null;
  lc_code?: string | null;
  withholding_tax?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  // Campo de compatibilidade
  unit_price?: number;
}

export interface CreateServiceDTO {
  name: string;
  description?: string;
  code?: string;
  default_price: number;
  cost_price?: number; // AIDEV-NOTE: Preço de custo para cálculo de margem
  tax_rate: number;
  tax_code?: string;
  municipality_code?: string;
  lc_code?: string;
  withholding_tax?: boolean;
  is_active: boolean;
  tenant_id?: string;
}

export interface ServiceSelectionItem {
  id: string;
  name: string;
  description?: string | null;
  default_price: number;
  cost_price?: number;
  tax_rate: number;
  is_active: boolean;
  created_at?: string;
  tenant_id?: string;
}

/**
 * AIDEV-NOTE: Tipos centralizados para serviços de contrato
 * Elimina duplicação entre ContractServices.tsx e ContractProducts.tsx
 * 
 * @module features/contracts/types/service
 */

// Tipo principal para serviço selecionado no contrato
export interface SelectedService {
  id: string;
  service_id?: string;
  name: string;
  description?: string;
  unit_price: number;
  cost_price?: number;
  default_price?: number;
  quantity: number;
  total: number;
  
  // AIDEV-NOTE: Unidade de cobrança (hora, dia, mensal, etc.)
  unit_type?: string;
  
  // AIDEV-NOTE: Campos de desconto
  discount_percentage?: number;
  discount_amount?: number;
  
  // Campos financeiros
  payment_method?: string;
  card_type?: string;
  billing_type?: string;
  recurrence_frequency?: string;
  installments?: number;
  
  // Campos de vencimento
  due_type?: DueType;
  due_value?: number;
  due_next_month?: boolean;
  
  // Campo de cobrança
  generate_billing?: boolean;
  
  // Campos de impostos
  nbs_code?: string;
  deduction_value?: number;
  calculation_base?: number;
  iss_rate?: number;
  iss_deduct?: boolean;
  ir_rate?: number;
  ir_deduct?: boolean;
  csll_rate?: number;
  csll_deduct?: boolean;
  inss_rate?: number;
  inss_deduct?: boolean;
  pis_rate?: number;
  pis_deduct?: boolean;
  cofins_rate?: number;
  cofins_deduct?: boolean;
}

// Tipo para produto selecionado no contrato (similar ao serviço)
export interface SelectedProduct {
  id: string;
  product_id?: string;
  name: string;
  description?: string;
  unit_price: number;
  price?: number;
  cost_price?: number;
  default_price?: number;
  quantity: number;
  total_amount: number;
  
  // AIDEV-NOTE: Unidade de medida (unidade, peça, kg, etc.)
  unit_type?: string;
  
  // AIDEV-NOTE: Campos de desconto
  discount_percentage?: number;
  discount_amount?: number;
  
  // Campos financeiros
  payment_method?: string;
  card_type?: string;
  billing_type?: string;
  recurrence_frequency?: string;
  installments?: number;
  
  // Campos de vencimento
  due_type?: DueType;
  due_value?: number;
  due_next_month?: boolean;
  
  // Campo de cobrança
  generate_billing?: boolean;
}

// Tipos de vencimento
export type DueType = 'days_after_billing' | 'fixed_day';

// Tipos de desconto
export type DiscountType = 'percentage' | 'fixed';

// Tipos de cartão
export type CardType = 'credit' | 'credit_recurring' | '';

// Dados financeiros do serviço/produto
export interface FinancialData {
  payment_method: string;
  card_type: string;
  billing_type: string;
  recurrence_frequency: string;
  installments: number;
}

// Dados de impostos e retenções
export interface TaxData {
  nbs_code: string;
  deduction_value: number;
  calculation_base: number;
  iss_rate: number;
  iss_deduct: boolean;
  ir_rate: number;
  ir_deduct: boolean;
  csll_rate: number;
  csll_deduct: boolean;
  inss_rate: number;
  inss_deduct: boolean;
  pis_rate: number;
  pis_deduct: boolean;
  cofins_rate: number;
  cofins_deduct: boolean;
}

// Dados de vencimento
export interface DueDateData {
  due_type: DueType;
  due_value?: number;
  due_next_month: boolean;
}

// Dados de cobrança
export interface BillingData {
  generate_billing: boolean;
}

// Dados de desconto
export interface DiscountData {
  discount_type: DiscountType;
  discount_value: number;
  discount_percentage: number;
  discount_amount: number;
}

// Dados para edição em massa
export interface BulkEditData {
  // Configurações financeiras
  payment_method: string;
  card_type: string;
  billing_type: string;
  recurrence_frequency: string;
  installments: number;
  // Valor unitário
  unit_price: string;
  // Configurações de vencimento
  due_type: DueType;
  due_value?: number;
  due_next_month: boolean;
  // Geração de faturamento
  generate_billing: boolean;
}

// Alterações pendentes de serviço
export interface PendingServiceChanges {
  [serviceId: string]: {
    originalData: SelectedService;
    pendingChanges: Partial<SelectedService>;
    hasChanges: boolean;
    timestamp: number;
  };
}

// Alterações pendentes de produto
export interface PendingProductChanges {
  [productId: string]: {
    originalData: SelectedProduct;
    pendingChanges: Partial<SelectedProduct>;
    hasChanges: boolean;
    timestamp: number;
  };
}

// Props base para componentes de serviço/produto
export interface ServiceComponentProps {
  services: SelectedService[];
  onServicesChange: (services: SelectedService[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export interface ProductComponentProps {
  products: SelectedProduct[];
  onProductsChange: (products: SelectedProduct[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

// Estado de rascunho para inputs do modal
export interface DraftInputState {
  unitPrice: { input: string; draft: number | null };
  costPrice: { input: string; draft: number | null };
  quantity: { input: string; draft: number | null };
}


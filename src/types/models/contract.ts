export type Contract = {
  id: string;
  tenant_id: string;
  customer_id: string;
  contract_number: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'COMPLETED';
  initial_date: string;
  final_date: string;
  billing_type: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'CUSTOM' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual' | 'Único';
  billing_day: number;
  anticipate_weekends?: boolean;
  reference_period?: string;
  installments?: number;
  total_amount: number;
  total_discount?: number;
  total_tax?: number;
  description?: string;
  internal_notes?: string;
  stage_id?: string;
  billed?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Relacionamentos
  customers?: {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  
  stage?: {
    id: string;
    name: string;
    code: string;
    color: string;
    icon?: string;
  };
  
  services?: ContractService[];
  billings?: ContractBilling[];
  attachments?: ContractAttachment[];
};

export type ContractService = {
  id: string;
  contract_id: string;
  service_id: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  is_active: boolean;
  created_at: string;
  
  // Campos de configuração financeira
  payment_method?: string;
  card_type?: string;
  billing_type?: string;
  recurrence_frequency?: string;
  installments?: number;
  
  // Relacionamento
  service?: {
    id: string;
    name: string;
    description?: string;
    code?: string;
  };
};

export type ContractStage = {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string;
  color: string;
  icon?: string;
  sort_order: number;
  is_initial: boolean;
  is_final: boolean;
  created_at: string;
};

export type ContractBilling = {
  id: string;
  contract_id: string;
  tenant_id: string;
  billing_number: string;
  installment_number: number;
  total_installments: number;
  reference_period: string;
  reference_start_date: string;
  reference_end_date: string;
  issue_date: string;
  due_date: string;
  original_due_date: string;
  amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELED';
  payment_date?: string;
  payment_method?: string;
  payment_gateway_id?: string;
  external_id?: string;
  payment_link?: string;
  created_at: string;
  updated_at: string;
  
  // Relacionamentos
  items?: ContractBillingItem[];
  payments?: ContractBillingPayment[];
};

export type ContractBillingItem = {
  id: string;
  billing_id: string;
  contract_service_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  total_amount: number;
  tax_code?: string;
  tax_rate: number;
  tax_amount: number;
  created_at: string;
};

export type ContractBillingPayment = {
  id: string;
  billing_id: string;
  tenant_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  transaction_id?: string;
  payment_gateway_id?: string;
  external_id?: string;
  notes?: string;
  receipt_url?: string;
  created_at: string;
  created_by?: string;
};

export type ContractAttachment = {
  id: string;
  contract_id: string;
  name: string;
  description?: string;
  category?: string;
  file_path: string;
  file_type: string;
  file_size: number;
  is_active: boolean;
  uploaded_at: string;
  uploaded_by?: string;
};

export type Service = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  code?: string;
  default_price: number;
  tax_code?: string;
  tax_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Campo de compatibilidade com versões antigas
  unit_price?: number;
};

export interface CreateServiceDTO {
  name: string;
  description?: string;
  code?: string;
  default_price: number;
  tax_rate: number;
  is_active: boolean;
  tenant_id?: string;
}

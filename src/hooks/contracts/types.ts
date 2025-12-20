// Tipos básicos para contratos

export interface Contract {
  id: string
  tenant_id: string
  customer_id: string
  contract_number: string
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'COMPLETED'
  initial_date: string
  final_date: string
  billing_type: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'CUSTOM'
  billing_day: number
  anticipate_weekends?: boolean
  reference_period?: string
  installments?: number
  total_amount: number
  total_discount?: number
  total_tax?: number
  stage_id?: string
  description?: string
  internal_notes?: string
  billed?: boolean
  // AIDEV-NOTE: Campo para controlar se o contrato deve gerar cobranças automaticamente
  generate_billing?: boolean
  created_at: string
  updated_at: string
  customers?: {
    id: string
    name: string
    company?: string
    email?: string
    phone?: string
  }
  services?: {
    id: string
    name: string
    description?: string
  }
}

export interface ContractStage {
  id: string
  tenant_id: string
  name: string
  color?: string
  order: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ContractService {
  id: string
  tenant_id: string
  contract_id: string
  service_id: string
  quantity: number
  unit_price: number
  discount_percentage?: number
  discount_amount?: number
  total_amount: number
  tax_rate?: number
  tax_amount?: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // AIDEV-NOTE: Campos de configuração financeira
  payment_method?: string
  card_type?: string
  billing_type?: string
  recurrence_frequency?: string
  installments?: number
  payment_gateway?: string
  due_type?: string
  due_value?: number
  due_next_month?: boolean
  due_date_value?: number
  no_charge?: boolean
  generate_billing?: boolean
  services?: {
    id: string
    name: string
    description?: string
  }
}

// AIDEV-NOTE: Interface para produtos do contrato seguindo o padrão dos serviços
export interface ContractProduct {
  id: string
  tenant_id: string
  contract_id: string
  product_id: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
  updated_at: string
  products?: {
    id: string
    name: string
    description?: string
    sku?: string
  }
}

export interface ContractFilters {
  status?: string
  stage_id?: string
  customer_id?: string
  search?: string
}

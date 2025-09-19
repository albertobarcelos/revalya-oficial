export interface ContractService {
  id?: string;
  contract_id?: string;
  service_id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  is_active: boolean;
  // AIDEV-NOTE: Campos de configuração de vencimento
  due_date_type?: 'days_after_billing' | 'fixed_day';
  due_days?: number;
  due_day?: number;
  due_next_month?: boolean;
  service?: {
    id: string;
    name: string;
    description?: string;
    default_price?: number;
    tax_rate?: number;
  };
}

export interface ContractFormValues {
  id?: string;
  contract_number?: string;
  customer_id: string;
  start_date: Date | string;
  end_date: Date | string;
  status: string;
  total_amount: number;
  total_discount: number;
  total_tax: number;
  description?: string;
  internal_notes?: string;
  stage_id?: string;
  billing_day: number;
  installments: number;
  anticipate_weekends: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  services: ContractService[];
}

export interface ContractFormProps {
  mode?: "create" | "edit" | "view";
  contractId?: string;
  onSuccess: (contractId: string) => void;
  onCancel: () => void;
  onFormChange?: (hasChanges: boolean) => void;
  onEditRequest?: (contractId: string) => void;
}

export interface ContractTotals {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export interface ExtendedContractService extends Omit<ContractService, 'id' | 'contract_id' | 'created_at' | 'updated_at'> {
  id?: string;
  contract_id?: string;
  // Campos obrigatórios do ContractService
  name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  is_active: boolean;
  
  // AIDEV-NOTE: Campos de configuração de vencimento
  due_date_type?: 'days_after_billing' | 'fixed_day';
  due_days?: number;
  due_day?: number;
  due_next_month?: boolean;
  
  // Campos adicionais específicos do ExtendedContractService
  tax_code?: string;
  withholding_tax?: boolean;
  created_at?: string;
  updated_at?: string;
  default_price?: number;
  tenant_id?: string; // Para suporte multi-tenant
  
  // Serviço relacionado
  service?: {
    id: string;
    name: string;
    description?: string;
    code?: string;
    default_price?: number;
  };
}

export interface ContractServicesProps {
  services: ExtendedContractService[];
  contractId?: string;
  onAddService?: (serviceData: Omit<Partial<ExtendedContractService>, 'id' | 'contract_id' | 'created_at' | 'updated_at'> & {
    contract_id: string;
    name?: string;
    unit_price?: number;
    service?: {
      name: string;
      default_price?: number;
    };
  }) => ExtendedContractService | null;
  onRemoveService?: (index: number) => void;
}

export interface ContractServicesComponentProps {
  contractId?: string;
  onAddService?: (serviceData: Omit<Partial<ContractService>, 'id' | 'contract_id' | 'created_at'> & {
    contract_id: string;
    name?: string;
    unit_price?: number;
  }) => ContractService | null;
  onRemoveService?: (index: number) => void;
}

export interface ContractFormContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  customers: any[];
  services: any[];
  onClientCreated: () => void;
  contractId: string;
  mode: 'create' | 'edit' | 'view';
  onSuccess: (contractId: string) => void;
  onCancel: () => void;
  onEditRequest?: (contractId: string) => void;
  isFieldLoading: boolean;
}

export interface Customer {
  id: string;
  asaas_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  address: string | null;
  address_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
  company: string | null;
  tenant_id: string;
}

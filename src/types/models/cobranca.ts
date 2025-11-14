import type { Customer } from './customer';

// AIDEV-NOTE: Interface corrigida para refletir a estrutura REAL da tabela charges
export interface Cobranca {
  // Campos que EXISTEM no banco de dados real
  id: string;
  tenant_id: string;
  customer_id: string;
  asaas_id?: string | null; // Campo real do banco
  contract_id?: string | null; // Campo real do banco
  valor: number; // CORRIGIDO: no banco é number, não string
  status?: string | null;
  tipo?: string | null; // Campo real do banco
  data_vencimento: string;
  descricao?: string | null;
  created_at: string; // Campo real do banco
  updated_at?: string | null; // Campo real do banco
  
  // Relacionamento com customer (join)
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    celular_whatsapp?: string;
    cpf_cnpj?: string;
    company?: string;
  };
  
  // Relacionamento com contract (join)
  contract?: {
    id: string;
    contract_number: string;
    customer_id: string;
    status: string;
  };
}

// Definição de tipos para formulários
import type { CreateCustomerDTO } from '@/services/asaas';

// Tipo para o formulário de clientes, estendendo o tipo do Asaas
export interface FormData extends CreateCustomerDTO {
}

export interface ClientFormData {
  name: string;
  cpf_cnpj: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
}

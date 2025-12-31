/**
 * Schemas de validação para dados da empresa
 * AIDEV-NOTE: Validação centralizada usando Zod
 */

import { z } from "zod";

export const companyDataSchema = z.object({
  // Dados básicos
  cnpj: z.string().min(14, "CNPJ inválido"),
  razao_social: z.string().min(3, "Razão social é obrigatória"),
  nome_fantasia: z.string().optional(),
  ddd: z.string().length(2, "DDD deve ter 2 dígitos"),
  telefone: z.string().min(8, "Telefone inválido"),
  
  // Endereço
  logradouro: z.string().min(3, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro é obrigatório"),
  cidade: z.string().min(2, "Cidade é obrigatória"),
  uf: z.string().length(2, "UF deve ter 2 caracteres"),
  cep: z.string().min(8, "CEP inválido"),
  
  // Telefones e E-mail
  ddd_telefone2: z.string().optional(),
  telefone2: z.string().optional(),
  ddd_fax: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  
  // Inscrições e Fiscal
  data_abertura: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  tipo_atividade: z.string().optional(),
  regime_tributario: z.string().optional(),
  cnae_principal: z.string().optional(),
  receita_bruta_12_meses: z.string().optional(),
});

export type CompanyDataForm = z.infer<typeof companyDataSchema>;


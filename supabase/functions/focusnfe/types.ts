/**
 * Tipos e interfaces para Edge Function Focus NFe
 * AIDEV-NOTE: Tipos centralizados para melhor organização
 */

export type Environment = 'homologacao' | 'producao';
export type DocumentType = 'nfe' | 'nfse';

export interface FocusNFeCredentials {
  token: string;
  baseUrl: string;
  authHeader: string;
}

export interface CompanyData {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    codigo_municipio_ibge?: string;
  };
  contato?: {
    ddd?: string;
    telefone?: string;
    email?: string;
  };
  fiscal?: {
    regime_tributario?: string | number;
    cnae_principal?: string;
  };
}

export interface FocusNFeCompanyData {
  cnpj: string;
  nome: string;
  nome_fantasia: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  regime_tributario: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  codigo_municipio?: string;
  telefone?: string;
  email?: string;
  cnae_principal?: string;
  enviar_email_destinatario?: boolean;
  enviar_email_homologacao?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  warning?: string;
}

export interface RateLimitCache {
  count: number;
  resetTime: number;
}


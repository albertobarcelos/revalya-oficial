/**
 * Tipos TypeScript para dados da empresa (company_data) na tabela tenants
 * 
 * AIDEV-NOTE: Estrutura JSONB para armazenar dados fiscais e de empresa
 * necessários para emissão de notas fiscais via FocusNFe
 * 
 * @module TenantCompanyData
 */

/**
 * Regime tributário da empresa
 */
export type RegimeTributario = 
  | 'simples_nacional' 
  | 'lucro_presumido' 
  | 'lucro_real';

/**
 * Estrutura do endereço da empresa
 */
export interface CompanyAddress {
  /** Logradouro (rua, avenida, etc.) */
  logradouro: string;
  /** Número do endereço */
  numero: string;
  /** Complemento (sala, andar, etc.) */
  complemento?: string;
  /** Bairro */
  bairro: string;
  /** Cidade */
  cidade: string;
  /** UF (2 caracteres) */
  uf: string;
  /** CEP (formato: 00000-000) */
  cep: string;
}

/**
 * Dados de contato da empresa
 */
export interface CompanyContact {
  /** Telefone */
  telefone?: string;
  /** Email */
  email?: string;
}

/**
 * Dados fiscais da empresa
 */
export interface CompanyFiscal {
  /** Regime tributário */
  regime_tributario?: RegimeTributario;
  /** CNAE principal */
  cnae_principal?: string;
}

/**
 * Estrutura completa dos dados da empresa (company_data)
 * 
 * AIDEV-NOTE: Esta interface representa a estrutura JSONB
 * armazenada na coluna company_data da tabela tenants
 */
export interface TenantCompanyData {
  /** CNPJ da empresa (obrigatório) */
  cnpj: string;
  /** Razão social (obrigatório) */
  razao_social: string;
  /** Nome fantasia (opcional) */
  nome_fantasia?: string;
  /** Inscrição Estadual (obrigatório para NFe) */
  inscricao_estadual?: string;
  /** Inscrição Municipal (obrigatório para NFSe) */
  inscricao_municipal?: string;
  /** Endereço completo da empresa (obrigatório) */
  endereco: CompanyAddress;
  /** Dados de contato (opcional) */
  contato?: CompanyContact;
  /** Dados fiscais (opcional) */
  fiscal?: CompanyFiscal;
}

/**
 * Resultado da validação dos dados da empresa
 */
export interface CompanyDataValidationResult {
  /** Se os dados estão válidos */
  is_valid: boolean;
  /** Lista de campos faltantes */
  missing_fields: string[];
}

/**
 * Função para validar se os dados da empresa estão completos
 * 
 * @param companyData - Dados da empresa a validar
 * @returns Resultado da validação com lista de campos faltantes
 */
export function validateCompanyData(
  companyData: Partial<TenantCompanyData>
): CompanyDataValidationResult {
  const missing_fields: string[] = [];

  // Validar campos obrigatórios
  if (!companyData.cnpj || companyData.cnpj.trim() === '') {
    missing_fields.push('cnpj');
  }

  if (!companyData.razao_social || companyData.razao_social.trim() === '') {
    missing_fields.push('razao_social');
  }

  // Validar endereço
  if (!companyData.endereco) {
    missing_fields.push('endereco');
  } else {
    const { endereco } = companyData;
    
    if (!endereco.logradouro || endereco.logradouro.trim() === '') {
      missing_fields.push('endereco.logradouro');
    }
    
    if (!endereco.numero || endereco.numero.trim() === '') {
      missing_fields.push('endereco.numero');
    }
    
    if (!endereco.bairro || endereco.bairro.trim() === '') {
      missing_fields.push('endereco.bairro');
    }
    
    if (!endereco.cidade || endereco.cidade.trim() === '') {
      missing_fields.push('endereco.cidade');
    }
    
    if (!endereco.uf || endereco.uf.trim() === '' || endereco.uf.length !== 2) {
      missing_fields.push('endereco.uf');
    }
    
    if (!endereco.cep || endereco.cep.trim() === '') {
      missing_fields.push('endereco.cep');
    }
  }

  return {
    is_valid: missing_fields.length === 0,
    missing_fields
  };
}

/**
 * Função para validar se os dados estão completos para emissão de NFe
 * 
 * @param companyData - Dados da empresa a validar
 * @returns Resultado da validação
 */
export function validateCompanyDataForNFe(
  companyData: Partial<TenantCompanyData>
): CompanyDataValidationResult {
  const result = validateCompanyData(companyData);
  
  // Para NFe, também precisa de inscrição estadual
  if (result.is_valid && (!companyData.inscricao_estadual || companyData.inscricao_estadual.trim() === '')) {
    return {
      is_valid: false,
      missing_fields: [...result.missing_fields, 'inscricao_estadual']
    };
  }
  
  return result;
}

/**
 * Função para validar se os dados estão completos para emissão de NFSe
 * 
 * @param companyData - Dados da empresa a validar
 * @returns Resultado da validação
 */
export function validateCompanyDataForNFSe(
  companyData: Partial<TenantCompanyData>
): CompanyDataValidationResult {
  const result = validateCompanyData(companyData);
  
  // Para NFSe, também precisa de inscrição municipal
  if (result.is_valid && (!companyData.inscricao_municipal || companyData.inscricao_municipal.trim() === '')) {
    return {
      is_valid: false,
      missing_fields: [...result.missing_fields, 'inscricao_municipal']
    };
  }
  
  return result;
}

/**
 * Função auxiliar para formatar CNPJ (remover caracteres especiais)
 * 
 * @param cnpj - CNPJ com ou sem formatação
 * @returns CNPJ apenas com números
 */
export function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Função auxiliar para formatar CEP (remover caracteres especiais)
 * 
 * @param cep - CEP com ou sem formatação
 * @returns CEP apenas com números
 */
export function formatCEP(cep: string): string {
  return cep.replace(/\D/g, '');
}

/**
 * Função auxiliar para formatar CEP com máscara (00000-000)
 * 
 * @param cep - CEP sem formatação
 * @returns CEP formatado
 */
export function formatCEPWithMask(cep: string): string {
  const numbers = formatCEP(cep);
  if (numbers.length === 8) {
    return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
  }
  return cep;
}


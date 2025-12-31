/**
 * Utilitários para manipulação de dados de empresa
 * AIDEV-NOTE: Lógica de mapeamento e validação de empresa
 */

import type { CompanyData, FocusNFeCompanyData, Environment } from "../types.ts";
import { REGIME_TRIBUTARIO_MAP, REGIME_TRIBUTARIO_DEFAULT, CAMPOS_OBRIGATORIOS_EMPRESA } from "../constants.ts";

/**
 * Mapeia regime tributário do Revalya para código do Focus NFe
 */
export function mapRegimeTributario(regimeTributario?: string | number): string {
  if (!regimeTributario) {
    return REGIME_TRIBUTARIO_DEFAULT;
  }
  
  const regime = String(regimeTributario).trim().toLowerCase();
  
  if (!regime || regime === 'null' || regime === 'undefined' || regime === '') {
    return REGIME_TRIBUTARIO_DEFAULT;
  }
  
  const mapped = REGIME_TRIBUTARIO_MAP[regime] || regime;
  
  // Se não encontrou no mapeamento e não é numérico, usar default
  if (!/^\d+$/.test(mapped)) {
    return REGIME_TRIBUTARIO_DEFAULT;
  }
  
  return mapped;
}

/**
 * Converte dados da empresa do Revalya para formato Focus NFe
 */
export function mapCompanyDataToFocusNFe(
  empresaData: CompanyData,
  includeEmailSettings = false
): FocusNFeCompanyData {
  const cnpjClean = empresaData.cnpj.replace(/\D/g, '');
  const regimeTributario = mapRegimeTributario(empresaData.fiscal?.regime_tributario);
  
  const focusNFeData: FocusNFeCompanyData = {
    cnpj: cnpjClean,
    nome: empresaData.razao_social,
    nome_fantasia: empresaData.nome_fantasia || empresaData.razao_social,
    inscricao_estadual: empresaData.inscricao_estadual || '',
    inscricao_municipal: empresaData.inscricao_municipal || '',
    regime_tributario: regimeTributario,
  };
  
  // Endereço
  if (empresaData.endereco) {
    focusNFeData.logradouro = empresaData.endereco.logradouro || '';
    focusNFeData.numero = empresaData.endereco.numero || '';
    focusNFeData.complemento = empresaData.endereco.complemento || '';
    focusNFeData.bairro = empresaData.endereco.bairro || '';
    focusNFeData.municipio = empresaData.endereco.cidade || '';
    focusNFeData.uf = empresaData.endereco.uf || '';
    focusNFeData.cep = empresaData.endereco.cep?.replace(/\D/g, '') || '';
    
    if (empresaData.endereco.codigo_municipio_ibge) {
      focusNFeData.codigo_municipio = empresaData.endereco.codigo_municipio_ibge;
    }
  }
  
  // Contato
  if (empresaData.contato) {
    const telefone = empresaData.contato.ddd && empresaData.contato.telefone
      ? `${empresaData.contato.ddd}${empresaData.contato.telefone}`.replace(/\D/g, '')
      : '';
    
    if (telefone) {
      focusNFeData.telefone = telefone;
    }
    
    if (empresaData.contato.email) {
      focusNFeData.email = empresaData.contato.email;
    }
  }
  
  // CNAE principal
  if (empresaData.fiscal?.cnae_principal) {
    focusNFeData.cnae_principal = empresaData.fiscal.cnae_principal;
  }
  
  // Configurações de email (apenas na criação)
  if (includeEmailSettings) {
    focusNFeData.enviar_email_destinatario = false;
    focusNFeData.enviar_email_homologacao = false;
  }
  
  return focusNFeData;
}

/**
 * Valida campos obrigatórios da empresa
 */
export function validateRequiredFields(data: FocusNFeCompanyData): string[] {
  return CAMPOS_OBRIGATORIOS_EMPRESA.filter(
    campo => !data[campo as keyof FocusNFeCompanyData] || 
    String(data[campo as keyof FocusNFeCompanyData]).trim() === ''
  );
}

/**
 * Mascara CNPJ para logs (segurança)
 */
export function maskCnpj(cnpj: string): string {
  if (cnpj.length < 14) return cnpj;
  return `${cnpj.substring(0, 2)}.***.***/****-${cnpj.substring(12)}`;
}


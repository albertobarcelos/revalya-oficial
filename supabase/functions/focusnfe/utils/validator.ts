// =====================================================
// FOCUSNFE VALIDATORS
// Descrição: Validadores de dados para FocusNFe
// Autor: Revalya AI Agent
// Data: 2025-12-14
// =====================================================

import { 
  NFePayload, 
  NFSePayload, 
  NFeItem, 
  ServicoConfig,
  EmitenteConfig
} from '../types.ts';

// =====================================================
// VALIDADORES DE DOCUMENTOS
// =====================================================

/**
 * AIDEV-NOTE: Valida CNPJ
 */
export function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const numeros = cnpj.replace(/\D/g, '');
  
  if (numeros.length !== 14) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numeros)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  let peso = 5;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(numeros[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  
  if (parseInt(numeros[12]) !== digito1) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  soma = 0;
  peso = 6;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(numeros[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  
  return parseInt(numeros[13]) === digito2;
}

/**
 * AIDEV-NOTE: Valida CPF
 */
export function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const numeros = cpf.replace(/\D/g, '');
  
  if (numeros.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numeros)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  const digito1 = resto === 10 ? 0 : resto;
  
  if (parseInt(numeros[9]) !== digito1) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  const digito2 = resto === 10 ? 0 : resto;
  
  return parseInt(numeros[10]) === digito2;
}

// =====================================================
// VALIDADORES DE NFE
// =====================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * AIDEV-NOTE: Valida payload de NFe
 */
export function validarNFe(payload: Partial<NFePayload>): ValidationResult {
  const errors: string[] = [];

  // Campos obrigatórios
  if (!payload.natureza_operacao) {
    errors.push('natureza_operacao é obrigatório');
  }

  if (!payload.data_emissao) {
    errors.push('data_emissao é obrigatório');
  }

  if (!payload.cnpj_emitente) {
    errors.push('cnpj_emitente é obrigatório');
  } else if (!validarCNPJ(payload.cnpj_emitente)) {
    errors.push('cnpj_emitente inválido');
  }

  // Validar destinatário
  if (!payload.cpf_destinatario && !payload.cnpj_destinatario) {
    errors.push('cpf_destinatario ou cnpj_destinatario é obrigatório');
  } else {
    if (payload.cpf_destinatario && !validarCPF(payload.cpf_destinatario)) {
      errors.push('cpf_destinatario inválido');
    }
    if (payload.cnpj_destinatario && !validarCNPJ(payload.cnpj_destinatario)) {
      errors.push('cnpj_destinatario inválido');
    }
  }

  if (!payload.nome_destinatario) {
    errors.push('nome_destinatario é obrigatório');
  }

  // Endereço do destinatário
  if (!payload.logradouro_destinatario) {
    errors.push('logradouro_destinatario é obrigatório');
  }
  if (!payload.numero_destinatario) {
    errors.push('numero_destinatario é obrigatório');
  }
  if (!payload.bairro_destinatario) {
    errors.push('bairro_destinatario é obrigatório');
  }
  if (!payload.codigo_municipio_destinatario) {
    errors.push('codigo_municipio_destinatario é obrigatório');
  }
  if (!payload.uf_destinatario) {
    errors.push('uf_destinatario é obrigatório');
  }

  // Validar itens
  if (!payload.itens || payload.itens.length === 0) {
    errors.push('Ao menos um item é obrigatório');
  } else {
    payload.itens.forEach((item, index) => {
      const itemErrors = validarNFeItem(item, index);
      errors.push(...itemErrors);
    });
  }

  // Validar formas de pagamento
  if (!payload.formas_pagamento || payload.formas_pagamento.length === 0) {
    errors.push('Ao menos uma forma de pagamento é obrigatória');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * AIDEV-NOTE: Valida item de NFe
 */
export function validarNFeItem(item: Partial<NFeItem>, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Item ${index + 1}:`;

  if (!item.codigo_produto) {
    errors.push(`${prefix} codigo_produto é obrigatório`);
  }
  if (!item.descricao) {
    errors.push(`${prefix} descricao é obrigatório`);
  }
  if (!item.ncm) {
    errors.push(`${prefix} ncm é obrigatório`);
  } else if (item.ncm.length !== 8) {
    errors.push(`${prefix} ncm deve ter 8 dígitos`);
  }
  if (!item.cfop) {
    errors.push(`${prefix} cfop é obrigatório`);
  } else if (item.cfop.length !== 4) {
    errors.push(`${prefix} cfop deve ter 4 dígitos`);
  }
  if (!item.unidade_comercial) {
    errors.push(`${prefix} unidade_comercial é obrigatório`);
  }
  if (item.quantidade_comercial === undefined || item.quantidade_comercial <= 0) {
    errors.push(`${prefix} quantidade_comercial deve ser maior que 0`);
  }
  if (item.valor_unitario_comercial === undefined || item.valor_unitario_comercial < 0) {
    errors.push(`${prefix} valor_unitario_comercial inválido`);
  }
  if (item.valor_bruto === undefined || item.valor_bruto < 0) {
    errors.push(`${prefix} valor_bruto inválido`);
  }

  // ICMS
  if (item.icms_origem === undefined) {
    errors.push(`${prefix} icms_origem é obrigatório`);
  }
  if (!item.icms_situacao_tributaria) {
    errors.push(`${prefix} icms_situacao_tributaria é obrigatório`);
  }

  // PIS
  if (!item.pis_situacao_tributaria) {
    errors.push(`${prefix} pis_situacao_tributaria é obrigatório`);
  }

  // COFINS
  if (!item.cofins_situacao_tributaria) {
    errors.push(`${prefix} cofins_situacao_tributaria é obrigatório`);
  }

  return errors;
}

// =====================================================
// VALIDADORES DE NFSE
// =====================================================

/**
 * AIDEV-NOTE: Valida payload de NFSe
 */
export function validarNFSe(payload: Partial<NFSePayload>): ValidationResult {
  const errors: string[] = [];

  // Campos obrigatórios
  if (!payload.data_emissao) {
    errors.push('data_emissao é obrigatório');
  }

  // Validar prestador
  if (!payload.prestador) {
    errors.push('prestador é obrigatório');
  } else {
    if (!payload.prestador.cnpj) {
      errors.push('prestador.cnpj é obrigatório');
    } else if (!validarCNPJ(payload.prestador.cnpj)) {
      errors.push('prestador.cnpj inválido');
    }
    if (!payload.prestador.inscricao_municipal) {
      errors.push('prestador.inscricao_municipal é obrigatório');
    }
    if (!payload.prestador.codigo_municipio) {
      errors.push('prestador.codigo_municipio é obrigatório');
    }
  }

  // Validar tomador
  if (!payload.tomador) {
    errors.push('tomador é obrigatório');
  } else {
    if (!payload.tomador.cpf && !payload.tomador.cnpj) {
      errors.push('tomador.cpf ou tomador.cnpj é obrigatório');
    } else {
      if (payload.tomador.cpf && !validarCPF(payload.tomador.cpf)) {
        errors.push('tomador.cpf inválido');
      }
      if (payload.tomador.cnpj && !validarCNPJ(payload.tomador.cnpj)) {
        errors.push('tomador.cnpj inválido');
      }
    }
    if (!payload.tomador.razao_social) {
      errors.push('tomador.razao_social é obrigatório');
    }
    if (!payload.tomador.email) {
      errors.push('tomador.email é obrigatório');
    }
    
    // Endereço do tomador
    if (!payload.tomador.endereco) {
      errors.push('tomador.endereco é obrigatório');
    } else {
      if (!payload.tomador.endereco.logradouro) {
        errors.push('tomador.endereco.logradouro é obrigatório');
      }
      if (!payload.tomador.endereco.numero) {
        errors.push('tomador.endereco.numero é obrigatório');
      }
      if (!payload.tomador.endereco.bairro) {
        errors.push('tomador.endereco.bairro é obrigatório');
      }
      if (!payload.tomador.endereco.codigo_municipio) {
        errors.push('tomador.endereco.codigo_municipio é obrigatório');
      }
      if (!payload.tomador.endereco.uf) {
        errors.push('tomador.endereco.uf é obrigatório');
      }
    }
  }

  // Validar serviço
  if (!payload.servico) {
    errors.push('servico é obrigatório');
  } else {
    const servicoErrors = validarServico(payload.servico);
    errors.push(...servicoErrors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * AIDEV-NOTE: Valida serviço de NFSe
 */
export function validarServico(servico: Partial<ServicoConfig>): string[] {
  const errors: string[] = [];

  if (servico.aliquota === undefined || servico.aliquota < 0) {
    errors.push('servico.aliquota inválida');
  }
  if (!servico.discriminacao) {
    errors.push('servico.discriminacao é obrigatório');
  }
  if (servico.iss_retido === undefined) {
    errors.push('servico.iss_retido é obrigatório');
  }
  if (!servico.item_lista_servico) {
    errors.push('servico.item_lista_servico é obrigatório');
  }
  if (servico.valor_servicos === undefined || servico.valor_servicos <= 0) {
    errors.push('servico.valor_servicos deve ser maior que 0');
  }
  if (!servico.codigo_municipio) {
    errors.push('servico.codigo_municipio é obrigatório');
  }

  return errors;
}

// =====================================================
// VALIDADORES DE EMITENTE
// =====================================================

/**
 * AIDEV-NOTE: Valida configuração do emitente
 */
export function validarEmitente(emitente: Partial<EmitenteConfig>): ValidationResult {
  const errors: string[] = [];

  if (!emitente.cnpj) {
    errors.push('emitente.cnpj é obrigatório');
  } else if (!validarCNPJ(emitente.cnpj)) {
    errors.push('emitente.cnpj inválido');
  }

  if (!emitente.razao_social) {
    errors.push('emitente.razao_social é obrigatório');
  }

  if (!emitente.inscricao_estadual) {
    errors.push('emitente.inscricao_estadual é obrigatório');
  }

  if (!emitente.endereco) {
    errors.push('emitente.endereco é obrigatório');
  } else {
    if (!emitente.endereco.logradouro) {
      errors.push('emitente.endereco.logradouro é obrigatório');
    }
    if (!emitente.endereco.numero) {
      errors.push('emitente.endereco.numero é obrigatório');
    }
    if (!emitente.endereco.bairro) {
      errors.push('emitente.endereco.bairro é obrigatório');
    }
    if (!emitente.endereco.codigo_municipio) {
      errors.push('emitente.endereco.codigo_municipio é obrigatório');
    }
    if (!emitente.endereco.municipio) {
      errors.push('emitente.endereco.municipio é obrigatório');
    }
    if (!emitente.endereco.uf) {
      errors.push('emitente.endereco.uf é obrigatório');
    }
    if (!emitente.endereco.cep) {
      errors.push('emitente.endereco.cep é obrigatório');
    }
  }

  if (!emitente.regime_tributario) {
    errors.push('emitente.regime_tributario é obrigatório');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// =====================================================
// UTILITÁRIOS
// =====================================================

/**
 * AIDEV-NOTE: Gera referência única para documento fiscal
 * Formato: {tipo}-{tenant_id_short}-{timestamp}-{random}
 */
export function gerarReferencia(
  tipo: 'nfe' | 'nfse' | 'nfce',
  tenantId: string,
  financeEntryId?: string
): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const tenantShort = tenantId.substring(0, 8);
  
  // AIDEV-NOTE: Se tiver finance_entry_id, incluir para rastreabilidade
  if (financeEntryId) {
    const entryShort = financeEntryId.substring(0, 8);
    return `${tipo}-${tenantShort}-${entryShort}-${timestamp}`;
  }
  
  return `${tipo}-${tenantShort}-${timestamp}-${random}`;
}

/**
 * AIDEV-NOTE: Formata CNPJ para exibição
 */
export function formatarCNPJ(cnpj: string): string {
  const numeros = cnpj.replace(/\D/g, '');
  return numeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * AIDEV-NOTE: Formata CPF para exibição
 */
export function formatarCPF(cpf: string): string {
  const numeros = cpf.replace(/\D/g, '');
  return numeros.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4'
  );
}

/**
 * AIDEV-NOTE: Remove formatação de documento (CNPJ/CPF)
 */
export function limparDocumento(documento: string): string {
  return documento.replace(/\D/g, '');
}

/**
 * AIDEV-NOTE: Valida código municipal IBGE (7 dígitos)
 */
export function validarCodigoMunicipio(codigo: string): boolean {
  const numeros = codigo.replace(/\D/g, '');
  return numeros.length === 7;
}

/**
 * AIDEV-NOTE: Valida NCM (8 dígitos)
 */
export function validarNCM(ncm: string): boolean {
  const numeros = ncm.replace(/\D/g, '');
  return numeros.length === 8;
}

/**
 * AIDEV-NOTE: Valida CFOP (4 dígitos)
 */
export function validarCFOP(cfop: string): boolean {
  const numeros = cfop.replace(/\D/g, '');
  return numeros.length === 4;
}

/**
 * AIDEV-NOTE: Valida NBS (9 dígitos) - Reforma Tributária
 */
export function validarNBS(nbs: string): boolean {
  const numeros = nbs.replace(/\D/g, '');
  return numeros.length === 9;
}

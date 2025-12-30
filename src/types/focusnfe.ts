/**
 * Tipos TypeScript para integração com FocusNFe
 * 
 * AIDEV-NOTE: Interfaces para emissão de NFe e NFSe via API FocusNFe
 * Documentação: https://doc.focusnfe.com.br/reference/introducao
 * 
 * @module FocusNFeTypes
 */

// =====================================================
// TIPOS GERAIS
// =====================================================

/**
 * Status de processamento da nota fiscal
 */
export type FocusNFeStatus = 
  | 'processando'
  | 'autorizado'
  | 'cancelado'
  | 'erro_autorizacao'
  | 'denegado';

/**
 * Ambiente da API FocusNFe
 */
export type FocusNFeEnvironment = 'homologacao' | 'producao';

/**
 * Tipo de documento fiscal
 */
export type InvoiceType = 'nfe' | 'nfse';

// =====================================================
// NFE - NOTA FISCAL ELETRÔNICA
// =====================================================

/**
 * Endereço para NFe
 */
export interface NFeEndereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  codigo_pais?: string; // Padrão: 1058 (Brasil)
  pais?: string; // Padrão: Brasil
}

/**
 * Produto na NFe
 */
export interface NFeProduto {
  codigo: string;
  descricao: string;
  ncm: string; // NCM (8 dígitos)
  cfop: string; // CFOP (4 dígitos)
  unidade: string; // Ex: "UN", "KG", "CX"
  quantidade: number;
  valor_unitario: number;
  valor_total?: number; // Calculado se omitido
  
  // ICMS
  icms_origem: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  icms_situacao_tributaria: string; // Ex: "00", "40", "41"
  icms_base_calculo?: number;
  icms_aliquota?: number;
  icms_valor?: number;
  
  // IPI (opcional)
  ipi_situacao_tributaria?: string;
  ipi_base_calculo?: number;
  ipi_aliquota?: number;
  ipi_valor?: number;
  
  // PIS
  pis_situacao_tributaria: string; // Ex: "01", "07", "08"
  pis_base_calculo?: number;
  pis_aliquota?: number;
  pis_valor?: number;
  
  // COFINS
  cofins_situacao_tributaria: string; // Ex: "01", "07", "08"
  cofins_base_calculo?: number;
  cofins_aliquota?: number;
  cofins_valor?: number;
  
  // Outros campos
  cest?: string; // CEST (7 dígitos)
  codigo_barras?: string;
  valor_frete?: number;
  valor_seguro?: number;
  valor_desconto?: number;
  valor_outras_despesas?: number;
}

/**
 * Forma de pagamento na NFe
 */
export interface NFeFormaPagamento {
  forma_pagamento: string; // "01"=Dinheiro, "03"=Cartão, "15"=Boleto, etc.
  valor_pagamento: number;
  tipo_integracao?: '1' | '2'; // 1=Integrado, 2=Não integrado
  cnpj_credenciadora?: string;
  bandeira_operadora?: string;
  numero_autorizacao?: string;
}

/**
 * Payload completo para emissão de NFe
 */
export interface NFePayload {
  // Dados gerais
  natureza_operacao: string; // Ex: "Venda de mercadoria"
  data_emissao: string; // ISO 8601: "2025-01-15T10:30:00-03:00"
  data_entrada_saida?: string; // ISO 8601
  tipo_documento: '0' | '1'; // 0=Entrada, 1=Saída
  finalidade_emissao: '1' | '2' | '3' | '4'; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  consumidor_final: '0' | '1'; // 0=Não, 1=Sim
  indicador_presenca: '0' | '1' | '2' | '3' | '4' | '5' | '9';
  
  // Emitente
  cnpj_emitente: string; // 14 dígitos
  cpf_emitente?: string; // 11 dígitos (produtor rural)
  
  // Destinatário
  cpf_destinatario?: string; // 11 dígitos
  cnpj_destinatario?: string; // 14 dígitos
  nome_destinatario: string;
  inscricao_estadual_destinatario?: string;
  indicador_inscricao_estadual_destinatario: '1' | '2' | '9';
  endereco_destinatario: NFeEndereco;
  telefone_destinatario?: string;
  email_destinatario?: string;
  
  // Produtos
  produtos: NFeProduto[];
  
  // Totalizadores
  valor_produtos?: number;
  valor_desconto?: number;
  valor_frete?: number;
  valor_seguro?: number;
  valor_outras_despesas?: number;
  valor_total: number;
  
  // Transporte
  modalidade_frete: '0' | '1' | '2' | '3' | '4' | '9';
  transportador?: {
    cnpj?: string;
    cpf?: string;
    nome?: string;
    inscricao_estadual?: string;
    endereco?: string;
    municipio?: string;
    uf?: string;
  };
  
  // Formas de pagamento
  formas_pagamento: NFeFormaPagamento[];
  
  // Informações adicionais
  informacoes_adicionais_contribuinte?: string;
  informacoes_adicionais_fisco?: string;
}

/**
 * Resposta da API FocusNFe para NFe
 */
export interface NFeResponse {
  // Resposta inicial (processando)
  status: FocusNFeStatus;
  referencia: string;
  caminho?: string;
  
  // Resposta após autorização
  numero?: string;
  serie?: string;
  chave_nfe?: string;
  data_emissao?: string;
  data_autorizacao?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  
  // Erros
  codigo?: string;
  mensagem?: string;
  erros?: Array<{
    campo: string;
    mensagem: string;
  }>;
}

// =====================================================
// NFSE - NOTA FISCAL DE SERVIÇOS
// =====================================================

/**
 * Endereço para NFSe
 */
export interface NFSeEndereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigo_municipio: string; // Código IBGE (7 dígitos)
  uf: string;
  cep: string;
}

/**
 * Prestador na NFSe
 */
export interface NFSePrestador {
  cnpj: string; // 14 dígitos
  inscricao_municipal: string;
  codigo_municipio: string; // Código IBGE (7 dígitos)
}

/**
 * Tomador na NFSe
 */
export interface NFSeTomador {
  cpf?: string; // 11 dígitos
  cnpj?: string; // 14 dígitos
  razao_social: string;
  inscricao_municipal?: string;
  email: string;
  telefone?: string;
  endereco: NFSeEndereco;
}

/**
 * Serviço na NFSe
 */
export interface NFSeServico {
  aliquota: number; // Ex: 0.05 = 5%
  discriminacao: string; // Descrição detalhada do serviço
  iss_retido: boolean;
  item_lista_servico: string; // Código LC 116/2003 (Ex: "14.01", "17.01")
  valor_servicos: number;
  codigo_municipio: string; // Código IBGE do município de prestação
  codigo_cnae?: string; // 7 dígitos
  
  // Valores opcionais
  valor_deducoes?: number;
  valor_pis?: number;
  valor_cofins?: number;
  valor_inss?: number;
  valor_ir?: number;
  valor_csll?: number;
  desconto_incondicionado?: number;
  desconto_condicionado?: number;
  
  // Código de tributação municipal (específico de cada cidade)
  codigo_tributacao_municipio?: string;
}

/**
 * Payload completo para emissão de NFSe
 */
export interface NFSePayload {
  // Dados gerais
  data_emissao: string; // ISO 8601
  natureza_operacao: '1' | '2' | '3' | '4' | '5' | '6';
  optante_simples_nacional: boolean;
  incentivador_cultural: boolean;
  status: '1' | '2'; // 1=Normal, 2=Cancelado
  
  // Prestador
  prestador: NFSePrestador;
  
  // Tomador
  tomador: NFSeTomador;
  
  // Serviço
  servico: NFSeServico;
  
  // Construção civil (opcional)
  construcao_civil?: {
    codigo_obra?: string;
    art?: string;
  };
  
  // Intermediário (opcional)
  intermediario?: {
    cpf?: string;
    cnpj?: string;
    razao_social?: string;
    inscricao_municipal?: string;
  };
}

/**
 * Resposta da API FocusNFe para NFSe
 */
export interface NFSeResponse {
  // Resposta inicial (processando)
  status: FocusNFeStatus;
  referencia: string;
  caminho?: string;
  
  // Resposta após autorização
  numero?: string;
  codigo_verificacao?: string;
  data_emissao?: string;
  data_autorizacao?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_pdf?: string;
  
  // Erros
  codigo?: string;
  mensagem?: string;
  erros?: Array<{
    campo: string;
    mensagem: string;
  }>;
}

// =====================================================
// REQUISIÇÕES PARA EDGE FUNCTION
// =====================================================

/**
 * Requisição para emitir NFe via Edge Function
 */
export interface EmitNFeRequest {
  referencia: string;
  dados_nfe: NFePayload;
  finance_entry_id?: string;
  environment?: FocusNFeEnvironment;
  tenant_id?: string;
}

/**
 * Requisição para emitir NFSe via Edge Function
 */
export interface EmitNFSeRequest {
  referencia: string;
  dados_nfse: NFSePayload;
  finance_entry_id?: string;
  environment?: FocusNFeEnvironment;
  tenant_id?: string;
}

/**
 * Requisição para consultar status
 */
export interface ConsultStatusRequest {
  referencia: string;
  tipo: InvoiceType;
  tenant_id?: string;
}

/**
 * Requisição para cancelar nota
 */
export interface CancelInvoiceRequest {
  referencia: string;
  tipo: InvoiceType;
  justificativa: string;
  tenant_id?: string;
}

// =====================================================
// RESPOSTAS DA EDGE FUNCTION
// =====================================================

/**
 * Resposta genérica da Edge Function
 */
export interface FocusNFeEdgeResponse<T = any> {
  success: boolean;
  error?: string;
  detalhes?: any;
  data?: T;
}

/**
 * Resposta de emissão
 */
export interface EmitInvoiceResponse extends FocusNFeEdgeResponse {
  referencia?: string;
  status?: FocusNFeStatus;
  caminho?: string;
}

/**
 * Resposta de consulta
 */
export interface ConsultStatusResponse extends FocusNFeEdgeResponse {
  status?: FocusNFeStatus;
  referencia?: string;
  numero?: string;
  serie?: string;
  chave_nfe?: string;
  codigo_verificacao?: string;
  data_emissao?: string;
  data_autorizacao?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  caminho_pdf?: string;
}

/**
 * Resposta de cancelamento
 */
export interface CancelInvoiceResponse extends FocusNFeEdgeResponse {
  status?: FocusNFeStatus;
  data_cancelamento?: string;
}

// =====================================================
// MAPEAMENTO REVALYA → FOCUSNFE
// =====================================================

/**
 * Dados do emitente (empresa) do Revalya
 */
export interface RevalyaEmitente {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  contato?: {
    telefone?: string;
    email?: string;
  };
  fiscal?: {
    regime_tributario?: string;
    cnae_principal?: string;
  };
}

/**
 * Dados do cliente (destinatário/tomador) do Revalya
 */
export interface RevalyaCliente {
  name: string;
  cpf_cnpj: string;
  email?: string;
  phone?: string;
  address?: string;
  address_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

/**
 * Dados do produto do Revalya
 */
export interface RevalyaProduto {
  id: string;
  name: string;
  code?: string;
  sku?: string;
  ncm?: string;
  cfop?: string;
  origem?: string;
  unit_of_measure?: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  cst_icms?: string;
  cst_ipi?: string;
  cst_pis?: string;
  cst_cofins?: string;
  tax_rate?: number;
}

/**
 * Dados do serviço do Revalya
 */
export interface RevalyaServico {
  id: string;
  name: string;
  code?: string;
  codigo_servico_lc116?: string;
  municipio_prestacao_ibge?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  tax_rate?: number; // Alíquota ISS
}


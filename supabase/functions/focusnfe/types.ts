// =====================================================
// FOCUSNFE TYPES
// Descrição: Tipos TypeScript para integração FocusNFe
// Autor: Revalya AI Agent
// Data: 2025-12-14
// =====================================================

// =====================================================
// CONFIGURAÇÃO E CREDENCIAIS
// =====================================================

export interface FocusNFeCredentials {
  token: string;
  ambiente: 'homologacao' | 'producao';
  tenant_id: string;
}

export interface FocusNFeConfig {
  token: string;
  ambiente: 'homologacao' | 'producao';
  emitente: EmitenteConfig;
  fiscal_defaults?: FiscalDefaults;
  webhook_url?: string;
}

export interface EmitenteConfig {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual: string;
  inscricao_municipal?: string;
  endereco: EnderecoConfig;
  regime_tributario: '1' | '2' | '3';
  cnae_principal?: string;
  email_emitente?: string;
}

export interface EnderecoConfig {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigo_municipio: string;
  municipio: string;
  uf: string;
  cep: string;
  codigo_pais?: string;
  pais?: string;
  telefone?: string;
}

export interface FiscalDefaults {
  nfe?: NFeDefaults;
  nfse?: NFSeDefaults;
}

export interface NFeDefaults {
  serie?: string;
  natureza_operacao?: string;
  tipo_documento?: '0' | '1';
  indicador_presenca?: string;
  finalidade_emissao?: string;
  consumidor_final?: '0' | '1';
  modalidade_frete?: string;
}

export interface NFSeDefaults {
  natureza_operacao?: '1' | '2' | '3' | '4' | '5' | '6';
  optante_simples_nacional?: boolean;
  incentivador_cultural?: boolean;
  regime_especial_tributacao?: string;
}

// =====================================================
// NFE - NOTA FISCAL ELETRÔNICA (PRODUTOS)
// =====================================================

export interface NFePayload {
  // Dados gerais
  natureza_operacao: string;
  data_emissao: string;
  data_entrada_saida?: string;
  tipo_documento: '0' | '1';
  finalidade_emissao: '1' | '2' | '3' | '4' | '5' | '6';
  consumidor_final: '0' | '1';
  indicador_presenca: '0' | '1' | '2' | '3' | '4' | '5' | '9';

  // Emitente
  cnpj_emitente: string;
  cpf_emitente?: string;

  // Destinatário
  cpf_destinatario?: string;
  cnpj_destinatario?: string;
  nome_destinatario: string;
  inscricao_estadual_destinatario?: string;
  indicador_inscricao_estadual_destinatario: '1' | '2' | '9';
  
  // Endereço destinatário
  logradouro_destinatario: string;
  numero_destinatario: string;
  complemento_destinatario?: string;
  bairro_destinatario: string;
  codigo_municipio_destinatario: string;
  municipio_destinatario: string;
  uf_destinatario: string;
  cep_destinatario?: string;
  telefone_destinatario?: string;
  email_destinatario?: string;

  // Itens
  itens: NFeItem[];

  // Totalizadores
  valor_produtos?: number;
  valor_desconto?: number;
  valor_frete?: number;
  valor_seguro?: number;
  valor_outras_despesas?: number;
  valor_total?: number;

  // Transporte
  modalidade_frete: '0' | '1' | '2' | '3' | '4' | '9';
  transportador?: TransportadorConfig;
  volumes?: VolumeConfig[];

  // Pagamento
  formas_pagamento: FormaPagamento[];

  // Informações adicionais
  informacoes_adicionais_contribuinte?: string;
  informacoes_adicionais_fisco?: string;

  // Reforma Tributária 2026+
  ibs_cbs?: IBSCBS;
}

export interface NFeItem {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  ncm: string;
  cest?: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_bruto: number;

  // Unidade tributável
  unidade_tributavel?: string;
  quantidade_tributavel?: number;
  valor_unitario_tributavel?: number;

  // Valores adicionais
  valor_frete?: number;
  valor_seguro?: number;
  valor_desconto?: number;
  valor_outras_despesas?: number;

  // Códigos de barras
  codigo_barras_comercial?: string;
  codigo_barras_tributavel?: string;

  // ICMS
  icms_origem: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
  icms_situacao_tributaria: string;
  icms_base_calculo?: number;
  icms_aliquota?: number;
  icms_valor?: number;
  icms_base_calculo_st?: number;
  icms_aliquota_st?: number;
  icms_valor_st?: number;

  // PIS
  pis_situacao_tributaria: string;
  pis_base_calculo?: number;
  pis_aliquota?: number;
  pis_valor?: number;

  // COFINS
  cofins_situacao_tributaria: string;
  cofins_base_calculo?: number;
  cofins_aliquota?: number;
  cofins_valor?: number;

  // IPI
  ipi_situacao_tributaria?: string;
  ipi_base_calculo?: number;
  ipi_aliquota?: number;
  ipi_valor?: number;
  ipi_codigo_enquadramento?: string;

  // FCP
  fcp_base_calculo?: number;
  fcp_percentual?: number;
  fcp_valor?: number;

  // Reforma Tributária 2026+
  trib_ibs_cbs?: TribIBSCBS;
  codigo_nbs?: string;
}

export interface TransportadorConfig {
  cnpj?: string;
  cpf?: string;
  nome?: string;
  inscricao_estadual?: string;
  endereco?: string;
  municipio?: string;
  uf?: string;
}

export interface VolumeConfig {
  quantidade?: number;
  especie?: string;
  marca?: string;
  numero?: string;
  peso_liquido?: number;
  peso_bruto?: number;
}

export interface FormaPagamento {
  forma_pagamento: string;
  valor_pagamento: number;
  tipo_integracao?: '1' | '2';
  cnpj_credenciadora?: string;
  bandeira_operadora?: string;
  numero_autorizacao?: string;
}

// =====================================================
// NFSE - NOTA FISCAL DE SERVIÇO ELETRÔNICA
// =====================================================

export interface NFSePayload {
  // Dados gerais
  data_emissao: string;
  natureza_operacao: '1' | '2' | '3' | '4' | '5' | '6';
  optante_simples_nacional: boolean;
  incentivador_cultural: boolean;
  status?: '1' | '2';

  // Prestador
  prestador: PrestadorConfig;

  // Tomador
  tomador: TomadorConfig;

  // Serviço
  servico: ServicoConfig;

  // Construção civil
  construcao_civil?: ConstrucaoCivilConfig;

  // Intermediário
  intermediario?: IntermediarioConfig;

  // Reforma Tributária 2026+
  trib_ibs_cbs?: TribIBSCBSNFSe;
}

export interface PrestadorConfig {
  cnpj: string;
  inscricao_municipal: string;
  codigo_municipio: string;
}

export interface TomadorConfig {
  cpf?: string;
  cnpj?: string;
  razao_social: string;
  inscricao_municipal?: string;
  email: string;
  telefone?: string;
  endereco: EnderecoTomadorConfig;
}

export interface EnderecoTomadorConfig {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigo_municipio: string;
  uf: string;
  cep: string;
}

export interface ServicoConfig {
  aliquota: number;
  discriminacao: string;
  iss_retido: boolean;
  item_lista_servico: string;
  valor_servicos: number;
  valor_deducoes?: number;
  valor_pis?: number;
  valor_cofins?: number;
  valor_inss?: number;
  valor_ir?: number;
  valor_csll?: number;
  desconto_incondicionado?: number;
  desconto_condicionado?: number;
  codigo_municipio: string;
  codigo_cnae?: string;
  codigo_tributacao_municipio?: string;

  // Reforma Tributária 2026+
  codigo_nbs?: string;
}

export interface ConstrucaoCivilConfig {
  codigo_obra?: string;
  art?: string;
}

export interface IntermediarioConfig {
  cpf?: string;
  cnpj?: string;
  razao_social?: string;
  inscricao_municipal?: string;
}

// =====================================================
// REFORMA TRIBUTÁRIA 2026+
// =====================================================

export interface IBSCBS {
  ind_total_ibs_cbs?: '0' | '1';
  valor_ibs?: number;
  valor_cbs?: number;
  valor_is?: number;
}

export interface TribIBSCBS {
  cst_ibs_cbs: string;
  aliquota_ibs_uf?: number;
  aliquota_ibs_mun?: number;
  aliquota_cbs?: number;
  base_calculo_ibs_cbs?: number;
  valor_ibs_uf?: number;
  valor_ibs_mun?: number;
  valor_cbs?: number;
  
  // Crédito presumido
  ind_cred_presumido?: '0' | '1';
  cod_cred_presumido?: string;
  perc_cred_presumido?: number;
  valor_cred_presumido_ibs?: number;
  valor_cred_presumido_cbs?: number;
  
  // Classificação tributária
  cod_class_trib?: string;
  
  // Imposto Seletivo
  imposto_seletivo?: ImpostoSeletivo;
}

export interface TribIBSCBSNFSe {
  cst_ibs_cbs: string;
  aliquota_ibs?: number;
  aliquota_cbs?: number;
  base_calculo?: number;
  valor_ibs?: number;
  valor_cbs?: number;
  ind_retencao_ibs_cbs?: '1' | '2';
  valor_ibs_retido?: number;
  valor_cbs_retido?: number;
  
  // Crédito presumido
  credito_presumido?: CreditoPresumido;
}

export interface ImpostoSeletivo {
  cst_is: string;
  aliquota_is?: number;
  base_calculo_is?: number;
  valor_is?: number;
}

export interface CreditoPresumido {
  ind_cred_presumido: '0' | '1';
  cod_cred_presumido?: string;
  perc_cred_presumido?: number;
  valor_cred_presumido_ibs?: number;
  valor_cred_presumido_cbs?: number;
}

// =====================================================
// RESPOSTAS DA API
// =====================================================

export interface FocusNFeResponse {
  status: string;
  referencia: string;
  caminho?: string;
  codigo?: string;
  mensagem?: string;
  erros?: FocusNFeError[];
}

export interface FocusNFeError {
  campo?: string;
  codigo?: string;
  mensagem: string;
}

export interface FocusNFeStatusResponse {
  status: 'processando' | 'autorizado' | 'cancelado' | 'erro_autorizacao' | 'denegado';
  referencia: string;
  numero?: string;
  serie?: string;
  chave_nfe?: string;
  numero_nfse?: string;
  codigo_verificacao?: string;
  data_emissao?: string;
  data_autorizacao?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  caminho_xml_cancelamento?: string;
  status_sefaz?: string;
  mensagem_sefaz?: string;
}

export interface FocusNFeCancelResponse {
  status: 'cancelado' | 'erro_autorizacao';
  referencia: string;
  status_sefaz?: string;
  mensagem_sefaz?: string;
  caminho_xml_cancelamento?: string;
}

// =====================================================
// WEBHOOK
// =====================================================

export interface FocusNFeWebhookPayload {
  evento: string;
  referencia: string;
  status: string;
  data: string;
  cnpj_emitente?: string;
  chave_nfe?: string;
  numero?: string;
  serie?: string;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  mensagem_sefaz?: string;
}

// =====================================================
// TIPOS INTERNOS DO REVALYA
// =====================================================

export interface EmitirNFeRequest {
  tenant_id: string;
  finance_entry_id?: string;
  dados_nfe: NFePayload;
}

export interface EmitirNFSeRequest {
  tenant_id: string;
  finance_entry_id?: string;
  dados_nfse: NFSePayload;
}

export interface ConsultarRequest {
  tenant_id: string;
  referencia: string;
}

export interface CancelarRequest {
  tenant_id: string;
  referencia: string;
  justificativa: string;
}

export interface FocusNFeInternalResponse {
  success: boolean;
  referencia?: string;
  status?: string;
  caminho?: string;
  error?: string;
  detalhes?: FocusNFeError[];
  dados?: FocusNFeStatusResponse;
}

// =====================================================
// CONSTANTES
// =====================================================

export const FOCUSNFE_URLS = {
  homologacao: 'https://homologacao.focusnfe.com.br/v2',
  producao: 'https://api.focusnfe.com.br/v2'
} as const;

export const FOCUSNFE_STATUS = {
  processando: 'processing',
  autorizado: 'issued',
  cancelado: 'cancelled',
  erro_autorizacao: 'error',
  denegado: 'denied'
} as const;

// AIDEV-NOTE: Alíquotas da Reforma Tributária 2026
export const ALIQUOTAS_2026 = {
  CBS: 0.009,    // 0,9%
  IBS_UF: 0.0005, // 0,05%
  IBS_MUN: 0.0005 // 0,05%
} as const;

// AIDEV-NOTE: CST IBS/CBS
export const CST_IBS_CBS = {
  '00': 'Tributação normal',
  '10': 'Tributação com alíquota zero',
  '20': 'Isenção',
  '30': 'Não incidência',
  '40': 'Suspensão',
  '50': 'Diferimento total',
  '51': 'Diferimento parcial',
  '60': 'Substituição tributária',
  '70': 'Redução base de cálculo',
  '80': 'Tributação monofásica',
  '90': 'Outros'
} as const;

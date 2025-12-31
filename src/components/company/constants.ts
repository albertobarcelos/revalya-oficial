/**
 * Constantes para o módulo de dados da empresa
 * AIDEV-NOTE: Centralização de constantes para facilitar manutenção
 */

export const ESTADOS_BRASILEIROS = [
  { value: "AC", label: "AC - Acre" },
  { value: "AL", label: "AL - Alagoas" },
  { value: "AP", label: "AP - Amapá" },
  { value: "AM", label: "AM - Amazonas" },
  { value: "BA", label: "BA - Bahia" },
  { value: "CE", label: "CE - Ceará" },
  { value: "DF", label: "DF - Distrito Federal" },
  { value: "ES", label: "ES - Espírito Santo" },
  { value: "GO", label: "GO - Goiás" },
  { value: "MA", label: "MA - Maranhão" },
  { value: "MT", label: "MT - Mato Grosso" },
  { value: "MS", label: "MS - Mato Grosso do Sul" },
  { value: "MG", label: "MG - Minas Gerais" },
  { value: "PA", label: "PA - Pará" },
  { value: "PB", label: "PB - Paraíba" },
  { value: "PR", label: "PR - Paraná" },
  { value: "PE", label: "PE - Pernambuco" },
  { value: "PI", label: "PI - Piauí" },
  { value: "RJ", label: "RJ - Rio de Janeiro" },
  { value: "RN", label: "RN - Rio Grande do Norte" },
  { value: "RS", label: "RS - Rio Grande do Sul" },
  { value: "RO", label: "RO - Rondônia" },
  { value: "RR", label: "RR - Roraima" },
  { value: "SC", label: "SC - Santa Catarina" },
  { value: "SP", label: "SP - São Paulo" },
  { value: "SE", label: "SE - Sergipe" },
  { value: "TO", label: "TO - Tocantins" },
] as const;

export const TIPOS_ATIVIDADE = [
  { value: "prestacao_servicos", label: "Prestação de Serviços" },
  { value: "comercio", label: "Comércio" },
  { value: "industria", label: "Indústria" },
  { value: "outros", label: "Outros" },
] as const;

// AIDEV-NOTE: Regimes tributários conforme Focus NFe
// Valores devem corresponder aos códigos do Focus NFe:
// 1 - Simples Nacional
// 2 - Simples Nacional - Excesso de sublimite de receita bruta
// 3 - Regime Normal
// 4 - Simples Nacional - Microempreendedor Individual - MEI
export const REGIMES_TRIBUTARIOS = [
  { value: "1", label: "1 - Simples Nacional" },
  { value: "2", label: "2 - Simples Nacional - Excesso de sublimite de receita bruta" },
  { value: "3", label: "3 - Regime Normal" },
  { value: "4", label: "4 - Simples Nacional - Microempreendedor Individual (MEI)" },
] as const;

export const COMPANY_TABS = {
  ENDERECO: "endereco",
  TELEFONES_EMAIL: "telefones-email",
  INSCRICOES: "inscricoes",
  CERTIFICADO_DIGITAL: "certificado-digital",
  NFE_PRODUTO: "nfe-produto",
  NFE_SERVICO: "nfe-servico",
} as const;

export type CompanyTab = typeof COMPANY_TABS[keyof typeof COMPANY_TABS];


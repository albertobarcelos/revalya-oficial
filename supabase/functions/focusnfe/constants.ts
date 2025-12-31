/**
 * Constantes e configurações da Edge Function Focus NFe
 * AIDEV-NOTE: Configurações centralizadas
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-environment',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
} as const;

export const RATE_LIMIT = {
  MAX_REQUESTS: 100,
  WINDOW_MS: 60000, // 1 minuto
} as const;

export const FOCUSNFE_URLS = {
  PRODUCAO: 'https://api.focusnfe.com.br/v2',
  HOMOLOGACAO: 'https://homologacao.focusnfe.com.br/v2',
} as const;

export const REGIME_TRIBUTARIO_MAP: Record<string, string> = {
  // Códigos diretos
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  // Valores legados
  'simples_nacional': '1',
  'simples_nacional_excesso': '2',
  'simples_nacional_excesso_sublimite': '2',
  'regime_normal': '3',
  'lucro_presumido': '3',
  'lucro_real': '3',
  'mei': '4',
  'microempreendedor_individual': '4',
} as const;

export const REGIME_TRIBUTARIO_DEFAULT = '3'; // Regime Normal

export const CAMPOS_OBRIGATORIOS_EMPRESA = [
  'cnpj',
  'nome',
  'logradouro',
  'numero',
  'bairro',
  'municipio',
  'uf',
  'cep',
] as const;


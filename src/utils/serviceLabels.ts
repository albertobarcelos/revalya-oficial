/**
 * @fileoverview Utilitários para labels dinâmicos de serviços
 * @module ServiceLabels
 * AIDEV-NOTE: Mapeia unidades de cobrança para labels contextuais do campo "Preço de Custo"
 */

// AIDEV-NOTE: Mapeamento de unidades de cobrança para sufixos contextuais
export const UNIT_TYPE_LABELS = {
  hour: 'por Hora',
  day: 'por Dia', 
  monthly: 'Mensal',
  unique: 'Único',
  kilometer: 'por Quilômetro',
  square_meter: 'por Metro Quadrado',
  other: 'Personalizado'
} as const;

export type UnitType = keyof typeof UNIT_TYPE_LABELS;

/**
 * Gera o label dinâmico para o campo "Preço de Custo" baseado na unidade de cobrança
 * @param unitType - Tipo de unidade de cobrança selecionada
 * @returns Label contextualizado para o campo de preço de custo
 */
export function getCostPriceLabel(unitType?: string): string {
  // AIDEV-NOTE: Label padrão quando nenhuma unidade está selecionada
  if (!unitType || !(unitType in UNIT_TYPE_LABELS)) {
    return 'Preço de Custo';
  }

  const unitLabel = UNIT_TYPE_LABELS[unitType as UnitType];
  return `Preço de Custo ${unitLabel}`;
}

/**
 * Gera a descrição dinâmica para o campo "Preço de Custo" baseado na unidade de cobrança
 * @param unitType - Tipo de unidade de cobrança selecionada
 * @returns Descrição contextualizada para o campo de preço de custo
 */
export function getCostPriceDescription(unitType?: string): string {
  // AIDEV-NOTE: Descrição padrão quando nenhuma unidade está selecionada
  if (!unitType || !(unitType in UNIT_TYPE_LABELS)) {
    return 'Valor de custo do serviço para cálculo de margem';
  }

  const unitLabel = UNIT_TYPE_LABELS[unitType as UnitType].toLowerCase();
  return `Valor de custo do serviço ${unitLabel} para cálculo de margem`;
}

/**
 * Gera o placeholder dinâmico para o campo "Preço de Custo" baseado na unidade de cobrança
 * @param unitType - Tipo de unidade de cobrança selecionada
 * @returns Placeholder contextualizado para o campo de preço de custo
 */
export function getCostPricePlaceholder(unitType?: string): string {
  // AIDEV-NOTE: Placeholder padrão quando nenhuma unidade está selecionada
  if (!unitType || !(unitType in UNIT_TYPE_LABELS)) {
    return 'R$ 0,00';
  }

  const unitLabel = UNIT_TYPE_LABELS[unitType as UnitType].toLowerCase();
  
  // AIDEV-NOTE: Placeholders específicos por tipo de unidade
  switch (unitType) {
    case 'hour':
      return 'R$ 0,00/hora';
    case 'day':
      return 'R$ 0,00/dia';
    case 'monthly':
      return 'R$ 0,00/mês';
    case 'kilometer':
      return 'R$ 0,00/km';
    case 'square_meter':
      return 'R$ 0,00/m²';
    case 'unique':
      return 'R$ 0,00 (valor único)';
    default:
      return 'R$ 0,00';
  }
}
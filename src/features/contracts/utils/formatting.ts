/**
 * AIDEV-NOTE: Funções de formatação centralizadas para contratos
 * Elimina código duplicado de formatação de moeda e números
 * 
 * @module features/contracts/utils/formatting
 */

/**
 * Formata valor para exibição em moeda BRL
 * 
 * @param value - Valor numérico para formatar
 * @returns String formatada em BRL ou string vazia se valor inválido
 */
export function formatCurrencyDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return '';
  }
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
}

/**
 * Converte string de input de moeda para número
 * 
 * @param input - String com valor de moeda (ex: "R$ 1.234,56")
 * @returns Valor numérico extraído
 */
export function parseCurrencyInput(input: string): number {
  if (!input) return 0;
  
  // Remove tudo exceto números e vírgula
  const onlyNumbers = input.replace(/[^0-9,]/g, '');
  if (!onlyNumbers) return 0;
  
  // Normaliza vírgula para ponto
  const normalized = onlyNumbers.replace(',', '.');
  const parsed = parseFloat(normalized);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formata número para exibição de quantidade
 * 
 * @param value - Valor numérico
 * @returns String com o número ou vazio se inválido
 */
export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return '';
  }
  return value.toString();
}

/**
 * Converte string de input para número inteiro
 * 
 * @param input - String com valor numérico
 * @param defaultValue - Valor padrão se input inválido (default: 0)
 * @returns Número inteiro extraído
 */
export function parseIntegerInput(input: string, defaultValue = 0): number {
  if (!input) return defaultValue;
  
  // Remove caracteres não numéricos
  const sanitized = input.replace(/[^0-9]/g, '');
  if (!sanitized) return defaultValue;
  
  const parsed = parseInt(sanitized, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Valida e normaliza valor de parcelas
 * 
 * @param value - Valor de entrada
 * @param min - Valor mínimo (default: 1)
 * @param max - Valor máximo (default: 12)
 * @returns Valor normalizado dentro dos limites
 */
export function normalizeInstallments(
  value: number | null | undefined,
  min = 1,
  max = 12
): number {
  if (!value || value < min) return min;
  if (value > max) return max;
  return Math.floor(value);
}

/**
 * Valida e normaliza dia do mês
 * 
 * @param value - Valor de entrada
 * @returns Valor entre 1 e 31
 */
export function normalizeDayOfMonth(value: number | null | undefined): number {
  if (!value || value < 1) return 1;
  if (value > 31) return 31;
  return Math.floor(value);
}

/**
 * Valida e normaliza dias após faturamento
 * 
 * @param value - Valor de entrada
 * @param min - Valor mínimo (default: 1)
 * @param max - Valor máximo (default: 365)
 * @returns Valor normalizado dentro dos limites
 */
export function normalizeDaysAfterBilling(
  value: number | null | undefined,
  min = 1,
  max = 365
): number {
  if (!value || value < min) return min;
  if (value > max) return max;
  return Math.floor(value);
}

/**
 * Valida e normaliza percentual de desconto
 * 
 * @param value - Valor de entrada
 * @returns Valor entre 0 e 100
 */
export function normalizeDiscountPercentage(value: number | null | undefined): number {
  if (!value || value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100; // Mantém 2 casas decimais
}

/**
 * Formata percentual para exibição
 * 
 * @param value - Valor percentual
 * @param decimals - Casas decimais (default: 2)
 * @returns String formatada (ex: "10,50%")
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals).replace('.', ',')}%`;
}

/**
 * Trunca texto com reticências se exceder tamanho máximo
 * 
 * @param text - Texto para truncar
 * @param maxLength - Tamanho máximo (default: 50)
 * @returns Texto truncado com "..." se necessário
 */
export function truncateText(text: string, maxLength = 50): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}


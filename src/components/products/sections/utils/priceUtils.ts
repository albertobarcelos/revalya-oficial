/**
 * Utilitários para formatação e parsing de valores monetários
 * 
 * AIDEV-NOTE: Funções isoladas para manipulação de preços
 */

/**
 * Formata valor numérico com separador de milhar e 2 casas decimais (formato brasileiro)
 */
export function formatPriceWithThousands(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Parseia valor do input aceitando até 6 casas decimais
 * Suporta formato brasileiro (vírgula) e internacional (ponto)
 */
export function parsePriceInput(value: string): number | null {
  // Remove tudo exceto números, vírgula e ponto
  const clean = value.replace(/[^\d,.-]/g, '').trim();
  if (!clean) return null;
  
  // Se tem vírgula, trata como decimal brasileiro
  if (clean.includes(',')) {
    const parts = clean.split(',');
    const integerPart = parts[0].replace(/\./g, '').replace(/-/g, '');
    const decimalPart = (parts[1] || '').replace(/[^\d]/g, '').slice(0, 6); // Máximo 6 casas decimais
    const numValue = decimalPart ? parseFloat(`${integerPart}.${decimalPart}`) : parseFloat(integerPart);
    return isNaN(numValue) ? null : numValue;
  }
  
  // Se tem ponto, pode ser decimal
  if (clean.includes('.')) {
    const parts = clean.split('.');
    const integerPart = parts[0].replace(/\./g, '').replace(/-/g, '');
    const decimalPart = (parts[1] || '').replace(/[^\d]/g, '').slice(0, 6); // Máximo 6 casas decimais
    const numValue = decimalPart ? parseFloat(`${integerPart}.${decimalPart}`) : parseFloat(integerPart);
    return isNaN(numValue) ? null : numValue;
  }
  
  // Apenas números
  const numValue = parseFloat(clean);
  return isNaN(numValue) ? null : numValue;
}


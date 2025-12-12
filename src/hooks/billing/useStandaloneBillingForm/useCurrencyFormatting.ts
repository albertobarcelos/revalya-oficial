/**
 * AIDEV-NOTE: Hook para formatação de valores monetários
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import { useCallback } from 'react';

/**
 * Hook para formatação de valores monetários brasileiros
 */
export function useCurrencyFormatting() {
  /**
   * AIDEV-NOTE: Função auxiliar para parsear valor monetário de entrada do usuário
   * Suporta formatos brasileiros (vírgula como decimal) e americanos (ponto como decimal)
   */
  const parseCurrencyInput = useCallback((value: string): number => {
    // Remove tudo exceto dígitos, vírgula e ponto
    const clean = value.replace(/[^\d,.-]/g, '');
    
    if (!clean || clean === '' || clean === '-') {
      return 0;
    }
    
    // Se tem vírgula, trata como decimal brasileiro
    if (clean.includes(',')) {
      const parts = clean.split(',');
      const integerPart = parts[0].replace(/\./g, '').replace(/-/g, '');
      const decimalPart = (parts[1] || '').replace(/[^\d]/g, '').slice(0, 2);
      const numeric = parseFloat(`${integerPart}.${decimalPart}`) || 0;
      return numeric;
    }
    
    // Se tem ponto, pode ser decimal americano ou separador de milhar
    if (clean.includes('.')) {
      const parts = clean.split('.');
      // Se a última parte tem 2 dígitos, provavelmente é decimal
      if (parts[parts.length - 1].length <= 2 && parts.length === 2) {
        return parseFloat(clean.replace(/\./g, '').replace(/,/g, '.')) || 0;
      }
      // Caso contrário, remove pontos (separadores de milhar)
      return parseFloat(clean.replace(/\./g, '')) || 0;
    }
    
    // Apenas números
    return parseFloat(clean) || 0;
  }, []);

  /**
   * AIDEV-NOTE: Função auxiliar para formatar valor para exibição no input
   * Formata com 2 casas decimais, usando vírgula como separador decimal
   */
  const formatCurrencyInput = useCallback((value: number): string => {
    if (value === 0) return '';
    // Formata com 2 casas decimais, usando vírgula como separador decimal
    return value.toFixed(2).replace('.', ',');
  }, []);

  return {
    parseCurrencyInput,
    formatCurrencyInput,
  };
}

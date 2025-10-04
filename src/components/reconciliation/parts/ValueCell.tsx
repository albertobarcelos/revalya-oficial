// =====================================================
// AIDEV-NOTE: ValueCell Component
// =====================================================
// Componente extraído de ReconciliationTable.tsx para formatação
// de valores monetários com suporte a diferentes tipos de exibição
// (valor padrão, diferença com cores, valor opcional)
// =====================================================

import { ValueCellProps } from '../types/table-parts';

// AIDEV-NOTE: Função de formatação de moeda brasileira
// Centralizada para manter consistência em toda aplicação
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export function ValueCell({ 
  value, 
  type = 'default',
  className = '',
  showEmptyState = true 
}: ValueCellProps) {
  // AIDEV-NOTE: Early return para valores nulos/undefined
  if (value === null || value === undefined) {
    return showEmptyState ? <span className={className}>-</span> : null;
  }

  // AIDEV-NOTE: Renderização baseada no tipo de célula
  switch (type) {
    case 'difference':
      // AIDEV-NOTE: Diferenças com cores condicionais (verde/vermelho)
      return (
        <span 
          className={`font-semibold ${
            value > 0 ? 'text-green-600' : 'text-red-600'
          } ${className}`}
        >
          {formatCurrency(value)}
        </span>
      );
      
    case 'optional':
      // AIDEV-NOTE: Valores opcionais com fallback para "-"
      return (
        <span className={className}>
          {value ? formatCurrency(value) : '-'}
        </span>
      );
      
    case 'semibold':
      // AIDEV-NOTE: Valores com destaque (font-semibold)
      return (
        <span className={`font-semibold ${className}`}>
          {formatCurrency(value)}
        </span>
      );
      
    default:
      // AIDEV-NOTE: Formatação padrão de moeda
      return (
        <span className={className}>
          {formatCurrency(value)}
        </span>
      );
  }
}
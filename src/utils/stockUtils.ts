/**
 * Utilitários para formatação e manipulação de dados de estoque
 * 
 * AIDEV-NOTE: Funções auxiliares para formatação de valores de estoque,
 * CMC, labels de tipos de movimento e motivos
 */

/**
 * Formata quantidade de estoque com unidade
 */
export function formatStockQuantity(quantity: number, unit: string = 'UN'): string {
  if (quantity === null || quantity === undefined || isNaN(quantity)) {
    return '0 ' + unit;
  }
  
  // Formatar com até 6 casas decimais, removendo zeros à direita
  const formatted = quantity.toFixed(6).replace(/\.?0+$/, '');
  return `${formatted} ${unit}`;
}

/**
 * Formata CMC (Custo Médio de Compra) como moeda
 */
export function formatCMC(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Calcula CMC total (quantidade * CMC unitário)
 */
export function calculateTotalCMC(quantity: number, unitCMC: number): number {
  if (!quantity || !unitCMC || isNaN(quantity) || isNaN(unitCMC)) {
    return 0;
  }
  
  return quantity * unitCMC;
}

/**
 * Retorna label do tipo de movimento
 */
export function getMovementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'ENTRADA': 'Entrada',
    'SAIDA': 'Saída',
    'AJUSTE': 'Ajuste',
    'TRANSFERENCIA': 'Transferência'
  };
  
  return labels[type] || type;
}

/**
 * Retorna label do motivo do movimento
 */
export function getMovementReasonLabel(reason: string | null | undefined): string {
  if (!reason) return '-';
  
  const labels: Record<string, string> = {
    'Ajuste por Inventário': 'Ajuste por Inventário',
    'Ajuste por Inventário (Estoque Inicial)': 'Ajuste por Inventário (Estoque Inicial)',
    'Integração com Ordem de Produção - Entrada': 'Integração com Ordem de Produção - Entrada',
    'Integração com PDV': 'Integração com PDV',
    'Compra': 'Compra',
    'Venda': 'Venda',
    'Devolução': 'Devolução',
    'Perda': 'Perda',
    'Avaria': 'Avaria'
  };
  
  return labels[reason] || reason;
}

/**
 * Formata valor monetário brasileiro
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata data brasileira
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
}

/**
 * Valida se quantidade é válida (> 0)
 */
export function validateQuantity(quantity: number | null | undefined): boolean {
  if (quantity === null || quantity === undefined) return false;
  if (isNaN(quantity)) return false;
  return quantity > 0;
}

/**
 * Opções de tipos de movimento para selects
 */
export const MOVEMENT_TYPE_OPTIONS = [
  { value: 'AJUSTE', label: 'Ajustar o saldo de estoque do dia' },
  { value: 'ENTRADA', label: 'Criar um movimento de entrada' },
  { value: 'SAIDA', label: 'Criar um movimento de saída' },
  { value: 'TRANSFERENCIA', label: 'Transferência entre locais' }
] as const;

/**
 * Opções de motivos de movimento para selects
 */
export const MOVEMENT_REASON_OPTIONS = [
  { value: 'Ajuste por Inventário', label: 'Ajuste por Inventário' },
  { value: 'Ajuste por Inventário (Estoque Inicial)', label: 'Ajuste por Inventário (Estoque Inicial)' },
  { value: 'Integração com Ordem de Produção - Entrada', label: 'Integração com Ordem de Produção - Entrada' },
  { value: 'Integração com PDV', label: 'Integração com PDV' },
  { value: 'Compra', label: 'Compra' },
  { value: 'Venda', label: 'Venda' },
  { value: 'Devolução', label: 'Devolução' },
  { value: 'Perda', label: 'Perda' },
  { value: 'Avaria', label: 'Avaria' }
] as const;


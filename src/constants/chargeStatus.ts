/**
 * AIDEV-NOTE: Constantes padronizadas para status de cobranças
 * Este arquivo centraliza todos os status possíveis para cobranças no sistema,
 * garantindo consistência em toda a aplicação.
 */

export const CHARGE_STATUS = {
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  BANK_PROCESSING: 'BANK_PROCESSING',
  FAILED: 'FAILED',
  CONFIRMED: 'CONFIRMED',
  RECEIVED: 'RECEIVED',
  OVERDUE: 'OVERDUE',
} as const;

// Tipo para os status de cobrança
export type ChargeStatus = keyof typeof CHARGE_STATUS;

// Mapeamento de status para cores
export const CHARGE_STATUS_COLORS: Record<ChargeStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
  BANK_PROCESSING: 'bg-blue-100 text-blue-800',
  FAILED: 'bg-red-100 text-red-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  RECEIVED: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
};

// Mapeamento de status para labels em português
export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  PENDING: 'Pendente',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
  BANK_PROCESSING: 'Em processamento bancário',
  FAILED: 'Falhou',
  CONFIRMED: 'Confirmada',
  RECEIVED: 'Recebida',
  OVERDUE: 'Vencida',
};

// Exportação padrão para facilitar o uso
export default CHARGE_STATUS;
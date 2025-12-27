export const LAUNCH_TYPES = {
  'JUROS': { name: 'Juros', operation: 'CREDIT', isSettlement: false },
  'MULTA': { name: 'Multa', operation: 'CREDIT', isSettlement: false },
  'DESCONTO': { name: 'Desconto', operation: 'DEBIT', isSettlement: false },
  'PAGAMENTO': { name: 'Pagamento', operation: 'DEBIT', isSettlement: true },
} as const;

export type LaunchTypeKey = keyof typeof LAUNCH_TYPES;

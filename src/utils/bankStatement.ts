/**
 * Utilitários do Extrato Bancário
 */
export type OperationType = 'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER';

export interface StatementTransaction {
  id: string;
  date: string;
  kind: OperationType;
  value: number;
  description?: string | null;
  account_label?: string | null;
  category?: string | null;
  payment_method?: string | null;
}

/**
 * Calcula o saldo atual a partir das transações
 */
export function computeBalance(items: StatementTransaction[]): number {
  return (items || []).reduce((acc, t) => {
    if (t.kind === 'CREDIT') return acc + (t.value || 0);
    if (t.kind === 'DEBIT') return acc - (t.value || 0);
    return acc;
  }, 0);
}

/**
 * Gera conteúdo CSV para o extrato
 */
export function buildBankStatementCsv(items: StatementTransaction[]): string {
  const headers = ['Data', 'Tipo', 'Valor', 'Descrição', 'Categoria', 'Método'];
  const rows = (items || []).map(t => [
    new Date(t.date).toLocaleDateString('pt-BR'),
    t.kind,
    (t.value ?? 0).toFixed(2).replace('.', ','),
    t.description || '-',
    t.category || '-',
    t.payment_method || '-'
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
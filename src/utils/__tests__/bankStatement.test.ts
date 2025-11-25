import { describe, it, expect } from 'vitest';
import { buildBankStatementCsv, computeBalance, type StatementTransaction } from '@/utils/bankStatement';

describe('utils/bankStatement', () => {
  it('buildBankStatementCsv gera cabeçalho e linhas', () => {
    const items: StatementTransaction[] = [
      { id: 'a', date: '2025-01-01', kind: 'CREDIT', value: 100, description: 'Recebimento', category: 'Vendas', payment_method: 'PIX' },
      { id: 'b', date: '2025-01-02', kind: 'DEBIT', value: 50, description: 'Pagamento', category: 'Fornecedores', payment_method: 'BOLETO' }
    ];
    const csv = buildBankStatementCsv(items);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Data,Tipo,Valor,Descrição,Categoria,Método');
    expect(lines.length).toBe(3);
  });

  it('computeBalance soma créditos e subtrai débitos', () => {
    const items: StatementTransaction[] = [
      { id: '1', date: '2025-01-01', kind: 'CREDIT', value: 100 },
      { id: '2', date: '2025-01-02', kind: 'DEBIT', value: 30 },
      { id: '3', date: '2025-01-03', kind: 'DEBIT', value: 20 },
    ];
    expect(computeBalance(items)).toBe(50);
  });
});
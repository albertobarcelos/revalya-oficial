import { describe, it, expect } from 'vitest';
import { computeBalance } from '@/utils/bankStatement';

describe('Extrato Bancário - Cálculo de Saldo', () => {
  it('calcula saldo com créditos e débitos', () => {
    const items = [
      { id: '1', date: '2025-01-01', kind: 'CREDIT', value: 100, description: null, category: null, payment_method: null },
      { id: '2', date: '2025-01-02', kind: 'DEBIT', value: 30, description: null, category: null, payment_method: null },
      { id: '3', date: '2025-01-03', kind: 'DEBIT', value: 20, description: null, category: null, payment_method: null },
      { id: '4', date: '2025-01-04', kind: 'TRANSFER', value: 50, description: null, category: null, payment_method: 'TRANSFER' },
    ] as any;
    expect(computeBalance(items)).toBe(50);
  });

  it('retorna 0 para lista vazia', () => {
    expect(computeBalance([] as any)).toBe(0);
  });
});
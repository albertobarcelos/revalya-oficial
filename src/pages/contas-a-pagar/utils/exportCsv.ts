import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PayableRow } from '@/services/financialPayablesService';

export function exportPayablesCsv(payables: PayableRow[]) {
  const headers = ['Situacao','Vencimento','Numero','Detalhes','Valor','Pago','A pagar'];
  const statusMap: Record<string, string> = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    OVERDUE: 'Vencida',
    CANCELLED: 'Estornada',
    DUE_SOON: 'A vencer',
    DUE_TODAY: 'Vence hoje',
  };
  const rows = (payables || []).map((e) => {
    const gross = e.gross_amount ?? 0;
    const net = e.net_amount ?? 0;
    const paid = e.paid_amount ?? 0;
    const remaining = Math.max(net - paid, 0);
    return [
      statusMap[e.status] || e.status,
      format(new Date(e.due_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
      e.entry_number ?? '',
      e.description ?? '',
      gross.toFixed(2).replace('.', ','),
      paid.toFixed(2).replace('.', ','),
      remaining.toFixed(2).replace('.', ','),
    ].join(';');
  });
  const csv = [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contas_a_pagar_${format(new Date(), 'yyyyMMdd')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

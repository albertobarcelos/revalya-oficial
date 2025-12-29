import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PayableRow } from '@/services/financialPayablesService';

export function exportPayablesCsv(payables: PayableRow[]) {
  const headers = ['Situacao', 'Data de Emissao', 'Vencimento', 'Tipo de Documento', 'Numero', 'Parcelas', 'Favorecido/Fornecedor', 'Detalhes', 'Valor Original', 'Descontos', 'Juros/Multa', 'Valor Liquido', 'Pago', 'A pagar', 'Conta Bancaria'];
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
    
    const discount = Math.max(gross - net, 0);
    const interest = Math.max(net - gross, 0);

    const bankInfo = e.bank_acounts 
      ? `${e.bank_acounts.bank} (Ag: ${e.bank_acounts.agency} CC: ${e.bank_acounts.count})`
      : '';
    
    const issueDate = e.issue_date 
      ? format(new Date(e.issue_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) 
      : '';
    const docType = e.financial_documents?.name ?? '';

    return [
      statusMap[e.status] || e.status,
      issueDate,
      format(new Date(e.due_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
      docType,
      e.entry_number ?? '',
      e.installments ?? '',
      e.customers?.name ?? '',
      e.description ?? '',
      gross.toFixed(2).replace('.', ','),
      discount.toFixed(2).replace('.', ','),
      interest.toFixed(2).replace('.', ','),
      net.toFixed(2).replace('.', ','),
      paid.toFixed(2).replace('.', ','),
      remaining.toFixed(2).replace('.', ','),
      bankInfo
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

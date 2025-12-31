import { useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import type { FinanceEntry } from '@/services/financeEntriesService';

export function useRecebimentosExport(
  recebimentos: FinanceEntry[],
  bankLabelById: Map<string, string>,
  tableRef: React.RefObject<HTMLDivElement>
) {
  const { toast } = useToast();

  const handleExportCSV = useCallback(() => {
    const header = ['Descrição', 'Valor', 'Vencimento', 'Status', 'Conta', 'Data Pagamento'];
    const rows = recebimentos.map((e) => [
      e.description || '',
      (e.amount || 0).toString(),
      e.due_date ? new Date(e.due_date).toISOString().slice(0, 10) : '',
      e.status || '',
      e.bank_account_id ? (bankLabelById.get(String(e.bank_account_id)) || String(e.bank_account_id)) : '',
      e.payment_date ? new Date(e.payment_date).toISOString().slice(0, 10) : ''
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `recebimentos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast({ title: 'Exportado', description: 'CSV gerado com sucesso' });
  }, [recebimentos, bankLabelById, toast]);

  const handleExportPDF = useCallback(async () => {
    if (!tableRef.current) return;
    const canvas = await html2canvas(tableRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.text('Recebimentos', 10, 10);
    pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, Math.min(imgHeight, pageHeight - 30));
    pdf.save(`recebimentos_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    toast({ title: 'Exportado', description: 'PDF gerado com sucesso' });
  }, [tableRef, toast]);

  return {
    handleExportCSV,
    handleExportPDF
  };
}

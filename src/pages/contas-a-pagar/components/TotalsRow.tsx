import { TableRow, TableCell } from '@/components/ui/table';

export function TotalsRow({ payables }: { payables: Array<{ gross_amount?: number; net_amount?: number; paid_amount?: number }> }) {
  const totals = payables.reduce(
    (acc, e) => {
      const gross = e.gross_amount ?? 0;
      const net = e.net_amount ?? 0;
      const paid = e.paid_amount ?? 0;
      const remaining = Math.max(net - paid, 0);
      acc.gross += gross;
      acc.paid += paid;
      acc.remaining += remaining;
      return acc;
    },
    { gross: 0, paid: 0, remaining: 0 }
  );

  return (
    <TableRow className="bg-muted/50">
      <TableCell className="w-[30px] min-w-[30px] max-w-[30px] pl-2 pr-0 py-1" />
      <TableCell className="totais align-middle w-[88px] min-w-[88px] max-w-[88px] h-[32px] px-2 py-1 text-[12px] leading-[17.1429px] text-[#555] font-bold">TOTAIS</TableCell>
      <TableCell className="pl-0 pr-2 py-1" />
      <TableCell colSpan={2} className="descricao align-middle pl-0 pr-2 py-1 text-[12px] leading-[17.1429px] text-[#555] font-bold">Quantidade de registros encontrados: {payables.length}</TableCell>
      <TableCell className="font-medium py-1">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(totals.gross)}</TableCell>
      <TableCell className="font-medium py-1">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(totals.paid)}</TableCell>
      <TableCell className="font-medium py-1">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(totals.remaining)}</TableCell>
      <TableCell />
    </TableRow>
  );
}

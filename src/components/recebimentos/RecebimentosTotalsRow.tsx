import React from 'react';

interface RecebimentosTotalsRowProps {
  totals: {
    amount: number;
    netValue: number;
    fees: number;
  };
}

export function RecebimentosTotalsRow({ totals }: RecebimentosTotalsRowProps) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex items-center border-t shadow-sm bg-gray-50/90 backdrop-blur-sm text-foreground hover:bg-gray-50/90 text-[13.2px] sticky bottom-0 z-10">
      <div className="flex-1 text-right font-medium pr-4 text-muted-foreground py-2 sm:py-3 px-3">
        Totais:
      </div>
      <div className="w-[160px] min-w-[160px] text-left font-bold text-foreground py-2 sm:py-3 px-3">
        {formatCurrency(totals.amount)}
      </div>
      <div className="w-[160px] min-w-[160px] text-left font-bold text-foreground py-2 sm:py-3 px-3">
        {formatCurrency(totals.netValue)}
      </div>
      <div className="w-[160px] min-w-[160px] text-left font-bold text-foreground py-2 sm:py-3 px-3">
        {formatCurrency(totals.fees)}
      </div>
      <div className="w-[60px] min-w-[60px] py-2 sm:py-3 px-3"></div>
    </div>
  );
}

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreVertical, Info, AlertCircle, AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusIndicator } from './StatusIndicator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import React from 'react';
import { updatePayable } from '@/services/financialPayablesService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function PayablesTable({
  payables,
  selectedIds,
  allSelected,
  toggleSelectAll,
  toggleSelectOne,
  onEdit,
  onPayOff,
  onGenerateReceipt,
  onAfterReverse,
}: {
  payables: any[];
  selectedIds: string[];
  allSelected: boolean;
  toggleSelectAll: (v: boolean) => void;
  toggleSelectOne: (id: string, v: boolean) => void;
  onEdit: (entry: any, readOnly?: boolean) => void;
  onPayOff: (entry: any) => void;
  onGenerateReceipt: (entry: any) => void;
  onAfterReverse?: () => void;
}) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const [reverseEntry, setReverseEntry] = React.useState<any | null>(null);
  const [lastReversedId, setLastReversedId] = React.useState<string | null>(null);

  return (
    <>
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <TableHead className="checkbox-column text-[12px] font-bold leading-[17.1429px] text-[#555] align-middle text-left w-[30px] min-w-[30px] max-w-[30px] pl-2 pr-0 py-2 cursor-pointer">
            <Checkbox checked={allSelected} onCheckedChange={(v) => toggleSelectAll(!!v)} />
          </TableHead>
          <TableHead className="status text-[12px] font-bold leading-[17.1429px] text-[#555] align-middle text-left w-[88px] min-w-[88px] max-w-[88px] pl-0 pr-2 py-2 cursor-pointer">
            <div className="flex items-center gap-1">
              Situação
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center align-middle ml-1">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" aria-label="Legenda de situação" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <div className="font-semibold mb-1">Legenda:</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Aberta</div>
                        <div className="flex items-center gap-2"><CheckCircle size={17} className="text-[rgb(74,139,233)]" /> Quitada</div>
                        <div className="flex items-center gap-2"><AlertTriangle size={17} className="text-[rgb(223,75,51)]" /> Vencida</div>
                        <div className="flex items-center gap-2"><AlertCircle size={17} className="text-[rgb(255,177,51)]" /> Próxima do vencimento</div>
                        <div className="flex items-center gap-2"><MinusCircle size={17} className="text-gray-400" /> Estornada</div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </TableHead>
          <TableHead className="text-left pl-0">Vencimento</TableHead>
          <TableHead className="text-left pl-0">Número</TableHead>
          <TableHead className="text-left pl-0">Detalhes</TableHead>
          <TableHead className="text-right w-[160px] min-w-[160px]">Valor</TableHead>
          <TableHead className="text-right w-[160px] min-w-[160px]">Pago</TableHead>
          <TableHead className="text-right w-[160px] min-w-[160px]">A pagar</TableHead>
          <TableHead className="text-right w-[60px] min-w-[60px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payables.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              Nenhuma conta a pagar encontrada
            </TableCell>
          </TableRow>
        ) : (
          payables.map((entry) => {
            const gross = entry.gross_amount ?? 0;
            const isReversed = lastReversedId === entry.id || entry.status === 'CANCELLED';
            const net = isReversed ? 0 : (entry.net_amount ?? 0);
            const paid = isReversed ? 0 : (entry.paid_amount ?? 0);
            const remaining = Math.max(net - paid, 0);
            return (
              <TableRow key={entry.id}>
                <TableCell className="w-[30px] min-w-[30px] max-w-[30px] pl-2 pr-0 py-2 align-middle">
                  <Checkbox checked={selectedIds.includes(entry.id)} onCheckedChange={(v) => toggleSelectOne(entry.id, !!v)} />
                </TableCell>
                <TableCell className="w-[88px] min-w-[88px] max-w-[88px] pl-0 pr-2 py-2 align-middle"><StatusIndicator status={isReversed ? 'CANCELLED' : entry.status} /></TableCell>
                <TableCell className="text-left pl-0">{format(new Date(entry.due_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                <TableCell className="font-medium text-left pl-0">{entry.entry_number}</TableCell>
                <TableCell className="detalhes align-middle w-[904px] pl-0 pr-2 py-2 text-[12px] leading-[17.1429px] text-[#555]">
                  <div className="flex flex-col whitespace-nowrap overflow-hidden">
                    <span className="font-semibold truncate">{entry.description || entry.supplier_name || ''}</span>
                    <span className="truncate">{entry.supplier_name || (entry as any).reference || ''}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right w-[160px] min-w-[160px]">{formatCurrency(gross)}</TableCell>
                <TableCell className="text-right w-[160px] min-w-[160px]">{formatCurrency(paid)}</TableCell>
                <TableCell className="text-right w-[160px] min-w-[160px]">{formatCurrency(remaining)}</TableCell>
                <TableCell className="text-right w-[60px] min-w-[60px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {entry.status === 'CANCELLED' ? (
                        <DropdownMenuItem onClick={() => onEdit(entry, true)}>Visualizar</DropdownMenuItem>
                      ) : (
                        <>
                          {entry.status !== 'PAID' && (
                            <>
                              <DropdownMenuItem onClick={() => onPayOff(entry)}>
                                Quitar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onGenerateReceipt(entry)}>
                                Gerar Recibo
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => onEdit(entry)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setReverseEntry(entry)}>Estornar</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
        
      </TableBody>
    </Table>
    <Dialog open={!!reverseEntry} onOpenChange={(v) => { if (!v) setReverseEntry(null); }}>
      <DialogContent className="w-[600px] min-h-[270px] h-auto bg-white text-[#555] shadow-[0_5px_15px_rgba(0,0,0,0.5)] rounded-[4px] border-t-[5px] border-[rgb(223,75,51)] p-0">
        <div className="modal-header w-[600px] h-[65.7031px] pl-[20px] pr-[30px] pt-[30px] pb-[10px]">
          <span className="text-[18px] leading-[25.7143px] font-semibold text-[rgb(223,75,51)]">Estornar</span>
        </div>
        <div className="modal-body w-[600px] h-auto pl-[20px] pr-[30px] pt-[10px] pb-[20px] text-[13px] leading-[18.5714px] text-left relative overflow-visible" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          <div className="w-[540px] h-[134.141px] m-0 p-0 mx-auto text-[17px] leading-[18.5714px] text-[#555]">
            <p className="h-[44px] mb-[10px] leading-[22px]">
              Deseja realmente estornar a conta {reverseEntry?.entry_number} no valor {formatCurrency(Number(reverseEntry?.gross_amount ?? reverseEntry?.net_amount ?? 0))}?
            </p>
            <p className="h-[44px] mb-[10px] leading-[22px]">
              Ao estornar, todas as movimentações relacionadas a ela serão desfeitas. Os boletos gerados via conta digital também serão cancelados.
            </p>
          </div>
          <div className="w-[540px] mx-auto mt-[20px] text-right h-[38.1406px] flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-[33.1406px] w-[72.6875px] px-[11px] py-[7px] text-[12px] font-normal border border-[rgb(28,33,41)] text-[rgb(28,33,41)] bg-transparent rounded-[2px]"
              onClick={() => setReverseEntry(null)}
            >
              Cancelar
            </Button>
              <Button
                className="h-[33.1406px] w-[71.7188px] px-[11px] py-[7px] text-[12px] font-normal bg-[rgb(223,75,51)] text-white border border-[rgb(223,75,51)] rounded-[2px]"
                onClick={async () => {
                  if (!reverseEntry) return;
                  try {
                    await updatePayable(reverseEntry.id, { status: 'CANCELLED', net_amount: 0, paid_amount: null, payment_date: null });
                    setLastReversedId(reverseEntry.id);
                    setReverseEntry(null);
                    onAfterReverse?.();
                  } catch (e) {
                    setReverseEntry(null);
                  }
                }}
              >
                Estornar
              </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

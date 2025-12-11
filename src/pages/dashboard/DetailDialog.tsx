import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { getInstallmentBadgeVariant, formatInstallmentDisplay } from "@/utils/installmentUtils";

interface ChargeItem {
  id: string;
  valor: number;
  data_vencimento: string;
  descricao?: string;
  status: string;
  customer?: { name?: string } | null;
}

interface DetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: ChargeItem[];
}

export function DetailDialog({ open, onOpenChange, title, data }: DetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Detalhes das cobranças selecionadas</DialogDescription>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((charge) => (
                <TableRow key={charge.id}>
                  <TableCell className="font-medium">{charge.customer?.name || "Cliente não identificado"}</TableCell>
                  <TableCell>{formatCurrency(charge.valor)}</TableCell>
                  <TableCell>{format(new Date(chageDate(charge.data_vencimento)), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={getInstallmentBadgeVariant(charge.descricao)} className="text-xs">
                      {formatInstallmentDisplay(charge.descricao)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(charge.status)}`}>
                      {statusLabel(charge.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function statusClass(s: string) {
  if (s === 'RECEIVED') return 'bg-success/10 text-success';
  if (s === 'PENDING') return 'bg-primary/10 text-primary';
  if (s === 'OVERDUE') return 'bg-danger/10 text-danger';
  return 'bg-muted text-muted-foreground';
}

function statusLabel(s: string) {
  if (s === 'RECEIVED') return 'Recebido';
  if (s === 'PENDING') return 'Pendente';
  if (s === 'OVERDUE') return 'Vencido';
  if (s === 'CONFIRMED') return 'Confirmado';
  return s;
}

function chageDate(d: string) {
  return d;
}
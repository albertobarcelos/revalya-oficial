import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { listFinancialSettings } from '@/services/financialSettingsService';
import { formatCurrency } from '@/utils/formatters';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { PayableRow } from '@/services/financialPayablesService';

interface BulkPayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  payables: PayableRow[];
  onConfirm: (data: { paymentDate: string; bankAccountId: string; description: string }) => Promise<void>;
  currentTenantId?: string;
}

export function BulkPayModal({ open, onOpenChange, selectedIds, payables, onConfirm, currentTenantId }: BulkPayModalProps) {
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bankAccountId, setBankAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter selected payables
  const selectedPayables = payables.filter(p => selectedIds.includes(p.id));
  
  // Calculate totals
  const totalOriginal = selectedPayables.reduce((sum, p) => sum + (p.gross_amount ?? 0), 0);
  const totalPaid = selectedPayables.reduce((sum, p) => sum + (p.paid_amount ?? 0), 0);
  const totalNet = selectedPayables.reduce((sum, p) => sum + (p.net_amount ?? p.gross_amount ?? 0), 0);
  
  // Calculate historical additions/discounts from metadata launches if available
  let histInterest = 0;
  let histFine = 0;
  let histDiscount = 0;

  selectedPayables.forEach(p => {
    const meta = p.metadata as any;
    if (meta?.launches && Array.isArray(meta.launches)) {
      meta.launches.forEach((l: any) => {
        const amt = Number(l.amount || 0);
        if (l.typeId === 'JUROS') histInterest += amt;
        if (l.typeId === 'MULTA') histFine += amt;
        if (l.typeId === 'DESCONTO') histDiscount += amt;
      });
    }
  });

  const remainingBase = Math.max(totalNet - totalPaid, 0);
  const finalAmount = remainingBase;

  const bankAccountsQuery = useSecureTenantQuery(
    ['bank-acounts', currentTenantId],
    async (supabase, tId) => {
      const { data, error } = await supabase
        .from('bank_acounts')
        .select('id, bank, agency, count, type, tenant_id')
        .eq('tenant_id', tId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // STRICT SECURITY VALIDATION
      const invalidData = data?.filter(item => item.tenant_id !== tId);
      if (invalidData?.length > 0) throw new Error('Security Violation: Tenant Data Leak Detected');

      return (data || []).map((a: { id: string; bank: string | null }) => ({ id: a.id, label: String(a.bank ?? 'Banco') }));
    },
    {
      enabled: !!currentTenantId && open,
    }
  );

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm({
        paymentDate,
        bankAccountId,
        description,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error in bulk payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[calc(100vw-30px)] !w-[calc(100vw-30px)] !h-[calc(100vh-30px)] !left-[15px] !right-[15px] !top-[15px] !bottom-[15px] !translate-x-0 !translate-y-0 p-0 flex flex-col [&>button]:hidden">
        <div className="flex items-center justify-between h-[55px] min-h-[55px] bg-[rgb(244,245,246)] px-6">
          <DialogTitle className="text-[18px] font-normal leading-[18.48px] text-[rgb(0,0,0)]">Quitar contas a pagar</DialogTitle>
          <DialogDescription className="sr-only">Realizar quitação em lote</DialogDescription>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 text-[rgb(91,91,91)] hover:bg-transparent"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border text-center">
                <div className="text-sm text-muted-foreground mb-1">Total de contas</div>
                <div className="text-xl font-semibold text-slate-700">{selectedIds.length}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border text-center">
                <div className="text-sm text-muted-foreground mb-1">Valor original</div>
                <div className="text-xl font-semibold text-slate-700">{formatCurrency(totalOriginal)}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border text-center">
                <div className="text-sm text-muted-foreground mb-1">Já pago</div>
                <div className="text-xl font-semibold text-slate-700">{formatCurrency(totalPaid)}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border text-center">
                <div className="text-sm text-muted-foreground mb-1">Acréscimos / Descontos (Hist.)</div>
                <div className="text-sm font-medium text-red-600">
                   {histInterest + histFine > 0 && `+${formatCurrency(histInterest + histFine)}`}
                </div>
                <div className="text-sm font-medium text-green-600">
                   {histDiscount > 0 && `-${formatCurrency(histDiscount)}`}
                </div>
                {histInterest + histFine === 0 && histDiscount === 0 && <div className="text-xl font-semibold text-slate-700">R$ 0,00</div>}
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border text-center bg-emerald-50 border-emerald-100">
                <div className="text-sm text-emerald-600 mb-1 font-medium">Valor a pagar</div>
                <div className="text-xl font-bold text-emerald-700">{formatCurrency(finalAmount)}</div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Data de quitação</Label>
                <Input 
                  type="date" 
                  value={paymentDate} 
                  onChange={(e) => setPaymentDate(e.target.value)} 
                />
              </div>
              <div className="md:col-span-4 space-y-2">
                <Label>Conta bancária</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccountsQuery.data?.map((acc: { id: string; label: string }) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-6 space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Descrição do pagamento"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-white flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={isSubmitting || !bankAccountId}
          >
            {isSubmitting ? 'Processando...' : 'Quitar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

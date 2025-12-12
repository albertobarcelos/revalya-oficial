import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogDescription } from '@/components/ui/dialog';
import BillingDialogContent from '@/components/billing/kanban/BillingDialogContent';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Landmark } from 'lucide-react';
import { BankSearchContent, type BankItem } from './BankSearchContent';

type BankType = 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA';

export function BankAccountModal({
  open,
  onOpenChange,
  initial,
  banks,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: { id?: string | null; bank?: string; agency?: string; accountNumber?: string; accountDigit?: string; type?: BankType | ''; balance?: number } | null;
  banks: BankItem[];
  onSave: (values: { id?: string | null; bank: string; agency: string; accountNumber: string; accountDigit: string; type: BankType; balance: number }) => void;
}) {
  const [bankName, setBankName] = useState(String(initial?.bank || ''));
  const [bankAgency, setBankAgency] = useState(String(initial?.agency || ''));
  const [bankAccountNumber, setBankAccountNumber] = useState(String(initial?.accountNumber || ''));
  const [bankAccountDigit, setBankAccountDigit] = useState(String(initial?.accountDigit || ''));
  const [bankType, setBankType] = useState<BankType | ''>((initial?.type || '') as BankType | '');
  const [bankBalance, setBankBalance] = useState(() => {
    const n = typeof initial?.balance === 'number' ? initial!.balance : (initial?.balance ? Number(initial!.balance) : 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  });
  const [showBankSearch, setShowBankSearch] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setBankName(String(initial?.bank || ''));
    setBankAgency(String(initial?.agency || ''));
    setBankAccountNumber(String(initial?.accountNumber || ''));
    setBankAccountDigit(String(initial?.accountDigit || ''));
    setBankType(((initial?.type || '') as BankType | ''));
    {
      const n = typeof initial?.balance === 'number' ? initial!.balance : (initial?.balance ? Number(initial!.balance) : 0);
      setBankBalance(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n));
    }
    setErrors({});
  }, [initial, open]);

  const handleSave = () => {
    const name = bankName.trim();
    const agency = bankAgency.trim();
    const acctNum = bankAccountNumber.trim();
    const acctDig = bankAccountDigit.trim();
    const tipo = bankType as BankType;
    const saldoNum = (() => { const cents = bankBalance.replace(/\D/g, ''); const n = Number(cents) / 100; return isNaN(n) ? 0 : n; })();

    const newErrors: Record<string, string> = {};
    if (!name) newErrors.bank = 'Banco é obrigatório';
    if (!agency) newErrors.agency = 'Agência é obrigatória';
    if (!acctNum) newErrors.account = 'Conta é obrigatória';
    if (!acctDig) newErrors.account_digit = 'Dígito é obrigatório';
    if (acctDig.length > 1) newErrors.account_digit = 'Somente um caracter';
    if (!tipo) newErrors.type = 'Tipo é obrigatório';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSave({ id: initial?.id || null, bank: name, agency, accountNumber: acctNum, accountDigit: acctDig, type: tipo, balance: saldoNum });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BillingDialogContent className="p-0 m-0 border-0">
        <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/85 to-primary/60 border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-white/8 animate-pulse" />
          <div className="relative flex items-center justify-between px-6 py-4 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Landmark className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-semibold text-white">{initial?.id ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-white/70">Preencha os dados e salve.</DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Banco *</Label>
              <div className="relative">
                <Input className="mt-2 cursor-pointer" value={bankName} readOnly placeholder="Selecione um banco" onClick={() => setShowBankSearch(true)} />
                {errors.bank && <p className="text-sm text-red-500">{errors.bank}</p>}
              </div>
              <Dialog open={showBankSearch} onOpenChange={(open) => setShowBankSearch(open)}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Landmark className="h-5 w-5" />
                      Selecionar Banco
                    </DialogTitle>
                  </DialogHeader>
                  <BankSearchContent banks={banks} onSelect={(b) => { setBankName(b.shortName); setShowBankSearch(false); }} />
                </DialogContent>
              </Dialog>
            </div>

            <div>
              <Label>Agência *</Label>
              <Input className="mt-2" value={bankAgency} onChange={(e) => setBankAgency(e.target.value)} placeholder="Ex.: 0001" />
              {errors.agency && <p className="text-sm text-red-500">{errors.agency}</p>}
            </div>
            <div>
              <Label>Conta *</Label>
              <div className="mt-2 grid grid-cols-[1fr_80px] gap-2">
                <Input value={bankAccountNumber} inputMode="numeric" maxLength={10} onChange={(e) => { const digits = e.target.value.replace(/\D/g, '').slice(0, 10); setBankAccountNumber(digits); }} placeholder="Ex.: 123456" />
                <Input value={bankAccountDigit} inputMode="numeric" maxLength={1} onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 1); setBankAccountDigit(d); }} placeholder="Dígito" />
              </div>
              {errors.account && <p className="text-sm text-red-500">{errors.account}</p>}
              {errors.account_digit && <p className="text-sm text-red-500">{errors.account_digit}</p>}
            </div>

            <div className="md:col-span-2">
              <Label>Tipo *</Label>
              <Select value={bankType || ''} onValueChange={(v) => setBankType(v as BankType)}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="(selecione)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORRENTE">Corrente</SelectItem>
                  <SelectItem value="POUPANCA">Poupança</SelectItem>
                  <SelectItem value="SALARIO">Salário</SelectItem>
                  <SelectItem value="OUTRA">Outra</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
            </div>

            <div className="md:col-span-2">
              <Label>Saldo Atual</Label>
              <Input
                className="mt-2"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={bankBalance}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const asNumber = Number(digits || '0') / 100;
                  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asNumber);
                  setBankBalance(formatted);
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button type="button" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm" onClick={() => onOpenChange(false)}>Cancelar</button>
          <div className="flex gap-2">
            <button type="button" className="inline-flex items-center justify-center rounded-md bg-primary text-white px-4 py-2 text-sm" onClick={handleSave}>{initial?.id ? 'Salvar Edições' : 'Criar Conta'}</button>
          </div>
        </div>
      </BillingDialogContent>
    </Dialog>
  );
}

import React, { useEffect, useState } from 'react';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BillingDialogContent from '@/components/billing/kanban/BillingDialogContent';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Banknote } from 'lucide-react';

export type LaunchOperationType = 'DEBIT' | 'CREDIT' | null;

export type LaunchEditable = {
  id: string;
  name: string;
  is_active: boolean;
  operation_type: LaunchOperationType;
  generate_bank_movement: boolean;
  consider_settlement_movement: boolean;
};

/**
 * Modal de edição de Tipo de Lançamento financeiro
 * - Padrão visual atualizado com BillingDialogContent
 * - Mantém campos e validações existentes
 */
export default function LaunchEditDialog({
  open,
  onOpenChange,
  initial,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: LaunchEditable | null;
  onSave: (values: Omit<LaunchEditable, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [operation, setOperation] = useState<LaunchOperationType>(null);
  const [bankMovement, setBankMovement] = useState(false);
  const [settlementMovement, setSettlementMovement] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name || '');
      setActive(!!initial.is_active);
      setOperation(initial.operation_type ?? null);
      setBankMovement(!!initial.generate_bank_movement);
      setSettlementMovement(!!initial.consider_settlement_movement);
    }
  }, [initial]);

  const handleSave = () => {
    onSave({
      name,
      is_active: active,
      operation_type: operation,
      generate_bank_movement: bankMovement,
      consider_settlement_movement: settlementMovement,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BillingDialogContent className="p-0 m-0 border-0">
        <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/85 to-primary/60 border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-white/8 animate-pulse" />
          <div className="relative flex items-center justify-between px-6 py-4 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Banknote className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-semibold text-white">Editar tipo de lançamento financeiro</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-white/70">Atualize os dados e salve.</DialogDescription>
          </div>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto">
          <div>
            <Label>Nome</Label>
            <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Saída, Entrada, Transferência" />
          </div>
          <div className="flex flex-col gap-2 mt-2 md:mt-0">
            <Label>Situação</Label>
            <div className="flex items-center gap-3 md:mt-5">
              <span className={`${active ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'} px-3 py-1 rounded-md text-xs font-medium`}>{active ? 'Ativo' : 'Inativo'}</span>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Tipo de operação</Label>
            <Select value={operation ?? ''} onValueChange={(v) => setOperation((v || '') as LaunchOperationType)}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="(selecione)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DEBIT">Débito</SelectItem>
                <SelectItem value="CREDIT">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-3 mt-2">
            <label className="flex items-center gap-2">
              <Checkbox checked={bankMovement} onCheckedChange={(v) => setBankMovement(!!v)} />
              Gerar movimento bancário
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={settlementMovement} onCheckedChange={(v) => setSettlementMovement(!!v)} />
              Considerar movimentação de quitação
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50">
          <Button onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </div>
      </BillingDialogContent>
    </Dialog>
  );
}


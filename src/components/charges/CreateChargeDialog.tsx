import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useCharges } from "@/hooks/useCharges";
import { Loader2 } from "lucide-react";

interface CreateChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChargeDialog({ open, onOpenChange }: CreateChargeDialogProps) {
  const [dueDate, setDueDate] = useState<Date>();
  const { toast } = useToast();
  const { create, isCreating } = useCharges();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    const customer = formData.get('customer') as string;
    
    if (!dueDate) {
      toast({
        title: "Data de vencimento obrigatória",
        description: "Por favor, selecione uma data de vencimento.",
        variant: "destructive",
      });
      return;
    }

    const chargeData = {
      amount,
      description,
      customer_id: customer,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending' as const
    };

    const success = await create(chargeData);
    if (success) {
      onOpenChange(false);
      // Reset form
      setDueDate(undefined);
      e.currentTarget.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Cobrança</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para criar uma nova cobrança
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Cliente</Label>
            <Select name="customer">
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {/* Adicionar lista de clientes aqui */}
                <SelectItem value="placeholder">Cliente Exemplo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Data de Vencimento</Label>
            <DatePicker date={dueDate} setDate={setDueDate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              name="description"
              placeholder="Descrição da cobrança"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating ? "Criando..." : "Criar Cobrança"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

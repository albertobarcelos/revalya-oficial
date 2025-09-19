import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaymentDetailsProps {
  value: number;
  onValueChange: (value: number) => void;
  dueDate: string;
  onDueDateChange: (date: string) => void;
  billingType: string;
  onBillingTypeChange: (type: string) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
}

export function PaymentDetails({
  value,
  onValueChange,
  dueDate,
  onDueDateChange,
  billingType,
  onBillingTypeChange,
  description,
  onDescriptionChange,
}: PaymentDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Grid responsivo para valor e data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">Valor*</Label>
          <Input
            id="value"
            type="number"
            step="0.01"
            value={value || ''}
            onChange={(e) => onValueChange(parseFloat(e.target.value))}
            placeholder="0,00"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Data de Vencimento*</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate || ''}
            onChange={(e) => {
              const selectedDate = e.target.value;
              onDueDateChange(selectedDate);
            }}
            className="w-full"
          />
        </div>
      </div>

      {/* Tipo de cobrança em largura total */}
      <div className="space-y-2">
        <Label htmlFor="billingType">Tipo de Cobrança*</Label>
        <Select
          value={billingType}
          onValueChange={onBillingTypeChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BOLETO">Boleto</SelectItem>
            <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
            <SelectItem value="PIX">PIX</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Descrição em largura total */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Input
          id="description"
          value={description || ''}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Descrição da cobrança"
          className="w-full"
        />
      </div>
    </div>
  );
}

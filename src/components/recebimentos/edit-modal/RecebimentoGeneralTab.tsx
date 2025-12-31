import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, User, Hash, Tag, FileText, Landmark, AlignLeft, DollarSign } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useEditRecebimentoLogic } from './useEditRecebimentoLogic';

interface RecebimentoGeneralTabProps {
  form: ReturnType<typeof useEditRecebimentoLogic>;
  readOnly?: boolean;
}

export const RecebimentoGeneralTab: React.FC<RecebimentoGeneralTabProps> = ({ form, readOnly }) => {
  const {
    amount, setAmount,
    dueDate, setDueDate,
    paymentDate, setPaymentDate,
    description, setDescription,
    category, setCategory,
    customerId, setCustomerId,
    bankAccountId, setBankAccountId,
    showErrors,
    customersQuery,
    categoriesQuery,
    bankAccountsQuery,
  } = form;

  const [openDueDatePicker, setOpenDueDatePicker] = useState(false);
  const [openPaymentDatePicker, setOpenPaymentDatePicker] = useState(false);

  // Helper to parse date string as local date (prevents timezone issues)
  const parseLocalDate = (dateString: string) => {
    if (!dateString) return undefined;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper to handle date selection
  const handleDateSelect = (date: Date | undefined, setter: (d: string) => void, close: () => void) => {
    if (date) {
      setter(format(date, 'yyyy-MM-dd'));
      close();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Cliente */}
      <div className="lg:col-span-1">
        <Label className={cn("text-sm font-medium mb-2 block", showErrors && !customerId ? "text-red-500" : "")}>
          Cliente *
        </Label>
        <Select value={customerId} onValueChange={setCustomerId} disabled={!!readOnly}>
          <SelectTrigger 
            disabled={!!readOnly} 
            className={cn(
              "w-full h-10 bg-white pl-9 relative font-medium", 
              showErrors && !customerId ? "border-red-500 ring-red-500" : ""
            )}
          >
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {customersQuery.data?.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name || c.company || 'Sem nome'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Descrição */}
      <div className="lg:col-span-2">
        <Label className={cn("text-sm font-medium mb-2 block", showErrors && !description ? "text-red-500" : "")}>
          Descrição *
        </Label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            disabled={!!readOnly}
            placeholder="Ex: Recebimento referente ao serviço X"
            className={cn(
              "pl-9 h-10 bg-white font-medium",
              showErrors && !description ? "border-red-500 ring-red-500" : ""
            )}
          />
        </div>
      </div>

      {/* Valor */}
      <div>
        <Label className={cn("text-sm font-medium mb-2 block", showErrors && !amount ? "text-red-500" : "")}>
          Valor (R$) *
        </Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="number"
            step="0.01"
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            disabled={!!readOnly}
            placeholder="0,00"
            className={cn(
              "pl-9 h-10 bg-white font-medium text-lg",
              showErrors && !amount ? "border-red-500 ring-red-500" : ""
            )}
          />
        </div>
      </div>

      {/* Data de Vencimento */}
      <div>
        <Label className={cn("text-sm font-medium mb-2 block", showErrors && !dueDate ? "text-red-500" : "")}>
          Vencimento *
        </Label>
        <Popover open={openDueDatePicker} onOpenChange={setOpenDueDatePicker}>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              disabled={!!readOnly}
              className={cn(
                "w-full h-10 pl-9 justify-start text-left font-normal relative bg-white",
                !dueDate && "text-muted-foreground",
                showErrors && !dueDate ? "border-red-500 ring-red-500" : ""
              )}
            >
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              {dueDate ? format(parseLocalDate(dueDate)!, "dd/MM/yyyy") : <span>Selecione a data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={parseLocalDate(dueDate)}
              onSelect={(date) => handleDateSelect(date, setDueDate, () => setOpenDueDatePicker(false))}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Data de Pagamento */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Data de Pagamento
        </Label>
        <Popover open={openPaymentDatePicker} onOpenChange={setOpenPaymentDatePicker}>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              disabled={!!readOnly}
              className={cn(
                "w-full h-10 pl-9 justify-start text-left font-normal relative bg-white",
                !paymentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              {paymentDate ? format(parseLocalDate(paymentDate)!, "dd/MM/yyyy") : <span>Selecione a data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={parseLocalDate(paymentDate)}
              onSelect={(date) => handleDateSelect(date, setPaymentDate, () => setOpenPaymentDatePicker(false))}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Categoria */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Categoria
        </Label>
        <Select value={category} onValueChange={setCategory} disabled={!!readOnly}>
          <SelectTrigger disabled={!!readOnly} className="w-full h-10 bg-white pl-9 relative font-medium">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {categoriesQuery.data?.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conta Bancária */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Conta Bancária
        </Label>
        <Select value={bankAccountId} onValueChange={setBankAccountId} disabled={!!readOnly}>
          <SelectTrigger disabled={!!readOnly} className="w-full h-10 bg-white pl-9 relative font-medium">
            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {bankAccountsQuery.data?.map((acc: any) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

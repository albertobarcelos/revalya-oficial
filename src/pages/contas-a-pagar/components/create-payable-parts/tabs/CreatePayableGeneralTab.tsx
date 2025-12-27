import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, RefreshCw, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useCreatePayableLogic } from '../useCreatePayableLogic';

interface CreatePayableGeneralTabProps {
  form: ReturnType<typeof useCreatePayableLogic>;
}

export const CreatePayableGeneralTab: React.FC<CreatePayableGeneralTabProps> = ({ form }) => {
  const {
    amount, setAmount,
    dueDate, setDueDate,
    issueDate, setIssueDate,
    entryNumber, setEntryNumber,
    category, setCategory,
    documentId, setDocumentId,
    description, setDescription,
    repeat,
    bankAccountId, setBankAccountId,
    customerId, setCustomerId,
    showErrors,
    customersQuery,
    categoriesQuery,
    documentsQuery,
    bankAccountsQuery,
    recurrenceTimes,
    handleClose,
    handleSave,
    handleGenerateNumber,
    createdEntry,
    isSaving,
  } = form;

  const [openDueDatePicker, setOpenDueDatePicker] = useState(false);
  const [openIssueDatePicker, setOpenIssueDatePicker] = useState(false);

  // Helper to handle date selection
  const handleDateSelect = (date: Date | undefined, setter: (d: string) => void, close: () => void) => {
    if (date) {
      setter(format(date, 'yyyy-MM-dd'));
      close();
    }
  };

  const calendarClassNames = {
    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
    month: "space-y-4",
    caption: "flex justify-center pt-1 relative items-center",
    caption_label: "text-sm font-medium",
    nav: "space-x-1 flex items-center",
    nav_button: cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      "h-7 w-7"
    ),
    nav_button_previous: "absolute left-1",
    nav_button_next: "absolute right-1",
    table: "w-full border-collapse space-y-1",
    head_row: "flex",
    head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
    row: "flex w-full mt-2",
    cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
    day: cn(
      "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md",
      "hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all duration-200",
    )
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Label className={cn("text-sm font-medium mb-2 block", showErrors && !customerId ? "text-red-500" : "")}>
            Favorecido/Fornecedor *
          </Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className={cn("w-full h-10 bg-background", showErrors && !customerId ? "border-red-500 ring-red-500" : "")}>
              <SelectValue placeholder="Selecione o fornecedor" />
            </SelectTrigger>
            <SelectContent className="w-[380px] max-h-[320px] overflow-auto">
              {customersQuery.data?.map((c: any) => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  className="whitespace-normal break-words py-2.5 px-3 text-sm leading-5 min-h-[36px]"
                >
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showErrors && !customerId && (
            <span className="text-xs text-red-500 mt-1 block">Campo obrigatório</span>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <Label>Valor</Label>
            <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded">
              {repeat ? `001/${String(((parseInt(recurrenceTimes) || 0) + 1)).padStart(3, '0')}` : '001/001'}
            </span>
          </div>
          <Input 
            className="h-10 font-medium"
            placeholder="R$ 0,00" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
          />
        </div>

        <div>
          <Label className="mb-1.5 block">Data de emissão</Label>
          <Popover open={openIssueDatePicker} onOpenChange={setOpenIssueDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal h-10",
                  !issueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {issueDate ? format(new Date(issueDate + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-border/50 bg-card/95 backdrop-blur-sm" align="start">
              <div className="p-3">
                <Calendar
                  mode="single"
                  selected={issueDate ? new Date(issueDate + 'T00:00:00') : undefined}
                  onSelect={(date) => handleDateSelect(date, setIssueDate, () => setOpenIssueDatePicker(false))}
                  initialFocus
                  locale={ptBR}
                  classNames={calendarClassNames}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="mb-1.5 block">Número</Label>
            <Input 
              value={entryNumber} 
              onChange={(e) => setEntryNumber(e.target.value)} 
              disabled={!!createdEntry} 
              className="h-10" 
              placeholder="Ex: DES-01" 
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={handleGenerateNumber}
            disabled={!!createdEntry}
            title="Gerar próximo número"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div>
          <Label className="mb-1.5 block">Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent className="w-[380px] max-h-[320px] overflow-auto">
              {categoriesQuery.data?.map((c: any) => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  className="whitespace-normal break-words py-2.5 px-3 text-sm leading-5 min-h-[36px]"
                >
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block">Data de vencimento</Label>
          <Popover open={openDueDatePicker} onOpenChange={setOpenDueDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal h-10",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(new Date(dueDate + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-border/50 bg-card/95 backdrop-blur-sm" align="start">
              <div className="p-3">
                <Calendar
                  mode="single"
                  selected={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
                  onSelect={(date) => handleDateSelect(date, setDueDate, () => setOpenDueDatePicker(false))}
                  initialFocus
                  locale={ptBR}
                  classNames={calendarClassNames}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="mb-1.5 block">Tipo de documento</Label>
          <Select value={documentId} onValueChange={setDocumentId}>
            <SelectTrigger className="w-full h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent className="w-[380px] max-h-[320px] overflow-auto">
              {documentsQuery.data?.map((d: any) => (
                <SelectItem
                  key={d.id}
                  value={d.id}
                  className="whitespace-normal break-words py-2.5 px-3 text-sm leading-5 min-h-[36px]"
                >
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-2">
          <Label className="mb-1.5 block">Conta bancária</Label>
          <Select value={bankAccountId} onValueChange={setBankAccountId}>
            <SelectTrigger className="w-full h-10"><SelectValue placeholder="Selecione a conta bancária" /></SelectTrigger>
            <SelectContent className="w-[380px] max-h-[320px] overflow-auto">
              {bankAccountsQuery.data?.map((b: any) => (
                <SelectItem
                  key={b.id}
                  value={b.id}
                  className="whitespace-normal break-words py-2.5 px-3 text-sm leading-5 min-h-[36px]"
                >
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="lg:col-span-3">
          <Label className="mb-1.5 block">Descrição (opcional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-10" placeholder="Detalhes adicionais sobre a conta" />
        </div>
      </div>
      
      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
        <Button variant="outline" onClick={handleClose} className="h-10" disabled={isSaving}>
          Cancelar
        </Button>
        {!createdEntry ? (
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => handleSave(true)}
              className="h-10"
              disabled={isSaving}
            >
              Salvar e criar outra
            </Button>
            <Button 
              onClick={() => handleSave(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 min-w-[140px]"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          </div>
        ) : (
          <Button 
            onClick={handleClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 min-w-[140px]"
          >
            Concluir
          </Button>
        )}
      </div>
    </>
  );
};

import React, { useState } from 'react';
import { Trash, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useEditPayableLogic, LAUNCH_TYPES } from '../useEditPayableLogic';

interface PayableLaunchesTabProps {
  form: ReturnType<typeof useEditPayableLogic>;
  isSettled?: boolean;
}

export const PayableLaunchesTab: React.FC<PayableLaunchesTabProps> = ({ form, isSettled }) => {
  const {
    launchAmount, setLaunchAmount,
    launchDate, setLaunchDate,
    launchType, setLaunchType,
    launchDescription, setLaunchDescription,
    launches,
    handleAddLaunch,
    handleDeleteLaunch,
  } = form;

  const [openLaunchDatePicker, setOpenLaunchDatePicker] = useState(false);

  const handleDateSelect = (date: Date | undefined, setter: (d: string) => void, close: () => void) => {
    if (date) {
      setter(format(date, 'yyyy-MM-dd'));
      close();
    }
  };

  const calendarClassNames = {
    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
    day_today: "bg-accent text-accent-foreground",
    day_outside: "text-muted-foreground opacity-50",
    day_disabled: "text-muted-foreground opacity-50",
    day_hidden: "invisible",
  };

  return (
    <div className="mt-6 space-y-4">
      {isSettled && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm border border-emerald-100 flex items-center gap-2 mb-4">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Esta conta está quitada. Para adicionar novos lançamentos, é necessário excluir um pagamento existente.
        </div>
      )}
      
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", isSettled && "opacity-50 pointer-events-none grayscale")}>
        <div>
          <Label className="mb-2 block">Valor</Label>
          <Input 
            placeholder="R$ 0,00" 
            value={launchAmount} 
            onChange={(e) => setLaunchAmount(e.target.value)} 
            className="h-10"
            disabled={isSettled}
          />
        </div>
        <div>
          <Label className="mb-2 block">Data</Label>
          <Popover open={openLaunchDatePicker} onOpenChange={setOpenLaunchDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                disabled={isSettled}
                className={cn(
                  "w-full justify-start text-left font-normal h-10",
                  !launchDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {launchDate ? format(new Date(launchDate + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-border/50 bg-card/95 backdrop-blur-sm" align="start">
              <div className="p-3">
                <Calendar
                  mode="single"
                  selected={launchDate ? new Date(launchDate + 'T00:00:00') : undefined}
                  onSelect={(date) => handleDateSelect(date, setLaunchDate, () => setOpenLaunchDatePicker(false))}
                  initialFocus
                  locale={ptBR}
                  classNames={calendarClassNames}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label className="mb-2 block">Tipo de lançamento</Label>
          <Select value={launchType} onValueChange={setLaunchType} disabled={isSettled}>
            <SelectTrigger className="w-full h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent className="w-[380px] max-h-[320px] overflow-auto">
              {Object.entries(LAUNCH_TYPES).map(([key, value]) => (
                <SelectItem
                  key={key}
                  value={key}
                  className="whitespace-normal break-words py-2.5 px-3 text-sm leading-5 min-h-[36px]"
                >
                  {value.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Label className="mb-2 block">Descrição</Label>
          <Input 
            value={launchDescription} 
            onChange={(e) => setLaunchDescription(e.target.value)} 
            className="h-10"
            disabled={isSettled}
          />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <Button onClick={handleAddLaunch} className="h-10 px-6" disabled={isSettled}>Lançar</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
        <div className="font-semibold mb-3">Listagem de lançamentos</div>
        {launches.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum lançamento cadastrado</div>
        ) : (
          <div className="space-y-2">
            {launches.map((l, idx) => (
              <div key={idx} className="grid grid-cols-6 items-center gap-2 py-2 border-b last:border-0">
                <div className="col-span-1">
                  <span className={cn(
                    "inline-block w-3 h-3 rounded-full",
                    l.operation === 'DEBIT' ? "bg-red-500" : "bg-emerald-500"
                  )} />
                </div>
                <div className="col-span-1 text-sm">{new Date(l.date).toLocaleDateString('pt-BR')}</div>
                <div className="col-span-2 text-sm">
                  <div className="font-medium">{LAUNCH_TYPES[l.typeId as keyof typeof LAUNCH_TYPES]?.name || 'Lançamento'}</div>
                  <div className="text-muted-foreground">{l.description}</div>
                </div>
                <div className={cn(
                  "col-span-1 text-sm font-medium",
                  l.operation === 'DEBIT' ? 'text-red-600' : 'text-emerald-600'
                )}>
                  {l.operation === 'DEBIT' ? '-' : '+'}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.amount)}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDeleteLaunch(idx)}>
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

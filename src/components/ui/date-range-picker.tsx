"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

interface DateRangePickerProps {
  date?: DateRange;
  onDateChange: (date: DateRange) => void;
  className?: string;
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(date || undefined);

  const handleSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
  };

  const handleApply = () => {
    if (selectedRange?.from && selectedRange?.to) {
      onDateChange(selectedRange);
      setOpen(false);
    } else {
      console.log('Selecione ambas as datas para aplicar o filtro');
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal border border-border bg-card text-foreground placeholder:text-muted-foreground hover:bg-accent",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(date.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                "Selecione a data final"
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover border border-border" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={selectedRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={ptBR}
          />
          <div className="flex justify-end gap-2 p-3 border-t border-border bg-card">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRange(undefined);
                onDateChange(undefined);
                setOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApply}
              disabled={!selectedRange?.from || !selectedRange?.to}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DatePickerWithRange({
  date,
  setDate,
}: {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(date || undefined);

  const handleSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
  };

  const handleApply = () => {
    if (selectedRange?.from && selectedRange?.to) {
      setDate(selectedRange);
      setOpen(false);
    } else {
      console.log('Selecione ambas as datas para aplicar o filtro');
    }
  };

  return (
    <div className="grid gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(date.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                "Selecione a data final"
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from || new Date()}
            selected={selectedRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={ptBR}
          />
          <div className="flex justify-end gap-2 p-3 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRange(undefined);
                setDate(undefined);
                setOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApply}
              disabled={!selectedRange?.from || !selectedRange?.to}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

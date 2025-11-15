import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';

interface ChargeGroupProps {
  group: {
    charges: any[];
    color: string;
    label: string;
  };
  groupKey: string;
  onClick: () => void;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  onDateRangeChange?: (range: { startDate: Date; endDate: Date }) => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export function ChargeGroup({ group, groupKey, onClick, dateRange, onDateRangeChange }: ChargeGroupProps) {
  const totalValue = group.charges.reduce((sum, charge) => sum + (Number(charge.valor) || 0), 0);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
    dateRange ? { from: dateRange.startDate, to: dateRange.endDate } : undefined
  );

  // AIDEV-NOTE: Sincronizar selectedRange quando dateRange mudar externamente
  useEffect(() => {
    if (dateRange) {
      setSelectedRange({ from: dateRange.startDate, to: dateRange.endDate });
    }
  }, [dateRange]);

  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
  };

  const handleDateApply = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir que o onClick do card seja acionado
    if (selectedRange?.from && selectedRange?.to && onDateRangeChange) {
      onDateRangeChange({
        startDate: selectedRange.from,
        endDate: selectedRange.to
      });
      setIsDatePickerOpen(false);
    }
  };

  const handleDateCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRange(dateRange ? { from: dateRange.startDate, to: dateRange.endDate } : undefined);
    setIsDatePickerOpen(false);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${group.color} rounded-lg p-3 sm:p-4 cursor-pointer`}
      onClick={onClick}
    >
      <h3 className="text-lg sm:text-xl font-semibold text-white">{group.label}</h3>
      <p className="text-2xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{group.charges.length}</p>
      <p className="text-xs sm:text-sm text-white/90">
        {group.charges.length === 1 ? 'cliente' : 'clientes'}
      </p>
      <div className="mt-3 sm:mt-4 border-t border-white/20 pt-3 sm:pt-4">
        <p className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
        <p className="text-xs sm:text-sm text-white/90">Total</p>

        {groupKey === 'paid' && dateRange && (
          <div className="mt-3 border-t border-white/20 pt-3">
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevenir que o onClick do card seja acionado
                    setIsDatePickerOpen(true);
                  }}
                  className="flex items-center justify-between w-full text-white/90 text-xs hover:text-white transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(dateRange.startDate, 'dd/MM/yyyy', { locale: ptBR })} - {format(dateRange.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0" 
                align="start"
                onClick={(e) => e.stopPropagation()} // Prevenir propagação do evento
              >
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.startDate}
                  selected={selectedRange}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                  locale={ptBR}
                />
                <div className="flex justify-end gap-2 p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDateCancel}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDateApply}
                    disabled={!selectedRange?.from || !selectedRange?.to}
                  >
                    Aplicar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </motion.div>
  );
}

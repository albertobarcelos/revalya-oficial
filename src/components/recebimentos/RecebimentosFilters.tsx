import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface RecebimentosFiltersProps {
  filters: {
    search: string;
    status: string;
    type: string;
  };
  onFiltersChange: (next: Partial<RecebimentosFiltersProps['filters']>) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

/**
 * Barra de filtros e ações de exportação de Recebimentos.
 */
export function RecebimentosFilters({
  filters,
  onFiltersChange,
  dateRange,
  onDateRangeChange,
  onExportCSV,
  onExportPDF
}: RecebimentosFiltersProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col md:flex-row md:items-end space-y-3 md:space-y-0 md:space-x-4 flex-1">
        <div>
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            placeholder="Descrição..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="mt-1 w-full md:w-80 h-9"
          />
        </div>
        <div>
          <Label htmlFor="type">Tipo</Label>
          <Select value={filters.type} onValueChange={(value) => onFiltersChange({ type: value })}>
            <SelectTrigger className="mt-1 w-full md:w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RECEIVABLE">Recebimentos</SelectItem>
              <SelectItem value="PAYABLE">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={filters.status} onValueChange={(value) => onFiltersChange({ status: value })}>
            <SelectTrigger className="mt-1 w-full md:w-40 h-9">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="PAID">Pago</SelectItem>
              <SelectItem value="OVERDUE">Vencido</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Período</Label>
          <div className="mt-1 flex items-end gap-2 w-full md:w-80">
            <DateRangePicker
              date={dateRange}
              onDateChange={(range: DateRange | undefined) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to });
                }
              }}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end">
        <Button variant="outline" onClick={onExportCSV} className="gap-2">
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button onClick={onExportPDF} className="gap-2">
          <FileText className="h-4 w-4" /> PDF
        </Button>
      </div>
    </div>
  );
}


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
    <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end flex-1 w-full">
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            placeholder="Descrição..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="w-full h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select value={filters.type} onValueChange={(value) => onFiltersChange({ type: value })}>
            <SelectTrigger className="w-full h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RECEIVABLE">Recebimentos</SelectItem>
              <SelectItem value="PAYABLE">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={filters.status} onValueChange={(value) => onFiltersChange({ status: value })}>
            <SelectTrigger className="w-full h-10">
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
        <div className="space-y-2">
          <Label>Período</Label>
          <div className="w-full">
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
      <div className="flex items-center gap-2 justify-end pt-2 xl:pt-0">
        <Button variant="outline" onClick={onExportCSV} className="gap-2 w-full sm:w-auto">
          <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
        </Button>
        <Button onClick={onExportPDF} className="gap-2 w-full sm:w-auto">
          <FileText className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
        </Button>
      </div>
    </div>
  );
}


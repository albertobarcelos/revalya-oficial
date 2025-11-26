import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { DateRange } from "react-day-picker";

interface HeaderControlsProps {
  dateRange: DateRange;
  onDateChange: (range: DateRange | undefined) => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
}

export function HeaderControls({ dateRange, onDateChange, onExportCsv, onExportExcel }: HeaderControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-1">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-sm">Exportar</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onExportCsv}>CSV</DropdownMenuItem>
          <DropdownMenuItem onClick={onExportExcel}>Excel (cores)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DateRangePicker date={dateRange} onDateChange={onDateChange} />
    </div>
  );
}
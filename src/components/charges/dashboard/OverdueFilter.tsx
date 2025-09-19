import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OverdueFilterProps {
  value: number;
  onChange: (value: number) => void;
}

export function OverdueFilter({ value, onChange }: OverdueFilterProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Filtrar vencidos:</span>
      <Select value={value.toString()} onValueChange={(val) => onChange(Number(val))}>
        <SelectTrigger className="w-[90px] sm:w-[120px] h-8 sm:h-10 text-xs sm:text-sm">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">7 dias</SelectItem>
          <SelectItem value="15">15 dias</SelectItem>
          <SelectItem value="30">30 dias</SelectItem>
          <SelectItem value="60">60 dias</SelectItem>
          <SelectItem value="0">Todos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

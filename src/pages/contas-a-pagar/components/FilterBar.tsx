import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function FilterBar({
  search,
  onSearchChange,
  onToggleFilters,
  showFilters,
  onOpenCreate,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onToggleFilters: () => void;
  showFilters: boolean;
  onOpenCreate: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 w-full">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="form-control pl-[34px] py-[6px] h-[34px] w-full text-[12px] italic text-[#4A8BE9] bg-white border border-transparent border-l-0 rounded-none shadow-none z-20"
            placeholder="Busque por detalhes, número, nome, vencimento ou valor"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Button variant="link" onClick={onToggleFilters}>
          {showFilters ? 'Ocultar filtros' : 'Exibir filtros'}
        </Button>
      </div>
      <Button onClick={onOpenCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Nova conta a pagar
      </Button>
    </div>
  );
}

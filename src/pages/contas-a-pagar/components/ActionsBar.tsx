import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

export function ActionsBar({ selectedCount, onBulkMarkAsPaid, rightActions }: { selectedCount: number; onBulkMarkAsPaid: () => void; rightActions?: React.ReactNode }) {
  return (
    <div className="mt-4 mb-4 flex items-center justify-between">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Ações ({selectedCount} selecionadas)</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onBulkMarkAsPaid} disabled={selectedCount === 0}>Marcar como pagas</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {rightActions}
    </div>
  );
}

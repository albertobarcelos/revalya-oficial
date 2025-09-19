import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ClientSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  onNewClient: () => void;
  clients: Array<{ id: string; name: string; }>;
}

export function ClientSelect({ value, onValueChange, onNewClient, clients }: ClientSelectProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="customer" className="text-sm font-medium text-gray-700">
        Cliente
      </Label>
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-full sm:flex-1 h-11">
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          type="button"
          onClick={onNewClient}
          className="w-full sm:w-auto sm:min-w-[140px] h-11 flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="sm:hidden">Novo Cliente</span>
        </Button>
      </div>
    </div>
  );
}

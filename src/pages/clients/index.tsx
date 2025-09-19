import { useCustomers } from '@/hooks/useCustomers';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { clientsService } from '@/services/clientsService';

export default function ClientsPage() {
  // Este componente parece não estar sendo utilizado, já que temos Clients.tsx
  // Mas atualizamos a importação do hook useCustomers para manter a consistência
  return (
    <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">
            Gerencie seus clientes e suas informações
          </p>
        </div>
      </div>
      {/* Resto do conteúdo da página */}
    </div>
  );
} 

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Building2, LogOut, Grid2X2 } from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { usePortal } from '@/contexts/PortalContext';
import { useToast } from '@/components/ui/use-toast';

export function PortalSelectorButton() {
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { getPortalRoute } = usePortal();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchPortal = () => {
    // Usamos a rota correta conforme definido em App.tsx
    navigate('/meus-aplicativos');
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      toast({
        title: 'Logout realizado com sucesso',
        description: 'Você foi desconectado do sistema.',
      });
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: 'Erro ao fazer logout',
        description: 'Não foi possível desconectar. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Grid2X2 className="h-4 w-4" />
          <span className="hidden md:inline">Portais</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSwitchPortal}>
          <Building2 className="mr-2 h-4 w-4" />
          <span>Trocar de Portal</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? 'Saindo...' : 'Sair'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

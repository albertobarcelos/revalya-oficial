import { LogOut, Search, Settings, User, Building2 } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { NotificationSheet } from "@/components/notifications/NotificationSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { ReactNode } from "react";

interface HeaderProps {
  children?: ReactNode;
}

const Header = ({ children }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Extrair o ID do tenant da URL atual, se estiver em uma rota de tenant
  const pathSegments = location.pathname.split('/').filter(segment => segment);
  // No novo formato, a primeira parte da URL é diretamente o ID do tenant
  // Verificamos se não é uma rota administrativa ou de autenticação
  const isInTenant = pathSegments.length >= 1 && 
                     pathSegments[0] !== 'admin' && 
                     pathSegments[0] !== 'login' && 
                     pathSegments[0] !== 'register' &&
                     pathSegments[0] !== 'meus-aplicativos';
  const tenantId = isInTenant ? pathSegments[0] : '';

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        title: "Erro ao sair",
        description: "Não foi possível fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center space-x-4">
          <Breadcrumbs />
          <div className="flex-1" />
          {children && (
            <div className="mr-4">
              {children}
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-md">
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <NotificationSheet />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-accent">
                  <User size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/meus-aplicativos")}>
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Meus Aplicativos</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(isInTenant ? `/${tenantId}/profile` : "/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(isInTenant ? `/${tenantId}/settings` : "/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

// Exportação nomeada para compatibilidade com diferentes tipos de import
export { Header };
export default Header;

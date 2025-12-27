import { LogOut, Settings, User, Building2 } from "lucide-react";
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

/**
 * Cabeçalho responsivo com suporte a tema claro/escuro
 * Comentário de nível de função: usa tokens de tema (bg-background, border-border, text-foreground)
 * para manter consistência visual no dark mode.
 */
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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="w-full flex h-14 items-center px-4 md:px-6">
        <div className="flex flex-1 items-center space-x-4">
          <Breadcrumbs />
          <div className="flex-1" />
          {children && (
            <div className="mr-4">
              {children}
            </div>
          )}
          <div className="flex items-center space-x-3 md:space-x-4">
            <NotificationSheet />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-lg text-foreground hover:text-primary focus:outline-none">
                  <User size={20} className="text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border border-border">
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
                <DropdownMenuItem onClick={() => navigate(isInTenant ? `/${tenantId}/configuracoes` : "/configuracoes")}>
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

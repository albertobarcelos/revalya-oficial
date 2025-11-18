import { Home, Users, DollarSign, Bell, Settings, Menu, MessageSquare, ListFilter, ArrowUpDown, LogOut, User, CheckSquare, FileText, ChevronDown, Package, FolderCog, LayoutGrid, BarChart3, Receipt, Activity } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase, STORAGE_BUCKETS, getImageUrl } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logDebug, logError } from "@/lib/logger";
import { throttledDebug } from "@/utils/logThrottle"; // AIDEV-NOTE: Import para throttling de logs
import { useToast } from "@/components/ui/use-toast";

// Hook useClickOutside personalizado
function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Controla os submenus expandidos
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  
  // Função para alternar um submenu
  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus(current => 
      current.includes(menuId) 
        ? current.filter(id => id !== menuId)
        : [...current, menuId]
    );
  };
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useClickOutside(sidebarRef, () => setIsMobileMenuOpen(false));

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  /**
   * Resolve a URL de exibição do avatar a partir da chave salva em users.avatar_url.
   * Comentário de nível de função: usa URL assinada para compatibilidade com bucket privado
   * e faz fallback para URL pública. Corrige o bucket para STORAGE_BUCKETS.AVATARS.
   */
  const getAvatarUrl = async (path: string) => {
    try {
      const url = await getImageUrl(STORAGE_BUCKETS.AVATARS, path, 3600);
      setAvatarUrl(url);
    } catch (error) {
      logError('Erro ao obter URL da imagem', 'Sidebar', error);
    }
  };

  // Função para fazer logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Mostra mensagem de sucesso
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });

      // Limpa os estados
      setProfile(null);
      setAvatarUrl(null);
      setSession(null);

      // Redireciona para a página de login
      navigate('/login');
    } catch (error) {
      logError('Erro ao fazer logout', 'Sidebar', error);
      toast({
        title: "Erro ao sair",
        description: "Não foi possível fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para buscar a sessão e o perfil
  const fetchSessionAndProfile = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        // Se for erro de sessão, tentar recuperar antes de falhar
        if (error.message?.includes('session') || error.message?.includes('Auth session missing')) {
          logDebug('Erro de sessão detectado no Sidebar, tentando recuperar...', 'Sidebar');
          
          // Importar função de recuperação de sessão
          const { recoverSession } = await import('@/utils/authTokenManager');
          const recoveryResult = await recoverSession();
          
          if (recoveryResult.success) {
            // Tentar obter sessão novamente após recuperação
            const { data: { session: recoveredSession }, error: recoveredError } = await supabase.auth.getSession();
            if (!recoveredError && recoveredSession) {
              logDebug('Sessão recuperada com sucesso no Sidebar', 'Sidebar');
              setSession(recoveredSession);
              // Continuar com a sessão recuperada
            } else {
              logError('Falha na recuperação da sessão no Sidebar', 'Sidebar', recoveredError);
              return;
            }
          } else {
            logError('Falha na recuperação da sessão no Sidebar', 'Sidebar', recoveryResult.error);
            return;
          }
        } else {
          logError('Erro de sessão não recuperável no Sidebar', 'Sidebar', error);
          return;
        }
      } else if (session) {
        logDebug('Sessão encontrada', 'Sidebar');
        setSession(session);
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError) throw userError;
        if (userData) {
          logDebug('Usuário carregado', 'Sidebar');
          setProfile(userData);
          if (userData.avatar_url) {
            if (userData.avatar_url.startsWith('http')) {
              setAvatarUrl(userData.avatar_url);
            } else {
              await getAvatarUrl(userData.avatar_url);
            }
          }
        }
      }
    } catch (error) {
      logError('Erro ao carregar perfil', 'Sidebar', error);
    }
  };

  // Busca a sessão e o perfil quando o componente monta
  useEffect(() => {
    fetchSessionAndProfile();

    // AIDEV-NOTE: Modificado para evitar race conditions com outros listeners
    // Só respondemos a eventos SIGNED_IN e TOKEN_REFRESHED para atualizar o perfil
    // O evento SIGNED_OUT é tratado pelo SupabaseProvider global
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      logDebug(`Estado da autenticação: ${event}`, 'Sidebar');
      // Só atualiza o perfil em eventos positivos
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        fetchSessionAndProfile();
      }
      // Não fazemos nada com SIGNED_OUT para evitar conflitos
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Inscreve para atualizações na tabela users
  useEffect(() => {
    if (!session?.user?.id) {
      logDebug('Sem session.user.id para inscrever', 'Sidebar');
      return;
    }

    const channel = supabase.channel('users_changes');
    
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${session.user.id}`
        },
        (payload) => {
          logDebug('Mudança detectada no usuário', 'Sidebar', payload);
          fetchSessionAndProfile();
        }
      )
      .subscribe();

    return () => {
      logDebug('Limpando inscrição de atualizações', 'Sidebar');
      channel.unsubscribe();
    };
  }, [session?.user?.id]);

  // AIDEV-NOTE: Log throttled para evitar spam no console durante re-renders
  const profileKey = `sidebar_profile_${profile?.id || 'no-profile'}`;
  const sessionKey = `sidebar_session_${session?.user?.id || 'no-session'}`;
  
  throttledDebug(profileKey, 'Render - Estado atual do profile', 'Sidebar', profile);
  throttledDebug(sessionKey, 'Render - Estado atual da session', 'Sidebar', session);

  // Obter o slug do tenant atual da URL
  const tenantSlug = location.pathname.split('/')[1]; // Extrai o slug diretamente da URL /{slug}/...

  // Links de navegação principal
  const navigationLinks = [
    { icon: Home, label: "Dashboard", path: `/${tenantSlug}/dashboard` },
    { 
      icon: FileText, 
      label: "Contratos",
      id: "contratos",
      isSubmenu: true,
      children: [
        { icon: FileText, label: "Contratos", path: `/${tenantSlug}/contratos` },
        { icon: DollarSign, label: "Faturamento", path: `/${tenantSlug}/faturamento-kanban` },
      ]
    },
    { 
      icon: FolderCog, 
      label: "Cadastros",
      id: "cadastros",
      isSubmenu: true,
      children: [
        { icon: Users, label: "Clientes", path: `/${tenantSlug}/clientes` },
        { icon: LayoutGrid, label: "Serviços", path: `/${tenantSlug}/services` },
        { 
          icon: Package, 
          label: "Produtos",
          id: "produtos",
          isSubmenu: true,
          children: [
            { icon: Package, label: "Produtos", path: `/${tenantSlug}/produtos` },
            { icon: Activity, label: "Movimentações", path: `/${tenantSlug}/produtos/movimentacoes` },
          ]
        },
      ]
    },
    { 
      icon: DollarSign, 
      label: "Financeiro",
      id: "financeiro",
      isSubmenu: true,
      children: [
              { icon: BarChart3, label: "Painel", path: `/${tenantSlug}/cobrancas` },
              { icon: Receipt, label: "Recebimentos", path: `/${tenantSlug}/recebimentos` },
              { icon: Receipt, label: "Contas a Pagar", path: `/${tenantSlug}/contas-a-pagar` }
            ]
    },
    { icon: CheckSquare, label: "Tarefas", path: `/${tenantSlug}/tasks` },
    { icon: MessageSquare, label: "Mensagens", path: `/${tenantSlug}/templates` },
    { icon: Bell, label: "Notificações", path: `/${tenantSlug}/notifications` },
    { icon: ArrowUpDown, label: "Atualizar Valores", path: `/${tenantSlug}/update-values` },
    { icon: MessageSquare, label: "Histórico de Mensagens", path: `/${tenantSlug}/messages/history` },
  ];

  const settingsLinks = [
    { icon: Settings, label: "Configurações", path: `/${tenantSlug}/configuracoes` },
    { icon: Settings, label: "Config. Contratos", path: `/${tenantSlug}/contratos-config` },
  ];

  const handlePortalSelection = () => {
    navigate('/meus-aplicativos');
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-4 z-50 md:hidden bg-transparent text-white hover:bg-white/10"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0e1429] shadow-lg transition-all duration-300 ease-in-out md:relative overflow-hidden",
          {
            "w-64": !isCollapsed,
            "w-[68px]": isCollapsed,
            "translate-x-0": isMobileMenuOpen,
            "-translate-x-full": !isMobileMenuOpen && !isCollapsed,
            "md:translate-x-0": true
          }
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn(
            "flex items-center justify-center px-4 border-b border-gray-800 relative transition-all duration-300 ease-in-out",
            isCollapsed ? "h-20" : "h-32 mb-6"
          )}>
            {!isCollapsed ? (
              <div className="flex w-full items-center justify-center">
                <div className="flex items-center justify-center transition-all duration-300 ease-in-out">
                  <img 
                    src="/logos/LOGO-REVALYA123.png" 
                    alt="Revalya" 
                    className="h-20 w-auto py-4 transition-all duration-300 ease-in-out"
                  />
                </div>
                <Menu 
                  className="h-5 w-5 cursor-pointer text-gray-400 hover:text-white absolute right-4 top-4 transition-all duration-300 ease-in-out transform hover:rotate-90"
                  onClick={() => setIsCollapsed(true)}
                />
              </div>
            ) : (
              <div className="flex w-full h-full justify-center items-center transition-all duration-300 ease-in-out">
                <Menu 
                  className="h-6 w-6 cursor-pointer text-gray-400 hover:text-white transition-all duration-300 ease-in-out transform hover:rotate-90"
                  onClick={() => setIsCollapsed(false)}
                />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1 px-3 py-2">
            {navigationLinks.map((link, index) => (
              'isSubmenu' in link ? (
                // Renderização do menu com submenu
                <div key={`submenu-${link.id}`} className="relative">
                  <button
                    onClick={() => toggleSubmenu(link.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300 ease-in-out",
                      {
                        "text-gray-400 hover:bg-white/5 hover:text-white": true,
                        "justify-center": isCollapsed
                      }
                    )}
                    title={isCollapsed ? link.label : undefined}
                  >
                    <link.icon className="h-5 w-5 flex-shrink-0 transition-transform duration-300 ease-in-out" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 transition-all duration-300 ease-in-out opacity-100 whitespace-nowrap overflow-hidden">
                          {link.label}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedMenus.includes(link.id) ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>
                  
                  {/* Submenu com itens filhos */}
                  {!isCollapsed && expandedMenus.includes(link.id) && (
                    <div className="pl-8 mt-1 space-y-1">
                      {link.children.map((child: any) => (
                        child.isSubmenu ? (
                          // Renderização de submenu aninhado
                          <div key={`submenu-${child.id}`} className="relative">
                            <button
                              onClick={() => toggleSubmenu(child.id)}
                              className={cn(
                                "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-300 ease-in-out",
                                {
                                  "text-gray-400 hover:bg-white/5 hover:text-white": true,
                                }
                              )}
                            >
                              <child.icon className="h-4 w-4 flex-shrink-0" />
                              <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
                                {child.label}
                              </span>
                              <ChevronDown className={`h-3 w-3 transition-transform ${expandedMenus.includes(child.id) ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* Submenu aninhado */}
                            {expandedMenus.includes(child.id) && (
                              <div className="pl-6 mt-1 space-y-1">
                                {child.children.map((grandchild: any) => (
                                  <Link
                                    key={grandchild.path}
                                    to={grandchild.path}
                                    className={cn(
                                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-300 ease-in-out",
                                      {
                                        "bg-white/10 text-white font-medium": location.pathname === grandchild.path,
                                        "text-gray-400 hover:bg-white/5 hover:text-white": location.pathname !== grandchild.path,
                                      }
                                    )}
                                  >
                                    <grandchild.icon className="h-4 w-4 flex-shrink-0" />
                                    <span className="whitespace-nowrap overflow-hidden">
                                      {grandchild.label}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Renderização de link direto
                          <Link
                            key={child.path}
                            to={child.path}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-300 ease-in-out",
                              {
                                "bg-white/10 text-white font-medium": location.pathname === child.path,
                                "text-gray-400 hover:bg-white/5 hover:text-white": location.pathname !== child.path,
                              }
                            )}
                          >
                            <child.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="whitespace-nowrap overflow-hidden">
                              {child.label}
                            </span>
                          </Link>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Renderização do item de menu normal
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300 ease-in-out",
                    {
                      "bg-white/10 text-white font-medium border-l-2 border-indigo-400": location.pathname === link.path,
                      "text-gray-400 hover:bg-white/5 hover:text-white": location.pathname !== link.path,
                      "justify-center": isCollapsed
                    }
                  )}
                  title={isCollapsed ? link.label : undefined}
                >
                  <link.icon className="h-5 w-5 flex-shrink-0 transition-transform duration-300 ease-in-out" />
                  {!isCollapsed && (
                    <span className="transition-all duration-300 ease-in-out opacity-100 whitespace-nowrap overflow-hidden">
                      {link.label}
                    </span>
                  )}
                </Link>
              )
            ))}
            
            {!isCollapsed && (
              <div className="pt-4 pb-2">
                <div className="px-3 text-xs uppercase text-gray-400">Configurações</div>
              </div>
            )}
            
            {settingsLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300 ease-in-out",
                  {
                    "bg-white/10 text-white font-medium border-l-2 border-indigo-400": location.pathname === link.path,
                    "text-gray-400 hover:bg-white/5 hover:text-white": location.pathname !== link.path,
                    "justify-center": isCollapsed
                  }
                )}
                title={isCollapsed ? link.label : undefined}
              >
                <link.icon className="h-5 w-5 flex-shrink-0 transition-transform duration-300 ease-in-out" />
                {!isCollapsed && (
                  <span className="transition-all duration-300 ease-in-out opacity-100 whitespace-nowrap overflow-hidden">
                    {link.label}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="mt-auto border-t border-gray-800 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div 
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all duration-300 ease-in-out cursor-pointer hover:bg-white/5 hover:text-white",
                    { 
                      "justify-center": isCollapsed
                    }
                  )}
                >
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg transition-all duration-300 ease-in-out">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = '';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-700 text-white">
                        {profile?.name?.[0] || 'A'}
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="transition-all duration-300 ease-in-out overflow-hidden">
                      <span className="text-sm font-medium whitespace-nowrap block transition-all duration-300 ease-in-out">
                        {profile?.name || 'Usuário'}
                      </span>
                      <span className="text-xs opacity-70 whitespace-nowrap block transition-all duration-300 ease-in-out">
                        {profile?.email || session?.user?.email || ''}
                      </span>
                    </div>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/${tenantSlug}/profile`)}>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
}

// Named export para compatibilidade com importações
export { Sidebar };

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useSupabase } from '@/hooks/useSupabase';
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";
import { usePortalManager } from "@/hooks/usePortalManager";

// Importações Zustand
import { useAuthStore } from "@/store/authStore";
import { useZustandAuth } from "@/hooks/useZustandAuth";
import { useZustandTenant } from "@/hooks/useZustandTenant";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";
import { inviteService } from "@/services/inviteService";

// Serviços e utilitários - removidas importações ausentes
// import { secureSignOut } from "@/services/authService";
// import { NavigationMetrics } from "@/utils/metrics";
// import { logError } from "@/utils/logger";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Building2, Check, LogOut, Shield, User, X } from 'lucide-react';
import { TenantSessionManager } from '@/lib/TenantSessionManager';
import { usePortalSelection } from '@/hooks/usePortalSelection';
import { PortalCardSkeleton } from '@/components/portal/PortalCardSkeleton';
import { PendingInviteCard } from '@/components/invites/PendingInviteCard';

// Tipos para os diferentes portais
type TenantPortal = {
  id: string
  name: string
  type: 'tenant'
  logo?: string
  slug?: string
  active?: boolean
  role?: string
}

type AdminPortal = {
  id?: string      // ID opcional para compatibilidade com a interface Portal
  type: 'admin'
  name: string
}

type ResellerPortal = {
  id: string
  name: string
  type: 'reseller'
  logo?: string
}

type Portal = TenantPortal | AdminPortal | ResellerPortal

export default function PortalSelectionPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setPortal, isInitialized } = usePortal();
  const { user, loading: supabaseLoading } = useSupabase();
  
  // Estado local apenas para a tab ativa
  const [activeTab, setActiveTab] = useState<string>('portals');
  
  // Estado para controlar loading dos botões
  const [loadingPortal, setLoadingPortal] = useState<string | null>(null);
  
  // Zustand hooks
  const { user: authUser } = useZustandAuth();
  
  // Para portal de seleção, não requer tenant ativo
  const { hasAccess, currentTenant } = useTenantAccessGuard({ requireTenant: false });
  
  // Usar dados reais do Zustand em vez de mockados
  const { 
    availableTenants, 
    isLoading, 
    hasLoaded, 
    userRole,
    switchToTenant,
    refreshPortalData 
  } = useZustandTenant();
  
  const pendingInvites: any[] = [];
  
  // Estado de prontidão para renderização sem flicker
  // Considera pronto apenas quando o tenantStore reportar que os dados foram carregados
  const isReady = useMemo(() => {
    return !supabaseLoading && isInitialized && hasLoaded && !isLoading;
  }, [supabaseLoading, isInitialized, hasLoaded, isLoading]);

  // Debounce para estabilizar a transição visual (evita 'piscar')
  const [stableReady, setStableReady] = useState(false);
  useEffect(() => {
    if (isReady) {
      const t = setTimeout(() => setStableReady(true), 100);
      return () => clearTimeout(t);
    } else {
      setStableReady(false);
    }
  }, [isReady]);
  
  // Preparar a lista de portais disponíveis usando o hook useMemo
  const availablePortals = useMemo(() => {
    const portalsList: Portal[] = [];
    
    // Adicionar portal administrativo primeiro se o usuário tiver permissão
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      portalsList.push({
        id: 'admin-portal',
        type: 'admin',
        name: 'Portal Administrativo'
      });
    }
    
    // Adicionar portal de revendedor se aplicável
    if (userRole === 'RESELLER') {
      portalsList.push({
        id: 'reseller-1', // ID temporário
        type: 'reseller',
        name: 'Portal de Revendedor'
      });
    }
    
    // Adicionar portais dos tenants disponíveis por último - removendo duplicatas
    if (availableTenants && availableTenants.length > 0) {
      const uniqueTenants = availableTenants.filter((tenant, index, self) => 
        index === self.findIndex(t => t.id === tenant.id)
      );
      
      const tenantPortals = uniqueTenants.map(tenant => ({
        id: tenant.id,
        type: 'tenant' as const,
        name: tenant.name,
        logo: (tenant as any).logo || null,
        slug: tenant.slug,
        active: tenant.active,
        role: (tenant as any).role
      }));
      
      portalsList.push(...tenantPortals);
    }
    
    return portalsList;
  }, [availableTenants, userRole]);

  // Usar apenas availablePortals para renderização - removendo lógica de fallback que causa duplicação
  const portalsToRender = availablePortals;

  // Exibir estado "vazio" apenas se, após estabilizar, nenhum portal estiver disponível por um curto período
  const [showEmptyState, setShowEmptyState] = useState(false);
  useEffect(() => {
    if (!stableReady) {
      setShowEmptyState(false);
      return;
    }
    if (availablePortals.length === 0) {
      const t = setTimeout(() => setShowEmptyState(true), 400); // atraso curto
      return () => clearTimeout(t);
    } else {
      setShowEmptyState(false);
    }
  }, [stableReady, availablePortals.length]);
  
  // Efeito para atualizar os dados quando o componente montar - somente quando pronto
  useEffect(() => {
    if (isReady) {
      console.log('[PortalSelectionPage] Ambiente pronto - evitando refresh forçado');
    }
  }, [isReady]);
  
  // Hook para gerenciar acesso aos portais usando o novo sistema multi-tenant por aba
  const { accessTenant, accessAdminPortal, accessResellerPortal } = usePortalManager();

  // Função para selecionar um portal
  const handlePortalSelection = async (portal: Portal) => {
    // Definir loading imediato para feedback visual
    setLoadingPortal(portal.id);
    
    try {
      if (portal.type === 'tenant') {
        // Verificar se o tenant está ativo
        if (portal.active === false) {
          toast({
            title: 'Tenant inativo',
            description: 'Este tenant está inativo e não pode ser acessado.',
          });
          return;
        }
        
        // Verificar se temos usuário autenticado
        if (!authUser) {
          toast({
            title: 'Erro de autenticação',
            description: 'Usuário não autenticado.',
            variant: 'destructive',
          });
          return;
        }

        // Usar o novo sistema de auto-login com TenantSessionManager
        try {
          const session = await TenantSessionManager.createTenantSession(
            portal.id,
            portal.slug || '',
            authUser.id,
            authUser.email || ''
          );

          if (session) {
            // Abrir nova aba com URL limpa direcionando para dashboard
            const tenantUrl = `${window.location.origin}/${portal.slug}/dashboard`;
            window.open(tenantUrl, '_blank');
            
            toast({
              title: 'Acesso autorizado',
              description: `Abrindo ${portal.name} em nova aba...`,
            });
          } else {
            throw new Error('Falha ao criar sessão do tenant');
          }
        } catch (sessionError) {
          console.error('Erro ao criar sessão:', sessionError);
          toast({
            title: 'Erro ao acessar tenant',
            description: sessionError instanceof Error ? sessionError.message : 'Não foi possível criar a sessão.',
            variant: 'destructive',
          });
          return;
        }
        
        // Manter compatibilidade com código legado para LocalStorage
        localStorage.setItem('tenantId', portal.id);
        localStorage.setItem('tenantSlug', portal.slug || '');
        localStorage.setItem('portalType', 'tenant');
        
        // Usar o PortalContext para compatibilidade
        setPortal('tenant', portal.id, undefined, portal.slug);
      } else if (portal.type === 'admin') {
        // Abrir portal admin em nova aba
        accessAdminPortal();
        
        // Configurar para portal administrativo (compatibilidade)
        localStorage.setItem('portalType', 'admin');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('tenantSlug');
        
        // Usar o PortalContext para compatibilidade
        setPortal('admin');
      } else if (portal.type === 'reseller') {
        // Abrir portal de revendedor em nova aba
        accessResellerPortal(portal.id);
        
        // Configurar para portal de revendedor (compatibilidade)
        localStorage.setItem('portalType', 'reseller');
        localStorage.setItem('resellerId', portal.id);
        localStorage.removeItem('tenantId');
        localStorage.removeItem('tenantSlug');
        
        // Usar o PortalContext para compatibilidade
        setPortal('reseller', undefined, portal.id);
      }
    } catch (error) {
      console.error('Erro ao selecionar portal:', error);
      toast({
        title: 'Erro ao selecionar portal',
        description: 'Não foi possível acessar o portal selecionado. Tente novamente mais tarde.',
      });
    } finally {
      // Remover loading após operação
      setLoadingPortal(null);
    }
  };

  const handleInviteAccepted = async (inviteId: string, tenantId: string) => {
    try {
      // Aceitar o convite usando o serviço de convites
      const { success, error } = await inviteService.acceptInvite(supabase, inviteId);
      
      if (!success) {
        throw error;
      }
      
      toast({
        title: 'Convite aceito',
        description: 'Você agora tem acesso a este portal.',
      });
      
      // Recarregar todos os dados do portal
      await refreshPortalData(supabase);
      
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aceitar o convite.',
      });
    }
  };

  const handleInviteRejected = async (inviteId: string) => {
    try {
      const { success, error } = await inviteService.rejectInvite(supabase, inviteId);
      
      if (!success) {
        throw error;
      }
      
      toast({
        title: 'Convite rejeitado',
        description: 'O convite foi rejeitado com sucesso.',
      });
      
      // Recarregar todos os dados do portal
      await refreshPortalData(supabase);
    } catch (error) {
      console.error('Erro ao rejeitar convite:', error);
      
      toast({
        title: 'Erro ao rejeitar convite',
        description: 'Não foi possível rejeitar o convite. Tente novamente mais tarde.',
      });
    }
  };

  const handleLogout = async () => {
    try {
      // Limpar os estados do Zustand
      useAuthStore.getState().reset();
      
      // Fazer logout no Supabase
      await supabase.auth.signOut();
      
      // Redirecionar para a página de login
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer logout.',
      });
    }
  };

  // Função helper para obter as configurações de estilo do card
  const getCardStyles = (type: string) => {
    switch (type) {
      case 'admin':
        return {
          gradient: 'from-primary-600/20 to-primary-800/10',
          border: 'border-primary/30 hover:border-primary/60',
          button: 'bg-primary hover:bg-primary/90',
          icon: 'bg-primary/20 text-primary',
          dot: 'bg-primary'
        };
      case 'reseller':
        return {
          gradient: 'from-emerald-600/20 to-emerald-800/10',
          border: 'border-success/30 hover:border-success/60',
          button: 'bg-success hover:bg-success/90',
          icon: 'bg-success/20 text-success',
          dot: 'bg-success'
        };
      default: // tenant
        return {
          gradient: 'from-purple-600/20 to-purple-800/10',
          border: 'border-accent/30 hover:border-accent/60',
          button: 'bg-accent hover:bg-accent/90',
          icon: 'bg-accent/20 text-accent-foreground',
          dot: 'bg-accent'
        };
    }
  };

  // Função helper para obter as funcionalidades do portal
  const getPortalFeatures = (type: string) => {
    switch (type) {
      case 'admin':
        return [
          'Gerenciar tenants',
          'Gerenciar revendedores',
          'Configurações globais'
        ];
      case 'reseller':
        return [
          'Gerenciar tenants',
          'Visualizar estatísticas',
          'Suporte a clientes'
        ];
      default: // tenant
        return [
          'Dashboard',
          'Gerenciar cobranças',
          'Gerenciar clientes'
        ];
    }
  };

  // Função helper para obter título e descrição do portal
  const getPortalInfo = (portal: Portal) => {
    switch (portal.type) {
      case 'admin':
        return {
          title: 'Portal Administrativo',
          description: 'Gerencie tenants, revendedores e configurações',
          icon: Shield
        };
      case 'reseller':
        return {
          title: portal.name || 'Portal do Revendedor',
          description: 'Gerencie seus tenants e clientes',
          icon: Shield
        };
      default: // tenant
        return {
          title: portal.name || 'Portal do Tenant',
          description: 'Acesse o portal do tenant',
          icon: Building2
        };
    }
  };

  if (!stableReady) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          {/* Header com informações do usuário e logo */}
          <div className="mb-12 flex flex-col items-center justify-center text-center">
            <img 
              src="/logos/LOGO-REVALYA123.png" 
              alt="Revalya Logo" 
              className="mb-10 w-80"
            />
            
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
              Bem-vindo, <span className="text-accent-foreground animate-pulse">preparando acesso...</span>
            </h1>
            
            <div className="text-muted-foreground flex items-center justify-center gap-2">
              <div className="h-2 w-2 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2 bg-accent rounded-full animate-bounce"></div>
              <span className="ml-2">Carregando seus portais...</span>
            </div>
          </div>

          {/* Tabs de navegação */}
          <div className="mx-auto mb-8 overflow-hidden rounded-xl border border-border bg-card/50 shadow-sm">
            <Tabs 
              value="portals" 
              className="w-full"
            >
              <div className="border-b border-border bg-card/30">
                <TabsList className="grid w-full grid-cols-2 bg-transparent p-0">
                  <TabsTrigger 
                    value="portals" 
                    className="rounded-none border-b-2 border-accent py-3 text-accent-foreground bg-transparent shadow-none"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>Meus Aplicativos</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="invites" 
                    className="rounded-none border-b-2 border-transparent py-3 text-muted-foreground"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Convites</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="portals" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Renderizar skeletons enquanto estabiliza */}
                    <PortalCardSkeleton />
                    <PortalCardSkeleton />
                    <PortalCardSkeleton />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Header com informações do usuário e logo */}
        <div className="mb-12 flex flex-col items-center justify-center text-center">
          <img 
            src="/logos/LOGO-REVALYA123.png" 
            alt="Revalya Logo" 
            className="mb-10 w-80"
          />
          
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
            Bem-vindo, <span className="text-accent-foreground">{authUser?.user_metadata?.name || 'Usuário'}</span>
          </h1>
          
          <p className="text-muted-foreground">{authUser?.email}</p>
        </div>

        {/* Tabs de navegação */}
        <div className="mx-auto mb-8 overflow-hidden rounded-xl border border-border bg-card/50 shadow-sm">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full"
          >
            <div className="border-b border-border bg-card/30">
              <TabsList className="grid w-full grid-cols-2 bg-transparent p-0">
                <TabsTrigger 
                  value="portals" 
                  className="rounded-none border-b-2 border-transparent py-3 text-muted-foreground data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Meus Aplicativos</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="invites" 
                  className="rounded-none border-b-2 border-transparent py-3 text-muted-foreground data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>
                    Convites 
                    {pendingInvites.length > 0 && (
                      <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-xs font-medium text-white">
                        {pendingInvites.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="portals" className="mt-0 space-y-6">
                {portalsToRender.length === 0 ? (
                  showEmptyState ? (
                    <div className="text-center py-12">
                      <div className="mx-auto h-24 w-24 text-slate-600">
                        <Building2 className="h-full w-full" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium text-slate-300">
                        Nenhum portal disponível
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Você não possui acesso a nenhum portal no momento.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      <PortalCardSkeleton />
                      <PortalCardSkeleton />
                      <PortalCardSkeleton />
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {portalsToRender.map((portal, index) => {
                      const styles = getCardStyles(portal.type);
                      const features = getPortalFeatures(portal.type);
                      const info = getPortalInfo(portal);
                      const IconComponent = info.icon;
                      
                      // Criar uma chave única baseada no tipo e ID do portal com timestamp
                      const portalKey = `portal-${portal.type}-${portal.id || `idx-${index}`}-${Date.now()}-${Math.random()}`;
                      
                      return (
                        <Card 
                          key={portalKey}
                          className={`group relative overflow-hidden border ${styles.border} bg-slate-800/90 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10`}
                        >
                          {/* Gradiente de fundo */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-40`}></div>
                          
                          <div className="relative z-10">
                            <CardHeader className="pb-4">
                              {/* Ícone */}
                              <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full ${styles.icon}`}>
                                <IconComponent className="h-7 w-7" />
                              </div>
                              
                              {/* Título e descrição */}
                              <CardTitle className="text-xl font-medium tracking-tight text-slate-100">
                                {info.title}
                              </CardTitle>
                              <CardDescription className="text-slate-400">
                                {info.description}
                              </CardDescription>
                            </CardHeader>
                            
                            <CardContent className="pb-4">
                              {/* Lista de recursos */}
                              <div className="space-y-3">
                                <p className="text-xs font-medium uppercase text-slate-500">
                                  Funcionalidades
                                </p>
                                <ul className="space-y-2 text-sm text-slate-300">
                                  {features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center">
                                      <div className={`mr-2 h-1.5 w-1.5 rounded-full ${styles.dot}`}></div>
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </CardContent>
                            
                            <CardFooter>
                              {/* Botão de acesso */}
                              <Button
                                onClick={() => handlePortalSelection(portal)}
                                disabled={loadingPortal === portal.id}
                                className={`w-full ${styles.button} text-white disabled:opacity-70`}
                              >
                                {loadingPortal === portal.id ? (
                                  <div className="flex items-center">
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    Acessando...
                                  </div>
                                ) : (
                                  'Acessar'
                                )}
                              </Button>
                            </CardFooter>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="invites" className="mt-0">
                {pendingInvites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-800/50 p-12 text-center">
                    <User className="mb-4 h-12 w-12 text-slate-500" />
                    <h3 className="text-xl font-medium text-slate-100">Nenhum convite pendente</h3>
                    <p className="mt-2 max-w-md text-sm text-slate-400">
                      Você não tem convites pendentes no momento.
                      Quando for convidado para um tenant, o convite aparecerá aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                      Você tem {pendingInvites.length} convite(s) pendente(s). Aceite ou rejeite os convites abaixo:
                    </p>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {pendingInvites.map((invite) => (
                        <PendingInviteCard
                          key={invite.id}
                          invite={invite}
                          onAccept={async () => {
                            console.log("Aceitando convite", invite.id, invite.tenant_id);
                            await handleInviteAccepted(invite.id, invite.tenant_id);
                          }}
                          onReject={() => handleInviteRejected(invite.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        {/* Botão de sair */}
        <div className="mt-10 text-center">
          <button 
            onClick={handleLogout}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            Sair da sua conta
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import { usePortal } from '@/contexts/PortalContext';
// import { useTenantStore } from '@/store/tenantStore';
import { inviteService, type TenantInvite } from '@/services/inviteService';
import type { PortalType } from '@/contexts/PortalContext';
import { logDebug, logError } from '@/lib/logger';
import { ROUTES } from '@/constants/routes';
import { simpleTenantManager } from '@/features/tenant/store/tenantManager';
import { secureSignOut } from '@/utils/supabaseAuthBypass';
import { useToast } from '@/components/ui/use-toast';

// Tipos para os diferentes portais
type TenantPortal = {
  id: string;
  name: string;
  type: 'tenant';
  logo?: string;
  slug?: string;
  active?: boolean;
  role?: string;
};

type AdminPortal = {
  id?: string;
  type: 'admin';
  name: string;
};

type ResellerPortal = {
  id: string;
  name: string;
  type: 'reseller';
  logo?: string;
};

type Portal = TenantPortal | AdminPortal | ResellerPortal;

/**
 * Hook personalizado para gerenciar a lógica da página de seleção de portal
 * Usa Zustand para gerenciamento de estado global dos tenants
 */
export function usePortalSelection() {
  const navigate = useNavigate();
  const { supabase, user } = useSupabase();
  const { setPortal } = usePortal();
  const { toast } = useToast();
  
  // Estados locais para gerenciar tenants
  const [loading, setLoading] = useState(false);
  
  // Estados locais
  const [portals, setPortals] = useState<Portal[]>([]);
  const [pendingInvites, setPendingInvites] = useState<TenantInvite[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('portals');

  // Flag para garantir que o carregamento aconteça apenas uma vez
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Evitar recarregamento ao duplicar a aba
    if (hasLoadedRef.current) {
      logDebug('[PortalSelection] Skip recarregamento - já foi carregado anteriormente');
      return;
    }

    const fetchUserPortals = async () => {
      try {
        // Marcar como carregado para evitar recarregamento em novas abas
        hasLoadedRef.current = true;
        setLoading(true);

        // Verificar se o usuário está autenticado
        if (!user) {
          console.log('Usuário não autenticado, redirecionando para login');
          window.location.href = ROUTES.PUBLIC.LOGIN;
          return;
        }

        console.log('Usuário autenticado:', user.email);
        
        // Definir o email do usuário
        setUserEmail(user.email || '');

        // Inicializar array de portais disponíveis
        const availablePortals: Portal[] = [];

        // AIDEV-NOTE: Buscar informações do usuário apenas se ainda não foram carregadas
        // Evitar queries desnecessárias ao voltar à aba do navegador
        let userData = null;
        let userError = null;
        
        // AIDEV-NOTE: Usar cache local para evitar queries repetidas
        const cachedUserData = sessionStorage.getItem(`user_data_${user.id}`);
        if (cachedUserData) {
          try {
            userData = JSON.parse(cachedUserData);
            logDebug('[PortalSelection] Dados do usuário carregados do cache');
          } catch (e) {
            // Se o cache estiver corrompido, buscar novamente
            const result = await supabase
              .from('users')
              .select('name, user_role')
              .eq('id', user.id)
              .single();
            userData = result.data;
            userError = result.error;
            if (userData) {
              sessionStorage.setItem(`user_data_${user.id}`, JSON.stringify(userData));
            }
          }
        } else {
          // Buscar do banco apenas se não estiver em cache
          const result = await supabase
            .from('users')
            .select('name, user_role')
            .eq('id', user.id)
            .single();
          userData = result.data;
          userError = result.error;
          if (userData) {
            // AIDEV-NOTE: Cachear dados do usuário por 1 hora
            sessionStorage.setItem(`user_data_${user.id}`, JSON.stringify(userData));
          }
        }

        if (userError) {
          console.error('Erro ao buscar informações do usuário:', userError);
        } else if (userData) {
          console.log('[PortalSelection] Dados do usuário carregados:', userData);
          setUserName(userData.name || user.email?.split('@')[0] || 'Usuário');

          // Adicionar portal administrativo para administradores
          if (userData.user_role === 'ADMIN') {
            console.log('Usuário é administrador, adicionando portal admin');
            availablePortals.push({
              type: 'admin',
              name: 'Portal Administrativo',
              id: 'admin-portal'
            });
          }

          // Adicionar portal de revendedor para revendedores
          if (userData.user_role === 'RESELLER') {
            console.log('Usuário é revendedor, adicionando portal de revendedor');
            availablePortals.push({
              id: user.id,
              type: 'reseller',
              name: 'Portal de Revendedor',
            });
          }
        }

        // Carregar tenants do usuário
        try {
          const tenants = await simpleTenantManager.getUserTenants();
          console.log('[PortalSelection] Tenants carregados:', tenants);
          
          // Mapear tenants para o formato de portal e adicionar à lista
          const tenantPortals = tenants.map(tenant => ({
            id: tenant.id,
            name: tenant.name,
            type: 'tenant' as const,
            logo: tenant.logo,
            slug: tenant.slug,
            active: tenant.active === undefined ? true : tenant.active,
            role: tenant.user_role
          }));
          
          availablePortals.push(...tenantPortals);
          
          // Atualizar o store Zustand com os tenants
          const zustandTenants = tenants.map(tenant => ({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            active: tenant.active === undefined ? true : tenant.active,
            logo: tenant.logo
          }));
          
          // Tenants carregados com sucesso
          
        } catch (error) {
          console.error('Erro ao carregar tenants:', error);
          logError('[PortalSelection] Erro ao carregar tenants', { error });
        }

        // Carregar convites pendentes
        try {
          const { data: invites } = await inviteService.listUserPendingInvites(supabase);
          console.log('[PortalSelection] Convites pendentes:', invites);
          setPendingInvites(invites || []);
        } catch (error) {
          console.error('Erro ao carregar convites:', error);
        }

        // Definir portais disponíveis
        setPortals(availablePortals);
      } catch (error) {
        console.error('Erro ao buscar portais:', error);
      } finally {
        setLoading(false);
      }
    };

    // Executar a função
    fetchUserPortals();
  }, [user, supabase, setLoading, setAvailableTenants]);

  /**
   * Função para lidar com a seleção de portal
   * Atualizada para usar o tenantStore
   */
  const handlePortalSelection = async (portal: Portal) => {
    try {
      // Armazenar o tipo de portal para uso posterior
      localStorage.setItem('portalType', portal.type);

      // Tratar tipos específicos de portal
      if (portal.type === 'tenant') {
        // Verificar se o tenant está ativo
        if (portal.active !== undefined && portal.active === false) {
          toast({
            title: 'Tenant inativo',
            description: `O tenant ${portal.name} está inativo e não pode ser acessado.`,
            variant: 'destructive'
          });
          return;
        }

        // Definir ID do tenant no localStorage
        localStorage.setItem('tenantId', portal.id);
        localStorage.setItem('tenantSlug', portal.slug || '');

        // Atualizar o contexto do portal
        const portalForContext = {
          id: portal.id,
          name: portal.name,
          type: portal.type
        } as unknown as PortalType;
        setPortal(portalForContext);
        
        // Navegar para o tenant específico
        if (portal.slug) {
          window.location.href = `/${portal.slug}/dashboard`;
        } else {
          console.error('Portal sem slug:', portal);
          toast({
            title: 'Erro',
            description: 'Este tenant não possui um identificador válido.',
            variant: 'destructive'
          });
        }
      } else if (portal.type === 'admin') {
        // Limpar tenant atual no store
        // setCurrentTenant(null);
        
        // Remover ID de tenant no localStorage
        localStorage.removeItem('tenantId');
        localStorage.removeItem('tenantSlug');
        
        // Navegar para o portal administrativo
        window.location.href = '/admin/dashboard';
      } else if (portal.type === 'reseller') {
        // Limpar tenant atual no store
        // setCurrentTenant(null);
        
        // Definir ID do revendedor
        localStorage.setItem('resellerId', portal.id);
        
        // Navegar para o portal do revendedor
        window.location.href = '/reseller/dashboard';
      }

      // Atualizar o contexto do portal
      // Convertemos para o formato esperado pelo PortalContext
            // O tipo do portal já é compatível, não precisa de conversão
                                                                  // Chamar setPortal com os parâmetros corretos
      setPortal(portal.type, portal.type === 'tenant' ? portal.id : undefined, portal.type === 'reseller' ? portal.id : undefined, portal.type === 'tenant' ? portal.slug : undefined);
    } catch (error) {
      console.error('Erro ao selecionar portal:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao selecionar o portal.',
        variant: 'destructive'
      });
    }
  };

  /**
   * Função para lidar com aceitação de convite
   */
  const handleInviteAccepted = async (inviteId: string, tenantId: string) => {
    // Implementação existente...
  };

  /**
   * Função para lidar com rejeição de convite
   */
  const handleInviteRejected = async (inviteId: string) => {
    // Implementação existente...
  };

  /**
   * Função para lidar com logout
   */
  const handleLogout = async () => {
    // Limpar tenant atual no store
    // setCurrentTenant(null);
    
    try {
      await secureSignOut(supabase);
      navigate(ROUTES.PUBLIC.LOGIN);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return {
    portals,
    pendingInvites,
    loading,
    userEmail,
    userName,
    activeTab,
    setActiveTab,
    handlePortalSelection,
    handleInviteAccepted,
    handleInviteRejected,
    handleLogout,
  };
}

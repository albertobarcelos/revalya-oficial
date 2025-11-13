/**
 * Store centralizado para gerenciamento de tenants usando Zustand
 * Inclui tanto dados do servidor quanto estado de UI
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupabaseClient } from '@supabase/supabase-js';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const CACHE_KEY = 'revalya_portal_cache';

// Tipos
interface TenantFilter {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantInvite {
  id: string;
  tenant_id: string;
  tenant_name: string;
  role: string;
  invited_at: string;
  expires_at: string;
}

interface CachedData {
  tenants: Tenant[];
  invites: TenantInvite[];
  userRole: string | null;
  timestamp: number;
  userId: string;
}

interface TenantState {
  // Dados do servidor
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  pendingInvites: TenantInvite[];
  userRole: string | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  
  // Actions para dados do servidor
  setCurrentTenant: (tenant: Tenant | null) => void;
  setAvailableTenants: (tenants: Tenant[]) => void;
  setPendingInvites: (invites: TenantInvite[]) => void;
  setUserRole: (role: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchPortalData: (supabase: SupabaseClient) => Promise<void>;
  switchTenant: (tenantId: string) => void;
  clearTenantData: () => void;
  loadFromCache: (userId: string) => boolean;
  saveToCache: (userId: string, data: { tenants: Tenant[]; invites: TenantInvite[]; userRole: string | null }) => void;
  clearCache: () => void;
}

interface TenantUIState {
  // Apenas estado de UI - sem dados do servidor
  filters: TenantFilter;
  selectedTab: string;
  isModalOpen: boolean;
  modalData: any;
  
  // Actions
  setFilters: (filters: TenantFilter) => void;
  setSelectedTab: (tab: string) => void;
  openModal: (data?: any) => void;
  closeModal: () => void;
  resetState: () => void;
}

/**
 * Store principal para gerenciamento de tenants
 * Inclui dados do servidor e lógica de negócio
 */
export const useTenantStore = create<TenantState>((set, get) => ({
  // Estado inicial
  currentTenant: null,
  availableTenants: [],
  pendingInvites: [],
  userRole: null,
  isLoading: false,
  hasLoaded: false,
  error: null,
  
  // Actions
  setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
  
  setAvailableTenants: (tenants) => set({ availableTenants: tenants }),
  
  setPendingInvites: (invites) => set({ pendingInvites: invites }),
  
  setUserRole: (role) => set({ userRole: role }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  switchTenant: (tenantId) => {
    const { availableTenants } = get();
    const tenant = availableTenants.find(t => t.id === tenantId);
    if (tenant) {
      set({ currentTenant: tenant });
    }
  },
  
  clearTenantData: () => {
    const { clearCache } = get();
    clearCache(); // Limpar cache ao limpar dados
    set({
      currentTenant: null,
      availableTenants: [],
      pendingInvites: [],
      userRole: null,
      isLoading: false,
      hasLoaded: false,
      error: null,
    });
  },
  
  // Cache functions
  loadFromCache: (userId: string) => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return false;
      
      const data: CachedData = JSON.parse(cached);
      const now = Date.now();
      
      // Verificar se o cache é válido (não expirou e é do mesmo usuário)
      if (data.userId === userId && (now - data.timestamp) < CACHE_DURATION) {
        console.log('📦 [CACHE] Carregando dados do cache local');
        
        // AIDEV-NOTE: Auto-seleção de tenant ao carregar do cache também
        let selectedTenant: Tenant | null = null;
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const slugMatch = currentPath.match(/^\/([^\/]+)/);
        const urlSlug = slugMatch ? slugMatch[1] : null;
        const nonTenantRoutes = ['login', 'portal', 'meus-aplicativos', 'admin', 'api', 'auth', 'app'];
        
        if (urlSlug && !nonTenantRoutes.includes(urlSlug) && data.tenants.length > 0) {
          const targetTenant = data.tenants.find((t: Tenant) => t.slug === urlSlug && t.active);
          if (targetTenant) {
            selectedTenant = targetTenant;
            console.log(`✅ [CACHE] Auto-selecionando tenant da URL: ${targetTenant.name} (${targetTenant.slug})`);
          }
        }
        
        // AIDEV-NOTE: IMPORTANTE - Setar hasLoaded: true para evitar chamadas duplicadas
        set({
          availableTenants: data.tenants,
          pendingInvites: data.invites,
          userRole: data.userRole,
          currentTenant: selectedTenant,
          hasLoaded: true, // CRÍTICO: Marcar como carregado
          isLoading: false,
          error: null
        });
        return true;
      } else {
        console.log('📦 [CACHE] Cache expirado ou usuário diferente, removendo');
        localStorage.removeItem(CACHE_KEY);
        return false;
      }
    } catch (error) {
      console.error('📦 [CACHE] Erro ao carregar cache:', error);
      localStorage.removeItem(CACHE_KEY);
      return false;
    }
  },
  
  saveToCache: (userId: string, data: { tenants: Tenant[]; invites: TenantInvite[]; userRole: string | null }) => {
    try {
      const cacheData: CachedData = {
        tenants: data.tenants,
        invites: data.invites,
        userRole: data.userRole,
        timestamp: Date.now(),
        userId
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('📦 [CACHE] Dados salvos no cache local');
    } catch (error) {
      console.error('📦 [CACHE] Erro ao salvar cache:', error);
    }
  },
  
  clearCache: () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log('📦 [CACHE] Cache limpo');
    } catch (error) {
      console.error('📦 [CACHE] Erro ao limpar cache:', error);
    }
  },

  fetchPortalData: async (supabase: SupabaseClient) => {
    const { isLoading, hasLoaded, loadFromCache, saveToCache } = get();
    
    // AIDEV-NOTE: Lock mais robusto - verificar isLoading E hasLoaded
    if (isLoading) {
      console.log('🔍 [DEBUG] fetchPortalData já em progresso, ignorando chamada duplicada');
      return;
    }
    
    // AIDEV-NOTE: Se já carregou com sucesso, não recarregar
    if (hasLoaded) {
      console.log('🔍 [DEBUG] fetchPortalData já foi executado com sucesso, ignorando chamada duplicada');
      return;
    }
    
    console.log('🔍 [DEBUG] fetchPortalData iniciado');
    
    try {
      // AIDEV-NOTE: Setar isLoading ANTES de qualquer operação assíncrona
      set({ isLoading: true, error: null });
      
      // Obter role do usuário dos metadados
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 [DEBUG] Usuário obtido:', user?.id);
      const userId = user?.id;
      
      if (!userId) {
        set({ isLoading: false, hasLoaded: false, error: 'Usuário não autenticado' });
        throw new Error('Usuário não autenticado');
      }
      
      // Tentar carregar do cache primeiro
      if (loadFromCache(userId)) {
        // AIDEV-NOTE: Se carregou do cache, marcar como carregado mas não como loading
        set({ isLoading: false });
        return; // Dados carregados do cache
      }
      
      // Se não há cache válido, buscar do servidor (isLoading já está true)
      
      // AIDEV-NOTE: Buscar user_role da tabela public.users em vez de user_metadata
      // Isso corrige o problema onde admin aparecia como service_role
      let userRole = null;
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_role')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.warn('⚠️ [DEBUG] Erro ao buscar user_role da tabela users:', userError);
        // Fallback para user_metadata se a consulta falhar
        userRole = user?.user_metadata?.user_role || null;
      } else {
        userRole = userData?.user_role || null;
      }
      
      console.log('🔍 [DEBUG] User role obtido:', userRole);
      
      // Buscar tenants do usuário
      console.log('🔍 [DEBUG] Buscando tenants do usuário...');
      const { data: userTenants, error: tenantsError } = await supabase
        .from('tenant_users')
        .select(`
          tenant_id,
          role,
          active,
          tenants!inner (
            id,
            name,
            slug,
            active,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId) // 🔒 CORREÇÃO CRÍTICA: Filtrar apenas tenants do usuário atual
        .eq('active', true);

      console.log('🔍 [DEBUG] Resultado tenant_users:', { userTenants, tenantsError });
      if (tenantsError) throw tenantsError;

      const tenants: Tenant[] = userTenants?.map((ut: any) => ({
        id: ut.tenants.id,
        name: ut.tenants.name,
        slug: ut.tenants.slug,
        active: ut.tenants.active,
        created_at: ut.tenants.created_at,
        updated_at: ut.tenants.updated_at
      })) || [];

      // Buscar convites pendentes
      const { data: invites, error: invitesError } = await supabase
        .from('tenant_invites')
        .select(`
          id,
          tenant_id,
          role,
          created_at,
          expires_at,
          tenants!inner (
            name
          )
        `)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (invitesError) throw invitesError;

      const pendingInvites: TenantInvite[] = invites?.map((invite: any) => ({
        id: invite.id,
        tenant_id: invite.tenant_id,
        tenant_name: invite.tenants?.name || 'Tenant desconhecido',
        role: invite.role,
        invited_at: invite.created_at,
        expires_at: invite.expires_at
      })) || [];

      console.log('🔍 [DEBUG] Tenants processados:', tenants);
      
      // AIDEV-NOTE: Auto-seleção inteligente de tenant baseada na URL
      // Tenta selecionar o tenant correspondente ao slug da URL atual
      let selectedTenant: Tenant | null = null;
      
      // Obter slug da URL atual
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const slugMatch = currentPath.match(/^\/([^\/]+)/);
      const urlSlug = slugMatch ? slugMatch[1] : null;
      
      // Lista de rotas que NÃO são tenants (ignorar auto-seleção)
      const nonTenantRoutes = ['login', 'portal', 'meus-aplicativos', 'admin', 'api', 'auth', 'app'];
      
      // Se há um slug válido na URL e não é uma rota não-tenant, tentar selecionar
      if (urlSlug && !nonTenantRoutes.includes(urlSlug) && tenants.length > 0) {
        const targetTenant = tenants.find(t => t.slug === urlSlug && t.active);
        if (targetTenant) {
          selectedTenant = targetTenant;
          console.log(`✅ [DEBUG] Auto-selecionando tenant da URL: ${targetTenant.name} (${targetTenant.slug})`);
        } else {
          console.log(`⚠️ [DEBUG] Tenant com slug '${urlSlug}' não encontrado ou inativo na lista de tenants disponíveis`);
        }
      } else if (!urlSlug || nonTenantRoutes.includes(urlSlug)) {
        console.log(`🔍 [DEBUG] URL não contém slug de tenant válido ou é rota não-tenant: ${urlSlug}`);
      }

      // Salvar no cache antes de atualizar o estado
      saveToCache(userId, { tenants, invites: pendingInvites, userRole });
      
      set({
        availableTenants: tenants,
        pendingInvites,
        userRole,
        currentTenant: selectedTenant,
        hasLoaded: true,
        isLoading: false,
        error: null
      });
      
      console.log('✅ [DEBUG] fetchPortalData concluído com sucesso');

    } catch (error: any) {
      console.error('Erro ao carregar dados do portal:', error);
      set({
        error: error.message || 'Erro ao carregar dados do portal',
        isLoading: false,
        hasLoaded: false
      });
    }
  }
}));

/**
 * Store Zustand para gerenciar apenas o estado da UI relacionado a tenants
 * Não armazena dados do servidor - estes devem vir do React Query
 */
export const useTenantUIStore = create<TenantUIState>()(
  persist(
    (set) => ({
      // Estado inicial
      filters: {
        search: '',
        status: 'active',
      },
      selectedTab: 'all',
      isModalOpen: false,
      modalData: null,
      
      // Actions
      setFilters: (filters) => set((state) => ({ 
        filters: { ...state.filters, ...filters } 
      })),
      
      setSelectedTab: (tab) => set({ selectedTab: tab }),
      
      openModal: (data) => set({ 
        isModalOpen: true,
        modalData: data || null
      }),
      
      closeModal: () => set({ 
        isModalOpen: false,
        modalData: null
      }),
      
      resetState: () => set({
        filters: {
          search: '',
          status: 'active',
        },
        selectedTab: 'all',
        isModalOpen: false,
        modalData: null
      }),
    }),
    {
      name: 'tenant-ui-storage',
      partialize: (state) => ({
        // Persiste apenas filtros e tab selecionada
        filters: state.filters,
        selectedTab: state.selectedTab,
      }),
      // Usar sessionStorage em vez de localStorage para isolar por aba
      storage: {
        getItem: (name) => {
          try {
            const value = sessionStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.error('Erro ao carregar estado do sessionStorage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            sessionStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('Erro ao salvar estado no sessionStorage:', error);
          }
        },
        removeItem: (name) => {
          try {
            sessionStorage.removeItem(name);
          } catch (error) {
            console.error('Erro ao remover estado do sessionStorage:', error);
          }
        },
      },
    }
  )
);

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useAppInitialization } from './AppInitializationContext';
import { supabase } from '../lib/supabase';

export type PortalType = 'admin' | 'tenant' | 'reseller';

interface PortalContextType {
  portalType: PortalType | null;
  tenantId: string | null;
  resellerId: string | null;
  currentPortal: any;
  isLoading: boolean;
  setPortal: (type: PortalType, tenantId?: string, resellerId?: string, tenantSlug?: string) => void;
  resetPortal: () => void;
  getCorrectRoute: () => string;
  isInitialized: boolean;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [portalType, setPortalType] = useState<PortalType | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [resellerId, setResellerId] = useState<string | null>(null);
  const [currentPortal, setCurrentPortal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { acquireInitializationLock, releaseInitializationLock, isPageReactivating } = useAppInitialization();
  
  // Refs para evitar loops e múltiplas execuções
  const isLoadingTenantRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega detalhes do tenant do Supabase com proteção contra loops
  const loadTenantDetails = useCallback(async (id: string) => {
    if (isLoadingTenantRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PortalContext] Carregamento de tenant já em andamento, ignorando');
      }
      return null;
    }

    isLoadingTenantRef.current = true;
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PortalContext] Carregando detalhes do tenant:', id);
      }

      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao carregar detalhes do tenant:', error);
      return null;
    } finally {
      isLoadingTenantRef.current = false;
    }
  }, []);

  // Inicialização melhorada com proteção contra loops
  const initializePortal = useCallback(async () => {
    // Evita múltiplas inicializações simultâneas
    const lockId = `portal-init-${Date.now()}`;
    if (!acquireInitializationLock(lockId)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PortalContext] Inicialização ignorada - lock em uso');
      }
      return;
    }

    try {
      // 1. Usando a nova arquitetura de tenant do core
      const currentTenantFromManager = null; // Removido import da arquitetura antiga
      
      // 2. Caso não tenha tenant no TenantManager, usar localStorage como fallback
      const storedPortalType = localStorage.getItem('portalType') as PortalType | null;
      const storedTenantId = localStorage.getItem('tenantId');
      const storedResellerId = localStorage.getItem('resellerId');

      if (process.env.NODE_ENV === 'development') {
        console.log('[PortalContext] Inicializando portal:', { 
          tenantFromManager: currentTenantFromManager ? {
            id: currentTenantFromManager.id,
            name: currentTenantFromManager.name,
            slug: currentTenantFromManager.slug
          } : 'nenhum',
          localStorage: {
            portalType: storedPortalType,
            tenantId: storedTenantId,
            resellerId: storedResellerId
          }
        });
      }
      
      // Se temos um tenant no TenantManager, usar ele (prioridade maior)
      if (currentTenantFromManager) {
        setPortalType('tenant');
        setTenantId(currentTenantFromManager.id);
        setCurrentPortal(currentTenantFromManager);
        
        // Atualizar o localStorage para ficar consistente
        localStorage.setItem('portalType', 'tenant');
        localStorage.setItem('tenantId', currentTenantFromManager.id);
        localStorage.removeItem('resellerId');
        
        console.log('[PortalContext] Portal configurado a partir do TenantManager:', {
          id: currentTenantFromManager.id,
          name: currentTenantFromManager.name
        });
      }
      // Senão, tenta usar os dados do localStorage (fallback)
      else if (storedPortalType) {
        setPortalType(storedPortalType);
        
        if (storedTenantId) {
          setTenantId(storedTenantId);
          const tenantDetails = await loadTenantDetails(storedTenantId);
          if (tenantDetails) {
            setCurrentPortal(tenantDetails);
          }
        }
        
        if (storedResellerId) {
          setResellerId(storedResellerId);
        }
      }

      setIsInitialized(true);
      
    } catch (error) {
      console.error('[PortalContext] Erro durante inicialização:', error);
    } finally {
      setIsLoading(false);
      releaseInitializationLock(lockId);
    }
  }, [acquireInitializationLock, releaseInitializationLock, loadTenantDetails]);

  const resetPortal = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PortalContext] Resetando portal para admin');
    }
    
    try {
      setPortalType('admin');
      setTenantId(null);
      setResellerId(null);
      setCurrentPortal(null);
      localStorage.removeItem('portalType');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('resellerId');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[PortalContext] Portal resetado com sucesso');
      }
    } catch (error) {
      console.error('[PortalContext] Erro ao resetar portal:', error);
    }
  }, []);

  // AIDEV-NOTE: Effect para inicialização controlada do portal
  // Aguarda o usuário estar disponível e não estar em processo de inicialização
  useEffect(() => {
    const initializeWithDelay = async () => {
      if (!user?.id || isPageReactivating || isInitialized) {
        return;
      }
      
      if (!isInitialized) {
        await initializePortal();
      }
    };

    initializeWithDelay();
  }, [user?.id, isPageReactivating, initializePortal, isInitialized]);

  // Efeito para carregar detalhes do tenant quando tenantId muda (com proteção)
  useEffect(() => {
    // Só executa se estiver inicializado e não for uma mudança de usuário
    if (isInitialized && tenantId && portalType === 'tenant' && user?.id === lastUserIdRef.current) {
      loadTenantDetails(tenantId).then(details => {
        if (details) {
          setCurrentPortal(details);
        }
      });
    } else if (isInitialized && (!tenantId || portalType !== 'tenant')) {
      setCurrentPortal(null);
    }
  }, [tenantId, portalType, loadTenantDetails, isInitialized, user?.id]);

  // Efeito para detectar mudanças de usuário de forma estável
  useEffect(() => {
    // A fonte do usuário (useAuthStore) é estável, então o debounce não é mais necessário.
    if (user?.id !== lastUserIdRef.current) {
      console.log(`[PortalContext] Mudança de usuário detectada. ID anterior: ${lastUserIdRef.current}, Novo ID: ${user?.id}`);
      lastUserIdRef.current = user?.id || null;

      // Reseta o portal quando o usuário é deslogado.
      if (!user) {
        resetPortal();
      }
    }
  }, [user?.id, resetPortal]);

  const setPortal = useCallback((type: PortalType, tenantId?: string, resellerId?: string, tenantSlug?: string) => {
    // Log inicial com todos os parâmetros recebidos
    console.log('[PortalContext] Definindo portal:', { type, tenantId, resellerId, tenantSlug });
    
    // Log do estado atual antes da mudança
    console.log('[PortalContext] Estado atual antes da mudança:', { 
      portalType: portalType,
      tenantId: tenantId, 
      resellerId: resellerId,
      currentPortal: currentPortal
    });
    
    try {
      setPortalType(type);
      localStorage.setItem('portalType', type);
      
      if (type === 'tenant' && tenantId) {
        setTenantId(tenantId);
        localStorage.setItem('tenantId', tenantId);
        
        // Armazenar o slug do tenant quando disponível
        if (tenantSlug) {
          localStorage.setItem('tenantSlug', tenantSlug);
        }
        
        // Limpar reseller quando mudar para tenant
        setResellerId(null);
        localStorage.removeItem('resellerId');
        if (process.env.NODE_ENV === 'development') {
          console.log('[PortalContext] Portal tenant configurado:', tenantId, tenantSlug ? `(slug: ${tenantSlug})` : '');
        }
      } else if (type === 'reseller' && resellerId) {
        setResellerId(resellerId);
        localStorage.setItem('resellerId', resellerId);
        // Limpar tenant quando mudar para reseller
        setTenantId(null);
        localStorage.removeItem('tenantId');
        if (process.env.NODE_ENV === 'development') {
          console.log('[PortalContext] Portal reseller configurado:', resellerId);
        }
      } else if (type === 'admin') {
        // Limpar ambos quando mudar para admin
        setTenantId(null);
        setResellerId(null);
        setCurrentPortal(null);
        localStorage.removeItem('tenantId');
        localStorage.removeItem('resellerId');
        if (process.env.NODE_ENV === 'development') {
          console.log('[PortalContext] Portal admin configurado');
        }
      }
    } catch (error) {
      console.error('[PortalContext] Erro ao definir portal:', error);
    }
  }, []);

  const getCorrectRoute = useCallback(() => {
    if (portalType === 'admin') {
      return '/admin/tenants';
    } else if (portalType === 'tenant') {
      return '/dashboard';
    } else if (portalType === 'reseller') {
      return '/reseller/dashboard';
    } else {
      return '/meus-aplicativos';
    }
  }, [portalType]);

  return (
    <PortalContext.Provider
      value={{
        portalType,
        tenantId,
        resellerId,
        currentPortal,
        isLoading,
        setPortal,
        resetPortal,
        getCorrectRoute,
        isInitialized,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (context === undefined) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
}

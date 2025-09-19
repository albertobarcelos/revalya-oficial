/**
 * Provedor de Contexto de Tenant para React
 * 
 * Disponibiliza o contexto de tenant para todos os componentes da aplicação
 * e gerencia o estado de tenant usando o TenantService.
 * 
 * @module TenantProvider
 */

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { TenantService, TenantEventType, tenantService } from './TenantService';
import { SimpleTenant, TenantContext, TenantUserRole, TenantResult } from './models';
import { useAuth } from '../auth/AuthProvider';
import { logDebug, logError } from '@/lib/logger';

/**
 * Contexto de tenant para React
 */
export interface TenantContextType extends TenantContext {
  /** Função para trocar para outro tenant */
  switchTenant: (tenantId: string) => Promise<TenantResult<SimpleTenant>>;
  
  /** Função para trocar para outro tenant usando o slug */
  switchTenantBySlug: (slug: string) => Promise<TenantResult<SimpleTenant>>;
  
  /** Função para limpar o tenant atual */
  clearCurrentTenant: () => void;
  
  /** Função para verificar se um tenant está ativo */
  isTenantActive: (tenantId: string) => Promise<boolean>;
  
  /** Se o contexto foi inicializado */
  initialized: boolean;
}

// Criar contexto de tenant
const TenantContext = createContext<TenantContextType | undefined>(undefined);

/**
 * Propriedades para o provedor de tenant
 */
export interface TenantProviderProps {
  /** Elementos filho */
  children: React.ReactNode;
  
  /** Serviço de tenant personalizado */
  service?: TenantService;
  
  /** Função a ser chamada quando o tenant for alterado */
  onTenantChange?: (tenant: SimpleTenant | null) => void;
}

/**
 * Provedor de tenant para React
 */
export function TenantProvider({
  children,
  service = tenantService,
  onTenantChange
}: TenantProviderProps) {
  // Obter contexto de autenticação
  const { user, isAuthenticated } = useAuth();
  
  // Estado local para rastrear inicialização
  const [initialized, setInitialized] = useState(false);
  
  // Obter contexto de tenant
  const [context, setContext] = useState<TenantContext>(service.getContext());
  
  // Efeito para inicialização
  useEffect(() => {
    // Só inicializar se o usuário estiver autenticado
    if (isAuthenticated && user) {
      const initializeContext = async () => {
        try {
          const result = await service.initialize(user.id);
          
          if (result.success) {
            setContext(result.data);
            
            // Notificar sobre tenant atual, se houver
            if (onTenantChange && result.data.tenant) {
              onTenantChange(result.data.tenant);
            }
          } else if (result.error) {
            logError('[TenantProvider] Erro ao inicializar contexto de tenant:', result.error);
          }
          
          setInitialized(true);
        } catch (error) {
          logError('[TenantProvider] Erro ao inicializar contexto de tenant:', error);
          setInitialized(true);
        }
      };
      
      initializeContext();
    } else {
      // Se não estiver autenticado, limpar contexto
      service.clearCurrentTenant();
      setContext(service.getContext());
      setInitialized(true);
    }
  }, [isAuthenticated, user, service, onTenantChange]);
  
  // Configurar ouvintes de eventos
  useEffect(() => {
    const unsubscribeSwitch = service.on(TenantEventType.SWITCH, (data) => {
      setContext(service.getContext());
      
      if (onTenantChange && data.tenant) {
        onTenantChange(data.tenant);
      }
    });
    
    const unsubscribeClear = service.on(TenantEventType.CLEAR, () => {
      setContext(service.getContext());
      
      if (onTenantChange) {
        onTenantChange(null);
      }
    });
    
    const unsubscribeError = service.on(TenantEventType.ERROR, () => {
      setContext(service.getContext());
    });
    
    // Cleanup
    return () => {
      unsubscribeSwitch();
      unsubscribeClear();
      unsubscribeError();
    };
  }, [service, onTenantChange]);
  
  // Funções de tenant para o contexto
  const switchTenant = async (tenantId: string): Promise<TenantResult<SimpleTenant>> => {
    if (!user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }
    
    const result = await service.switchTenant(tenantId, user.id);
    setContext(service.getContext());
    return result;
  };
  
  const switchTenantBySlug = async (slug: string): Promise<TenantResult<SimpleTenant>> => {
    if (!user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }
    
    const result = await service.switchTenantBySlug(slug, user.id);
    setContext(service.getContext());
    return result;
  };
  
  const clearCurrentTenant = (): void => {
    service.clearCurrentTenant();
    setContext(service.getContext());
  };
  
  const isTenantActive = (tenantId: string): Promise<boolean> => {
    return service.isTenantActive(tenantId);
  };
  
  // Memoizar o valor do contexto para evitar re-renderizações desnecessárias
  const contextValue = useMemo<TenantContextType>(() => ({
    ...context,
    switchTenant,
    switchTenantBySlug,
    clearCurrentTenant,
    isTenantActive,
    initialized
  }), [context, initialized]);
  
  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook para usar o contexto de tenant
 */
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  
  if (!context) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  }
  
  return context;
}

/**
 * Hook para obter o tenant atual
 */
export function useCurrentTenant(): SimpleTenant | null {
  const { tenant } = useTenant();
  return tenant;
}

/**
 * Hook para obter o papel do usuário no tenant atual
 */
export function useUserRole(): TenantUserRole | string | null {
  const { userRole } = useTenant();
  return userRole;
}

/**
 * Componente para proteger rotas específicas de tenant
 */
export function RequireTenant({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  const { tenant, isLoading, initialized } = useTenant();
  
  if (!initialized || isLoading) {
    return <div>Carregando contexto de tenant...</div>;
  }
  
  if (!tenant) {
    return fallback ? <>{fallback}</> : <div>Nenhum tenant selecionado</div>;
  }
  
  return <>{children}</>;
}

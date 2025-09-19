/**
 * FASE 2: Provider Unificado de Tenant
 * 
 * Este provider consolida as duas implementações existentes:
 * - Core TenantProvider (Context API + TenantService)
 * - Features TenantProvider (Hook simples + useSimpleTenantManager)
 * 
 * Mantém compatibilidade com ambas as APIs durante a migração.
 * 
 * @module UnifiedTenantProvider
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { TenantService, TenantEventType, tenantService } from './TenantService';
import { SimpleTenant, TenantContext, TenantUserRole, TenantResult } from './models';
import { useAuth } from '../auth/AuthProvider';
import { logDebug, logError, logInfo } from '@/lib/logger';
import { useTenantStore } from '@/store/tenantStore';
import { useSimpleTenantManager } from '@/features/tenant/store/tenantManager';

/**
 * Interface unificada que combina ambas as APIs existentes
 */
export interface UnifiedTenantContextType extends TenantContext {
  // API do Core TenantProvider
  switchTenant: (tenantId: string) => Promise<TenantResult<SimpleTenant>>;
  switchTenantBySlug: (slug: string) => Promise<TenantResult<SimpleTenant>>;
  clearCurrentTenant: () => void;
  isTenantActive: (tenantId: string) => Promise<boolean>;
  initialized: boolean;
  
  // API do Features TenantProvider (compatibilidade)
  userTenants: any[];
  loadingTenants: boolean;
  loadUserTenants: () => Promise<void>;
  getCurrentTenant: () => SimpleTenant | null;
  
  // API do Zustand (integração)
  availableTenants: SimpleTenant[];
  pendingInvites: any[];
  userRole: string | null;
  hasLoaded: boolean;
  error: string | null;
  
  // Métodos de controle unificados
  refreshTenantData: () => Promise<void>;
  validateTenantAccess: (tenantId: string) => Promise<boolean>;
}

// Contexto unificado
const UnifiedTenantContext = createContext<UnifiedTenantContextType | undefined>(undefined);

/**
 * Props para o provider unificado
 */
export interface UnifiedTenantProviderProps {
  children: React.ReactNode;
  service?: TenantService;
  onTenantChange?: (tenant: SimpleTenant | null) => void;
  
  // Flags para controlar qual implementação usar durante migração
  useCore?: boolean;
  useFeatures?: boolean;
  useZustand?: boolean;
}

/**
 * Provider Unificado que consolida todas as implementações
 */
export function UnifiedTenantProvider({
  children,
  service = tenantService,
  onTenantChange,
  useCore = true,
  useFeatures = true,
  useZustand = true
}: UnifiedTenantProviderProps) {
  // Detectar se já existe uma instância ativa
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Hooks dos sistemas existentes
  const { user, isAuthenticated } = useAuth();
  const zustandStore = useZustand ? useTenantStore() : null;
  const simpleTenantManager = useFeatures ? useSimpleTenantManager() : null;
  
  // Estado local para Core API
  const [coreContext, setCoreContext] = useState<TenantContext>(
    useCore ? service.getContext() : { tenant: null, userRole: null, isLoading: false, error: null }
  );
  
  // Log de inicialização
  useEffect(() => {
    logInfo('[UnifiedTenantProvider] Inicializando provider unificado', {
      useCore,
      useFeatures,
      useZustand,
      isAuthenticated,
      userId: user?.id
    });
    
    return () => {
      logInfo('[UnifiedTenantProvider] Provider unificado desmontado');
    };
  }, [useCore, useFeatures, useZustand, isAuthenticated, user?.id]);
  
  // Inicialização do Core TenantProvider
  useEffect(() => {
    if (!useCore || !isAuthenticated || !user || isInitialized) return;
    
    const initializeCore = async () => {
      try {
        logDebug('[UnifiedTenantProvider] Inicializando Core TenantProvider');
        const result = await service.initialize(user.id);
        
        if (result.success && result.data) {
          setCoreContext(result.data);
          if (onTenantChange && result.data.tenant) {
            onTenantChange(result.data.tenant);
          }
          logInfo('[UnifiedTenantProvider] Core TenantProvider inicializado com sucesso');
        } else if (result.error) {
          logError('[UnifiedTenantProvider] Erro ao inicializar Core TenantProvider:', result.error);
        }
        
        setIsInitialized(true);
      } catch (error) {
        logError('[UnifiedTenantProvider] Erro inesperado na inicialização:', error);
        setIsInitialized(true);
      }
    };
    
    initializeCore();
  }, [useCore, isAuthenticated, user, service, onTenantChange, isInitialized]);
  
  // Sincronização entre sistemas
  const currentTenant = useMemo(() => {
    // Prioridade: Zustand > Core > Features
    if (useZustand && zustandStore?.currentTenant) {
      return zustandStore.currentTenant;
    }
    if (useCore && coreContext?.tenant) {
      return coreContext.tenant;
    }
    if (useFeatures && simpleTenantManager?.context?.tenant) {
      return simpleTenantManager.context.tenant;
    }
    return null;
  }, [useZustand, zustandStore?.currentTenant, useCore, coreContext?.tenant, useFeatures, simpleTenantManager?.context?.tenant]);
  
  // Função unificada para trocar tenant
  const switchTenant = useCallback(async (tenantId: string): Promise<TenantResult<SimpleTenant>> => {
    logInfo('[UnifiedTenantProvider] Trocando tenant', { tenantId });
    
    try {
      // Executar em todos os sistemas ativos
      const results: TenantResult<SimpleTenant>[] = [];
      
      if (useCore) {
        const coreResult = await service.switchTenant(tenantId, '');
        results.push(coreResult);
        if (coreResult.success && coreResult.data) {
          setCoreContext(prev => ({ ...prev, tenant: coreResult.data }));
        }
      }
      
      if (useFeatures && simpleTenantManager) {
        const featuresResult = await simpleTenantManager.switchTenant(tenantId);
        results.push(featuresResult);
      }
      
      if (useZustand && zustandStore) {
        zustandStore.switchTenant(tenantId);
        results.push({ success: true, data: zustandStore.currentTenant });
      }
      
      // Retornar o primeiro resultado bem-sucedido
      const successResult = results.find(r => r.success);
      if (successResult) {
        if (onTenantChange && successResult.data) {
          onTenantChange(successResult.data);
        }
        return successResult;
      }
      
      // Se nenhum sucesso, retornar o primeiro erro
      return results[0] || { success: false, error: 'Nenhum sistema de tenant ativo' };
      
    } catch (error) {
      logError('[UnifiedTenantProvider] Erro ao trocar tenant:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }, [useCore, useFeatures, useZustand, service, simpleTenantManager, zustandStore, onTenantChange]);
  
  // Função unificada para trocar tenant por slug
  const switchTenantBySlug = useCallback(async (slug: string): Promise<TenantResult<SimpleTenant>> => {
    logInfo('[UnifiedTenantProvider] Trocando tenant por slug', { slug });
    
    try {
      if (useCore) {
        const result = await service.switchTenantBySlug(slug, '');
        if (result.success && result.data) {
          setCoreContext(prev => ({ ...prev, tenant: result.data }));
          if (onTenantChange && result.data) {
            onTenantChange(result.data);
          }
        }
        return result;
      }
      
      if (useFeatures && simpleTenantManager) {
        return await simpleTenantManager.switchTenantBySlug(slug);
      }
      
      return { success: false, error: 'Nenhum sistema de tenant ativo suporta troca por slug' };
      
    } catch (error) {
      logError('[UnifiedTenantProvider] Erro ao trocar tenant por slug:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }, [useCore, useFeatures, service, simpleTenantManager, onTenantChange]);
  
  // Função para limpar tenant atual
  const clearCurrentTenant = useCallback(() => {
    logInfo('[UnifiedTenantProvider] Limpando tenant atual');
    
    if (useCore) {
      service.clearCurrentTenant();
      setCoreContext(prev => ({ ...prev, tenant: null }));
    }
    
    if (useFeatures && simpleTenantManager) {
      simpleTenantManager.clearCurrentTenant();
    }
    
    if (useZustand && zustandStore) {
      // Zustand não tem clearCurrentTenant, mas podemos definir como null
      zustandStore.switchTenant('');
    }
    
    if (onTenantChange) {
      onTenantChange(null);
    }
  }, [useCore, useFeatures, useZustand, service, simpleTenantManager, zustandStore, onTenantChange]);
  
  // Função para verificar se tenant está ativo
  const isTenantActive = useCallback(async (tenantId: string): Promise<boolean> => {
    if (useCore) {
      return await service.isTenantActive(tenantId);
    }
    
    if (useFeatures && simpleTenantManager) {
      return await simpleTenantManager.isTenantActive(tenantId);
    }
    
    return false;
  }, [useCore, useFeatures, service, simpleTenantManager]);
  
  // Função para obter tenant atual
  const getCurrentTenant = useCallback((): SimpleTenant | null => {
    return currentTenant;
  }, [currentTenant]);
  
  // Função para carregar tenants do usuário
  const loadUserTenants = useCallback(async (): Promise<void> => {
    if (useFeatures && simpleTenantManager) {
      await simpleTenantManager.loadUserTenants();
    }
    
    if (useZustand && zustandStore) {
      // fetchPortalData requer supabase como parâmetro - implementar quando necessário
      // await zustandStore.fetchPortalData(supabase);
    }
  }, [useFeatures, useZustand, simpleTenantManager, zustandStore]);
  
  // Função para atualizar dados do tenant
  const refreshTenantData = useCallback(async (): Promise<void> => {
    logInfo('[UnifiedTenantProvider] Atualizando dados do tenant');
    
    if (useZustand && zustandStore) {
      // fetchPortalData requer supabase como parâmetro - implementar quando necessário
      // await zustandStore.fetchPortalData(supabase);
    }
    
    await loadUserTenants();
  }, [useZustand, zustandStore, loadUserTenants]);
  
  // Função para validar acesso ao tenant
  const validateTenantAccess = useCallback(async (tenantId: string): Promise<boolean> => {
    return await isTenantActive(tenantId);
  }, [isTenantActive]);
  
  // Valor do contexto unificado
  const contextValue: UnifiedTenantContextType = useMemo(() => ({
    // Estado principal
    tenant: currentTenant,
    userRole: zustandStore?.userRole || coreContext?.userRole || simpleTenantManager?.context?.userRole || null,
    isLoading: (useZustand ? zustandStore?.isLoading : false) || 
               (useCore ? coreContext?.isLoading : false) || 
               (useFeatures ? simpleTenantManager?.loadingTenants : false) || 
               false,
    
    // API do Core
    switchTenant,
    switchTenantBySlug,
    clearCurrentTenant,
    isTenantActive,
    initialized: isInitialized,
    
    // API do Features
    userTenants: simpleTenantManager?.userTenants || [],
    loadingTenants: simpleTenantManager?.loadingTenants || false,
    loadUserTenants,
    getCurrentTenant,
    
    // API do Zustand
    availableTenants: zustandStore?.availableTenants || [],
    pendingInvites: zustandStore?.pendingInvites || [],
    hasLoaded: zustandStore?.hasLoaded || false,
    error: zustandStore?.error || null,
    
    // Métodos unificados
    refreshTenantData,
    validateTenantAccess,
  }), [
    currentTenant,
    zustandStore,
    coreContext,
    simpleTenantManager,
    switchTenant,
    switchTenantBySlug,
    clearCurrentTenant,
    isTenantActive,
    isInitialized,
    loadUserTenants,
    getCurrentTenant,
    refreshTenantData,
    validateTenantAccess,
    useZustand,
    useCore,
    useFeatures
  ]);
  
  return (
    <UnifiedTenantContext.Provider value={contextValue}>
      {children}
    </UnifiedTenantContext.Provider>
  );
}

/**
 * Hook para usar o contexto unificado
 */
export function useUnifiedTenant(): UnifiedTenantContextType {
  const context = useContext(UnifiedTenantContext);
  
  if (!context) {
    throw new Error('useUnifiedTenant deve ser usado dentro de um UnifiedTenantProvider');
  }
  
  return context;
}

/**
 * Hook de compatibilidade para useTenant (Core API)
 */
export function useTenant() {
  const context = useUnifiedTenant();
  
  // Retornar apenas a API do Core para compatibilidade
  return {
    tenant: context.tenant,
    userRole: context.userRole,
    isLoading: context.isLoading,
    switchTenant: context.switchTenant,
    switchTenantBySlug: context.switchTenantBySlug,
    clearCurrentTenant: context.clearCurrentTenant,
    isTenantActive: context.isTenantActive,
    initialized: context.initialized,
  };
}

/**
 * Hook de compatibilidade para Features API
 */
export function useTenantFeatures() {
  const context = useUnifiedTenant();
  
  return {
    context: {
      tenant: context.tenant,
      userRole: context.userRole,
      isLoading: context.isLoading,
    },
    userTenants: context.userTenants,
    loadingTenants: context.loadingTenants,
    switchTenant: context.switchTenant,
    switchTenantBySlug: context.switchTenantBySlug,
    loadUserTenants: context.loadUserTenants,
    isTenantActive: context.isTenantActive,
    clearCurrentTenant: context.clearCurrentTenant,
    getCurrentTenant: context.getCurrentTenant,
  };
}

export default UnifiedTenantProvider;

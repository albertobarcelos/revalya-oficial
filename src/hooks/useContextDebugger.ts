import { useEffect, useRef, useMemo } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { usePortal } from '../contexts/PortalContext';
import { useTenant } from '@/features/tenant';
import { useLocation } from 'react-router-dom';

interface ContextState {
  timestamp: number;
  location: string;
  user: {
    id?: string;
    email?: string;
  } | null;
  portal: {
    type: string | null;
    tenantId: string | null;
    resellerId: string | null;
    currentPortal: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
  tenant: {
    currentTenant: {
      id: string;
      name: string;
      slug: string;
      userRole: string;
    } | null;
    userTenantRole: string | null;
    isLoading: boolean;
  };
}

export const useContextDebugger = (componentName: string) => {
  const { user } = useSupabase();
  const { portalType, tenantId, resellerId, currentPortal } = usePortal();
  const tenantContext = useTenant();
  const currentTenant = tenantContext?.context?.tenant;
  const userTenantRole = currentTenant?.user_role;
  const tenantLoading = tenantContext?.context?.isLoading || false;
  const location = useLocation();
  const previousState = useRef<ContextState | null>(null);
  const stateHistory = useRef<ContextState[]>([]);

  const getCurrentState = (): ContextState => ({
    timestamp: Date.now(),
    location: location.pathname,
    user: user ? {
      id: user.id,
      email: user.email
    } : null,
    portal: {
      type: portalType,
      tenantId,
      resellerId,
      currentPortal: currentPortal ? {
        id: currentPortal.id,
        name: currentPortal.name,
        slug: currentPortal.slug
      } : null
    },
    tenant: {
      currentTenant: currentTenant ? {
        id: currentTenant.id,
        name: currentTenant.name,
        slug: currentTenant.slug,
        userRole: currentTenant.user_role
      } : null,
      userTenantRole,
      isLoading: tenantLoading
    }
  });

  const detectChanges = (current: ContextState, previous: ContextState | null) => {
    if (!previous) return [];

    const changes: string[] = [];

    // Verificar mudanças no usuário
    if (current.user?.id !== previous.user?.id) {
      changes.push(`user.id: ${previous.user?.id} → ${current.user?.id}`);
    }

    // Verificar mudanças no portal
    if (current.portal.type !== previous.portal.type) {
      changes.push(`portal.type: ${previous.portal.type} → ${current.portal.type}`);
    }
    if (current.portal.tenantId !== previous.portal.tenantId) {
      changes.push(`portal.tenantId: ${previous.portal.tenantId} → ${current.portal.tenantId}`);
    }
    if (current.portal.resellerId !== previous.portal.resellerId) {
      changes.push(`portal.resellerId: ${previous.portal.resellerId} → ${current.portal.resellerId}`);
    }

    // Verificar mudanças no tenant
    if (current.tenant.currentTenant?.id !== previous.tenant.currentTenant?.id) {
      changes.push(`tenant.currentTenant.id: ${previous.tenant.currentTenant?.id} → ${current.tenant.currentTenant?.id}`);
    }
    if (current.tenant.userTenantRole !== previous.tenant.userTenantRole) {
      changes.push(`tenant.userTenantRole: ${previous.tenant.userTenantRole} → ${current.tenant.userTenantRole}`);
    }
    if (current.tenant.isLoading !== previous.tenant.isLoading) {
      changes.push(`tenant.isLoading: ${previous.tenant.isLoading} → ${current.tenant.isLoading}`);
    }

    // Verificar mudanças na localização
    if (current.location !== previous.location) {
      changes.push(`location: ${previous.location} → ${current.location}`);
    }

    return changes;
  };

  const logContextState = (state: ContextState, changes: string[] = []) => {
    const logStyle = 'background: #1e40af; color: white; padding: 2px 6px; border-radius: 3px;';
    
    console.group(`%c[${componentName}] Context State - ${new Date(state.timestamp).toLocaleTimeString()}`, logStyle);
    
    if (changes.length > 0) {
      console.log('🔄 Changes detected:', changes);
    }
    
    console.log('📍 Location:', state.location);
    console.log('👤 User:', state.user);
    console.log('🏢 Portal:', state.portal);
    console.log('🏠 Tenant:', state.tenant);
    
    // Verificar possíveis problemas
    const issues: string[] = [];
    
    if (state.portal.type === 'tenant' && !state.portal.tenantId) {
      issues.push('Portal type is tenant but tenantId is null');
    }
    
    if (state.portal.tenantId && !state.tenant.currentTenant) {
      issues.push('TenantId is set but currentTenant is null');
    }
    
    if (state.portal.tenantId !== state.tenant.currentTenant?.id) {
      issues.push('Portal tenantId does not match current tenant id');
    }
    
    if (state.user && state.portal.type === 'tenant' && !state.tenant.userTenantRole && !state.tenant.isLoading) {
      issues.push('User is authenticated and tenant is selected but userTenantRole is null');
    }
    
    if (issues.length > 0) {
      console.warn('⚠️ Potential issues:', issues);
    }
    
    console.groupEnd();
  };

  const checkLocalStorageConsistency = () => {
    try {
      const storedPortalType = localStorage.getItem('portalType');
      const storedTenantId = localStorage.getItem('tenantId');
      const storedResellerId = localStorage.getItem('resellerId');
      
      const inconsistencies: string[] = [];
      
      if (storedPortalType !== portalType) {
        inconsistencies.push(`portalType: localStorage(${storedPortalType}) !== context(${portalType})`);
      }
      
      if (storedTenantId !== tenantId) {
        inconsistencies.push(`tenantId: localStorage(${storedTenantId}) !== context(${tenantId})`);
      }
      
      if (storedResellerId !== resellerId) {
        inconsistencies.push(`resellerId: localStorage(${storedResellerId}) !== context(${resellerId})`);
      }
      
      if (inconsistencies.length > 0) {
        console.warn(`[${componentName}] 🔄 LocalStorage inconsistencies:`, inconsistencies);
      }
    } catch (error) {
      console.error(`[${componentName}] Error checking localStorage consistency:`, error);
    }
  };

  // Usar useMemo para evitar recriação desnecessária do estado
  const currentState = useMemo(() => getCurrentState(), [
    location.pathname,
    user?.id,
    portalType,
    tenantId,
    resellerId,
    currentPortal?.id,
    currentTenant?.id,
    userTenantRole,
    tenantLoading
  ]);

  // Ref para controlar a frequência de logs
  const lastLogTime = useRef<number>(0);
  const LOG_THROTTLE_MS = 2000; // Só loga a cada 2 segundos

  useEffect(() => {
    const now = Date.now();
    const changes = detectChanges(currentState, previousState.current);
    
    // Log apenas se houver mudanças significativas E se passou tempo suficiente desde o último log
    const shouldLog = (!previousState.current || changes.length > 0) && 
                     (now - lastLogTime.current > LOG_THROTTLE_MS);
    
    if (shouldLog) {
      logContextState(currentState, changes);
      lastLogTime.current = now;
      
      // Manter histórico dos últimos 10 estados apenas quando há mudanças
      stateHistory.current.push(currentState);
      if (stateHistory.current.length > 10) {
        stateHistory.current.shift();
      }
    }
    
    previousState.current = currentState;
  }, [currentState]);

  // Verificar consistência com localStorage apenas quando necessário
  useEffect(() => {
    checkLocalStorageConsistency();
  }, [portalType, tenantId, resellerId]);

  // Função para exportar histórico de estados (útil para debugging)
  const exportStateHistory = () => {
    console.log(`[${componentName}] State History:`, stateHistory.current);
    return stateHistory.current;
  };

  // Função para detectar loops de re-renderização
  const renderCount = useRef(0);
  renderCount.current++;
  
  if (renderCount.current > 50) {
    console.error(`[${componentName}] 🔄 Possible render loop detected! Render count: ${renderCount.current}`);
  }

  return {
    exportStateHistory,
    getCurrentState,
    renderCount: renderCount.current
  };
};

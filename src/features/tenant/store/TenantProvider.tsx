import React, { createContext, useContext, ReactNode } from 'react';
import { useSimpleTenantManager } from './useTenantManager';
import { SimpleTenant, TenantContext, TenantResult, UserTenantResponse } from './types';

// Interface do contexto do provider
interface TenantProviderContextType {
  context: TenantContext;
  userTenants: UserTenantResponse[];
  loadingTenants: boolean;
  switchTenant: (tenantId: string) => Promise<TenantResult>;
  switchTenantBySlug: (slug: string) => Promise<TenantResult>;
  loadUserTenants: () => Promise<void>;
  isTenantActive: (tenantId: string) => Promise<boolean>;
  clearCurrentTenant: () => void;
  getCurrentTenant: () => SimpleTenant | null;
}

// Cria o contexto
const TenantProviderContext = createContext<TenantProviderContextType | undefined>(undefined);

// Provider do tenant
export function TenantProvider({ children }: { children: ReactNode }) {
  const tenantManager = useSimpleTenantManager();

  // Adicionar log ao inicializar o Provider
  console.log('[TenantProvider] Iniciando com tenant:', 
    tenantManager.context.tenant ? {
      id: tenantManager.context.tenant.id,
      name: tenantManager.context.tenant.name,
      slug: tenantManager.context.tenant.slug
    } : 'nenhum');

  return (
    <TenantProviderContext.Provider value={tenantManager}>
      {children}
    </TenantProviderContext.Provider>
  );
}

// Hook para usar o contexto
export function useTenant() {
  const context = useContext(TenantProviderContext);
  if (context === undefined) {
    console.error('[useTenant] ERRO: Hook chamado fora de TenantProvider');
    throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  }
  
  // Log para debug - apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    // Usar um nome de função para identificar de onde vem a chamada
    const caller = new Error().stack?.split('\n')[2]?.trim() || 'desconhecido';
    console.log(`[useTenant] Hook chamado por: ${caller}`);
    console.log('[useTenant] Tenant atual:', 
      context.context.tenant ? {
        id: context.context.tenant.id,
        name: context.context.tenant.name,
        slug: context.context.tenant.slug
      } : 'nenhum');
  }
  
  return context;
}

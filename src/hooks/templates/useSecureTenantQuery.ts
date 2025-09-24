/**
 * 🔐 TEMPLATE OBRIGATÓRIO PARA TODAS AS CONSULTAS MULTI-TENANT
 * 
 * Este hook garante que NUNCA haverá vazamento de dados entre tenants
 * USO OBRIGATÓRIO em todas as páginas que manipulam dados de tenant
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMemo } from 'react';
import { useZustandTenant } from '@/hooks/useZustandTenant';
import type { SupabaseClient } from '@supabase/supabase-js';
import { throttledDebug, throttledTenantGuard } from '@/utils/logThrottle';
import { SecurityMiddleware } from '@/core/security/SecurityMiddleware';

/**
 * Hook seguro para consultas que SEMPRE inclui tenant_id
 * 
 * ⚠️ NUNCA faça consultas diretas ao Supabase sem usar este hook
 */
export function useSecureTenantQuery<T>(
  queryKey: string[],
  queryFn: (supabase: SupabaseClient, tenantId: string) => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
  }
) {
  const { currentTenant, userRole } = useTenantAccessGuard();
  
  // 🚨 VALIDAÇÃO CRÍTICA: Tenant deve estar definido
  const isValidTenant = currentTenant?.id && currentTenant?.active;
  
  // 🔍 DEBUG: Log do estado do tenant (com throttling otimizado)
  throttledDebug('useSecureTenantQuery_state', `useSecureTenantQuery - Tenant: ${currentTenant?.name}`, {
    tenantId: currentTenant?.id,
    tenantName: currentTenant?.name,
    isValidTenant,
    queryKeyLength: queryKey.length,
    enabled: isValidTenant && (options?.enabled !== false)
  });
  
  return useQuery({
    // 🔑 CHAVE SEMPRE INCLUI TENANT_ID
    queryKey: [...queryKey, currentTenant?.id],
    
    queryFn: async () => {
      // 🛡️ VALIDAÇÃO DUPLA DE SEGURANÇA
      if (!currentTenant?.id) {
        throw new Error('❌ ERRO CRÍTICO: Tenant não definido - possível vazamento de dados!');
      }
      
      if (!currentTenant.active) {
        throw new Error('❌ ERRO: Tenant inativo - acesso negado');
      }
      
      // ✅ Executar query com tenant_id garantido
      const result = await queryFn(supabase, currentTenant.id);
      return result;
    },
    
    // 🔒 SÓ EXECUTA SE TENANT VÁLIDO
    enabled: isValidTenant && (options?.enabled !== false),
    
    staleTime: options?.staleTime || 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos (substitui cacheTime)
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchOnMount: false,
    
    // 🚨 TRATAMENTO DE ERRO CRÍTICO - Removido onError (deprecated no React Query v5)
  });
}

/**
 * Hook seguro para mutações que SEMPRE inclui tenant_id
 */
export function useSecureTenantMutation<TData, TVariables>(
  mutationFn: (supabase: SupabaseClient, tenantId: string, variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: string[];
  }
) {
  const { currentTenant } = useTenantAccessGuard();
  const queryClient = useQueryClient();
  
  // AIDEV-NOTE: Instância do SecurityMiddleware para configurar contexto de tenant
  const securityMiddleware = new SecurityMiddleware({ supabaseClient: supabase });

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      // 🛡️ VALIDAÇÃO CRÍTICA ANTES DE QUALQUER MUTAÇÃO
      if (!currentTenant?.id) {
        throw new Error('❌ ERRO CRÍTICO: Tentativa de mutação sem tenant definido!');
      }
      
      if (!currentTenant.active) {
        throw new Error('❌ ERRO: Tentativa de mutação em tenant inativo');
      }
      
      throttledTenantGuard('mutation_audit', `✏️ [AUDIT] Mutação para tenant: ${currentTenant.name} (${currentTenant.id})`);
      
      // AIDEV-NOTE: Configurar contexto de tenant no banco ANTES da operação
      const contextApplied = await securityMiddleware.applyTenantContext(currentTenant.id);
      
      if (!contextApplied) {
        throw new Error('❌ ERRO CRÍTICO: Falha ao configurar contexto de tenant no banco de dados');
      }
      
      try {
        // Executar a mutação com o contexto configurado
        const result = await mutationFn(supabase, currentTenant.id, variables);
        return result;
      } finally {
        // AIDEV-NOTE: Limpar contexto após a operação para segurança
        await securityMiddleware.clearTenantContext();
      }
    },
    
    onSuccess: (data) => {
      // 🔄 INVALIDAR CACHE ESPECÍFICO DO TENANT
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ 
            queryKey: [queryKey, currentTenant?.id] 
          });
        });
      }
      
      options?.onSuccess?.(data);
    },
    
    onError: (error: Error) => {
      throttledTenantGuard('mutation_error', '🚨 [SECURITY] Erro em mutação multi-tenant:', {
        error: error.message,
        tenant: currentTenant?.id
      });
      
      options?.onError?.(error);
    }
  });
}

/**
 * 🔍 Hook para validação de acesso a dados específicos
 * Use antes de renderizar componentes sensíveis
 */
export function useTenantAccessGuard(options?: { 
  requireTenant?: boolean; 
  requiredRole?: string; 
} | string) {
  // Suporte para compatibilidade com parâmetro string (requiredRole)
  const { requireTenant = true, requiredRole } = typeof options === 'string' 
    ? { requireTenant: true, requiredRole: options }
    : (options || {});
  // Importação direta do hook Zustand
  const { currentTenant, userRole } = useZustandTenant();
  
  // 🔍 DEBUG: Log detalhado do tenant access guard
  throttledDebug('tenant_access_guard', `🔍 [TENANT ACCESS GUARD] Verificando acesso:`, {
    currentTenant: currentTenant ? {
      id: currentTenant.id,
      name: currentTenant.name,
      slug: currentTenant.slug,
      active: currentTenant.active
    } : null,
    userRole,
    requiredRole,
    hasCurrentTenant: !!currentTenant?.id,
    isTenantActive: currentTenant?.active,
    roleMatch: !requiredRole || userRole === requiredRole
  });
  
  const hasAccess = useMemo(() => {
    // Se não requer tenant, liberar acesso (para portal admin)
    if (!requireTenant) {
      throttledTenantGuard('access_granted_no_tenant', `✅ [ACCESS GRANTED] Acesso liberado (tenant não requerido)`);
      return true;
    }
    
    if (!currentTenant?.id) {
      throttledTenantGuard('access_denied_no_tenant', `🚨 [ACCESS DENIED] Tenant não definido`);
      return false;
    }
    if (!currentTenant?.active) {
      throttledTenantGuard('access_denied_inactive', `Tenant inativo: ${currentTenant.name}`);
      return false;
    }
    if (requiredRole && userRole !== requiredRole) {
      throttledTenantGuard('access_denied_role', `Permissão insuficiente: required=${requiredRole}, user=${userRole}`);
      return false;
    }
    throttledTenantGuard('access_granted', `Acesso liberado para tenant: ${currentTenant.name}`);
    return true;
  }, [currentTenant?.id, currentTenant?.active, userRole, requiredRole, requireTenant]);
  
  const accessError = useMemo(() => {
    if (!requireTenant) return null;
    if (!currentTenant?.id) return 'Tenant não definido';
    if (!currentTenant.active) return 'Tenant inativo';
    if (requiredRole && userRole !== requiredRole) return 'Permissão insuficiente';
    return null;
  }, [currentTenant?.id, currentTenant?.active, userRole, requiredRole, requireTenant]);
  
  return { hasAccess, accessError, currentTenant, userRole };
}

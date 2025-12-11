/**
 * 🔐 TEMPLATE OBRIGATÓRIO PARA TODAS AS CONSULTAS MULTI-TENANT
 * 
 * Este hook garante que NUNCA haverá vazamento de dados entre tenants
 * USO OBRIGATÓRIO em todas as páginas que manipulam dados de tenant
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMemo, useRef, useEffect } from 'react';
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
  
  // AIDEV-NOTE: Instância do SecurityMiddleware para configurar contexto de tenant
  const securityMiddleware = new SecurityMiddleware({ supabaseClient: supabase });
  
  // 🚨 VALIDAÇÃO CRÍTICA: Tenant deve estar definido, ativo e ter ID válido (não vazio)
  const isValidTenant = currentTenant?.id && 
                        currentTenant.id.trim() !== '' && 
                        currentTenant?.active;
  
  // AIDEV-NOTE: Simplificar - remover delay desnecessário que estava causando problemas
  // O tenant já está validado pelo useTenantAccessGuard, não precisa de delay adicional
  const isQueryEnabled = useMemo(() => {
    return isValidTenant && (options?.enabled !== false);
  }, [isValidTenant, options?.enabled]);
  
  // AIDEV-NOTE: Debug log otimizado com throttling mais agressivo (60s) para reduzir spam
  // Só loga em desenvolvimento e com throttling de 60 segundos
  if (process.env.NODE_ENV === 'development') {
    throttledDebug('useSecureTenantQuery_state', `useSecureTenantQuery - Tenant: ${currentTenant?.name}`, {
      tenantId: currentTenant?.id,
      tenantName: currentTenant?.name,
      isValidTenant,
      isQueryEnabled,
      queryKeyLength: queryKey.length,
    });
  }
  
  return useQuery({
    // 🔑 CHAVE SEMPRE INCLUI TENANT_ID
    queryKey: [...queryKey, currentTenant?.id],
    
    queryFn: async () => {
      // 🛡️ VALIDAÇÃO DUPLA DE SEGURANÇA
      if (!currentTenant?.id || currentTenant.id.trim() === '') {
        throw new Error('❌ ERRO CRÍTICO: Tenant não definido ou ID inválido - possível vazamento de dados!');
      }
      
      if (!currentTenant.active) {
        throw new Error('❌ ERRO: Tenant inativo - acesso negado');
      }
      
      // AIDEV-NOTE: CORREÇÃO CRÍTICA - Configurar contexto de tenant no banco ANTES da query
      // Isso garante que as políticas RLS funcionem corretamente
      const contextApplied = await securityMiddleware.applyTenantContext(currentTenant.id);
      
      if (!contextApplied) {
        throw new Error('❌ ERRO CRÍTICO: Falha ao configurar contexto de tenant no banco de dados');
      }
      
      try {
        // ✅ Executar query com contexto configurado
        const result = await queryFn(supabase, currentTenant.id);
        return result;
      } finally {
        // AIDEV-NOTE: Limpar contexto após a operação para segurança (opcional mas boa prática)
        await securityMiddleware.clearTenantContext();
      }
    },
    
    // 🔒 SÓ EXECUTA SE TENANT VÁLIDO E PRONTO
    enabled: isQueryEnabled,
    
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
    /**
     * Executa a mutação com re-tentativas automáticas em caso de conflito de `order_number` (erro 23505).
     * AIDEV-NOTE: Essa camada protege operações de criação que dependem de triggers que geram `order_number`.
     */
    mutationFn: async (variables: TVariables) => {
      // 🛡️ VALIDAÇÃO CRÍTICA ANTES DE QUALQUER MUTAÇÃO
      if (!currentTenant?.id) {
        throw new Error('❌ ERRO CRÍTICO: Tentativa de mutação sem tenant definido!');
      }
      if (!currentTenant.active) {
        throw new Error('❌ ERRO: Tentativa de mutação em tenant inativo');
      }

      throttledTenantGuard('mutation_audit', `✏️ [AUDIT] Mutação para tenant: ${currentTenant.name} (${currentTenant.id})`);

      // AIDEV-NOTE: Obter ID do usuário atual para contexto
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      // Função auxiliar para identificar conflito de número de OS
      const isOrderNumberConflict = (error: any) => {
        const msg = String(error?.message || '').toLowerCase();
        const code = String((error?.code || '')).toLowerCase();
        return (
          code === '23505' || msg.includes('duplicate key')
        ) && (
          msg.includes('order_number') ||
          msg.includes('idx_contract_billing_periods_order_number_tenant') ||
          msg.includes('idx_standalone_billing_periods_order_number_tenant')
        );
      };

      // AIDEV-NOTE: Re-tentativas com backoff leve para resolver corridas ocasionais
      const MAX_ATTEMPTS = 3;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // Configurar contexto por tentativa
        const contextApplied = await securityMiddleware.applyTenantContext(currentTenant.id, userId);
        if (!contextApplied) {
          throw new Error('❌ ERRO CRÍTICO: Falha ao configurar contexto de tenant no banco de dados');
        }

        try {
          const result = await mutationFn(supabase, currentTenant.id, variables);
          // Limpar contexto após sucesso
          await securityMiddleware.clearTenantContext();
          return result;
        } catch (error: any) {
          // Limpar contexto antes de decidir sobre retry
          await securityMiddleware.clearTenantContext();

          if (isOrderNumberConflict(error) && attempt < MAX_ATTEMPTS) {
            // Backoff incremental 80ms, 160ms
            const delayMs = 80 * attempt;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue; // tentar novamente
          }
          throw error;
        }
      }

      // Fallback (não deve chegar aqui)
      throw new Error('Falha inesperada na mutação após múltiplas tentativas');
    },
    
    onSuccess: (data) => {
      // 🔄 INVALIDAR CACHE ESPECÍFICO DO TENANT
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          // AIDEV-NOTE: Invalidar todas as variações da query key (com e sem tenant_id)
          queryClient.invalidateQueries({ 
            queryKey: [queryKey] 
          });
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

/**
 * Hook para integração do Zustand com o sistema de tenant existente
 * 
 * Este hook demonstra como podemos migrar gradualmente do sistema baseado em Context
 * para um sistema baseado em Zustand, mantendo a compatibilidade com o código existente.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTenantStore } from '@/store/tenantStore';
import { useZustandAuth } from '@/hooks/useZustandAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { throttledAutoSelect, throttledDebug } from '@/utils/logThrottle';

/**
 * Hook principal para gerenciamento de tenant usando Zustand
 * 
 * Facilita a interação com o store de tenant e adiciona lógica específica
 * como inicialização automática, verificação de tenant ativo, etc.
 */
export function useZustandTenant() {
  // Obter apenas o ID do usuário, não o objeto completo
  const userId = useZustandAuth().userId;
  
  // Obter a instância do Supabase do contexto
  const { supabase } = useSupabase();
  
  // Obter o estado e as ações do store de tenant
  const { 
    currentTenant,
    availableTenants,
    pendingInvites,
    userRole,
    isLoading,
    hasLoaded,
    error,
    fetchPortalData,
    switchTenant,
  } = useTenantStore();
  
  // Carregar dados do portal automaticamente quando o usuário estiver autenticado - OTIMIZADO
  const fetchLockRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const hasCalledRef = useRef(false);
  
  // AIDEV-NOTE: useCallback para estabilizar a referência de fetchPortalData
  const stableFetchPortalData = useCallback(async () => {
    if (!userId || !supabase) return;
    if (fetchLockRef.current || isLoading || hasLoaded) return;
    
    fetchLockRef.current = true;
    try {
      await fetchPortalData(supabase);
    } finally {
      fetchLockRef.current = false;
    }
  }, [userId, supabase, isLoading, hasLoaded, fetchPortalData]);
  
  useEffect(() => {
    // Evitar chamadas duplicadas: respeitar isLoading, hasLoaded e um lock local
    if (!userId || !supabase) {
      throttledDebug('useZustandTenant_auth', '[useZustandTenant] Usuário não autenticado ou supabase não inicializado, não carregando dados do portal');
      return;
    }
    
    // AIDEV-NOTE: Se já carregou com sucesso, nunca mais chamar
    if (hasLoaded) {
      if (!hasCalledRef.current) {
        throttledDebug('useZustandTenant_loaded', '[useZustandTenant] Dados já carregados, pulando fetch');
        hasCalledRef.current = true;
      }
      return;
    }
    
    // Evitar re-executar para o mesmo userId se já tentou carregar
    if (previousUserIdRef.current === userId && hasCalledRef.current) {
      throttledDebug('useZustandTenant_same_user', '[useZustandTenant] Mesmo userId e já tentou carregar, pulando fetch');
      return;
    }
    
    if (isLoading || fetchLockRef.current) {
      // Já em progresso
      throttledDebug('useZustandTenant_loading', '[useZustandTenant] Fetch já em progresso, aguardando...');
      return;
    }
    
    throttledDebug('useZustandTenant_start', '[useZustandTenant] Usuário autenticado, carregando dados do portal (com guard)');
    previousUserIdRef.current = userId;
    hasCalledRef.current = true;
    
    // Pequeno atraso para garantir que a sessão está completamente estabelecida
    const timer = setTimeout(() => {
      stableFetchPortalData();
    }, 150);
    
    return () => clearTimeout(timer);
  }, [userId, supabase, isLoading, hasLoaded, stableFetchPortalData]);

  // AIDEV-NOTE: Auto-seleção de tenant baseado no slug da URL - OTIMIZADO COM DEBOUNCE
  // Usa useLocation do react-router para detectar mudanças de URL de forma reativa
  const location = useLocation();
  const previousUrlSlugRef = useRef<string | null>(null);
  const previousTenantSlugRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSwitchingRef = useRef(false);
  
  // AIDEV-NOTE: Função de auto-seleção com debounce para evitar múltiplas execuções
  const performAutoSelect = useCallback((urlSlug: string | null) => {
    // Limpar timer anterior se existir
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Lista de rotas que NÃO são tenants (ignorar auto-seleção)
    const nonTenantRoutes = ['login', 'portal', 'meus-aplicativos', 'admin', 'api', 'auth', 'app'];
    
    // Se for uma rota não-tenant, não fazer nada
    if (urlSlug && nonTenantRoutes.includes(urlSlug)) {
      previousUrlSlugRef.current = urlSlug;
      previousTenantSlugRef.current = currentTenant?.slug || null;
      return;
    }
    
    // Evitar re-executar se nada mudou
    if (previousUrlSlugRef.current === urlSlug && 
        previousTenantSlugRef.current === currentTenant?.slug) {
      return;
    }
    
    // AIDEV-NOTE: Debounce de 200ms para evitar múltiplas execuções durante navegação rápida
    debounceTimerRef.current = setTimeout(() => {
      // Verificar se ainda está em processo de switch (evitar race condition)
      if (isSwitchingRef.current) {
        throttledAutoSelect('auto_select_switching', '[AUTO-SELECT] Switch em progresso, aguardando...');
      return;
    }
    
    // Se há um slug na URL e dados carregados, mas o tenant atual não corresponde
    if (urlSlug && hasLoaded && availableTenants.length > 0) {
        throttledAutoSelect('auto_select_check', `[AUTO-SELECT] URL slug: ${urlSlug}, currentTenant: ${currentTenant?.slug}`);
      
      if (!currentTenant || currentTenant.slug !== urlSlug) {
          throttledAutoSelect('auto_select_switch', `[AUTO-SELECT] Tentando trocar para tenant com slug: ${urlSlug}`);
        
        const targetTenant = availableTenants.find(t => t.slug === urlSlug && t.active);
        if (targetTenant) {
            throttledAutoSelect('auto_select_success', `[AUTO-SELECT] Trocando para tenant: ${targetTenant.name} (${targetTenant.id})`);
            isSwitchingRef.current = true;
          previousUrlSlugRef.current = urlSlug;
          previousTenantSlugRef.current = targetTenant.slug;
            
          switchTenant(targetTenant.id);
            
            // Resetar flag após um pequeno delay
            setTimeout(() => {
              isSwitchingRef.current = false;
            }, 300);
        } else {
          console.error(`🚨 [TENANT AUTO-SELECT] Tenant com slug '${urlSlug}' não encontrado ou inativo`);
          previousUrlSlugRef.current = urlSlug;
          previousTenantSlugRef.current = null;
        }
      } else {
          throttledAutoSelect('auto_select_correct', `[AUTO-SELECT] Tenant já está correto: ${currentTenant.name} (${currentTenant.slug})`);
        previousUrlSlugRef.current = urlSlug;
        previousTenantSlugRef.current = currentTenant.slug;
      }
    } else {
      // Atualizar referências mesmo quando não há ação
      previousUrlSlugRef.current = urlSlug;
      previousTenantSlugRef.current = currentTenant?.slug || null;
    }
    }, 200);
  }, [hasLoaded, availableTenants, currentTenant, switchTenant]);
  
  // AIDEV-NOTE: useEffect que reage a mudanças na URL usando useLocation
  useEffect(() => {
    // Obter slug da URL atual usando location.pathname (mais confiável que window.location)
    const slugMatch = location.pathname.match(/^\/([^\/]+)/);
    const urlSlug = slugMatch ? slugMatch[1] : null;
    
    // Executar auto-seleção com debounce
    performAutoSelect(urlSlug);
    
    // Cleanup: limpar timer ao desmontar ou mudar dependências
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [location.pathname, performAutoSelect]);
  
  /**
   * Troca para um tenant específico com validação aprimorada
   */
  const switchToTenant = async (tenantId: string) => {
    // Verificar se o tenant está na lista e está ativo
    const tenant = availableTenants.find(t => t.id === tenantId);
    
    if (!tenant) {
      throw new Error(`Tenant com ID ${tenantId} não encontrado.`);
    }
    
    if (!tenant.active) {
      throw new Error(`O tenant ${tenant.name} está inativo e não pode ser acessado.`);
    }
    
    // Usar a função do store para trocar o tenant
    switchTenant(tenantId);
    return true;
  };
  
  /**
   * Troca para um tenant pelo slug com validação aprimorada
   */
  const switchToTenantBySlug = async (slug: string) => {
    const tenant = availableTenants.find(t => t.slug === slug);
    
    if (!tenant) {
      throw new Error(`Tenant com slug ${slug} não encontrado.`);
    }
    
    if (!tenant.active) {
      throw new Error(`O tenant ${tenant.name} está inativo e não pode ser acessado.`);
    }
    
    // Usar a função do store para trocar o tenant
    switchTenant(tenant.id);
    return true;
  };
  
  return {
    // Estado
    currentTenant,
    availableTenants,
    pendingInvites,
    userRole,
    isLoading,
    hasLoaded,
    error,
    
    // Ações aprimoradas
    switchToTenant,
    switchToTenantBySlug,
    refreshPortalData: fetchPortalData,
    
    // Seletores convenientes
    activeTenants: availableTenants.filter(t => t.active),
    hasTenants: availableTenants.length > 0,
    hasActiveTenants: availableTenants.some(t => t.active),
    
    // Dados do tenant atual
    tenantId: currentTenant?.id,
    tenantName: currentTenant?.name,
    tenantSlug: currentTenant?.slug,
    isTenantActive: currentTenant?.active,
  };
}

/**
 * Hook que seleciona apenas o tenant atual
 * 
 * Este componente só será re-renderizado se o tenant atual mudar,
 * não se a lista de tenants disponíveis mudar.
 */
export function useCurrentTenant() {
  return useTenantStore(state => state.currentTenant);
}

/**
 * Hook que seleciona apenas o status de loading do tenant
 * 
 * Útil para componentes que precisam mostrar um indicador de carregamento
 * mas não precisam dos dados do tenant em si.
 */
export function useTenantLoading() {
  return useTenantStore(state => state.isLoading);
}

/**
 * Hook que verifica se um tenant específico está ativo
 * 
 * @param tenantId ID do tenant a verificar
 */
export function useTenantActiveStatus(tenantId: string) {
  return useTenantStore(state => {
    const tenant = state.availableTenants.find(t => t.id === tenantId);
    return tenant ? tenant.active : false;
  });
}

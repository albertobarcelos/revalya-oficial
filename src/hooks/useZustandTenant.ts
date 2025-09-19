/**
 * Hook para integração do Zustand com o sistema de tenant existente
 * 
 * Este hook demonstra como podemos migrar gradualmente do sistema baseado em Context
 * para um sistema baseado em Zustand, mantendo a compatibilidade com o código existente.
 */

import { useEffect, useRef } from 'react';
import { useTenantStore } from '@/store/tenantStore';
import { useZustandAuth } from './useZustandAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { throttledDebug, throttledAutoSelect } from '@/utils/logThrottle';

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
  
  // AIDEV-NOTE: Carregar dados do portal automaticamente quando o usuário estiver autenticado
  // Otimizado para evitar múltiplas execuções desnecessárias
  const fetchLockRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Evitar chamadas duplicadas: respeitar isLoading, hasLoaded e um lock local
    if (!userId || !supabase) {
      throttledDebug('tenant_not_authenticated', 'Usuário não autenticado ou supabase não inicializado, não carregando dados do portal');
      return;
    }
    
    // Se o usuário mudou, permitir nova busca
    if (lastUserIdRef.current !== userId) {
      lastUserIdRef.current = userId;
      fetchLockRef.current = false;
    }
    
    if (hasLoaded && lastUserIdRef.current === userId) {
      // Já carregado com sucesso para este usuário, não repetir
      throttledDebug('tenant_already_loaded', 'Dados já carregados para este usuário, pulando fetch');
      return;
    }
    
    if (isLoading || fetchLockRef.current) {
      // Já em progresso
      throttledDebug('tenant_fetch_in_progress', 'Fetch já em progresso, aguardando...');
      return;
    }
    
    throttledDebug('tenant_loading_portal', 'Usuário autenticado, carregando dados do portal (com guard otimizado)');
    fetchLockRef.current = true;
    
    // Pequeno atraso para garantir que a sessão está completamente estabelecida
    setTimeout(() => {
      fetchPortalData(supabase).finally(() => {
        fetchLockRef.current = false;
      });
    }, 150);
  }, [userId, supabase, fetchPortalData, isLoading, hasLoaded]);

  // 🔄 AUTO-SELEÇÃO DE TENANT BASEADA NA URL
  // AIDEV-NOTE: Usar useRef para evitar loop de re-renderização ao trocar tenant
  const lastProcessedSlugRef = useRef<string | null>(null);
  const lastCurrentTenantIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    const urlSlug = window.location.pathname.split('/')[1];
    
    // AIDEV-NOTE: Debug temporário para identificar problema de tenant
    throttledDebug('tenant-url-debug', '[DEBUG] useZustandTenant - URL atual:', window.location.href);
    throttledDebug('tenant-slug-debug', '[DEBUG] useZustandTenant - urlSlug extraído:', urlSlug);
    throttledDebug('tenant-current-debug', '[DEBUG] useZustandTenant - currentTenant:', currentTenant);
    throttledDebug('tenant-available-debug', '[DEBUG] useZustandTenant - availableTenants:', availableTenants);
    throttledDebug('tenant-loaded-debug', '[DEBUG] useZustandTenant - hasLoaded:', hasLoaded);
    
    // Lista de rotas que NÃO são tenants (ignorar auto-seleção)
    const nonTenantRoutes = ['login', 'portal', 'meus-aplicativos', 'admin', 'api', 'auth'];
    
    throttledAutoSelect('auto-select-url', `🔍 [TENANT AUTO-SELECT] URL slug: ${urlSlug}, currentTenant: ${currentTenant?.slug}`);
    throttledAutoSelect('auto-select-status', `🔍 [TENANT AUTO-SELECT] hasLoaded: ${hasLoaded}, availableTenants: ${availableTenants.length}`);
    throttledAutoSelect('auto-select-tenants', `🔍 [TENANT AUTO-SELECT] availableTenants:`, availableTenants.map(t => ({ id: t.id, name: t.name, slug: t.slug, active: t.active })));
    
    // Se o slug é uma rota não-tenant, não tentar auto-seleção
    if (urlSlug && nonTenantRoutes.includes(urlSlug)) {
      throttledAutoSelect('auto-select-skip', `🚫 [TENANT AUTO-SELECT] Slug '${urlSlug}' é uma rota não-tenant, ignorando auto-seleção`);
      return;
    }
    
    // AIDEV-NOTE: Evitar execução desnecessária na página de seleção de portais
    // Só executar auto-seleção se estivermos em uma rota de tenant válida
    if (!urlSlug || !hasLoaded || availableTenants.length === 0) {
      throttledAutoSelect('auto-select-conditions', `🚫 [TENANT AUTO-SELECT] Condições não atendidas: urlSlug=${urlSlug}, hasLoaded=${hasLoaded}, availableTenants=${availableTenants.length}`);
      return;
    }
    
    // AIDEV-NOTE: Evitar loop de re-renderização - só processar se slug ou tenant mudaram
    const currentTenantId = currentTenant?.id || null;
    if (lastProcessedSlugRef.current === urlSlug && lastCurrentTenantIdRef.current === currentTenantId) {
      throttledAutoSelect('auto-select-skip-same', `🔄 [TENANT AUTO-SELECT] Slug e tenant não mudaram, ignorando processamento`);
      return;
    }
    
    // Atualizar refs para controle de mudanças
    lastProcessedSlugRef.current = urlSlug;
    lastCurrentTenantIdRef.current = currentTenantId;
    
    // Se há um slug na URL e dados carregados, mas o tenant atual não corresponde
    if (!currentTenant || currentTenant.slug !== urlSlug) {
      throttledAutoSelect('auto-select-switch', `🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: ${urlSlug}`);
      
      const targetTenant = availableTenants.find(t => t.slug === urlSlug && t.active);
      if (targetTenant) {
        throttledAutoSelect('auto-select-success', `✅ [TENANT AUTO-SELECT] Trocando para tenant: ${targetTenant.name} (${targetTenant.id})`);
        switchTenant(targetTenant.id);
      } else {
        throttledAutoSelect('auto-select-error', `🚨 [TENANT AUTO-SELECT] Tenant com slug '${urlSlug}' não encontrado ou inativo`);
        throttledAutoSelect('auto-select-available', `🚨 [TENANT AUTO-SELECT] Tenants disponíveis:`, availableTenants.map(t => `${t.slug} (${t.active ? 'ativo' : 'inativo'})`));
        
        // 🚨 CORREÇÃO: Se não encontrou o tenant exato, tentar o primeiro tenant ativo disponível
        const firstActiveTenant = availableTenants.find(t => t.active);
        if (firstActiveTenant && !currentTenant) {
          throttledAutoSelect('auto-select-fallback', `🔄 [TENANT AUTO-SELECT] Fallback: usando primeiro tenant ativo: ${firstActiveTenant.name} (${firstActiveTenant.slug})`);
          switchTenant(firstActiveTenant.id);
        }
      }
    } else {
      throttledAutoSelect('auto-select-correct', `✅ [TENANT AUTO-SELECT] Tenant já está correto: ${currentTenant.name} (${currentTenant.slug})`);
    }
  }, [hasLoaded, availableTenants, switchTenant]); // AIDEV-NOTE: Removido currentTenant das dependências para evitar loop
  
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

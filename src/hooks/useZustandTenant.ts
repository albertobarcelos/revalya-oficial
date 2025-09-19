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
  
  // Carregar dados do portal automaticamente quando o usuário estiver autenticado
  const fetchLockRef = useRef(false);
  useEffect(() => {
    // Evitar chamadas duplicadas: respeitar isLoading, hasLoaded e um lock local
    if (!userId || !supabase) {
      console.log('[useZustandTenant] Usuário não autenticado ou supabase não inicializado, não carregando dados do portal');
      return;
    }
    if (hasLoaded) {
      // Já carregado com sucesso, não repetir
      console.log('[useZustandTenant] Dados já carregados, pulando fetch');
      return;
    }
    if (isLoading || fetchLockRef.current) {
      // Já em progresso
      console.log('[useZustandTenant] Fetch já em progresso, aguardando...');
      return;
    }
    console.log('[useZustandTenant] Usuário autenticado, carregando dados do portal (com guard)');
    fetchLockRef.current = true;
    // Pequeno atraso para garantir que a sessão está completamente estabelecida
    setTimeout(() => {
      fetchPortalData(supabase).finally(() => {
        fetchLockRef.current = false;
      });
    }, 150);
  }, [userId, supabase, fetchPortalData, isLoading, hasLoaded]);

  // 🚨 NOVO: Auto-seleção de tenant baseado no slug da URL
  useEffect(() => {
    // Obter slug da URL atual
    const currentPath = window.location.pathname;
    const slugMatch = currentPath.match(/^\/([^\/]+)/);
    const urlSlug = slugMatch ? slugMatch[1] : null;
    
    // Lista de rotas que NÃO são tenants (ignorar auto-seleção)
    const nonTenantRoutes = ['login', 'portal', 'meus-aplicativos', 'admin', 'api', 'auth'];
    
    console.log(`🔍 [TENANT AUTO-SELECT] URL slug: ${urlSlug}, currentTenant: ${currentTenant?.slug}`);
    
    // Se o slug é uma rota não-tenant, não tentar auto-seleção
    if (urlSlug && nonTenantRoutes.includes(urlSlug)) {
      console.log(`🚫 [TENANT AUTO-SELECT] Slug '${urlSlug}' é uma rota não-tenant, ignorando auto-seleção`);
      return;
    }
    
    // Se há um slug na URL e dados carregados, mas o tenant atual não corresponde
    if (urlSlug && hasLoaded && availableTenants.length > 0) {
      if (!currentTenant || currentTenant.slug !== urlSlug) {
        console.log(`🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: ${urlSlug}`);
        
        const targetTenant = availableTenants.find(t => t.slug === urlSlug && t.active);
        if (targetTenant) {
          console.log(`✅ [TENANT AUTO-SELECT] Trocando para tenant: ${targetTenant.name} (${targetTenant.id})`);
          switchTenant(targetTenant.id);
        } else {
          console.error(`🚨 [TENANT AUTO-SELECT] Tenant com slug '${urlSlug}' não encontrado ou inativo`);
        }
      }
    }
  }, [hasLoaded, availableTenants, currentTenant, switchTenant]);
  
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

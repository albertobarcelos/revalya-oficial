/**
 * Hook para validação de acesso a dados específicos
 * 
 * Este hook verifica se o usuário tem acesso ao tenant atual e
 * opcionalmente valida se possui a role necessária.
 */

import { useMemo } from 'react';
import { useZustandTenant } from '@/hooks/useZustandTenant';

/**
 * Hook para validação de acesso a dados específicos
 * Use antes de renderizar componentes sensíveis
 * 
 * @param requiredRole - Role necessária para acessar o recurso (opcional)
 * @returns Objeto com informações de acesso
 */
export function useTenantAccessGuard(requiredRole?: string) {
  const { currentTenant, userRole, isLoading, hasLoaded } = useZustandTenant();
  
  // 🔍 DEBUG: Log detalhado do tenant access guard
  console.log(`🔍 [TENANT ACCESS GUARD] Verificando acesso:`, {
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
    roleMatch: !requiredRole || userRole === requiredRole,
    isLoading,
    hasLoaded
  });
  
  const hasAccess = useMemo(() => {
    // AIDEV-NOTE: Se ainda está carregando, não negar acesso ainda
    if (isLoading || !hasLoaded) {
      console.log(`⏳ [ACCESS PENDING] Aguardando carregamento dos dados do tenant`);
      return null; // Estado pendente
    }
    
    if (!currentTenant?.id) {
      console.log(`🚨 [ACCESS DENIED] Tenant não definido`);
      return false;
    }
    if (!currentTenant.active) {
      console.log(`🚨 [ACCESS DENIED] Tenant inativo: ${currentTenant.name}`);
      return false;
    }
    if (requiredRole && userRole !== requiredRole) {
      console.log(`🚨 [ACCESS DENIED] Permissão insuficiente: required=${requiredRole}, user=${userRole}`);
      return false;
    }
    console.log(`✅ [ACCESS GRANTED] Acesso liberado para tenant: ${currentTenant.name}`);
    return true;
  }, [currentTenant?.id, currentTenant?.active, userRole, requiredRole, isLoading, hasLoaded]);
  
  const accessError = useMemo(() => {
    // AIDEV-NOTE: Se ainda está carregando, não mostrar erro
    if (isLoading || !hasLoaded) return null;
    
    if (!currentTenant?.id) return 'Tenant não definido';
    if (!currentTenant.active) return 'Tenant inativo';
    if (requiredRole && userRole !== requiredRole) return 'Permissão insuficiente';
    return null;
  }, [currentTenant?.id, currentTenant?.active, userRole, requiredRole, isLoading, hasLoaded]);
  
  return { 
    hasAccess, 
    accessError, 
    currentTenant, 
    userRole,
    isLoading: isLoading || !hasLoaded // AIDEV-NOTE: Expor estado de loading
  };
}

export default useTenantAccessGuard;
/**
 * Hook para validação de acesso a dados específicos
 * 
 * Este hook verifica se o usuário tem acesso ao tenant atual e
 * opcionalmente valida se possui a role necessária.
 */

import { useMemo } from 'react';
import { useZustandTenant } from '@/hooks/useZustandTenant';
import { throttledTenantGuard, throttledDebug } from '@/utils/logThrottle';

/**
 * Hook para validação de acesso a dados específicos
 * Use antes de renderizar componentes sensíveis
 * 
 * @param requiredRole - Role necessária para acessar o recurso (opcional)
 * @param requireTenant - Se true, exige tenant definido. Se false, permite acesso global para ADMINs (padrão: true)
 * @returns Objeto com informações de acesso
 */
export function useTenantAccessGuard(requiredRole?: string, requireTenant: boolean = true) {
  const { currentTenant, userRole } = useZustandTenant();
  
  // 🔍 DEBUG: Log detalhado do tenant access guard (com throttling)
  throttledTenantGuard('tenant_access_verification', `🔍 [TENANT ACCESS GUARD] Verificando acesso:`, {
    currentTenant: currentTenant ? {
      id: currentTenant.id,
      name: currentTenant.name,
      slug: currentTenant.slug,
      active: currentTenant.active
    } : null,
    userRole,
    requiredRole,
    requireTenant,
    hasCurrentTenant: !!currentTenant?.id,
    isTenantActive: currentTenant?.active,
    roleMatch: !requiredRole || userRole === requiredRole,
    isGlobalAdminAccess: !requireTenant && userRole === 'ADMIN'
  });
  
  const hasAccess = useMemo(() => {
    // AIDEV-NOTE: Verificação de role primeiro (mais restritiva)
    if (requiredRole && userRole !== requiredRole) {
      throttledTenantGuard('access_denied_role', `🚨 [ACCESS DENIED] Permissão insuficiente: required=${requiredRole}, user=${userRole}`);
      return false;
    }
    
    // AIDEV-NOTE: Se não requer tenant e usuário é ADMIN, permite acesso global
    if (!requireTenant && userRole === 'ADMIN') {
      throttledTenantGuard('access_granted_admin', `✅ [ACCESS GRANTED] Acesso global liberado para ADMIN`);
      return true;
    }
    
    // AIDEV-NOTE: Verificações de tenant (quando necessário)
    if (requireTenant) {
      if (!currentTenant?.id) {
        throttledTenantGuard('access_denied_no_tenant', `🚨 [ACCESS DENIED] Tenant não definido`);
        return false;
      }
      if (!currentTenant.active) {
        throttledTenantGuard('access_denied_inactive', `🚨 [ACCESS DENIED] Tenant inativo: ${currentTenant.name}`);
        return false;
      }
      throttledTenantGuard('access_granted_tenant', `✅ [ACCESS GRANTED] Acesso liberado para tenant: ${currentTenant.name}`);
    }
    
    return true;
  }, [currentTenant?.id, currentTenant?.active, userRole, requiredRole, requireTenant]);
  
  const accessError = useMemo(() => {
    if (requiredRole && userRole !== requiredRole) return 'Permissão insuficiente';
    if (!requireTenant && userRole === 'ADMIN') return null; // Acesso global para ADMIN
    if (requireTenant && !currentTenant?.id) return 'Tenant não definido';
    if (requireTenant && !currentTenant.active) return 'Tenant inativo';
    return null;
  }, [currentTenant?.id, currentTenant?.active, userRole, requiredRole, requireTenant]);
  
  return { hasAccess, accessError, currentTenant, userRole };
}

export default useTenantAccessGuard;
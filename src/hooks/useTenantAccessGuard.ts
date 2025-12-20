/**
 * Hook para validação de acesso a dados específicos
 * 
 * Este hook verifica se o usuário tem acesso ao tenant atual e
 * opcionalmente valida se possui a role necessária.
 */

import { useMemo } from 'react';
import { useZustandTenant } from '@/hooks/useZustandTenant';
import { throttledTenantGuard } from '@/utils/logThrottle';

/**
 * Hook para validação de acesso a dados específicos
 * Use antes de renderizar componentes sensíveis
 * 
 * @param requiredRole - Role necessária para acessar o recurso (opcional)
 * @param requireTenant - Se true, exige tenant definido. Se false, permite acesso global para ADMINs (padrão: true)
 * @returns Objeto com informações de acesso
 */
export function useTenantAccessGuard(requiredRole?: string, requireTenant: boolean = true) {
  const { currentTenant, userRole, isLoading } = useZustandTenant();
  
  // AIDEV-NOTE: Log throttled para evitar spam - apenas quando há mudanças significativas
  const logKey = `${currentTenant?.id || 'no-tenant'}_${userRole}_${requiredRole || 'no-role'}`;
  throttledTenantGuard(logKey, `🔍 [TENANT ACCESS GUARD] Verificando acesso`, {
    hasTenant: !!currentTenant?.id,
    userRole,
    requiredRole
  });
  
  const hasAccess = useMemo(() => {
    // AIDEV-NOTE: Verificação de role primeiro (mais restritiva)
    if (requiredRole && userRole !== requiredRole) {
      return false;
    }
    
    // AIDEV-NOTE: Se não requer tenant e usuário é ADMIN, permite acesso global
    if (!requireTenant && userRole === 'ADMIN') {
      return true;
    }
    
    // AIDEV-NOTE: Verificações de tenant (quando necessário)
    if (requireTenant) {
      if (!currentTenant?.id) {
        return false;
      }
      if (!currentTenant.active) {
        return false;
      }
    }
    
    return true;
  }, [currentTenant?.id, currentTenant?.active, currentTenant?.name, userRole, requiredRole, requireTenant]);
  
  const accessError = useMemo(() => {
    if (requiredRole && userRole !== requiredRole) return 'Permissão insuficiente';
    if (!requireTenant && userRole === 'ADMIN') return null; // Acesso global para ADMIN
    if (requireTenant && !currentTenant?.id) return 'Tenant não definido';
    if (requireTenant && !currentTenant.active) return 'Tenant inativo';
    return null;
  }, [currentTenant?.id, currentTenant?.active, userRole, requiredRole, requireTenant]);
  
  return { hasAccess, accessError, currentTenant, userRole, isLoading };
}

export default useTenantAccessGuard;
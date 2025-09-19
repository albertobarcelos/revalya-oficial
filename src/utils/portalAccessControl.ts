/**
 * Utilitário para controle de acesso baseado em portal e tenant
 * 
 * Funções auxiliares para verificar permissões de usuários em diferentes contextos
 * como admin, reseller e tenant.
 */

import { PortalType } from '@/types/portal';

/**
 * Verifica se o usuário tem papel de admin
 */
export function isAdmin(userRoles: string[]): boolean {
  return userRoles.includes('ADMIN');
}

/**
 * Verifica se o usuário tem papel de reseller
 */
export function isReseller(userRoles: string[]): boolean {
  return userRoles.includes('RESELLER');
}

/**
 * Verifica se o usuário tem acesso a um portal específico
 */
export function hasPortalAccess(portalType: PortalType, userRoles: string[]): boolean {
  switch (portalType) {
    case 'admin':
      return isAdmin(userRoles);
    case 'reseller':
      return isReseller(userRoles);
    case 'tenant':
      return true; // Qualquer usuário pode acessar tenant (a verificação específica é feita pelo TenantGuard)
    default:
      return false;
  }
}

/**
 * Verifica se o usuário tem acesso a múltiplos portais
 */
export function hasMultiPortalAccess(userRoles: string[]): boolean {
  // Usuário tem acesso a múltiplos portais se for admin ou reseller
  return isAdmin(userRoles) || isReseller(userRoles);
}

/**
 * Determina o tipo de portal padrão para o usuário
 */
export function getDefaultPortalType(userRoles: string[]): PortalType {
  if (isAdmin(userRoles)) {
    return 'admin';
  }
  
  if (isReseller(userRoles)) {
    return 'reseller';
  }
  
  return 'tenant';
}

/**
 * Verifica se o usuário tem permissão para uma operação específica em um tenant
 */
export function hasTenantPermission(
  action: 'view' | 'edit' | 'delete' | 'manage_users',
  userRole: string
): boolean {
  // Permissões para diferentes papéis
  const rolePermissions: Record<string, string[]> = {
    'ADMIN': ['view', 'edit', 'delete', 'manage_users'],
    'USER': ['view', 'edit'],
    'VIEWER': ['view'],
  };
  
  // Verificar se o papel existe e tem a permissão
  return !!rolePermissions[userRole]?.includes(action);
}

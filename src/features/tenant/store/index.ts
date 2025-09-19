// Exporta todos os componentes do módulo de tenant simplificado
import { simpleTenantManager } from './tenantManager';

// Exporta o Manager
export { simpleTenantManager } from './tenantManager';

// Funções auxiliares
// Funções para gerenciamento de tenants
export { 
  loadUserTenants, 
  hasUserAccessToTenant, 
  withActiveTenant 
} from './utils';

// Função para alternar tenant usando o slug
export async function switchTenantBySlug(slug: string) {
  return await simpleTenantManager.switchTenantBySlug(slug);
}

// Hook
export { useSimpleTenantManager } from './tenantManager';

// Provider
export { TenantProvider, useTenant } from '@/core/tenant/UnifiedTenantProvider';

// Types
export * from './types';

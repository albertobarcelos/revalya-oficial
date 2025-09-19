/**
 * AIDEV-NOTE: Exportações centralizadas para o módulo de tenant
 * 
 * MIGRADO PARA NOVA ARQUITETURA: src/core/tenant/
 * Este arquivo mantém compatibilidade temporária redirecionando para nova arquitetura.
 * 
 * @file index.ts
 * @module features/tenant
 */

// Re-exportar da nova arquitetura em src/core/tenant/
export { 
  TenantProvider
} from '@/core/tenant/TenantProvider';

export type {
  SimpleTenant,
  TenantContext,
  TenantUserRole,
  TenantResult
} from '@/core/tenant/models';

// Hook principal para uso na aplicação
export { useTenantContext } from '@/hooks/useTenantContext';

// DEPRECATED: Compatibilidade temporária - usar useTenantContext
export { useTenantContext as useTenant } from '@/hooks/useTenantContext';

// Exportação padrão vazia para compatibilidade
export default {};

/**
 * Índice unificado para o sistema de tenant
 * 
 * Exporta todas as funcionalidades do sistema de tenant,
 * incluindo o provider unificado e utilitários de migração.
 */

// Provider unificado (FASE 2)
export { 
  UnifiedTenantProvider,
  useUnifiedTenant,
  useTenant,
  useTenantFeatures
} from './UnifiedTenantProvider';

// Providers originais (compatibilidade)
export { TenantProvider as CoreTenantProvider } from './TenantProvider';

// Tipos unificados
export type { 
  UnifiedTenantConfig,
  MigrationState,
  ProviderMetrics,
  MIGRATION_CONFIGS
} from './types';

// Utilitários de migração
export { 
  TenantMigrationManager,
  useMigrationManager,
  withMigrationTracking,
  validateApiCompatibility
} from './migration-utils';

// Re-exportar tipos e modelos existentes
export type { 
  SimpleTenant, 
  TenantContext, 
  TenantUserRole, 
  TenantResult 
} from './models';

export { TenantService, tenantService } from './TenantService';

// Hook de dados do tenant
export { useTenantData } from './useTenantData';

/**
 * Configuração padrão para FASE 2
 * Todas as implementações ativas para compatibilidade máxima
 */
export const PHASE2_CONFIG = {
  useCore: true,
  useFeatures: true,
  useZustand: true,
  migrationMode: 'hybrid' as const,
  enableDebugLogs: true,
};

/**
 * Hook para facilitar a migração gradual
 */
export function useTenantMigration() {
  const migrationManager = useMigrationManager();
  
  return {
    markMigrated: migrationManager.markFileMigrated.bind(migrationManager),
    recordError: migrationManager.recordMigrationError.bind(migrationManager),
    getState: migrationManager.getMigrationState.bind(migrationManager),
    getMetrics: migrationManager.getMetrics.bind(migrationManager),
    generateReport: migrationManager.generateMigrationReport.bind(migrationManager),
  };
}

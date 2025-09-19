/**
 * Tipos unificados para o sistema de tenant
 * 
 * Consolida os tipos das diferentes implementações existentes
 * para garantir compatibilidade durante a migração.
 */

// Re-exportar tipos existentes do core
export type { SimpleTenant, TenantContext, TenantUserRole, TenantResult } from './models';

// Re-exportar tipos do features
export type { UserTenantResponse } from '@/features/tenant/store/types';

/**
 * Configuração para o provider unificado
 */
export interface UnifiedTenantConfig {
  /** Usar implementação do Core TenantProvider */
  useCore: boolean;
  
  /** Usar implementação do Features TenantProvider */
  useFeatures: boolean;
  
  /** Usar integração com Zustand */
  useZustand: boolean;
  
  /** Modo de migração ativo */
  migrationMode: 'legacy' | 'hybrid' | 'unified';
  
  /** Logs de debug habilitados */
  enableDebugLogs: boolean;
}

/**
 * Configuração padrão para diferentes fases da migração
 */
export const MIGRATION_CONFIGS: Record<string, UnifiedTenantConfig> = {
  // FASE 2: Provider híbrido com todas as implementações ativas
  phase2: {
    useCore: true,
    useFeatures: true,
    useZustand: true,
    migrationMode: 'hybrid',
    enableDebugLogs: true,
  },
  
  // FASE 3: Migração gradual - priorizando unificado
  phase3: {
    useCore: true,
    useFeatures: false,
    useZustand: true,
    migrationMode: 'unified',
    enableDebugLogs: true,
  },
  
  // FASE 5: Implementação final - apenas unificado
  final: {
    useCore: false,
    useFeatures: false,
    useZustand: true,
    migrationMode: 'unified',
    enableDebugLogs: false,
  },
};

/**
 * Estado de migração do sistema
 */
export interface MigrationState {
  /** Fase atual da migração */
  currentPhase: 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5';
  
  /** Arquivos migrados */
  migratedFiles: string[];
  
  /** Arquivos pendentes */
  pendingFiles: string[];
  
  /** Erros encontrados durante migração */
  migrationErrors: Array<{
    file: string;
    error: string;
    timestamp: string;
  }>;
  
  /** Validações de compatibilidade */
  compatibilityChecks: Array<{
    check: string;
    passed: boolean;
    details?: string;
  }>;
}

/**
 * Métricas de performance do provider unificado
 */
export interface ProviderMetrics {
  /** Tempo de inicialização */
  initializationTime: number;
  
  /** Número de re-renderizações */
  rerenderCount: number;
  
  /** Tempo médio de troca de tenant */
  averageSwitchTime: number;
  
  /** Erros de sincronização */
  syncErrors: number;
  
  /** Uso de memória estimado */
  memoryUsage: number;
}

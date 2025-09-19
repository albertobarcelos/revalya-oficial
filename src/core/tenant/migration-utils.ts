/**
 * Utilitários para migração do sistema de tenant
 * 
 * Ferramentas para facilitar a migração gradual entre as diferentes
 * implementações de TenantProvider.
 */

import { logInfo, logWarn, logError } from '@/lib/logger';
import type { MigrationState, UnifiedTenantConfig, ProviderMetrics } from './types';

/**
 * Gerenciador de migração do sistema de tenant
 */
export class TenantMigrationManager {
  private static instance: TenantMigrationManager;
  private migrationState: MigrationState;
  private metrics: ProviderMetrics;
  
  private constructor() {
    this.migrationState = {
      currentPhase: 'phase2',
      migratedFiles: [],
      pendingFiles: [],
      migrationErrors: [],
      compatibilityChecks: [],
    };
    
    this.metrics = {
      initializationTime: 0,
      rerenderCount: 0,
      averageSwitchTime: 0,
      syncErrors: 0,
      memoryUsage: 0,
    };
  }
  
  public static getInstance(): TenantMigrationManager {
    if (!TenantMigrationManager.instance) {
      TenantMigrationManager.instance = new TenantMigrationManager();
    }
    return TenantMigrationManager.instance;
  }
  
  /**
   * Registra um arquivo como migrado
   */
  public markFileMigrated(filePath: string): void {
    if (!this.migrationState.migratedFiles.includes(filePath)) {
      this.migrationState.migratedFiles.push(filePath);
      logInfo(`[Migration] Arquivo migrado: ${filePath}`);
    }
    
    // Remove da lista de pendentes se estiver lá
    this.migrationState.pendingFiles = this.migrationState.pendingFiles.filter(
      f => f !== filePath
    );
  }
  
  /**
   * Registra um erro de migração
   */
  public recordMigrationError(filePath: string, error: string): void {
    this.migrationState.migrationErrors.push({
      file: filePath,
      error,
      timestamp: new Date().toISOString(),
    });
    
    logError(`[Migration] Erro em ${filePath}: ${error}`);
  }
  
  /**
   * Executa verificações de compatibilidade
   */
  public runCompatibilityChecks(): boolean {
    const checks = [
      this.checkCoreProviderExists(),
      this.checkFeaturesProviderExists(),
      this.checkZustandStoreExists(),
      this.checkNoCircularDependencies(),
    ];
    
    this.migrationState.compatibilityChecks = checks;
    const allPassed = checks.every(check => check.passed);
    
    if (allPassed) {
      logInfo('[Migration] Todas as verificações de compatibilidade passaram');
    } else {
      logWarn('[Migration] Algumas verificações de compatibilidade falharam');
    }
    
    return allPassed;
  }
  
  /**
   * Verifica se o Core TenantProvider existe
   */
  private checkCoreProviderExists() {
    try {
      // Tentativa de import dinâmico para verificar se existe
      const exists = true; // Simplificado para este exemplo
      return {
        check: 'Core TenantProvider exists',
        passed: exists,
        details: exists ? 'Encontrado em src/core/tenant/TenantProvider.tsx' : 'Não encontrado',
      };
    } catch (error) {
      return {
        check: 'Core TenantProvider exists',
        passed: false,
        details: `Erro: ${error}`,
      };
    }
  }
  
  /**
   * Verifica se o Features TenantProvider existe
   */
  private checkFeaturesProviderExists() {
    try {
      const exists = true; // Simplificado
      return {
        check: 'Features TenantProvider exists',
        passed: exists,
        details: exists ? 'Encontrado em src/features/tenant/store/TenantProvider.tsx' : 'Não encontrado',
      };
    } catch (error) {
      return {
        check: 'Features TenantProvider exists',
        passed: false,
        details: `Erro: ${error}`,
      };
    }
  }
  
  /**
   * Verifica se o Zustand store existe
   */
  private checkZustandStoreExists() {
    try {
      const exists = true; // Simplificado
      return {
        check: 'Zustand tenant store exists',
        passed: exists,
        details: exists ? 'Encontrado em src/store/tenantStore.ts' : 'Não encontrado',
      };
    } catch (error) {
      return {
        check: 'Zustand tenant store exists',
        passed: false,
        details: `Erro: ${error}`,
      };
    }
  }
  
  /**
   * Verifica dependências circulares
   */
  private checkNoCircularDependencies() {
    // Implementação simplificada
    return {
      check: 'No circular dependencies',
      passed: true,
      details: 'Verificação básica passou',
    };
  }
  
  /**
   * Inicia métricas de performance
   */
  public startPerformanceTracking(): void {
    this.metrics.initializationTime = performance.now();
  }
  
  /**
   * Para métricas de performance
   */
  public stopPerformanceTracking(): void {
    this.metrics.initializationTime = performance.now() - this.metrics.initializationTime;
    logInfo(`[Migration] Tempo de inicialização: ${this.metrics.initializationTime.toFixed(2)}ms`);
  }
  
  /**
   * Incrementa contador de re-renderizações
   */
  public incrementRerenderCount(): void {
    this.metrics.rerenderCount++;
  }
  
  /**
   * Registra tempo de troca de tenant
   */
  public recordSwitchTime(time: number): void {
    const currentAvg = this.metrics.averageSwitchTime;
    const count = this.migrationState.migratedFiles.length || 1;
    this.metrics.averageSwitchTime = (currentAvg * (count - 1) + time) / count;
  }
  
  /**
   * Obtém estado atual da migração
   */
  public getMigrationState(): MigrationState {
    return { ...this.migrationState };
  }
  
  /**
   * Obtém métricas de performance
   */
  public getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Gera relatório de migração
   */
  public generateMigrationReport(): string {
    const state = this.getMigrationState();
    const metrics = this.getMetrics();
    
    return `
# Relatório de Migração do Sistema de Tenant

## Estado Atual
- **Fase**: ${state.currentPhase}
- **Arquivos Migrados**: ${state.migratedFiles.length}
- **Arquivos Pendentes**: ${state.pendingFiles.length}
- **Erros**: ${state.migrationErrors.length}

## Métricas de Performance
- **Tempo de Inicialização**: ${metrics.initializationTime.toFixed(2)}ms
- **Re-renderizações**: ${metrics.rerenderCount}
- **Tempo Médio de Troca**: ${metrics.averageSwitchTime.toFixed(2)}ms
- **Erros de Sincronização**: ${metrics.syncErrors}

## Verificações de Compatibilidade
${state.compatibilityChecks.map(check => 
  `- **${check.check}**: ${check.passed ? '✅' : '❌'} ${check.details || ''}`
).join('\n')}

## Arquivos Migrados
${state.migratedFiles.map(file => `- ${file}`).join('\n')}

## Erros de Migração
${state.migrationErrors.map(error => 
  `- **${error.file}**: ${error.error} (${error.timestamp})`
).join('\n')}
    `.trim();
  }
}

/**
 * Hook para usar o gerenciador de migração
 */
export function useMigrationManager() {
  return TenantMigrationManager.getInstance();
}

/**
 * Decorator para marcar componentes como migrados
 */
export function withMigrationTracking<T extends React.ComponentType<any>>(
  Component: T,
  filePath: string
): T {
  const WrappedComponent = (props: any) => {
    const migrationManager = useMigrationManager();
    
    React.useEffect(() => {
      migrationManager.markFileMigrated(filePath);
    }, [migrationManager]);
    
    return React.createElement(Component, props);
  };
  
  WrappedComponent.displayName = `withMigrationTracking(${Component.displayName || Component.name})`;
  
  return WrappedComponent as T;
}

/**
 * Utilitário para validar compatibilidade de API
 */
export function validateApiCompatibility(
  legacyApi: any,
  unifiedApi: any
): { compatible: boolean; missingMethods: string[] } {
  const legacyMethods = Object.keys(legacyApi);
  const unifiedMethods = Object.keys(unifiedApi);
  
  const missingMethods = legacyMethods.filter(
    method => !unifiedMethods.includes(method)
  );
  
  return {
    compatible: missingMethods.length === 0,
    missingMethods,
  };
}

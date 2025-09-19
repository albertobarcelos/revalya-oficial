/**
 * Hook para executar migração da arquitetura de tenant
 * 
 * Este hook executa a migração para a nova arquitetura de tenant
 * garantindo que seja executada apenas uma vez por sessão.
 */

import { useState, useEffect } from 'react';
import migrateTenantArchitecture from '@/scripts/migrateTenantArchitecture';

/**
 * Hook para executar migração da arquitetura de tenant
 * @returns Objeto com estado da migração
 */
export function useMigrateTenantArchitecture() {
  const [hasMigrated, setHasMigrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<any>(null);
  
  const runMigration = async () => {
    // Verificar se já migrou
    if (sessionStorage.getItem('app.migration.tenant-architecture') === 'true') {
      setHasMigrated(true);
      return;
    }
    
    setIsLoading(true);
    try {
      const migrationResult = await migrateTenantArchitecture();
      setResult(migrationResult);
      
      if (migrationResult.success) {
        sessionStorage.setItem('app.migration.tenant-architecture', 'true');
        setHasMigrated(true);
      } else {
        throw new Error(migrationResult.message || 'Falha na migração');
      }
    } catch (err) {
      console.error('Erro ao executar migração:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Verificar se já migrou
    const migrationDone = sessionStorage.getItem('app.migration.tenant-architecture') === 'true';
    setHasMigrated(migrationDone);
    
    // Tentar migrar automaticamente no carregamento do componente
    if (!migrationDone) {
      runMigration();
    }
  }, []);
  
  return {
    hasMigrated,
    isLoading,
    error,
    result,
    runMigration
  };
}

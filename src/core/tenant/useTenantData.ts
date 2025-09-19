/**
 * Hook para dados específicos de tenant
 * 
 * Este hook:
 * - Aplica automaticamente o filtro de tenant
 * - Define o contexto de tenant no banco
 * - Registra acessos nos logs de auditoria
 * - Usa cache para otimizar consultas
 * - Inclui estado de loading e erro
 * 
 * @module useTenantData
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from './TenantProvider';
import { useAuth } from '../auth/AuthProvider';
import { securityMiddleware, OperationType } from '../security/SecurityMiddleware';
import { globalCache } from '../cache/CacheSystem';
import { logError, logDebug } from '@/lib/logger';

/**
 * Opções para o hook useTenantData
 */
export interface UseTenantDataOptions<T> {
  /** Nome do recurso para logs de auditoria */
  resourceName: string;
  
  /** Chave para cache (usa resourceName se não especificada) */
  cacheKey?: string;
  
  /** Tempo de vida do cache em milissegundos */
  cacheTTL?: number;
  
  /** Se deve usar cache */
  enableCache?: boolean;
  
  /** Se deve aplicar filtro de tenant automaticamente */
  applyTenantFilter?: boolean;
  
  /** Se deve definir contexto de tenant no banco */
  setTenantContext?: boolean;
  
  /** Se deve registrar acesso nos logs de auditoria */
  logAccess?: boolean;
  
  /** Operação para logs de auditoria */
  operation?: OperationType;
  
  /** Função para transformar os dados após a consulta */
  transformData?: (data: any) => T;
  
  /** Dependências para refazer a consulta quando mudarem */
  deps?: any[];
}

/**
 * Hook para dados específicos de tenant
 * 
 * @param queryFn Função que executa a consulta ao banco
 * @param options Opções de configuração
 * @returns Dados, estado de loading e erro, e função para refazer a consulta
 */
export function useTenantData<T>(
  queryFn: () => Promise<{ data: any, error: any }>,
  options: UseTenantDataOptions<T>
) {
  // Obter contextos necessários
  const { tenant } = useTenant();
  const { user } = useAuth();
  
  // Estados
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Opções com valores padrão
  const {
    resourceName,
    cacheKey = resourceName,
    cacheTTL = 300000, // 5 minutos
    enableCache = true,
    applyTenantFilter = true,
    setTenantContext = true,
    logAccess = true,
    operation = OperationType.READ,
    transformData = (data: any) => data as T,
    deps = []
  } = options;
  
  // Função para executar a consulta
  const executeQuery = useCallback(async (skipCache = false) => {
    // Se não tem tenant ou usuário, não fazer nada
    if (!tenant || !user) {
      setData(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Chave de cache específica para o tenant atual
      const tenantCacheKey = `${cacheKey}_${tenant.id}`;
      
      // Verificar cache se habilitado e não estiver pulando
      if (enableCache && !skipCache) {
        const cachedData = await globalCache.get<T>(tenantCacheKey);
        
        if (cachedData !== null) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }
      
      // Definir contexto de tenant no banco se necessário
      if (setTenantContext) {
        await securityMiddleware.applyTenantContext(tenant.id, user.id);
      }
      
      // Executar consulta
      const { data: queryData, error: queryError } = await queryFn();
      
      if (queryError) {
        throw new Error(queryError.message || 'Erro ao consultar dados');
      }
      
      // Transformar dados se necessário
      const transformedData = transformData(queryData);
      
      // Salvar no cache se habilitado
      if (enableCache) {
        globalCache.set(tenantCacheKey, transformedData, { ttl: cacheTTL });
      }
      
      // Registrar acesso se necessário
      if (logAccess) {
        await securityMiddleware.logResourceAccess(resourceName, operation, {
          tenant_id: tenant.id,
          user_id: user.id
        });
      }
      
      setData(transformedData);
      setLoading(false);
    } catch (err: any) {
      const errorObj = new Error(err.message || 'Erro desconhecido ao consultar dados');
      
      logError(`[useTenantData] Erro ao consultar ${resourceName}:`, err);
      
      setError(errorObj);
      setLoading(false);
      setData(null);
    }
  }, [
    tenant, 
    user, 
    cacheKey, 
    enableCache, 
    setTenantContext, 
    queryFn, 
    resourceName, 
    logAccess,
    operation,
    transformData,
    cacheTTL,
    ...deps
  ]);
  
  // Invalidar cache para o recurso atual
  const invalidateCache = useCallback(() => {
    if (tenant) {
      const tenantCacheKey = `${cacheKey}_${tenant.id}`;
      globalCache.remove(tenantCacheKey);
      
      logDebug(`[useTenantData] Cache invalidado para ${tenantCacheKey}`);
    }
  }, [tenant, cacheKey]);
  
  // Recarregar dados
  const refresh = useCallback(async () => {
    await executeQuery(true);
  }, [executeQuery]);
  
  // Efeito para executar a consulta quando as dependências mudarem
  useEffect(() => {
    executeQuery();
  }, [executeQuery]);
  
  return {
    data,
    loading,
    error,
    refresh,
    invalidateCache
  };
}

/**
 * Versão do hook para operações de mutação (create, update, delete)
 */
export function useTenantMutation<T, P = any>(
  mutationFn: (params: P) => Promise<{ data: any, error: any }>,
  options: Omit<UseTenantDataOptions<T>, 'cacheKey' | 'cacheTTL' | 'enableCache'> & {
    /** Chaves de cache a invalidar após a mutação */
    invalidateKeys?: string[];
  }
) {
  // Obter contextos necessários
  const { tenant } = useTenant();
  const { user } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<T | null>(null);
  
  // Opções com valores padrão
  const {
    resourceName,
    applyTenantFilter = true,
    setTenantContext = true,
    logAccess = true,
    operation = OperationType.WRITE,
    transformData = (data: any) => data as T,
    invalidateKeys = []
  } = options;
  
  // Função para executar a mutação
  const mutate = useCallback(async (params: P) => {
    // Se não tem tenant ou usuário, não fazer nada
    if (!tenant || !user) {
      throw new Error('Nenhum tenant selecionado');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Definir contexto de tenant no banco se necessário
      if (setTenantContext) {
        await securityMiddleware.applyTenantContext(tenant.id, user.id);
      }
      
      // Executar mutação
      const { data: mutationData, error: mutationError } = await mutationFn(params);
      
      if (mutationError) {
        throw new Error(mutationError.message || 'Erro ao executar operação');
      }
      
      // Transformar dados se necessário
      const transformedData = transformData(mutationData);
      
      // Registrar acesso se necessário
      if (logAccess) {
        await securityMiddleware.logResourceAccess(resourceName, operation, {
          tenant_id: tenant.id,
          user_id: user.id,
          operation_details: params
        });
      }
      
      // Invalidar caches especificados
      if (invalidateKeys.length > 0) {
        invalidateKeys.forEach(key => {
          const tenantCacheKey = `${key}_${tenant.id}`;
          globalCache.remove(tenantCacheKey);
          
          logDebug(`[useTenantMutation] Cache invalidado para ${tenantCacheKey}`);
        });
      }
      
      setResult(transformedData);
      setLoading(false);
      
      return transformedData;
    } catch (err: any) {
      const errorObj = new Error(err.message || 'Erro desconhecido ao executar operação');
      
      logError(`[useTenantMutation] Erro ao executar operação em ${resourceName}:`, err);
      
      setError(errorObj);
      setLoading(false);
      
      throw errorObj;
    }
  }, [
    tenant, 
    user, 
    setTenantContext, 
    mutationFn, 
    resourceName, 
    logAccess,
    operation,
    transformData,
    invalidateKeys
  ]);
  
  return {
    mutate,
    loading,
    error,
    result,
    reset: () => {
      setError(null);
      setResult(null);
    }
  };
}

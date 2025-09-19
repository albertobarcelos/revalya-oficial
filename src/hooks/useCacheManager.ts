import { useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppInitialization } from '../contexts/AppInitializationContext';

interface CacheEntry {
  data: any;
  timestamp: number;
  version: number;
  isStale: boolean;
}

interface CacheManagerOptions {
  defaultTTL?: number; // Time to live em ms
  maxEntries?: number;
  enablePersistence?: boolean;
}

/**
 * Hook para gerenciamento robusto de cache que resiste a mudanças de visibilidade
 * e problemas de sincronização
 */
export function useCacheManager(options: CacheManagerOptions = {}) {
  const {
    defaultTTL = 5 * 60 * 1000, // 5 minutos
    maxEntries = 100,
    enablePersistence = true
  } = options;
  
  const queryClient = useQueryClient();
  const { isPageReactivating } = useAppInitialization();
  
  // Cache em memória
  const memoryCache = useRef<Map<string, CacheEntry>>(new Map());
  const cacheVersion = useRef(1);
  const lastCleanup = useRef(Date.now());
  const cleanupInterval = 60000; // 1 minuto
  
  /**
   * Gera uma chave de cache única
   */
  const generateCacheKey = useCallback((key: string, params?: Record<string, any>) => {
    if (!params) return key;
    
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return `${key}:${JSON.stringify(sortedParams)}`;
  }, []);
  
  /**
   * Salva dados no localStorage de forma segura
   */
  const saveToLocalStorage = useCallback((key: string, data: CacheEntry) => {
    if (!enablePersistence) return;
    
    try {
      const storageKey = `cache:${key}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[CacheManager] Erro ao salvar no localStorage:', error);
      }
    }
  }, [enablePersistence]);
  
  /**
   * Carrega dados do localStorage de forma segura
   */
  const loadFromLocalStorage = useCallback((key: string): CacheEntry | null => {
    if (!enablePersistence) return null;
    
    try {
      const storageKey = `cache:${key}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) return null;
      
      const parsed = JSON.parse(stored) as CacheEntry;
      
      // Verificar se não expirou
      if (Date.now() - parsed.timestamp > defaultTTL) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      return parsed;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[CacheManager] Erro ao carregar do localStorage:', error);
      }
      return null;
    }
  }, [enablePersistence, defaultTTL]);
  
  /**
   * Limpa entradas expiradas do cache
   */
  const cleanupExpiredEntries = useCallback(() => {
    const now = Date.now();
    
    // Limpar cache em memória
    for (const [key, entry] of memoryCache.current.entries()) {
      if (now - entry.timestamp > defaultTTL) {
        memoryCache.current.delete(key);
        
        // Limpar também do localStorage
        if (enablePersistence) {
          try {
            localStorage.removeItem(`cache:${key}`);
          } catch (error) {
            // Ignorar erros de localStorage
          }
        }
      }
    }
    
    // Limitar número de entradas
    if (memoryCache.current.size > maxEntries) {
      const entries = Array.from(memoryCache.current.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, entries.length - maxEntries);
      
      toRemove.forEach(([key]) => {
        memoryCache.current.delete(key);
        if (enablePersistence) {
          try {
            localStorage.removeItem(`cache:${key}`);
          } catch (error) {
            // Ignorar erros de localStorage
          }
        }
      });
    }
    
    lastCleanup.current = now;
  }, [defaultTTL, maxEntries, enablePersistence]);
  
  /**
   * Define dados no cache
   */
  const setCache = useCallback((key: string, data: any, params?: Record<string, any>, ttl?: number) => {
    const cacheKey = generateCacheKey(key, params);
    const now = Date.now();
    
    const entry: CacheEntry = {
      data,
      timestamp: now,
      version: cacheVersion.current,
      isStale: false
    };
    
    // Salvar em memória
    memoryCache.current.set(cacheKey, entry);
    
    // Salvar no localStorage
    saveToLocalStorage(cacheKey, entry);
    
    // Cleanup periódico
    if (now - lastCleanup.current > cleanupInterval) {
      cleanupExpiredEntries();
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CacheManager] Cache definido para: ${cacheKey}`);
    }
  }, [generateCacheKey, saveToLocalStorage, cleanupExpiredEntries]);
  
  /**
   * Obtém dados do cache
   */
  const getCache = useCallback((key: string, params?: Record<string, any>): any | null => {
    const cacheKey = generateCacheKey(key, params);
    
    // Tentar cache em memória primeiro
    let entry = memoryCache.current.get(cacheKey);
    
    // Se não encontrou em memória, tentar localStorage
    if (!entry) {
      entry = loadFromLocalStorage(cacheKey);
      
      // Se encontrou no localStorage, restaurar para memória
      if (entry) {
        memoryCache.current.set(cacheKey, entry);
      }
    }
    
    if (!entry) return null;
    
    // Verificar se expirou
    const now = Date.now();
    if (now - entry.timestamp > defaultTTL) {
      memoryCache.current.delete(cacheKey);
      if (enablePersistence) {
        try {
          localStorage.removeItem(`cache:${cacheKey}`);
        } catch (error) {
          // Ignorar erros
        }
      }
      return null;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CacheManager] Cache encontrado para: ${cacheKey}`);
    }
    
    return entry.data;
  }, [generateCacheKey, loadFromLocalStorage, defaultTTL, enablePersistence]);
  
  /**
   * Marca uma entrada como stale (obsoleta) sem removê-la
   */
  const markAsStale = useCallback((key: string, params?: Record<string, any>) => {
    const cacheKey = generateCacheKey(key, params);
    const entry = memoryCache.current.get(cacheKey);
    
    if (entry) {
      entry.isStale = true;
      memoryCache.current.set(cacheKey, entry);
      saveToLocalStorage(cacheKey, entry);
    }
  }, [generateCacheKey, saveToLocalStorage]);
  
  /**
   * Remove uma entrada específica do cache
   */
  const removeCache = useCallback((key: string, params?: Record<string, any>) => {
    const cacheKey = generateCacheKey(key, params);
    
    memoryCache.current.delete(cacheKey);
    
    if (enablePersistence) {
      try {
        localStorage.removeItem(`cache:${cacheKey}`);
      } catch (error) {
        // Ignorar erros
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CacheManager] Cache removido para: ${cacheKey}`);
    }
  }, [generateCacheKey, enablePersistence]);
  
  /**
   * Limpa todo o cache
   */
  const clearCache = useCallback((pattern?: string) => {
    if (pattern) {
      // Limpar apenas entradas que correspondem ao padrão
      const regex = new RegExp(pattern);
      
      for (const key of memoryCache.current.keys()) {
        if (regex.test(key)) {
          memoryCache.current.delete(key);
          
          if (enablePersistence) {
            try {
              localStorage.removeItem(`cache:${key}`);
            } catch (error) {
              // Ignorar erros
            }
          }
        }
      }
    } else {
      // Limpar todo o cache
      memoryCache.current.clear();
      
      if (enablePersistence) {
        try {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('cache:')) {
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          // Ignorar erros
        }
      }
    }
    
    // Incrementar versão do cache
    cacheVersion.current++;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CacheManager] Cache limpo${pattern ? ` (padrão: ${pattern})` : ''}`);
    }
  }, [enablePersistence]);
  
  /**
   * Invalida caches críticos durante reativação da página
   */
  const invalidateCriticalCaches = useCallback(() => {
    // Padrões de cache que devem ser invalidados durante reativação
    const criticalPatterns = [
      'notifications',
      'user-session',
      'tenant-access',
      'portal-config'
    ];
    
    criticalPatterns.forEach(pattern => {
      clearCache(pattern);
    });
    
    // Também invalidar queries do React Query relacionadas
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey[0] as string;
        return criticalPatterns.some(pattern => queryKey?.includes(pattern));
      }
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[CacheManager] Caches críticos invalidados');
    }
  }, [clearCache, queryClient]);
  
  /**
   * Invalida caches críticos quando a página é reativada
   */
  useEffect(() => {
    if (isPageReactivating) {
      // Delay pequeno para evitar conflitos
      const timeout = setTimeout(() => {
        invalidateCriticalCaches();
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [isPageReactivating, invalidateCriticalCaches]);
  
  /**
   * Cleanup periódico
   */
  useEffect(() => {
    const interval = setInterval(cleanupExpiredEntries, cleanupInterval);
    
    return () => clearInterval(interval);
  }, [cleanupExpiredEntries]);
  
  return {
    setCache,
    getCache,
    removeCache,
    clearCache,
    markAsStale,
    invalidateCriticalCaches,
    cacheSize: memoryCache.current.size,
    cacheVersion: cacheVersion.current
  };
}

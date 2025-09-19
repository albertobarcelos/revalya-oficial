/**
 * Sistema de Cache Hierárquico
 * 
 * Este sistema permite:
 * - Caching em múltiplas camadas (memória -> localStorage -> sessionStorage)
 * - Estratégia LRU (Least Recently Used)
 * - TTL (Time To Live) para expiração automática
 * - API assíncrona com suporte a fetchers
 * 
 * @module CacheSystem
 */

import { logDebug, logError, logWarn } from '@/lib/logger';

/**
 * Opções para configuração de cache
 */
export interface CacheOptions {
  /** Tempo de vida em milissegundos (padrão: 5 minutos) */
  ttl?: number;
  
  /** Tamanho máximo do cache em memória (padrão: 100 itens) */
  maxSize?: number;
  
  /** Se deve persistir em localStorage (padrão: false) */
  persistent?: boolean;
  
  /** Se deve usar sessionStorage em vez de localStorage quando persistente (padrão: false) */
  useSessionStorage?: boolean;
  
  /** Prefixo para chaves em storage (padrão: 'app_cache') */
  storagePrefix?: string;
}

/**
 * Item de cache com metadados
 */
interface CacheItem<T> {
  /** Dados armazenados */
  value: T;
  
  /** Timestamp de criação */
  timestamp: number;
  
  /** Contador de acessos */
  accessCount: number;
  
  /** Timestamp do último acesso */
  lastAccessed: number;
  
  /** Tempo de vida em milissegundos */
  ttl: number;
}

/**
 * Wrapper para armazenamento persistente
 */
interface StorageWrapper<T> {
  /** Dados armazenados */
  data: T;
  
  /** Timestamp de criação */
  timestamp: number;
  
  /** Tempo de vida em milissegundos */
  ttl: number;
}

/**
 * Sistema de cache com múltiplas camadas
 */
export class CacheSystem {
  private memoryCache = new Map<string, CacheItem<any>>();
  private options: Required<CacheOptions>;
  
  /**
   * Cria uma nova instância do sistema de cache
   * 
   * @param options Opções de configuração
   */
  constructor(options?: CacheOptions) {
    this.options = {
      ttl: 300000, // 5 minutos
      maxSize: 100,
      persistent: false,
      useSessionStorage: false,
      storagePrefix: 'app_cache',
      ...options
    };
    
    // Agendar limpeza periódica
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupExpiredItems(), Math.min(this.options.ttl / 2, 60000));
    }
  }
  
  /**
   * Obtém um item do cache com prioridade: memória -> localStorage -> sessionStorage -> fetcher
   * 
   * @param key Chave do item
   * @param fetcher Função opcional para buscar o valor caso não esteja em cache
   * @returns O valor armazenado ou resultado do fetcher, ou null se não encontrado
   */
  async get<T>(key: string, fetcher?: () => Promise<T>): Promise<T | null> {
    const normalizedKey = this.normalizeKey(key);
    
    // Verificar cache em memória (mais rápido)
    if (this.memoryCache.has(normalizedKey)) {
      const item = this.memoryCache.get(normalizedKey);
      
      if (item && Date.now() - item.timestamp < item.ttl) {
        // Atualizar metadados de acesso
        item.accessCount++;
        item.lastAccessed = Date.now();
        return item.value;
      }
      
      // Remover item expirado
      this.memoryCache.delete(normalizedKey);
    }
    
    // Verificar storage persistente se habilitado
    if (this.options.persistent) {
      try {
        const value = this.getFromStorage(normalizedKey);
        
        if (value !== null) {
          // Promover para memória
          this.setInMemory(normalizedKey, value);
          return value;
        }
      } catch (error) {
        logWarn(`[CacheSystem] Erro ao ler do storage para chave ${normalizedKey}:`, error);
      }
    }
    
    // Se um fetcher foi fornecido, usá-lo
    if (fetcher) {
      try {
        const value = await fetcher();
        
        // Salvar em todas as camadas
        this.set(normalizedKey, value);
        
        return value;
      } catch (error) {
        logError(`[CacheSystem] Erro no fetcher para chave ${normalizedKey}:`, error);
        return null;
      }
    }
    
    return null;
  }
  
  /**
   * Define um valor no cache em todas as camadas
   * 
   * @param key Chave do item
   * @param value Valor a armazenar
   * @param options Opções específicas para este item
   */
  set<T>(key: string, value: T, options?: { ttl?: number }): void {
    const normalizedKey = this.normalizeKey(key);
    const ttl = options?.ttl || this.options.ttl;
    
    // Salvar em memória
    this.setInMemory(normalizedKey, value, ttl);
    
    // Salvar em storage se habilitado
    if (this.options.persistent) {
      this.setInStorage(normalizedKey, value, ttl);
    }
  }
  
  /**
   * Remove um item do cache de todas as camadas
   * 
   * @param key Chave do item a remover
   * @returns Se o item existia e foi removido
   */
  remove(key: string): boolean {
    const normalizedKey = this.normalizeKey(key);
    let existed = false;
    
    // Remover da memória
    if (this.memoryCache.has(normalizedKey)) {
      this.memoryCache.delete(normalizedKey);
      existed = true;
    }
    
    // Remover do storage se habilitado
    if (this.options.persistent) {
      try {
        const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
        const fullKey = `${this.options.storagePrefix}_${normalizedKey}`;
        
        if (storage.getItem(fullKey) !== null) {
          storage.removeItem(fullKey);
          existed = true;
        }
      } catch (error) {
        logWarn(`[CacheSystem] Erro ao remover do storage para chave ${normalizedKey}:`, error);
      }
    }
    
    return existed;
  }
  
  /**
   * Limpa todo o cache
   */
  clear(): void {
    // Limpar memória
    this.memoryCache.clear();
    
    // Limpar storage se habilitado
    if (this.options.persistent && typeof window !== 'undefined') {
      try {
        const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
        const prefix = `${this.options.storagePrefix}_`;
        
        // Remover apenas itens com o prefixo
        for (let i = storage.length - 1; i >= 0; i--) {
          const key = storage.key(i);
          if (key && key.startsWith(prefix)) {
            storage.removeItem(key);
          }
        }
      } catch (error) {
        logError('[CacheSystem] Erro ao limpar storage:', error);
      }
    }
  }
  
  /**
   * Obtém estatísticas sobre o cache
   */
  getStats(): { memorySize: number, memoryUsage: string, mostAccessed: string[] } {
    const size = this.memoryCache.size;
    const usage = `${Math.round((size / this.options.maxSize) * 100)}%`;
    
    // Obter os 5 itens mais acessados
    const sortedItems = [...this.memoryCache.entries()]
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 5)
      .map(([key]) => key);
    
    return {
      memorySize: size,
      memoryUsage: usage,
      mostAccessed: sortedItems
    };
  }
  
  // Métodos privados
  
  /**
   * Normaliza uma chave para uso no cache
   */
  private normalizeKey(key: string): string {
    return key.trim().toLowerCase();
  }
  
  /**
   * Define um valor no cache em memória
   */
  private setInMemory<T>(key: string, value: T, ttl: number = this.options.ttl): void {
    // Verificar se precisa aplicar política LRU
    if (this.memoryCache.size >= this.options.maxSize && !this.memoryCache.has(key)) {
      this.evictLeastUsed();
    }
    
    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      ttl
    });
  }
  
  /**
   * Define um valor no storage persistente
   */
  private setInStorage<T>(key: string, value: T, ttl: number = this.options.ttl): void {
    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      const wrapper: StorageWrapper<T> = {
        data: value,
        timestamp: Date.now(),
        ttl
      };
      
      storage.setItem(
        `${this.options.storagePrefix}_${key}`,
        JSON.stringify(wrapper)
      );
    } catch (error) {
      logWarn(`[CacheSystem] Erro ao salvar no storage para chave ${key}:`, error);
    }
  }
  
  /**
   * Obtém um valor do storage persistente
   */
  private getFromStorage<T>(key: string): T | null {
    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      const serialized = storage.getItem(`${this.options.storagePrefix}_${key}`);
      
      if (!serialized) {
        return null;
      }
      
      const wrapper = JSON.parse(serialized) as StorageWrapper<T>;
      
      // Verificar validade do timestamp
      if (Date.now() - wrapper.timestamp < wrapper.ttl) {
        return wrapper.data;
      }
      
      // Remover item expirado
      storage.removeItem(`${this.options.storagePrefix}_${key}`);
    } catch (error) {
      logWarn(`[CacheSystem] Erro ao ler do storage para chave ${key}:`, error);
    }
    
    return null;
  }
  
  /**
   * Remove o item menos utilizado do cache
   */
  private evictLeastUsed(): void {
    if (this.memoryCache.size === 0) {
      return;
    }
    
    let leastUsedKey: string | null = null;
    let leastUsedScore = Number.POSITIVE_INFINITY;
    
    // Encontrar item com menor pontuação (combinação de acessos e tempo)
    for (const [key, item] of this.memoryCache.entries()) {
      // Fórmula que prioriza itens mais acessados e mais recentes
      const ageMs = Date.now() - item.lastAccessed;
      const score = ageMs / (item.accessCount + 1); // +1 para evitar divisão por zero
      
      if (score < leastUsedScore) {
        leastUsedKey = key;
        leastUsedScore = score;
      }
    }
    
    // Remover o item menos utilizado
    if (leastUsedKey !== null) {
      logDebug(`[CacheSystem] Removendo item menos utilizado: ${leastUsedKey}`);
      this.memoryCache.delete(leastUsedKey);
    }
  }
  
  /**
   * Remove itens expirados de todas as camadas
   */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    
    // Limpar memória
    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.memoryCache.delete(key);
      }
    }
    
    // Limpar storage se habilitado
    if (this.options.persistent && typeof window !== 'undefined') {
      try {
        const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
        const prefix = `${this.options.storagePrefix}_`;
        
        for (let i = storage.length - 1; i >= 0; i--) {
          const key = storage.key(i);
          
          if (key && key.startsWith(prefix)) {
            try {
              const serialized = storage.getItem(key);
              
              if (serialized) {
                const wrapper = JSON.parse(serialized) as StorageWrapper<any>;
                
                if (now - wrapper.timestamp > wrapper.ttl) {
                  storage.removeItem(key);
                }
              }
            } catch (error) {
              // Remover item com erro de parse
              storage.removeItem(key);
            }
          }
        }
      } catch (error) {
        logError('[CacheSystem] Erro ao limpar itens expirados do storage:', error);
      }
    }
  }
}

/**
 * Instância global do sistema de cache
 */
export const globalCache = new CacheSystem({
  persistent: true,
  maxSize: 200,
  ttl: 600000 // 10 minutos
});

/**
 * Hook para usar o sistema de cache em componentes React
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number, deps?: any[] }
): { data: T | null, loading: boolean, error: Error | null, refresh: () => Promise<T | null> } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await globalCache.get<T>(key, fetcher);
      setData(result);
      return result;
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error(String(err));
      setError(fetchError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [key, fetcher]);
  
  useEffect(() => {
    fetchData();
  }, options?.deps || [key]);
  
  return {
    data,
    loading,
    error,
    refresh: fetchData
  };
}

// Adicionar imports necessários
import { useState, useEffect, useCallback } from 'react';

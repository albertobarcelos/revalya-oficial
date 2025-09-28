// =====================================================
// CACHE AND PERFORMANCE UTILITIES
// Descrição: Sistema de cache em memória e Redis para otimização de performance
// =====================================================

import { config } from './config'
import { logger } from './logger'
import type { Database } from '../types/supabase'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface CacheEntry<T = any> {
  value: T
  timestamp: number
  ttl: number
  hits: number
  lastAccess: number
  tags?: string[]
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  evictions: number
  memoryUsage: number
  hitRate: number
}

export interface CacheOptions {
  ttl?: number // Time to live em segundos
  tags?: string[] // Tags para invalidação em grupo
  compress?: boolean // Comprimir dados grandes
  serialize?: boolean // Serializar objetos complexos
}

export type CacheKey = string | number
export type CacheValue = any

// =====================================================
// CLASSE DE CACHE EM MEMÓRIA
// =====================================================

class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    memoryUsage: 0,
    hitRate: 0,
  }
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly maxSize: number
  private readonly defaultTtl: number

  constructor(maxSize = 1000, defaultTtl = 3600) {
    this.maxSize = maxSize
    this.defaultTtl = defaultTtl
    this.startCleanup()
  }

  // =====================================================
  // OPERAÇÕES BÁSICAS
  // =====================================================

  public get<T = any>(key: CacheKey): T | null {
    const stringKey = this.normalizeKey(key)
    const entry = this.cache.get(stringKey)

    if (!entry) {
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Verificar se expirou
    if (this.isExpired(entry)) {
      this.cache.delete(stringKey)
      this.stats.misses++
      this.stats.evictions++
      this.updateHitRate()
      return null
    }

    // Atualizar estatísticas de acesso
    entry.hits++
    entry.lastAccess = Date.now()
    this.stats.hits++
    this.updateHitRate()

    logger.debug(`Cache hit: ${stringKey}`, {
      hits: entry.hits,
      age: Date.now() - entry.timestamp,
    })

    return entry.value
  }

  public set<T = any>(
    key: CacheKey,
    value: T,
    options: CacheOptions = {}
  ): void {
    const stringKey = this.normalizeKey(key)
    const ttl = options.ttl || this.defaultTtl
    const timestamp = Date.now()

    // Verificar limite de tamanho
    if (this.cache.size >= this.maxSize && !this.cache.has(stringKey)) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp,
      ttl,
      hits: 0,
      lastAccess: timestamp,
      tags: options.tags,
    }

    this.cache.set(stringKey, entry)
    this.stats.sets++
    this.updateMemoryUsage()

    logger.debug(`Cache set: ${stringKey}`, {
      ttl,
      tags: options.tags,
      size: this.cache.size,
    })
  }

  public delete(key: CacheKey): boolean {
    const stringKey = this.normalizeKey(key)
    const deleted = this.cache.delete(stringKey)
    
    if (deleted) {
      this.stats.deletes++
      this.updateMemoryUsage()
      logger.debug(`Cache delete: ${stringKey}`)
    }

    return deleted
  }

  public has(key: CacheKey): boolean {
    const stringKey = this.normalizeKey(key)
    const entry = this.cache.get(stringKey)
    
    if (!entry) return false
    if (this.isExpired(entry)) {
      this.cache.delete(stringKey)
      return false
    }
    
    return true
  }

  public clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.stats.deletes += size
    this.updateMemoryUsage()
    logger.info('Cache cleared', { deletedEntries: size })
  }

  // =====================================================
  // OPERAÇÕES AVANÇADAS
  // =====================================================

  public getOrSet<T = any>(
    key: CacheKey,
    factory: () => T | Promise<T>,
    options: CacheOptions = {}
  ): T | Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = factory()
    
    if (value instanceof Promise) {
      return value.then((resolvedValue) => {
        this.set(key, resolvedValue, options)
        return resolvedValue
      })
    } else {
      this.set(key, value, options)
      return value
    }
  }

  public invalidateByTag(tag: string): number {
    let invalidated = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        this.cache.delete(key)
        invalidated++
      }
    }

    this.stats.deletes += invalidated
    this.updateMemoryUsage()
    
    logger.info(`Cache invalidated by tag: ${tag}`, { invalidated })
    return invalidated
  }

  public invalidateByPattern(pattern: RegExp): number {
    let invalidated = 0
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        invalidated++
      }
    }

    this.stats.deletes += invalidated
    this.updateMemoryUsage()
    
    logger.info(`Cache invalidated by pattern: ${pattern}`, { invalidated })
    return invalidated
  }

  public getMultiple<T = any>(keys: CacheKey[]): Map<string, T | null> {
    const result = new Map<string, T | null>()
    
    for (const key of keys) {
      const stringKey = this.normalizeKey(key)
      result.set(stringKey, this.get<T>(key))
    }
    
    return result
  }

  public setMultiple<T = any>(
    entries: Map<CacheKey, T>,
    options: CacheOptions = {}
  ): void {
    for (const [key, value] of entries) {
      this.set(key, value, options)
    }
  }

  // =====================================================
  // ESTATÍSTICAS E MONITORAMENTO
  // =====================================================

  public getStats(): CacheStats {
    this.updateMemoryUsage()
    return { ...this.stats }
  }

  public getSize(): number {
    return this.cache.size
  }

  public getKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  public getEntries(): Array<[string, CacheEntry]> {
    return Array.from(this.cache.entries())
  }

  public getTopHits(limit = 10): Array<{ key: string; hits: number; lastAccess: number }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, hits: entry.hits, lastAccess: entry.lastAccess }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
  }

  // =====================================================
  // MÉTODOS PRIVADOS
  // =====================================================

  private normalizeKey(key: CacheKey): string {
    return typeof key === 'string' ? key : String(key)
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 1000
  }

  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestAccess = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
      logger.debug(`Cache LRU eviction: ${oldestKey}`)
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }

  private updateMemoryUsage(): void {
    // Estimativa simples do uso de memória
    this.stats.memoryUsage = this.cache.size * 1024 // 1KB por entrada (estimativa)
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // Limpeza a cada minuto
  }

  private cleanup(): void {
    let cleaned = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.stats.evictions += cleaned
      this.updateMemoryUsage()
      logger.debug(`Cache cleanup: ${cleaned} expired entries removed`)
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

// =====================================================
// CACHE DISTRIBUÍDO (REDIS)
// =====================================================

class RedisCache {
  private client: any = null // Redis client
  private connected = false

  constructor() {
    this.connect()
  }

  private async connect(): Promise<void> {
    try {
      if (config.cache.redisUrl) {
        // Implementar conexão Redis
        // this.client = new Redis(config.cache.redisUrl)
        // await this.client.ping()
        // this.connected = true
        logger.info('Redis cache connected')
      }
    } catch (error) {
      logger.error('Failed to connect to Redis', error as Error)
    }
  }

  public async get<T = any>(key: CacheKey): Promise<T | null> {
    if (!this.connected) return null

    try {
      const stringKey = this.normalizeKey(key)
      // const value = await this.client.get(stringKey)
      // return value ? JSON.parse(value) : null
      return null
    } catch (error) {
      logger.error('Redis get error', error as Error, { key })
      return null
    }
  }

  public async set<T = any>(
    key: CacheKey,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    if (!this.connected) return

    try {
      const stringKey = this.normalizeKey(key)
      const serialized = JSON.stringify(value)
      const ttl = options.ttl || 3600

      // await this.client.setex(stringKey, ttl, serialized)
      
      // Adicionar tags se especificadas
      if (options.tags) {
        for (const tag of options.tags) {
          // await this.client.sadd(`tag:${tag}`, stringKey)
        }
      }
    } catch (error) {
      logger.error('Redis set error', error as Error, { key })
    }
  }

  public async delete(key: CacheKey): Promise<boolean> {
    if (!this.connected) return false

    try {
      const stringKey = this.normalizeKey(key)
      // const result = await this.client.del(stringKey)
      // return result > 0
      return false
    } catch (error) {
      logger.error('Redis delete error', error as Error, { key })
      return false
    }
  }

  public async invalidateByTag(tag: string): Promise<number> {
    if (!this.connected) return 0

    try {
      // const keys = await this.client.smembers(`tag:${tag}`)
      // if (keys.length > 0) {
      //   await this.client.del(...keys)
      //   await this.client.del(`tag:${tag}`)
      // }
      // return keys.length
      return 0
    } catch (error) {
      logger.error('Redis invalidate by tag error', error as Error, { tag })
      return 0
    }
  }

  private normalizeKey(key: CacheKey): string {
    return typeof key === 'string' ? key : String(key)
  }

  public async destroy(): Promise<void> {
    if (this.client) {
      // await this.client.quit()
      this.connected = false
    }
  }
}

// =====================================================
// CACHE MANAGER PRINCIPAL
// =====================================================

class CacheManager {
  private memoryCache: MemoryCache
  private redisCache: RedisCache | null = null
  private readonly useRedis: boolean

  constructor() {
    this.memoryCache = new MemoryCache(
      config.cache.maxMemoryEntries,
      config.cache.defaultTtl
    )
    
    this.useRedis = !!config.cache.redisUrl
    if (this.useRedis) {
      this.redisCache = new RedisCache()
    }
  }

  // =====================================================
  // INTERFACE UNIFICADA
  // =====================================================

  public async get<T = any>(key: CacheKey, useRedis = true): Promise<T | null> {
    // Tentar cache em memória primeiro
    const memoryResult = this.memoryCache.get<T>(key)
    if (memoryResult !== null) {
      return memoryResult
    }

    // Tentar Redis se habilitado
    if (useRedis && this.redisCache) {
      const redisResult = await this.redisCache.get<T>(key)
      if (redisResult !== null) {
        // Armazenar no cache em memória para próximos acessos
        this.memoryCache.set(key, redisResult, { ttl: 300 }) // 5 minutos
        return redisResult
      }
    }

    return null
  }

  public async set<T = any>(
    key: CacheKey,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    // Sempre armazenar no cache em memória
    this.memoryCache.set(key, value, options)

    // Armazenar no Redis se habilitado e configurado
    if (this.redisCache && options.ttl && options.ttl > 300) {
      await this.redisCache.set(key, value, options)
    }
  }

  public async delete(key: CacheKey): Promise<boolean> {
    const memoryDeleted = this.memoryCache.delete(key)
    let redisDeleted = false

    if (this.redisCache) {
      redisDeleted = await this.redisCache.delete(key)
    }

    return memoryDeleted || redisDeleted
  }

  public async getOrSet<T = any>(
    key: CacheKey,
    factory: () => T | Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    await this.set(key, value, options)
    return value
  }

  public async invalidateByTag(tag: string): Promise<number> {
    const memoryInvalidated = this.memoryCache.invalidateByTag(tag)
    let redisInvalidated = 0

    if (this.redisCache) {
      redisInvalidated = await this.redisCache.invalidateByTag(tag)
    }

    return memoryInvalidated + redisInvalidated
  }

  public async invalidateByPattern(pattern: RegExp): Promise<number> {
    return this.memoryCache.invalidateByPattern(pattern)
  }

  public clear(): void {
    this.memoryCache.clear()
  }

  public getStats(): CacheStats {
    return this.memoryCache.getStats()
  }

  public async destroy(): Promise<void> {
    this.memoryCache.destroy()
    if (this.redisCache) {
      await this.redisCache.destroy()
    }
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const cache = new CacheManager()

// =====================================================
// DECORATORS E UTILITÁRIOS
// =====================================================

/**
 * Decorator para cache automático de métodos
 */
export function Cacheable(
  keyGenerator?: (...args: any[]) => string,
  options: CacheOptions = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const className = target.constructor.name
      const defaultKey = `${className}.${propertyName}:${JSON.stringify(args)}`
      const cacheKey = keyGenerator ? keyGenerator(...args) : defaultKey

      return await cache.getOrSet(
        cacheKey,
        () => method.apply(this, args),
        {
          ttl: 3600, // 1 hora por padrão
          tags: [className, propertyName],
          ...options,
        }
      )
    }

    return descriptor
  }
}

/**
 * Decorator para invalidação automática de cache
 */
export function CacheInvalidate(
  tags: string[] | ((result: any, ...args: any[]) => string[])
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args)
      
      const tagsToInvalidate = typeof tags === 'function' 
        ? tags(result, ...args) 
        : tags

      for (const tag of tagsToInvalidate) {
        await cache.invalidateByTag(tag)
      }

      return result
    }

    return descriptor
  }
}

/**
 * Função para criar chaves de cache consistentes
 */
export function createCacheKey(
  prefix: string,
  ...parts: (string | number | boolean | null | undefined)[]
): string {
  const cleanParts = parts
    .filter(part => part !== null && part !== undefined)
    .map(part => String(part))
  
  return `${prefix}:${cleanParts.join(':')}`.toLowerCase()
}

/**
 * Função para cache de queries do Supabase
 */
export async function cacheSupabaseQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  return await cache.getOrSet(
    createCacheKey('supabase', queryKey),
    queryFn,
    {
      ttl: 300, // 5 minutos por padrão
      tags: ['supabase', 'query'],
      ...options,
    }
  )
}

/**
 * Função para cache de cálculos financeiros
 */
export async function cacheFinancialCalculation<T>(
  calculationType: string,
  parameters: Record<string, any>,
  calculationFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const paramHash = Buffer.from(JSON.stringify(parameters)).toString('base64')
  const cacheKey = createCacheKey('financial', calculationType, paramHash)
  
  return await cache.getOrSet(
    cacheKey,
    calculationFn,
    {
      ttl: 3600, // 1 hora para cálculos
      tags: ['financial', calculationType],
      ...options,
    }
  )
}

/**
 * Função para invalidar cache relacionado a um usuário
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await cache.invalidateByPattern(new RegExp(`user:${userId}:`))
  await cache.invalidateByTag(`user:${userId}`)
  logger.info('User cache invalidated', { userId })
}

/**
 * Função para invalidar cache relacionado a um tenant
 */
export async function invalidateTenantCache(tenantId: string): Promise<void> {
  await cache.invalidateByPattern(new RegExp(`tenant:${tenantId}:`))
  await cache.invalidateByTag(`tenant:${tenantId}`)
  logger.info('Tenant cache invalidated', { tenantId })
}

// =====================================================
// EXPORTAÇÕES
// =====================================================

export default cache
export {
  CacheManager,
  MemoryCache,
  RedisCache,
  type CacheEntry,
  type CacheStats,
  type CacheOptions,
  type CacheKey,
  type CacheValue,
}

// Cleanup na saída do processo (apenas em ambiente Node.js)
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('beforeExit', async () => {
    await cache.destroy()
  })
  
  process.on('SIGINT', async () => {
    await cache.destroy()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await cache.destroy()
    process.exit(0)
  })
}

/**
 * Gerenciador de Tenants
 * 
 * Responsável por:
 * - Gerenciar o tenant atual
 * - Trocar entre tenants
 * - Verificar status de tenants
 * - Listar tenants do usuário
 * - Gerenciar cache de tenants
 * 
 * @module TenantManager
 */

import { 
  Tenant, 
  SimpleTenant, 
  TenantUser, 
  TenantUserRole, 
  TenantContext,
  TenantResult
} from './models';
import { StateManager } from '../state/StateManager';
import { CacheSystem, globalCache } from '../cache/CacheSystem';
import { SupabaseClient } from '@supabase/supabase-js';
import { logDebug, logError, logWarn } from '@/lib/logger';

/**
 * Tipo de operação para auditoria
 */
type AuditOperation = 'ACCESS' | 'SWITCH' | 'LOGOUT' | 'LOGIN';

/**
 * Opções para o gerenciador de tenants
 */
export interface TenantManagerOptions {
  /** Cliente Supabase */
  supabaseClient?: SupabaseClient;
  
  /** Sistema de cache personalizado */
  cacheSystem?: CacheSystem;
  
  /** Se deve usar sessionStorage em vez de localStorage */
  useSessionStorage?: boolean;
  
  /** Tempo de vida do cache de tenants em milissegundos */
  tenantCacheTTL?: number;
  
  /** Se deve verificar automaticamente o status do tenant */
  autoCheckTenantStatus?: boolean;
}

/**
 * Gerenciador de Tenants (totalmente desacoplado da autenticação)
 */
export class TenantManager {
  private supabase: SupabaseClient;
  private cache: CacheSystem;
  private options: Required<TenantManagerOptions>;
  private stateManager: StateManager<TenantContext>;
  private tenantStatusCheckInterval: number | null = null;
  
  // Chaves para armazenamento
  private readonly STORAGE_KEYS = {
    TENANT_ID: 'tenant_id',
    TENANT_SLUG: 'tenant_slug',
    PORTAL_TYPE: 'portal_type',
    USER_ROLE: 'user_role'
  };
  
  // Chaves para cache
  private readonly CACHE_KEYS = {
    TENANT_PREFIX: 'tenant_',
    USER_TENANTS: 'user_tenants_',
    TENANT_STATUS: 'tenant_status_',
    TENANT_BY_SLUG: 'tenant_by_slug_'
  };
  
  /**
   * Cria uma nova instância do gerenciador de tenants
   * 
   * @param options Opções de configuração
   */
  constructor(options?: TenantManagerOptions) {
    this.options = {
      supabaseClient: null as unknown as SupabaseClient,
      cacheSystem: globalCache,
      useSessionStorage: false,
      tenantCacheTTL: 600000, // 10 minutos
      autoCheckTenantStatus: true,
      ...options
    };
    
    this.supabase = this.options.supabaseClient;
    this.cache = this.options.cacheSystem;
    
    // Criar gerenciador de estado
    this.stateManager = new StateManager<TenantContext>(
      {
        tenant: null,
        userRole: null,
        isLoading: true,
        error: null
      },
      {
        persistenceKey: 'tenant_context',
        ttl: 3600000, // 1 hora
        useSessionStorage: this.options.useSessionStorage,
        syncBetweenTabs: false // Desativado para permitir múltiplos tenants em abas diferentes
      }
    );
    
    // Se auto-verificação de status está habilitada
    if (this.options.autoCheckTenantStatus) {
      this.startTenantStatusCheck();
    }
  }
  
  /**
   * Define o cliente Supabase
   * 
   * @param supabase Cliente Supabase
   */
  setSupabaseClient(supabase: SupabaseClient): void {
    this.supabase = supabase;
  }
  
  /**
   * Inicializa o gerenciador de tenants
   * 
   * @param userId ID do usuário atual
   * @returns Resultado da inicialização
   */
  async initialize(userId: string): Promise<TenantResult<TenantContext>> {
    try {
      this.updateState({
        isLoading: true,
        error: null
      });
      
      // Tentar recuperar tenant do armazenamento local
      const storedTenantId = this.getStoredValue(this.STORAGE_KEYS.TENANT_ID);
      const storedTenantSlug = this.getStoredValue(this.STORAGE_KEYS.TENANT_SLUG);
      const storedUserRole = this.getStoredValue(this.STORAGE_KEYS.USER_ROLE);
      
      // Se temos um ID armazenado, carregar tenant
      if (storedTenantId && storedTenantSlug) {
        const tenant = await this.getTenantById(storedTenantId);
        
        if (tenant && tenant.active) {
          // Verificar se o usuário tem acesso a este tenant
          const hasAccess = await this.checkUserHasTenantAccess(userId, tenant.id);
          
          if (hasAccess) {
            const simpleTenant: SimpleTenant = {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              active: tenant.active,
              logo: tenant.logo
            };
            
            this.updateState({
              tenant: simpleTenant,
              userRole: storedUserRole || null,
              isLoading: false
            });
            
            return {
              success: true,
              data: this.getState()
            };
          } else {
            // Usuário não tem mais acesso a este tenant
            logWarn(`[TenantManager] Usuário ${userId} não tem mais acesso ao tenant ${tenant.id}`);
            this.clearCurrentTenant();
          }
        } else {
          // Tenant inativo ou não encontrado
          logWarn(`[TenantManager] Tenant ${storedTenantId} inativo ou não encontrado`);
          this.clearCurrentTenant();
        }
      }
      
      // Nenhum tenant válido encontrado
      this.updateState({
        tenant: null,
        userRole: null,
        isLoading: false
      });
      
      return {
        success: true,
        data: this.getState()
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido ao inicializar gerenciador de tenants';
      
      logError('[TenantManager] Erro na inicialização:', error);
      
      this.updateState({
        isLoading: false,
        error: errorMessage
      });
      
      return {
        success: false,
        error: errorMessage,
        details: error
      };
    }
  }
  
  /**
   * Obtém o estado atual do contexto de tenant
   * 
   * @returns Contexto atual
   */
  getState(): TenantContext {
    return this.stateManager.getState();
  }
  
  /**
   * Obtém o tenant atual
   * 
   * @returns Tenant atual ou null
   */
  getCurrentTenant(): SimpleTenant | null {
    return this.getState().tenant;
  }
  
  /**
   * Obtém o papel do usuário no tenant atual
   * 
   * @returns Papel do usuário ou null
   */
  getCurrentUserRole(): TenantUserRole | string | null {
    return this.getState().userRole;
  }
  
  /**
   * Verifica se um tenant está ativo
   * 
   * @param tenantId ID do tenant
   * @returns Se o tenant está ativo
   */
  async isTenantActive(tenantId: string): Promise<boolean> {
    try {
      // Verificar cache primeiro
      const cacheKey = `${this.CACHE_KEYS.TENANT_STATUS}${tenantId}`;
      const cachedStatus = await this.cache.get<boolean>(cacheKey);
      
      if (cachedStatus !== null) {
        return cachedStatus;
      }
      
      // Verificar se this.supabase existe
      if (!this.supabase) {
        logError('[TenantManager] Tentativa de verificar tenant ativo sem cliente Supabase inicializado');
        return false;
      }
      
      // Consultar status no banco usando a função RPC unificada
      const { data, error } = await this.supabase
        .rpc('get_tenant', { p_tenant_id: tenantId });
      
      if (error) {
        logError(`[TenantManager] Erro ao verificar status do tenant ${tenantId}:`, error);
        return false;
      }
      
      const isActive = Boolean(data);
      
      // Salvar no cache
      this.cache.set(cacheKey, isActive, { ttl: this.options.tenantCacheTTL });
      
      return isActive;
    } catch (error) {
      logError(`[TenantManager] Erro ao verificar status do tenant ${tenantId}:`, error);
      return false;
    }
  }
  
  /**
   * Troca para outro tenant
   * 
   * @param tenantId ID do tenant
   * @param userId ID do usuário (para verificação de acesso)
   * @returns Resultado da operação
   */
  async switchTenant(tenantId: string, userId: string): Promise<TenantResult<SimpleTenant>> {
    try {
      this.updateState({
        isLoading: true,
        error: null
      });
      
      // Verificar se o tenant está ativo
      const isActive = await this.isTenantActive(tenantId);
      
      if (!isActive) {
        const errorMessage = `Tenant ${tenantId} não está ativo`;
        
        this.updateState({
          isLoading: false,
          error: errorMessage
        });
        
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Verificar se o usuário tem acesso a este tenant
      const hasAccess = await this.checkUserHasTenantAccess(userId, tenantId);
      
      if (!hasAccess) {
        const errorMessage = `Usuário ${userId} não tem acesso ao tenant ${tenantId}`;
        
        this.updateState({
          isLoading: false,
          error: errorMessage
        });
        
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Obter dados do tenant
      const tenant = await this.getTenantById(tenantId);
      
      if (!tenant) {
        const errorMessage = `Tenant ${tenantId} não encontrado`;
        
        this.updateState({
          isLoading: false,
          error: errorMessage
        });
        
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Obter papel do usuário neste tenant
      const userRole = await this.getUserRoleInTenant(userId, tenantId);
      
      // Salvar no armazenamento local
      this.setStoredValue(this.STORAGE_KEYS.TENANT_ID, tenant.id);
      this.setStoredValue(this.STORAGE_KEYS.TENANT_SLUG, tenant.slug);
      this.setStoredValue(this.STORAGE_KEYS.PORTAL_TYPE, 'tenant');
      
      if (userRole) {
        this.setStoredValue(this.STORAGE_KEYS.USER_ROLE, userRole);
      }
      
      // Criar versão simplificada do tenant
      const simpleTenant: SimpleTenant = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        active: tenant.active,
        logo: tenant.logo
      };
      
      // Atualizar estado
      this.updateState({
        tenant: simpleTenant,
        userRole: userRole || null,
        isLoading: false
      });
      
      // Registrar para auditoria
      this.logAuditEvent(userId, 'SWITCH', { tenant_id: tenant.id });
      
      return {
        success: true,
        data: simpleTenant
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido ao trocar de tenant';
      
      logError('[TenantManager] Erro ao trocar de tenant:', error);
      
      this.updateState({
        isLoading: false,
        error: errorMessage
      });
      
      return {
        success: false,
        error: errorMessage,
        details: error
      };
    }
  }
  
  /**
   * Troca para outro tenant usando o slug
   * 
   * @param slug Slug do tenant
   * @param userId ID do usuário (para verificação de acesso)
   * @returns Resultado da operação
   */
  async switchTenantBySlug(slug: string, userId: string): Promise<TenantResult<SimpleTenant>> {
    try {
      this.updateState({
        isLoading: true,
        error: null
      });
      
      // Obter tenant pelo slug
      const tenant = await this.getTenantBySlug(slug);
      
      if (!tenant) {
        const errorMessage = `Tenant com slug ${slug} não encontrado`;
        
        this.updateState({
          isLoading: false,
          error: errorMessage
        });
        
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Usar método existente para trocar
      return this.switchTenant(tenant.id, userId);
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido ao trocar de tenant por slug';
      
      logError('[TenantManager] Erro ao trocar de tenant por slug:', error);
      
      this.updateState({
        isLoading: false,
        error: errorMessage
      });
      
      return {
        success: false,
        error: errorMessage,
        details: error
      };
    }
  }
  
  /**
   * Limpa o tenant atual
   */
  clearCurrentTenant(): void {
    // Limpar armazenamento
    this.removeStoredValue(this.STORAGE_KEYS.TENANT_ID);
    this.removeStoredValue(this.STORAGE_KEYS.TENANT_SLUG);
    this.removeStoredValue(this.STORAGE_KEYS.PORTAL_TYPE);
    this.removeStoredValue(this.STORAGE_KEYS.USER_ROLE);
    
    // Atualizar estado
    this.updateState({
      tenant: null,
      userRole: null,
      error: null
    });
  }
  
  /**
   * Lista os tenants disponíveis para um usuário
   * 
   * @param userId ID do usuário
   * @returns Lista de tenants
   */
  async listUserTenants(userId: string): Promise<TenantResult<SimpleTenant[]>> {
    try {
      // Verificar cache primeiro
      const cacheKey = `${this.CACHE_KEYS.USER_TENANTS}${userId}`;
      const cachedTenants = await this.cache.get<SimpleTenant[]>(cacheKey);
      
      if (cachedTenants) {
        return {
          success: true,
          data: cachedTenants
        };
      }
      
      // Consultar banco
      const { data, error } = await this.supabase
        .rpc('get_user_tenants', { p_user_id: userId });
      
      if (error) {
        logError(`[TenantManager] Erro ao listar tenants do usuário ${userId}:`, error);
        
        return {
          success: false,
          error: error.message,
          details: error
        };
      }
      
      // Transformar em SimpleTenant
      const tenants: SimpleTenant[] = (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        active: t.active,
        logo: t.logo
      }));
      
      // Salvar no cache
      this.cache.set(cacheKey, tenants, { ttl: this.options.tenantCacheTTL });
      
      return {
        success: true,
        data: tenants
      };
    } catch (error: any) {
      logError(`[TenantManager] Erro ao listar tenants do usuário ${userId}:`, error);
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao listar tenants',
        details: error
      };
    }
  }
  
  /**
   * Obtém um tenant pelo ID
   * 
   * @param tenantId ID do tenant
   * @returns Dados do tenant
   */
  async getTenantById(tenantId: string): Promise<Tenant | null> {
    try {
      // Verificar cache primeiro
      const cacheKey = `${this.CACHE_KEYS.TENANT_PREFIX}${tenantId}`;
      const cachedTenant = await this.cache.get<Tenant>(cacheKey);
      
      if (cachedTenant) {
        return cachedTenant;
      }
      
      // Consultar banco
      const { data, error } = await this.supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
      
      if (error) {
        logError(`[TenantManager] Erro ao obter tenant ${tenantId}:`, error);
        return null;
      }
      
      if (!data) {
        return null;
      }
      
      // Salvar no cache
      this.cache.set(cacheKey, data, { ttl: this.options.tenantCacheTTL });
      
      return data;
    } catch (error) {
      logError(`[TenantManager] Erro ao obter tenant ${tenantId}:`, error);
      return null;
    }
  }
  
  /**
   * Obtém um tenant pelo slug
   * 
   * @param slug Slug do tenant
   * @returns Dados do tenant
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      // Verificar cache primeiro
      const cacheKey = `${this.CACHE_KEYS.TENANT_BY_SLUG}${slug}`;
      const cachedTenant = await this.cache.get<Tenant>(cacheKey);
      
      if (cachedTenant) {
        return cachedTenant;
      }
      
      // Consultar banco
      const { data, error } = await this.supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) {
        logError(`[TenantManager] Erro ao obter tenant com slug ${slug}:`, error);
        return null;
      }
      
      if (!data) {
        return null;
      }
      
      // Salvar no cache
      this.cache.set(cacheKey, data, { ttl: this.options.tenantCacheTTL });
      
      return data;
    } catch (error) {
      logError(`[TenantManager] Erro ao obter tenant com slug ${slug}:`, error);
      return null;
    }
  }
  
  /**
   * Verifica se um usuário tem acesso a um tenant
   * 
   * @param userId ID do usuário
   * @param tenantId ID do tenant
   * @returns Se o usuário tem acesso
   */
  async checkUserHasTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    try {
      // Consultar banco diretamente
      const { data, error } = await this.supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (error) {
        // Se erro for 'não encontrado', é porque o usuário não tem acesso
        if (error.code === 'PGRST116') {
          return false;
        }
        
        logError(`[TenantManager] Erro ao verificar acesso do usuário ${userId} ao tenant ${tenantId}:`, error);
        return false;
      }
      
      return Boolean(data);
    } catch (error) {
      logError(`[TenantManager] Erro ao verificar acesso do usuário ${userId} ao tenant ${tenantId}:`, error);
      return false;
    }
  }
  
  /**
   * Obtém o papel de um usuário em um tenant
   * 
   * @param userId ID do usuário
   * @param tenantId ID do tenant
   * @returns Papel do usuário ou null
   */
  async getUserRoleInTenant(userId: string, tenantId: string): Promise<TenantUserRole | string | null> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_users')
        .select('role')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (error) {
        logError(`[TenantManager] Erro ao obter papel do usuário ${userId} no tenant ${tenantId}:`, error);
        return null;
      }
      
      return data?.role || null;
    } catch (error) {
      logError(`[TenantManager] Erro ao obter papel do usuário ${userId} no tenant ${tenantId}:`, error);
      return null;
    }
  }
  
  /**
   * Invalida o cache para um tenant específico
   * 
   * @param tenantId ID do tenant
   */
  invalidateTenantCache(tenantId: string): void {
    // Invalidar cache do tenant
    this.cache.remove(`${this.CACHE_KEYS.TENANT_PREFIX}${tenantId}`);
    
    // Invalidar cache de status
    this.cache.remove(`${this.CACHE_KEYS.TENANT_STATUS}${tenantId}`);
  }
  
  /**
   * Invalida o cache para todos os tenants de um usuário
   * 
   * @param userId ID do usuário
   */
  invalidateUserTenantsCache(userId: string): void {
    // Invalidar cache de tenants do usuário
    this.cache.remove(`${this.CACHE_KEYS.USER_TENANTS}${userId}`);
  }
  
  /**
   * Destrói a instância e limpa recursos
   */
  destroy(): void {
    if (this.tenantStatusCheckInterval !== null) {
      clearInterval(this.tenantStatusCheckInterval);
      this.tenantStatusCheckInterval = null;
    }
  }
  
  // Métodos privados
  
  /**
   * Atualiza o estado do contexto de tenant
   * 
   * @param update Atualização parcial do estado
   */
  private updateState(update: Partial<TenantContext>): void {
    this.stateManager.setState(update);
  }
  
  /**
   * Obtém um valor do armazenamento local
   * 
   * @param key Chave do valor
   * @returns Valor armazenado ou null
   */
  private getStoredValue(key: string): string | null {
    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      return storage.getItem(key);
    } catch (error) {
      logError(`[TenantManager] Erro ao obter valor armazenado para chave ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Define um valor no armazenamento local
   * 
   * @param key Chave do valor
   * @param value Valor a armazenar
   */
  private setStoredValue(key: string, value: string): void {
    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      storage.setItem(key, value);
    } catch (error) {
      logError(`[TenantManager] Erro ao definir valor armazenado para chave ${key}:`, error);
    }
  }
  
  /**
   * Remove um valor do armazenamento local
   * 
   * @param key Chave do valor a remover
   */
  private removeStoredValue(key: string): void {
    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      storage.removeItem(key);
    } catch (error) {
      logError(`[TenantManager] Erro ao remover valor armazenado para chave ${key}:`, error);
    }
  }
  
  /**
   * Registra um evento de auditoria
   * 
   * @param userId ID do usuário
   * @param operation Tipo de operação
   * @param metadata Metadados adicionais
   */
  private async logAuditEvent(
    userId: string,
    operation: AuditOperation,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_audit_event', {
        p_user_id: userId,
        p_event_type: `TENANT_${operation}`,
        p_metadata: metadata
      });
    } catch (error) {
      logError('[TenantManager] Erro ao registrar evento de auditoria:', error);
    }
  }
  
  /**
   * Inicia verificação periódica do status do tenant
   */
  private startTenantStatusCheck(): void {
    // Verificar a cada 5 minutos
    this.tenantStatusCheckInterval = window.setInterval(async () => {
      const tenant = this.getCurrentTenant();
      
      if (tenant) {
        const isActive = await this.isTenantActive(tenant.id);
        
        if (!isActive) {
          logWarn(`[TenantManager] Tenant ${tenant.id} não está mais ativo`);
          
          // Atualizar status no cache
          this.cache.set(
            `${this.CACHE_KEYS.TENANT_STATUS}${tenant.id}`,
            false,
            { ttl: this.options.tenantCacheTTL }
          );
          
          // Atualizar estado
          this.updateState({
            error: `Tenant ${tenant.name} não está mais ativo`
          });
        }
      }
    }, 300000); // 5 minutos
  }
}

/**
 * Instância global do gerenciador de tenants
 */
export const tenantManager = new TenantManager();

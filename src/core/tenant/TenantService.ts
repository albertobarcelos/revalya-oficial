/**
 * Serviço de Tenant
 * 
 * Contém a lógica de negócios para operações relacionadas a tenants,
 * utilizando o TenantManager como base e fornecendo uma API unificada.
 * 
 * @module TenantService
 */

import { TenantManager, tenantManager } from './TenantManager';
import { 
  Tenant, 
  SimpleTenant, 
  TenantInvite, 
  TenantUserRole,
  TenantContext,
  TenantResult
} from './models';
import { logDebug, logError } from '@/lib/logger';

/**
 * Eventos de tenant
 */
export enum TenantEventType {
  SWITCH = 'switch',
  CLEAR = 'clear',
  ERROR = 'error',
  STATUS_CHANGE = 'status_change'
}

/**
 * Opções para o serviço de tenant
 */
export interface TenantServiceOptions {
  /** Gerenciador de tenant personalizado */
  manager?: TenantManager;
}

/**
 * Serviço para operações de negócio relacionadas a tenants
 */
export class TenantService {
  private manager: TenantManager;
  private listeners = new Map<TenantEventType, Set<(data: any) => void>>();
  
  /**
   * Cria um novo serviço de tenant
   * 
   * @param options Opções de configuração
   */
  constructor(options?: TenantServiceOptions) {
    this.manager = options?.manager || tenantManager;
  }
  
  /**
   * Inicializa o serviço de tenant
   * 
   * @param userId ID do usuário atual
   * @returns Resultado da inicialização
   */
  async initialize(userId: string): Promise<TenantResult<TenantContext>> {
    try {
      const result = await this.manager.initialize(userId);
      
      // Se inicialização falhou, emitir evento de erro
      if (!result.success && result.error) {
        this.emitEvent(TenantEventType.ERROR, {
          message: result.error,
          timestamp: Date.now()
        });
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido ao inicializar serviço de tenant';
      
      logError('[TenantService] Erro na inicialização:', error);
      
      this.emitEvent(TenantEventType.ERROR, {
        message: errorMessage,
        timestamp: Date.now()
      });
      
      return {
        success: false,
        error: errorMessage,
        details: error
      };
    }
  }
  
  /**
   * Obtém o contexto atual de tenant
   * 
   * @returns Contexto atual
   */
  getContext(): TenantContext {
    return this.manager.getState();
  }
  
  /**
   * Obtém o tenant atual
   * 
   * @returns Tenant atual ou null
   */
  getCurrentTenant(): SimpleTenant | null {
    return this.manager.getCurrentTenant();
  }
  
  /**
   * Troca para outro tenant
   * 
   * @param tenantId ID do tenant
   * @param userId ID do usuário atual
   * @returns Resultado da operação
   */
  async switchTenant(tenantId: string, userId: string): Promise<TenantResult<SimpleTenant>> {
    try {
      const result = await this.manager.switchTenant(tenantId, userId);
      
      if (result.success && result.data) {
        // Emitir evento de troca
        this.emitEvent(TenantEventType.SWITCH, {
          tenant: result.data,
          timestamp: Date.now()
        });
      } else if (!result.success && result.error) {
        // Emitir evento de erro
        this.emitEvent(TenantEventType.ERROR, {
          message: result.error,
          timestamp: Date.now()
        });
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido ao trocar de tenant';
      
      logError('[TenantService] Erro ao trocar de tenant:', error);
      
      this.emitEvent(TenantEventType.ERROR, {
        message: errorMessage,
        timestamp: Date.now()
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
   * @param userId ID do usuário atual
   * @returns Resultado da operação
   */
  async switchTenantBySlug(slug: string, userId: string): Promise<TenantResult<SimpleTenant>> {
    try {
      const result = await this.manager.switchTenantBySlug(slug, userId);
      
      if (result.success && result.data) {
        // Emitir evento de troca
        this.emitEvent(TenantEventType.SWITCH, {
          tenant: result.data,
          timestamp: Date.now()
        });
      } else if (!result.success && result.error) {
        // Emitir evento de erro
        this.emitEvent(TenantEventType.ERROR, {
          message: result.error,
          timestamp: Date.now()
        });
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido ao trocar de tenant por slug';
      
      logError('[TenantService] Erro ao trocar de tenant por slug:', error);
      
      this.emitEvent(TenantEventType.ERROR, {
        message: errorMessage,
        timestamp: Date.now()
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
    const currentTenant = this.getCurrentTenant();
    this.manager.clearCurrentTenant();
    
    // Emitir evento de limpeza
    this.emitEvent(TenantEventType.CLEAR, {
      previousTenant: currentTenant,
      timestamp: Date.now()
    });
  }
  
  /**
   * Lista os tenants disponíveis para um usuário
   * 
   * @param userId ID do usuário
   * @returns Lista de tenants
   */
  async listUserTenants(userId: string): Promise<TenantResult<SimpleTenant[]>> {
    return this.manager.listUserTenants(userId);
  }
  
  /**
   * Obtém um tenant pelo ID
   * 
   * @param tenantId ID do tenant
   * @returns Dados do tenant
   */
  async getTenantById(tenantId: string): Promise<Tenant | null> {
    return this.manager.getTenantById(tenantId);
  }
  
  /**
   * Obtém um tenant pelo slug
   * 
   * @param slug Slug do tenant
   * @returns Dados do tenant
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    return this.manager.getTenantBySlug(slug);
  }
  
  /**
   * Verifica se um tenant está ativo
   * 
   * @param tenantId ID do tenant
   * @returns Se o tenant está ativo
   */
  async isTenantActive(tenantId: string): Promise<boolean> {
    return this.manager.isTenantActive(tenantId);
  }
  
  /**
   * Verifica se um usuário tem acesso a um tenant
   * 
   * @param userId ID do usuário
   * @param tenantId ID do tenant
   * @returns Se o usuário tem acesso
   */
  async checkUserHasTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    return this.manager.checkUserHasTenantAccess(userId, tenantId);
  }
  
  /**
   * Lista os convites pendentes para um usuário
   * 
   * @param userId ID do usuário
   * @returns Lista de convites pendentes
   */
  async listUserPendingInvites(userId: string): Promise<TenantResult<TenantInvite[]>> {
    try {
      const supabase = this.manager.getSupabaseClient();
      const { data, error } = await supabase.rpc('get_user_pending_invites', {
        p_user_id: userId
      });
      
      if (error) {
        logError(`[TenantService] Erro ao listar convites pendentes para usuário ${userId}:`, error);
        
        return {
          success: false,
          error: error.message,
          details: error
        };
      }
      
      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      logError(`[TenantService] Erro ao listar convites pendentes para usuário ${userId}:`, error);
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao listar convites pendentes',
        details: error
      };
    }
  }
  
  /**
   * Aceita um convite
   * 
   * @param inviteId ID do convite
   * @param userId ID do usuário
   * @returns Resultado da operação
   */
  async acceptInvite(inviteId: string, userId: string): Promise<TenantResult> {
    try {
      const supabase = this.manager.getSupabaseClient();
      const { data, error } = await supabase.rpc('accept_tenant_invite', {
        p_invite_id: inviteId,
        p_user_id: userId
      });
      
      if (error) {
        logError(`[TenantService] Erro ao aceitar convite ${inviteId}:`, error);
        
        return {
          success: false,
          error: error.message,
          details: error
        };
      }
      
      // Invalidar cache de tenants do usuário
      this.manager.invalidateUserTenantsCache(userId);
      
      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      logError(`[TenantService] Erro ao aceitar convite ${inviteId}:`, error);
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao aceitar convite',
        details: error
      };
    }
  }
  
  /**
   * Rejeita um convite
   * 
   * @param inviteId ID do convite
   * @param userId ID do usuário
   * @returns Resultado da operação
   */
  async rejectInvite(inviteId: string, userId: string): Promise<TenantResult> {
    try {
      const supabase = this.manager.getSupabaseClient();
      const { data, error } = await supabase.rpc('reject_tenant_invite', {
        p_invite_id: inviteId,
        p_user_id: userId
      });
      
      if (error) {
        logError(`[TenantService] Erro ao rejeitar convite ${inviteId}:`, error);
        
        return {
          success: false,
          error: error.message,
          details: error
        };
      }
      
      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      logError(`[TenantService] Erro ao rejeitar convite ${inviteId}:`, error);
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao rejeitar convite',
        details: error
      };
    }
  }
  
  /**
   * Obtém o gerenciador de tenants
   */
  getManager(): TenantManager {
    return this.manager;
  }
  
  /**
   * Registra um ouvinte para eventos de tenant
   * 
   * @param eventType Tipo de evento
   * @param callback Função a ser chamada quando o evento ocorrer
   * @returns Função para remover o ouvinte
   */
  on(eventType: TenantEventType, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }
  
  /**
   * Remove um ouvinte de eventos
   * 
   * @param eventType Tipo de evento
   * @param callback Função a ser removida
   */
  off(eventType: TenantEventType, callback: (data: any) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  /**
   * Destrói a instância e limpa recursos
   */
  destroy(): void {
    this.listeners.clear();
    this.manager.destroy();
  }
  
  // Métodos privados
  
  /**
   * Emite um evento para todos os ouvintes registrados
   * 
   * @param eventType Tipo de evento
   * @param data Dados do evento
   */
  private emitEvent(eventType: TenantEventType, data: any): void {
    const listeners = this.listeners.get(eventType);
    
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          logError(`[TenantService] Erro em ouvinte de evento ${eventType}:`, error);
        }
      }
    }
  }
}

/**
 * Instância global do serviço de tenant
 */
export const tenantService = new TenantService();

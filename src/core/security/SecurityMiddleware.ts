/**
 * Middleware de Segurança Multi-Tenant
 * 
 * Esta camada implementa:
 * - Configuração automática de contexto de tenant
 * - Verificações de autorização
 * - Filtros de dados baseados em tenant
 * - Registro de auditoria e logs de segurança
 * 
 * @module SecurityMiddleware
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TenantService, tenantService } from '../tenant/TenantService';
import { logError, logWarn, logDebug } from '@/lib/logger';

/**
 * Tipo de log de segurança
 */
export enum SecurityLogType {
  /** Acesso negado */
  ACCESS_DENIED = 'ACCESS_DENIED',
  
  /** Acesso permitido */
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  
  /** Tentativa de violação */
  VIOLATION_ATTEMPT = 'VIOLATION_ATTEMPT',
  
  /** Erro de segurança */
  SECURITY_ERROR = 'SECURITY_ERROR'
}

/**
 * Tipo de operação
 */
export enum OperationType {
  /** Operação de leitura */
  READ = 'READ',
  
  /** Operação de escrita */
  WRITE = 'WRITE',
  
  /** Operação de atualização */
  UPDATE = 'UPDATE',
  
  /** Operação de exclusão */
  DELETE = 'DELETE'
}

/**
 * Nível de severidade de log
 */
export enum LogSeverity {
  /** Informação */
  INFO = 'INFO',
  
  /** Aviso */
  WARNING = 'WARNING',
  
  /** Erro */
  ERROR = 'ERROR',
  
  /** Crítico */
  CRITICAL = 'CRITICAL'
}

/**
 * Opções para o middleware de segurança
 */
export interface SecurityMiddlewareOptions {
  /** Cliente Supabase */
  supabaseClient?: SupabaseClient;
  
  /** Serviço de tenant */
  tenantService?: TenantService;
  
  /** Se deve aplicar filtro de tenant automaticamente */
  autoApplyTenantFilter?: boolean;
  
  /** Se deve definir contexto de tenant no banco automaticamente */
  autoSetTenantContext?: boolean;
}

/**
 * Middleware de segurança para aplicações multi-tenant
 */
export class SecurityMiddleware {
  private supabase: SupabaseClient;
  private tenantService: TenantService;
  private options: Required<SecurityMiddlewareOptions>;
  
  /**
   * Cria uma nova instância do middleware de segurança
   * 
   * @param options Opções de configuração
   */
  constructor(options?: SecurityMiddlewareOptions) {
    this.options = {
      supabaseClient: null as unknown as SupabaseClient,
      tenantService: tenantService,
      autoApplyTenantFilter: true,
      autoSetTenantContext: true,
      ...options
    };
    
    this.supabase = this.options.supabaseClient;
    this.tenantService = this.options.tenantService;
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
   * Aplica o contexto de tenant no banco de dados
   * 
   * Define variáveis de sessão no PostgreSQL que são usadas
   * pelas políticas RLS para isolar dados entre tenants
   * 
   * @param tenantId ID do tenant (opcional, usa o tenant atual se não fornecido)
   * @param userId ID do usuário (opcional, usa o usuário atual se não fornecido)
   * @returns Se o contexto foi aplicado com sucesso
   */
  async applyTenantContext(tenantId?: string, userId?: string): Promise<boolean> {
    try {
      // Obter tenant atual se não fornecido
      const actualTenantId = tenantId || this.getCurrentTenantId();
      
      // Se não tiver tenant, limpar contexto
      if (!actualTenantId) {
        await this.clearTenantContext();
        return true;
      }
      
      // Definir contexto no banco via RPC
      const { error } = await this.supabase.rpc('set_tenant_context', {
        p_tenant_id: actualTenantId,
        p_user_id: userId || null
      });
      
      if (error) {
        logError('[SecurityMiddleware] Erro ao definir contexto de tenant:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      logError('[SecurityMiddleware] Erro ao aplicar contexto de tenant:', error);
      return false;
    }
  }
  
  /**
   * Limpa o contexto de tenant no banco de dados
   * 
   * @returns Se o contexto foi limpo com sucesso
   */
  async clearTenantContext(): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('clear_tenant_context');
      
      if (error) {
        logError('[SecurityMiddleware] Erro ao limpar contexto de tenant:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      logError('[SecurityMiddleware] Erro ao limpar contexto de tenant:', error);
      return false;
    }
  }
  
  /**
   * Verifica se o usuário tem permissão para acessar um recurso
   * 
   * @param resource Nome do recurso
   * @param action Ação a ser executada
   * @param tenantId ID do tenant (opcional, usa o tenant atual se não fornecido)
   * @param userId ID do usuário (opcional, usa o usuário atual se não fornecido)
   * @returns Se o usuário tem permissão
   */
  async checkPermission(
    resource: string,
    action: string,
    tenantId?: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // Obter tenant atual se não fornecido
      const actualTenantId = tenantId || this.getCurrentTenantId();
      
      // Se não tiver tenant, negar acesso
      if (!actualTenantId) {
        await this.logSecurityEvent(
          SecurityLogType.ACCESS_DENIED,
          `Acesso negado a ${resource}.${action} - Nenhum tenant selecionado`,
          LogSeverity.WARNING,
          { resource, action }
        );
        
        return false;
      }
      
      // Verificar permissão no banco via RPC
      const { data, error } = await this.supabase.rpc('check_permission', {
        p_resource: resource,
        p_action: action,
        p_tenant_id: actualTenantId,
        p_user_id: userId || null
      });
      
      if (error) {
        logError('[SecurityMiddleware] Erro ao verificar permissão:', error);
        
        await this.logSecurityEvent(
          SecurityLogType.SECURITY_ERROR,
          `Erro ao verificar permissão para ${resource}.${action}`,
          LogSeverity.ERROR,
          { resource, action, error: error.message }
        );
        
        return false;
      }
      
      // Registrar resultado da verificação
      if (data) {
        await this.logSecurityEvent(
          SecurityLogType.ACCESS_GRANTED,
          `Acesso permitido a ${resource}.${action}`,
          LogSeverity.INFO,
          { resource, action }
        );
      } else {
        await this.logSecurityEvent(
          SecurityLogType.ACCESS_DENIED,
          `Acesso negado a ${resource}.${action}`,
          LogSeverity.WARNING,
          { resource, action }
        );
      }
      
      return Boolean(data);
    } catch (error: any) {
      logError('[SecurityMiddleware] Erro ao verificar permissão:', error);
      
      await this.logSecurityEvent(
        SecurityLogType.SECURITY_ERROR,
        `Erro ao verificar permissão para ${resource}.${action}`,
        LogSeverity.ERROR,
        { resource, action, error: error.message }
      );
      
      return false;
    }
  }
  
  /**
   * Aplica filtro de tenant a uma consulta
   * 
   * @param query Consulta base
   * @param tenantId ID do tenant (opcional, usa o tenant atual se não fornecido)
   * @returns Consulta com filtro aplicado
   */
  applyTenantFilter<T>(query: any, tenantId?: string): any {
    // Se filtro automático estiver desativado, retornar consulta original
    if (!this.options.autoApplyTenantFilter) {
      return query;
    }
    
    // Obter tenant atual se não fornecido
    const actualTenantId = tenantId || this.getCurrentTenantId();
    
    // Se não tiver tenant, retornar consulta original
    if (!actualTenantId) {
      logWarn('[SecurityMiddleware] Tentativa de aplicar filtro sem tenant selecionado');
      return query;
    }
    
    // Aplicar filtro de tenant
    return query.filter('tenant_id', 'eq', actualTenantId);
  }
  
  /**
   * Registra acesso a um recurso
   * 
   * @param resource Nome do recurso
   * @param operation Tipo de operação
   * @param metadata Metadados adicionais
   * @returns Se o log foi registrado com sucesso
   */
  async logResourceAccess(
    resource: string,
    operation: OperationType,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('log_resource_access', {
        p_resource: resource,
        p_operation: operation,
        p_metadata: metadata
      });
      
      if (error) {
        logError('[SecurityMiddleware] Erro ao registrar acesso a recurso:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      logError('[SecurityMiddleware] Erro ao registrar acesso a recurso:', error);
      return false;
    }
  }
  
  /**
   * Registra evento de segurança
   * 
   * @param logType Tipo de log
   * @param message Mensagem
   * @param severity Nível de severidade
   * @param metadata Metadados adicionais
   * @returns Se o log foi registrado com sucesso
   */
  async logSecurityEvent(
    logType: SecurityLogType,
    message: string,
    severity: LogSeverity = LogSeverity.INFO,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('log_security_event', {
        p_log_type: logType,
        p_message: message,
        p_severity: severity,
        p_metadata: metadata
      });
      
      if (error) {
        logError('[SecurityMiddleware] Erro ao registrar evento de segurança:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      logError('[SecurityMiddleware] Erro ao registrar evento de segurança:', error);
      return false;
    }
  }
  
  /**
   * Cria um middleware para configurar o contexto de tenant automaticamente
   * 
   * @returns Middleware de configuração de contexto
   */
  createContextMiddleware(): () => Promise<void> {
    return async () => {
      // Se configuração automática estiver desativada, não fazer nada
      if (!this.options.autoSetTenantContext) {
        return;
      }
      
      const tenantId = this.getCurrentTenantId();
      
      if (tenantId) {
        await this.applyTenantContext(tenantId);
      } else {
        await this.clearTenantContext();
      }
    };
  }
  
  /**
   * Cria um middleware para verificação de permissão
   * 
   * @param resource Nome do recurso
   * @param action Ação a ser executada
   * @returns Middleware de verificação de permissão
   */
  createPermissionMiddleware(resource: string, action: string): () => Promise<boolean> {
    return async () => {
      return this.checkPermission(resource, action);
    };
  }
  
  // Métodos privados
  
  /**
   * Obtém o ID do tenant atual
   * 
   * @returns ID do tenant atual ou null
   */
  private getCurrentTenantId(): string | null {
    const tenant = this.tenantService.getCurrentTenant();
    return tenant?.id || null;
  }
}

/**
 * Instância global do middleware de segurança
 */
export const securityMiddleware = new SecurityMiddleware();

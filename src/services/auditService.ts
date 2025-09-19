import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Interface para registros do log de auditoria
 */
export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  tenant_id?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  old_data?: any;
  new_data?: any;
  changed_fields?: Record<string, { old: any, new: any }>;
  performed_by?: string;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
  
  // Relações expandidas
  performer?: {
    email: string;
  };
}

/**
 * Opções para filtrar logs de auditoria
 */
export interface AuditQueryOptions {
  entityType?: string;
  entityId?: string;
  tenantId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  userId?: string;
  action?: string;
  limit?: number;
  page?: number;
}

/**
 * Serviço centralizado para gerenciamento de logs de auditoria
 */
export const auditService = {
  /**
   * Verifica se o usuário atual tem permissão para acessar logs de auditoria
   * @param supabase Cliente Supabase
   * @param tenantId ID do tenant (opcional, se fornecido verifica permissão específica)
   * @returns true se tiver acesso, false caso contrário
   */
  async hasAuditAccess(
    supabase: SupabaseClient,
    tenantId?: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Verificar se é admin da plataforma (acesso a todos logs)
    const { data: platformAdmin } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'PLATFORM_ADMIN')
      .maybeSingle();

    if (platformAdmin) return true;

    // Se não tem tenant_id, precisa ser admin da plataforma
    if (!tenantId) return false;

    // Verificar se é admin do tenant específico
    const { data: tenantAdmin } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('role', 'TENANT_ADMIN')
      .maybeSingle();

    return !!tenantAdmin;
  },

  /**
   * Consulta logs de auditoria com filtros
   * @param supabase Cliente Supabase
   * @param options Opções de filtro e paginação
   * @returns Dados paginados, contagem total e erro (se houver)
   */
  async getLogs(
    supabase: SupabaseClient,
    options: AuditQueryOptions = {}
  ): Promise<{ data: AuditLog[] | null; count: number | null; error: any }> {
    try {
      const {
        entityType,
        entityId,
        tenantId,
        startDate,
        endDate,
        userId,
        action,
        limit = 20,
        page = 1
      } = options;

      // Verificar permissões
      const hasAccess = await this.hasAuditAccess(supabase, tenantId);
      
      if (!hasAccess) {
        return {
          data: null,
          count: null,
          error: 'Sem permissão para acessar logs de auditoria'
        };
      }

      // Construir consulta
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          performer:performed_by(email)
        `, { count: 'exact' });

      // Aplicar filtros
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }
      
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      
      if (startDate) {
        query = query.gte('performed_at', new Date(startDate).toISOString());
      }
      
      if (endDate) {
        query = query.lte('performed_at', new Date(endDate).toISOString());
      }
      
      if (userId) {
        query = query.eq('performed_by', userId);
      }
      
      if (action) {
        query = query.eq('action', action);
      }

      // Paginação
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      query = query
        .order('performed_at', { ascending: false })
        .range(from, to);

      // Executar consulta
      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return { data, count, error: null };
    } catch (error) {
      console.error('Erro ao consultar logs de auditoria:', error);
      return { data: null, count: null, error };
    }
  },

  /**
   * Registra uma ação personalizada no log de auditoria
   * @param supabase Cliente Supabase
   * @param entityType Tipo da entidade (ex: 'users', 'payments')
   * @param entityId ID da entidade
   * @param action Nome da ação personalizada (ex: 'APPROVE', 'REJECT')
   * @param metadata Dados adicionais relevantes para a ação
   * @param tenantId ID do tenant relacionado (opcional)
   * @returns Resultado da operação
   */
  async logCustomAction(
    supabase: SupabaseClient,
    entityType: string,
    entityId: string,
    action: string,
    metadata: any,
    tenantId?: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          tenant_id: tenantId,
          action: 'CUSTOM',
          new_data: {
            action_type: action,
            metadata,
            timestamp: new Date().toISOString()
          },
          performed_by: user?.id
        });

      if (error) {
        throw error;
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Erro ao registrar ação personalizada:', error);
      return { success: false, error };
    }
  },

  /**
   * Recupera o histórico de mudanças para uma entidade específica
   * @param supabase Cliente Supabase
   * @param entityType Tipo da entidade
   * @param entityId ID da entidade
   * @returns Lista de logs de auditoria para a entidade
   */
  async getEntityHistory(
    supabase: SupabaseClient,
    entityType: string,
    entityId: string
  ): Promise<{ data: AuditLog[] | null; error: any }> {
    try {
      // Verificar permissões
      const tenant = await this._getTenantForEntity(supabase, entityType, entityId);
      const hasAccess = await this.hasAuditAccess(supabase, tenant?.id);
      
      if (!hasAccess) {
        return {
          data: null,
          error: 'Sem permissão para acessar logs de auditoria'
        };
      }

      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          performer:performed_by(email)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('performed_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao buscar histórico de entidade:', error);
      return { data: null, error };
    }
  },

  /**
   * Obtém o tenant relacionado a uma entidade específica
   * @param supabase Cliente Supabase
   * @param entityType Tipo da entidade
   * @param entityId ID da entidade
   * @returns ID do tenant ou null
   * @private Método privado
   */
  async _getTenantForEntity(
    supabase: SupabaseClient,
    entityType: string,
    entityId: string
  ): Promise<{ id: string } | null> {
    try {
      // Consulta específica por tipo de entidade
      let tenantId: string | null = null;
      
      switch (entityType) {
        case 'charges':
        case 'customers':
        case 'notifications':
        case 'notification_templates':
        case 'message_history':
          // Entidades com tenant_id direto
          const { data } = await supabase
            .from(entityType)
            .select('tenant_id')
            .eq('id', entityId)
            .single();
          
          tenantId = data?.tenant_id;
          break;
          
        case 'resellers_users':
          // Entidades com relacionamento indireto
          const { data: resellerUser } = await supabase
            .from('resellers_users')
            .select('reseller_id')
            .eq('id', entityId)
            .single();
            
          if (resellerUser) {
            const { data: reseller } = await supabase
              .from('resellers')
              .select('tenant_id')
              .eq('id', resellerUser.reseller_id)
              .single();
              
            tenantId = reseller?.tenant_id;
          }
          break;
          
        // Adicionar outros casos específicos conforme necessário
      }
      
      return tenantId ? { id: tenantId } : null;
    } catch (error) {
      console.error('Erro ao obter tenant para entidade:', error);
      return null;
    }
  }
};

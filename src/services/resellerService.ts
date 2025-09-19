import { SupabaseClient } from '@supabase/supabase-js';
import { ResellerUser, AuditResellerUser } from '../types/reseller';

/**
 * Funções de autenticação e autorização para revendedores
 */
export const resellerAuth = {
  /**
   * Verifica se o usuário atual é administrador do revendedor especificado
   * @param supabase Cliente Supabase
   * @param resellerId ID do revendedor
   * @returns true se for administrador, false caso contrário
   */
  async isResellerAdmin(
    supabase: SupabaseClient,
    resellerId: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('resellers_users')
      .select('role')
      .eq('reseller_id', resellerId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Erro ao verificar permissão de administrador:', error);
      return false;
    }

    return data?.role === 'RESELLER_ADMIN';
  },

  /**
   * Verifica se o usuário atual pode acessar logs de auditoria
   * @param supabase Cliente Supabase
   * @returns true se tiver acesso, false caso contrário
   */
  async auditLogAccessCheck(
    supabase: SupabaseClient
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'PLATFORM_ADMIN')
      .single();

    if (error) {
      // Não logar como erro, apenas o usuário não tem a permissão
      return false;
    }

    return !!data;
  }
};

/**
 * Serviço para gerenciar usuários de revendedores
 */
export const resellerUserService = {
  /**
   * Adiciona um usuário a um revendedor
   * @param supabase Cliente Supabase
   * @param resellerId ID do revendedor
   * @param userId ID do usuário
   * @param role Papel do usuário
   * @returns Resultado da operação
   */
  async addUser(
    supabase: SupabaseClient,
    resellerId: string,
    userId: string,
    role: ResellerUser['role'] = 'RESELLER_USER'
  ): Promise<{ data: ResellerUser | null; error: any }> {
    try {
      // Verificar permissão
      if (!(await resellerAuth.isResellerAdmin(supabase, resellerId))) {
        return { 
          data: null, 
          error: 'Acesso negado: requer perfil de administrador do revendedor' 
        };
      }

      // Adicionar usuário
      const { data, error } = await supabase
        .from('resellers_users')
        .insert({
          reseller_id: resellerId,
          user_id: userId,
          role,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log adicional personalizado (se necessário)
      await this.logCustomAction(
        supabase, 
        'USER_ADD', 
        { resellerId, userId, role, added_by: (await supabase.auth.getUser()).data.user?.id }
      );
      
      return { data, error: null };
    } catch (error) {
      console.error('Erro ao adicionar usuário ao revendedor:', error);
      return { data: null, error };
    }
  },

  /**
   * Lista usuários de um revendedor
   * @param supabase Cliente Supabase 
   * @param resellerId ID do revendedor
   * @returns Lista de usuários
   */
  async listUsers(
    supabase: SupabaseClient, 
    resellerId: string
  ): Promise<{ data: ResellerUser[] | null; error: any }> {
    try {
      // Verificar permissão
      if (!(await resellerAuth.isResellerAdmin(supabase, resellerId))) {
        return { 
          data: null, 
          error: 'Acesso negado: requer perfil de administrador do revendedor' 
        };
      }

      const { data, error } = await supabase
        .from('resellers_users')
        .select(`
          *,
          user:user_id (email, last_sign_in_at),
          reseller:reseller_id (name, corporate_id)
        `)
        .eq('reseller_id', resellerId);

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao listar usuários do revendedor:', error);
      return { data: null, error };
    }
  },

  /**
   * Atualiza o papel de um usuário em um revendedor
   * @param supabase Cliente Supabase
   * @param resellerUserId ID do relacionamento revendedor-usuário
   * @param role Novo papel
   * @returns Resultado da operação
   */
  async updateUserRole(
    supabase: SupabaseClient,
    resellerUserId: string,
    role: ResellerUser['role']
  ): Promise<{ data: ResellerUser | null; error: any }> {
    try {
      // Obter informações atuais
      const { data: currentData, error: getError } = await supabase
        .from('resellers_users')
        .select('*')
        .eq('id', resellerUserId)
        .single();

      if (getError || !currentData) {
        return { data: null, error: getError || 'Registro não encontrado' };
      }

      // Verificar permissão
      if (!(await resellerAuth.isResellerAdmin(supabase, currentData.reseller_id))) {
        return { 
          data: null, 
          error: 'Acesso negado: requer perfil de administrador do revendedor' 
        };
      }

      // Atualizar papel
      const { data, error } = await supabase
        .from('resellers_users')
        .update({ 
          role,
          updated_at: new Date().toISOString() 
        })
        .eq('id', resellerUserId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao atualizar papel do usuário:', error);
      return { data: null, error };
    }
  },

  /**
   * Remove um usuário de um revendedor
   * @param supabase Cliente Supabase
   * @param resellerUserId ID do relacionamento revendedor-usuário
   * @returns Resultado da operação
   */
  async removeUser(
    supabase: SupabaseClient,
    resellerUserId: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      // Obter informações atuais
      const { data: currentData, error: getError } = await supabase
        .from('resellers_users')
        .select('*')
        .eq('id', resellerUserId)
        .single();

      if (getError || !currentData) {
        return { success: false, error: getError || 'Registro não encontrado' };
      }

      // Verificar permissão
      if (!(await resellerAuth.isResellerAdmin(supabase, currentData.reseller_id))) {
        return { 
          success: false, 
          error: 'Acesso negado: requer perfil de administrador do revendedor' 
        };
      }

      // Verificar se não é o último administrador
      if (currentData.role === 'RESELLER_ADMIN') {
        const { count, error: countError } = await supabase
          .from('resellers_users')
          .select('*', { count: 'exact', head: true })
          .eq('reseller_id', currentData.reseller_id)
          .eq('role', 'RESELLER_ADMIN');
        
        if (countError) {
          return { success: false, error: countError };
        }
        
        if (count === 1) {
          return { 
            success: false, 
            error: 'Não é possível remover o último administrador do revendedor' 
          };
        }
      }

      // Remover usuário
      const { error } = await supabase
        .from('resellers_users')
        .delete()
        .eq('id', resellerUserId);

      if (error) {
        throw error;
      }

      // Log customizado
      await this.logCustomAction(
        supabase,
        'USER_REMOVE',
        { 
          resellerUserId,
          resellerId: currentData.reseller_id,
          userId: currentData.user_id,
          removed_by: (await supabase.auth.getUser()).data.user?.id
        }
      );

      return { success: true, error: null };
    } catch (error) {
      console.error('Erro ao remover usuário do revendedor:', error);
      return { success: false, error };
    }
  },

  /**
   * Listar logs de auditoria para um revendedor
   * @param supabase Cliente Supabase
   * @param resellerId ID do revendedor
   * @returns Lista de logs de auditoria
   */
  async getAuditLogs(
    supabase: SupabaseClient,
    resellerId: string
  ): Promise<{ data: AuditResellerUser[] | null; error: any }> {
    try {
      // Verificar permissão
      if (!(await resellerAuth.auditLogAccessCheck(supabase))) {
        return { 
          data: null, 
          error: 'Acesso negado: requer perfil de administrador da plataforma' 
        };
      }

      const { data, error } = await supabase
        .from('audit_resellers_users')
        .select(`
          *,
          performer:performed_by(email)
        `)
        .or(`new_data->>reseller_id.eq.${resellerId},old_data->>reseller_id.eq.${resellerId}`)
        .order('performed_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return { data: null, error };
    }
  },

  /**
   * Registra uma ação customizada no log de auditoria
   * @param supabase Cliente Supabase
   * @param actionType Tipo da ação
   * @param metadata Metadados da ação
   * @returns Resultado da operação
   * @private Método privado
   */
  async logCustomAction(
    supabase: SupabaseClient,
    actionType: string,
    metadata: object
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('audit_resellers_users')
        .insert({
          action: 'CUSTOM',
          new_data: {
            action_type: actionType,
            metadata,
            timestamp: new Date().toISOString()
          },
          performed_by: user?.id
        });
    } catch (error) {
      console.error('Erro ao registrar ação customizada:', error);
      // Não propagamos erro aqui para não interromper o fluxo principal
    }
  }
};

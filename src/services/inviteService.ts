import { SupabaseClient } from '@supabase/supabase-js';

export interface TenantInvite {
  id: string;
  tenant_id: string;
  email: string;
  invited_by: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  role: 'TENANT_USER' | 'TENANT_ADMIN';
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at?: string;
  user_id?: string;
  tenant?: {
    name: string;
    logo_url?: string;
  };
  inviter?: {
    email: string;
  };
}

export const inviteService = {
  // Criar um novo convite
  async createInvite(
    supabase: SupabaseClient,
    tenantId: string,
    email: string,
    role: 'TENANT_USER' | 'TENANT_ADMIN' = 'TENANT_USER'
  ): Promise<{ data: TenantInvite | null; error: any }> {
    try {
      // Obter o ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: 'Usuário não autenticado' };
      }

      // Verificar se o usuário tem permissão para convidar (é admin do tenant)
      const { data: tenantUser, error: tenantUserError } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .single();

      if (tenantUserError || !tenantUser || tenantUser.role !== 'TENANT_ADMIN') {
        return { data: null, error: 'Você não tem permissão para convidar usuários para este tenant' };
      }

      // Verificar se já existe um convite pendente para este email neste tenant
      const { data: existingInvite, error: existingInviteError } = await supabase
        .from('tenant_invites')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('email', email)
        .eq('status', 'PENDING')
        .single();

      if (existingInvite) {
        return { data: null, error: 'Já existe um convite pendente para este email' };
      }

      // Obter o nome do tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenant) {
        return { data: null, error: 'Tenant não encontrado' };
      }

      // Criar o convite
      const { data: invite, error: inviteError } = await supabase
        .from('tenant_invites')
        .insert({
          tenant_id: tenantId,
          email,
          invited_by: user.id,
          role,
        })
        .select()
        .single();

      if (inviteError) {
        return { data: null, error: inviteError };
      }

      // Enviar email de convite
      const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
        body: {
          email,
          token: invite.token,
          type: 'tenant',
          tenantName: tenant.name,
          inviterName: user.email,
        },
      });

      if (emailError) {
        console.error('Erro ao enviar email de convite:', emailError);
        // Não retornamos erro aqui para não impedir o fluxo, mas logamos o erro
      }

      return { data: invite, error: null };
    } catch (error) {
      console.error('Erro ao criar convite:', error);
      return { data: null, error };
    }
  },

  // Listar convites para um tenant
  async listTenantInvites(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<{ data: TenantInvite[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('tenant_invites')
        .select(`
          *,
          inviter:invited_by(email)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Erro ao listar convites:', error);
      return { data: null, error };
    }
  },

  // Listar convites pendentes para o usuário atual
  async listUserPendingInvites(
    supabase: SupabaseClient
  ): Promise<{ data: TenantInvite[] | null; error: any }> {
    try {
      // Obter o email do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: 'Usuário não autenticado' };
      }

      // Consulta simplificada que evita o join problemático com inviter
      const { data, error } = await supabase
        .from('tenant_invites')
        .select(`
          *,
          tenants(name)
        `)
        .eq('email', user.email)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao listar convites pendentes:', error);
        throw error;
      }

      // Modificar resposta para ser compatível com a interface esperada
      const formattedData = data?.map(invite => ({
        ...invite,
        tenant: invite.tenants,
        inviter: { email: 'indisponível' } // Placeholder para evitar o null
      }));

      return { data: formattedData || [], error: null };
    } catch (error) {
      console.error('Erro ao listar convites pendentes:', error);
      return { data: [], error }; // Retornar array vazio em vez de null para evitar erros
    }
  },

  // Aceitar um convite
  async acceptInvite(
    supabase: SupabaseClient,
    inviteId: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      // Obter o ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Verificar se o convite existe e é para o usuário atual
      const { data: invite, error: inviteError } = await supabase
        .from('tenant_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('email', user.email)
        .eq('status', 'PENDING')
        .single();

      if (inviteError || !invite) {
        return { success: false, error: 'Convite não encontrado ou não é para você' };
      }

      // Iniciar uma transação (usando blocos aninhados para simular transação)
      try {
        // AIDEV-NOTE: Verificar se o usuário já está associado ao tenant (caso de retry após erro)
        const { data: existingTenantUser, error: checkError } = await supabase
          .from('tenant_users')
          .select('id')
          .eq('tenant_id', invite.tenant_id)
          .eq('user_id', user.id)
          .single();
        
        // AIDEV-NOTE: Inserir usuário na tabela tenant_users APENAS se não existir
        // O trigger auto_create_tenant_admin foi desabilitado para evitar associação automática
        if (!existingTenantUser) {
          const { error: insertError } = await supabase
            .from('tenant_users')
            .insert({
              tenant_id: invite.tenant_id,
              user_id: user.id,
              role: invite.role,
              active: true, // AIDEV-NOTE: Usuário ativo ao aceitar convite
              created_at: new Date().toISOString(),
            });
            
          if (insertError) {
            console.error('Erro ao inserir usuário no tenant:', insertError);
            throw insertError;
          }
        } else {
          console.log('✅ [DEBUG] Usuário já está associado ao tenant, pulando inserção');
        }
          
        // 2. Atualizar o convite (sem passar updated_at, pois a tabela não tem esse campo)
        const { error: updateError } = await supabase
          .from('tenant_invites')
          .update({
            status: 'ACCEPTED',
            accepted_at: new Date().toISOString(),
            user_id: user.id,
            // AIDEV-NOTE: Não incluir updated_at - a tabela não tem esse campo
          })
          .eq('id', inviteId);

        if (updateError) {
          console.error('Erro ao atualizar convite:', updateError);
          throw updateError;
        }
      } catch (transactionError) {
        console.error('Erro na transação de aceitação de convite:', transactionError);
        return { success: false, error: 'Database error granting user' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      return { success: false, error };
    }
  },

  // Rejeitar um convite
  async rejectInvite(
    supabase: SupabaseClient,
    inviteId: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      // Obter o ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Verificar se o convite existe e é para o usuário atual
      const { data: invite, error: inviteError } = await supabase
        .from('tenant_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('email', user.email)
        .eq('status', 'PENDING')
        .single();

      if (inviteError || !invite) {
        return { success: false, error: 'Convite não encontrado ou não é para você' };
      }

      // Atualizar o convite
      const { error: updateError } = await supabase
        .from('tenant_invites')
        .update({
          status: 'REJECTED',
          user_id: user.id,
        })
        .eq('id', inviteId);

      if (updateError) {
        return { success: false, error: updateError };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Erro ao rejeitar convite:', error);
      return { success: false, error };
    }
  },

  // Cancelar um convite (apenas para quem enviou)
  async cancelInvite(
    supabase: SupabaseClient,
    inviteId: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      // Obter o ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Verificar se o convite existe e foi enviado pelo usuário atual
      const { data: invite, error: inviteError } = await supabase
        .from('tenant_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('invited_by', user.id)
        .eq('status', 'PENDING')
        .single();

      if (inviteError || !invite) {
        return { success: false, error: 'Convite não encontrado ou você não tem permissão para cancelá-lo' };
      }

      // Excluir o convite
      const { error: deleteError } = await supabase
        .from('tenant_invites')
        .delete()
        .eq('id', inviteId);

      if (deleteError) {
        return { success: false, error: deleteError };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      return { success: false, error };
    }
  },
};

import { SupabaseClient } from '@supabase/supabase-js';

export interface UserPortalData {
  authenticated: boolean;
  message?: string;
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    active: boolean;
    logo?: string;
    role: string;
  }>;
  invites: Array<{
    id: string;
    tenant_id: string;
    tenant_name: string;
    tenant_logo?: string;
    role: string;
    created_at: string;
    expires_at: string;
    invited_by: string;
  }>;
}

export const portalService = {
  /**
   * Obtém todos os dados necessários para a página de seleção de portal em uma única chamada
   * Inclui informações do usuário, tenants aos quais tem acesso e convites pendentes
   */
  async getUserPortalData(
    supabase: SupabaseClient
  ): Promise<{ data: UserPortalData | null; error: any }> {
    try {
      console.log('[PortalService] Buscando dados do portal do usuário');
      
      // Verificar a sessão do usuário
      const session = await supabase.auth.getSession();
      console.log('[PortalService] Sessão atual:', {
        hasSession: !!session.data.session,
        userId: session.data.session?.user?.id,
        expiresAt: session.data.session?.expires_at
      });
      
      const userId = session.data.session?.user?.id;
      
      if (!userId) {
        console.warn('[PortalService] Nenhum usuário autenticado encontrado na sessão');
        return { 
          data: {
            authenticated: false,
            message: 'Usuário não autenticado',
            user: null,
            tenants: [],
            invites: []
          }, 
          error: null 
        };
      }
      
      // Chamar a função RPC passando o ID do usuário explicitamente
      const { data, error } = await supabase
        .rpc('get_user_portal_data', { user_id_param: userId });
      
      if (error) {
        console.error('[PortalService] Erro ao buscar dados do portal:', error);
        throw error;
      }
      
      // Verificar se o usuário está autenticado
      if (data && !data.authenticated) {
        console.warn('[PortalService] Usuário não autenticado:', data.message);
        return { data, error: null }; // Retornamos os dados mesmo assim, para que o frontend possa lidar com isso
      }
      
      console.log('[PortalService] Dados do portal obtidos com sucesso:', data);
      
      return { data, error: null };
    } catch (error) {
      console.error('[PortalService] Erro ao buscar dados do portal:', error);
      return { data: null, error };
    }
  },
};

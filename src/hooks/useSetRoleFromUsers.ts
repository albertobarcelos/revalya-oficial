import { useSupabase } from '@/hooks/useSupabase';

/**
 * Hook para definir a role do usuário a partir da tabela public.users
 * Útil para resolver problemas de permissão quando a role em auth.users
 * é diferente da role em public.users
 */
export function useSetRoleFromUsers() {
  const { supabase } = useSupabase()

  /**
   * Define a role do usuário a partir da tabela public.users
   * @returns Promise<void>
   */
  const setRoleFromUsers = async (): Promise<void> => {
    try {
      await supabase.rpc('set_role_from_users_table')
      console.log('Role definida a partir da tabela users')
    } catch (error) {
      console.error('Erro ao definir role:', error)
      // Continuar mesmo se falhar
    }
  }

  return { setRoleFromUsers }
}

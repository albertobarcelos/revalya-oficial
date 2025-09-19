import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * AIDEV-NOTE: Utilitário para sincronizar user_metadata do auth.users com dados da public.users
 * Esta função garante que o user_metadata esteja sempre atualizado com a role correta
 */

export interface SyncUserMetadataResult {
  success: boolean;
  user_id?: string;
  email?: string;
  user_role?: string;
  previous_metadata?: any;
  new_metadata?: any;
  updated_at?: number;
  error?: string;
  code?: string;
  details?: any;
}

export interface SyncAllUsersResult {
  success: boolean;
  total_processed: number;
  success_count: number;
  error_count: number;
  errors: Array<{
    user_id: string;
    email: string;
    error: string;
  }>;
  completed_at: number;
}

/**
 * Sincroniza o user_metadata de um usuário específico
 * @param userId - ID do usuário (obrigatório)
 * @returns Resultado da sincronização
 */
export async function syncUserMetadata(
  userId: string
): Promise<SyncUserMetadataResult> {
  try {
    console.log('[SyncUserMetadata] Iniciando sincronização para:', { userId });

    // Validar parâmetros
    if (!userId) {
      return {
        success: false,
        error: 'Necessário fornecer userId',
        code: 'INVALID_PARAMS'
      };
    }

    // Chamar a função SQL de sincronização
    const { data, error } = await supabase.rpc('sync_user_metadata_from_public_users', {
      target_user_id: userId
    });

    if (error) {
      console.error('[SyncUserMetadata] Erro na função RPC:', error);
      return {
        success: false,
        error: `Erro ao chamar função de sincronização: ${error.message}`,
        code: 'RPC_ERROR',
        details: error
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Nenhum dado retornado da função de sincronização',
        code: 'NO_DATA'
      };
    }

    console.log('[SyncUserMetadata] Resultado da sincronização:', data);
    return data as SyncUserMetadataResult;

  } catch (error: any) {
    console.error('[SyncUserMetadata] Erro inesperado:', error);
    return {
      success: false,
      error: `Erro inesperado: ${error.message}`,
      code: 'UNEXPECTED_ERROR',
      details: error
    };
  }
}

/**
 * Sincroniza o user_metadata do usuário atual logado
 * @returns Resultado da sincronização
 */
export async function syncCurrentUserMetadata(): Promise<SyncUserMetadataResult> {
  try {
    // Obter usuário atual
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      };
    }

    // Sincronizar usando o ID do usuário atual
    return await syncUserMetadata(user.id);

  } catch (error: any) {
    console.error('[SyncCurrentUserMetadata] Erro:', error);
    return {
      success: false,
      error: `Erro ao sincronizar usuário atual: ${error.message}`,
      code: 'CURRENT_USER_ERROR',
      details: error
    };
  }
}

/**
 * Sincroniza o user_metadata de todos os usuários ativos (apenas para admins)
 * @returns Resultado da sincronização em lote
 */
export async function syncAllUsersMetadata(): Promise<SyncAllUsersResult> {
  try {
    console.log('[SyncAllUsersMetadata] Iniciando sincronização em lote');

    // Chamar a função SQL de sincronização em lote
    const { data, error } = await supabase.rpc('sync_all_users_metadata');

    if (error) {
      console.error('[SyncAllUsersMetadata] Erro na função RPC:', error);
      return {
        success: false,
        total_processed: 0,
        success_count: 0,
        error_count: 1,
        errors: [{
          user_id: 'unknown',
          email: 'unknown',
          error: `Erro ao chamar função de sincronização: ${error.message}`
        }],
        completed_at: Date.now()
      };
    }

    console.log('[SyncAllUsersMetadata] Resultado da sincronização em lote:', data);
    return data as SyncAllUsersResult;

  } catch (error: any) {
    console.error('[SyncAllUsersMetadata] Erro inesperado:', error);
    return {
      success: false,
      total_processed: 0,
      success_count: 0,
      error_count: 1,
      errors: [{
        user_id: 'unknown',
        email: 'unknown',
        error: `Erro inesperado: ${error.message}`
      }],
      completed_at: Date.now()
    };
  }
}

/**
 * Verifica se o user_metadata está sincronizado com os dados da public.users
 * @param userId - ID do usuário
 * @returns True se estiver sincronizado, false caso contrário
 */
export async function isUserMetadataSynced(userId: string): Promise<boolean> {
  try {
    // Buscar dados do auth.users
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      console.warn('[IsUserMetadataSynced] Usuário não encontrado ou não autorizado');
      return false;
    }

    // Buscar dados da public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('user_role, status')
      .eq('id', userId)
      .single();

    if (publicError || !publicUser) {
      console.warn('[IsUserMetadataSynced] Usuário não encontrado na public.users');
      return false;
    }

    // Comparar user_role
    const metadataRole = user.user_metadata?.user_role;
    const publicRole = publicUser.user_role;

    const isSynced = metadataRole === publicRole;
    
    console.log('[IsUserMetadataSynced] Comparação:', {
      userId,
      metadataRole,
      publicRole,
      isSynced
    });

    return isSynced;

  } catch (error: any) {
    console.error('[IsUserMetadataSynced] Erro:', error);
    return false;
  }
}

/**
 * Hook personalizado para sincronização automática do user_metadata
 * @param autoSync - Se deve sincronizar automaticamente quando detectar dessincronia
 * @returns Funções e estado da sincronização
 */
export function useUserMetadataSync(autoSync: boolean = false) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncUserMetadataResult | null>(null);

  const checkAndSync = useCallback(async (userId?: string, email?: string) => {
    if (isSyncing) return lastSyncResult;

    setIsSyncing(true);
    
    try {
      // Verificar se está sincronizado
      if (userId && !(await isUserMetadataSynced(userId))) {
        // Se não estiver sincronizado, fazer a sincronização
        const result = await syncUserMetadata(userId);
        setLastSyncResult(result);
        return result;
      }
      
      // Já está sincronizado
      const result: SyncUserMetadataResult = {
        success: true,
        user_id: userId,
        email: email
      };
      setLastSyncResult(result);
      return result;
      
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, lastSyncResult]);

  const forcSync = useCallback(async (userId?: string) => {
    setIsSyncing(true);
    
    try {
      if (!userId) {
        throw new Error('userId é obrigatório para sincronização forçada');
      }
      const result = await syncUserMetadata(userId);
      setLastSyncResult(result);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isSyncing,
    lastSyncResult,
    checkAndSync,
    forcSync,
    syncCurrentUser: () => syncCurrentUserMetadata()
  };
}

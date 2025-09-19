/**
 * Utilitário de autenticação alternativa para o Supabase
 * Esta solução contorna problemas estruturais no banco de dados Supabase
 * quando ocorre o erro "Database error granting user"
 */

import { supabase as supabaseGlobal } from '../lib/supabase';
import { clearAuthStorage } from '@/utils/authTokenManager';
import { PersistenceManager } from '@/features/tenant/storage/persistenceManager';

// Usar client global para evitar múltiplas instâncias do GoTrueClient
const supabaseAdmin = supabaseGlobal;

/**
 * Função para login que contorna o erro do Supabase
 * Usa JWT diretamente em vez de depender das funções que causam o erro
 */
export async function loginWithBypass(email: string, password: string) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    
    // Chamar API REST diretamente
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erro no login',
        details: data
      };
    }

    // Se autenticação teve sucesso, set a sessão manualmente
    if (data.access_token) {
      // Salvar usando a função centralizada
      const authData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: data.token_type || 'bearer',
        user: data.user
      };
      
      // AIDEV-NOTE: Removido saveSessionData e localStorage manual - usar apenas APIs oficiais do SDK v2
      // O SDK v2 gerencia automaticamente a chave sb-wyehpiutzvwplllumgdk-auth-token
      console.log('[SupabaseAuthBypass] Usando apenas APIs oficiais do SDK v2 - não salvando chaves legadas');
      
      // Atualizar o cliente Supabase com a nova sessão
      await supabaseAdmin.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      
      // Tentar criar usuário imediatamente após login
      try {
        await ensureUserExists(data.user.id, data.user.email);
      } catch (userError: any) {
        console.warn('Aviso: Erro ao sincronizar usuário, mas login continua válido:', userError);
      }
      
      return {
        success: true,
        user: data.user,
        session: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in
        }
      };
    }
    
    return {
      success: false,
      error: 'Erro ao processar autenticação',
      details: data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao processar login',
      details: error
    };
  }
}

/**
 * Verificar se o usuário existe na tabela public.users
 * e criar se não existir
 */
export async function ensureUserExists(userId: string, email: string) {
  try {
    // Método 1: Tentar criar usuário diretamente com a função RPC admin_create_user_bypass_rls
    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        'admin_create_user_bypass_rls',
        {
          user_id: userId,
          user_email: email,
          user_role_value: 'USER',
          user_name: email.split('@')[0],
          user_status: 'ACTIVE'
        }
      );
      
      if (!rpcError) {
        console.log('Usuário garantido via RPC:', rpcResult);
        return { success: true };
      }
      
      console.warn('Erro na função RPC, tentando método alternativo:', rpcError);
    } catch (rpcFailure) {
      console.warn('Falha ao chamar RPC:', rpcFailure);
    }
    
    // Método 2: Verificar se usuário existe
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (!checkError && existingUser) {
      // Usuário já existe
      console.log('Usuário já existe na tabela public.users');
      return { success: true };
    }
    
    // Método 3: Última tentativa com INSERT direto
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email,
        user_role: 'USER',
        role: 'authenticated', // Adicionar coluna role para compatibility
        name: email.split('@')[0],
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (insertError) {
      console.error('Erro ao criar usuário:', insertError);
      return {
        success: false,
        error: insertError
      };
    }
    
    return {
      success: true
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

// PersistenceManager já importado no topo do arquivo

/**
 * Função segura para logout que limpa o localStorage e notifica outras abas
 * Esta versão atualizada garante que todas as abas sejam notificadas do logout
 */
export async function secureSignOut(supabase: any) {
  try {
    // Usar a função centralizada de limpeza
    clearAuthStorage();
    
    // NOVO: Notificar outras abas sobre o logout
    // Isso fará com que o useSessionSync detecte o evento e redirecione para a página de login
    try {
      console.log('[secureSignOut] Notificando outras abas sobre logout');
      PersistenceManager.broadcastStateChange('auth.logout', true);
    } catch (broadcastError) {
      console.warn('[secureSignOut] Erro ao notificar outras abas sobre logout:', broadcastError);
      // Continuar mesmo se falhar a notificação
    }
    
    // Tentar o signOut oficial do Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Erro ao fazer logout via API Supabase:', error);
      // Mesmo com erro, já limpamos o token manualmente
      return { success: true, message: 'Logout local realizado' };
    }
    
    return { success: true, message: 'Logout completo realizado' };
  } catch (error: any) {
    console.error('Erro ao processar logout:', error);
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido ao processar logout' 
    };
  }
}

/**
 * AIDEV-NOTE: Utilitário para garantir autenticação antes de operações críticas
 * Este módulo resolve problemas de RLS verificando se o usuário está autenticado
 * antes de executar consultas que requerem contexto de tenant
 */

import { supabase } from '@/lib/supabase';
import { recoverSession, clearAuthStorage } from './authTokenManager';

/**
 * Interface para resultado de verificação de autenticação
 */
export interface AuthCheckResult {
  success: boolean;
  user?: any;
  error?: string;
}

/**
 * Verifica se o usuário está autenticado e tenta recuperar a sessão se necessário
 */
export async function ensureAuthenticated(): Promise<AuthCheckResult> {
  try {
    // 1. Verificar sessão atual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('[AuthGuard] Erro ao obter sessão:', sessionError);
      
      // Se for erro relacionado a token, tentar recuperar
      if (sessionError.message?.includes('session') || 
          sessionError.message?.includes('token') ||
          sessionError.message?.includes('Auth session missing')) {
        
        console.log('[AuthGuard] Tentando recuperar sessão...');
        const recoveryResult = await recoverSession();
        
        if (recoveryResult.success) {
          // Verificar sessão novamente após recuperação
          const { data: { session: recoveredSession }, error: recoveredError } = await supabase.auth.getSession();
          
          if (!recoveredError && recoveredSession?.user) {
            console.log('[AuthGuard] Sessão recuperada com sucesso');
            return {
              success: true,
              user: recoveredSession.user
            };
          }
        }
        
        console.error('[AuthGuard] Falha na recuperação da sessão');
        clearAuthStorage();
        return {
          success: false,
          error: 'Falha na autenticação - sessão não pôde ser recuperada'
        };
      }
      
      return {
        success: false,
        error: `Erro de sessão: ${sessionError.message}`
      };
    }
    
    // 2. Verificar se há usuário na sessão
    if (!session?.user) {
      console.warn('[AuthGuard] Usuário não encontrado na sessão');
      
      // Tentar recuperar sessão uma vez
      const recoveryResult = await recoverSession();
      if (recoveryResult.success) {
        const { data: { session: recoveredSession } } = await supabase.auth.getSession();
        if (recoveredSession?.user) {
          return {
            success: true,
            user: recoveredSession.user
          };
        }
      }
      
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }
    
    // 3. Verificar se o token não está próximo do vencimento
    if (session.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at;
      const timeUntilExpiry = expiresAt - now;
      
      // Se expira em menos de 5 minutos, renovar
      if (timeUntilExpiry < 300) {
        console.log('[AuthGuard] Token próximo do vencimento, renovando...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[AuthGuard] Erro ao renovar token:', refreshError);
          return {
            success: false,
            error: 'Falha ao renovar token de autenticação'
          };
        }
        
        if (refreshData.session?.user) {
          console.log('[AuthGuard] Token renovado com sucesso');
          return {
            success: true,
            user: refreshData.session.user
          };
        }
      }
    }
    
    // 4. Usuário autenticado e token válido
    return {
      success: true,
      user: session.user
    };
    
  } catch (error) {
    console.error('[AuthGuard] Erro inesperado na verificação de autenticação:', error);
    return {
      success: false,
      error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Força um refresh completo da sessão antes de operações críticas
 */
export async function forceSessionRefresh(): Promise<AuthCheckResult> {
  try {
    console.log('[AuthGuard] Forçando refresh completo da sessão...');
    
    // Forçar refresh da sessão
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('[AuthGuard] Erro ao forçar refresh:', refreshError);
      return {
        success: false,
        error: refreshError.message
      };
    }

    if (!refreshData?.session) {
      return {
        success: false,
        error: 'Não foi possível obter sessão válida após refresh'
      };
    }

    // Aguardar um pouco para garantir que o token seja propagado
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      user: refreshData.session.user
    };
  } catch (error) {
    console.error('[AuthGuard] Erro no refresh forçado:', error);
    return {
      success: false,
      error: `Erro interno no refresh da sessão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Executa uma função apenas se o usuário estiver autenticado
 */
export async function withAuth<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Operação requer autenticação'
): Promise<T> {
  const authCheck = await ensureAuthenticated();
  
  if (!authCheck.success) {
    throw new Error(`${errorMessage}: ${authCheck.error}`);
  }
  
  return await operation();
}

/**
 * Verifica se o usuário tem acesso a um tenant específico
 */
export async function ensureTenantAccess(tenantId: string): Promise<AuthCheckResult> {
  const authCheck = await ensureAuthenticated();
  
  if (!authCheck.success) {
    return authCheck;
  }
  
  try {
    // Verificar se o usuário tem acesso ao tenant
    const { data, error } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', authCheck.user!.id)
      .single();
    
    if (error || !data) {
      return {
        success: false,
        error: 'Usuário não tem acesso ao tenant especificado'
      };
    }
    
    return {
      success: true,
      user: authCheck.user
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Erro ao verificar acesso ao tenant: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Busca tenant por slug com verificação de autenticação
 */
export async function fetchTenantBySlugSafe(slug: string) {
  return await withAuth(async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug, active')
      .eq('slug', slug)
      .single();
    
    if (error) {
      throw new Error(`Erro ao buscar tenant: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Tenant com slug '${slug}' não encontrado`);
    }
    
    return data;
  }, 'Busca de tenant requer autenticação');
}

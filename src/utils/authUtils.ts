// =====================================================
// UTILITÁRIOS DE AUTENTICAÇÃO
// Descrição: Funções auxiliares para verificação e correção
//           de problemas de autenticação
// =====================================================

import { supabase } from '@/lib/supabase';

// Sistema de lock para prevenir condições de corrida em executeWithAuth
const operationLocks = new Map<string, Promise<any>>();

/**
 * Interface para resultado de verificação de autenticação
 */
interface AuthCheckResult {
  isAuthenticated: boolean;
  user: any | null;
  error?: string;
  needsRefresh?: boolean;
}

/**
 * Verifica se o usuário está autenticado e se o token é válido
 * @returns Promise<AuthCheckResult> - Resultado da verificação
 */
export async function checkAuthentication(): Promise<AuthCheckResult> {
  try {
    // Primeiro, verificar se há uma sessão ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Erro ao obter sessão:', sessionError);
      return {
        isAuthenticated: false,
        user: null,
        error: 'Erro ao verificar sessão: ' + sessionError.message
      };
    }

    if (!session) {
      return {
        isAuthenticated: false,
        user: null,
        error: 'Nenhuma sessão ativa encontrada'
      };
    }

    // Verificar se o token não expirou
    const now = Math.floor(Date.now() / 1000);
    const tokenExpiry = session.expires_at || 0;
    
    if (now >= tokenExpiry) {
      console.warn('Token expirado, tentando renovar...');
      
      // Tentar renovar o token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        return {
          isAuthenticated: false,
          user: null,
          error: 'Token expirado e não foi possível renovar',
          needsRefresh: true
        };
      }
      
      return {
        isAuthenticated: true,
        user: refreshData.user,
        needsRefresh: true
      };
    }

    // Verificar se o usuário ainda é válido
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        isAuthenticated: false,
        user: null,
        error: 'Usuário inválido: ' + (userError?.message || 'Usuário não encontrado')
      };
    }

    return {
      isAuthenticated: true,
      user: user
    };
    
  } catch (error) {
    console.error('Erro inesperado na verificação de autenticação:', error);
    return {
      isAuthenticated: false,
      user: null,
      error: 'Erro inesperado: ' + (error as Error).message
    };
  }
}

/**
 * Força a renovação do token de autenticação
 * @returns Promise<boolean> - True se a renovação foi bem-sucedida
 */
export async function refreshAuthToken(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      console.error('Erro ao renovar token:', error);
      return false;
    }
    
    console.log('Token renovado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro inesperado ao renovar token:', error);
    return false;
  }
}

/**
 * Verifica se o usuário tem permissão para acessar um tenant específico
 * @param tenantId - ID do tenant
 * @returns Promise<boolean> - True se o usuário tem acesso
 */
export async function checkTenantAccess(tenantId: string): Promise<boolean> {
  try {
    const authCheck = await checkAuthentication();
    
    if (!authCheck.isAuthenticated || !authCheck.user) {
      return false;
    }

    // Verificar se o usuário tem acesso ao tenant
    const { data, error } = await supabase
      .from('tenant_users')
      .select('id, role')
      .eq('user_id', authCheck.user.id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error || !data) {
      console.warn('Usuário não tem acesso ao tenant:', tenantId);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar acesso ao tenant:', error);
    return false;
  }
}

/**
 * Executa uma operação garantindo que o usuário está autenticado com proteção contra condições de corrida
 * @param operation - Função a ser executada
 * @param maxRetries - Número máximo de tentativas (padrão: 2)
 * @param operationId - ID único para a operação (opcional, para controle de lock)
 * @returns Promise<T> - Resultado da operação
 */
export async function executeWithAuth<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  operationId?: string
): Promise<T> {
  // Gerar ID único se não fornecido
  const lockId = operationId || `auth_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Se já há uma operação idêntica em andamento, aguardar
  if (operationLocks.has(lockId)) {
    console.log(`[AuthUtils] Operação ${lockId} já em andamento, aguardando...`);
    return await operationLocks.get(lockId)!;
  }
  
  const executeOperation = async (): Promise<T> => {
    let attempts = 0;
    
    try {
      while (attempts < maxRetries) {
        try {
          // Verificar autenticação antes de executar
          const authCheck = await checkAuthentication();
          
          if (!authCheck.isAuthenticated) {
            throw new Error(authCheck.error || 'Usuário não autenticado');
          }
          
          // Se o token foi renovado, aguardar um pouco para sincronização
          if (authCheck.needsRefresh) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Executar a operação
          return await operation();
          
        } catch (error) {
          attempts++;
          
          // Se for erro de autenticação e ainda há tentativas, tentar renovar token
          if (attempts < maxRetries && 
              (error as Error).message.includes('auth') || 
              (error as Error).message.includes('token') ||
              (error as Error).message.includes('Forbidden')) {
            
            console.warn(`Tentativa ${attempts} falhou, renovando token...`);
            const refreshed = await refreshAuthToken();
            
            if (!refreshed) {
              throw new Error('Não foi possível renovar o token de autenticação');
            }
            
            // Aguardar um pouco antes da próxima tentativa
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
          }
          
          // Se não é erro de auth ou esgotaram as tentativas, relançar o erro
          throw error;
        }
      }
      
      throw new Error('Número máximo de tentativas excedido');
    } finally {
      // Remover lock ao finalizar
      operationLocks.delete(lockId);
    }
  };
  
  // Armazenar a promise da operação
  const operationPromise = executeOperation();
  operationLocks.set(lockId, operationPromise);
  
  return await operationPromise;
}

/**
 * Registra um log de acesso de forma segura
 * @param action - Ação realizada
 * @param resource - Recurso acessado
 * @param tenantId - ID do tenant
 * @param details - Detalhes adicionais
 */
export async function logAccess(
  action: string,
  resource: string,
  tenantId: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await executeWithAuth(async () => {
      const authCheck = await checkAuthentication();
      
      if (!authCheck.isAuthenticated || !authCheck.user) {
        throw new Error('Usuário não autenticado para registrar log');
      }

      const { error } = await supabase.from('access_logs').insert({
        user_id: authCheck.user.id,
        action,
        resource,
        tenant_id: tenantId,
        details: details || null
      });

      if (error) {
        console.error('Erro ao registrar log de acesso:', error);
        // Não relançar o erro para não quebrar a operação principal
      }
    });
  } catch (error) {
    console.error('Erro ao registrar log de acesso:', error);
    // Não relançar o erro para não quebrar a operação principal
  }
}

/**
 * Hook para monitorar mudanças no estado de autenticação
 * @param callback - Função chamada quando o estado muda
 * @returns Função para cancelar o monitoramento
 */
export function onAuthStateChange(callback: (authenticated: boolean, user: any) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        callback(true, session.user);
      } else {
        callback(false, null);
      }
    }
  );
  
  return () => subscription.unsubscribe();
}

/**
 * Força logout e limpeza de dados usando APIs oficiais
 * AIDEV-NOTE: Atualizada para usar apenas APIs oficiais do SDK v2
 * Não remove manualmente a chave oficial - o SDK faz isso automaticamente
 */
export async function forceLogout(): Promise<void> {
  try {
    // Usar API oficial do SDK v2 - ela limpa automaticamente sb-wyehpiutzvwplllumgdk-auth-token
    await supabase.auth.signOut();
    
    // Limpar apenas chaves legadas se necessário
    if (typeof window !== 'undefined') {
      const legacyKeys = [
        'supabase.auth.token',
        'supabase.auth.refresh_token',
        'supabase.auth.access_token',
        'supabase.auth.expires_at'
      ];
      
      legacyKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`[AuthUtils] Chave legada removida: ${key}`);
        }
      });
    }
    
    console.log('[AuthUtils] Logout realizado com sucesso usando APIs oficiais');
  } catch (error) {
    console.error('[AuthUtils] Erro ao fazer logout:', error);
  }
}

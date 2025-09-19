/**
 * AIDEV-NOTE: Gerenciador de tokens de autenticação para resolver problemas de refresh token
 * Este utilitário corrige problemas comuns com o gerenciamento de sessão do Supabase,
 * incluindo refresh tokens perdidos e problemas de localStorage
 */

import { supabase } from '@/lib/supabase';
import { AuthError } from '@supabase/supabase-js';

// AIDEV-NOTE: Chaves legadas removidas - agora usando apenas API oficial do SDK v2
// As chaves abaixo foram removidas para evitar inconsistências:
// - 'supabase.auth.token' (legado)
// - 'supabase.auth.refresh_token' (legado) 
// - 'supabase.auth.access_token' (legado)
// - 'supabase.auth.expires_at' (legado)
// Agora usamos apenas supabase.auth.getSession() e a chave oficial sb-wyehpiutzvwplllumgdk-auth-token

// AIDEV-NOTE: Interface SessionData removida - SDK v2 gerencia automaticamente

/**
 * Verifica se o token está próximo do vencimento
 */
export function isTokenExpiringSoon(expiresAt: number, marginSeconds: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (expiresAt - now) <= marginSeconds;
}

/**
 * Chaves do localStorage que devem ser preservadas durante a limpeza de autenticação
 * AIDEV-NOTE: Estas chaves são essenciais para manter o contexto de tenant/portal
 * e evitar o desaparecimento de tenantId/portalType durante a hidratação
 */
const PRESERVE_KEYS = [
  'portalType',
  'tenantId', 
  'resellerId',
  'tenantName',
  'tenantSlug'
] as const;

/**
 * Chaves do localStorage relacionadas a tenant/portal que devem ser limpas apenas no logout
 * AIDEV-NOTE: Estas chaves são limpas apenas no evento SIGNED_OUT para evitar perda de contexto
 */
const TENANT_PORTAL_KEYS = [
  'portalType',
  'tenantId',
  'resellerId',
  'tenantName',
  'tenantSlug'
] as const;

/**
 * Limpa dados de autenticação legados preservando contexto de tenant/portal
 * AIDEV-NOTE: Atualizada para remover apenas chaves legadas, não toca na chave oficial do SDK v2
 * Preserva chaves essenciais para manter o contexto após logout/login
 */
export function clearAuthStorage(): void {
  try {
    // Preservar dados de tenant/portal antes da limpeza
    const preservedData: Record<string, string | null> = {};
    PRESERVE_KEYS.forEach(key => {
      preservedData[key] = localStorage.getItem(key);
    });
    
    // Chaves legadas que devem ser removidas
    const LEGACY_KEYS = [
      'supabase.auth.token',
      'supabase.auth.refresh_token',
      'supabase.auth.access_token',
      'supabase.auth.expires_at'
    ];
    
    // Limpar apenas chaves legadas
    LEGACY_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`[AuthTokenManager] Chave legada removida: ${key}`);
      }
    });
    
    // Limpar outras variações legadas de chaves de autenticação
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.startsWith('supabase.auth') && !key.includes('sb-wyehpiutzvwplllumgdk')) {
        localStorage.removeItem(key);
        console.log(`[AuthTokenManager] Chave legada adicional removida: ${key}`);
      }
    });
    
    // Restaurar dados preservados
    PRESERVE_KEYS.forEach(key => {
      if (preservedData[key] !== null) {
        localStorage.setItem(key, preservedData[key]!);
      }
    });
    
    console.log('[AuthTokenManager] Chaves legadas limpas, dados de tenant/portal preservados');
    console.log('[AuthTokenManager] Chave oficial sb-wyehpiutzvwplllumgdk-auth-token mantida');
  } catch (error) {
    console.error('[AuthTokenManager] Erro ao limpar storage:', error);
  }
}

/**
 * Limpa dados de tenant/portal do localStorage
 * AIDEV-NOTE: Esta função deve ser chamada APENAS no evento SIGNED_OUT
 * para evitar perda de contexto durante navegação ou refresh de token
 */
export function clearTenantPortalStorage(): void {
  try {
    TENANT_PORTAL_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('[AuthTokenManager] Dados de tenant/portal limpos no logout');
  } catch (error) {
    console.error('[AuthTokenManager] Erro ao limpar dados de tenant/portal:', error);
  }
}

/**
 * Limpa todos os dados de autenticação legados E tenant/portal (usado apenas no SIGNED_OUT)
 * AIDEV-NOTE: Esta função combina limpeza de auth legado + tenant/portal para logout completo
 * Preserva a chave oficial do SDK v2 que será limpa automaticamente pelo supabase.auth.signOut()
 */
export function clearAllAuthData(): void {
  try {
    // Chaves legadas que devem ser removidas
    const LEGACY_KEYS = [
      'supabase.auth.token',
      'supabase.auth.refresh_token',
      'supabase.auth.access_token',
      'supabase.auth.expires_at'
    ];
    
    // Limpar apenas chaves legadas de autenticação
    LEGACY_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`[AuthTokenManager] Chave legada removida no logout: ${key}`);
      }
    });
    
    // Limpar outras variações legadas de chaves de autenticação
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.startsWith('supabase.auth') && !key.includes('sb-wyehpiutzvwplllumgdk')) {
        localStorage.removeItem(key);
        console.log(`[AuthTokenManager] Chave legada adicional removida no logout: ${key}`);
      }
    });
    
    // Limpar dados de tenant/portal
    TENANT_PORTAL_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('[AuthTokenManager] Chaves legadas e dados de tenant/portal limpos');
    console.log('[AuthTokenManager] Chave oficial sb-wyehpiutzvwplllumgdk-auth-token será limpa pelo SDK');
  } catch (error) {
    console.error('[AuthTokenManager] Erro ao limpar todos os dados:', error);
  }
}

// AIDEV-NOTE: Funções saveSessionData e getStoredSessionData removidas
// Use supabase.auth.setSession() e supabase.auth.getSession() do SDK v2

/**
 * Força a renovação do token usando o refresh token
 * AIDEV-NOTE: Atualizada para usar supabase.auth.getSession() em vez de função depreciada
 */
export async function forceTokenRefresh(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[AuthTokenManager] Iniciando renovação forçada do token...');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.refresh_token) {
      console.error('[AuthTokenManager] Nenhum refresh token encontrado');
      return { success: false, error: 'Refresh token não encontrado' };
    }
    
    // Tentar renovar usando a API REST diretamente
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ 
        refresh_token: session.refresh_token 
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[AuthTokenManager] Erro na renovação:', data);
      return { 
        success: false, 
        error: data.error_description || data.message || 'Erro ao renovar token' 
      };
    }
    
    // Atualizar sessão no cliente Supabase usando API oficial
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    

    
    console.log('[AuthTokenManager] Token renovado com sucesso');
    return { success: true };
    
  } catch (error: any) {
    console.error('[AuthTokenManager] Erro ao renovar token:', error);
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido na renovação' 
    };
  }
}

/**
 * Verifica e renova o token se necessário
 * AIDEV-NOTE: Atualizada para usar supabase.auth.getSession() em vez de função depreciada
 */
export async function checkAndRefreshToken(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Nenhuma sessão encontrada' };
    }
    
    // Verificar se o token está próximo do vencimento
    if (session.expires_at && isTokenExpiringSoon(session.expires_at)) {
      console.log('[AuthTokenManager] Token próximo do vencimento, renovando...');
      return await forceTokenRefresh();
    }
    
    console.log('[AuthTokenManager] Token ainda válido');
    return { success: true };
    
  } catch (error: any) {
    console.error('[AuthTokenManager] Erro ao verificar token:', error);
    return { 
      success: false, 
      error: error.message || 'Erro na verificação do token' 
    };
  }
}

/**
 * Recupera sessão perdida usando dados do localStorage
 * AIDEV-NOTE: Atualizada para usar supabase.auth.getSession() em vez de função depreciada
 */
export async function recoverSession(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[AuthTokenManager] Tentando recuperar sessão...');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Nenhuma sessão armazenada encontrada' };
    }
    
    // Verificar se o token ainda é válido
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at <= now) {
      console.log('[AuthTokenManager] Token expirado, tentando renovar...');
      return await forceTokenRefresh();
    }
    
    console.log('[AuthTokenManager] Sessão já está ativa e válida');
    return { success: true };
    
  } catch (error: any) {
    console.error('[AuthTokenManager] Erro ao recuperar sessão:', error);
    return { 
      success: false, 
      error: error.message || 'Erro na recuperação da sessão' 
    };
  }
}

/**
 * Logout seguro que limpa todos os dados
 */
export async function secureLogout(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[AuthTokenManager] Iniciando logout seguro...');
    
    // Limpar storage primeiro
    clearAuthStorage();
    
    // Tentar logout via API
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.warn('[AuthTokenManager] Erro no signOut da API, mas storage já foi limpo:', signOutError);
    }
    
    console.log('[AuthTokenManager] Logout seguro concluído');
    return { success: true };
    
  } catch (error: any) {
    console.error('[AuthTokenManager] Erro no logout seguro:', error);
    return { 
      success: false, 
      error: error.message || 'Erro no logout' 
    };
  }
}

/**
 * Monitora mudanças de autenticação e gerencia tokens automaticamente
 * MODIFICADO: Desativado logout automático por inatividade
 */
export function setupAuthMonitoring(): () => void {
  console.log('[AuthTokenManager] Configurando monitoramento de autenticação (sem logout automático)...');
  
  // DEBUG: Desativado verificador periódico que poderia causar logout automático
  console.log('[AuthTokenManager] Verificador periódico de token DESATIVADO para evitar logout automático');
  
  // Manter uma referência vazia para manter a assinatura da função
  const tokenCheckInterval = 0; // interval desativado
  
  // Listener para mudanças de autenticação
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[AuthTokenManager] Mudança de estado de autenticação:', event);
    
    if (event === 'SIGNED_IN' && session) {
      // AIDEV-NOTE: SDK v2 gerencia automaticamente a sessão
      console.log('[AuthTokenManager] Usuário logado - sessão gerenciada pelo SDK');
    } else if (event === 'SIGNED_OUT') {
      // Limpar dados de autenticação legados
      clearAuthStorage();
    } else if (event === 'TOKEN_REFRESHED' && session) {
      // AIDEV-NOTE: SDK v2 gerencia automaticamente a renovação
      console.log('[AuthTokenManager] Token renovado - sessão gerenciada pelo SDK');
    }
  });
  
  // Retornar função de cleanup
  return () => {
    clearInterval(tokenCheckInterval);
    subscription.unsubscribe();
    console.log('[AuthTokenManager] Monitoramento de autenticação removido');
  };
}

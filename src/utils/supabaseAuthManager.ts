/**
 * AIDEV-NOTE: Gerenciador de autenticação padronizado para SDK v2 do Supabase
 * Este utilitário substitui o uso de chaves legadas por APIs oficiais do SDK v2
 * e implementa sincronização automática de headers com onAuthStateChange
 */

import { supabase } from '@/lib/supabase';
import axios from 'axios';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Chave oficial do SDK v2 do Supabase
 * AIDEV-NOTE: Esta é a única chave que deve ser usada pelo SDK v2
 */
const OFFICIAL_SUPABASE_KEY = 'sb-wyehpiutzvwplllumgdk-auth-token';

/**
 * Chaves legadas que devem ser removidas
 * AIDEV-NOTE: Estas chaves são do SDK v1 ou criadas manualmente e causam inconsistências
 */
const LEGACY_KEYS = [
  'supabase.auth.token',
  'supabase.auth.access_token',
  'supabase.auth.refresh_token',
  'supabase.auth.expires_at'
] as const;

/**
 * Interface para dados de sessão padronizada
 */
export interface StandardSessionData {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
}

/**
 * Obtém a sessão atual usando a API oficial do SDK v2
 * AIDEV-NOTE: Substitui leituras manuais do localStorage
 */
export async function getCurrentSession(): Promise<StandardSessionData> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[SupabaseAuthManager] Erro ao obter sessão:', error);
      return {
        session: null,
        user: null,
        isAuthenticated: false
      };
    }
    
    return {
      session,
      user: session?.user || null,
      isAuthenticated: !!session
    };
  } catch (error) {
    console.error('[SupabaseAuthManager] Erro inesperado ao obter sessão:', error);
    return {
      session: null,
      user: null,
      isAuthenticated: false
    };
  }
}

/**
 * Obtém o token de acesso atual usando a API oficial
 * AIDEV-NOTE: Substitui localStorage.getItem('supabase.auth.access_token')
 */
export async function getCurrentAccessToken(): Promise<string | null> {
  try {
    const { session } = await getCurrentSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('[SupabaseAuthManager] Erro ao obter token de acesso:', error);
    return null;
  }
}

/**
 * Remove todas as chaves legadas do localStorage
 * AIDEV-NOTE: Limpa chaves do SDK v1 e criadas manualmente para evitar inconsistências
 */
export function removeLegacyKeys(): void {
  try {
    LEGACY_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`[SupabaseAuthManager] Chave legada removida: ${key}`);
      }
    });
    
    console.log('[SupabaseAuthManager] Limpeza de chaves legadas concluída');
  } catch (error) {
    console.error('[SupabaseAuthManager] Erro ao remover chaves legadas:', error);
  }
}

/**
 * Verifica se existem chaves legadas no localStorage
 * AIDEV-NOTE: Útil para diagnóstico e migração
 */
export function hasLegacyKeys(): boolean {
  try {
    return LEGACY_KEYS.some(key => localStorage.getItem(key) !== null);
  } catch (error) {
    console.error('[SupabaseAuthManager] Erro ao verificar chaves legadas:', error);
    return false;
  }
}

/**
 * Configura sincronização automática de headers do Axios com mudanças de autenticação
 * AIDEV-NOTE: Implementa onAuthStateChange para manter headers sincronizados
 */
export function setupAxiosAuthSync(): () => void {
  try {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // AIDEV-NOTE: Filtrar eventos TOKEN_REFRESHED para evitar logs desnecessários
        // TOKEN_REFRESHED acontece automaticamente quando a aba volta ao foco - não precisa logar
        if (event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') {
          console.log(`[SupabaseAuthManager] Auth state changed: ${event}`);
        }
        
        // Atualizar headers do Axios (silenciosamente para TOKEN_REFRESHED)
        if (session?.access_token) {
          axios.defaults.headers.common.Authorization = `Bearer ${session.access_token}`;
          // AIDEV-NOTE: Não logar atualização de headers para TOKEN_REFRESHED
          if (event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') {
            console.log('[SupabaseAuthManager] Headers do Axios atualizados com novo token');
          }
        } else {
          delete axios.defaults.headers.common.Authorization;
          console.log('[SupabaseAuthManager] Headers de autorização removidos do Axios');
        }
        
        // AIDEV-NOTE: Remover chaves legadas apenas em SIGNED_IN (não em TOKEN_REFRESHED)
        // TOKEN_REFRESHED é um evento rotineiro que não requer limpeza
        if (event === 'SIGNED_IN') {
          removeLegacyKeys();
        }
      }
    );
    
    console.log('[SupabaseAuthManager] Sincronização de headers configurada');
    
    // Retornar função para cancelar a subscription
    return () => {
      subscription.unsubscribe();
      console.log('[SupabaseAuthManager] Sincronização de headers cancelada');
    };
  } catch (error) {
    console.error('[SupabaseAuthManager] Erro ao configurar sincronização:', error);
    return () => {}; // Retornar função vazia em caso de erro
  }
}

/**
 * Inicializa o gerenciador de autenticação
 * AIDEV-NOTE: Deve ser chamado na inicialização da aplicação
 */
export async function initializeAuthManager(): Promise<void> {
  try {
    console.log('[SupabaseAuthManager] Inicializando gerenciador de autenticação (sem logout automático)...');
    
    // Verificar e remover chaves legadas
    if (hasLegacyKeys()) {
      console.log('[SupabaseAuthManager] Chaves legadas detectadas, removendo...');
      removeLegacyKeys();
    }
    
    // DESABILITADO: Timer de refresh preventivo estava causando logout automático
    // O Supabase SDK v2 já gerencia refresh automático internamente
    // Múltiplas instâncias deste timer estavam conflitando e causando SIGNED_OUT
    console.log('[SupabaseAuthManager] Timer de refresh preventivo DESABILITADO - SDK gerencia automaticamente');
    
    // Configurar sincronização de headers
    setupAxiosAuthSync();
    
    // Configurar headers iniciais se já houver sessão
    const { session } = await getCurrentSession();
    if (session?.access_token) {
      axios.defaults.headers.common.Authorization = `Bearer ${session.access_token}`;
      console.log('[SupabaseAuthManager] Headers iniciais configurados');
    }
    
    console.log('[SupabaseAuthManager] Inicialização concluída');
  } catch (error) {
    console.error('[SupabaseAuthManager] Erro na inicialização:', error);
  }
}

/**
 * Força logout usando apenas APIs oficiais
 * AIDEV-NOTE: Substitui limpeza manual do localStorage
 */
export async function performSecureLogout(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[SupabaseAuthManager] Iniciando logout seguro...');
    
    // Usar API oficial do SDK v2
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[SupabaseAuthManager] Erro no logout:', error);
      return { success: false, error: error.message };
    }
    
    // Remover headers do Axios
    delete axios.defaults.headers.common.Authorization;
    
    // Remover chaves legadas se ainda existirem
    removeLegacyKeys();
    
    console.log('[SupabaseAuthManager] Logout concluído com sucesso');
    return { success: true };
  } catch (error: any) {
    console.error('[SupabaseAuthManager] Erro inesperado no logout:', error);
    return { success: false, error: error.message || 'Erro inesperado' };
  }
}

/**
 * Verifica se o usuário está autenticado usando API oficial
 * AIDEV-NOTE: Substitui verificações manuais de tokens
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const { isAuthenticated } = await getCurrentSession();
    return isAuthenticated;
  } catch (error) {
    console.error('[SupabaseAuthManager] Erro ao verificar autenticação:', error);
    return false;
  }
}

/**
 * Obtém informações do usuário atual
 * AIDEV-NOTE: Centraliza acesso aos dados do usuário
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { user } = await getCurrentSession();
    return user;
  } catch (error) {
    console.error('[SupabaseAuthManager] Erro ao obter usuário:', error);
    return null;
  }
}

/**
 * Diagnóstico do estado de autenticação
 * AIDEV-NOTE: Útil para debugging e troubleshooting
 */
export async function diagnoseAuthState(): Promise<{
  hasOfficialKey: boolean;
  hasLegacyKeys: boolean;
  legacyKeysFound: string[];
  isAuthenticated: boolean;
  sessionValid: boolean;
}> {
  try {
    const hasOfficialKey = !!localStorage.getItem(OFFICIAL_SUPABASE_KEY);
    const legacyKeysFound = LEGACY_KEYS.filter(key => localStorage.getItem(key) !== null);
    const hasLegacyKeys = legacyKeysFound.length > 0;
    const { isAuthenticated, session } = await getCurrentSession();
    
    return {
      hasOfficialKey,
      hasLegacyKeys,
      legacyKeysFound,
      isAuthenticated,
      sessionValid: !!session
    };
  } catch (error) {
    console.error('[SupabaseAuthManager] Erro no diagnóstico:', error);
    return {
      hasOfficialKey: false,
      hasLegacyKeys: false,
      legacyKeysFound: [],
      isAuthenticated: false,
      sessionValid: false
    };
  }
}

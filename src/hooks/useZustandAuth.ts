/**
 * Hook para integração do Zustand com o sistema de autenticação existente
 * 
 * Este hook demonstra como podemos migrar gradualmente do sistema baseado em Context
 * para um sistema baseado em Zustand, mantendo a compatibilidade com o código existente.
 */

import { useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook que sincroniza o estado de autenticação do Supabase com o Zustand
 * 
 * Permite migração gradual: componentes novos podem usar diretamente o store,
 * enquanto componentes existentes continuam funcionando com o Context.
 */
export function useZustandAuth() {
  // Hook existente baseado em Context
  const { user, loading, supabase } = useSupabase();
  
  // Store Zustand
  const {
    user: storeUser,
    isLoading,
    setUser,
    setLoading,
    setError,
  } = useAuthStore();
  
  // Sincronizar estado do Context com o store Zustand
  useEffect(() => {
    setUser(user);
    setLoading(loading);
    
    // Configurar listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user || null);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'USER_UPDATED') {
        setUser(session?.user || null);
      } else if (event === 'TOKEN_REFRESHED') {
        // Nada a fazer, o usuário continua o mesmo
      } else if (event === 'INITIAL_SESSION') {
        // Sessão inicial carregada
        setUser(session?.user || null);
        setLoading(false);
        console.log('[useZustandAuth] Sessão inicial carregada:', session?.user?.id);
      } else {
        console.warn('[useZustandAuth] Evento de autenticação não tratado:', event);
      }
    });
    
    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [user, loading, supabase, setUser, setLoading]);
  
  // Retorna uma combinação de valores do Context e do store
  return {
    // Valores do store
    user: storeUser,
    isLoading,
    
    // Funções do Context
    supabase,
    
    // Seletores convenientes
    isAuthenticated: !!storeUser,
    userId: storeUser?.id,
    userEmail: storeUser?.email,
  };
}

/**
 * Hook de exemplo para demonstrar como usar seletores específicos
 * 
 * Com Zustand, você pode criar hooks específicos que selecionam apenas
 * as partes do estado que são relevantes, evitando re-renderizações.
 */
export function useAuthenticationStatus() {
  // Seleciona apenas o status de autenticação, não o usuário completo
  return useAuthStore(state => ({
    isAuthenticated: !!state.user,
    isLoading: state.isLoading
  }));
}

/**
 * Hook de exemplo para demonstrar como usar apenas o ID do usuário
 * 
 * Este componente só será re-renderizado se o ID mudar, não se
 * outros detalhes do usuário (como email, role, etc) mudarem.
 */
export function useUserId() {
  return useAuthStore(state => state.user?.id);
}

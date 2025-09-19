/**
 * Hook para gerenciar autenticação com Supabase
 * 
 * Centraliza a lógica de autenticação e fornece uma interface simplificada
 * para componentes que precisam verificar o estado de autenticação.
 */

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from '@/hooks/useSupabase';
import { logInfo, logError } from '@/lib/logger';

export interface UseSupabaseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const { supabase, user, loading } = useSupabase();
  const [error, setError] = useState<Error | null>(null);

  // Função para login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        logError('[useSupabaseAuth] Erro no login:', error);
        setError(new Error(error.message));
        return false;
      }
      
      logInfo('[useSupabaseAuth] Login realizado com sucesso');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido no login';
      logError('[useSupabaseAuth] Erro inesperado no login:', err);
      setError(new Error(errorMessage));
      return false;
    }
  };

  // Função para logout
  const logout = async (): Promise<boolean> => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logError('[useSupabaseAuth] Erro no logout:', error);
        setError(new Error(error.message));
        return false;
      }
      
      logInfo('[useSupabaseAuth] Logout realizado com sucesso');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido no logout';
      logError('[useSupabaseAuth] Erro inesperado no logout:', err);
      setError(new Error(errorMessage));
      return false;
    }
  };

  // Limpar erro quando o usuário muda
  useEffect(() => {
    if (user) {
      setError(null);
    }
  }, [user]);

  return {
    user,
    isLoading: loading,
    isAuthenticated: !!user,
    error,
    login,
    logout
  };
}

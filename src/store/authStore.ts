/**
 * Store Zustand para gerenciamento global do estado de autenticação
 * 
 * Este store centraliza o estado de autenticação e oferece métodos para manipulá-lo,
 * permitindo que componentes se inscrevam apenas nas partes que interessam.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';

interface AuthState {
  // Estado
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Ações
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  initialize: () => void;
  reset: () => void;
}

/**
 * Store global de autenticação usando Zustand
 * 
 * Benefícios em relação ao Context API:
 * 1. Evita re-renderizações desnecessárias
 * 2. Permite inscrição seletiva no estado
 * 3. Fornece persistência e ferramentas de dev automaticamente
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        // Estado inicial
        user: null,
        isLoading: true,
        isInitialized: false,
        error: null,
        
        // Ações que atualizam o estado
        setUser: (user) => set({ user }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        initialize: () => set({ isInitialized: true, isLoading: false }),
        reset: () => set({ user: null, error: null }),
      }),
      {
        name: 'auth-storage', // Nome usado para persistência no localStorage
        partialize: (state) => ({ 
          // Persiste apenas o usuário, não os estados temporários
          user: state.user 
        }),
      }
    )
  )
);

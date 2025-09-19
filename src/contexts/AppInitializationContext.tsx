import { createContext, useContext, useState, useRef, ReactNode, useCallback } from 'react';

/**
 * Contexto global para gerenciar o estado de inicialização da aplicação
 * Previne múltiplas verificações simultâneas durante reativação da página
 */
interface AppInitializationContextType {
  isInitializing: boolean;
  isPageReactivating: boolean;
  initializationLock: string | null | false;
  setInitializing: (value: boolean) => void;
  setPageReactivating: (value: boolean) => void;
  acquireInitializationLock: (lockId: string) => boolean;
  releaseInitializationLock: (lockId: string) => void;
  resetInitialization: () => void;
}

const AppInitializationContext = createContext<AppInitializationContextType | undefined>(undefined);

export function AppInitializationProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPageReactivating, setIsPageReactivating] = useState(false);
  const initializationLockRef = useRef<string | null | false>(false);
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AIDEV-NOTE: Função para adquirir lock de inicialização
  // Previne múltiplas verificações simultâneas
  const acquireInitializationLock = useCallback((lockId: string): boolean => {
    if (initializationLockRef.current) {
      console.log('[AppInitialization] Lock já existe:', initializationLockRef.current);
      return false;
    }

    initializationLockRef.current = lockId;
    console.log('[AppInitialization] Lock adquirido:', lockId);

    // Auto-release após 15 segundos para evitar travamentos
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
    
    lockTimeoutRef.current = setTimeout(() => {
      if (initializationLockRef.current === lockId) {
        console.log('[AppInitialization] Auto-release do lock:', lockId);
        initializationLockRef.current = null;
      }
    }, 15000);

    return true;
  }, []);

  // AIDEV-NOTE: Função para liberar lock de inicialização
  const releaseInitializationLock = useCallback((lockId: string) => {
    if (initializationLockRef.current === lockId) {
      console.log('[AppInitialization] Lock liberado:', lockId);
      initializationLockRef.current = null;
      
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
    } else {
      console.log('[AppInitialization] Tentativa de liberar lock incorreto:', lockId, 'atual:', initializationLockRef.current);
    }
  }, []);

  /**
   * Define o estado de inicialização
   */
  const setInitializing = useCallback((value: boolean) => {
    setIsInitializing(value);
    if (process.env.NODE_ENV === 'development') {
      console.log('[AppInitialization] Estado de inicialização alterado:', value);
    }
  }, []);

  /**
   * Define o estado de reativação da página
   */
  const setPageReactivating = useCallback((value: boolean) => {
    setIsPageReactivating(value);
    if (process.env.NODE_ENV === 'development') {
      console.log('[AppInitialization] Estado de reativação alterado:', value);
    }
  }, []);

  /**
   * Reseta todos os estados de inicialização
   */
  const resetInitialization = useCallback(() => {
    setIsInitializing(false);
    setIsPageReactivating(false);
    initializationLockRef.current = null;
    
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[AppInitialization] Estados resetados');
    }
  }, []);

  const value = {
    isInitializing,
    isPageReactivating,
    initializationLock: initializationLockRef.current,
    setInitializing,
    setPageReactivating,
    acquireInitializationLock,
    releaseInitializationLock,
    resetInitialization,
  };

  return (
    <AppInitializationContext.Provider value={value}>
      {children}
    </AppInitializationContext.Provider>
  );
}

/**
 * Hook para usar o contexto de inicialização da aplicação
 */
export function useAppInitialization() {
  const context = useContext(AppInitializationContext);
  if (context === undefined) {
    throw new Error('useAppInitialization deve ser usado dentro de um AppInitializationProvider');
  }
  return context;
}

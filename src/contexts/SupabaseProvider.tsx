import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { SupabaseClient, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase';
import { 
  initializeAuthManager,
  getCurrentSession
} from '@/utils/supabaseAuthManager';

type SupabaseContextType = {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

// Export do contexto para uso em outros arquivos
export { SupabaseContext }

// Singleton robusto com Symbol único para garantir instância única
const SUPABASE_PROVIDER_SYMBOL = Symbol('SupabaseProvider.singleton');

class SupabaseProviderSingleton {
  private static instance: SupabaseProviderSingleton | null = null;
  private static instanceSymbol: symbol | null = null;
  private isInitialized = false;
  private contextCache: SupabaseContextType | null = null;
  private initializationPromise: Promise<void> | null = null;
  
  private constructor() {
    // Construtor privado para padrão singleton
  }
  
  static getInstance(): SupabaseProviderSingleton {
    if (!SupabaseProviderSingleton.instance) {
      SupabaseProviderSingleton.instance = new SupabaseProviderSingleton();
      SupabaseProviderSingleton.instanceSymbol = SUPABASE_PROVIDER_SYMBOL;
      console.log('[SupabaseProviderSingleton] Nova instância singleton criada');
    } else {
      console.log('[SupabaseProviderSingleton] Reutilizando instância singleton existente');
    }
    return SupabaseProviderSingleton.instance;
  }
  
  validateUniqueInstance(): boolean {
    if (SupabaseProviderSingleton.instanceSymbol !== SUPABASE_PROVIDER_SYMBOL) {
      console.error('[SupabaseProviderSingleton] ERRO CRÍTICO: Múltiplas instâncias detectadas! Symbol mismatch.');
      return false;
    }
    return true;
  }
  
  preventMultipleInitialization(): boolean {
    if (this.isInitialized) {
      console.warn('[SupabaseProviderSingleton] Tentativa de inicialização múltipla bloqueada automaticamente');
      return false;
    }
    this.isInitialized = true;
    return true;
  }
  
  getCachedContext(): SupabaseContextType | null {
    return this.contextCache;
  }
  
  setCachedContext(context: SupabaseContextType): void {
    this.contextCache = context;
  }
  
  getInitializationPromise(): Promise<void> | null {
    return this.initializationPromise;
  }
  
  setInitializationPromise(promise: Promise<void>): void {
    this.initializationPromise = promise;
  }
  
  reset(): void {
    this.isInitialized = false;
    this.contextCache = null;
    this.initializationPromise = null;
    console.log('[SupabaseProviderSingleton] Instância resetada');
  }
}

// Instância global do singleton
const singletonInstance = SupabaseProviderSingleton.getInstance();

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Usar a instância global do Supabase em vez de criar uma nova
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Validação robusta de instância única com singleton
  useEffect(() => {
    // Validar Symbol único
    if (!singletonInstance.validateUniqueInstance()) {
      throw new Error('[SupabaseProvider] ERRO CRÍTICO: Múltiplas instâncias detectadas via Symbol validation!');
    }
    
    // Prevenção automática de múltiplas inicializações
    if (!singletonInstance.preventMultipleInitialization()) {
      console.warn('[SupabaseProvider] Inicialização múltipla bloqueada - reutilizando instância existente');
      return;
    }
    
    console.log('[SupabaseProvider] Instância singleton validada e inicializada com sucesso');
    
    return () => {
      // Reset apenas quando o componente for desmontado
      singletonInstance.reset();
    };
  }, []);

  useEffect(() => {
    // Verificar se já existe uma inicialização em andamento
    const existingPromise = singletonInstance.getInitializationPromise();
    if (existingPromise) {
      console.log('[SupabaseProvider] Reutilizando inicialização em andamento');
      existingPromise.then(() => {
        const cachedContext = singletonInstance.getCachedContext();
        if (cachedContext) {
          setUser(cachedContext.user);
          setLoading(cachedContext.loading);
          console.log('[SupabaseProvider] Contexto restaurado do cache');
        }
      });
      return;
    }
    
    // Verificar sessão inicial com cache
    const getInitialSession = async () => {
      try {
        console.log('[SupabaseProvider] Iniciando verificação de sessão inicial');
        
        // Inicializar gerenciador de auth
        initializeAuthManager();
        
        // Usar API oficial do SDK v2 para obter sessão
        const session = await getCurrentSession();
        
        if (!session) {
          console.log('[SupabaseProvider] Nenhuma sessão encontrada');
          setUser(null);
          setLoading(false);
          
          // Cache do contexto
          singletonInstance.setCachedContext({ supabase, user: null, loading: false });
          return;
        }
        
        setUser(session.user);
        setLoading(false);
        
        // Cache do contexto com usuário
        singletonInstance.setCachedContext({ supabase, user: session.user, loading: false });
        console.log('[SupabaseProvider] Sessão inicial carregada e cacheada com sucesso');
      } catch (error) {
        console.error('[SupabaseProvider] Erro inesperado ao obter sessão inicial:', error);
        setUser(null);
        setLoading(false);
        
        // Cache do contexto com erro
        singletonInstance.setCachedContext({ supabase, user: null, loading: false });
      }
    };

    // Armazenar promise de inicialização
    const initPromise = getInitialSession();
    singletonInstance.setInitializationPromise(initPromise);
    
    initPromise;

    // Escutar mudanças na autenticação com sincronização de headers
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Log apenas em casos importantes (não INITIAL_SESSION)
        if (event !== 'INITIAL_SESSION') {
          console.log('[SupabaseProvider] Auth state changed:', event);
        }
        
        // Sincronizar headers do Axios com o token atual
        const axios = (await import('axios')).default;
        if (session?.access_token) {
          axios.defaults.headers.common.Authorization = `Bearer ${session.access_token}`;
          console.log('[SupabaseProvider] Headers do Axios sincronizados com novo token');
        } else {
          delete axios.defaults.headers.common.Authorization;
          console.log('[SupabaseProvider] Headers do Axios limpos');
        }
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('[SupabaseProvider] Token renovado automaticamente');
          setUser(session?.user ?? null);
        } else if (event === 'SIGNED_OUT') {
          console.log('[SupabaseProvider] Usuário deslogado');
          setUser(null);
        } else if (event === 'SIGNED_IN') {
          console.log('[SupabaseProvider] Usuário logado');
          setUser(session?.user ?? null);
        } else {
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [])

  // Cache de contexto com useMemo para evitar re-renderizações desnecessárias
  const contextValue = useMemo(() => {
    const value = { supabase, user, loading };
    
    // Atualizar cache no singleton
    singletonInstance.setCachedContext(value);
    
    console.log('[SupabaseProvider] Contexto atualizado:', { 
      hasUser: !!user, 
      loading, 
      timestamp: new Date().toISOString() 
    });
    
    return value;
  }, [user, loading]);

  return (
    <SupabaseContext.Provider value={contextValue}>
      {children}
    </SupabaseContext.Provider>
  )
}

// Hook useSupabase movido para src/hooks/useSupabase.ts para evitar problemas com Fast Refresh

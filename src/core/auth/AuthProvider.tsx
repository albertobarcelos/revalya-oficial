/**
 * Provedor de Autenticação para React
 * 
 * Fornece contexto de autenticação para todos os componentes da aplicação
 * e gerencia o estado de autenticação usando o AuthService.
 * 
 * @module AuthProvider
 */

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { AuthService, AuthState, AuthEventType, authService } from './AuthService';

/**
 * Contexto de autenticação para React
 */
export interface AuthContextType extends AuthState {
  /** Função para fazer login */
  login: (email: string, password: string, useBypass?: boolean) => Promise<boolean>;
  
  /** Função para fazer logout */
  logout: (notifyOtherTabs?: boolean) => Promise<boolean>;
  
  /** Função para atualizar o token de acesso */
  refreshToken: () => Promise<boolean>;
  
  /** Se o contexto foi inicializado */
  initialized: boolean;
}

// Criar contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Propriedades para o provedor de autenticação
 */
export interface AuthProviderProps {
  /** Elementos filho */
  children: React.ReactNode;
  
  /** Serviço de autenticação personalizado */
  service?: AuthService;
  
  /** Função a ser chamada quando o usuário for autenticado */
  onAuthenticated?: (user: any) => void;
  
  /** Função a ser chamada quando o usuário for desconectado */
  onLogout?: () => void;
}

/**
 * Provedor de autenticação para React
 */
export function AuthProvider({
  children,
  service = authService,
  onAuthenticated,
  onLogout
}: AuthProviderProps) {
  // Estado local para rastrear inicialização
  const [initialized, setInitialized] = useState(false);
  
  // Obter estado do serviço de autenticação
  const [state, setState] = useState<AuthState>(service.getState());
  
  // Efeito para inicialização
  useEffect(() => {
    // Atualizar estado inicial
    setState(service.getState());
    setInitialized(true);
    
    // Configurar ouvintes de eventos
    const unsubscribeLogin = service.on(AuthEventType.LOGIN, (data) => {
      setState(service.getState());
      if (onAuthenticated && service.getState().user) {
        onAuthenticated(service.getState().user);
      }
    });
    
    const unsubscribeLogout = service.on(AuthEventType.LOGOUT, () => {
      setState(service.getState());
      if (onLogout) {
        onLogout();
      }
    });
    
    const unsubscribeRefresh = service.on(AuthEventType.SESSION_REFRESHED, () => {
      setState(service.getState());
    });
    
    const unsubscribeExpired = service.on(AuthEventType.SESSION_EXPIRED, () => {
      setState(service.getState());
      if (onLogout) {
        onLogout();
      }
    });
    
    const unsubscribeError = service.on(AuthEventType.ERROR, () => {
      setState(service.getState());
    });
    
    // Cleanup
    return () => {
      unsubscribeLogin();
      unsubscribeLogout();
      unsubscribeRefresh();
      unsubscribeExpired();
      unsubscribeError();
    };
  }, [service, onAuthenticated, onLogout]);
  
  // Funções de autenticação para o contexto
  const login = async (
    email: string,
    password: string,
    useBypass: boolean = false
  ): Promise<boolean> => {
    const result = await service.login(email, password, useBypass);
    setState(service.getState());
    return result.success;
  };
  
  const logout = async (notifyOtherTabs: boolean = true): Promise<boolean> => {
    const result = await service.logout(notifyOtherTabs);
    setState(service.getState());
    return result.success;
  };
  
  const refreshToken = async (): Promise<boolean> => {
    const result = await service.refreshToken();
    setState(service.getState());
    return result.success;
  };
  
  // Memoizar o valor do contexto para evitar re-renderizações desnecessárias
  const contextValue = useMemo<AuthContextType>(() => ({
    ...state,
    login,
    logout,
    refreshToken,
    initialized
  }), [state, initialized]);
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para usar o contexto de autenticação
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}

/**
 * Hook para verificar se o usuário está autenticado
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

/**
 * Componente de proteção de rota para páginas autenticadas
 */
export function RequireAuth({ children, redirectTo = '/login' }: { children: React.ReactNode, redirectTo?: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);
  
  if (isLoading) {
    return <div>Carregando...</div>;
  }
  
  return isAuthenticated ? <>{children}</> : null;
}

// Adicionar imports necessários
import { useNavigate } from 'react-router-dom';

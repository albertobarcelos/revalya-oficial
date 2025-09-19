/**
 * Definições de tipos para os componentes de roteamento
 */

// Declarar módulos para evitar erros de importação
declare module '@/hooks/useSupabaseAuth' {
  export interface UseSupabaseAuthReturn {
    user: any;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: Error | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<boolean>;
  }
  
  export function useSupabaseAuth(): UseSupabaseAuthReturn;
}

declare module '@/contexts/SupabaseProvider' {
  import { SupabaseClient, User } from '@supabase/supabase-js';
  
  export interface SupabaseContextType {
    supabase: SupabaseClient;
    user: User | null;
    loading: boolean;
  }
  
  export function useSupabase(): SupabaseContextType;
  
  export function SupabaseProvider({ children }: { children: React.ReactNode }): JSX.Element;
}

declare module '@/core/auth/AuthProvider' {
  export interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: any;
    session: any;
    error: string | null;
    login: (email: string, password: string, useBypass?: boolean) => Promise<boolean>;
    logout: (notifyOtherTabs?: boolean) => Promise<boolean>;
    refreshToken: () => Promise<boolean>;
    initialized: boolean;
  }
  
  export interface AuthProviderProps {
    children: React.ReactNode;
    service?: any;
    onAuthenticated?: (user: any) => void;
    onLogout?: () => void;
  }
  
  export function AuthProvider(props: AuthProviderProps): JSX.Element;
  export function useAuth(): AuthContextType;
  export function useIsAuthenticated(): boolean;
}

declare module '@/core/auth/AuthService' {
  export enum AuthEventType {
    LOGIN = 'login',
    LOGOUT = 'logout',
    SESSION_REFRESHED = 'session_refreshed',
    SESSION_EXPIRED = 'session_expired',
    ERROR = 'error'
  }
  
  export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: any;
    session: any;
    error: string | null;
  }
  
  export class AuthService {
    getState(): AuthState;
    login(email: string, password: string, useBypass?: boolean): Promise<any>;
    logout(notifyOtherTabs?: boolean): Promise<any>;
    refreshToken(): Promise<any>;
    on(eventType: AuthEventType, callback: (data: any) => void): () => void;
    off(eventType: AuthEventType, callback: (data: any) => void): void;
    getAdapter(): any;
  }
  
  export const authService: AuthService;
}

declare module '@/hooks/useTenantContext' {
  export interface UseTenantContextReturn {
    tenant: any;
    isLoading: boolean;
    error: Error | null;
    switchTenant: (slug: string) => Promise<boolean>;
  }
  
  export function useTenantContext(slug?: string): UseTenantContextReturn;
}

declare module '@/lib/logger' {
  export function logInfo(message: string, data?: any): void;
  export function logError(message: string, data?: any): void;
  export function logDebug(message: string, data?: any): void;
  export function logWarn(message: string, data?: any): void;
}

declare module '@/core/tenant/TenantProvider' {
  export interface TenantProviderProps {
    children: React.ReactNode;
    service?: any;
    onTenantChange?: (tenant: any) => void;
  }
  
  export function TenantProvider(props: TenantProviderProps): JSX.Element;
}

declare module '@/core/tenant/TenantService' {
  export const tenantService: {
    initialize: (userId: string) => Promise<any>;
    switchTenant: (tenantId: string, userId: string) => Promise<any>;
    switchTenantBySlug: (slug: string, userId: string) => Promise<any>;
    clearCurrentTenant: () => void;
    isTenantActive: (tenantId: string) => Promise<boolean>;
    getContext: () => any;
    on: (event: string, callback: (data: any) => void) => () => void;
    off: (event: string, callback: (data: any) => void) => void;
  };
}

// Declarar módulos para componentes de roteamento
declare module './TenantRoutes' {
  export function TenantRoutes(): JSX.Element;
}

declare module './AdminRoutes' {
  export interface AdminRoutesProps {
    userRole?: string | null;
  }
  
  export function AdminRoutes(props: AdminRoutesProps): JSX.Element;
}

// Declarar módulos para páginas
declare module '@/pages/auth/Login' {
  const Login: React.ComponentType;
  export default Login;
}

declare module '@/pages/auth/Register' {
  const Register: React.ComponentType;
  export default Register;
}

declare module '@/pages/auth/ResetPassword' {
  const ResetPassword: React.ComponentType;
  export default ResetPassword;
}

declare module '@/pages/RequestUpdate' {
  const RequestUpdate: React.ComponentType;
  export default RequestUpdate;
}

declare module '@/pages/auth/InvalidLink' {
  const InvalidLink: React.ComponentType;
  export default InvalidLink;
}

declare module '@/pages/portal-selection' {
  const PortalSelectionPage: React.ComponentType;
  export default PortalSelectionPage;
}

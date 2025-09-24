/**
 * Hook personalizado para autenticação segura com JWT
 * Sistema Revalya - Implementação de Custom Claims e Monitoramento
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { 
  UserRole, 
  Permission, 
  AuthEventType, 
  AuthData, 
  AuthError, 
  SecurityStats,
  RefreshTokenData,
  AUTH_CONSTANTS,
  AUTH_ERROR_CODES,
  generateDeviceFingerprint,
  getClientIP,
  getRiskLevel
} from '../types/auth';

/**
 * Interface para o estado de autenticação
 */
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthData['user'] | null;
  error: AuthError | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Interface para estatísticas de segurança do usuário
 */
interface UserSecurityStats {
  lastLogin: string | null;
  failedAttempts: number;
  riskScore: number;
  deviceCount: number;
}

/**
 * Hook principal para autenticação segura
 */
export function useSecureAuth() {
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
    riskLevel: 'LOW'
  });
  
  const [deviceFingerprint] = useState(() => generateDeviceFingerprint());
  
  // Refs para controle de condições de corrida
  const refreshInProgressRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  /**
   * Registra evento de autenticação no sistema de monitoramento
   */
  const logAuthEvent = useCallback(async (
    eventType: AuthEventType,
    email?: string,
    additionalDetails?: Record<string, any>
  ) => {
    try {
      const ipAddress = await getClientIP();
      
      await supabase.rpc('log_auth_event', {
        p_user_id: user?.id || null,
        p_email: email || user?.email || null,
        p_event_type: eventType,
        p_ip_address: ipAddress,
        p_user_agent: navigator.userAgent,
        p_details: additionalDetails || {}
      });
    } catch (error) {
      console.error('Erro ao registrar evento de autenticação:', error);
    }
  }, [supabase, user]);

  /**
   * Login seguro com monitoramento
   */
  const loginWithMonitoring = useCallback(async (
    email: string, 
    password: string
  ): Promise<{ success: boolean; error?: AuthError }> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        await logAuthEvent('LOGIN_FAILED', email, { error: error.message });
        
        const authError: AuthError = {
          code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Credenciais inválidas',
          details: { originalError: error.message }
        };
        
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: authError 
        }));
        
        return { success: false, error: authError };
      }
      
      if (data.user) {
        await logAuthEvent('LOGIN_SUCCESS', email);
        
        // Criar refresh token seguro
        await supabase.rpc('create_refresh_token', {
          p_user_id: data.user.id,
          p_token: data.session?.refresh_token || '',
          p_device_fingerprint: deviceFingerprint,
          p_expires_hours: 168 // 7 dias
        });
        
        setAuthState(prev => ({ 
          ...prev, 
          isAuthenticated: true,
          isLoading: false,
          user: data.user as AuthData['user'],
          error: null
        }));
        
        return { success: true };
      }
      
      return { success: false };
    } catch (error) {
      await logAuthEvent('LOGIN_FAILED', email, { error: String(error) });
      
      const authError: AuthError = {
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Erro interno do servidor',
        details: { error: String(error) }
      };
      
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: authError 
      }));
      
      return { success: false, error: authError };
    }
  }, [supabase, logAuthEvent, deviceFingerprint]);

  /**
   * Logout seguro com limpeza de tokens
   */
  const logoutSecure = useCallback(async (): Promise<void> => {
    try {
      if (user?.id) {
        // Revogar refresh tokens
        await supabase.rpc('revoke_refresh_tokens', {
          p_user_id: user.id,
          p_device_fingerprint: deviceFingerprint,
          p_reason: 'USER_LOGOUT'
        });
        
        await logAuthEvent('LOGOUT');
      }
      
      await supabase.auth.signOut();
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        riskLevel: 'LOW'
      });
    } catch (error) {
      console.error('Erro durante logout:', error);
    }
  }, [supabase, user, logAuthEvent, deviceFingerprint]);

  /**
   * Verifica se o usuário tem uma role específica
   */
  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.user_metadata?.user_role === role;
  }, [user]);

  /**
   * Verifica se o usuário tem acesso a um tenant específico
   */
  const hasTenantAccess = useCallback((tenantId: string): boolean => {
    return user?.user_metadata?.tenant_id === tenantId;
  }, [user]);

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const hasPermission = useCallback((permission: Permission): boolean => {
    const permissions = user?.user_metadata?.permissions || [];
    return permissions.includes(permission);
  }, [user]);

  /**
   * Verifica se o usuário tem pelo menos uma das permissões
   */
  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    const userPermissions = user?.user_metadata?.permissions || [];
    return permissions.some(permission => userPermissions.includes(permission));
  }, [user]);

  /**
   * Verifica se o usuário tem todas as permissões
   */
  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    const userPermissions = user?.user_metadata?.permissions || [];
    return permissions.every(permission => userPermissions.includes(permission));
  }, [user]);

  /**
   * Obtém estatísticas de segurança do usuário
   */
  const getUserSecurityStats = useCallback(async (): Promise<UserSecurityStats | null> => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase.rpc('get_security_stats', {
        p_user_id: user.id,
        p_hours: 24
      });
      
      if (error) throw error;
      
      return {
        lastLogin: data?.last_login || null,
        failedAttempts: data?.failed_attempts || 0,
        riskScore: data?.avg_risk_score || 0,
        deviceCount: data?.unique_devices || 0
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de segurança:', error);
      return null;
    }
  }, [supabase, user]);

  /**
   * Valida a integridade do JWT atual
   */
  const validateJWTIntegrity = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_jwt_integrity');
      
      if (error) {
        console.error('Erro na validação JWT:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Erro na validação JWT:', error);
      return false;
    }
  }, [supabase]);

  /**
   * Atualiza o refresh token com proteção contra condições de corrida
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    // Se já há um refresh em andamento, aguardar o resultado
    if (refreshInProgressRef.current && refreshPromiseRef.current) {
      console.log('[useSecureAuth] Refresh já em andamento, aguardando...');
      return await refreshPromiseRef.current;
    }
    
    // Marcar refresh como em andamento
    refreshInProgressRef.current = true;
    
    const refreshOperation = async (): Promise<boolean> => {
      try {
        // Verificar se há sessão antes de tentar renovar
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
          console.log('[useSecureAuth] Nenhuma sessão encontrada para renovar');
          return false;
        }
        
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          await logAuthEvent('TOKEN_REFRESH', undefined, { error: error.message });
          return false;
        }
        
        if (data.session) {
          // Atualizar refresh token seguro
          await supabase.rpc('create_refresh_token', {
            p_user_id: data.user?.id || '',
            p_token: data.session.refresh_token,
            p_device_fingerprint: deviceFingerprint,
            p_expires_hours: 168
          });
          
          await logAuthEvent('TOKEN_REFRESH');
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('Erro ao atualizar token:', error);
        return false;
      } finally {
        // Limpar estado do lock
        refreshInProgressRef.current = false;
        refreshPromiseRef.current = null;
      }
    };
    
    // Criar e armazenar a promise
    refreshPromiseRef.current = refreshOperation();
    return await refreshPromiseRef.current;
  }, [supabase, logAuthEvent, deviceFingerprint]);

  /**
   * Monitora atividade suspeita
   */
  const checkSuspiciousActivity = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const stats = await getUserSecurityStats();
      
      if (stats) {
        const riskLevel = getRiskLevel(stats.riskScore);
        
        setAuthState(prev => ({ ...prev, riskLevel }));
        
        // Se o risco for alto, registrar evento
        if (stats.riskScore >= 70) {
          await logAuthEvent('SUSPICIOUS_ACTIVITY', undefined, {
            riskScore: stats.riskScore,
            failedAttempts: stats.failedAttempts
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar atividade suspeita:', error);
    }
  }, [user, getUserSecurityStats, logAuthEvent]);

  // Efeito para monitorar mudanças no usuário
  useEffect(() => {
    if (user) {
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        user: user as AuthData['user'],
        error: null
      }));
      
      // Verificar atividade suspeita periodicamente
      checkSuspiciousActivity();
    } else {
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
        user: null
      }));
    }
  }, [user, checkSuspiciousActivity]);

  // Efeito para refresh automático do token
  useEffect(() => {
    if (!authState.isAuthenticated) return;
    
    const interval = setInterval(() => {
      refreshToken();
    }, AUTH_CONSTANTS.TOKEN_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [authState.isAuthenticated, refreshToken]);

  // Efeito para verificação periódica de segurança
  useEffect(() => {
    if (!authState.isAuthenticated) return;
    
    const interval = setInterval(() => {
      checkSuspiciousActivity();
    }, AUTH_CONSTANTS.SESSION_CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, [authState.isAuthenticated, checkSuspiciousActivity]);

  return {
    // Estado
    ...authState,
    
    // Métodos de autenticação
    login: loginWithMonitoring,
    logout: logoutSecure,
    refreshToken,
    
    // Verificações de permissão
    hasRole,
    hasTenantAccess,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Segurança
    validateJWTIntegrity,
    getUserSecurityStats,
    checkSuspiciousActivity,
    
    // Utilitários
    logAuthEvent,
    deviceFingerprint
  };
}

/**
 * Hook para verificações de permissão simplificadas
 */
export function usePermissions() {
  const { hasRole, hasPermission, hasAnyPermission, hasAllPermissions, user } = useSecureAuth();
  
  return {
    // Verificações de role
    isAdmin: hasRole('ADMIN'),
    isPlatformAdmin: hasRole('PLATFORM_ADMIN'),
    isTenantAdmin: hasRole('TENANT_ADMIN'),
    isManager: hasRole('MANAGER'),
    isTenantUser: hasRole('TENANT_USER'),
    isViewer: hasRole('VIEWER'),
    
    // Verificações de permissão por módulo
    canReadContracts: hasPermission('read:contracts'),
    canWriteContracts: hasPermission('write:contracts'),
    canDeleteContracts: hasPermission('delete:contracts'),
    
    canReadCustomers: hasPermission('read:customers'),
    canWriteCustomers: hasPermission('write:customers'),
    canDeleteCustomers: hasPermission('delete:customers'),
    
    canReadBillings: hasPermission('read:billings'),
    canWriteBillings: hasPermission('write:billings'),
    
    canReadReports: hasPermission('read:reports'),
    canWriteReports: hasPermission('write:reports'),
    
    canAdminUsers: hasPermission('admin:users'),
    canAdminTenants: hasPermission('admin:tenants'),
    canAdminSystem: hasPermission('admin:system'),
    
    // Verificações compostas
    canManageContracts: hasAnyPermission(['write:contracts', 'delete:contracts']),
    canManageCustomers: hasAnyPermission(['write:customers', 'delete:customers']),
    canManageSystem: hasAnyPermission(['admin:users', 'admin:tenants', 'admin:system']),
    
    // Dados do usuário
    currentRole: user?.user_metadata?.user_role,
    currentTenantId: user?.user_metadata?.tenant_id,
    currentPermissions: user?.user_metadata?.permissions || [],
    
    // Métodos originais
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}

/**
 * Hook para monitoramento de segurança
 */
export function useSecurityMonitoring() {
  const { getUserSecurityStats, checkSuspiciousActivity, riskLevel } = useSecureAuth();
  const [securityStats, setSecurityStats] = useState<UserSecurityStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  /**
   * Carrega estatísticas de segurança
   */
  const loadSecurityStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const stats = await getUserSecurityStats();
      setSecurityStats(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getUserSecurityStats]);
  
  // Carrega estatísticas na inicialização
  useEffect(() => {
    loadSecurityStats();
  }, [loadSecurityStats]);
  
  return {
    securityStats,
    riskLevel,
    isLoading,
    loadSecurityStats,
    checkSuspiciousActivity
  };
}

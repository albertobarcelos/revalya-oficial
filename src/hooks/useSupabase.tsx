// =====================================================
// SUPABASE HOOK
// Descrição: Hook principal para integração com Supabase
// =====================================================

import React, { useContext, useCallback } from 'react';
import { SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { supabase } from '../lib/supabase';
import { SupabaseContext, SupabaseContextType } from '../contexts/SupabaseProvider';

// Tipos para autenticação
export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
  role?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
  accessToken: string;
  refreshToken: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  phone?: string;
  preferences?: Record<string, any>;
}

// Tipos exportados para uso em outros arquivos (mantidos para compatibilidade)

// Hook para usar o contexto do Supabase (importado do SupabaseProvider principal)
export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  
  if (context === undefined) {
    throw new Error('useSupabase deve ser usado dentro de um SupabaseProvider');
  }
  
  return context;
};

// =====================================================
// SUPABASE UTILITIES HOOK
// =====================================================

interface UseSupabaseUtilitiesReturn {
  // Storage utilities
  uploadFile: (bucket: string, path: string, file: File) => Promise<{ url: string | null; error: Error | null }>;
  deleteFile: (bucket: string, path: string) => Promise<{ error: Error | null }>;
  getPublicUrl: (bucket: string, path: string) => string;
  
  // Database utilities
  executeRPC: (functionName: string, params?: Record<string, any>) => Promise<{ data: any; error: Error | null }>;
  
  // Real-time utilities
  subscribeToTable: (
    table: string,
    callback: (payload: any) => void,
    filter?: string
  ) => () => void;
  
  // Utility functions
  formatError: (error: any) => string;
  isOnline: () => boolean;
  getTenantId: () => string | null;
  getUserRole: () => string | null;
  hasPermission: (permission: string) => boolean;
}

export const useSupabaseUtilities = (): UseSupabaseUtilitiesReturn => {
  const { user, session } = useSupabase();

  const uploadFile = useCallback(async (
    bucket: string,
    path: string,
    file: File
  ): Promise<{ url: string | null; error: Error | null }> => {
    try {
      // Upload do arquivo
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return { url: publicUrl, error: null };
    } catch (err) {
      return { url: null, error: err as Error };
    }
  }, []);

  const deleteFile = useCallback(async (
    bucket: string,
    path: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const getPublicUrl = useCallback((bucket: string, path: string): string => {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return publicUrl;
  }, []);

  const executeRPC = useCallback(async (
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<{ data: any; error: Error | null }> => {
    try {
      const { data, error } = await supabase.rpc(functionName, params);

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }, []);

  const subscribeToTable = useCallback((
    table: string,
    callback: (payload: any) => void,
    filter?: string
  ): (() => void) => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatError = useCallback((error: any): string => {
    if (!error) return 'Erro desconhecido';
    
    if (typeof error === 'string') return error;
    
    if (error.message) {
      // Traduzir erros comuns do Supabase
      const translations: Record<string, string> = {
        'Invalid login credentials': 'Credenciais de login inválidas',
        'Email not confirmed': 'E-mail não confirmado',
        'User not found': 'Usuário não encontrado',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
        'Unable to validate email address: invalid format': 'Formato de e-mail inválido',
        'Database error saving new user': 'Erro ao salvar novo usuário',
        'User already registered': 'Usuário já cadastrado',
        'Token has expired or is invalid': 'Token expirado ou inválido',
        'Network request failed': 'Falha na conexão de rede',
      };
      
      return translations[error.message] || error.message;
    }
    
    return 'Erro desconhecido';
  }, []);

  const isOnline = useCallback((): boolean => {
    return navigator.onLine;
  }, []);

  const getTenantId = useCallback((): string | null => {
    return user?.user_metadata?.tenant_id || null;
  }, [user]);

  const getUserRole = useCallback((): string | null => {
    return user?.user_metadata?.role || null;
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    const userRole = getUserRole();
    
    if (!userRole) return false;
    
    // Definir permissões por role
    const rolePermissions: Record<string, string[]> = {
      SUPER_ADMIN: ['*'], // Todas as permissões
      ADMIN: [
        'financial.read',
        'financial.write',
        'contracts.read',
        'contracts.write',
        'reports.read',
        'reports.write',
        'notifications.read',
        'notifications.write',
        'users.read',
        'users.write',
        'settings.read',
        'settings.write',
      ],
      MANAGER: [
        'financial.read',
        'financial.write',
        'contracts.read',
        'contracts.write',
        'reports.read',
        'notifications.read',
        'users.read',
      ],
      USER: [
        'financial.read',
        'contracts.read',
        'reports.read',
        'notifications.read',
      ],
    };

    const permissions = rolePermissions[userRole] || [];
    
    // Super admin tem todas as permissões
    if (permissions.includes('*')) return true;
    
    // Verificar permissão específica
    return permissions.includes(permission);
  }, [getUserRole]);

  return {
    uploadFile,
    deleteFile,
    getPublicUrl,
    executeRPC,
    subscribeToTable,
    formatError,
    isOnline,
    getTenantId,
    getUserRole,
    hasPermission,
  };
};

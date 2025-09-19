import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TenantSessionManager, type TenantSession } from '@/lib/TenantSessionManager';

/**
 * Interface para dados de criação de sessão
 */
export interface CreateTenantSessionData {
  tenantSlug: string;
  code?: string; // Para compatibilidade com sistema atual
}

/**
 * Interface para resposta da criação de sessão
 */
export interface CreateTenantSessionResponse {
  success: boolean;
  session?: TenantSession;
  error?: string;
}

/**
 * Hook para criar sessão de tenant inspirado na Omie
 * Cria refresh token de longa duração no localStorage
 * Permite acesso direto via URL sem códigos
 */
export function useCreateTenantSession() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cria uma nova sessão de tenant
   */
  const createSession = async (data: CreateTenantSessionData): Promise<CreateTenantSessionResponse> => {
    setIsCreating(true);
    setError(null);

    try {
      // Obter usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se já existe sessão válida
      const existingSession = TenantSessionManager.getTenantSession(user.id, user.email || '', data.tenantSlug);
      if (existingSession && !TenantSessionManager.isTokenExpired(existingSession.expiresAt)) {
        // Ativar sessão existente na aba atual
        TenantSessionManager.setCurrentSession(data.tenantSlug);
        
        return {
          success: true,
          session: existingSession
        };
      }

      // Criar nova sessão via Edge Function v3
      const userToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (!userToken) throw new Error('Token de usuário não encontrado');

      const response = await supabase.functions.invoke('create-tenant-session-v3', {
        body: {
          tenantId: data.tenantSlug, // Usar slug como ID
          tenantSlug: data.tenantSlug,
          userId: user.id,
          userEmail: user.email || ''
        },
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });

      if (response.error) {
        const errorMessage = response.error.message || 'Erro ao criar sessão de tenant';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }

      const sessionData = response.data as TenantSession;

      // Salvar sessão no localStorage
      TenantSessionManager.saveTenantSession(sessionData);

      // Ativar sessão na aba atual
      TenantSessionManager.setCurrentSession(data.tenantSlug);

      return {
        success: true,
        session: sessionData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Cria sessão e abre em nova aba (para portal)
   */
  const createSessionAndOpenTab = async (tenantSlug: string): Promise<boolean> => {
    try {
      const result = await createSession({ tenantSlug });
      
      if (result.success) {
        // Abrir nova aba com URL limpa
        const url = `/${tenantSlug}/dashboard`;
        window.open(url, '_blank');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[useCreateTenantSession] Erro ao abrir nova aba:', error);
      return false;
    }
  };

  /**
   * Ativa sessão existente na aba atual
   */
  const activateExistingSession = async (tenantSlug: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const session = TenantSessionManager.getTenantSession(user.id, user.email || '', tenantSlug);
      if (session && !TenantSessionManager.isTokenExpired(session.expiresAt)) {
        // Ativar sessão na aba atual
        TenantSessionManager.setCurrentSession(tenantSlug);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[activateExistingSession] Erro:', error);
      return false;
    }
  };

  /**
   * Limpa erro atual
   */
  const clearError = () => {
    setError(null);
  };

  return {
    createSession,
    createSessionAndOpenTab,
    activateExistingSession,
    isCreating,
    error,
    clearError
  };
}

import { useState } from 'react';
import { TenantSessionManager } from '@/lib/TenantSessionManager';

/**
 * Interface para dados de revogação de sessão
 */
export interface RevokeTenantSessionData {
  tenantSlug: string;
  reason?: string;
}

/**
 * Interface para resposta da revogação
 */
export interface RevokeTenantSessionResponse {
  success: boolean;
  error?: string;
}

/**
 * Hook para revogar sessões de tenant
 * Permite logout seguro e revogação de refresh tokens
 */
export function useRevokeTenantSession() {
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Revoga uma sessão específica de tenant
   */
  const revokeSession = async (data: RevokeTenantSessionData): Promise<RevokeTenantSessionResponse> => {
    setIsRevoking(true);
    setError(null);

    try {
      const success = await TenantSessionManager.revokeSession(data.tenantSlug, data.reason);

      if (!success) {
        const errorMessage = 'Erro ao revogar sessão de tenant';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }

      return {
        success: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsRevoking(false);
    }
  };

  /**
   * Revoga sessão atual da aba
   */
  const revokeCurrentSession = async (reason?: string): Promise<boolean> => {
    const currentSlug = TenantSessionManager.getCurrentSessionSlug();
    
    if (!currentSlug) {
      return true; // Não há sessão ativa
    }

    const result = await revokeSession({ tenantSlug: currentSlug, reason });
    return result.success;
  };

  /**
   * Revoga todas as sessões (logout completo)
   */
  const revokeAllSessions = async (reason?: string): Promise<boolean> => {
    setIsRevoking(true);
    setError(null);

    try {
      const sessions = TenantSessionManager.getValidSessions();
      const revokePromises = Object.keys(sessions).map(slug => 
        TenantSessionManager.revokeSession(slug, reason || 'logout_all')
      );

      await Promise.all(revokePromises);
      
      // Limpar localStorage completamente
      TenantSessionManager.clearAllSessions();
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao revogar todas as sessões';
      setError(errorMessage);
      return false;
    } finally {
      setIsRevoking(false);
    }
  };

  /**
   * Remove sessão localmente (sem chamar Edge Function)
   * Útil quando o refresh token já expirou
   */
  const removeSessionLocally = (tenantSlug: string): void => {
    TenantSessionManager.removeSession(tenantSlug);
  };

  /**
   * Limpa sessão atual da aba (sem revogar no servidor)
   */
  const clearCurrentSession = (): void => {
    TenantSessionManager.clearCurrentSession();
  };

  /**
   * Limpa erro atual
   */
  const clearError = () => {
    setError(null);
  };

  return {
    revokeSession,
    revokeCurrentSession,
    revokeAllSessions,
    removeSessionLocally,
    clearCurrentSession,
    isRevoking,
    error,
    clearError
  };
}

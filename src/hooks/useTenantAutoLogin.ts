/**
 * Hook de Auto-Login Multi-Tenant inspirado na arquitetura da Omie
 * 
 * Implementa sistema de refresh tokens por tenant armazenados no localStorage
 * permitindo URLs limpas e acesso direto sem códigos na URL.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TenantSessionManager, type TenantSession, type TenantData } from '@/lib/TenantSessionManager';
import { supabase } from '@/lib/supabase';

/**
 * Hook para auto-login de tenant inspirado na Omie
 * Permite acesso direto via URL sem códigos
 */
export function useTenantAutoLogin(tenantSlug?: string) {
  const [isValidating, setIsValidating] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const navigate = useNavigate();
  const params = useParams();
  
  // Usar slug do parâmetro se não fornecido
  const slug = tenantSlug || params.slug;

  useEffect(() => {
    if (!slug) {
      setIsValidating(false);
      return;
    }

    validateTenantSession(slug);
  }, [slug]);

  /**
   * Valida sessão de tenant
   */
  const validateTenantSession = async (tenantSlug: string) => {
    try {
      setIsValidating(true);

      // Obter usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[useTenantAutoLogin] Usuário não autenticado');
        navigate('/login');
        return;
      }

      // Verificar se há sessão válida no localStorage
      const session = TenantSessionManager.getTenantSession(user.id, user.email || '', tenantSlug);
      
      if (!session) {
        console.log('[useTenantAutoLogin] Sem sessão para tenant:', tenantSlug);
        navigate('/meus-aplicativos');
        return;
      }

      // Verificar se a sessão está expirada
      if (TenantSessionManager.isTokenExpired(session.expiresAt)) {
        console.log('[useTenantAutoLogin] Sessão expirada para tenant:', tenantSlug);
        TenantSessionManager.removeTenantSession(user.id, user.email || '', tenantSlug);
        navigate('/meus-aplicativos');
        return;
      }

      // Verificar se access token precisa ser renovado (assumindo 1 hora de validade)
      const accessTokenExpiry = session.lastAccess + (60 * 60 * 1000); // 1 hora
      if (Date.now() > accessTokenExpiry) {
        console.log('[useTenantAutoLogin] Renovando access token para tenant:', tenantSlug);
        const renewed = await TenantSessionManager.refreshAccessToken(user.id, user.email || '', tenantSlug);
        
        if (!renewed) {
          console.log('[useTenantAutoLogin] Falha ao renovar token para tenant:', tenantSlug);
          TenantSessionManager.removeTenantSession(user.id, user.email || '', tenantSlug);
          navigate('/meus-aplicativos');
          return;
        }
      }

      // Ativar sessão na aba atual
      TenantSessionManager.setCurrentSession(tenantSlug);
      
      setTenantData({
        id: session.tenantId,
        slug: session.tenantSlug,
        name: session.tenantSlug // Usar slug como nome temporariamente
      });
      
      setHasValidSession(true);

    } catch (error) {
      console.error('[useTenantAutoLogin] Erro na validação:', error);
      navigate('/meus-aplicativos');
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Força revalidação da sessão
   */
  const revalidateSession = () => {
    if (slug) {
      validateTenantSession(slug);
    }
  };

  /**
   * Limpa sessão atual e redireciona
   */
  const clearSessionAndRedirect = async () => {
    if (slug) {
      // Obter usuário para remover sessão corretamente
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        TenantSessionManager.removeTenantSession(user.id, user.email || '', slug);
      }
    }
    TenantSessionManager.clearCurrentSession();
    navigate('/meus-aplicativos');
  };

  return {
    isValidating,
    hasValidSession,
    tenantData,
    revalidateSession,
    clearSessionAndRedirect
  };
}

/**
 * Função para renovar token de tenant via Edge Function V2
 */
async function refreshTenantToken(refreshToken: string, tenantSlug: string): Promise<TenantSession | null> {
  try {
    const response = await supabase.functions.invoke('refresh-tenant-token-v3', {
      body: { 
        refreshToken,
        tenantSlug 
      }
    });

    if (response.error) {
      console.error('[RefreshToken] Erro:', response.error);
      return null;
    }

    return response.data as TenantSession;
  } catch (error) {
    console.error('[RefreshToken] Erro na renovação:', error);
    return null;
  }
}

/**
 * Hook para criar nova sessão de tenant (usado no portal)
 */
export function useCreateTenantSession() {
  const createSession = async (tenantId: string, tenantSlug: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const userToken = TenantSessionManager.getUserToken();
      if (!userToken) throw new Error('Token de usuário não encontrado');

      const response = await supabase.functions.invoke('create-tenant-session-v3', {
        body: { 
          tenantId,
          tenantSlug,
          userId: user.id,
          userEmail: user.email || ''
        },
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const session = response.data as TenantSession;
      TenantSessionManager.saveTenantSession(session);
      
      return session;
    } catch (error) {
      console.error('[CreateTenantSession] Erro:', error);
      throw error;
    }
  };

  return { createSession };
}

/**
 * Hook para gerenciar o acesso a tenants usando o novo fluxo de one-time code
 * com emissão de JWT via Edge Function
 */

import { useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from '@/components/ui/use-toast';

// URL base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

// Chaves de armazenamento no sessionStorage
const STORAGE_KEYS = {
  TENANT_TOKEN: (slug: string) => `revalya:token:${slug}`,
  TENANT_SLUG: 'revalya:tenantSlug'
};

export interface TenantAccessCode {
  code: string;
  tenant_id: string;
  tenant_slug: string;
  expires_at: string;
}

/**
 * Obtém o token de autenticação atual do usuário
 */
async function getAuthToken(supabaseClient: any): Promise<string> {
  try {
    // Usar a API do Supabase para obter o token da sessão atual
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('Erro ao obter sessão:', error);
      return '';
    }
    
    return session?.access_token || '';
  } catch (e) {
    console.error('Erro ao obter token de autenticação:', e);
    return '';
  }
}

export function useTenantAccess() {
  const { supabase } = useSupabase();
  const { toast } = useToast();

  /**
   * Gera um código de acesso para um tenant específico
   */
  const generateAccessCode = useCallback(async (tenantId: string) => {
    try {
      if (!supabase) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Verificar se o usuário está autenticado
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }
      
      if (!sessionData.session || !sessionData.session.access_token) {
        throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
      }
      
      console.log('[useTenantAccess] Gerando código de acesso. Usuário autenticado:', sessionData.session.user.id);
      console.log('[useTenantAccess] Token presente:', !!sessionData.session.access_token);
      
      // Criar um cliente Supabase com o token da sessão atual para garantir autenticação
      const authenticatedSupabase = supabase;
      
      // Verificar se o cliente tem o token correto
      const currentSession = await authenticatedSupabase.auth.getSession();
      if (!currentSession.data.session) {
        throw new Error('Falha na autenticação - sessão perdida');
      }
      
      // Chamar a RPC para gerar o código de acesso
      const { data, error } = await authenticatedSupabase.rpc('generate_tenant_access_code', {
        p_tenant_id: tenantId,
        p_expiration_minutes: 5
      });

      if (error) {
        console.error('[useTenantAccess] Erro na RPC:', error);
        throw error;
      }

      if (!data || !data.success) {
        console.error('[useTenantAccess] RPC retornou erro:', data);
        throw new Error(data?.error || 'Erro ao gerar código de acesso');
      }

      return {
        success: true,
        code: data.code,
        tenant_id: data.tenant_id,
        tenant_slug: data.tenant_slug,
        expires_at: data.expires_at
      };
    } catch (error: any) {
      console.error('Erro ao gerar código de acesso:', error);
      
      toast({
        title: 'Erro ao gerar código de acesso',
        description: error.message || 'Não foi possível gerar código de acesso para o tenant',
      });
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }, [supabase, toast]);

  /**
   * Abre uma nova aba para o tenant com o código de acesso
   */
  const openTenantInNewTab = useCallback(async (tenantId: string) => {
    try {
      const result = await generateAccessCode(tenantId);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Construir a URL com o código de acesso
      const baseUrl = window.location.origin;
      const tenantUrl = `${baseUrl}/${result.tenant_slug}?code=${result.code}`;
      
      // Abrir nova aba
      window.open(tenantUrl, '_blank', 'noopener');
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao abrir tenant em nova aba:', error);
      
      toast({
        title: 'Erro ao abrir tenant',
        description: error.message || 'Não foi possível abrir o tenant em uma nova aba',
      });
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }, [generateAccessCode, toast]);

  /**
   * Troca um código de acesso por um token JWT usando a Edge Function
   */
  const exchangeAccessCode = useCallback(async (code: string, slug: string) => {
    try {
      // Verificar se o código e o slug foram fornecidos
      if (!code || !slug) {
        throw new Error('Código ou slug não fornecido');
      }
      
      console.log('[useTenantAccess] Trocando código por token via Edge Function');
      
      // Obter o token de autenticação atual
      const authToken = await getAuthToken(supabase);
      if (!authToken) {
        throw new Error('Token de autenticação não encontrado');
      }
      
      // Chamar a Edge Function para trocar o código por um token JWT
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/exchange-tenant-code/${slug}`;
      console.log('[useTenantAccess] Chamando Edge Function:', edgeFunctionUrl);
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ code })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro na troca de código: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('Token não retornado pela API');
      }
      
      // Armazenar o token e o slug no sessionStorage (isolado por aba)
      sessionStorage.setItem(STORAGE_KEYS.TENANT_TOKEN(slug), data.access_token);
      sessionStorage.setItem(STORAGE_KEYS.TENANT_SLUG, slug);
      
      console.log(`[useTenantAccess] Token armazenado para tenant ${slug}`);
      
      return {
        success: true,
        tenant_id: data.tenant_id,
        tenant_slug: data.tenant_slug,
        expires_in: data.expires_in
      };
    } catch (error: any) {
      console.error('Erro ao trocar código de acesso:', error);
      
      toast({
        title: 'Erro ao acessar tenant',
        description: error.message || 'Não foi possível validar o acesso ao tenant',
      });
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }, [toast]);

  return {
    generateAccessCode,
    openTenantInNewTab,
    exchangeAccessCode
  };
}

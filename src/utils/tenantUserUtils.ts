import { supabase } from '@/lib/supabase';

/**
 * AIDEV-NOTE: Utilitário para obter o ID do tenant_users para o usuário atual
 * Este ID é necessário para foreign keys que referenciam tenant_users.id
 */

export interface TenantUserInfo {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  active: boolean;
}

/**
 * Obtém o registro tenant_users.id para o usuário autenticado no tenant atual
 * 
 * @param userId - ID do usuário autenticado (auth.users.id)
 * @param tenantId - ID do tenant atual
 * @returns Promise<string | null> - ID do registro tenant_users ou null se não encontrado
 */
export async function getTenantUserId(userId: string, tenantId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .single();

    if (error) {
      console.error('❌ Erro ao obter tenant_users.id:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('❌ Erro ao buscar tenant_users.id:', error);
    return null;
  }
}

/**
 * Obtém informações completas do tenant_users para o usuário autenticado no tenant atual
 * 
 * @param userId - ID do usuário autenticado (auth.users.id)
 * @param tenantId - ID do tenant atual
 * @returns Promise<TenantUserInfo | null> - Informações do tenant_users ou null se não encontrado
 */
export async function getTenantUserInfo(userId: string, tenantId: string): Promise<TenantUserInfo | null> {
  try {
    const { data, error } = await supabase
      .from('tenant_users')
      .select('id, user_id, tenant_id, role, active')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .single();

    if (error) {
      console.error('❌ Erro ao obter informações do tenant_users:', error);
      return null;
    }

    return data as TenantUserInfo;
  } catch (error) {
    console.error('❌ Erro ao buscar informações do tenant_users:', error);
    return null;
  }
}

/**
 * Verifica se um usuário tem acesso a um tenant e retorna o tenant_users.id
 * 
 * @param userId - ID do usuário autenticado (auth.users.id)
 * @param tenantId - ID do tenant atual
 * @returns Promise<{ hasAccess: boolean; tenantUserId: string | null }> - Resultado da verificação
 */
export async function validateTenantAccess(userId: string, tenantId: string): Promise<{
  hasAccess: boolean;
  tenantUserId: string | null;
  role?: string;
}> {
  try {
    const tenantUserInfo = await getTenantUserInfo(userId, tenantId);
    
    if (!tenantUserInfo) {
      return {
        hasAccess: false,
        tenantUserId: null
      };
    }

    return {
      hasAccess: true,
      tenantUserId: tenantUserInfo.id,
      role: tenantUserInfo.role
    };
  } catch (error) {
    console.error('❌ Erro ao validar acesso ao tenant:', error);
    return {
      hasAccess: false,
      tenantUserId: null
    };
  }
}
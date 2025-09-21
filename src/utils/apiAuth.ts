/**
 * AIDEV-NOTE: Utilitário para autenticação em APIs Next.js
 * Este módulo fornece funções para extrair e validar usuários autenticados
 * em API routes, garantindo isolamento de tenant adequado
 */

import { NextApiRequest } from 'next';
import { createServerClient } from '@supabase/ssr';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
}

export interface TenantContext {
  tenantId: string;
  userRole: string;
  hasAccess: boolean;
}

export interface ApiAuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  tenantContext?: TenantContext;
  error?: string;
}

/**
 * AIDEV-NOTE: Extrai o usuário autenticado de uma requisição API
 * Usa createServerSupabaseClient para manter o contexto de autenticação
 */
export async function getAuthenticatedUser(
  req: NextApiRequest,
  res: any
): Promise<{ user: AuthenticatedUser | null; error?: string }> {
  try {
    // Criar cliente Supabase para servidor com contexto da requisição
    const supabaseServer = createServerSupabaseClient<Database>({ req, res });
    
    // Obter sessão do usuário
    const { data: { session }, error: sessionError } = await supabaseServer.auth.getSession();
    
    if (sessionError) {
      return {
        user: null,
        error: `Erro de autenticação: ${sessionError.message}`
      };
    }
    
    if (!session?.user) {
      return {
        user: null,
        error: 'Usuário não autenticado'
      };
    }
    
    return {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        role: session.user.app_metadata?.user_role
      }
    };
  } catch (error) {
    return {
      user: null,
      error: `Erro interno de autenticação: ${error}`
    };
  }
}

/**
 * AIDEV-NOTE: Obtém o contexto de tenant a partir da URL ou headers
 * Valida se o usuário tem acesso ao tenant solicitado
 */
export async function getTenantContext(
  req: NextApiRequest,
  user: AuthenticatedUser
): Promise<{ tenantContext: TenantContext | null; error?: string }> {
  try {
    // Extrair tenant_id dos headers ou query params
    const tenantId = req.headers['x-tenant-id'] as string || 
                    req.query.tenant_id as string ||
                    req.query.tenantId as string;
    
    if (!tenantId) {
      return {
        tenantContext: null,
        error: 'Tenant ID não fornecido nos headers ou query params'
      };
    }
    
    // Verificar se o usuário tem acesso ao tenant
    const { data: tenantUser, error: accessError } = await supabase
      .from('tenant_users')
      .select('role, active')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .single();
    
    if (accessError || !tenantUser) {
      // Verificar se é admin global
      if (user.role === 'ADMIN') {
        return {
          tenantContext: {
            tenantId,
            userRole: 'ADMIN',
            hasAccess: true
          }
        };
      }
      
      return {
        tenantContext: null,
        error: 'Usuário não tem acesso ao tenant solicitado'
      };
    }
    
    return {
      tenantContext: {
        tenantId,
        userRole: tenantUser.role,
        hasAccess: true
      }
    };
  } catch (error) {
    return {
      tenantContext: null,
      error: `Erro ao verificar contexto de tenant: ${error}`
    };
  }
}

/**
 * AIDEV-NOTE: Configura o contexto RLS para o tenant
 * Deve ser chamado antes de qualquer consulta que dependa de RLS
 */
export async function setupTenantRLS(
  tenantId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('set_tenant_context_flexible', {
      p_tenant_id: tenantId,
      p_user_id: userId
    });
    
    if (error) {
      return {
        success: false,
        error: `Erro ao configurar contexto RLS: ${error.message}`
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Erro interno ao configurar RLS: ${error}`
    };
  }
}

/**
 * AIDEV-NOTE: Função principal para autenticar e autorizar APIs
 * Combina autenticação, verificação de tenant e configuração de RLS
 */
export async function authenticateApiRequest(
  req: NextApiRequest,
  res: any
): Promise<ApiAuthResult> {
  try {
    // 1. Autenticar usuário
    const { user, error: authError } = await getAuthenticatedUser(req, res);
    
    if (!user || authError) {
      return {
        success: false,
        error: authError || 'Falha na autenticação'
      };
    }
    
    // 2. Obter contexto de tenant
    const { tenantContext, error: tenantError } = await getTenantContext(req, user);
    
    if (!tenantContext || tenantError) {
      return {
        success: false,
        user,
        error: tenantError || 'Falha na autorização de tenant'
      };
    }
    
    // 3. Configurar RLS
    const { success: rlsSuccess, error: rlsError } = await setupTenantRLS(
      tenantContext.tenantId,
      user.id
    );
    
    if (!rlsSuccess) {
      return {
        success: false,
        user,
        tenantContext,
        error: rlsError || 'Falha na configuração de RLS'
      };
    }
    
    return {
      success: true,
      user,
      tenantContext
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro interno na autenticação da API: ${error}`
    };
  }
}

/**
 * AIDEV-NOTE: Middleware para proteger APIs com autenticação e tenant
 * Uso: const authResult = await requireAuth(req, res);
 */
export async function requireAuth(
  req: NextApiRequest,
  res: any
): Promise<ApiAuthResult> {
  const result = await authenticateApiRequest(req, res);
  
  if (!result.success) {
    // Log de auditoria para tentativas de acesso não autorizado
    console.warn('[API Auth] Acesso negado:', {
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      path: req.url,
      error: result.error
    });
  }
  
  return result;
}

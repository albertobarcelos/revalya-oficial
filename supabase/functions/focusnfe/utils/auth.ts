/**
 * Utilitários para autenticação e validação
 * AIDEV-NOTE: Helpers para validação de JWT e autenticação
 */

import { createSupabaseAnonClient } from "./supabase.ts";

/**
 * Valida token JWT do usuário
 */
export async function validateAuthToken(authHeader: string): Promise<{ valid: boolean; user?: any; error?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Token de autenticação não fornecido' };
  }
  
  try {
    const supabaseClient = createSupabaseAnonClient(authHeader);
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (error || !user) {
      console.error('[validateAuthToken] Erro de autenticação:', error);
      return { valid: false, error: 'Invalid JWT' };
    }
    
    return { valid: true, user };
  } catch (error) {
    console.error('[validateAuthToken] Erro:', error);
    return { valid: false, error: 'Erro ao validar token' };
  }
}

/**
 * Extrai tenant ID do request
 */
export async function extractTenantId(req: Request): Promise<string | null> {
  // Tentar do header primeiro
  let tenantId = req.headers.get('x-tenant-id');
  
  if (tenantId) {
    return tenantId;
  }
  
  // Tentar do body (apenas para POST/PUT)
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const body = await req.clone().json();
      tenantId = body.tenant_id;
    } catch {
      // Ignorar erro de parse
    }
  }
  
  return tenantId;
}


// Este arquivo estende os tipos do Supabase para incluir funções RPC personalizadas

import { Database } from './database.types';
import { SupabaseClient } from '@supabase/supabase-js';

// Parâmetros das funções RPC
interface RPCFunctions {
  // Função unificada de tenant que substitui todas as anteriores
  get_tenant: {
    Params: {
      p_tenant_id?: string;
      p_slug?: string;
      p_user_id?: string;
    };
    Returns: {
      id: string;
      name: string;
      slug: string;
      active: boolean;
      has_access: boolean;
      role: string;
      logo?: string;
      theme?: Record<string, any>;
    }[];
  };
  
  // Função para gerar código de acesso único para tenant
  generate_tenant_access_code: {
    Params: {
      p_tenant_id: string;
      p_user_id?: string;
      p_expiration_minutes?: number;
    };
    Returns: {
      success: boolean;
      code?: string;
      tenant_id?: string;
      tenant_slug?: string;
      expires_at?: string;
      error?: string;
      code?: string; // código de erro
    };
  };
  
  // Função para trocar código de acesso por token JWT com claims de tenant
  exchange_tenant_access_code: {
    Params: {
      p_code: string;
    };
    Returns: {
      success: boolean;
      tenant_id?: string;
      tenant_slug?: string;
      tenant_name?: string;
      user_id?: string;
      user_role?: string;
      claims?: {
        tenant_id: string;
        tenant_slug: string;
        user_role: string;
      };
      expires_in?: number;
      error?: string;
      code?: string; // código de erro
    };
  };

  check_user_tenant_access_count: {
    Params: {
      p_user_id: string;
      p_tenant_id: string;
    };
    Returns: number;
  };

  get_user_tenants: {
    Params: {
      p_user_id: string;
    };
    Returns: {
      tenant_id: string;
      tenant_name: string;
      tenant_slug: string;
      active: boolean;
      role: string;
    }[];
  };
}

// Estender a interface do SupabaseClient para incluir nossas funções RPC
declare module '@supabase/supabase-js' {
  interface SupabaseClient<
    Database = any,
    SchemaName extends string & keyof Database = 'public' extends keyof Database
      ? 'public'
      : string & keyof Database,
    Schema extends DbSchema = DbSchema
  > {
    rpc<FunctionName extends keyof RPCFunctions>(
      fn: FunctionName,
      params?: RPCFunctions[FunctionName]['Params']
    ): Promise<{
      data: RPCFunctions[FunctionName]['Returns'];
      error: Error | null;
    }>;
  }
}

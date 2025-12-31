/**
 * Utilitários para Supabase
 * AIDEV-NOTE: Helpers para operações comuns no Supabase
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Cria cliente Supabase com service role key
 */
export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configuração do Supabase não encontrada');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Cria cliente Supabase com anon key (para validação de JWT)
 */
export function createSupabaseAnonClient(authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração do Supabase não encontrada');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader }
    }
  });
}


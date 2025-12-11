import { supabase as defaultClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Comentário de nível de função: Tipos locais para evitar dependência de Database gerado
export interface FinancialSettingRow {
  id: string;
  tenant_id: string;
  type: 'EXPENSE_CATEGORY' | 'DOCUMENT_TYPE' | 'ENTRY_TYPE';
  name: string;
  code?: string | null;
  dre_category?: 'NONE'|'DEFAULT'|'SALES'|'ADMIN'|'FINANCIAL'|'MARKETING'|'PERSONAL'|'SOCIAL_CHARGES'|'OTHER' | null;
  is_active: boolean;
  sort_order: number;
  metadata?: Record<string, any> | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialSettingInsert {
  tenant_id: string;
  type: 'EXPENSE_CATEGORY' | 'DOCUMENT_TYPE' | 'ENTRY_TYPE';
  name: string;
  code?: string | null;
  dre_category?: 'NONE'|'DEFAULT'|'SALES'|'ADMIN'|'FINANCIAL'|'MARKETING'|'PERSONAL'|'SOCIAL_CHARGES'|'OTHER' | null;
  is_active?: boolean;
  sort_order?: number;
  metadata?: Record<string, any> | null;
}

export interface FinancialSettingUpdate {
  name?: string;
  code?: string | null;
  dre_category?: 'NONE'|'DEFAULT'|'SALES'|'ADMIN'|'FINANCIAL'|'MARKETING'|'PERSONAL'|'SOCIAL_CHARGES'|'OTHER' | null;
  is_active?: boolean;
  sort_order?: number;
  metadata?: Record<string, any> | null;
}

export type FinancialSettingType = 'EXPENSE_CATEGORY' | 'DOCUMENT_TYPE' | 'ENTRY_TYPE';

/** Lista itens de configuração por tipo com filtros opcionais e ordenação */
export async function listFinancialSettings(
  tenantId: string,
  type: FinancialSettingType,
  opts?: { search?: string; active?: boolean },
  client?: SupabaseClient
): Promise<FinancialSettingRow[]> {
  const supabase = client || defaultClient;
  let query = supabase
    .from('financial_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (opts?.active !== undefined) query = query.eq('is_active', opts.active);
  if (opts?.search) query = query.ilike('name', `%${opts.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

/** Cria um novo item de configuração de forma segura e idempotente (por nome) */
export async function createFinancialSetting(
  payload: FinancialSettingInsert,
  client?: SupabaseClient
): Promise<FinancialSettingRow> {
  const supabase = client || defaultClient;
  const { data, error } = await supabase
    .from('financial_settings')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialSettingRow;
}

/** Atualiza um item de configuração por ID */
export async function updateFinancialSetting(
  id: string,
  patch: FinancialSettingUpdate,
  client?: SupabaseClient
): Promise<FinancialSettingRow> {
  const supabase = client || defaultClient;
  const { data, error } = await supabase
    .from('financial_settings')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialSettingRow;
}

/** Remove um item de configuração por ID */
export async function deleteFinancialSetting(id: string, client?: SupabaseClient): Promise<void> {
  const supabase = client || defaultClient;
  const { error } = await supabase
    .from('financial_settings')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

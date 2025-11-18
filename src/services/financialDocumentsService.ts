import { supabase as defaultClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CreditTitleType = 'OUTROS' | 'CHEQUE' | 'DUPLICATA' | 'PROMISSORIA' | 'RECIBO';

export interface FinancialDocumentRow {
  id: string;
  tenant_id: string;
  name: string;
  credit_title_type: CreditTitleType;
  open_id: string | null;
  settle_id: string | null;
  addition_id: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialDocumentInsert {
  tenant_id: string;
  name: string;
  credit_title_type: CreditTitleType;
  open_id?: string | null;
  settle_id?: string | null;
  addition_id?: string | null;
  is_active?: boolean;
}

/** Lista tipos de documento financeiros por tenant */
export async function listFinancialDocuments(
  tenantId: string,
  client?: SupabaseClient
): Promise<FinancialDocumentRow[]> {
  const supabase = client || defaultClient;
  const { data, error } = await supabase
    .from('financial_documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as FinancialDocumentRow[];
}

/** Cria um novo tipo de documento financeiro */
export async function createFinancialDocument(
  payload: FinancialDocumentInsert,
  client?: SupabaseClient
): Promise<FinancialDocumentRow> {
  const supabase = client || defaultClient;
  const { data, error } = await supabase
    .from('financial_documents')
    .insert({
      tenant_id: payload.tenant_id,
      name: payload.name,
      credit_title_type: payload.credit_title_type,
      open_id: payload.open_id ?? null,
      settle_id: payload.settle_id ?? null,
      addition_id: payload.addition_id ?? null,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialDocumentRow;
}

/** Atualiza um tipo de documento financeiro */
export async function updateFinancialDocument(
  id: string,
  patch: Partial<FinancialDocumentInsert>,
  client?: SupabaseClient
): Promise<FinancialDocumentRow> {
  const supabase = client || defaultClient;
  const { data, error } = await supabase
    .from('financial_documents')
    .update({
      name: patch.name,
      credit_title_type: patch.credit_title_type,
      open_id: patch.open_id ?? null,
      settle_id: patch.settle_id ?? null,
      addition_id: patch.addition_id ?? null,
      is_active: patch.is_active,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialDocumentRow;
}

/** Remove um tipo de documento financeiro */
export async function deleteFinancialDocument(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client || defaultClient;
  const { error } = await supabase
    .from('financial_documents')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}


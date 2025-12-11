import { supabase as defaultClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export type FinancialOperationType = 'DEBIT' | 'CREDIT';

export interface FinancialLaunchRow {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  operation_type: FinancialOperationType | null;
  generate_bank_movement: boolean;
  consider_settlement_movement: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialLaunchInsert {
  tenant_id: string;
  name: string;
  is_active?: boolean;
  operation_type?: FinancialOperationType | null;
  generate_bank_movement?: boolean;
  consider_settlement_movement?: boolean;
}

export async function listFinancialLaunchs(
  tenantId: string,
  client?: SupabaseClient
): Promise<FinancialLaunchRow[]> {
  const supabase = client || defaultClient;
  const { data, error } = await supabase
    .from('financial_launchs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
    .order('is_active', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as FinancialLaunchRow[];
}

export async function createFinancialLaunch(
  payload: FinancialLaunchInsert,
  client?: SupabaseClient
): Promise<FinancialLaunchRow> {
  const supabase = client || defaultClient;
  const { data, error } = await supabase
    .from('financial_launchs')
    .insert({
      tenant_id: payload.tenant_id,
      name: payload.name,
      is_active: payload.is_active ?? true,
      operation_type: payload.operation_type ?? null,
      generate_bank_movement: payload.generate_bank_movement ?? false,
      consider_settlement_movement: payload.consider_settlement_movement ?? false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialLaunchRow;
}

export async function deleteFinancialLaunch(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client || defaultClient;
  const { error } = await supabase
    .from('financial_launchs')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateFinancialLaunch(
  id: string,
  patch: Partial<FinancialLaunchInsert>,
  client?: SupabaseClient
): Promise<FinancialLaunchRow> {
  const supabase = client || defaultClient;
  const { data, error } = await supabase
    .from('financial_launchs')
    .update({
      name: patch.name,
      is_active: patch.is_active,
      operation_type: patch.operation_type ?? null,
      generate_bank_movement: patch.generate_bank_movement,
      consider_settlement_movement: patch.consider_settlement_movement,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialLaunchRow;
}

import { supabase as defaultClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PayableStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DUE_TODAY' | 'DUE_SOON';

export interface PayableRow {
  id: string;
  tenant_id: string;
  entry_number: string | null;
  description: string | null;
  gross_amount: number;
  net_amount: number;
  due_date: string; // ISO date (yyyy-mm-dd)
  issue_date: string | null;
  status: PayableStatus;
  payment_date: string | null;
  paid_amount: number | null;
  payment_method: string | null;
  category_id: string | null;
  document_id: string | null;
  bank_account_id: string | null;
  customer_id: string | null;
  repeat: boolean;
  installments: string | null;
  metadata: Record<string, any> | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  customers?: { name: string } | null;
}

export interface PayableInsert {
  tenant_id: string;
  entry_number?: string | null;
  description?: string | null;
  gross_amount: number;
  net_amount: number;
  due_date: string; // ISO date
  issue_date?: string | null;
  status?: PayableStatus;
  payment_date?: string | null;
  paid_amount?: number | null;
  payment_method?: string | null;
  category_id?: string | null;
  document_id?: string | null;
  bank_account_id?: string | null;
  customer_id?: string | null;
  repeat?: boolean;
  installments?: string | null;
  metadata?: Record<string, any> | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface PayableFilters {
  tenant_id: string;
  statuses?: PayableStatus[];
  status?: PayableStatus;
  start_date?: string; // due_date início
  end_date?: string;   // due_date fim
  search?: string;     // descrição
  page?: number;
  limit?: number;
  category_id?: string;
  document_id?: string;
}

export interface PayableResponse {
  data: PayableRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Cria uma conta a pagar */
export async function createPayable(payload: PayableInsert, client?: SupabaseClient): Promise<PayableRow> {
  const supabase = client || defaultClient;

  // AIDEV-NOTE: Sanitização para parcela única (001/001)
  if (payload.installments === '001/001' || !payload.installments) {
    if (payload.metadata && payload.metadata.recurrence) {
      const { recurrence, ...rest } = payload.metadata;
      payload.metadata = { ...rest, recurrence: null };
    }
    payload.repeat = false;
  }

  const entry_number = payload.entry_number ?? await getNextPayableEntryNumber(payload.tenant_id, supabase);
  const { data, error } = await supabase
    .from('financial_payables')
    .insert({
      tenant_id: payload.tenant_id,
      entry_number,
      description: payload.description ?? null,
      gross_amount: payload.gross_amount,
      net_amount: payload.net_amount,
      due_date: payload.due_date,
      issue_date: payload.issue_date ?? null,
      status: payload.status ?? 'PENDING',
      payment_date: payload.payment_date ?? null,
      paid_amount: payload.paid_amount ?? null,
      payment_method: payload.payment_method ?? null,
      category_id: payload.category_id ?? null,
      document_id: payload.document_id ?? null,
      bank_account_id: payload.bank_account_id ?? null,
      customer_id: payload.customer_id ?? null,
      repeat: payload.repeat ?? false,
      installments: payload.installments ?? '001/001',
      metadata: payload.metadata ?? {},
      created_by: payload.created_by ?? null,
      updated_by: payload.updated_by ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PayableRow;
}

/** Atualiza uma conta a pagar */
export async function updatePayable(id: string, patch: Partial<PayableInsert>, client?: SupabaseClient): Promise<PayableRow> {
  const supabase = client || defaultClient;
  console.log('📝 Atualizando conta a pagar:', id, patch);

  // AIDEV-NOTE: Se for parcela única (001/001), garante que não há recorrência e limpa metadados
  if (patch.installments === '001/001') {
    patch.repeat = false;

    // Se metadata não foi passado, precisamos buscar o atual para remover a recorrência sem perder o resto
    if (patch.metadata === undefined) {
      const { data: current } = await supabase
        .from('financial_payables')
        .select('metadata')
        .eq('id', id)
        .single();
      
      if (current?.metadata) {
        patch.metadata = current.metadata;
      }
    }

    // Remove informações de recorrência do metadata
    if (patch.metadata) {
      const { recurrence, ...rest } = patch.metadata;
      patch.metadata = { ...rest, recurrence: null };
    }
  }

  const { data, error } = await supabase
    .from('financial_payables')
    .update({
      entry_number: patch.entry_number,
      description: patch.description,
      gross_amount: patch.gross_amount,
      net_amount: patch.net_amount,
      due_date: patch.due_date,
      issue_date: patch.issue_date,
      // AIDEV-NOTE: Proteção crítica contra valor vazio que viola enum payable_status
      // Se status vier vazio ou inválido, ignoramos para deixar o trigger do banco decidir (set_financial_payable_status)
      ...(patch.status && ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'].includes(patch.status) ? { status: patch.status } : {}),
      payment_date: patch.payment_date,
      paid_amount: patch.paid_amount,
      payment_method: patch.payment_method,
      category_id: patch.category_id,
      document_id: patch.document_id,
      bank_account_id: patch.bank_account_id,
      customer_id: patch.customer_id,
      repeat: patch.repeat,
      installments: patch.installments,
      metadata: patch.metadata,
      updated_at: new Date().toISOString(),
      updated_by: patch.updated_by,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PayableRow;
}

/** Lista contas a pagar com paginação */
export async function getPayablesPaginated(filters: PayableFilters, client?: SupabaseClient): Promise<PayableResponse> {
  const supabase = client || defaultClient;
  const page = filters.page || 1;
  const limit = filters.limit || 15;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('financial_payables')
    .select('*, customers(name)', { count: 'exact' })
    .eq('tenant_id', filters.tenant_id)
    .order('due_date', { ascending: false });

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses);
  } else if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
    query = query.ilike('description', `%${filters.search}%`);
  }

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters.document_id) {
    query = query.eq('document_id', filters.document_id);
  }

  if (filters.start_date) query = query.gte('due_date', filters.start_date);
  if (filters.end_date) query = query.lte('due_date', filters.end_date);

  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  return { data: (data || []) as PayableRow[], total, page, limit, totalPages };
}

/** Marca como pago */
export async function markAsPaid(id: string, amount: number, method?: string, updatedBy?: string | null, client?: SupabaseClient): Promise<PayableRow> {
  return await updatePayable(id, {
    status: 'PAID',
    payment_date: new Date().toISOString().slice(0,10),
    paid_amount: amount,
    payment_method: method,
    updated_by: updatedBy,
  }, client);
}

/** Remove uma conta a pagar */
export async function deletePayable(id: string, client?: SupabaseClient): Promise<void> {
  const supabase = client || defaultClient;
  const { error } = await supabase
    .from('financial_payables')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
/**
 * Gera o próximo número sequencial persistente no formato "DES-X" para o tenant.
 * Usa função RPC com incremento atômico para garantir concorrência.
 */
export async function getNextPayableEntryNumber(tenantId: string, client?: SupabaseClient): Promise<string> {
  const supabase = client || defaultClient;
  const { data, error } = await supabase.rpc('next_des_payable_number', { p_tenant_id: tenantId });
  if (error) throw new Error(error.message);
  return String(data);
}

/** Pré-visualiza o próximo número sem reservar/incrementar */
export async function previewNextPayableEntryNumber(tenantId: string, client?: SupabaseClient): Promise<string> {
  const supabase = client || defaultClient;
  const { data, error } = await supabase.rpc('peek_des_payable_number', { p_tenant_id: tenantId });
  if (error) throw new Error(error.message);
  return String(data);
}

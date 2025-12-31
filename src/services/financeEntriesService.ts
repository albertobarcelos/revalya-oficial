import { supabase } from '@/lib/supabase';
import { format, addDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import type { Database } from '@/types/database';

type FinanceEntryRow = Database['public']['Tables']['finance_entries']['Row'];
export type FinanceEntry = FinanceEntryRow & {
  customer?: {
    name: string | null;
    company: string | null;
    cpf_cnpj: number | string | null;
  } | null;
  charge?: {
    net_value: number | null;
  } | null;
};
export type FinanceEntryInsert = Database['public']['Tables']['finance_entries']['Insert'];
export type FinanceEntryUpdate = Database['public']['Tables']['finance_entries']['Update'];

export interface FinanceEntryFilters {
  tenant_id: string;
  type?: 'RECEIVABLE' | 'PAYABLE';
  status?: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
  statuses?: ('PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED')[];
  category?: string;
  start_date?: Date | string; // due_date início
  end_date?: Date | string;   // due_date fim
  issue_start_date?: Date | string;
  issue_end_date?: Date | string;
  payment_start_date?: Date | string;
  payment_end_date?: Date | string;
  min_amount?: number;
  max_amount?: number;
  customer_id?: string;
  contract_id?: string;
  payment_method?: string;
  invoice_status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FinanceEntryResponse {
  data: FinanceEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FinanceEntrySummary {
  total_receivable: number;
  total_payable: number;
  total_pending: number;
  total_paid: number;
  total_overdue: number;
  count_receivable: number;
  count_payable: number;
  count_pending: number;
  count_paid: number;
  count_overdue: number;
}

export interface CashFlowData {
  date: string;
  receivable: number;
  payable: number;
  balance: number;
  accumulated_balance: number;
}

export interface PaymentData {
  amount: number;
  payment_date: string;
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

class FinanceEntriesService {
  /**
   * Cria um novo lançamento financeiro
   */
  async createEntry(data: FinanceEntryInsert): Promise<FinanceEntry> {
    // AIDEV-NOTE: Sanitização de payload para compatibilidade com schema
    // Remove campos que não existem na tabela (issue_date, gross_amount, net_amount, entry_number, paid_amount, payment_method, notes, metadata)
    const { gross_amount, net_amount, issue_date, entry_number, paid_amount, payment_method, notes, metadata, ...rest } = data as any;
    
    const payload: any = { ...rest };
    
    // Mapeamento de campos legados para o schema atual
    if (data.amount === undefined && (gross_amount !== undefined || net_amount !== undefined)) {
      payload.amount = gross_amount ?? net_amount;
    } else if (data.amount !== undefined) {
      payload.amount = data.amount;
    }

    // AIDEV-NOTE: Garantir que payment_date seja incluído se existir
    if (data.payment_date) {
      payload.payment_date = data.payment_date;
    }

    const { data: entry, error } = await supabase
      .from('finance_entries')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar lançamento financeiro: ${error.message}`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('[FinanceEntries] Lançamento criado:', entry.id);
    }

    return entry;
  }

  /**
   * Atualiza um lançamento financeiro
   */
  async updateEntry(id: string, data: FinanceEntryUpdate): Promise<FinanceEntry> {
    // AIDEV-NOTE: Remove campos virtuais ou não existentes na tabela para evitar erros de cache do Postgrest
    // O campo 'gross_amount' e 'net_value' não existem na tabela finance_entries
    // Devemos usar apenas 'amount' que é o campo correto no banco
    
    const { gross_amount, net_amount, issue_date, paid_amount, payment_method, notes, metadata, ...rest } = data as any;
    
    // Se amount não estiver definido mas gross_amount estiver, usa gross_amount como amount
    const payload: any = { ...rest };
    if (data.amount === undefined && (gross_amount !== undefined || net_amount !== undefined)) {
      payload.amount = gross_amount ?? net_amount;
    } else if (data.amount !== undefined) {
      payload.amount = data.amount;
    }

    // AIDEV-NOTE: Garantir que payment_date seja incluído se existir
    if (data.payment_date) {
      payload.payment_date = data.payment_date;
    }

    const { data: entry, error } = await supabase
      .from('finance_entries')
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar lançamento: ${error.message}`);
    }

    return entry;
  }

  /**
   * Busca lançamentos com filtros
   */
  async getEntries(filters: FinanceEntryFilters): Promise<FinanceEntry[]> {
    const response = await this.getEntriesPaginated(filters);
    return response.data;
  }

  /**
   * AIDEV-NOTE: Busca lançamentos financeiros com paginação
   */
  async getEntriesPaginated(filters: FinanceEntryFilters): Promise<FinanceEntryResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 15;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('finance_entries')
      .select('*, customer:customers(name, company, cpf_cnpj)', { count: 'exact' })
      .eq('tenant_id', filters.tenant_id)
      .order('due_date', { ascending: false });

    // AIDEV-NOTE: Joins reativados para exibir dados do cliente


    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    } else if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    if (filters.contract_id) {
      query = query.eq('contract_id', filters.contract_id);
    }

    if (filters.bank_account_id) {
      query = query.eq('bank_account_id', filters.bank_account_id);
    }

    if (filters.payment_method) {
      query = query.eq('payment_method', filters.payment_method);
    }

    if (filters.invoice_status) {
      query = query.eq('invoice_status', filters.invoice_status);
    }

    if (filters.search) {
      const search = filters.search;
      const orConditions: string[] = [`description.ilike.%${search}%`];

      // Busca por valor (se for número)
      const numericSearch = Number(search.replace(',', '.'));
      if (!isNaN(numericSearch) && search.trim() !== '') {
         orConditions.push(`amount.eq.${numericSearch}`);
         orConditions.push(`net_amount.eq.${numericSearch}`);
      }

      // Busca por Clientes
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', filters.tenant_id)
        .or(`name.ilike.%${search}%,company.ilike.%${search}%,cpf_cnpj.ilike.%${search}%`);
      
      if (customers && customers.length > 0) {
        const customerIds = customers.map(c => c.id).join(',');
        orConditions.push(`customer_id.in.(${customerIds})`);
      }

      // Busca por Contas Bancárias
      const { data: accounts } = await supabase
        .from('bank_acounts')
        .select('id')
        .eq('tenant_id', filters.tenant_id)
        .or(`bank.ilike.%${search}%,agency.ilike.%${search}%,count.ilike.%${search}%`);

      if (accounts && accounts.length > 0) {
        const accountIds = accounts.map(a => a.id).join(',');
        orConditions.push(`bank_account_id.in.(${accountIds})`);
      }

      query = query.or(orConditions.join(','));
    }

    if (filters.start_date) {
      const startDate = typeof filters.start_date === 'string' ? filters.start_date : format(filters.start_date, 'yyyy-MM-dd');
      query = query.gte('due_date', startDate);
    }

    if (filters.end_date) {
      const endDate = typeof filters.end_date === 'string' ? filters.end_date : format(filters.end_date, 'yyyy-MM-dd');
      query = query.lte('due_date', endDate);
    }

    if (filters.issue_start_date) {
      const issueStart = typeof filters.issue_start_date === 'string' ? filters.issue_start_date : format(filters.issue_start_date, 'yyyy-MM-dd');
      query = query.gte('issue_date', issueStart);
    }

    if (filters.issue_end_date) {
      const issueEnd = typeof filters.issue_end_date === 'string' ? filters.issue_end_date : format(filters.issue_end_date, 'yyyy-MM-dd');
      query = query.lte('issue_date', issueEnd);
    }

    if (filters.payment_start_date) {
      const payStart = typeof filters.payment_start_date === 'string' ? filters.payment_start_date : format(filters.payment_start_date, 'yyyy-MM-dd');
      query = query.gte('payment_date', payStart);
    }

    if (filters.payment_end_date) {
      const payEnd = typeof filters.payment_end_date === 'string' ? filters.payment_end_date : format(filters.payment_end_date, 'yyyy-MM-dd');
      query = query.lte('payment_date', payEnd);
    }

    if (typeof filters.min_amount === 'number') {
      query = query.gte('net_amount', filters.min_amount);
    }

    if (typeof filters.max_amount === 'number') {
      query = query.lte('net_amount', filters.max_amount);
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar lançamentos: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data || [],
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Busca um lançamento por ID
   */
  async getEntryById(id: string): Promise<FinanceEntry | null> {
    const { data, error } = await supabase
      .from('finance_entries')
      .select(`
        *,
        customer:customers(*),
        contract:contracts(*),
        charge:charges(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      throw new Error(`Erro ao buscar lançamento: ${error.message}`);
    }

    return data;
  }

  /**
   * Registra pagamento de um lançamento
   */
  async registerPayment(entry_id: string, payment: PaymentData): Promise<FinanceEntry> {
    const entry = await this.getEntryById(entry_id);
    if (!entry) {
      throw new Error('Lançamento não encontrado');
    }

    if (entry.status === 'RECEIVED') {
      throw new Error('Lançamento já está pago');
    }

    const updateData: FinanceEntryUpdate = {
      status: 'PAID',
      payment_date: payment.payment_date,
      payment_method: payment.payment_method || entry.payment_method,
      paid_amount: payment.amount,
      notes: payment.notes || entry.notes,
      metadata: {
        ...entry.metadata,
        payment: {
          transaction_id: payment.transaction_id,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          ...payment.metadata
        }
      }
    };

    const updatedEntry = await this.updateEntry(entry_id, updateData);

    if (process.env.NODE_ENV === 'development') {
      console.debug('[FinanceEntries] Pagamento registrado:', {
        id: updatedEntry.id,
        amount: payment.amount
      });
    }

    return updatedEntry;
  }

  /**
   * Cancela um lançamento
   */
  async cancelEntry(entry_id: string, reason?: string): Promise<FinanceEntry> {
    const entry = await this.getEntryById(entry_id);
    if (!entry) {
      throw new Error('Lançamento não encontrado');
    }

    if (entry.status === 'RECEIVED') {
      throw new Error('Não é possível cancelar um lançamento já pago');
    }

    const updateData: FinanceEntryUpdate = {
      status: 'CANCELLED',
      notes: reason ? `Cancelado: ${reason}` : 'Cancelado',
      metadata: {
        ...entry.metadata,
        cancellation: {
          date: new Date().toISOString(),
          reason
        }
      }
    };

    return await this.updateEntry(entry_id, updateData);
  }

  /**
   * Gera resumo financeiro
   */
  async getFinanceSummary(filters: FinanceEntryFilters): Promise<FinanceEntrySummary> {
    let query = supabase
      .from('finance_entries')
      .select('type, status, net_amount')
      .eq('tenant_id', filters.tenant_id);

    if (filters.start_date) {
      query = query.gte('due_date', format(filters.start_date, 'yyyy-MM-dd'));
    }

    if (filters.end_date) {
      query = query.lte('due_date', format(filters.end_date, 'yyyy-MM-dd'));
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao gerar resumo: ${error.message}`);
    }

    const summary: FinanceEntrySummary = {
      total_receivable: 0,
      total_payable: 0,
      total_pending: 0,
      total_paid: 0,
      total_overdue: 0,
      count_receivable: 0,
      count_payable: 0,
      count_pending: 0,
      count_paid: 0,
      count_overdue: 0
    };

    (data || []).forEach(entry => {
      const amount = entry.net_amount || 0;

      // Por tipo
      if (entry.type === 'RECEIVABLE') {
        summary.total_receivable += amount;
        summary.count_receivable++;
      } else if (entry.type === 'PAYABLE') {
        summary.total_payable += amount;
        summary.count_payable++;
      }

      // Por status
      switch (entry.status) {
        case 'PENDING':
          summary.total_pending += amount;
          summary.count_pending++;
          break;
        case 'PAID':
          summary.total_paid += amount;
          summary.count_paid++;
          break;
        case 'OVERDUE':
          summary.total_overdue += amount;
          summary.count_overdue++;
          break;
      }
    });

    return summary;
  }

  /**
   * Gera dados de fluxo de caixa
   */
  async getCashFlowData(
    tenant_id: string,
    start_date: Date,
    end_date: Date
  ): Promise<CashFlowData[]> {
    const { data, error } = await supabase
      .from('finance_entries')
      .select('type, due_date, net_amount, status')
      .eq('tenant_id', tenant_id)
      .gte('due_date', format(start_date, 'yyyy-MM-dd'))
      .lte('due_date', format(end_date, 'yyyy-MM-dd'))
      .in('status', ['PENDING', 'PAID'])
      .order('due_date');

    if (error) {
      throw new Error(`Erro ao gerar fluxo de caixa: ${error.message}`);
    }

    // Agrupar por data
    const groupedData = new Map<string, { receivable: number; payable: number }>();

    (data || []).forEach(entry => {
      const date = entry.due_date;
      const amount = entry.net_amount || 0;
      
      if (!groupedData.has(date)) {
        groupedData.set(date, { receivable: 0, payable: 0 });
      }

      const dayData = groupedData.get(date)!;
      
      if (entry.type === 'RECEIVABLE') {
        dayData.receivable += amount;
      } else if (entry.type === 'PAYABLE') {
        dayData.payable += amount;
      }
    });

    // Converter para array e calcular saldos
    const cashFlowData: CashFlowData[] = [];
    let accumulatedBalance = 0;

    Array.from(groupedData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        const balance = data.receivable - data.payable;
        accumulatedBalance += balance;

        cashFlowData.push({
          date,
          receivable: data.receivable,
          payable: data.payable,
          balance,
          accumulated_balance: accumulatedBalance
        });
      });

    return cashFlowData;
  }

  /**
   * Atualiza status de lançamentos vencidos
   */
  async updateOverdueEntries(tenant_id: string): Promise<{ updated_count: number }> {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('finance_entries')
      .update({ 
        status: 'OVERDUE',
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenant_id)
      .eq('status', 'PENDING')
      .lt('due_date', today)
      .select('id');

    if (error) {
      throw new Error(`Erro ao atualizar vencidos: ${error.message}`);
    }

    const updatedCount = data?.length || 0;
    
    if (process.env.NODE_ENV === 'development' && updatedCount > 0) {
      console.debug('[FinanceEntries] Lançamentos marcados como vencidos:', updatedCount);
    }

    return { updated_count: updatedCount };
  }

  /**
   * Busca lançamentos por cobrança
   */
  async getEntriesByCharge(charge_id: string): Promise<FinanceEntry[]> {
    const { data, error } = await supabase
      .from('finance_entries')
      .select('*')
      .eq('charge_id', charge_id);

    if (error) {
      throw new Error(`Erro ao buscar lançamentos por cobrança: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Cria um recebimento a partir de uma cobrança paga
   */
  async createReceivableFromCharge(charge: {
    id: string;
    valor: number;
    descricao: string;
    customer_id: string;
    contract_id?: string;
    tenant_id: string;
    data_vencimento?: string;
  }): Promise<FinanceEntry> {
    // Verificar se já existe um lançamento para esta cobrança
    const existingEntries = await this.getEntriesByCharge(charge.id);
    if (existingEntries.length > 0) {
      throw new Error('Já existe um lançamento financeiro para esta cobrança');
    }

    const entryData: FinanceEntryInsert = {
      type: 'RECEIVABLE',
      description: charge.descricao || `Recebimento da cobrança #${charge.id.substring(0, 8)}`,
      gross_amount: charge.valor,
      net_amount: charge.valor,
      due_date: charge.data_vencimento || format(new Date(), 'yyyy-MM-dd'),
      status: 'PAID',
      payment_date: new Date().toISOString(),
      paid_amount: charge.valor,
      category: 'SERVICOS',
      charge_id: charge.id,
      contract_id: charge.contract_id,
      customer_id: charge.customer_id,
      tenant_id: charge.tenant_id,
      metadata: {
        created_from_charge: true,
        charge_payment_date: new Date().toISOString()
      }
    };

    const entry = await this.createEntry(entryData);

    if (process.env.NODE_ENV === 'development') {
      console.debug('[FinanceEntries] Recebimento criado a partir de cobrança:', {
        charge_id: charge.id,
        entry_id: entry.id,
        amount: charge.valor
      });
    }

    return entry;
  }

  /**
   * Atualiza lançamento baseado em webhook de pagamento
   */
  async updateFromWebhook(
    external_id: string,
    webhook_data: {
      status: string;
      payment_date?: string;
      amount?: number;
      payment_method?: string;
    }
  ): Promise<FinanceEntry | null> {
    // Buscar cobrança pelo ID externo
    const { data: charge, error: chargeError } = await supabase
      .from('charges')
      .select('id')
      .eq('asaas_id', external_id)
      .single();

    if (chargeError || !charge) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[FinanceEntries] Cobrança não encontrada para webhook:', external_id);
      }
      return null;
    }

    // Buscar lançamento financeiro
    const entries = await this.getEntriesByCharge(charge.id);
    if (entries.length === 0) {
      return null;
    }

    const entry = entries[0]; // Assumindo um lançamento por cobrança

    // Mapear status do webhook
    // AIDEV-NOTE: Usando status padronizados conforme chargeStatus.ts
    let newStatus: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'CANCELLED' = 'PENDING';
    switch (webhook_data.status.toLowerCase()) {
      case 'paid':
      case 'received':
      case 'confirmed':
        newStatus = 'RECEIVED';
        break;
      case 'overdue':
        newStatus = 'OVERDUE';
        break;
      case 'cancelled':
      case 'refunded':
        newStatus = 'CANCELLED';
        break;
    }

    // Atualizar lançamento
    const updateData: FinanceEntryUpdate = {
      status: newStatus,
      metadata: {
        ...entry.metadata,
        webhook_update: {
          date: new Date().toISOString(),
          external_id,
          original_status: webhook_data.status
        }
      }
    };

    if (newStatus === 'RECEIVED' && webhook_data.payment_date) {
      updateData.payment_date = webhook_data.payment_date;
      updateData.paid_amount = webhook_data.amount || entry.net_amount;
      updateData.payment_method = webhook_data.payment_method || entry.payment_method;
    }

    return await this.updateEntry(entry.id, updateData);
  }



  /**
   * Exclui um lançamento (soft delete)
   */
  async deleteEntry(entry_id: string): Promise<void> {
    const entry = await this.getEntryById(entry_id);
    if (!entry) {
      throw new Error('Lançamento não encontrado');
    }

    if (entry.status === 'RECEIVED') {
      throw new Error('Não é possível excluir um lançamento já pago');
    }

    const { error } = await supabase
      .from('finance_entries')
      .delete()
      .eq('id', entry_id);

    if (error) {
      throw new Error(`Erro ao excluir lançamento: ${error.message}`);
    }
  }
}

export const financeEntriesService = new FinanceEntriesService();
export default financeEntriesService;

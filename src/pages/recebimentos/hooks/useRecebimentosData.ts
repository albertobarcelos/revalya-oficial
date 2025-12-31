import { useMemo, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { financeEntriesService, type FinanceEntry, type FinanceEntryFilters, type FinanceEntryResponse } from '@/services/financeEntriesService';
import { useSecureTenantQuery, useSecureTenantMutation } from '@/hooks/templates/useSecureTenantQuery';
import type { Database } from '@/types/database';
import type { RecebimentosFilters } from '@/components/recebimentos/types';

type FinanceEntryUpdate = Database['public']['Tables']['finance_entries']['Update'];

export function useRecebimentosData(
  filters: RecebimentosFilters, 
  hasAccess: boolean, 
  currentTenant: any
) {
  const { toast } = useToast();
  const [selectingEntryId, setSelectingEntryId] = useState<string | null>(null);

  // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID (CAMADA 3)
  const queryKey = useMemo(() => [
    'recebimentos',
    currentTenant?.id,
    filters.search,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.type,
    filters.page,
    filters.limit,
    // Advanced filters
    filters.category,
    filters.paymentFrom,
    filters.paymentTo,
    filters.minAmount,
    filters.maxAmount,
    filters.bankAccountId,
    filters.customerId,
    filters.documentId
  ], [
    currentTenant?.id, 
    filters.search, 
    filters.status, 
    filters.dateFrom, 
    filters.dateTo, 
    filters.type, 
    filters.page, 
    filters.limit,
    filters.category,
    filters.paymentFrom,
    filters.paymentTo,
    filters.minAmount,
    filters.maxAmount,
    filters.bankAccountId,
    filters.customerId,
    filters.documentId
  ]);
  
  // 🔐 CONSULTA SEGURA COM VALIDAÇÃO MULTI-TENANT (CAMADA 2)
  const { data: recebimentosData, isLoading, error, refetch } = useSecureTenantQuery(
    queryKey,
    async (supabase, tenantId) => {
      // 🔍 AUDIT LOG para consulta de dados
      console.log(`🔍 [AUDIT] Buscando recebimentos para tenant: ${tenantId}`);
      console.log(`🔍 [AUDIT] Filtros aplicados:`, filters);
      
      // 🛡️ VALIDAÇÃO CRÍTICA: Verificar se tenantId corresponde ao currentTenant
      if (tenantId !== currentTenant?.id) {
        throw new Error(`🚨 VIOLAÇÃO DE SEGURANÇA: TenantId inconsistente! Query: ${tenantId}, Current: ${currentTenant?.id}`);
      }
      
      const params: FinanceEntryFilters = {
        tenant_id: tenantId, // 🔒 SEMPRE incluir tenant_id
        type: filters.type === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE',
        page: filters.page,
        limit: filters.limit
      };

      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status as any;
      if (filters.dateFrom) params.start_date = filters.dateFrom;
      if (filters.dateTo) params.end_date = filters.dateTo;

      // Advanced filters
      if (filters.category && filters.category !== 'all') params.category = filters.category;
      if (filters.paymentFrom) params.payment_start_date = filters.paymentFrom;
      if (filters.paymentTo) params.payment_end_date = filters.paymentTo;
      if (filters.minAmount) params.min_amount = Number(filters.minAmount.replace(',', '.'));
      if (filters.maxAmount) params.max_amount = Number(filters.maxAmount.replace(',', '.'));
      if (filters.bankAccountId && filters.bankAccountId !== 'all') params.bank_account_id = filters.bankAccountId;
      if (filters.customerId && filters.customerId !== 'all') params.customer_id = filters.customerId;
      if (filters.documentId && filters.documentId !== 'all') params.invoice_status = filters.documentId;
      
      const response: FinanceEntryResponse = await financeEntriesService.getEntriesPaginated(params);
      
      // 🔍 VALIDAÇÃO DUPLA DE DADOS (CAMADA 5)
      const invalidData = response.data?.filter(item => item.tenant_id !== tenantId);
      if (invalidData && invalidData.length > 0) {
        console.error(`🚨 [SECURITY VIOLATION] Dados de outro tenant detectados:`, invalidData);
        throw new Error(`🚨 VIOLAÇÃO DE SEGURANÇA: ${invalidData.length} registro(s) de outro tenant detectado(s)!`);
      }
      
      console.log(`✅ [AUDIT] ${response.data.length} recebimentos carregados com segurança para tenant: ${currentTenant?.name}`);
      
      return response;
    },
    {
      enabled: !!currentTenant?.id && hasAccess
    }
  );

  // 📊 DADOS SEGUROS EXTRAÍDOS DA CONSULTA
  const recebimentos = useMemo(() => recebimentosData?.data || [], [recebimentosData]);

  // 📊 CALCULAR TOTAIS
  const totals = useMemo(() => {
    return recebimentos.reduce((acc, entry) => {
      const amount = entry.amount || 0;
      const netValue = entry.charge?.net_value ?? entry.amount ?? 0;
      const fees = (entry.amount ?? 0) - (entry.charge?.net_value ?? entry.amount ?? 0);
      
      return {
        amount: acc.amount + amount,
        netValue: acc.netValue + netValue,
        fees: acc.fees + fees
      };
    }, { amount: 0, netValue: 0, fees: 0 });
  }, [recebimentos]);

  // 🚨 TRATAMENTO DE ERRO DE SEGURANÇA
  useEffect(() => {
    if (error) {
      console.error('🚨 [SECURITY ERROR] Erro na consulta segura:', error);
      toast({
        title: 'Erro de Segurança',
        description: error.message.includes('VIOLAÇÃO') ? 'Violação de segurança detectada!' : 'Erro ao carregar recebimentos',
        variant: 'destructive'
      });
    }
  }, [error, toast]);

  // 🏦 CONTAS BANCÁRIAS
  const bankAccountsQuery = useSecureTenantQuery(
    ['bank-acounts', currentTenant?.id],
    async (supabase, tId) => {
      await supabase.rpc('set_tenant_context_simple', { p_tenant_id: tId });
      const { data, error } = await supabase
        .from('bank_acounts')
        .select('id, bank, agency, count, type, tenant_id')
        .eq('tenant_id', tId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((a: Database['public']['Tables']['bank_acounts']['Row']) => ({ id: a.id, label: String(a.bank ?? 'Banco') }));
    },
    { enabled: !!currentTenant?.id }
  );

  const bankLabelById = useMemo(() => {
    const m = new Map<string, string>();
    (bankAccountsQuery.data || []).forEach((b: any) => m.set(b.id, b.label));
    return m;
  }, [bankAccountsQuery.data]);

  // 🔐 MUTAÇÃO SEGURA PARA MARCAR COMO PAGO
  const markAsPaidMutation = useSecureTenantMutation(
    async (supabase, tenantId, { entryId }: { entryId: string }) => {
      // 🔍 AUDIT LOG para operação crítica
      console.log(`🔍 [AUDIT] Marcando recebimento como pago - Entry: ${entryId}, Tenant: ${tenantId}`);
      
      // 🛡️ VALIDAÇÃO DUPLA: Verificar se o recebimento pertence ao tenant
      const entry = recebimentos.find(r => r.id === entryId);
      if (!entry || entry.tenant_id !== tenantId) {
        throw new Error(`🚨 VIOLAÇÃO DE SEGURANÇA: Tentativa de modificar recebimento de outro tenant!`);
      }
      
      return await financeEntriesService.registerPayment(entryId, {
        amount: 0,
        payment_date: new Date().toISOString(),
        payment_method: 'MANUAL'
      });
    },
    {
      onSuccess: () => {
        console.log(`✅ [AUDIT] Recebimento marcado como pago com sucesso para tenant: ${currentTenant?.name}`);
        toast({
          title: 'Sucesso',
          description: 'Recebimento marcado como pago'
        });
      },
      onError: (error) => {
        console.error('🚨 [SECURITY ERROR] Erro ao marcar como pago:', error);
        toast({
          title: 'Erro de Segurança',
          description: error.message.includes('VIOLAÇÃO') ? 'Operação não autorizada!' : 'Erro ao marcar recebimento como pago',
          variant: 'destructive'
        });
      },
      invalidateQueries: [
        'recebimentos',
        'contract_billing_periods',
        'charges'
      ]
    }
  );

  // 🔗 ASSOCIAR CONTA BANCÁRIA
  const associateBankAccountMutation = useSecureTenantMutation(
    async (supabase, tenantId, { entryId, bankAccountId }: { entryId: string; bankAccountId: string }) => {
      const entry = recebimentos.find(r => r.id === entryId);
      if (!entry || entry.tenant_id !== tenantId) {
        throw new Error('Operação não autorizada');
      }
      const patch: FinanceEntryUpdate = { bank_account_id: bankAccountId };
      const updated = await financeEntriesService.updateEntry(entryId, patch);
      const amount = Number((entry as FinanceEntry).paid_amount ?? (entry as FinanceEntry).net_amount ?? (entry as FinanceEntry).amount ?? 0);
      const opDate = (entry as FinanceEntry).payment_date ?? new Date().toISOString();
      const { error } = await supabase
        .from('bank_operation_history')
        .insert({
          tenant_id: tenantId,
          bank_acount_id: bankAccountId,
          operation_type: 'CREDIT',
          amount: amount,
          operation_date: opDate,
          description: entry.description ?? 'Recebimento',
          document_reference: (entry as any).document_id ?? null,
          category: null,
        });
      if (error) throw error;
      return updated;
    },
    {
      onSuccess: () => {
        setSelectingEntryId(null);
        toast({ title: 'Conta associada', description: 'A conta bancária foi vinculada ao recebimento.' });
      },
      onError: (error) => {
        toast({ title: 'Erro', description: error.message || 'Falha ao associar conta', variant: 'destructive' });
      },
      invalidateQueries: ['recebimentos']
    }
  );

  return {
    recebimentos,
    recebimentosData,
    totals,
    isLoading,
    error,
    refetch,
    bankAccountsQuery,
    bankLabelById,
    markAsPaid: (entryId: string) => markAsPaidMutation.mutate({ entryId }),
    associateBankAccount: (entryId: string, bankAccountId: string) => associateBankAccountMutation.mutate({ entryId, bankAccountId }),
    selectingEntryId,
    setSelectingEntryId
  };
}

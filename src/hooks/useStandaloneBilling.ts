import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { standaloneBillingService, type CreateStandaloneBillingData, type ProcessStandaloneBillingResult, type StandaloneBillingPeriod } from '@/services/standaloneBillingService';

/**
 * AIDEV-NOTE: Hook seguro para gerenciar faturamentos avulsos
 * Implementa todas as camadas de segurança multi-tenant obrigatórias
 */
export function useStandaloneBilling() {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Query para listar períodos avulsos
  const { data: periods, isLoading, error, refetch } = useSecureTenantQuery(
    ['standalone_billing_periods', currentTenant?.id],
    async (supabaseClient, tenantId) => {
      // AIDEV-NOTE: Configurar contexto de tenant
      await supabaseClient.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });

      // AIDEV-NOTE: Buscar períodos primeiro
      const { data: periodsData, error: queryError } = await supabaseClient
        .from('standalone_billing_periods')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('bill_date', { ascending: false });

      if (queryError) {
        throw new Error(`Erro ao buscar períodos avulsos: ${queryError.message}`);
      }

      if (!periodsData || periodsData.length === 0) {
        return [] as StandaloneBillingPeriod[];
      }

      // AIDEV-NOTE: Buscar dados relacionados separadamente (mais confiável que relacionamentos aninhados)
      const customerIds = [...new Set(periodsData.map(p => p.customer_id).filter(Boolean))];
      const periodIds = periodsData.map(p => p.id);

      // Buscar customers
      const { data: customersData } = await supabaseClient
        .from('customers')
        .select('id, name, email, phone, cpf_cnpj, customer_asaas_id')
        .in('id', customerIds)
        .eq('tenant_id', tenantId);

      // Buscar items
      const { data: itemsData } = await supabaseClient
        .from('standalone_billing_items')
        .select('*')
        .in('standalone_billing_period_id', periodIds)
        .eq('tenant_id', tenantId);

      // Buscar products e services dos items
      const productIds = [...new Set(itemsData?.map(i => i.product_id).filter(Boolean) || [])];
      const serviceIds = [...new Set(itemsData?.map(i => i.service_id).filter(Boolean) || [])];

      const { data: productsData } = productIds.length > 0
        ? await supabaseClient
            .from('products')
            .select('id, name, description')
            .in('id', productIds)
            .eq('tenant_id', tenantId)
        : { data: [] };

      const { data: servicesData } = serviceIds.length > 0
        ? await supabaseClient
            .from('services')
            .select('id, name, description')
            .in('id', serviceIds)
            .eq('tenant_id', tenantId)
        : { data: [] };

      // AIDEV-NOTE: Enriquecer dados com relacionamentos
      const customersMap = (customersData || []).reduce((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {} as Record<string, any>);

      const productsMap = (productsData || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);

      const servicesMap = (servicesData || []).reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {} as Record<string, any>);

      const itemsMap = (itemsData || []).reduce((acc, item) => {
        if (!acc[item.standalone_billing_period_id]) {
          acc[item.standalone_billing_period_id] = [];
        }
        acc[item.standalone_billing_period_id].push({
          ...item,
          product: item.product_id ? productsMap[item.product_id] : null,
          service: item.service_id ? servicesMap[item.service_id] : null
        });
        return acc;
      }, {} as Record<string, any[]>);

      // AIDEV-NOTE: Montar resultado final
      const enrichedData = periodsData.map(period => ({
        ...period,
        customer: customersMap[period.customer_id] || null,
        items: itemsMap[period.id] || []
      }));

      return enrichedData as StandaloneBillingPeriod[];
    },
    {
      enabled: hasAccess && !!currentTenant?.id,
      staleTime: 30 * 1000 // 30 segundos
    }
  );

  // AIDEV-NOTE: Mutation para criar faturamento avulso
  const createMutation = useSecureTenantMutation(
    async (supabaseClient, tenantId, data: CreateStandaloneBillingData) => {
      // AIDEV-NOTE: Validar dados antes de criar
      if (!data.customer_id) {
        throw new Error('Cliente é obrigatório');
      }

      if (!data.items || data.items.length === 0) {
        throw new Error('É necessário adicionar pelo menos um item (produto ou serviço)');
      }

      if (!data.bill_date || !data.due_date) {
        throw new Error('Data de faturamento e vencimento são obrigatórias');
      }

      // AIDEV-NOTE: Validar estoque disponível para produtos
      for (const item of data.items) {
        if (item.product_id && item.storage_location_id) {
          const { data: stock } = await supabaseClient
            .from('product_stock_by_location')
            .select('available_stock')
            .eq('tenant_id', tenantId)
            .eq('product_id', item.product_id)
            .eq('storage_location_id', item.storage_location_id)
            .single();

          const availableStock = stock?.available_stock || 0;
          if (availableStock < item.quantity) {
            throw new Error(
              `Estoque insuficiente para o produto. Disponível: ${availableStock}, Necessário: ${item.quantity}`
            );
          }
        }
      }

      // AIDEV-NOTE: Criar faturamento avulso
      const period = await standaloneBillingService.createStandaloneBilling(
        supabaseClient,
        tenantId,
        {
          ...data,
          tenant_id: tenantId
        }
      );

      return period;
    },
    {
      onSuccess: (period) => {
        toast({
          title: 'Faturamento avulso criado',
          description: `Faturamento criado com sucesso. Valor: R$ ${period.amount_planned.toFixed(2)}`,
        });

        // AIDEV-NOTE: Invalidar cache do Kanban para aparecer o novo card
        queryClient.invalidateQueries({ queryKey: ['billing_kanban', currentTenant?.id] });
        queryClient.invalidateQueries({ queryKey: ['standalone_billing_periods', currentTenant?.id] });
      },
      onError: (error) => {
        toast({
          title: 'Erro ao criar faturamento avulso',
          description: error.message,
          variant: 'destructive',
        });
      },
      invalidateQueries: ['billing_kanban', 'standalone_billing_periods']
    }
  );

  // AIDEV-NOTE: Mutation para processar faturamento avulso
  const processMutation = useSecureTenantMutation(
    async (supabaseClient, tenantId, periodId: string) => {
      // AIDEV-NOTE: Processar faturamento (criar charge, baixar estoque, etc)
      const result = await standaloneBillingService.processStandaloneBilling(
        supabaseClient,
        tenantId,
        periodId
      );

      if (!result.success) {
        throw new Error(result.error || 'Erro ao processar faturamento');
      }

      return result;
    },
    {
      onSuccess: (result) => {
        toast({
          title: 'Faturamento processado',
          description: `Charge criada com sucesso. ${result.items_processed || 0} item(ns) processado(s).`,
        });

        // AIDEV-NOTE: Invalidar cache
        queryClient.invalidateQueries({ queryKey: ['billing_kanban', currentTenant?.id] });
        queryClient.invalidateQueries({ queryKey: ['standalone_billing_periods', currentTenant?.id] });
        queryClient.invalidateQueries({ queryKey: ['charges', currentTenant?.id] });
        queryClient.invalidateQueries({ queryKey: ['stock_movements', currentTenant?.id] });
      },
      onError: (error) => {
        toast({
          title: 'Erro ao processar faturamento',
          description: error.message,
          variant: 'destructive',
        });
      },
      invalidateQueries: ['billing_kanban', 'charges', 'standalone_billing_periods', 'stock_movements']
    }
  );

  // AIDEV-NOTE: Query para buscar um período específico
  const usePeriod = (periodId: string | null) => {
    return useSecureTenantQuery(
      ['standalone_billing_period', currentTenant?.id, periodId],
      async (supabaseClient, tenantId) => {
        if (!periodId) return null;

        return await standaloneBillingService.getStandaloneBillingPeriod(
          supabaseClient,
          tenantId,
          periodId
        );
      },
      {
        enabled: hasAccess && !!currentTenant?.id && !!periodId,
        staleTime: 30 * 1000
      }
    );
  };

  // AIDEV-NOTE: Query para buscar itens de um período
  const useItems = (periodId: string | null) => {
    return useSecureTenantQuery(
      ['standalone_billing_items', currentTenant?.id, periodId],
      async (supabaseClient, tenantId) => {
        if (!periodId) return [];

        return await standaloneBillingService.getStandaloneBillingItems(
          supabaseClient,
          tenantId,
          periodId
        );
      },
      {
        enabled: hasAccess && !!currentTenant?.id && !!periodId,
        staleTime: 30 * 1000
      }
    );
  };

  return {
    // Dados
    periods: periods || [],
    isLoading,
    error: error?.message || null,

    // Mutations
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    process: processMutation.mutateAsync,
    isProcessing: processMutation.isPending,

    // Queries auxiliares
    usePeriod,
    useItems,

    // Utilitários
    refetch
  };
}


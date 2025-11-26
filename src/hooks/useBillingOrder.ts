import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

/**
 * AIDEV-NOTE: Interface para ordem de faturamento
 * Representa uma ordem que pode estar em contract_billings (faturada) 
 * ou ser gerada dinamicamente do contrato (pendente)
 */
export interface BillingOrder {
  // Dados do período
  period_id: string;
  period_start: string;
  period_end: string;
  bill_date: string;
  due_date?: string; // AIDEV-NOTE: Data de vencimento
  status: 'PENDING' | 'BILLED' | 'PAID' | 'OVERDUE';
  
  // Dados do contrato
  contract_id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  seller_name?: string; // AIDEV-NOTE: Vendedor (opcional)
  
  // Número da Ordem de Serviço (sequencial: 001, 002, ...)
  order_number: string; // AIDEV-NOTE: Número sequencial da Ordem de Serviço
  
  // Valores e resumo financeiro
  amount_planned: number;
  amount_billed?: number;
  total_services: number; // AIDEV-NOTE: Soma dos serviços
  total_products: number; // AIDEV-NOTE: Soma dos produtos
  total_discounts: number; // AIDEV-NOTE: Total de descontos
  total_taxes: number; // AIDEV-NOTE: Total de impostos
  reimbursable_expenses: number; // AIDEV-NOTE: Despesas reembolsáveis (por enquanto 0)
  
  // Parcelas e pagamento
  installment_number?: number; // AIDEV-NOTE: Número da parcela atual
  total_installments?: number; // AIDEV-NOTE: Total de parcelas
  payment_method?: string; // AIDEV-NOTE: Método de pagamento
  
  // Indica se a ordem está congelada (já foi faturada)
  isFrozen: boolean;
  
  // Dados da ordem de faturamento (se existir)
  billing_id?: string;
  billing_number?: string;
  reference_period?: string;
  issue_date?: string; // AIDEV-NOTE: Data de emissão
  
  // Itens da ordem
  items?: BillingOrderItem[];
}

export interface BillingOrderItem {
  id: string;
  type: 'service' | 'product';
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  discount_amount?: number;
  tax_amount?: number;
}

interface UseBillingOrderParams {
  periodId: string;
  enabled?: boolean;
}

/**
 * AIDEV-NOTE: Hook para buscar ordem de faturamento baseada no período
 * 
 * Lógica:
 * - Se período está BILLED → busca contract_billings (dados congelados)
 * - Se período está PENDING → busca dados do contrato (dinâmico)
 */
export function useBillingOrder({ periodId, enabled = true }: UseBillingOrderParams) {
  return useSecureTenantQuery(
    ['billing_order', periodId],
    async (supabase, tenantId) => {
      // AIDEV-NOTE: Configurar contexto de tenant
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId 
      });

      // AIDEV-NOTE: Buscar período de faturamento primeiro
      const { data: period, error: periodError } = await supabase
        .from('contract_billing_periods')
        .select('*')
        .eq('id', periodId)
        .eq('tenant_id', tenantId)
        .single();

      if (periodError || !period) {
        // AIDEV-NOTE: Pode ser um faturamento avulso (standalone_billing_periods)
        const { data: standalonePeriod } = await supabase
          .from('standalone_billing_periods')
          .select('*')
          .eq('id', periodId)
          .eq('tenant_id', tenantId)
          .single();

        if (!standalonePeriod) {
          throw new Error(`Período de faturamento não encontrado: ${periodError?.message || 'Período não existe'}`);
        }

        // AIDEV-NOTE: Se for standalone, retornar dados específicos
        // Por enquanto, vamos tratar como erro pois o componente espera contract_id
        throw new Error('Faturamento avulso não suportado neste contexto');
      }

      // AIDEV-NOTE: Buscar dados do contrato separadamente (mais confiável que relacionamentos aninhados)
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id, contract_number, customer_id, installments, payment_method')
        .eq('id', period.contract_id)
        .eq('tenant_id', tenantId)
        .single();

      if (contractError || !contract) {
        throw new Error(`Contrato não encontrado: ${contractError?.message || 'Contrato não existe'}`);
      }

      // AIDEV-NOTE: Buscar dados do cliente separadamente
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('id', contract.customer_id)
        .eq('tenant_id', tenantId)
        .single();

      if (customerError || !customer) {
        throw new Error(`Cliente não encontrado: ${customerError?.message || 'Cliente não existe'}`);
      }

      // AIDEV-NOTE: Combinar dados do período, contrato e cliente
      const periodWithContract = {
        ...period,
        contracts: {
          ...contract,
          customers: customer
        }
      };

      const isFrozen = periodWithContract.status === 'BILLED' || periodWithContract.status === 'PAID';

      // AIDEV-NOTE: Se período está faturado, buscar ordem de faturamento congelada
      if (isFrozen) {
        // Buscar contract_billings relacionado ao período
        // Relação é feita por reference_period e datas
        const periodStart = format(new Date(periodWithContract.period_start), 'yyyy-MM-dd');
        const periodEnd = format(new Date(periodWithContract.period_end), 'yyyy-MM-dd');
        const referencePeriod = format(new Date(periodWithContract.period_start), 'MM/yyyy');

        const { data: billing, error: billingError } = await supabase
          .from('contract_billings')
          .select(`
            *,
            items:contract_billing_items(*)
          `)
          .eq('contract_id', periodWithContract.contract_id)
          .eq('tenant_id', tenantId)
          .eq('reference_period', referencePeriod)
          .gte('reference_start_date', periodStart)
          .lte('reference_end_date', periodEnd)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (billingError) {
          console.warn('Erro ao buscar ordem de faturamento:', billingError);
        }

        if (billing) {
          // AIDEV-NOTE: Calcular totais dos itens
          const serviceItems = (billing.items || []).filter((item: any) => item.contract_service_id);
          const productItems = (billing.items || []).filter((item: any) => !item.contract_service_id);
          
          const totalServices = serviceItems.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);
          const totalProducts = productItems.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);
          const totalDiscounts = (billing.items || []).reduce((sum: number, item: any) => sum + (item.discount_amount || 0), 0);
          const totalTaxes = (billing.items || []).reduce((sum: number, item: any) => sum + (item.tax_amount || 0), 0);
          
          // AIDEV-NOTE: Retornar ordem congelada de contract_billings
          return {
            period_id: periodWithContract.id,
            period_start: periodWithContract.period_start,
            period_end: periodWithContract.period_end,
            bill_date: periodWithContract.bill_date,
            due_date: billing.due_date,
            status: periodWithContract.status,
            contract_id: periodWithContract.contract_id,
            contract_number: periodWithContract.contracts.contract_number,
            customer_id: periodWithContract.contracts.customer_id,
            customer_name: periodWithContract.contracts.customers.name,
            order_number: periodWithContract.order_number || 'N/A', // AIDEV-NOTE: Número sequencial da Ordem de Serviço
            amount_planned: periodWithContract.amount_planned || 0,
            amount_billed: periodWithContract.amount_billed || billing.net_amount,
            total_services,
            total_products,
            total_discounts: billing.discount_amount || totalDiscounts,
            total_taxes: billing.tax_amount || totalTaxes,
            reimbursable_expenses: 0, // AIDEV-NOTE: Por enquanto não temos despesas reembolsáveis
            installment_number: billing.installment_number,
            total_installments: billing.total_installments,
            payment_method: billing.payment_method || periodWithContract.contracts.payment_method,
            isFrozen: true,
            billing_id: billing.id,
            billing_number: billing.billing_number,
            reference_period: billing.reference_period,
            issue_date: billing.issue_date,
            items: (billing.items || []).map((item: any) => ({
              id: item.id,
              type: item.contract_service_id ? 'service' : 'product',
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              total_amount: item.total_amount || 0,
              discount_amount: item.discount_amount || 0,
              tax_amount: item.tax_amount || 0,
            })),
          } as BillingOrder;
        }
      }

      // AIDEV-NOTE: Se período está pendente ou não encontrou billing, buscar dados do contrato (dinâmico)
      // Buscar serviços e produtos do contrato
      const [servicesResult, productsResult] = await Promise.all([
        supabase
          .from('contract_services')
          .select(`
            *,
            services!inner(
              id,
              name,
              description
            )
          `)
          .eq('contract_id', periodWithContract.contract_id)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .eq('generate_billing', true),
        supabase
          .from('contract_products')
          .select(`
            *,
            products!inner(
              id,
              name,
              description
            )
          `)
          .eq('contract_id', periodWithContract.contract_id)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .eq('generate_billing', true),
      ]);

      if (servicesResult.error) {
        console.warn('Erro ao buscar serviços do contrato:', servicesResult.error);
      }
      if (productsResult.error) {
        console.warn('Erro ao buscar produtos do contrato:', productsResult.error);
      }

      // AIDEV-NOTE: Mapear serviços e produtos para itens da ordem
      const serviceItems: BillingOrderItem[] = (servicesResult.data || []).map((cs: any) => ({
        id: cs.id,
        type: 'service' as const,
        description: cs.services?.name || cs.description || 'Serviço',
        quantity: cs.quantity || 1,
        unit_price: cs.unit_price || 0,
        total_amount: (cs.quantity || 1) * (cs.unit_price || 0) - (cs.discount_amount || 0),
        discount_amount: cs.discount_amount || 0,
        tax_amount: cs.tax_amount || 0,
      }));

      const productItems: BillingOrderItem[] = (productsResult.data || []).map((cp: any) => ({
        id: cp.id,
        type: 'product' as const,
        description: cp.products?.name || cp.description || 'Produto',
        quantity: cp.quantity || 1,
        unit_price: cp.unit_price || 0,
        total_amount: (cp.quantity || 1) * (cp.unit_price || 0) - (cp.discount_amount || 0),
        discount_amount: cp.discount_amount || 0,
        tax_amount: cp.tax_amount || 0,
      }));

      const items = [...serviceItems, ...productItems];
      const totalAmount = items.reduce((sum, item) => sum + item.total_amount, 0);
      const totalServices = serviceItems.reduce((sum, item) => sum + item.total_amount, 0);
      const totalProducts = productItems.reduce((sum, item) => sum + item.total_amount, 0);
      const totalDiscounts = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
      const totalTaxes = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);

      return {
        period_id: periodWithContract.id,
        period_start: periodWithContract.period_start,
        period_end: periodWithContract.period_end,
        bill_date: periodWithContract.bill_date,
        status: periodWithContract.status,
        contract_id: periodWithContract.contract_id,
        contract_number: periodWithContract.contracts.contract_number,
        customer_id: periodWithContract.contracts.customer_id,
        customer_name: periodWithContract.contracts.customers.name,
        order_number: periodWithContract.order_number || 'N/A', // AIDEV-NOTE: Número sequencial da Ordem de Serviço
        amount_planned: periodWithContract.amount_planned || totalAmount,
        amount_billed: periodWithContract.amount_billed,
        total_services,
        total_products,
        total_discounts,
        total_taxes,
        reimbursable_expenses: 0, // AIDEV-NOTE: Por enquanto não temos despesas reembolsáveis
        installment_number: periodWithContract.contracts.installments ? 1 : undefined,
        total_installments: periodWithContract.contracts.installments,
        payment_method: periodWithContract.contracts.payment_method,
        isFrozen: false,
        items,
      } as BillingOrder;
    },
    {
      enabled: enabled && !!periodId,
      refetchOnWindowFocus: false,
    }
  );
}


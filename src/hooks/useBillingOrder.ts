import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

// AIDEV-NOTE: Tipos de erro específicos para melhor tratamento
export type BillingOrderErrorType = 
  | 'PERIOD_NOT_FOUND'
  | 'CONTRACT_NOT_FOUND'
  | 'CUSTOMER_NOT_FOUND'
  | 'STANDALONE_PERIOD'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * AIDEV-NOTE: Interface para erro de ordem de faturamento
 * Permite tratamento específico de diferentes tipos de erro
 */
export interface BillingOrderError {
  type: BillingOrderErrorType;
  message: string;
  details?: string;
  canRetry: boolean;
}

/**
 * AIDEV-NOTE: Função auxiliar para criar erro tipado
 */
export const createBillingOrderError = (
  type: BillingOrderErrorType,
  message: string,
  details?: string,
  canRetry: boolean = true
): BillingOrderError => ({
  type,
  message,
  details,
  canRetry,
});

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
  /** Se true, não faz fallback para standalone_billing_periods quando não encontrar em contract_billing_periods */
  skipStandaloneFallback?: boolean;
}

/**
 * AIDEV-NOTE: Hook para buscar ordem de faturamento baseada no período
 * 
 * Lógica:
 * - Se período está BILLED → busca contract_billings (dados congelados)
 * - Se período está PENDING → busca dados do contrato (dinâmico)
 * 
 * REFATORAÇÃO: Agora aceita skipStandaloneFallback para evitar busca desnecessária
 * quando já sabemos que não é standalone
 */
export function useBillingOrder({ periodId, enabled = true, skipStandaloneFallback = false }: UseBillingOrderParams) {
  return useSecureTenantQuery(
    ['billing_order', periodId],
    async (supabase, tenantId) => {
      // AIDEV-NOTE: Buscar período de faturamento diretamente
      // A RLS policy foi corrigida para suportar fallback via auth.uid()
      // AIDEV-NOTE: Melhorado tratamento de erro para lidar com HTTP 400 (pode ser RLS ou período não existe)
      let period: any = null;
      let periodError: any = null;
      
      // AIDEV-NOTE: CORREÇÃO - Retry automático para evitar falhas temporárias após sessão longa
      // Problema: Após muito tempo sem atualizar a página, a sessão/contexto pode estar dessincronizado
      // Solução: Fazer até 3 tentativas com delay progressivo antes de mostrar erro ao usuário
      const MAX_RETRY_ATTEMPTS = 3;
      const RETRY_DELAY_MS = 200;
      
      for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        const attemptResult = await supabase
          .from('contract_billing_periods')
          .select('*')
          .eq('id', periodId)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        
        period = attemptResult.data;
        periodError = attemptResult.error;
        
        // AIDEV-NOTE: Se encontrou o período, sair do loop
        if (period) {
          if (attempt > 1) {
            console.log(`[useBillingOrder] ✅ Período encontrado na tentativa ${attempt}`);
          }
          break;
        }
        
        // AIDEV-NOTE: Se teve erro explícito que não é temporário, sair do loop
        const isTemporaryError = !periodError || 
          periodError.code === 'PGRST116' ||
          periodError.message?.includes('400') ||
          periodError.message?.includes('Bad Request') ||
          (periodError as any)?.status === 400;
        
        if (periodError && !isTemporaryError) {
          console.warn(`[useBillingOrder] Erro não recuperável na tentativa ${attempt}:`, periodError);
          break;
        }
        
        // AIDEV-NOTE: Se não é a última tentativa, esperar antes de tentar novamente
        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAY_MS * attempt; // Delay progressivo: 200ms, 400ms, 600ms
          console.log(`[useBillingOrder] 🔄 Tentativa ${attempt}/${MAX_RETRY_ATTEMPTS} falhou, aguardando ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // AIDEV-NOTE: Verificar se o erro é um erro "não encontrado" ou erro de RLS (400)
      // Códigos de erro do PostgREST:
      // - PGRST116: No rows returned (não encontrado) - não é erro crítico
      // - HTTP 400: Bad Request (pode ser RLS bloqueando ou query inválida)
      // - Outros: erros críticos que devem ser propagados
      const isNotFoundError = periodError?.code === 'PGRST116';
      const isBadRequestError = periodError && 
        (periodError.message?.includes('400') || 
         periodError.message?.includes('Bad Request') ||
         (periodError as any)?.status === 400);
      
      // AIDEV-NOTE: Se skipStandaloneFallback está ativo, não tentar standalone
      // Isso é usado quando já sabemos que não é standalone (ex: isStandalone=false do Kanban)
      if (skipStandaloneFallback) {
        // AIDEV-NOTE: Se não encontrou após todas as tentativas, lançar erro
        if (!period) {
          // AIDEV-NOTE: Log detalhado para debug (seguindo guia de auditoria)
          console.warn('[useBillingOrder] Período não encontrado após todas as tentativas:', {
            periodId,
            tenantId,
            errorCode: periodError?.code,
            errorMessage: periodError?.message,
            isNotFoundError,
            isBadRequestError,
            attemptsUsed: MAX_RETRY_ATTEMPTS,
          });
          
          // AIDEV-NOTE: Verificar se foi um erro crítico ou apenas "não encontrado"
          if (periodError && !isNotFoundError && !isBadRequestError) {
            // AIDEV-NOTE: Erro crítico (não 400 ou PGRST116), propagar
            const error = createBillingOrderError(
              'PERIOD_NOT_FOUND',
              'Erro ao buscar período de faturamento',
              periodError.message || 'Erro desconhecido ao buscar período',
              true
            );
            throw error;
          }
          // AIDEV-NOTE: Erro "não encontrado" ou 400 persistente - período pode ter sido deletado ou movido
          // AIDEV-NOTE: CORREÇÃO - Mensagem mais amigável que não assusta o usuário
          const error = createBillingOrderError(
            'PERIOD_NOT_FOUND',
            'Período de faturamento não encontrado',
            'Não foi possível carregar os dados do período. Tente atualizar a página.',
            true
          );
          throw error;
        }
        // AIDEV-NOTE: Se encontrou, continuar normalmente (não entrar no bloco de fallback)
      }

      // AIDEV-NOTE: TABELA UNIFICADA - Verificar se é standalone diretamente
      // Com a unificação das tabelas, não precisamos mais de fallback para standalone_billing_periods
      // Todos os períodos (contrato e avulso) estão em contract_billing_periods com flag is_standalone
      
      // AIDEV-NOTE: Se não encontrou período, lançar erro
      if (!period && !skipStandaloneFallback) {
        // AIDEV-NOTE: Período não encontrado
        if (periodError && !isNotFoundError && !isBadRequestError) {
          const error = createBillingOrderError(
            'PERIOD_NOT_FOUND',
            'Erro ao buscar período de faturamento',
            periodError.message || 'Erro desconhecido ao buscar período',
            true
          );
          throw error;
        }

        const error = createBillingOrderError(
          'PERIOD_NOT_FOUND',
          'Período de faturamento não encontrado',
          'Período não encontrado na tabela unificada contract_billing_periods',
          true
        );
        throw error;
      }

      // AIDEV-NOTE: Se é um período standalone (is_standalone = true), retornar null
      // para que o componente use useStandalonePeriod
      if (period?.is_standalone === true) {
        console.log('[useBillingOrder] Período é standalone, delegando para useStandalonePeriod');
        return null;
      }

      // AIDEV-NOTE: Buscar dados do contrato separadamente (mais confiável que relacionamentos aninhados)
      // AIDEV-NOTE: Removido payment_method pois não existe na tabela contracts, está em contract_services
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id, contract_number, customer_id, installments')
        .eq('id', period.contract_id)
        .eq('tenant_id', tenantId)
        .single();

      if (contractError || !contract) {
        const error = createBillingOrderError(
          'CONTRACT_NOT_FOUND',
          'Contrato não encontrado',
          contractError?.message || 'O contrato associado a este período não existe',
          false
        );
        throw error;
      }

      // AIDEV-NOTE: Buscar dados do cliente separadamente
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('id', contract.customer_id)
        .eq('tenant_id', tenantId)
        .single();

      if (customerError || !customer) {
        const error = createBillingOrderError(
          'CUSTOMER_NOT_FOUND',
          'Cliente não encontrado',
          customerError?.message || 'O cliente associado a este contrato não existe',
          false
        );
        throw error;
      }

      // AIDEV-NOTE: Buscar payment_method dos serviços do contrato (primeiro serviço ativo)
      const { data: firstService } = await supabase
        .from('contract_services')
        .select('payment_method')
        .eq('contract_id', period.contract_id)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const contractPaymentMethod = firstService?.payment_method || 'Boleto';

      // AIDEV-NOTE: Combinar dados do período, contrato e cliente
      const periodWithContract = {
        ...period,
        contracts: {
          ...contract,
          customers: customer,
          payment_method: contractPaymentMethod // AIDEV-NOTE: payment_method vem dos serviços
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
          const billingServiceItems = (billing.items || []).filter((item: any) => item.contract_service_id);
          const billingProductItems = (billing.items || []).filter((item: any) => !item.contract_service_id);
          
          const billingTotalServices = billingServiceItems.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);
          const billingTotalProducts = billingProductItems.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);
          const billingTotalDiscounts = (billing.items || []).reduce((sum: number, item: any) => sum + (item.discount_amount || 0), 0);
          const billingTotalTaxes = (billing.items || []).reduce((sum: number, item: any) => sum + (item.tax_amount || 0), 0);
          
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
            total_services: billingTotalServices,
            total_products: billingTotalProducts,
            total_discounts: billing.discount_amount || billingTotalDiscounts,
            total_taxes: billing.tax_amount || billingTotalTaxes,
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
      const pendingTotalServices = serviceItems.reduce((sum, item) => sum + item.total_amount, 0);
      const pendingTotalProducts = productItems.reduce((sum, item) => sum + item.total_amount, 0);
      const pendingTotalDiscounts = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
      const pendingTotalTaxes = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);

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
        total_services: pendingTotalServices,
        total_products: pendingTotalProducts,
        total_discounts: pendingTotalDiscounts,
        total_taxes: pendingTotalTaxes,
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
      // AIDEV-NOTE: CORREÇÃO - Adicionar staleTime menor para evitar cache muito longo
      // Problema: Cache de 10min causa erros após sessão longa
      // Solução: Cache de 2min para dados de período específico
      staleTime: 2 * 60 * 1000, // 2 minutos
    }
  );
}


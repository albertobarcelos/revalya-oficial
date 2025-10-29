import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface MonthlyBillingItem {
  id: string;
  type: 'service' | 'product';
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method?: string;
  billing_type?: string;
  due_date?: string;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
}

export interface MonthlyBillingData {
  items: MonthlyBillingItem[];
  total_amount: number;
  total_tax: number;
  total_discount: number;
  net_amount: number;
  contract_info: {
    id: string;
    contract_number: string;
    customer_name: string;
    billing_day: number;
    billing_type: string;
    status: string;
  };
  billing_period: {
    start_date: string;
    end_date: string;
    due_date: string;
  };
}

export interface UseMonthlyBillingReturn {
  billingData: MonthlyBillingData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  calculateNextDueDate: (billingDay: number) => Date;
}

/**
 * Hook para buscar e gerenciar dados de faturamento mensal de um contrato
 * @param contractId - ID do contrato
 * @param month - Mês para buscar (opcional, padrão é o mês atual)
 * @param year - Ano para buscar (opcional, padrão é o ano atual)
 */
export function useMonthlyBilling(
  contractId: string | null,
  month?: number,
  year?: number
): UseMonthlyBillingReturn {
  const [billingData, setBillingData] = useState<MonthlyBillingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calcula a próxima data de vencimento baseada no dia de faturamento
   */
  const calculateNextDueDate = useCallback((billingDay: number): Date => {
    const currentDate = new Date();
    const targetMonth = month ?? currentDate.getMonth();
    const targetYear = year ?? currentDate.getFullYear();
    
    let dueDate = new Date(targetYear, targetMonth, billingDay);
    
    // Se o dia já passou no mês atual e estamos no mês atual, usar o próximo mês
    if (month === undefined && year === undefined && dueDate < currentDate) {
      dueDate = new Date(targetYear, targetMonth + 1, billingDay);
    }
    
    return dueDate;
  }, [month, year]);

  /**
   * Busca os dados de faturamento mensal do contrato
   */
  const fetchMonthlyBillingData = useCallback(async () => {
    if (!contractId) {
      setBillingData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar dados do contrato
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          billing_day,
          billing_type,
          status,
          customers!inner(
            id,
            name
          ),
          contract_products(
            id,
            description,
            quantity,
            unit_price,
            total_amount,
            discount_amount,
            payment_method,
            billing_type,
            tax_rate,
            tax_amount,
            is_active
          )
        `)
        .eq('id', contractId)
        .single();

      if (contractError) {
        throw new Error(`Erro ao buscar contrato: ${contractError.message}`);
      }

      if (!contractData) {
        throw new Error('Contrato não encontrado');
      }

      // Buscar serviços do contrato usando a view detalhada
      const { data: servicesData, error: servicesError } = await supabase
        .from('vw_contract_services_detailed')
        .select(`
          contract_service_id,
          service_description,
          quantity,
          unit_price,
          total_amount,
          discount_amount,
          payment_method,
          billing_type,
          tax_rate,
          tax_amount,
          is_active
        `)
        .eq('contract_id', contractId)
        .eq('is_active', true);

      if (servicesError) {
        throw new Error(`Erro ao buscar serviços: ${servicesError.message}`);
      }

      // Processar serviços ativos
      const services: MonthlyBillingItem[] = (servicesData || [])
        .map((service: any) => ({
          id: service.contract_service_id, // AIDEV-NOTE: Usando contract_service_id da view
          type: 'service' as const,
          description: service.service_description || 'Serviço sem descrição',
          quantity: service.quantity || 1,
          unit_price: service.unit_price || 0,
          total_amount: service.total_amount || 0,
          discount_amount: service.discount_amount || 0,
          payment_method: service.payment_method,
          billing_type: service.billing_type,
          tax_rate: service.tax_rate || 0,
          tax_amount: service.tax_amount || 0
        }));

      // Processar produtos ativos
      const products: MonthlyBillingItem[] = (contractData.contract_products || [])
        .filter((product: any) => product.is_active)
        .map((product: any) => ({
          id: product.id,
          type: 'product' as const,
          description: product.description || 'Produto sem descrição',
          quantity: product.quantity || 1,
          unit_price: product.unit_price || 0,
          total_amount: product.total_amount || 0,
          discount_amount: product.discount_amount || 0,
          payment_method: product.payment_method,
          billing_type: product.billing_type,
          tax_rate: product.tax_rate || 0,
          tax_amount: product.tax_amount || 0
        }));

      // Combinar serviços e produtos
      const allItems = [...services, ...products];

      // Calcular totais
      const total_amount = allItems.reduce((sum, item) => sum + item.total_amount, 0);
      const total_tax = allItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
      const total_discount = allItems.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
      const net_amount = total_amount - total_tax;

      // Calcular período de faturamento
      const targetDate = new Date(year ?? new Date().getFullYear(), month ?? new Date().getMonth(), 1);
      const start_date = startOfMonth(targetDate);
      const end_date = endOfMonth(targetDate);
      const due_date = calculateNextDueDate(contractData.billing_day);

      // Adicionar data de vencimento aos itens
      const itemsWithDueDate = allItems.map(item => ({
        ...item,
        due_date: due_date.toISOString()
      }));

      setBillingData({
        items: itemsWithDueDate,
        total_amount,
        total_tax,
        total_discount,
        net_amount,
        contract_info: {
          id: contractData.id,
          contract_number: contractData.contract_number,
          customer_name: contractData.customers?.name || 'Cliente não informado',
          billing_day: contractData.billing_day,
          billing_type: contractData.billing_type,
          status: contractData.status
        },
        billing_period: {
          start_date: start_date.toISOString(),
          end_date: end_date.toISOString(),
          due_date: due_date.toISOString()
        }
      });
    } catch (err) {
      console.error('Erro ao buscar dados de faturamento mensal:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setBillingData(null);
    } finally {
      setLoading(false);
    }
  }, [contractId, month, year, calculateNextDueDate]);

  /**
   * Função para refazer a busca dos dados
   */
  const refetch = useCallback(async () => {
    await fetchMonthlyBillingData();
  }, [fetchMonthlyBillingData]);

  // Buscar dados quando o contractId ou período mudar
  useEffect(() => {
    fetchMonthlyBillingData();
  }, [fetchMonthlyBillingData]);

  return {
    billingData,
    loading,
    error,
    refetch,
    calculateNextDueDate
  };
}

/**
 * Hook simplificado para buscar apenas os totais de faturamento mensal
 * @param contractId - ID do contrato
 */
export function useMonthlyBillingSummary(contractId: string | null) {
  const { billingData, loading, error } = useMonthlyBilling(contractId);

  return {
    summary: billingData ? {
      total_items: billingData.items.length,
      total_amount: billingData.total_amount,
      net_amount: billingData.net_amount,
      due_date: billingData.billing_period.due_date
    } : null,
    loading,
    error
  };
}

/**
 * Utilitários para formatação de dados de faturamento
 */
export const billingUtils = {
  /**
   * Formata valores monetários
   */
  formatCurrency: (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  /**
   * Formata método de pagamento para exibição
   */
  formatPaymentMethod: (method?: string): string => {
    if (!method) return 'Não informado';
    
    const methods: Record<string, string> = {
      'Cartão': 'Cartão de Crédito',
      'PIX': 'PIX',
      'Boleto': 'Boleto Bancário',
      'Transferência': 'Transferência Bancária',
      'Dinheiro': 'Dinheiro'
    };
    
    return methods[method] || method;
  },

  /**
   * Formata tipo de faturamento para exibição
   */
  formatBillingType: (type?: string): string => {
    if (!type) return 'Não informado';
    
    const types: Record<string, string> = {
      'MONTHLY': 'Mensal',
      'QUARTERLY': 'Trimestral',
      'SEMIANNUAL': 'Semestral',
      'ANNUAL': 'Anual',
      'CUSTOM': 'Personalizado',
      'Mensal': 'Mensal',
      'Trimestral': 'Trimestral',
      'Semestral': 'Semestral',
      'Anual': 'Anual',
      'Único': 'Pagamento Único'
    };
    
    return types[type] || type;
  },

  /**
   * Formata status do contrato
   */
  formatContractStatus: (status: string): string => {
    const statuses: Record<string, string> = {
      'DRAFT': 'Rascunho',
      'ACTIVE': 'Ativo',
      'SUSPENDED': 'Suspenso',
      'CANCELLED': 'Cancelado',
      'COMPLETED': 'Concluído'
    };
    
    return statuses[status] || status;
  }
};
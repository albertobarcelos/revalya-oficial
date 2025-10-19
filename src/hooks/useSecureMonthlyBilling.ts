/**
 * 🔐 Hook Seguro para Dados de Faturamento Mensal
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 * 
 * AIDEV-NOTE: Hook criado para corrigir inconsistências no modal de detalhes
 * que estava exibindo dados aleatórios devido à falta de isolamento multi-tenant
 */

import { useTenantAccessGuard, useSecureTenantQuery } from './templates/useSecureTenantQuery';
import { throttledAudit } from '@/utils/logThrottle';

// 📋 Interfaces para tipagem segura
export interface BillingItem {
  id: string;
  type: 'service' | 'product';
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  tax_amount?: number;
  tax_rate?: number;
  payment_method?: string;
  billing_type?: string;
  due_date?: string;
  generate_billing: boolean; // 🎯 AIDEV-NOTE: Campo para controlar se o item deve gerar cobrança automática
}

// 🎯 AIDEV-NOTE: Interface para serviços do contrato
interface ContractService {
  id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  description: string;
  payment_method: string;
  billing_type: string;
  is_active: boolean;
  generate_billing: boolean;
}

// 🎯 AIDEV-NOTE: Interface para produtos do contrato
interface ContractProduct {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  description: string;
  payment_method: string;
  billing_type: string;
  is_active: boolean;
  generate_billing: boolean;
}

// 🎯 AIDEV-NOTE: Interface para dados de faturamento mensal
export interface MonthlyBillingData {
  contract_info: {
    contract_number: string;
    customer_name: string;
    billing_day: number;
  };
  items: BillingItem[];
  total_amount: number;
  total_tax: number;
  net_amount: number;
  due_date: string;
}

// 📋 Parâmetros para o hook
interface UseSecureMonthlyBillingParams {
  contractId: string;
  enabled?: boolean;
}

/**
 * 🔐 Hook Seguro para Faturamento Mensal
 * 
 * Garante que apenas dados do tenant atual sejam consultados,
 * prevenindo vazamento de dados entre tenants.
 */
export function useSecureMonthlyBilling({ contractId, enabled = true }: UseSecureMonthlyBillingParams) {
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  // 🔐 CONSULTA SEGURA COM FILTRO OBRIGATÓRIO DE TENANT_ID
  const {
    data: billingData,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['monthly-billing', contractId],
    async (supabase, tenantId) => {
      // 🔍 LOG DE AUDITORIA OBRIGATÓRIO
      throttledAudit(`🧾 Consultando faturamento mensal - Contract: ${contractId}, Tenant: ${tenantId}`);

      // 🔧 CONFIGURAR CONTEXTO DE TENANT NO BANCO ANTES DA CONSULTA
      // AIDEV-NOTE: Essencial para que as políticas RLS funcionem corretamente
      const { error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId,
        p_user_id: null
      });
      
      if (contextError) {
        console.warn('⚠️ [CONTEXT] Aviso ao configurar contexto:', contextError);
        // Não falha, mas registra o aviso
      } else {
        console.log('✅ [CONTEXT] Contexto configurado com sucesso para tenant:', tenantId);
      }

      // 🛡️ CONSULTA COM FILTRO CRÍTICO DE TENANT_ID
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          billing_day,
          tenant_id,
          customers(
            id,
            name
          ),
          contract_services(
            id,
            service_id,
            quantity,
            unit_price,
            description,
            payment_method,
            billing_type,
            is_active,
            generate_billing
          ),
          contract_products(
            id,
            product_id,
            quantity,
            unit_price,
            description,
            payment_method,
            billing_type,
            is_active,
            generate_billing
          )
        `)
        .eq('id', contractId)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO CRÍTICO DE SEGURANÇA
        .single();

      if (contractError) {
        throw new Error(`Erro ao buscar contrato: ${contractError.message}`);
      }

      // 🔍 DEBUG: Log dos dados brutos do Supabase
      console.log('🔍 [DEBUG] Dados brutos do contrato:', JSON.stringify(contractData, null, 2));
      
      // 🔍 DEBUG: Verificar especificamente os arrays de serviços e produtos
      console.log('🔍 [DEBUG] contract_services array:', {
        exists: !!contractData.contract_services,
        isArray: Array.isArray(contractData.contract_services),
        length: contractData.contract_services?.length || 0,
        data: contractData.contract_services
      });
      
      console.log('🔍 [DEBUG] contract_products array:', {
        exists: !!contractData.contract_products,
        isArray: Array.isArray(contractData.contract_products),
        length: contractData.contract_products?.length || 0,
        data: contractData.contract_products
      });

      // 🛡️ VALIDAÇÃO DUPLA DE SEGURANÇA
      if (!contractData || contractData.tenant_id !== tenantId) {
        throw new Error('❌ ERRO CRÍTICO: Dados de tenant inválido detectados!');
      }

      // 📊 PROCESSAMENTO DOS DADOS DE FATURAMENTO
      const items: BillingItem[] = [];
      let totalAmount = 0;
      let totalTax = 0;

      // Processar serviços ativos
      if (contractData.contract_services && Array.isArray(contractData.contract_services)) {
        contractData.contract_services
          .filter((service: ContractService) => service && service.is_active)
          .forEach((service: ContractService) => {
            // 🔍 DEBUG: Log temporário para verificar dados do serviço
            console.log('🔍 [DEBUG] Processando serviço:', {
              id: service.id,
              description: service.description,
              generate_billing: service.generate_billing,
              generate_billing_type: typeof service.generate_billing
            });

            const taxRate = 0; // Configurar conforme regras de negócio
            const taxAmount = service.unit_price * service.quantity * (taxRate / 100);
            const itemTotal = (service.unit_price * service.quantity) + taxAmount;

            const billingItem = {
              id: service.id,
              type: 'service' as const,
              description: service.description || `Serviço ${service.service_id}`,
              quantity: service.quantity,
              unit_price: service.unit_price,
              total_amount: itemTotal,
              tax_amount: taxAmount,
              tax_rate: taxRate,
              payment_method: service.payment_method,
              billing_type: service.billing_type,
              generate_billing: service.generate_billing // 🎯 AIDEV-NOTE: Incluindo controle de cobrança automática por item
            };

            // 🔍 DEBUG: Log do item criado
            console.log('🔍 [DEBUG] Item de serviço criado:', billingItem);

            items.push(billingItem);
            totalAmount += itemTotal;
            totalTax += taxAmount;
          });
      }

      // Processar produtos ativos
      if (contractData.contract_products && Array.isArray(contractData.contract_products)) {
        contractData.contract_products
          .filter((product: ContractProduct) => product && product.is_active)
          .forEach((product: ContractProduct) => {
            // 🔍 DEBUG: Log temporário para verificar dados do produto
            console.log('🔍 [DEBUG] Processando produto:', {
              id: product.id,
              description: product.description,
              generate_billing: product.generate_billing,
              generate_billing_type: typeof product.generate_billing
            });

            const taxRate = 0; // Configurar conforme regras de negócio
            const taxAmount = product.unit_price * product.quantity * (taxRate / 100);
            const itemTotal = (product.unit_price * product.quantity) + taxAmount;

            const billingItem = {
              id: product.id,
              type: 'product' as const,
              description: product.description || `Produto ${product.product_id}`,
              quantity: product.quantity,
              unit_price: product.unit_price,
              total_amount: itemTotal,
              tax_amount: taxAmount,
              tax_rate: taxRate,
              payment_method: product.payment_method,
              billing_type: product.billing_type,
              generate_billing: product.generate_billing // 🎯 AIDEV-NOTE: Incluindo controle de cobrança automática por item
            };

            // 🔍 DEBUG: Log do item criado
            console.log('🔍 [DEBUG] Item de produto criado:', billingItem);

            items.push(billingItem);
            totalAmount += itemTotal;
            totalTax += taxAmount;
          });
      }

      // 📅 CALCULAR DATA DE VENCIMENTO
      const today = new Date();
      const dueDate = new Date(today.getFullYear(), today.getMonth(), contractData.billing_day);
      if (dueDate < today) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      // 🔍 DEBUG: Log final de todos os itens processados
      console.log('🔍 [DEBUG] Todos os itens processados:', items.map(item => ({
        id: item.id,
        type: item.type,
        description: item.description,
        generate_billing: item.generate_billing,
        generate_billing_type: typeof item.generate_billing
      })));

      // 🔍 LOG DE AUDITORIA DE SUCESSO
      throttledAudit(`✅ Faturamento mensal carregado - ${items.length} itens, Total: R$ ${totalAmount.toFixed(2)}`);

      // 📊 RETORNAR DADOS FORMATADOS E SEGUROS
      const result: MonthlyBillingData = {
        contract_info: {
          contract_number: contractData.contract_number,
          customer_name: contractData.customers?.name || 'Cliente não informado',
          billing_day: contractData.billing_day
        },
        items,
        total_amount: totalAmount,
        total_tax: totalTax,
        net_amount: totalAmount - totalTax,
        due_date: dueDate.toISOString()
      };

      return result;
    },
    {
      enabled: enabled && hasAccess && !!contractId
    }
  );

  // 🚨 TRATAMENTO DE ERRO DE ACESSO
  if (!hasAccess) {
    return {
      billingData: null,
      isLoading: false,
      error: accessError || 'Acesso negado',
      refetch: () => Promise.resolve()
    };
  }

  return {
    billingData,
    isLoading,
    error: error?.message || null,
    refetch
  };
}
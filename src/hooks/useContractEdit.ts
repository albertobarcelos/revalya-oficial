import { useState, useEffect, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { parseISO } from "date-fns";
import { supabase } from '@/lib/supabase';
import { ContractFormValues } from "@/components/contracts/schema/ContractFormSchema";
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';

interface ContractEditData {
  contract: any;
  services: any[];
  products: any[];
  customer: any;
}

interface UseContractEditReturn {
  data: ContractEditData | null;
  isLoading: boolean;
  error: Error | null;
  loadContract: (contractId: string, form: UseFormReturn<ContractFormValues>) => Promise<void>;
}

export function useContractEdit(): UseContractEditReturn {
  const [data, setData] = useState<ContractEditData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadedContractId, setLoadedContractId] = useState<string | null>(null);
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  const loadContract = useCallback(async (contractId: string, form: UseFormReturn<ContractFormValues>) => {
    if (!contractId) return;
    
    // 🛡️ VALIDAÇÃO CRÍTICA DE ACESSO
    if (!hasAccess) {
      throw new Error(accessError || 'Acesso negado ao tenant');
    }
    
    if (!currentTenant?.id) {
      throw new Error('Tenant não encontrado');
    }

    // Evitar recarregamento desnecessário do mesmo contrato
    if (loadedContractId === contractId) {
      console.log('📋 Contrato já carregado, evitando recarregamento:', contractId);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Iniciando carregamento otimizado do contrato:', contractId);
      console.log(`🔍 [AUDIT] Carregando contrato para tenant: ${currentTenant.name} (${currentTenant.id})`);
      
      // 🚀 CONSULTA OTIMIZADA: Buscar contrato, serviços, produtos e cliente em paralelo
      const [contractResult, servicesResult, productsResult] = await Promise.all([
        // Buscar contrato com dados do cliente
        supabase
          .from('contracts')
          .select(`
            *,
            customers!inner(
              id,
              name,
              company,
              email,
              cpf_cnpj,
              phone
            )
          `)
          .eq('id', contractId)
          .eq('tenant_id', currentTenant.id)
          .single(),
        
        // Buscar serviços do contrato
        supabase
          .from('contract_services')
          .select(`
            *,
            payment_method,
            card_type,
            billing_type,
            recurrence_frequency,
            installments,
            due_date_type,
            due_days,
            due_day,
            due_next_month,
            service:services(
              id,
              name,
              description,
              default_price
            )
          `)
          .eq('contract_id', contractId)
          .eq('tenant_id', currentTenant.id)
          .eq('is_active', true),
        
        // Buscar produtos do contrato
        supabase
          .from('contract_products')
          .select(`
            *,
            product:products(
              id,
              name,
              description,
              unit_price
            )
          `)
          .eq('contract_id', contractId)
          .eq('tenant_id', currentTenant.id)
          .eq('is_active', true)
      ]);

      if (contractResult.error) {
        throw new Error(`Erro ao carregar contrato: ${contractResult.error.message}`);
      }

      if (servicesResult.error) {
        console.warn('Aviso ao carregar serviços:', servicesResult.error);
      }

      if (productsResult.error) {
        console.warn('Aviso ao carregar produtos:', productsResult.error);
      }

      const contract = contractResult.data;
      const services = servicesResult.data || [];
      const products = productsResult.data || [];
      
      console.log('✅ Dados carregados:', {
        contract: contract.contract_number,
        servicesCount: services.length,
        productsCount: products.length,
        customer: contract.customer?.name
      });

      // 🔧 PREPARAR DADOS PARA O FORMULÁRIO
      console.log('🔧 Formatando serviços carregados do banco:', services);
      
      // AIDEV-NOTE: Funções para mapear valores do banco de volta para o formulário
      // Converte valores em inglês do banco para valores em português do frontend
      const reverseMapPaymentMethod = (paymentMethod: string | null): string => {
        if (!paymentMethod) return "";
        
        const reverseMapping: Record<string, string> = {
          // Valores em português do banco -> Valores em português do frontend
          'Cartão': 'Cartão',
          'PIX': 'PIX',
          'Transferência': 'Transferência Bancária',
          'Boleto': 'Boleto Bancário',
          // Valores em inglês legados -> Valores em português do frontend
          'credit_card': 'Cartão',
          'pix': 'PIX',
          'bank_transfer': 'Transferência Bancária',
          'bank_slip': 'Boleto Bancário'
        };
        
        return reverseMapping[paymentMethod] || paymentMethod;
      };
      
      const reverseMapBillingType = (billingType: string | null): string => {
        if (!billingType) return "Único";
        
        const reverseMapping: Record<string, string> = {
          // Valores em português do banco -> Valores em português do frontend
          'Único': 'Único',
          'Mensal': 'Mensal',
          'Trimestral': 'Trimestral',
          'Semestral': 'Semestral',
          'Anual': 'Anual',
          // Valores em inglês legados -> Valores em português do frontend
          'credit_recurring': 'Mensal',
          'unique': 'Único',
          'monthly': 'Mensal',
          'quarterly': 'Trimestral',
          'semiannual': 'Semestral',
          'annual': 'Anual'
        };
        
        return reverseMapping[billingType] || billingType;
      };
      
      const reverseMapRecurrenceFrequency = (frequency: string | null): string => {
        if (!frequency) return "Mensal";
        
        const reverseMapping: Record<string, string> = {
          // Valores em português do banco -> Valores em português do frontend
          'Mensal': 'Mensal',
          'Trimestral': 'Trimestral',
          'Semestral': 'Semestral',
          'Anual': 'Anual',
          'Único': 'Único',
          // Valores em inglês legados -> Valores em português do frontend
          'monthly': 'Mensal',
          'quarterly': 'Trimestral',
          'semiannual': 'Semestral',
          'annual': 'Anual',
          'unique': 'Único'
        };
        
        return reverseMapping[frequency] || frequency;
      };
      
      const formattedServices = services.map(service => {
        const formattedService = {
          id: service.id,
          service_id: service.service_id,
          name: service.service?.name || service.description,
          description: service.description,
          quantity: service.quantity,
          unit_price: service.unit_price,
          default_price: service.service?.default_price || service.unit_price,
          discount_percentage: service.discount_percentage,
          tax_rate: service.tax_rate,
          total_amount: service.total_amount,
          total: service.total_amount || (service.quantity * service.unit_price), // Garantir campo 'total'
          is_active: service.is_active,
          // Campos financeiros - mapear de volta para valores do formulário
          payment_method: reverseMapPaymentMethod(service.payment_method),
          card_type: service.card_type || "",
          billing_type: reverseMapBillingType(service.billing_type),
          recurrence_frequency: reverseMapRecurrenceFrequency(service.recurrence_frequency),
          installments: service.installments || 1,
          // Campos de vencimento - AIDEV-NOTE: Preservar dados de vencimento do banco (não usar padrões se não existirem)
          due_date_type: service.due_date_type,
          due_days: service.due_days,
          due_day: service.due_day,
          due_next_month: service.due_next_month
        };
        
        console.log('📋 Serviço formatado com mapeamento reverso:', {
          original: {
            payment_method: service.payment_method,
            billing_type: service.billing_type,
            recurrence_frequency: service.recurrence_frequency,
            // AIDEV-NOTE: Debug dos dados de vencimento carregados do banco
            due_date_type: service.due_date_type,
            due_days: service.due_days,
            due_day: service.due_day,
            due_next_month: service.due_next_month
          },
          mapped: {
            payment_method: formattedService.payment_method,
            billing_type: formattedService.billing_type,
            recurrence_frequency: formattedService.recurrence_frequency,
            // AIDEV-NOTE: Debug dos dados de vencimento formatados
            due_date_type: formattedService.due_date_type,
            due_days: formattedService.due_days,
            due_day: formattedService.due_day,
            due_next_month: formattedService.due_next_month
          }
        });
        
        return formattedService;
      });
      
      console.log('✅ Total de serviços formatados:', formattedServices.length);

      // Formatar produtos carregados do banco
      console.log('🔧 Formatando produtos carregados do banco:', products);
      
      const formattedProducts = products.map(product => {
        const formattedProduct = {
          id: product.id,
          product_id: product.product_id,
          name: product.product?.name || product.description,
          description: product.description,
          quantity: product.quantity,
          unit_price: product.unit_price,
          discount_percentage: product.discount_percentage,
          tax_rate: product.tax_rate,
          total_amount: product.total_amount,
          total: product.total_amount || (product.quantity * product.unit_price), // Garantir campo 'total'
          is_active: product.is_active,
          // Campos financeiros - mapear de volta para valores do formulário
          payment_method: reverseMapPaymentMethod(product.payment_method),
          card_type: product.card_type || "",
          billing_type: reverseMapBillingType(product.billing_type),
          recurrence_frequency: reverseMapRecurrenceFrequency(product.recurrence_frequency),
          installments: product.installments || 1,
          payment_gateway: product.payment_gateway,
          // Campos de vencimento - AIDEV-NOTE: Preservar dados de vencimento do banco (não usar padrões se não existirem)
          due_date_type: product.due_date_type,
          due_days: product.due_days,
          due_day: product.due_day,
          due_next_month: product.due_next_month,
          // AIDEV-NOTE: Incluir dados de impostos salvos no banco
          nbs_code: product.nbs_code,
          deduction_value: product.deduction_value,
          calculation_base: product.calculation_base,
          iss_rate: product.iss_rate,
          iss_deduct: product.iss_deduct,
          ir_rate: product.ir_rate,
          ir_deduct: product.ir_deduct,
          csll_rate: product.csll_rate,
          csll_deduct: product.csll_deduct,
          inss_rate: product.inss_rate,
          inss_deduct: product.inss_deduct,
          pis_rate: product.pis_rate,
          pis_deduct: product.pis_deduct,
          cofins_rate: product.cofins_rate,
          cofins_deduct: product.cofins_deduct
        };
        
        console.log('📋 Produto formatado com mapeamento reverso:', {
          original: {
            payment_method: product.payment_method,
            billing_type: product.billing_type,
            recurrence_frequency: product.recurrence_frequency,
            // AIDEV-NOTE: Debug dos dados de vencimento carregados do banco
            due_date_type: product.due_date_type,
            due_days: product.due_days,
            due_day: product.due_day,
            due_next_month: product.due_next_month
          },
          mapped: {
            payment_method: formattedProduct.payment_method,
            billing_type: formattedProduct.billing_type,
            recurrence_frequency: formattedProduct.recurrence_frequency,
            // AIDEV-NOTE: Debug dos dados de vencimento formatados
            due_date_type: formattedProduct.due_date_type,
            due_days: formattedProduct.due_days,
            due_day: formattedProduct.due_day,
            due_next_month: formattedProduct.due_next_month
          }
        });
        
        return formattedProduct;
      });
      
      console.log('✅ Total de produtos formatados:', formattedProducts.length);

      // 📝 POPULAR FORMULÁRIO COM DADOS CARREGADOS - APENAS UMA VEZ
      const formData: Partial<ContractFormValues> = {
        customer_id: contract.customer_id,
        contract_number: contract.contract_number,
        // AIDEV-NOTE: Corrigido timezone - usar parseISO para strings de data
        initial_date: contract.initial_date ? parseISO(contract.initial_date) : new Date(),
        final_date: contract.final_date ? parseISO(contract.final_date) : new Date(),
        billing_type: contract.billing_type || 'Mensal',
        billing_day: contract.billing_day || 10,
        anticipate_weekends: contract.anticipate_weekends ?? true,
        installments: contract.installments || 1,
        description: contract.description || '',
        internal_notes: contract.internal_notes || '',
        services: formattedServices,
        products: formattedProducts,
        total_amount: contract.total_amount || 0,
        total_discount: contract.total_discount || 0,
        total_tax: contract.total_tax || 0
      };

      // Resetar formulário com dados carregados APENAS UMA VEZ
      console.log('📝 Populando formulário com dados:', formData);
      form.reset(formData);
      
      // Verificar se os dados foram realmente definidos no formulário
      setTimeout(() => {
        const currentFormServices = form.getValues('services');
        console.log('🔍 Verificação pós-reset - Serviços no formulário:', currentFormServices?.length || 0, currentFormServices);
      }, 100);
      
      // Armazenar dados para uso posterior e marcar como carregado
      const contractEditData: ContractEditData = {
        contract,
        services: formattedServices,
        products: formattedProducts,
        customer: contract.customer
      };
      
      setData(contractEditData);
      setLoadedContractId(contractId);
      
      console.log('🎉 Contrato carregado e formulário populado com sucesso!');
      console.log('📋 Serviços carregados:', formattedServices.length);
      console.log('📦 Produtos carregados:', formattedProducts.length);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar contrato';
      console.error('❌ Erro no carregamento:', errorMessage);
      setError(new Error(errorMessage));
      setLoadedContractId(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id, loadedContractId]);

  return {
    data,
    isLoading,
    error,
    loadContract
  };
}

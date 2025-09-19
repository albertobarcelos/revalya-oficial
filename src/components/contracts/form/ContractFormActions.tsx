import { Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from '@/lib/supabase';
import { useContractForm } from "./ContractFormProvider";
import { contractFormSchema } from "../schema/ContractFormSchema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useContractsBackgroundRefresh } from '@/hooks/useBackgroundRefresh';
import { useContracts } from '@/hooks/useContracts';
import { useSecureTenantMutation } from '@/hooks/templates/useSecureTenantQuery';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';

interface ContractFormActionsProps {
  contractId?: string;
  onSuccess: (contractId: string) => void;
  onCancel: () => void;
  onEditRequest?: (contractId: string) => void;
  forceRefreshContracts?: () => Promise<void>;
}

// Função para converter Date para string no formato DATE do PostgreSQL
// AIDEV-NOTE: Corrigido problema de timezone que causava salvamento com um dia a menos
const formatDateForDatabase = (date: Date | string | null): string | null => {
  if (!date) return null;
  
  try {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = new Date(date.getTime()); // Criar nova instância para evitar mutação
    } else {
      console.error('Tipo de data inválido:', typeof date, date);
      return null;
    }
    
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      console.error('Data inválida:', date);
      return null;
    }
    
    // Ajustar para meio-dia UTC para evitar problemas de timezone
    dateObj.setUTCHours(12, 0, 0, 0);
    
    // Usar toISOString e extrair apenas a parte da data (YYYY-MM-DD)
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return null;
  }
};

// AIDEV-NOTE: Função removida - substituída pela nova arquitetura multi-tenant
// A nova arquitetura usa useTenantAccessGuard() para validação de acesso
// e não precisa de configuração manual de contexto no banco

// Função para preparar os dados do contrato para o banco
// AIDEV-NOTE: Preserva o status atual durante edição, apenas define DRAFT para novos contratos
const prepareContractData = async (data: z.infer<typeof contractFormSchema>, tenantId: string, contractId?: string) => {
  // Validações obrigatórias
  if (!data.customer_id) {
    throw new Error('Cliente é obrigatório');
  }
  
  if (!data.initial_date) {
    throw new Error('Data de início é obrigatória');
  }
  
  if (!data.final_date) {
    throw new Error('Vigência final é obrigatória');
  }
  
  if (!data.billing_type) {
    throw new Error('Tipo de faturamento é obrigatório');
  }
  
  if (!data.billing_day) {
    throw new Error('Dia de faturamento é obrigatório');
  }
  
  // Se não há número do contrato, gerar automaticamente
  let contractNumber = data.contract_number;
  if (!contractNumber || contractNumber.trim() === '') {
    const { data: generatedNumber, error } = await supabase.rpc('generate_contract_number', {
      p_tenant_id: tenantId
    });
    
    if (error) {
      console.error('Erro ao gerar número do contrato:', error);
      throw new Error('Falha ao gerar número do contrato automaticamente');
    }
    
    contractNumber = generatedNumber;
  }
  
  // AIDEV-NOTE: Preservar status atual durante edição
  let currentStatus = 'DRAFT'; // Status padrão para novos contratos
  
  if (contractId) {
    // Se é uma edição, buscar o status atual do contrato
    const { data: existingContract, error: statusError } = await supabase
      .from('contracts')
      .select('status')
      .eq('id', contractId)
      .eq('tenant_id', tenantId)
      .single();
      
    if (!statusError && existingContract) {
      currentStatus = existingContract.status;
      console.log('Status atual preservado:', currentStatus);
    } else {
      console.warn('Não foi possível obter status atual, mantendo DRAFT:', statusError);
    }
  }
  
  return {
    // Campos básicos - IMPORTANTE: o campo no banco é 'contract_number'
    contract_number: contractNumber,
    tenant_id: tenantId, // Obrigatório para RLS
    customer_id: data.customer_id,
    billing_type: data.billing_type,
    billing_day: data.billing_day,
    anticipate_weekends: data.anticipate_weekends || true,
    installments: data.installments || 1,
    description: data.description || null,
    internal_notes: data.internal_notes || null,
    
    // Datas formatadas corretamente para PostgreSQL
    // AIDEV-NOTE: Debug temporário para verificar formatação das datas
    initial_date: (() => {
      console.log('🔍 Data inicial original:', data.initial_date);
      const formatted = formatDateForDatabase(data.initial_date);
      console.log('✅ Data inicial formatada:', formatted);
      return formatted;
    })(),
    final_date: (() => {
      console.log('🔍 Data final original:', data.final_date);
      const formatted = formatDateForDatabase(data.final_date);
      console.log('✅ Data final formatada:', formatted);
      return formatted;
    })(),
    
    // Campos calculados - usar valores do formulário em vez de zeros
    total_amount: data.total_amount || 0,
    total_discount: data.total_discount || 0,
    total_tax: data.total_tax || 0,
    
    // AIDEV-NOTE: Status preservado durante edição, DRAFT apenas para novos contratos
    status: currentStatus
  };
};

// AIDEV-NOTE: Funções de mapeamento movidas para fora do escopo da função handleSubmit
// Função para mapear valores de billing_type do formulário para o banco
const mapBillingType = (billingType: string | null): string | null => {
  if (!billingType) return null;
  
  // Mantém os valores como estão no banco de dados
  return billingType;
};

// Função para mapear valores de payment_method do formulário para o banco
const mapPaymentMethod = (paymentMethod: string | null): string | null => {
  if (!paymentMethod) return null;
  
  // Mantém os valores como estão
  return paymentMethod;
};

// Função para mapear valores de recurrence_frequency
const mapRecurrenceFrequency = (frequency: string | null): string | null => {
  if (!frequency) return null;
  
  // Mantém os valores como estão no banco de dados
  return frequency;
};

export function ContractFormActions({ 
  contractId, 
  onSuccess, 
  onCancel,
  forceRefreshContracts
}: Omit<ContractFormActionsProps, 'onEditRequest'>) {
  const { 
    form, 
    isPending, 
    setIsPending, 
    setFormChanged,
  } = useContractForm();
  
  // AIDEV-NOTE: Hook seguro para validação de acesso ao tenant
  const { currentTenant } = useTenantAccessGuard();
  
  // AIDEV-NOTE: Hook seguro para operações de contratos com RLS
  const { createContract, updateContract } = useContracts();
  
  // AIDEV-NOTE: Hook seguro para inserção de serviços do contrato
  const insertContractServicesMutation = useSecureTenantMutation(
    async (supabase, tenantId, servicesToInsert: any[]) => {
      const { data, error } = await supabase
        .from('contract_services')
        .insert(servicesToInsert)
        .select();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        console.log('✅ Serviços inseridos com sucesso');
      },
      onError: (error) => {
        console.error('❌ Erro ao inserir serviços:', error);
      },
      invalidateQueries: ['contracts', 'contract_services']
    }
  );
  
  // Hook para recarregamento automático em background
  const backgroundRefresh = forceRefreshContracts 
    ? useContractsBackgroundRefresh(forceRefreshContracts)
    : null;

  // Função para enviar o formulário
  const handleSubmit = async (data: z.infer<typeof contractFormSchema>) => {
    try {
      setIsPending(true);
      
      // Validar configuração financeira dos serviços
      if (data.services && data.services.length > 0) {
        const servicesWithIncompleteConfig = data.services.filter((service: any) => {
          const paymentMethod = service.payment_method || service.financial?.paymentMethod;
          const billingType = service.billing_type || service.financial?.billingType;
          const recurrenceFrequency = service.recurrence_frequency || service.financial?.recurrenceFrequency;
          const cardType = service.card_type || service.financial?.cardType;
          
          // Verificar se os campos obrigatórios estão preenchidos
          const hasPaymentMethod = paymentMethod && paymentMethod !== "" && paymentMethod !== undefined;
          const hasBillingType = billingType && billingType !== "" && billingType !== undefined;
          
          // Se billing_type for recorrente (Mensal, Trimestral, Semestral, Anual), recurrence_frequency é obrigatório
            const isRecurringBilling = ['Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(billingType);
            const hasRecurrenceFrequency = !isRecurringBilling || (recurrenceFrequency && recurrenceFrequency !== "" && recurrenceFrequency !== undefined);
          
          // Se payment_method for 'Cartão', card_type é obrigatório
          const hasCardType = paymentMethod !== 'Cartão' || (cardType && cardType !== "" && cardType !== undefined);
          
          return !hasPaymentMethod || !hasBillingType || !hasRecurrenceFrequency || !hasCardType;
        });
        
        if (servicesWithIncompleteConfig.length > 0) {
          toast.error('Erro ao salvar contrato', {
            description: 'As configurações de pagamento não foram preenchidas para todos os serviços. Verifique e preencha todos os campos obrigatórios da configuração financeira.'
          });
          setIsPending(false);
          return;
        }
      }
      
      // Validar configuração financeira dos produtos
      if (data.products && data.products.length > 0) {
        const productsWithIncompleteConfig = data.products.filter((product: any) => {
          const paymentMethod = product.payment_method || product.financial?.paymentMethod;
          const billingType = product.billing_type || product.financial?.billingType;
          const recurrenceFrequency = product.recurrence_frequency || product.financial?.recurrenceFrequency;
          const cardType = product.card_type || product.financial?.cardType;
          
          // Verificar se os campos obrigatórios estão preenchidos
          const hasPaymentMethod = paymentMethod && paymentMethod !== "" && paymentMethod !== undefined;
          const hasBillingType = billingType && billingType !== "" && billingType !== undefined;
          
          // Se billing_type for recorrente (Mensal, Trimestral, Semestral, Anual), recurrence_frequency é obrigatório
          const isRecurringBilling = ['Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(billingType);
          const hasRecurrenceFrequency = !isRecurringBilling || (recurrenceFrequency && recurrenceFrequency !== "" && recurrenceFrequency !== undefined);
          
          // Se payment_method for 'Cartão', card_type é obrigatório
          const hasCardType = paymentMethod !== 'Cartão' || (cardType && cardType !== "" && cardType !== undefined);
          
          return !hasPaymentMethod || !hasBillingType || !hasRecurrenceFrequency || !hasCardType;
        });
        
        if (productsWithIncompleteConfig.length > 0) {
          toast.error('Erro ao salvar contrato', {
            description: 'As configurações de pagamento não foram preenchidas para todos os produtos. Verifique e preencha todos os campos obrigatórios da configuração financeira.'
          });
          setIsPending(false);
          return;
        }
      }
      
      // AIDEV-NOTE: Usando currentTenant da nova arquitetura multi-tenant segura
      if (!currentTenant?.id) {
        throw new Error('Tenant não encontrado ou acesso negado');
      }
      
      const contractData = await prepareContractData(data, currentTenant.id, contractId);
      
      console.log('Dados preparados para o banco:', contractData);
      console.log('Serviços do formulário:', data.services);
      
      let savedContractId = contractId;
      
      // AIDEV-NOTE: Usando hooks seguros com RLS em vez de inserção direta
      if (contractId) {
        // Atualizar contrato existente usando hook seguro
        console.log('🔄 Atualizando contrato via hook seguro:', contractId);
        const updatedContract = await updateContract.mutateAsync({
          id: contractId,
          ...contractData
        });
        
        savedContractId = contractId;
        console.log('✅ Contrato atualizado com sucesso:', updatedContract);
      } else {
        // Criar novo contrato usando hook seguro
        console.log('🆕 Criando novo contrato via hook seguro');
        const newContract = await createContract.mutateAsync(contractData);
        
        savedContractId = newContract.id;
        console.log('✅ Contrato criado com sucesso:', newContract);
      }

      // Salvar os serviços do contrato na tabela contract_services
      if (data.services && data.services.length > 0 && savedContractId) {
        console.log('Salvando serviços do contrato:', data.services);
        
        // Primeiro, limpar serviços existentes (em caso de edição)
        if (contractId) {
          const { error: deleteError } = await supabase
            .from('contract_services')
            .delete()
            .eq('contract_id', contractId);
            
          if (deleteError) {
            console.warn('Erro ao limpar serviços existentes:', deleteError);
          }
        }
        
        // Obter ou criar um serviço genérico para serviços customizados
        let genericServiceId = null;
        const servicesWithoutId = data.services.filter((service: any) => !service.service_id);
        
        if (servicesWithoutId.length > 0) {
          // Verificar se já existe um serviço genérico
          const { data: existingGeneric } = await supabase
            .from('services')
            .select('id')
            .eq('name', 'Serviço Customizado')
            .eq('tenant_id', currentTenant.id)
            .single();
            
          if (existingGeneric) {
            genericServiceId = existingGeneric.id;
          } else {
            // Criar serviço genérico
            const { data: newGeneric, error: genericError } = await supabase
              .from('services')
              .insert({
                name: 'Serviço Customizado',
                description: 'Serviço genérico para itens customizados',
                default_price: 0,
                tenant_id: currentTenant.id,
                is_active: true
              })
              .select('id')
              .single();
              
            if (genericError) {
              console.warn('Erro ao criar serviço genérico:', genericError);
              // Usar o primeiro serviço disponível como fallback
              const { data: fallbackService } = await supabase
                .from('services')
                .select('id')
                .eq('tenant_id', currentTenant.id)
                .limit(1)
                .single();
              genericServiceId = fallbackService?.id;
            } else {
              genericServiceId = newGeneric.id;
            }
          }
        }
        
        // Preparar dados dos serviços para inserção
        const servicesToInsert = data.services.map((service: any) => {
          const rawBillingType = service.billing_type || service.financial?.billingType;
          const rawRecurrenceFrequency = service.recurrence_frequency || service.financial?.recurrenceFrequency;
          const rawPaymentMethod = service.payment_method || service.financial?.paymentMethod;
          const rawCardType = service.card_type || service.financial?.cardType;
          
          const mappedBillingType = mapBillingType(rawBillingType);
          const mappedRecurrenceFrequency = mapRecurrenceFrequency(rawRecurrenceFrequency);
          const mappedPaymentMethod = mapPaymentMethod(rawPaymentMethod);
          
          // Validar card_type conforme constraint: só pode ter valor se payment_method for 'Cartão'
          const validatedCardType = mappedPaymentMethod === 'Cartão' ? rawCardType : null;
          
          console.log('🔍 DEBUG - Processando serviço para inserção:', {
            serviceName: service.name,
            serviceId: service.service_id,
            financialConfig: {
              payment_method_raw: rawPaymentMethod,
              payment_method_mapped: mappedPaymentMethod,
              card_type_raw: rawCardType,
              card_type_validated: validatedCardType,
              billing_type_raw: rawBillingType,
              billing_type_mapped: mappedBillingType,
              recurrence_frequency_raw: rawRecurrenceFrequency,
              recurrence_frequency_mapped: mappedRecurrenceFrequency,
              installments: service.installments || service.financial?.installments
            }
          });
          
          return {
            contract_id: savedContractId,
            service_id: service.service_id || genericServiceId, // Usar serviço genérico se não houver service_id
            description: service.description || service.name,
            quantity: service.quantity || 1,
            unit_price: service.unit_price || service.default_price || 0,
            discount_percentage: service.discount_percentage || 0,
            tax_rate: service.tax_rate || 0,
            // Campos de configuração financeira - usar valores mapeados e validados
            payment_method: mappedPaymentMethod,
            card_type: validatedCardType,
            billing_type: mappedBillingType,
            recurrence_frequency: mappedRecurrenceFrequency,
            installments: service.installments || service.financial?.installments || 1,
            // AIDEV-NOTE: Campos de vencimento - preservar configurações do frontend
            due_date_type: service.due_date_type || 'days_after_billing',
            due_days: service.due_days !== undefined && service.due_days !== null ? service.due_days : 5,
            due_day: service.due_day !== undefined && service.due_day !== null ? service.due_day : 10,
            due_next_month: service.due_next_month !== undefined && service.due_next_month !== null ? service.due_next_month : false,
            // total_amount é calculado automaticamente pelo banco
            is_active: service.is_active !== false,
            tenant_id: currentTenant.id
          };
        });
        
        console.log('Inserindo serviços:', servicesToInsert);
        
        // AIDEV-NOTE: Usar hook seguro para inserção de serviços (garante RLS)
        try {
          const insertedServices = await insertContractServicesMutation.mutateAsync(servicesToInsert);
          console.log('✅ Serviços salvos com sucesso:', insertedServices);
        } catch (error) {
          console.error('❌ Erro ao salvar serviços:', error);
          throw new Error(`Erro ao salvar serviços: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // Salvar os produtos do contrato na tabela contract_products
      if (data.products && data.products.length > 0 && savedContractId) {
        console.log('Salvando produtos do contrato:', data.products);
        
        // Primeiro, limpar produtos existentes (em caso de edição)
        if (contractId) {
          const { error: deleteError } = await supabase
            .from('contract_products')
            .delete()
            .eq('contract_id', contractId);
            
          if (deleteError) {
            console.warn('Erro ao limpar produtos existentes:', deleteError);
          }
        }
        
        // Obter ou criar um produto genérico para produtos customizados
        let genericProductId = null;
        const productsWithoutId = data.products.filter((product: any) => !product.product_id);
        
        if (productsWithoutId.length > 0) {
          // Verificar se já existe um produto genérico
          const { data: existingGeneric } = await supabase
            .from('products')
            .select('id')
            .eq('name', 'Produto Customizado')
            .eq('tenant_id', currentTenant.id)
            .single();
            
          if (existingGeneric) {
            genericProductId = existingGeneric.id;
          } else {
            // Criar produto genérico
            const { data: newGeneric, error: genericError } = await supabase
              .from('products')
              .insert({
                name: 'Produto Customizado',
                description: 'Produto genérico para itens customizados',
                price: 0,
                tenant_id: currentTenant.id,
                is_active: true
              })
              .select('id')
              .single();
              
            if (genericError) {
              console.warn('Erro ao criar produto genérico:', genericError);
              // Usar o primeiro produto disponível como fallback
              const { data: fallbackProduct } = await supabase
                .from('products')
                .select('id')
                .eq('tenant_id', currentTenant.id)
                .limit(1)
                .single();
              genericProductId = fallbackProduct?.id;
            } else {
              genericProductId = newGeneric.id;
            }
          }
        }
        
        // Preparar dados dos produtos para inserção
        const productsToInsert = data.products.map((product: any) => {
          const rawBillingType = product.billing_type || product.financial?.billingType;
          const rawRecurrenceFrequency = product.recurrence_frequency || product.financial?.recurrenceFrequency;
          const rawPaymentMethod = product.payment_method || product.financial?.paymentMethod;
          const rawCardType = product.card_type || product.financial?.cardType;
          
          const mappedBillingType = mapBillingType(rawBillingType);
          const mappedRecurrenceFrequency = mapRecurrenceFrequency(rawRecurrenceFrequency);
          const mappedPaymentMethod = mapPaymentMethod(rawPaymentMethod);
          
          // Validar card_type conforme constraint: só pode ter valor se payment_method for 'Cartão'
          const validatedCardType = mappedPaymentMethod === 'Cartão' ? rawCardType : null;
          
          console.log('🔍 DEBUG - Processando produto para inserção:', {
            productName: product.name,
            productId: product.product_id,
            financialConfig: {
              payment_method_raw: rawPaymentMethod,
              payment_method_mapped: mappedPaymentMethod,
              card_type_raw: rawCardType,
              card_type_validated: validatedCardType,
              billing_type_raw: rawBillingType,
              billing_type_mapped: mappedBillingType,
              recurrence_frequency_raw: rawRecurrenceFrequency,
              recurrence_frequency_mapped: mappedRecurrenceFrequency,
              installments: product.installments || product.financial?.installments
            }
          });
          
          return {
            contract_id: savedContractId,
            product_id: product.product_id || genericProductId, // Usar produto genérico se não houver product_id
            description: product.description || product.name,
            quantity: product.quantity || 1,
            unit_price: product.unit_price || 0,
            discount_percentage: product.discount_percentage || 0,
            tax_rate: product.tax_rate || 0,
            // Campos de configuração financeira - usar valores mapeados e validados
            payment_method: mappedPaymentMethod,
            card_type: validatedCardType,
            billing_type: mappedBillingType,
            recurrence_frequency: mappedRecurrenceFrequency,
            installments: product.installments || product.financial?.installments || 1,
            payment_gateway: product.payment_gateway || null,
            // AIDEV-NOTE: Campos de vencimento - preservar configurações do frontend
            due_date_type: product.due_date_type || 'days_after_billing',
            due_days: product.due_days !== undefined && product.due_days !== null ? product.due_days : 5,
            due_day: product.due_day !== undefined && product.due_day !== null ? product.due_day : 10,
            due_next_month: product.due_next_month !== undefined && product.due_next_month !== null ? product.due_next_month : false,
            // total_amount é calculado automaticamente pelo banco
            is_active: product.is_active !== false,
            tenant_id: currentTenant.id
          };
        });
        
        console.log('🔍 DEBUG - Dados do contexto para produtos:', {
          tenantId: currentTenant.id,
          contractId: savedContractId,
          productsCount: productsToInsert.length
        });
        console.log('🔍 DEBUG - Produtos originais do formulário:', JSON.stringify(data.products, null, 2));
        console.log('🔍 DEBUG - Produtos a inserir no banco:', JSON.stringify(productsToInsert, null, 2));
        
        // Verificar se o contrato pertence ao tenant correto antes de inserir produtos
        const { data: contractCheck, error: contractCheckError } = await supabase
          .from('contracts')
          .select('tenant_id')
          .eq('id', savedContractId)
          .single();
          
        if (contractCheckError) {
          console.error('❌ Erro ao verificar contrato:', contractCheckError);
          throw new Error('Falha ao verificar propriedade do contrato');
        }
        
        if (contractCheck.tenant_id !== currentTenant.id) {
          console.error('❌ Tenant mismatch:', {
            contractTenantId: contractCheck.tenant_id,
            contextTenantId: currentTenant.id
          });
          throw new Error('Erro de contexto: contrato não pertence ao tenant atual');
        }
        
        console.log('✅ Contrato verificado - tenant_id correto:', contractCheck.tenant_id);
        
        // Verificar se todos os produtos existem e pertencem ao tenant
        for (const productData of productsToInsert) {
          // Pular verificação para produtos que usam o produto genérico
          if (productData.product_id === genericProductId) {
            console.log('✅ Produto genérico - pulando verificação:', productData.description);
            continue;
          }
          
          const { data: productCheck, error: productCheckError } = await supabase
            .from('products')
            .select('id, tenant_id, name')
            .eq('id', productData.product_id)
            .single();
            
          if (productCheckError) {
            console.error('❌ Produto não encontrado:', productData.product_id, productCheckError);
            throw new Error(`Produto não encontrado: ${productData.product_id}`);
          }
          
          if (productCheck.tenant_id !== tenantContext.tenantId) {
            console.error('❌ Produto não pertence ao tenant:', {
              productId: productData.product_id,
              productTenantId: productCheck.tenant_id,
              contextTenantId: tenantContext.tenantId
            });
            throw new Error(`Produto ${productCheck.name} não pertence ao tenant atual`);
          }
          
          console.log('✅ Produto verificado:', productCheck.name);
        }
        
        // Inserir os produtos
        const { data: insertedProducts, error: productsError } = await supabase
          .from('contract_products')
          .insert(productsToInsert)
          .select();
        
        if (productsError) {
          console.error('Erro ao salvar produtos:', productsError);
          throw new Error(`Erro ao salvar produtos: ${productsError.message}`);
        }
        
        console.log('Produtos salvos com sucesso:', insertedProducts);
      }
      
      // Exibir mensagem de sucesso
      if (contractId) {
        toast.success("Contrato atualizado com sucesso!");
      } else {
        toast.success("Contrato criado com sucesso!");
      }
      
      // Executar recarregamento automático em background
      if (backgroundRefresh) {
        await backgroundRefresh.refreshAfterSave(!contractId);
      }
      
      setFormChanged(false);
      if (savedContractId) {
        onSuccess(savedContractId);
      }
      
    } catch (error: any) {
      console.error("Erro ao salvar contrato:", error);
      
      // Mensagem de erro mais específica
      let errorMessage = "Ocorreu um erro ao salvar o contrato.";
      
      if (error?.message?.includes('invalid input syntax for type date')) {
        errorMessage = "Erro no formato das datas. Verifique se as datas estão corretas.";
      } else if (error?.message?.includes('violates foreign key constraint')) {
        errorMessage = "Erro de referência. Verifique se o cliente selecionado é válido.";
      } else if (error?.message?.includes('duplicate key value')) {
        errorMessage = "Já existe um contrato com este número. Use um número diferente.";
      } else if (error?.message?.includes('Usuário não autenticado')) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error?.message?.includes('Slug inválido')) {
        errorMessage = "Erro de contexto. Recarregue a página e tente novamente.";
      } else if (error?.message?.includes('Erro ao salvar serviços')) {
        errorMessage = error.message;
      } else if (error?.message?.includes('Erro ao salvar produtos')) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              type="button"
              disabled={isPending}
              className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl shadow-md transition-all duration-200 ease-in-out
                ${isPending 
                  ? 'bg-primary/50 text-primary-foreground/70 cursor-wait' 
                  : 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary hover:shadow-lg hover:shadow-primary/20 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95'}`}
              onClick={() => {
                if (!isPending && form.handleSubmit) {
                  form.handleSubmit(handleSubmit)();
                }
              }}
              aria-label="Salvar alterações"
            >
              {/* Efeito de brilho ao passar o mouse */}
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              
              {/* Ícone e texto */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                {isPending ? (
                  <div className="h-5 w-5 border-2 border-primary-foreground/70 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span className="text-[11px] mt-1 font-medium">
                      Salvar
                    </span>
                  </>
                )}
              </div>
              
              {/* Efeito de pulso quando não estiver carregando */}
              {!isPending && (
                <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-foreground text-background">
            <p className="font-medium">Salvar alterações</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

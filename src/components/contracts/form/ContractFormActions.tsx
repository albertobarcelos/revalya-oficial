import { Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
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
// Converte valores em português do frontend para valores em inglês do banco
const mapBillingType = (billingType: string | null): string | null => {
  if (!billingType) return null;
  
  const mapping: Record<string, string> = {
    // Valores em português do frontend -> Valores em português do banco (conforme constraint)
    'Único': 'Único',
    'Mensal': 'Mensal',
    'Trimestral': 'Trimestral',
    'Semestral': 'Semestral',
    'Anual': 'Anual',
    // Valores em inglês -> Valores em português do banco
    'unique': 'Único',
    'monthly': 'Mensal',
    'quarterly': 'Trimestral',
    'semiannual': 'Semestral',
    'annual': 'Anual'
  };
  
  return mapping[billingType] || billingType;
};

// Função para mapear valores de payment_method do formulário para o banco
const mapPaymentMethod = (paymentMethod: string | null): string | null => {
  if (!paymentMethod) return null;
  
  const mapping: Record<string, string> = {
    // Valores em português do frontend -> Valores em português do banco (conforme constraint)
    'Cartão': 'Cartão',
    'PIX': 'PIX',
    'Transferência Bancária': 'Transferência',
    'Boleto Bancário': 'Boleto',
    // Valores em inglês -> Valores em português do banco
    'credit_card': 'Cartão',
    'pix': 'PIX',
    'bank_transfer': 'Transferência',
    'bank_slip': 'Boleto'
  };
  
  return mapping[paymentMethod] || paymentMethod;
};

// Função para mapear valores de recurrence_frequency
const mapRecurrenceFrequency = (frequency: string | null): string | null => {
  if (!frequency) return null;
  
  const mapping: Record<string, string> = {
    // Valores em português do frontend -> Valores em português do banco (conforme constraint)
    'Mensal': 'Mensal',
    'Trimestral': 'Trimestral',
    'Semestral': 'Semestral',
    'Anual': 'Anual',
    'Único': 'Único',
    // Valores em inglês -> Valores em português do banco
    'monthly': 'Mensal',
    'quarterly': 'Trimestral',
    'semiannual': 'Semestral',
    'annual': 'Anual',
    'unique': 'Único'
  };
  
  return mapping[frequency] || frequency;
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
    // AIDEV-NOTE: Função para aplicar alterações pendentes
    applyPendingChanges
  } = useContractForm();
  
  // AIDEV-NOTE: Hook seguro para validação de acesso ao tenant
  const { currentTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: Hook seguro para inserção de serviços seguindo práticas multi-tenant
  const insertServiceMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, serviceData: any) => {
      const { data, error } = await supabase
        .from('contract_services')
        .insert(serviceData)
        .select()
        .single();
        
      if (error) {
        console.error('❌ Erro ao inserir serviço:', error);
        throw error;
      }
      
      // 🛡️ VALIDAÇÃO DUPLA: Verificar se o serviço criado pertence ao tenant correto
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY VIOLATION] Serviço criado com tenant_id incorreto');
        throw new Error('Violação de segurança na criação do serviço');
      }
      
      console.log('✅ Serviço inserido:', data.id);
      return data;
    }
  );

  // AIDEV-NOTE: Hook seguro para atualização de serviços
  const updateServiceMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, { id, ...updateData }: any) => {
      const { data, error } = await supabase
        .from('contract_services')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
        
      if (error) {
        console.error('❌ Erro ao atualizar serviço:', error);
        throw error;
      }
      
      console.log('✅ Serviço atualizado:', id);
      return data;
    }
  );

  // AIDEV-NOTE: Hook seguro para deleção de serviços
  const deleteServiceMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, serviceId: string) => {
      const { error } = await supabase
        .from('contract_services')
        .delete()
        .eq('id', serviceId)
        .eq('tenant_id', tenantId);
        
      if (error) {
        console.error('❌ Erro ao deletar serviço:', error);
        throw error;
      }
      
      console.log('✅ Serviço deletado:', serviceId);
      return serviceId;
    }
  );

  // AIDEV-NOTE: Hook seguro para operações de contratos com RLS
  const { createContract, updateContract } = useContracts();

  // AIDEV-NOTE: Hook seguro para inserção de produtos do contrato
  const insertContractProductsMutation = useSecureTenantMutation(
    async (supabase, tenantId, productsToInsert: any[]) => {
      const { data, error } = await supabase
        .from('contract_products')
        .insert(productsToInsert)
        .select();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        console.log('✅ Produtos inseridos com sucesso');
      },
      onError: (error) => {
        console.error('❌ Erro ao inserir produtos:', error);
      },
      invalidateQueries: ['contracts', 'contract_products']
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
      
      // AIDEV-NOTE: Aplicar alterações pendentes antes de salvar
      console.log('🔄 Aplicando alterações pendentes antes de salvar...');
      applyPendingChanges();
      
      // AIDEV-NOTE: Obter dados atualizados após aplicar alterações pendentes
      const updatedData = form.getValues();
      console.log('📋 Dados atualizados após aplicar alterações pendentes:', updatedData);
      
      // AIDEV-NOTE: Configurar contexto de tenant para RLS funcionar corretamente
      try {
        await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: currentTenant.id
        });
        console.log('✅ Contexto de tenant configurado:', currentTenant.id);
      } catch (contextError) {
        console.error('❌ Erro ao configurar contexto de tenant:', contextError);
        throw new Error('Falha ao configurar contexto de segurança');
      }
      
      // Validar configuração financeira dos serviços (usando dados atualizados)
      if (updatedData.services && updatedData.services.length > 0) {
        const servicesWithIncompleteConfig = updatedData.services.filter((service: any) => {
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
      console.log('🔍 Contract ID inicial:', contractId);
      console.log('🔍 Saved Contract ID inicial:', savedContractId);
      
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
        console.log('🔍 Saved Contract ID após atualização:', savedContractId);
      } else {
        // Criar novo contrato usando hook seguro
        console.log('🆕 Criando novo contrato via hook seguro');
        const newContract = await createContract.mutateAsync(contractData);
        
        savedContractId = newContract.id;
        console.log('✅ Contrato criado com sucesso:', newContract);
        console.log('🔍 Saved Contract ID após criação:', savedContractId);
      }

      // Salvar os serviços do contrato na tabela contract_services
      if (data.services && data.services.length > 0 && savedContractId) {
        console.log('Salvando serviços do contrato:', data.services);
        console.log('🔍 Contract ID final para busca de serviços:', savedContractId);
        
        // AIDEV-NOTE: Validação crítica - garantir que savedContractId está definido
        if (!savedContractId) {
          throw new Error('Erro crítico: savedContractId não está definido');
        }
        
        // AIDEV-NOTE: Buscar serviços existentes APÓS definição final do savedContractId
        let existingServices: any[] = [];
        const { data: existingData, error: fetchError } = await supabase
          .from('contract_services')
          .select('*')
          .eq('contract_id', savedContractId)
          .eq('tenant_id', currentTenant.id);
          
        if (fetchError) {
          console.warn('Erro ao buscar serviços existentes:', fetchError);
          existingServices = [];
        } else {
          existingServices = existingData || [];
          console.log('🔍 Serviços existentes encontrados:', existingServices.length);
          console.log('📋 Detalhes dos serviços existentes:', existingServices.map(s => ({
            id: s.id,
            service_id: s.service_id,
            contract_id: s.contract_id,
            description: s.description
          })));
        }
        
        // Obter ou criar um serviço genérico para serviços customizados
        let genericServiceId = null;
        const servicesWithoutId = data.services.filter((service: any) => !service.service_id);
        
        if (servicesWithoutId.length > 0) {
          // AIDEV-NOTE: Verificar se já existe um serviço genérico
          // Usando .maybeSingle() para evitar erro 406 quando não existe
          const { data: existingGeneric } = await supabase
            .from('services')
            .select('id')
            .eq('name', 'Serviço Customizado')
            .eq('tenant_id', currentTenant.id)
            .maybeSingle();
            
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
              .maybeSingle();
              
            if (genericError) {
              console.warn('Erro ao criar serviço genérico:', genericError);
              // Usar o primeiro serviço disponível como fallback
              const { data: fallbackService } = await supabase
                .from('services')
                .select('id')
                .eq('tenant_id', currentTenant.id)
                .limit(1)
                .maybeSingle();
              genericServiceId = fallbackService?.id;
            } else {
              genericServiceId = newGeneric.id;
            }
          }
        }
        
        // AIDEV-NOTE: Nova lógica - processar serviços com UPDATE/INSERT/DELETE seletivo
        const servicesToUpdate: any[] = [];
        const servicesToInsert: any[] = [];
        const existingServiceIds = existingServices.map(s => s.id);
        
        // Função para preparar dados do serviço
        const prepareServiceData = (service: any) => {
          const rawBillingType = service.billing_type || service.financial?.billingType;
          const rawRecurrenceFrequency = service.recurrence_frequency || service.financial?.recurrenceFrequency;
          const rawPaymentMethod = service.payment_method || service.financial?.paymentMethod;
          const rawCardType = service.card_type || service.financial?.cardType;
          
          const mappedBillingType = mapBillingType(rawBillingType);
          const mappedRecurrenceFrequency = mapRecurrenceFrequency(rawRecurrenceFrequency);
          const mappedPaymentMethod = mapPaymentMethod(rawPaymentMethod);
          
          // Validar card_type conforme constraint: só pode ter valor se payment_method for 'Cartão'
          const validatedCardType = mappedPaymentMethod === 'Cartão' ? rawCardType : null;
          
          return {
            contract_id: savedContractId,
            service_id: service.service_id || genericServiceId,
            description: service.description || service.name,
            quantity: service.quantity || 1,
            unit_price: service.unit_price || service.default_price || 0,
            cost_price: service.cost_price || 0, // AIDEV-NOTE: Campo custo unitário adicionado para salvar edições
            discount_percentage: service.discount_percentage || 0,
            tax_rate: service.tax_rate || 0,
            payment_method: mappedPaymentMethod,
            card_type: validatedCardType,
            billing_type: mappedBillingType,
            recurrence_frequency: mappedRecurrenceFrequency,
            installments: service.installments || service.financial?.installments || 1,
            due_type: service.due_type ?? 'days_after_billing',
            due_value: service.due_value !== undefined && service.due_value !== null ? service.due_value : 5,
            due_next_month: service.due_next_month !== undefined && service.due_next_month !== null ? service.due_next_month : false,
            generate_billing: service.generate_billing !== undefined ? service.generate_billing : true,
            is_active: service.is_active !== false,
            tenant_id: currentTenant.id
          };
        };
        
        // AIDEV-NOTE: Lógica corrigida para lidar com múltiplos serviços do mesmo tipo
        // Usar índices para mapear serviços existentes com os novos dados
        const usedExistingServices = new Set<string>(); // Track de IDs já utilizados
        
        // Classificar serviços em UPDATE vs INSERT
        console.log('🔄 Iniciando classificação de serviços. Total de serviços no formulário:', data.services.length);
        console.log('🔄 Contract ID usado para comparação:', savedContractId);
        
        data.services.forEach((service: any, index: number) => {
          const serviceData = prepareServiceData(service);
          
          console.log(`🔍 Processando serviço ${index + 1}:`, {
            service_id: serviceData.service_id,
            description: serviceData.description,
            contract_id: serviceData.contract_id
          });
          
          // AIDEV-NOTE: Buscar serviço existente que ainda não foi usado
          // Para serviços com mesmo service_id, usar o primeiro disponível
          console.log(`🔍 Buscando serviço existente para service_id: ${serviceData.service_id}, contract_id: ${savedContractId}`);
          
          const existingService = existingServices.find(existing => {
            const serviceIdMatch = existing.service_id === serviceData.service_id;
            const contractIdMatch = existing.contract_id === savedContractId;
            const notUsed = !usedExistingServices.has(existing.id);
            
            console.log(`🔍 Comparando com existing service ${existing.id}:`, {
              service_id_match: serviceIdMatch,
              contract_id_match: contractIdMatch,
              not_used: notUsed,
              existing_service_id: existing.service_id,
              existing_contract_id: existing.contract_id
            });
            
            return serviceIdMatch && contractIdMatch && notUsed;
          });
          
          console.log(`🔍 Serviço existente encontrado para ${serviceData.service_id}:`, existingService ? 'SIM' : 'NÃO');
          
          if (existingService) {
            // Marcar como usado para evitar duplicação
            usedExistingServices.add(existingService.id);
            
            // Serviço existe - preparar para UPDATE
            servicesToUpdate.push({
              id: existingService.id, // Preservar ID original
              ...serviceData
            });
            console.log('🔄 Serviço para UPDATE:', { 
              id: existingService.id, 
              service_id: serviceData.service_id,
              name: service.name,
              index: index
            });
          } else {
            // Serviço novo - preparar para INSERT
            servicesToInsert.push(serviceData);
            console.log('🆕 Serviço para INSERT:', { 
              service_id: serviceData.service_id,
              name: service.name,
              index: index
            });
          }
        });
        
        // AIDEV-NOTE: Identificar serviços para DELETE (existem no banco mas não foram usados)
        const servicesToDelete = existingServices.filter(existing => 
          !usedExistingServices.has(existing.id)
        );
        
        console.log('📊 Resumo das operações:', {
          updates: servicesToUpdate.length,
          inserts: servicesToInsert.length,
          deletes: servicesToDelete.length
        });
        
        // Executar UPDATEs
        if (servicesToUpdate.length > 0) {
          console.log('🔄 Executando UPDATEs...');
          for (const serviceData of servicesToUpdate) {
            const { id, ...updateData } = serviceData;
            try {
              const { error: updateError } = await supabase
                .from('contract_services')
                .update(updateData)
                .eq('id', id)
                .eq('tenant_id', currentTenant.id);
                
              if (updateError) {
                console.error('❌ Erro ao atualizar serviço:', updateError);
                throw updateError;
              }
              console.log('✅ Serviço atualizado:', id);
            } catch (error) {
              console.error('❌ Erro no UPDATE do serviço:', error);
              throw error;
            }
          }
        }
        
        // Executar INSERTs com verificação de duplicação
        if (servicesToInsert.length > 0) {
          console.log('🆕 Executando INSERTs...');
          
          // AIDEV-NOTE: Verificar duplicação antes de inserir para evitar constraint violation
          for (const serviceData of servicesToInsert) {
            try {
              // AIDEV-NOTE: Verificar se já existe um serviço com mesmo contract_id e service_id
              // Usando .maybeSingle() para evitar erro 406 quando não há duplicação
              const { data: existingDuplicate, error: checkError } = await supabase
                .from('contract_services')
                .select('id')
                .eq('contract_id', serviceData.contract_id)
                .eq('service_id', serviceData.service_id)
                .eq('tenant_id', currentTenant.id)
                .maybeSingle();
                
              if (checkError) {
                console.error('❌ Erro ao verificar duplicação:', checkError);
                throw checkError;
              }
              
              if (existingDuplicate) {
                console.log(`⚠️ Serviço já existe, fazendo UPDATE em vez de INSERT:`, {
                  existing_id: existingDuplicate.id,
                  service_id: serviceData.service_id,
                  contract_id: serviceData.contract_id
                });
                
                // Fazer UPDATE em vez de INSERT usando hook seguro
                await updateServiceMutation.mutateAsync({
                  id: existingDuplicate.id,
                  ...serviceData
                });
                
                console.log('✅ Serviço duplicado atualizado:', existingDuplicate.id);
              } else {
                // Inserir normalmente usando hook seguro
                await insertServiceMutation.mutateAsync(serviceData);
                console.log('✅ Serviço inserido:', serviceData.service_id);
              }
            } catch (error) {
              console.error('❌ Erro no processamento do serviço:', error);
              throw new Error(`Erro ao processar serviço: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
          }
          
          console.log('✅ Todos os serviços processados com sucesso!');
        }
        
        // Executar DELETEs
        if (servicesToDelete.length > 0) {
          console.log('🗑️ Executando DELETEs...');
          for (const serviceToDelete of servicesToDelete) {
            try {
              await deleteServiceMutation.mutateAsync(serviceToDelete.id);
              console.log('✅ Serviço deletado:', serviceToDelete.id);
            } catch (error) {
              console.error('❌ Erro no DELETE do serviço:', error);
              throw error;
            }
          }
        }
        
        console.log('✅ Todas as operações de serviços concluídas com sucesso!');
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
          // AIDEV-NOTE: Verificar se já existe um produto genérico
          // Usando .maybeSingle() para evitar erro 406 quando não existe
          const { data: existingGeneric } = await supabase
            .from('products')
            .select('id')
            .eq('name', 'Produto Customizado')
            .eq('tenant_id', currentTenant.id)
            .maybeSingle();
            
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
              .maybeSingle();
              
            if (genericError) {
              console.warn('Erro ao criar produto genérico:', genericError);
              // Usar o primeiro produto disponível como fallback
              const { data: fallbackProduct } = await supabase
                .from('products')
                .select('id')
                .eq('tenant_id', currentTenant.id)
                .limit(1)
                .maybeSingle();
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
            due_type: product.due_type ?? 'days_after_billing',
            due_value: product.due_value !== undefined && product.due_value !== null ? product.due_value : 5,
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
          
          if (productCheck.tenant_id !== currentTenant.id) {
            console.error('❌ Produto não pertence ao tenant:', {
              productId: productData.product_id,
              productTenantId: productCheck.tenant_id,
              contextTenantId: currentTenant.id
            });
            throw new Error(`Produto ${productCheck.name} não pertence ao tenant atual`);
          }
          
          console.log('✅ Produto verificado:', productCheck.name);
        }
        
        // Inserir os produtos usando mutação segura
        const insertedProducts = await insertContractProductsMutation.mutateAsync(productsToInsert);
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
        } else if (error?.message?.includes('idx_contract_billing_periods_order_number_tenant')) {
          errorMessage = "Conflito de Ordem de Serviço: já existe uma OS com este número. Tente salvar novamente.";
        } else if (error?.message?.includes('idx_standalone_billing_periods_order_number_tenant')) {
          errorMessage = "Conflito de Ordem de Serviço (avulso): já existe uma OS com este número. Tente salvar novamente.";
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
        } else if (
          error?.message?.includes('Período de faturamento não pode ser criado') ||
          error?.message?.includes('não está ACTIVE')
        ) {
          errorMessage = "Contrato em rascunho: períodos de faturamento só serão gerados após ativação.";
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

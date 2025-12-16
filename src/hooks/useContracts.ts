import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/use-toast'
import { throttledAudit } from '@/utils/logThrottle'
import { getCurrentUser } from '@/utils/supabaseAuthManager'

// Tipos básicos para contratos
export interface Contract {
  id: string
  tenant_id: string
  customer_id: string
  contract_number: string
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'COMPLETED'
  initial_date: string
  final_date: string
  billing_type: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'CUSTOM'
  billing_day: number
  anticipate_weekends?: boolean
  reference_period?: string
  installments?: number
  total_amount: number
  total_discount?: number
  total_tax?: number
  stage_id?: string
  description?: string
  internal_notes?: string
  billed?: boolean
  // AIDEV-NOTE: Campo para controlar se o contrato deve gerar cobranças automaticamente
  generate_billing?: boolean
  created_at: string
  updated_at: string
  customers?: {
    id: string
    name: string
    company?: string
    email?: string
    phone?: string
  }
  services?: {
    id: string
    name: string
    description?: string
  }
}

export interface ContractStage {
  id: string
  tenant_id: string
  name: string
  color?: string
  order: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ContractService {
  id: string
  tenant_id: string
  contract_id: string
  service_id: string
  quantity: number
  unit_price: number
  discount_percentage?: number
  discount_amount?: number
  total_amount: number
  tax_rate?: number
  tax_amount?: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // AIDEV-NOTE: Campos de configuração financeira
  payment_method?: string
  card_type?: string
  billing_type?: string
  recurrence_frequency?: string
  installments?: number
  payment_gateway?: string
  due_type?: string
  due_value?: number
  due_next_month?: boolean
  due_date_value?: number
  no_charge?: boolean
  generate_billing?: boolean
  services?: {
    id: string
    name: string
    description?: string
  }
}

// AIDEV-NOTE: Interface para produtos do contrato seguindo o padrão dos serviços
export interface ContractProduct {
  id: string
  tenant_id: string
  contract_id: string
  product_id: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
  updated_at: string
  products?: {
    id: string
    name: string
    description?: string
    sku?: string
  }
}

export interface ContractFilters {
  status?: string
  stage_id?: string
  customer_id?: string
  search?: string
}

export function useContracts(filters: ContractFilters & { page?: number; limit?: number; search?: string } = {}) {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard()
  const queryClient = useQueryClient()

  // 🔐 CONSULTA SEGURA COM VALIDAÇÃO MULTI-TENANT E PAGINAÇÃO
  // AIDEV-NOTE: Query key separada por parâmetros para garantir que mudanças de página sejam detectadas
  // Isso evita problemas de cache e garante que a query seja refeita quando a página muda
  const queryKey = [
    'contracts', 
    currentTenant?.id, 
    filters.page || 1, 
    filters.limit || 10, 
    filters.status || 'ALL',
    filters.search || ''
  ];
  
  const query = useSecureTenantQuery(
    queryKey,
    async (supabase, tenantId) => {
      throttledAudit('contracts_query', `Buscando contratos para tenant: ${tenantId}`, undefined, 30000); // 30s throttle
      throttledAudit('contracts_current_tenant', `CurrentTenant na query: ${currentTenant?.name} (${currentTenant?.id})`, undefined, 30000); // 30s throttle
      
      // 🚨 VALIDAÇÃO CRÍTICA: Verificar se tenantId corresponde ao currentTenant
      if (tenantId !== currentTenant?.id) {
        console.error('🚨 [SECURITY BREACH] TenantId não corresponde ao currentTenant!', {
          queryTenantId: tenantId,
          currentTenantId: currentTenant?.id,
          currentTenantName: currentTenant?.name
        });
        throw new Error('Violação crítica de segurança: Tenant ID inconsistente');
      }
      
      // 🏗️ APLICAR PAGINAÇÃO
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;
      const search = filters.search;
      let customerIds: string[] = [];
      if (search) {
        // AIDEV-NOTE: Normalizar CNPJ para buscar com ou sem pontuação
        // Remove todos os caracteres não numéricos para criar versão normalizada
        const normalizedSearch = search.replace(/\D/g, '');
        
        // Condições de busca para customers
        const searchConditions = [
          `name.ilike.%${search}%`,
          `company.ilike.%${search}%`
        ];
        
        // AIDEV-NOTE: Buscar CNPJ/CPF normalizado (sem pontuação)
        // Como cpf_cnpj é numérico no banco, usamos busca exata com o número normalizado
        if (normalizedSearch.length >= 11 && normalizedSearch.length <= 14) {
          // Busca exata pelo número normalizado
          const cnpjNumber = parseInt(normalizedSearch, 10);
          if (!isNaN(cnpjNumber)) {
            searchConditions.push(`cpf_cnpj.eq.${cnpjNumber}`);
          }
        }
        
        // AIDEV-NOTE: Se o usuário digitou com pontuação, também busca pelo número normalizado
        // Se o termo original tinha pontuação e foi normalizado, já foi coberto acima
        // Mas também tentamos buscar como string caso o banco tenha algum campo de texto
        // (alguns sistemas mantêm ambos os formatos)
        if (normalizedSearch !== search && normalizedSearch.length >= 11) {
          // Já coberto pela busca numérica acima, mas mantemos para compatibilidade
          const cnpjNumber = parseInt(normalizedSearch, 10);
          if (!isNaN(cnpjNumber)) {
            // A busca numérica já foi adicionada acima, não precisa duplicar
          }
        }
        
        const { data: customersMatches, error: customersError } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .or(searchConditions.join(','));
        if (!customersError) {
          customerIds = (customersMatches || []).map((c: any) => c.id);
        }
      }
      
      // 📊 BUSCAR TOTAL DE REGISTROS PRIMEIRO
      let countSelect = 'id';
      let countQuery = supabase
        .from('contracts')
        .select(countSelect, { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // 🔍 APLICAR FILTRO DE CUSTOMER_ID SE EXISTIR
      if (filters.customer_id) {
        countQuery = countQuery.eq('customer_id', filters.customer_id);
      }

      // 🔍 APLICAR FILTRO DE BUSCA SE EXISTIR
      if (search) {
        const orConditions = [
          `contract_number.ilike.%${search}%`,
          `description.ilike.%${search}%`
        ];
        if (customerIds.length > 0) {
          orConditions.push(`customer_id.in.(${customerIds.join(',')})`);
        }
        countQuery = countQuery.or(orConditions.join(','));
      }

      const { count: total, error: countError } = await countQuery;

      if (countError) {
        console.error('❌ Erro ao buscar total de contratos:', countError)
        throw countError
      }
      
      // 📋 BUSCAR CONTRATOS COM PAGINAÇÃO
      let contractsQuery = supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          status,
          initial_date,
          final_date,
          billing_type,
          billing_day,
          anticipate_weekends,
          reference_period,
          installments,
          total_amount,
          total_discount,
          total_tax,
          stage_id,
          description,
          internal_notes,
          created_at,
          updated_at,
          customer_id,
          billed,
          tenant_id,
          customers!inner(
            id,
            name,
            company,
            email,
            phone,
            cpf_cnpj
          )
        `)
        .eq('tenant_id', tenantId); // 🛡️ FILTRO OBRIGATÓRIO

      // 🔍 APLICAR FILTRO DE CUSTOMER_ID SE EXISTIR
      if (filters.customer_id) {
        contractsQuery = contractsQuery.eq('customer_id', filters.customer_id);
      }

      // 🔍 APLICAR FILTRO DE STATUS SE EXISTIR
      if (filters.status && filters.status !== 'ALL') {
        contractsQuery = contractsQuery.eq('status', filters.status);
      }

      contractsQuery = contractsQuery
        .range(offset, offset + limit - 1) // 📄 APLICAR LIMIT E OFFSET
        .order('created_at', { ascending: false }); // 📅 ORDENAR POR DATA DE CRIAÇÃO

      // 🔍 APLICAR FILTRO DE BUSCA SE EXISTIR
      if (search) {
        const orConditions = [
          `contract_number.ilike.%${search}%`,
          `description.ilike.%${search}%`
        ];
        if (customerIds.length > 0) {
          orConditions.push(`customer_id.in.(${customerIds.join(',')})`);
        }
        contractsQuery = contractsQuery.or(orConditions.join(','));
      }

      const { data, error } = await contractsQuery;

      if (error) {
        console.error('❌ Erro ao buscar contratos:', error)
        throw error
      }

      // AIDEV-NOTE: Logs com throttling para evitar spam no console
      throttledAudit('contracts_found', `Contratos encontrados: ${data?.length || 0}`);
      throttledAudit('contracts_preview', `Primeiros contratos encontrados`, data?.slice(0, 3));

      // 🔍 VALIDAÇÃO ADICIONAL: Verificar se todos os dados pertencem ao tenant
      const invalidData = data?.filter(item => item.tenant_id !== tenantId)
      if (invalidData && invalidData.length > 0) {
        console.error('🚨 [SECURITY BREACH] Dados de outro tenant detectados!', invalidData)
        throw new Error('Violação de segurança detectada')
      }

      // 📊 RETORNAR DADOS COM METADATA DE PAGINAÇÃO
      const totalPages = Math.ceil((total || 0) / limit);
      
      return {
        data: data as any[],
        pagination: {
          page,
          limit,
          total: total || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    },
    {
      // AIDEV-NOTE: Configurações específicas para paginação
      // staleTime: 0 garante que mudanças de página sempre refazem a query
      // Isso resolve o problema de cache retornando dados da página anterior
      staleTime: 0,
      refetchOnWindowFocus: false,
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA CRIAR CONTRATO
  const createContract = useSecureTenantMutation(
    async (supabase, tenantId, contractData: Partial<Contract>) => {
      throttledAudit(`✏️ Criando contrato para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Obter usuário atual para configurar contexto
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id || null;
      
      // AIDEV-NOTE: Configurar contexto com user_id para popular created_by e updated_by
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId,
        p_user_id: userId
      });
      
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          ...contractData,
          tenant_id: tenantId // 🛡️ SEMPRE INCLUIR TENANT_ID
        })
        .select()
        .single()

      if (error) throw error

      // 🔍 VALIDAÇÃO: Confirmar que o contrato foi criado para o tenant correto
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Contrato criado para tenant incorreto!')
        throw new Error('Erro de segurança na criação')
      }

      return data
    },
    {
      onSuccess: () => {
        console.log('✅ Contrato criado com sucesso')
        toast({
          title: "Sucesso!",
          description: "Contrato criado com sucesso!",
        })
      },
      // AIDEV-NOTE: Invalidar cache do kanban de faturamento quando contrato é criado
      // Isso garante que novos contratos apareçam automaticamente no kanban
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA ATUALIZAR CONTRATO
  const updateContract = useSecureTenantMutation(
    async (supabase, tenantId, { id, ...updates }: Partial<Contract> & { id: string }) => {
      throttledAudit(`✏️ Atualizando contrato ${id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Obter usuário atual para configurar contexto
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id || null;
      
      // AIDEV-NOTE: Configurar contexto com user_id para popular updated_by
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId,
        p_user_id: userId
      });
      
      // 🛡️ VERIFICAÇÃO DUPLA: Confirmar que o contrato pertence ao tenant
      const { data: existingContract } = await supabase
        .from('contracts')
        .select('tenant_id')
        .eq('id', id)
        .eq('tenant_id', tenantId) // FILTRO CRÍTICO
        .single()

      if (!existingContract) {
        throw new Error('Contrato não encontrado ou sem permissão')
      }

      const { data, error } = await supabase
        .from('contracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO DUPLO DE SEGURANÇA
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      // AIDEV-NOTE: CORREÇÃO - Removido toast duplicado
      // O toast de sucesso já é exibido em ContractFormActions.tsx
      // Não há necessidade de exibir outro toast aqui
      onSuccess: () => {
        // Toast removido - já exibido em ContractFormActions.tsx
      },
      // AIDEV-NOTE: Invalidar cache do kanban de faturamento quando contrato é atualizado
      // Mudanças no contrato podem afetar sua posição ou dados no kanban
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // 🗑️ MUTAÇÃO SEGURA PARA DELETAR CONTRATO
  const deleteContract = useSecureTenantMutation(
    async (supabase, tenantId, contractId: string) => {
      throttledAudit(`🗑️ Deletando contrato ${contractId} para tenant: ${tenantId}`);
      
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO

      if (error) throw error
      return { success: true }
    },
    {
      onSuccess: () => {
        toast({
          title: "Sucesso!",
          description: "Contrato deletado com sucesso!",
        })
      },
      // AIDEV-NOTE: Invalidar cache do kanban de faturamento quando contrato é deletado
      // Remoção de contratos deve atualizar o kanban imediatamente
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // 🔄 MUTAÇÃO SEGURA PARA ATUALIZAR STATUS DO CONTRATO
  const updateContractStatusMutation = useSecureTenantMutation(
    async (supabase, tenantId, { contractId, newStatus }: { contractId: string; newStatus: string }) => {
      throttledAudit(`🔄 Atualizando status do contrato ${contractId} para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('contracts')
        .update({ status: newStatus })
        .eq('id', contractId)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      onSuccess: () => {
        toast({
          title: "Sucesso!",
          description: "Status do contrato atualizado com sucesso!",
        })
      },
      // AIDEV-NOTE: Invalidar cache do kanban de faturamento quando status do contrato muda
      // Mudanças de status podem mover contratos entre colunas do kanban
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // 🔄 MUTAÇÃO PARA ATUALIZAR SERVIÇO DO CONTRATO
  const updateContractServiceMutation = useSecureTenantMutation(
    async (supabase, tenantId, serviceData: Partial<ContractService> & { id: string }) => {
      throttledAudit(`🔄 Atualizando serviço ${serviceData.id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto RPC antes da operação
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId,
        p_user_id: null
      });
      
      const { data, error } = await supabase
        .from('contract_services')
        .update({
          quantity: serviceData.quantity,
          unit_price: serviceData.unit_price,
          total: serviceData.total,
          // AIDEV-NOTE: Campos financeiros adicionados para resolver PGRST116
          payment_method: serviceData.payment_method,
          card_type: serviceData.card_type,
          billing_type: serviceData.billing_type,
          recurrence_frequency: serviceData.recurrence_frequency,
          installments: serviceData.installments,
          due_type: serviceData.due_type,
          due_value: serviceData.due_value,
          due_next_month: serviceData.due_next_month,
          generate_billing: serviceData.generate_billing,
          // AIDEV-NOTE: Não permitir alteração de tenant_id, contract_id ou service_id por segurança
        })
        .eq('id', serviceData.id)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO
        .select()
        .single()

      if (error) {
        console.error('🚨 [ERROR] Erro ao atualizar serviço:', error);
        throw error;
      }

      // AIDEV-NOTE: Validar dados retornados
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Serviço atualizado com tenant_id incorreto:', data);
        throw new Error('Violação de segurança: tenant_id incorreto no serviço atualizado');
      }

      throttledAudit(`✅ Serviço atualizado com sucesso: ${data.id}`);
      return data;
    },
    {
      onSuccess: () => {
        // AIDEV-NOTE: Invalidação específica por tenant
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'contract-services' && 
                   query.queryKey[1] === currentTenant?.id;
          }
        });
        toast({
          title: "Sucesso!",
          description: "Configurações financeiras atualizadas com sucesso!",
        });
      },
      onError: (error) => {
        console.error('🚨 [MUTATION] Erro na mutação updateContractService:', error);
        toast({
          title: "Erro ao salvar configurações financeiras",
          description: "Não foi possível atualizar as configurações. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  )

  // 🔄 FUNÇÃO PARA FORÇAR ATUALIZAÇÃO
  const refetch = () => {
    return queryClient.invalidateQueries({ queryKey: ['contracts', currentTenant?.id] })
  }

  // AIDEV-NOTE: Criando instância do hook de serviços para compatibilidade
  const contractServicesHook = useContractServices();

  // AIDEV-NOTE: Retornando objetos completos das mutações para permitir uso de mutate e mutateAsync
  return {
    contracts: query.data?.data || [],
    pagination: query.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
    isLoading: query.isLoading,
    error: query.error,
    createContract: createContract, // ✅ Objeto completo da mutação
    isCreating: createContract.isPending,
    updateContract: updateContract, // ✅ Objeto completo da mutação
    isUpdating: updateContract.isPending,
    deleteContract: deleteContract, // ✅ Objeto completo da mutação
    isDeleting: deleteContract.isPending,
    updateContractStatusMutation,
    updateContractServiceMutation, // ✅ Nova mutação para atualizar serviços
    // AIDEV-NOTE: Adicionando funções de serviços para compatibilidade com componentes existentes
    addContractService: contractServicesHook.addService,
    addContractServiceMutation: contractServicesHook.addServiceMutation,
    refetch,
    refreshContracts: refetch // Alias para compatibilidade
  }
}

// 🏷️ HOOK SEGURO PARA STAGES DE CONTRATOS
export function useContractStages() {
  const { hasAccess, currentTenant } = useTenantAccessGuard()
  const queryClient = useQueryClient()

  const query = useSecureTenantQuery(
    ['contract-stages'],
    async (supabase, tenantId) => {
      throttledAudit(`🏷️ Buscando stages para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('contract_stages')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (error) throw error
      return data as unknown as ContractStage[]
    }
  )

  const createStage = useSecureTenantMutation(
    async (supabase, tenantId, stageData: Partial<ContractStage>) => {
      throttledAudit(`✏️ Criando stage para tenant: ${tenantId}`);

      const { data: lastStage } = await supabase
        .from('contract_stages')
        .select('order_index')
        .eq('tenant_id', tenantId)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrderIndex = ((lastStage?.order_index as number | undefined) ?? 0) + 1;

      const { data, error } = await supabase
        .from('contract_stages')
        .insert({
          ...stageData,
          tenant_id: tenantId,
          order_index: nextOrderIndex,
          is_active: stageData?.is_active ?? true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      invalidateQueries: ['contract-stages']
    }
  )

  const updateStage = useSecureTenantMutation(
    async (supabase, tenantId, { id, ...updates }: Partial<ContractStage> & { id: string }) => {
      throttledAudit(`✏️ Atualizando stage ${id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto do usuário para auditoria
      const currentUser = await getCurrentUser();
      if (currentUser) {
        await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: tenantId,
          p_user_id: currentUser.id
        });
      }
      
      const { data, error } = await supabase
        .from('contract_stages')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO DUPLO DE SEGURANÇA
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      invalidateQueries: ['contract-stages']
    }
  )

  return {
    stages: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createStage: createStage.mutate,
    updateStage: updateStage.mutate,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['contract-stages', currentTenant?.id] })
  }
}

// 🛠️ HOOK SEGURO PARA SERVIÇOS DE UM CONTRATO ESPECÍFICO
export function useContractServices(contractId?: string) {
  const { hasAccess, currentTenant } = useTenantAccessGuard()
  const queryClient = useQueryClient()

  // AIDEV-NOTE: Função para inicializar contexto RPC seguindo padrão de useServices
  const initializeTenantContext = useCallback(async () => {
    if (!currentTenant?.id) {
      console.warn('⚠️ [INIT] Tenant não encontrado para configuração de contexto');
      return false;
    }
    
    try {
      const { data: contextResult, error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant.id,
        p_user_id: null
      });
      
      if (contextError) {
        console.warn('⚠️ [INIT] Aviso ao configurar contexto inicial:', contextError);
        return false; // Não falha, mas registra
      }
      
      console.log('✅ [INIT] Contexto RPC configurado com sucesso para tenant:', currentTenant.id);
      return true;
    } catch (error) {
      console.error('🚨 [INIT] Erro crítico ao configurar contexto:', error);
      return false;
    }
  }, [currentTenant?.id]);

  // AIDEV-NOTE: Sincronização automática do contexto quando tenant muda
  useEffect(() => {
    if (currentTenant?.id) {
      initializeTenantContext();
    }
  }, [currentTenant?.id, initializeTenantContext]);

  // AIDEV-NOTE: Função para validar dados retornados (validação dupla)
  const validateTenantData = useCallback((data: ContractService[], tenantId: string) => {
    if (!data || data.length === 0) return data;
    
    const invalidData = data.filter(item => item.tenant_id !== tenantId);
    if (invalidData.length > 0) {
      console.error('🚨 [SECURITY] Dados de tenant incorreto detectados:', invalidData);
      throw new Error('Violação de segurança: dados de tenant incorreto detectados');
    }
    
    console.log('✅ [SECURITY] Validação de tenant aprovada para', data.length, 'registros');
    return data;
  }, []);

  const query = useSecureTenantQuery(
    ['contract-services', currentTenant?.id, contractId],
    async (supabase, tenantId) => {
      if (!contractId) return []
      
      // AIDEV-NOTE: Configurar contexto RPC antes da operação
      await initializeTenantContext();
      
      throttledAudit(`🛠️ Buscando serviços do contrato ${contractId} para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('vw_contract_services_detailed')
        .select(`
          contract_service_id,
          tenant_id,
          contract_id,
          service_id,
          quantity,
          unit_price,
          discount_percentage,
          discount_amount,
          total_amount,
          tax_rate,
          tax_amount,
          service_description,
          is_active,
          created_at,
          updated_at,
          payment_method,
          card_type,
          billing_type,
          recurrence_frequency,
          installments,
          due_type,
          due_value,
          due_next_month,
          no_charge,
          generate_billing,
          service_name,
          default_price,
          cost_price,
          unit_type,
          service_tax_rate
        `)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO
        .eq('contract_id', contractId)

      if (error) {
        console.error('🚨 [ERROR] Erro ao buscar serviços do contrato:', error);
        throw error;
      }

      const typedData = data as unknown as ContractService[];
      
      // AIDEV-NOTE: Aplicar validação dupla de segurança
      const validatedData = validateTenantData(typedData, tenantId);
      
      throttledAudit(`✅ ${validatedData.length} serviços encontrados para contrato ${contractId}`);
      return validatedData;
    },
    {
      enabled: !!contractId && !!currentTenant?.id,
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
    }
  )

  const addService = useSecureTenantMutation(
    async (supabase, tenantId, serviceData: Partial<ContractService>) => {
      if (!contractId) {
        throw new Error('Contrato não encontrado')
      }
      
      // AIDEV-NOTE: Configurar contexto RPC antes da operação
      const contextInitialized = await initializeTenantContext();
      if (!contextInitialized) {
        console.warn('⚠️ [MUTATION] Contexto não inicializado, prosseguindo com filtros diretos');
      }
      
      throttledAudit(`✏️ Adicionando serviço ao contrato ${contractId} para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('contract_services')
        .insert({
          ...serviceData,
          tenant_id: tenantId, // 🛡️ SEMPRE INCLUIR TENANT_ID
          contract_id: contractId
        })
        .select()
        .single()

      if (error) {
        console.error('🚨 [ERROR] Erro ao adicionar serviço:', error);
        throw error;
      }

      // AIDEV-NOTE: Validar dados retornados
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Serviço criado com tenant_id incorreto:', data);
        throw new Error('Violação de segurança: tenant_id incorreto no serviço criado');
      }

      throttledAudit(`✅ Serviço adicionado com sucesso: ${data.id}`);
      return data;
    },
    {
      onSuccess: () => {
        // AIDEV-NOTE: Invalidação específica por tenant
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'contract-services' && 
                   query.queryKey[1] === currentTenant?.id;
          }
        });
      },
      onError: (error) => {
        console.error('🚨 [MUTATION] Erro na mutação addService:', error);
        toast({
          title: "Erro ao adicionar serviço",
          description: "Não foi possível adicionar o serviço ao contrato. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  )

  const removeService = useSecureTenantMutation(
    async (supabase, tenantId, serviceId: string) => {
      // AIDEV-NOTE: Configurar contexto RPC antes da operação
      const contextInitialized = await initializeTenantContext();
      if (!contextInitialized) {
        console.warn('⚠️ [MUTATION] Contexto não inicializado, prosseguindo com filtros diretos');
      }
      
      throttledAudit(`🗑️ Removendo serviço ${serviceId} para tenant: ${tenantId}`);
      
      const { error } = await supabase
        .from('contract_services')
        .delete()
        .eq('id', serviceId)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO

      if (error) {
        console.error('🚨 [ERROR] Erro ao remover serviço:', error);
        throw error;
      }

      throttledAudit(`✅ Serviço removido com sucesso: ${serviceId}`);
      return { success: true }
    },
    {
      onSuccess: () => {
        // AIDEV-NOTE: Invalidação específica por tenant
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'contract-services' && 
                   query.queryKey[1] === currentTenant?.id;
          }
        });
      },
      onError: (error) => {
        console.error('🚨 [MUTATION] Erro na mutação removeService:', error);
        toast({
          title: "Erro ao remover serviço",
          description: "Não foi possível remover o serviço do contrato. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  )

  // AIDEV-NOTE: Função de refresh com invalidação específica
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey[0] === 'contract-services' && 
               query.queryKey[1] === currentTenant?.id &&
               query.queryKey[2] === contractId;
      }
    });
  }, [queryClient, currentTenant?.id, contractId]);

  return {
    services: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addService: addService.mutate,
    addServiceMutation: addService,
    removeService: removeService.mutate,
    removeServiceMutation: removeService,
    refresh,
    refetch: query.refetch
  }
}

// 🛠️ HOOK SEGURO PARA PRODUTOS DE UM CONTRATO ESPECÍFICO
// AIDEV-NOTE: Hook para gerenciar produtos do contrato seguindo o padrão dos serviços
export function useContractProducts(contractId?: string) {
  const { hasAccess, currentTenant } = useTenantAccessGuard()
  const queryClient = useQueryClient()

  // AIDEV-NOTE: Função para inicializar contexto RPC seguindo padrão de useServices
  const initializeTenantContext = useCallback(async () => {
    if (!currentTenant?.id) {
      console.warn('⚠️ [INIT] Tenant não encontrado para configuração de contexto');
      return false;
    }
    
    try {
      const { data: contextResult, error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant.id,
        p_user_id: null
      });
      
      if (contextError) {
        console.warn('⚠️ [INIT] Aviso ao configurar contexto inicial:', contextError);
        return false; // Não falha, mas registra
      }
      
      console.log('✅ [INIT] Contexto RPC configurado com sucesso para tenant:', currentTenant.id);
      return true;
    } catch (error) {
      console.error('🚨 [INIT] Erro crítico ao configurar contexto:', error);
      return false;
    }
  }, [currentTenant?.id]);

  // AIDEV-NOTE: Sincronização automática do contexto quando tenant muda
  useEffect(() => {
    if (currentTenant?.id) {
      initializeTenantContext();
    }
  }, [currentTenant?.id, initializeTenantContext]);

  // AIDEV-NOTE: Função para validar dados retornados (validação dupla)
  const validateTenantData = useCallback((data: ContractProduct[], tenantId: string) => {
    if (!data || data.length === 0) return data;
    
    const invalidData = data.filter(item => item.tenant_id !== tenantId);
    if (invalidData.length > 0) {
      console.error('🚨 [SECURITY] Dados de tenant incorreto detectados:', invalidData);
      throw new Error('Violação de segurança: dados de tenant incorreto detectados');
    }
    
    console.log('✅ [SECURITY] Validação de tenant aprovada para', data.length, 'registros');
    return data;
  }, []);

  const query = useSecureTenantQuery(
    ['contract-products', currentTenant?.id, contractId],
    async (supabase, tenantId) => {
      if (!contractId) return []
      
      // AIDEV-NOTE: Configurar contexto RPC antes da operação
      await initializeTenantContext();
      
      throttledAudit(`🛠️ Buscando produtos do contrato ${contractId} para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('contract_products')
        .select(`
          *,
          products:product_id(
            id,
            name,
            description,
            sku
          )
        `)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO
        .eq('contract_id', contractId)

      if (error) {
        console.error('🚨 [ERROR] Erro ao buscar produtos do contrato:', error);
        throw error;
      }

      const typedData = data as unknown as ContractProduct[];
      
      // AIDEV-NOTE: Aplicar validação dupla de segurança
      const validatedData = validateTenantData(typedData, tenantId);
      
      throttledAudit(`✅ ${validatedData.length} produtos encontrados para contrato ${contractId}`);
      return validatedData;
    },
    {
      enabled: !!contractId && !!currentTenant?.id,
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
    }
  )

  const addProduct = useSecureTenantMutation(
    async (supabase, tenantId, productData: Partial<ContractProduct>) => {
      if (!contractId) {
        throw new Error('Contrato não encontrado')
      }
      
      // AIDEV-NOTE: Configurar contexto RPC antes da operação
      const contextInitialized = await initializeTenantContext();
      if (!contextInitialized) {
        console.warn('⚠️ [MUTATION] Contexto não inicializado, prosseguindo com filtros diretos');
      }
      
      throttledAudit(`✏️ Adicionando produto ao contrato ${contractId} para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('contract_products')
        .insert({
          ...productData,
          tenant_id: tenantId, // 🛡️ SEMPRE INCLUIR TENANT_ID
          contract_id: contractId
        })
        .select()
        .single()

      if (error) {
        console.error('🚨 [ERROR] Erro ao adicionar produto:', error);
        throw error;
      }

      // AIDEV-NOTE: Validar dados retornados
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Produto criado com tenant_id incorreto:', data);
        throw new Error('Violação de segurança: tenant_id incorreto no produto criado');
      }

      throttledAudit(`✅ Produto adicionado com sucesso: ${data.id}`);
      return data;
    },
    {
      onSuccess: () => {
        // AIDEV-NOTE: Invalidação específica por tenant
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'contract-products' && 
                   query.queryKey[1] === currentTenant?.id;
          }
        });
      },
      onError: (error) => {
        console.error('🚨 [MUTATION] Erro na mutação addProduct:', error);
        toast({
          title: "Erro ao adicionar produto",
          description: "Não foi possível adicionar o produto ao contrato. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  )

  const removeProduct = useSecureTenantMutation(
    async (supabase, tenantId, productId: string) => {
      // AIDEV-NOTE: Configurar contexto RPC antes da operação
      const contextInitialized = await initializeTenantContext();
      if (!contextInitialized) {
        console.warn('⚠️ [MUTATION] Contexto não inicializado, prosseguindo com filtros diretos');
      }
      
      throttledAudit(`🗑️ Removendo produto ${productId} para tenant: ${tenantId}`);
      
      const { error } = await supabase
        .from('contract_products')
        .delete()
        .eq('id', productId)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO

      if (error) {
        console.error('🚨 [ERROR] Erro ao remover produto:', error);
        throw error;
      }

      throttledAudit(`✅ Produto removido com sucesso: ${productId}`);
      return { success: true }
    },
    {
      onSuccess: () => {
        // AIDEV-NOTE: Invalidação específica por tenant
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'contract-products' && 
                   query.queryKey[1] === currentTenant?.id;
          }
        });
      },
      onError: (error) => {
        console.error('🚨 [MUTATION] Erro na mutação removeProduct:', error);
        toast({
          title: "Erro ao remover produto",
          description: "Não foi possível remover o produto do contrato. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  )

  // AIDEV-NOTE: Função de refresh com invalidação específica
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey[0] === 'contract-products' && 
               query.queryKey[1] === currentTenant?.id &&
               query.queryKey[2] === contractId;
      }
    });
  }, [queryClient, currentTenant?.id, contractId]);

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addProduct: addProduct.mutate,
    addProductMutation: addProduct,
    removeProduct: removeProduct.mutate,
    removeProductMutation: removeProduct,
    refresh,
    refetch: query.refetch
  }
}

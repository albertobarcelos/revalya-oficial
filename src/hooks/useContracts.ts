import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/use-toast'
import { throttledAudit } from '@/utils/logThrottle'

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
  total: number
  created_at: string
  updated_at: string
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

export function useContracts(filters: ContractFilters = {}) {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard()
  const queryClient = useQueryClient()

  // 🔐 CONSULTA SEGURA COM VALIDAÇÃO MULTI-TENANT
  const query = useSecureTenantQuery(
    ['contracts', currentTenant?.id, JSON.stringify(filters)],
    async (supabase, tenantId) => {
      throttledAudit('contracts_query', `Buscando contratos para tenant: ${tenantId}`);
      throttledAudit('contracts_current_tenant', `CurrentTenant na query: ${currentTenant?.name} (${currentTenant?.id})`);
      
      // 🚨 VALIDAÇÃO CRÍTICA: Verificar se tenantId corresponde ao currentTenant
      if (tenantId !== currentTenant?.id) {
        console.error('🚨 [SECURITY BREACH] TenantId não corresponde ao currentTenant!', {
          queryTenantId: tenantId,
          currentTenantId: currentTenant?.id,
          currentTenantName: currentTenant?.name
        });
        throw new Error('Violação crítica de segurança: Tenant ID inconsistente');
      }
      
      const { data, error } = await supabase
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
            phone
          )
        `)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO

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

      return data as any[]
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA CRIAR CONTRATO
  const createContract = useSecureTenantMutation(
    async (supabase, tenantId, contractData: Partial<Contract>) => {
      throttledAudit(`✏️ Criando contrato para tenant: ${tenantId}`);
      
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
      invalidateQueries: ['contracts']
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA ATUALIZAR CONTRATO
  const updateContract = useSecureTenantMutation(
    async (supabase, tenantId, { id, ...updates }: Partial<Contract> & { id: string }) => {
      throttledAudit(`✏️ Atualizando contrato ${id} para tenant: ${tenantId}`);
      
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
      onSuccess: () => {
        toast({
          title: "Sucesso!",
          description: "Contrato atualizado com sucesso!",
        })
      },
      invalidateQueries: ['contracts']
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
      invalidateQueries: ['contracts']
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
      invalidateQueries: ['contracts']
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
    contracts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createContract: createContract, // ✅ Objeto completo da mutação
    isCreating: createContract.isPending,
    updateContract: updateContract, // ✅ Objeto completo da mutação
    isUpdating: updateContract.isPending,
    deleteContract: deleteContract, // ✅ Objeto completo da mutação
    isDeleting: deleteContract.isPending,
    updateContractStatusMutation,
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
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO
        .eq('active', true)
        .order('order', { ascending: true })

      if (error) throw error
      return data as unknown as ContractStage[]
    }
  )

  const createStage = useSecureTenantMutation(
    async (supabase, tenantId, stageData: Partial<ContractStage>) => {
      throttledAudit(`✏️ Criando stage para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('contract_stages')
        .insert({
          ...stageData,
          tenant_id: tenantId // 🛡️ SEMPRE INCLUIR TENANT_ID
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      invalidateQueries: ['contract-stages']
    }
  )

  const updateStage = useSecureTenantMutation(
    async (supabase, tenantId, { id, ...updates }: Partial<ContractStage> & { id: string }) => {
      throttledAudit(`✏️ Atualizando stage ${id} para tenant: ${tenantId}`);
      
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
        .from('contract_services')
        .select(`
          *,
          services:service_id(
            id,
            name,
            description
          )
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

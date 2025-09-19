import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
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

      console.log(`🔍 [AUDIT] Contratos encontrados: ${data?.length || 0}`);
      console.log(`🔍 [AUDIT] Primeiros contratos:`, data?.slice(0, 3));

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
      console.log(`✏️ [AUDIT] Criando contrato para tenant: ${tenantId}`);
      
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
      console.log(`✏️ [AUDIT] Atualizando contrato ${id} para tenant: ${tenantId}`);
      
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
      console.log(`🗑️ [AUDIT] Deletando contrato ${contractId} para tenant: ${tenantId}`);
      
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
      console.log(`🔄 [AUDIT] Atualizando status do contrato ${contractId} para tenant: ${tenantId}`);
      
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
      console.log(`🏷️ [AUDIT] Buscando stages para tenant: ${tenantId}`);
      
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
      console.log(`✏️ [AUDIT] Criando stage para tenant: ${tenantId}`);
      
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
      console.log(`✏️ [AUDIT] Atualizando stage ${id} para tenant: ${tenantId}`);
      
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

  const query = useSecureTenantQuery(
    ['contract-services', contractId],
    async (supabase, tenantId) => {
      if (!contractId) return []
      
      console.log(`🛠️ [AUDIT] Buscando serviços do contrato ${contractId} para tenant: ${tenantId}`);
      
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

      if (error) throw error
      return data as unknown as ContractService[]
    },
    {
      enabled: !!contractId
    }
  )

  const addService = useSecureTenantMutation(
    async (supabase, tenantId, serviceData: Partial<ContractService>) => {
      if (!contractId) {
        throw new Error('Contrato não encontrado')
      }
      
      console.log(`✏️ [AUDIT] Adicionando serviço ao contrato ${contractId} para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('contract_services')
        .insert({
          ...serviceData,
          tenant_id: tenantId, // 🛡️ SEMPRE INCLUIR TENANT_ID
          contract_id: contractId
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      invalidateQueries: ['contract-services']
    }
  )

  const removeService = useSecureTenantMutation(
    async (supabase, tenantId, serviceId: string) => {
      console.log(`🗑️ [AUDIT] Removendo serviço ${serviceId} para tenant: ${tenantId}`);
      
      const { error } = await supabase
        .from('contract_services')
        .delete()
        .eq('id', serviceId)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO

      if (error) throw error
      return { success: true }
    },
    {
      invalidateQueries: ['contract-services']
    }
  )

  return {
    services: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addService: addService.mutate,
    removeService: removeService.mutate,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['contract-services', currentTenant?.id, contractId] })
  }
}

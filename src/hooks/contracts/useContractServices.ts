import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/use-toast'
import { throttledAudit } from '@/utils/logThrottle'
import { ContractService } from './types'

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
      
      // console.log('✅ [INIT] Contexto RPC configurado com sucesso para tenant:', currentTenant.id);
      return true;
    } catch (error) {
      console.error('🚨 [INIT] Erro crítico ao configurar contexto:', error);
      return false;
    }
  }, [currentTenant?.id]);

  // AIDEV-NOTE: Sincronização automática do contexto removida para evitar chamadas excessivas
  // O contexto é inicializado sob demanda nas operações (query/mutation)
  /* 
  useEffect(() => {
    if (currentTenant?.id) {
      initializeTenantContext();
    }
  }, [currentTenant?.id, initializeTenantContext]);
  */

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

import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/use-toast'
import { throttledAudit } from '@/utils/logThrottle'
import { ContractProduct } from './types'

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

/**
 * 📦 Hook para gerenciamento de estoque de produtos por local
 * 
 * AIDEV-NOTE: Hook seguro que implementa o padrão multi-tenant
 * para estoque de produtos por local de armazenamento
 */

import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from './templates/useSecureTenantQuery';
import { useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StorageLocation } from './useStorageLocations';

// 📋 Interface para ProductStockByLocation
export interface ProductStockByLocation {
  id: string;
  tenant_id: string;
  product_id: string;
  storage_location_id: string;
  available_stock: number;
  min_stock: number;
  unit_cmc: number;
  total_cmc: number;
  updated_at: string;
  
  // Relacionamentos (populados via join)
  storage_location?: StorageLocation;
}

// 📋 Interface para atualização de estoque
export interface UpdateProductStockDTO {
  available_stock?: number;
  min_stock?: number;
  unit_cmc?: number;
}

// 📋 Interface para parâmetros de busca
export interface UseProductStockParams {
  product_id?: string;
  storage_location_id?: string;
  limit?: number;
  page?: number;
}

/**
 * Hook seguro para gerenciamento de estoque por local
 * Implementa isolamento multi-tenant
 */
export function useProductStock(params?: UseProductStockParams) {
  const {
    product_id,
    storage_location_id,
    limit = 50,
    page = 1
  } = params || {};
  
  // 🔐 Validação de acesso obrigatória
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const queryClient = useQueryClient();

  // 📊 Query function segura para buscar estoque por local
  const fetchStockQuery = async (supabase: SupabaseClient, tenantId: string) => {
    console.log(`📊 [AUDIT] Buscando estoque por local para tenant: ${tenantId}`);
    console.log(`🔍 [DEBUG QUERY] Parâmetros recebidos:`, { product_id, storage_location_id, page, limit });
    
    // AIDEV-NOTE: Configurar contexto de tenant antes da query
    // IMPORTANTE: O useSecureTenantQuery já configura o contexto, mas fazemos novamente aqui para garantir
    const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });
    
    if (contextError) {
      console.error('🚨 [ERROR] Falha ao configurar contexto de tenant:', contextError);
      throw contextError;
    }
    
    // AIDEV-NOTE: Verificar se o contexto foi configurado corretamente
    const { data: contextCheck } = await supabase.rpc('get_current_tenant_context');
    console.log('🔍 [DEBUG QUERY] Contexto de tenant verificado:', contextCheck);
    
    // AIDEV-NOTE: Buscar estoque sem join automático (mais confiável)
    let query = supabase
      .from('product_stock_by_location')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    // Aplicar filtros
    if (product_id) {
      console.log(`🔍 [DEBUG QUERY] Aplicando filtro product_id: ${product_id}`);
      query = query.eq('product_id', product_id);
    } else {
      console.log(`🔍 [DEBUG QUERY] Sem filtro product_id - buscando todos os produtos`);
    }
    
    if (storage_location_id) {
      console.log(`🔍 [DEBUG QUERY] Aplicando filtro storage_location_id: ${storage_location_id}`);
      query = query.eq('storage_location_id', storage_location_id);
    }
    
    // Ordenação
    query = query.order('updated_at', { ascending: false });
    
    // Paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    console.log(`🔍 [DEBUG QUERY] Executando query com offset: ${offset}, limit: ${limit}`);
    const { data, error, count } = await query;
    
    if (error) {
      console.error('🚨 [ERROR] Falha ao buscar estoque por local:', error);
      console.error('🚨 [ERROR] Detalhes do erro:', JSON.stringify(error, null, 2));
      console.error('🚨 [ERROR] Código do erro:', error.code);
      console.error('🚨 [ERROR] Mensagem do erro:', error.message);
      throw error;
    }
    
    console.log(`🔍 [DEBUG QUERY] Query executada - data length: ${data?.length || 0}, count: ${count || 0}`);
    console.log(`🔍 [DEBUG QUERY] Primeiros registros:`, data?.slice(0, 3));
    
    // AIDEV-NOTE: Validação dupla de segurança
    const invalidData = data?.filter(item => item.tenant_id !== tenantId);
    if (invalidData && invalidData.length > 0) {
      console.error('🚨 [SECURITY] Violação de segurança detectada:', {
        invalidItems: invalidData.length,
        expectedTenant: tenantId,
        invalidTenants: invalidData.map(item => item.tenant_id)
      });
      throw new Error('❌ ERRO CRÍTICO: Dados de tenant incorreto retornados - possível vazamento de segurança!');
    }
    
    // AIDEV-NOTE: Buscar storage_locations separadamente e fazer join manual
    const storageLocationIds = [...new Set(data?.map(item => item.storage_location_id).filter(Boolean) || [])];
    let storageLocationsMap: Record<string, any> = {};
    
    if (storageLocationIds.length > 0) {
      const { data: storageData } = await supabase
        .from('storage_locations')
        .select('id, name, description, is_active')
        .in('id', storageLocationIds)
        .eq('tenant_id', tenantId);
      
      if (storageData) {
        storageLocationsMap = storageData.reduce((acc, loc) => {
          acc[loc.id] = loc;
          return acc;
        }, {} as Record<string, any>);
      }
    }
    
    // AIDEV-NOTE: Enriquecer dados com storage_location e calcular total_cmc
    const enrichedData = data?.map(item => {
      const availableStock = Number(item.available_stock) || 0;
      const unitCmc = Number(item.unit_cmc) || 0;
      const totalCmc = item.total_cmc != null ? Number(item.total_cmc) : (availableStock * unitCmc);
      
      return {
        ...item,
        available_stock: availableStock,
        min_stock: Number(item.min_stock) || 0,
        unit_cmc: unitCmc,
        total_cmc: totalCmc,
        storage_location: item.storage_location_id ? storageLocationsMap[item.storage_location_id] : undefined,
      };
    }) || [];
    
    console.log(`✅ [SUCCESS] ${enrichedData.length} registros de estoque encontrados`);
    console.log('🔍 [DEBUG HOOK] Dados retornados:', enrichedData);
    console.log('🔍 [DEBUG HOOK] Filtros aplicados:', { product_id, storage_location_id, tenantId });
    
    return {
      stock: enrichedData,
      totalCount: count || 0
    };
  };

  // 🔍 Query segura usando o template
  const queryKey = [
    'product_stock_by_location',
    product_id,
    storage_location_id,
    page,
    limit
  ];
  
  const isEnabled = hasAccess && !!currentTenant?.id;
  console.log(`🔍 [DEBUG HOOK] useSecureTenantQuery enabled: ${isEnabled}`, { hasAccess, currentTenantId: currentTenant?.id, product_id });
  
  const {
    data,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    queryKey,
    fetchStockQuery,
    {
      enabled: isEnabled, // AIDEV-NOTE: Habilitado quando tem acesso e tenant
      staleTime: 5 * 60 * 1000, // AIDEV-NOTE: Cache de 5 minutos para evitar requisições excessivas
      refetchOnMount: false, // AIDEV-NOTE: Desabilitado para evitar múltiplas requisições ao mudar de aba
      refetchOnWindowFocus: false, // AIDEV-NOTE: Desabilitado para evitar loops
      refetchOnReconnect: true, // AIDEV-NOTE: Refazer ao reconectar
    }
  );
  
  console.log(`🔍 [DEBUG HOOK] useSecureTenantQuery retornou:`, { 
    hasData: !!data, 
    dataKeys: data ? Object.keys(data) : null,
    dataContent: data, // AIDEV-NOTE: Ver conteúdo completo
    isLoading, 
    error: error ? error.message : null 
  });
  
  // AIDEV-NOTE: Verificar estrutura dos dados
  console.log('🔍 [DEBUG HOOK] data?.stock:', data?.stock);
  console.log('🔍 [DEBUG HOOK] data?.totalCount:', data?.totalCount);
  console.log('🔍 [DEBUG HOOK] typeof data:', typeof data);
  console.log('🔍 [DEBUG HOOK] Array.isArray(data):', Array.isArray(data));
  
  const stock = data?.stock || [];
  const totalCount = data?.totalCount || 0;
  
  console.log('🔍 [DEBUG HOOK] stock extraído:', stock);
  console.log('🔍 [DEBUG HOOK] totalCount:', totalCount);

  // 🔄 Mutação segura para atualizar estoque
  const updateStockMutation = useSecureTenantMutation(
    async (
      supabase: SupabaseClient,
      tenantId: string,
      variables: { productId: string; locationId: string; stockData: UpdateProductStockDTO }
    ) => {
      const { productId, locationId, stockData } = variables;
      console.log(`✏️ [AUDIT] Atualizando estoque para produto ${productId} no local ${locationId}`);
      
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      // AIDEV-NOTE: Buscar valores atuais para preservar campos não atualizados
      const { data: currentStock } = await supabase
        .from('product_stock_by_location')
        .select('available_stock, min_stock, unit_cmc')
        .eq('tenant_id', tenantId)
        .eq('product_id', productId)
        .eq('storage_location_id', locationId)
        .single();
      
      const { data: updatedData, error: updateError } = await supabase
        .from('product_stock_by_location')
        .upsert({
          tenant_id: tenantId,
          product_id: productId,
          storage_location_id: locationId,
          // AIDEV-NOTE: Usar valor fornecido ou manter o atual
          available_stock: stockData.available_stock ?? currentStock?.available_stock ?? 0,
          min_stock: stockData.min_stock ?? currentStock?.min_stock ?? 0,
          unit_cmc: stockData.unit_cmc ?? currentStock?.unit_cmc ?? 0
        }, {
          onConflict: 'tenant_id,product_id,storage_location_id'
        })
        .select()
        .single();
      
      if (updateError) {
        console.error('🚨 [ERROR] Falha ao atualizar estoque:', updateError);
        throw updateError;
      }
      
      if (updatedData && updatedData.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Violação de segurança detectada na atualização');
        throw new Error('❌ ERRO CRÍTICO: Estoque atualizado com tenant incorreto!');
      }
      
      console.log(`✅ [SUCCESS] Estoque atualizado com sucesso`);
      return updatedData;
    },
    {
      onSuccess: () => {
        // AIDEV-NOTE: Invalidar cache para atualizar a lista
        queryClient.invalidateQueries({ queryKey: ['product_stock_by_location'] });
      },
      invalidateQueries: ['product_stock_by_location']
    }
  );

  return {
    // 📊 Dados
    stock,
    totalCount,
    
    // 🔄 Estados
    isLoading,
    error: error || accessError,
    hasAccess,
    
    // 🔄 Ações
    refetch,
    updateStock: async (productId: string, locationId: string, stockData: UpdateProductStockDTO) => {
      return updateStockMutation.mutateAsync({ productId, locationId, stockData });
    },
    
    // 🔄 Estados das mutações
    isUpdating: updateStockMutation.isPending,
    
    // 🚨 Erros das mutações
    updateError: updateStockMutation.error
  };
}

/**
 * Função auxiliar para atualizar estoque após movimentação
 * Esta função é chamada automaticamente pela função RPC calculate_stock_balance
 * mas pode ser usada manualmente se necessário
 */
export async function updateStockAfterMovement(
  supabase: SupabaseClient,
  tenantId: string,
  productId: string,
  locationId: string,
  movementType: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA',
  quantity: number,
  unitValue: number = 0
): Promise<void> {
  await supabase.rpc('set_tenant_context_simple', {
    p_tenant_id: tenantId
  });
  
  // A função RPC calculate_stock_balance já faz isso automaticamente
  // Esta função é apenas uma interface auxiliar se necessário
  await supabase.rpc('calculate_stock_balance', {
    p_tenant_id: tenantId,
    p_product_id: productId,
    p_storage_location_id: locationId,
    p_movement_type: movementType,
    p_quantity: quantity,
    p_unit_value: unitValue
  });
}


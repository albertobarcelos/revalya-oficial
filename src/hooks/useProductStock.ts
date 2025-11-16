/**
 * 📦 Hook para gerenciamento de estoque de produtos por local
 * 
 * AIDEV-NOTE: Hook seguro que implementa o padrão multi-tenant
 * para estoque de produtos por local de armazenamento
 */

import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from './templates/useSecureTenantQuery';
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

  // 📊 Query function segura para buscar estoque por local
  const fetchStockQuery = async (supabase: SupabaseClient, tenantId: string) => {
    console.log(`📊 [AUDIT] Buscando estoque por local para tenant: ${tenantId}`);
    
    // AIDEV-NOTE: Configurar contexto de tenant antes da query
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });
    
    let query = supabase
      .from('product_stock_by_location')
      .select(`
        *,
        storage_location:storage_locations(id, name, description, is_active)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    // Aplicar filtros
    if (product_id) {
      query = query.eq('product_id', product_id);
    }
    
    if (storage_location_id) {
      query = query.eq('storage_location_id', storage_location_id);
    }
    
    // Ordenação
    query = query.order('updated_at', { ascending: false });
    
    // Paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('🚨 [ERROR] Falha ao buscar estoque por local:', error);
      throw error;
    }
    
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
    
    console.log(`✅ [SUCCESS] ${data?.length || 0} registros de estoque encontrados`);
    
    return {
      stock: data || [],
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
  
  const {
    data,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    queryKey,
    fetchStockQuery,
    {
      enabled: hasAccess && !!currentTenant?.id,
      staleTime: 2 * 60 * 1000, // 2 minutos (estoque muda frequentemente)
      refetchOnWindowFocus: false
    }
  );
  
  const stock = data?.stock || [];
  const totalCount = data?.totalCount || 0;

  // 🔄 Mutação segura para atualizar estoque
  const updateStockMutation = useSecureTenantMutation(
    async (
      supabase: SupabaseClient,
      tenantId: string,
      productId: string,
      locationId: string,
      stockData: UpdateProductStockDTO
    ) => {
      console.log(`✏️ [AUDIT] Atualizando estoque para produto ${productId} no local ${locationId}`);
      
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      const { data: updatedData, error: updateError } = await supabase
        .from('product_stock_by_location')
        .upsert({
          tenant_id: tenantId,
          product_id: productId,
          storage_location_id: locationId,
          available_stock: stockData.available_stock ?? 0,
          min_stock: stockData.min_stock ?? 0,
          unit_cmc: stockData.unit_cmc ?? 0
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
    updateStock: updateStockMutation.mutate,
    
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


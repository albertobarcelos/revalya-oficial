/**
 * 📦 Hook para gerenciamento de movimentações de estoque
 * 
 * AIDEV-NOTE: Hook seguro que implementa o padrão multi-tenant
 * para movimentações de estoque, seguindo a arquitetura do projeto
 * com useSecureTenantQuery e useSecureTenantMutation
 */

import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from './templates/useSecureTenantQuery';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from './useSecureProducts';
import type { StorageLocation } from './useStorageLocations';

// 📋 Interface para StockMovement
export interface StockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  storage_location_id: string;
  movement_type: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  movement_reason: string | null;
  movement_date: string;
  quantity: number;
  unit_value: number;
  total_value: number;
  accumulated_balance: number;
  unit_cmc: number;
  total_cmc: number;
  invoice_number: string | null;
  operation: string | null;
  customer_or_supplier: string | null;
  observation: string | null;
  origin_storage_location_id: string | null;
  destination_storage_location_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  
  // Relacionamentos (populados via join)
  product?: Product;
  storage_location?: StorageLocation;
  origin_location?: StorageLocation;
  destination_location?: StorageLocation;
}

// 📋 Interface para criação de movimentação
export interface CreateStockMovementDTO {
  product_id: string;
  storage_location_id: string;
  movement_type: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  movement_reason?: string | null;
  movement_date: string;
  quantity: number;
  unit_value?: number;
  invoice_number?: string | null;
  operation?: string | null;
  customer_or_supplier?: string | null;
  observation?: string | null;
  origin_storage_location_id?: string | null;
  destination_storage_location_id?: string | null;
}

// 📋 Interface para atualização de movimentação
export interface UpdateStockMovementDTO {
  movement_reason?: string | null;
  movement_date?: string;
  quantity?: number;
  unit_value?: number;
  invoice_number?: string | null;
  operation?: string | null;
  customer_or_supplier?: string | null;
  observation?: string | null;
}

// 📋 Interface para parâmetros de busca
export interface UseStockMovementsParams {
  product_id?: string;
  storage_location_id?: string;
  movement_type?: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  start_date?: string;
  end_date?: string;
  searchTerm?: string;
  limit?: number;
  page?: number;
}

/**
 * Hook seguro para gerenciamento de movimentações de estoque
 * Implementa isolamento multi-tenant e auditoria completa
 */
export function useStockMovements(params?: UseStockMovementsParams) {
  const {
    product_id,
    storage_location_id,
    movement_type,
    start_date,
    end_date,
    searchTerm = "",
    limit = 50,
    page = 1
  } = params || {};
  
  // 🔐 Validação de acesso obrigatória
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  // 📊 Query function segura para buscar movimentações
  const fetchMovementsQuery = async (supabase: SupabaseClient, tenantId: string) => {
    console.log(`📊 [AUDIT] Buscando movimentações de estoque para tenant: ${tenantId}`);
    
    // AIDEV-NOTE: Configurar contexto de tenant antes da query
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });
    
    // Query com joins para relacionamentos
    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(id, name, code, sku, unit_of_measure),
        storage_location:storage_locations!stock_movements_storage_location_id_fkey(id, name, description),
        origin_location:storage_locations!stock_movements_origin_storage_location_id_fkey(id, name, description),
        destination_location:storage_locations!stock_movements_destination_storage_location_id_fkey(id, name, description)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    // Aplicar filtros
    if (product_id) {
      query = query.eq('product_id', product_id);
    }
    
    if (storage_location_id) {
      query = query.eq('storage_location_id', storage_location_id);
    }
    
    if (movement_type) {
      query = query.eq('movement_type', movement_type);
    }
    
    if (start_date) {
      query = query.gte('movement_date', start_date);
    }
    
    if (end_date) {
      query = query.lte('movement_date', end_date);
    }
    
    if (searchTerm) {
      query = query.or(`
        invoice_number.ilike.%${searchTerm}%,
        operation.ilike.%${searchTerm}%,
        customer_or_supplier.ilike.%${searchTerm}%,
        observation.ilike.%${searchTerm}%
      `);
    }
    
    // Ordenação por data (mais recente primeiro)
    query = query.order('movement_date', { ascending: false });
    query = query.order('created_at', { ascending: false });
    
    // Paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('🚨 [ERROR] Falha ao buscar movimentações:', error);
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
    
    console.log(`✅ [SUCCESS] ${data?.length || 0} movimentações encontradas`);
    
    return {
      movements: data || [],
      totalCount: count || 0
    };
  };

  // 🔍 Query segura usando o template
  const queryKey = [
    'stock_movements',
    product_id,
    storage_location_id,
    movement_type,
    start_date,
    end_date,
    searchTerm,
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
    fetchMovementsQuery,
    {
      enabled: hasAccess && !!currentTenant?.id,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false
    }
  );
  
  const movements = data?.movements || [];
  const totalCount = data?.totalCount || 0;

  // 🔄 Mutação segura para criar movimentação
  const createMovementMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, movementData: CreateStockMovementDTO) => {
      console.log(`📝 [AUDIT] Criando movimentação de estoque para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto de tenant antes da mutation
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      // AIDEV-NOTE: Calcular saldo acumulado e CMC usando função RPC
      const { data: balanceData, error: balanceError } = await supabase.rpc('calculate_stock_balance', {
        p_tenant_id: tenantId,
        p_product_id: movementData.product_id,
        p_storage_location_id: movementData.storage_location_id,
        p_movement_type: movementData.movement_type,
        p_quantity: movementData.quantity,
        p_unit_value: movementData.unit_value || 0
      });
      
      if (balanceError) {
        console.error('🚨 [ERROR] Falha ao calcular saldo:', balanceError);
        throw balanceError;
      }
      
      const balanceResult = balanceData?.[0];
      
      // Preparar dados para inserção
      const insertData: any = {
        tenant_id: tenantId,
        product_id: movementData.product_id,
        storage_location_id: movementData.storage_location_id,
        movement_type: movementData.movement_type,
        movement_reason: movementData.movement_reason || null,
        movement_date: movementData.movement_date,
        quantity: movementData.quantity,
        unit_value: movementData.unit_value || 0,
        accumulated_balance: balanceResult?.accumulated_balance || 0,
        unit_cmc: balanceResult?.unit_cmc || 0,
        invoice_number: movementData.invoice_number || null,
        operation: movementData.operation || null,
        customer_or_supplier: movementData.customer_or_supplier || null,
        observation: movementData.observation || null,
        origin_storage_location_id: movementData.origin_storage_location_id || null,
        destination_storage_location_id: movementData.destination_storage_location_id || null
      };
      
      // Se for transferência, também atualizar o local de origem ANTES de inserir a movimentação
      if (movementData.movement_type === 'TRANSFERENCIA' && movementData.origin_storage_location_id) {
        // Calcular saldo para origem (saída) - isso atualiza product_stock_by_location
        const { data: originBalanceData, error: originBalanceError } = await supabase.rpc('calculate_stock_balance', {
          p_tenant_id: tenantId,
          p_product_id: movementData.product_id,
          p_storage_location_id: movementData.origin_storage_location_id,
          p_movement_type: 'SAIDA',
          p_quantity: movementData.quantity,
          p_unit_value: movementData.unit_value || 0
        });
        
        if (originBalanceError) {
          console.error('🚨 [ERROR] Falha ao calcular saldo de origem:', originBalanceError);
          throw originBalanceError;
        }
        
        // AIDEV-NOTE: Para transferências, o storage_location_id da movimentação deve ser o destino
        // mas precisamos também criar uma movimentação de saída na origem (opcional, pode ser apenas uma movimentação)
        // Por enquanto, vamos apenas atualizar o estoque e criar a movimentação de entrada no destino
      }
      
      const { data: insertedData, error: insertError } = await supabase
        .from('stock_movements')
        .insert(insertData)
        .select()
        .single();
      
      if (insertError) {
        console.error('🚨 [ERROR] Falha ao criar movimentação:', insertError);
        throw insertError;
      }
      
      // AIDEV-NOTE: Validação dupla de segurança
      if (insertedData && insertedData.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Violação de segurança detectada na criação');
        throw new Error('❌ ERRO CRÍTICO: Movimentação criada com tenant incorreto!');
      }
      
      // AIDEV-NOTE: Atualizar stock_quantity do produto baseado no tipo de movimento
      // Para transferências, não alteramos o estoque total (apenas muda de local)
      if (movementData.movement_type !== 'TRANSFERENCIA') {
        const { data: productData } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', movementData.product_id)
          .eq('tenant_id', tenantId)
          .single();
        
        if (productData) {
          let newStockQuantity = productData.stock_quantity || 0;
          
          if (movementData.movement_type === 'ENTRADA') {
            newStockQuantity += movementData.quantity;
          } else if (movementData.movement_type === 'SAIDA') {
            newStockQuantity = Math.max(0, newStockQuantity - movementData.quantity);
          } else if (movementData.movement_type === 'AJUSTE') {
            // Para ajuste, usar o saldo acumulado calculado
            newStockQuantity = balanceResult?.accumulated_balance || movementData.quantity;
          }
          
          await supabase
            .from('products')
            .update({ stock_quantity: newStockQuantity })
            .eq('id', movementData.product_id)
            .eq('tenant_id', tenantId);
        }
      }
      
      console.log(`✅ [SUCCESS] Movimentação criada com sucesso: ${insertedData.id}`);
      return insertedData;
    },
    {
      invalidateQueries: ['stock_movements', 'products']
    }
  );

  // 🔄 Mutação segura para atualizar movimentação
  const updateMovementMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, movementId: string, movementData: UpdateStockMovementDTO) => {
      console.log(`✏️ [AUDIT] Atualizando movimentação ${movementId} para tenant: ${tenantId}`);
      
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      const { data: updatedData, error: updateError } = await supabase
        .from('stock_movements')
        .update(movementData)
        .eq('id', movementId)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      
      if (updateError) {
        console.error('🚨 [ERROR] Falha ao atualizar movimentação:', updateError);
        throw updateError;
      }
      
      if (updatedData && updatedData.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Violação de segurança detectada na atualização');
        throw new Error('❌ ERRO CRÍTICO: Movimentação atualizada com tenant incorreto!');
      }
      
      console.log(`✅ [SUCCESS] Movimentação atualizada com sucesso`);
      return updatedData;
    },
    {
      invalidateQueries: ['stock_movements']
    }
  );

  // 🔄 Mutação segura para excluir movimentação
  const deleteMovementMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, movementId: string) => {
      console.log(`🗑️ [AUDIT] Excluindo movimentação ${movementId} para tenant: ${tenantId}`);
      
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      const { error: deleteError } = await supabase
        .from('stock_movements')
        .delete()
        .eq('id', movementId)
        .eq('tenant_id', tenantId);
      
      if (deleteError) {
        console.error('🚨 [ERROR] Falha ao excluir movimentação:', deleteError);
        throw deleteError;
      }
      
      console.log(`✅ [SUCCESS] Movimentação excluída com sucesso`);
      return { success: true };
    },
    {
      invalidateQueries: ['stock_movements']
    }
  );

  return {
    // 📊 Dados
    movements,
    totalCount,
    
    // 🔄 Estados
    isLoading,
    error: error || accessError,
    hasAccess,
    
    // 🔄 Ações
    refetch,
    createMovement: createMovementMutation.mutate,
    updateMovement: updateMovementMutation.mutate,
    deleteMovement: deleteMovementMutation.mutate,
    
    // 🔄 Estados das mutações
    isCreating: createMovementMutation.isPending,
    isUpdating: updateMovementMutation.isPending,
    isDeleting: deleteMovementMutation.isPending,
    
    // 🚨 Erros das mutações
    createError: createMovementMutation.error,
    updateError: updateMovementMutation.error,
    deleteError: deleteMovementMutation.error
  };
}


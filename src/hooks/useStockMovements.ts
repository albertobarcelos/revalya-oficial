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
    
    // Query sem joins - PostgREST não está reconhecendo os relacionamentos
    // AIDEV-NOTE: Buscando dados básicos primeiro, depois enriquecendo com queries separadas
    let query = supabase
      .from('stock_movements')
      .select('*', { count: 'exact' })
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
    
    // AIDEV-NOTE: Buscar todos os relacionamentos separadamente
    // Coletar IDs únicos
    const productIds = [...new Set(data?.map(m => m.product_id).filter(Boolean) || [])];
    const storageLocationIds = [...new Set(data?.map(m => m.storage_location_id).filter(Boolean) || [])];
    const originLocationIds = [...new Set(data?.filter(m => m.origin_storage_location_id).map(m => m.origin_storage_location_id) || [])];
    const destinationLocationIds = [...new Set(data?.filter(m => m.destination_storage_location_id).map(m => m.destination_storage_location_id) || [])];
    
    // Buscar products
    let productsMap: Record<string, any> = {};
    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, code, sku, unit_of_measure')
        .in('id', productIds)
        .eq('tenant_id', tenantId);
      
      if (productsData) {
        productsMap = productsData.reduce((acc, prod) => {
          acc[prod.id] = prod;
          return acc;
        }, {} as Record<string, any>);
      }
    }
    
    // Buscar storage_locations (principal)
    let storageLocationsMap: Record<string, any> = {};
    if (storageLocationIds.length > 0) {
      const { data: storageData } = await supabase
        .from('storage_locations')
        .select('id, name, description')
        .in('id', storageLocationIds)
        .eq('tenant_id', tenantId);
      
      if (storageData) {
        storageLocationsMap = storageData.reduce((acc, loc) => {
          acc[loc.id] = loc;
          return acc;
        }, {} as Record<string, any>);
      }
    }
    
    // Buscar origin_locations
    let originLocationsMap: Record<string, any> = {};
    if (originLocationIds.length > 0) {
      const { data: originData } = await supabase
        .from('storage_locations')
        .select('id, name, description')
        .in('id', originLocationIds)
        .eq('tenant_id', tenantId);
      
      if (originData) {
        originLocationsMap = originData.reduce((acc, loc) => {
          acc[loc.id] = loc;
          return acc;
        }, {} as Record<string, any>);
      }
    }
    
    // Buscar destination_locations
    let destinationLocationsMap: Record<string, any> = {};
    if (destinationLocationIds.length > 0) {
      const { data: destData } = await supabase
        .from('storage_locations')
        .select('id, name, description')
        .in('id', destinationLocationIds)
        .eq('tenant_id', tenantId);
      
      if (destData) {
        destinationLocationsMap = destData.reduce((acc, loc) => {
          acc[loc.id] = loc;
          return acc;
        }, {} as Record<string, any>);
      }
    }
    
    // AIDEV-NOTE: Enriquecer dados com todos os relacionamentos
    const enrichedData = data?.map(movement => ({
      ...movement,
      product: movement.product_id ? productsMap[movement.product_id] : undefined,
      storage_location: movement.storage_location_id ? storageLocationsMap[movement.storage_location_id] : undefined,
      origin_location: movement.origin_storage_location_id ? originLocationsMap[movement.origin_storage_location_id] : undefined,
      destination_location: movement.destination_storage_location_id ? destinationLocationsMap[movement.destination_storage_location_id] : undefined
    })) || [];
    
    console.log(`✅ [SUCCESS] ${enrichedData.length} movimentações encontradas`);
    
    return {
      movements: enrichedData,
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
      
      // AIDEV-NOTE: Obter ID do usuário atual para created_by
      // NOTA: O contexto de tenant já é configurado pelo useSecureTenantMutation
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      
      // AIDEV-NOTE: Validar parâmetros antes de chamar RPC
      if (!movementData.product_id) {
        throw new Error('product_id é obrigatório');
      }
      if (!movementData.storage_location_id) {
        throw new Error('storage_location_id é obrigatório');
      }
      if (!movementData.movement_type) {
        throw new Error('movement_type é obrigatório');
      }
      if (!movementData.quantity || movementData.quantity <= 0) {
        throw new Error('quantity deve ser maior que zero');
      }
      
      // AIDEV-NOTE: Calcular saldo acumulado e CMC usando função RPC
      console.log('🔍 [DEBUG] Chamando calculate_stock_balance com:', {
        p_tenant_id: tenantId,
        p_product_id: movementData.product_id,
        p_storage_location_id: movementData.storage_location_id,
        p_movement_type: movementData.movement_type,
        p_quantity: movementData.quantity,
        p_unit_value: movementData.unit_value || 0
      });
      
      const { data: balanceData, error: balanceError } = await supabase.rpc('calculate_stock_balance', {
        p_tenant_id: tenantId,
        p_product_id: movementData.product_id,
        p_storage_location_id: movementData.storage_location_id,
        p_movement_type: movementData.movement_type,
        p_quantity: Number(movementData.quantity),
        p_unit_value: Number(movementData.unit_value || 0)
      });
      
      if (balanceError) {
        console.error('🚨 [ERROR] Falha ao calcular saldo:', balanceError);
        console.error('🚨 [ERROR] Detalhes do erro:', JSON.stringify(balanceError, null, 2));
        throw new Error(balanceError.message || 'Erro ao calcular saldo de estoque');
      }
      
      if (!balanceData || balanceData.length === 0) {
        console.warn('⚠️ [WARN] calculate_stock_balance retornou dados vazios');
        throw new Error('Função calculate_stock_balance não retornou dados');
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
        destination_storage_location_id: movementData.destination_storage_location_id || null,
        created_by: userId // AIDEV-NOTE: Campo obrigatório para auditoria e RLS
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
      // IMPORTANTE: Só atualizar estoque se a data do movimento for hoje ou no passado
      // Movimentos com data futura são apenas previsões e não devem alterar o estoque atual
      const movementDate = new Date(movementData.movement_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      movementDate.setHours(0, 0, 0, 0);
      
      const isPastOrToday = movementDate <= today;
      
      // AIDEV-NOTE: Atualizar stock_quantity como soma de todos os locais
      // IMPORTANTE: Para transferências, o estoque total não muda, mas a distribuição sim
      // Por isso sempre recalculamos a soma de todos os locais
      if (isPastOrToday) {
        // AIDEV-NOTE: Calcular stock_quantity como soma de todos os available_stock de product_stock_by_location
        // Isso garante que stock_quantity sempre reflete a soma de todos os locais
        const { data: stockByLocation } = await supabase
          .from('product_stock_by_location')
          .select('available_stock')
          .eq('product_id', movementData.product_id)
          .eq('tenant_id', tenantId);
        
        if (stockByLocation) {
          // Somar todos os estoques de todos os locais
          const totalStock = stockByLocation.reduce((sum, stock) => sum + (stock.available_stock || 0), 0);
          
          await supabase
            .from('products')
            .update({ stock_quantity: totalStock })
            .eq('id', movementData.product_id)
            .eq('tenant_id', tenantId);
          
          console.log(`📦 [STOCK] Estoque total atualizado: ${totalStock} (soma de ${stockByLocation.length} locais, tipo: ${movementData.movement_type})`);
        }
      } else if (!isPastOrToday) {
        console.log(`📅 [FORECAST] Movimento com data futura (${movementData.movement_date}) - não atualiza estoque atual`);
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


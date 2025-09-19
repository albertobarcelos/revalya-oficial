import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from './templates/useSecureTenantQuery';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Product {
  id: string;
  name: string;
  description: string;
  code: string | null;
  sku: string | null;
  barcode: string | null;
  unit_price: number;
  cost_price: number | null;
  stock_quantity: number;
  min_stock_quantity: number;
  category: string | null;
  supplier: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  tenant_id: string;
  tax_rate: number;
  has_inventory: boolean;
  image_url: string | null;
}

export interface CreateProductDTO {
  name: string;
  description?: string;
  code?: string;
  sku?: string;
  barcode?: string;
  unit_price: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_quantity?: number;
  category?: string;
  supplier?: string;
  tax_rate?: number;
  has_inventory?: boolean;
  is_active?: boolean;
  image_url?: string;
}

interface UseProductsParams {
  searchTerm?: string;
  limit?: number;
  page?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

/**
 * Hook seguro para gerenciamento de produtos com isolamento multi-tenant
 * Usa o template useSecureTenantQuery para garantir segurança total
 */
export function useProducts(params?: UseProductsParams) {
  const { 
    searchTerm = "", 
    limit = 10, 
    page = 1, 
    category = null, 
    minPrice = null, 
    maxPrice = null, 
    inStock = null 
  } = params || {};
  
  // 🔐 Validação de acesso obrigatória
  const { hasAccess, accessError } = useTenantAccessGuard();
  
  // 📊 Query function segura para buscar produtos
  const fetchProductsQuery = async (supabase: SupabaseClient, tenantId: string) => {
    console.log(`📊 [AUDIT] Buscando produtos para tenant: ${tenantId}`);
    
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    // Aplicar filtros
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (minPrice !== null) {
      query = query.gte('unit_price', minPrice);
    }
    
    if (maxPrice !== null) {
      query = query.lte('unit_price', maxPrice);
    }
    
    if (inStock !== null) {
      if (inStock) {
        query = query.gt('stock_quantity', 0);
      } else {
        query = query.eq('stock_quantity', 0);
      }
    }
    
    // Paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('🚨 [ERROR] Falha ao buscar produtos:', error);
      throw error;
    }
    
    console.log(`✅ [SUCCESS] ${data?.length || 0} produtos encontrados`);
    
    return {
      products: data || [],
      totalCount: count || 0
    };
  };
  
  // 🔍 Query segura usando o template
  const queryKey = searchTerm 
    ? ['products', 'search', searchTerm, category, minPrice, maxPrice, inStock, page, limit]
    : ['products', 'list', category, minPrice, maxPrice, inStock, page, limit];
  
  const {
    data,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    queryKey,
    fetchProductsQuery,
    {
      enabled: hasAccess,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false
    }
  );
  
  const products = data?.products || [];
  const totalCount = data?.totalCount || 0;
  
  // 🔄 Mutação segura para criar produto
  const createProductMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, productData: CreateProductDTO) => {
      console.log(`📝 [AUDIT] Criando produto para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao criar produto:', error);
        throw error;
      }
      
      console.log(`✅ [SUCCESS] Produto criado: ${data.name}`);
      return data;
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de produtos');
      },
      invalidateQueries: ['products']
    }
  );
  
  // 🔄 Mutação segura para atualizar produto
  const updateProductMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, { id, ...productData }: { id: string } & Partial<CreateProductDTO>) => {
      console.log(`📝 [AUDIT] Atualizando produto ${id} para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('products')
        .update({
          ...productData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao atualizar produto:', error);
        throw error;
      }
      
      console.log(`✅ [SUCCESS] Produto atualizado: ${data.name}`);
      return data;
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de produtos');
      },
      invalidateQueries: ['products']
    }
  );
  
  // 🗑️ Mutação segura para deletar produto
  const deleteProductMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, productId: string) => {
      console.log(`🗑️ [AUDIT] Deletando produto ${productId} para tenant: ${tenantId}`);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('tenant_id', tenantId);
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao deletar produto:', error);
        throw error;
      }
      
      console.log(`✅ [SUCCESS] Produto deletado: ${productId}`);
      return { id: productId };
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de produtos');
      },
      invalidateQueries: ['products']
    }
  );
  
  // 🔄 Função para recarregar dados
  const reload = () => {
    console.log('🔄 [RELOAD] Recarregando produtos');
    refetch();
  };
  
  return {
    // 📊 Dados
    products,
    totalCount,
    
    // 🔄 Estados
    isLoading,
    error: error || (hasAccess ? null : new Error(accessError || 'Acesso negado')),
    
    // 🔄 Ações
    reload,
    refetch,
    
    // 🔄 Mutações
    createProduct: createProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    
    // 🔄 Estados das mutações
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    
    // 🔐 Segurança
    hasAccess,
    accessError
  };
}

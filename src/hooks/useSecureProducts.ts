import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from './templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';

// 📋 Interface para Product
export interface Product {
  id: string;
  name: string;
  description?: string;
  code?: string;
  sku: string;
  barcode?: string;
  category?: string; // AIDEV-NOTE: Campo legado - será depreciado
  category_id?: string; // AIDEV-NOTE: Nova foreign key para product_categories
  unit_price: number;
  cost_price?: number;
  stock_quantity: number;
  min_stock_quantity?: number;
  supplier?: string;
  unit_of_measure?: string;
  is_active: boolean;
  tax_rate?: number;
  has_inventory?: boolean;
  image_url?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// 📋 Interface para criação de produto
export interface CreateProductDTO {
  name: string;
  description?: string;
  code?: string;
  sku: string;
  barcode?: string;
  category?: string; // AIDEV-NOTE: Campo legado - será depreciado
  category_id?: string; // AIDEV-NOTE: Nova foreign key para product_categories
  unit_price: number;
  cost_price?: number;
  stock_quantity: number;
  min_stock_quantity?: number;
  supplier?: string;
  unit_of_measure?: string;
  is_active?: boolean;
  tax_rate?: number;
  has_inventory?: boolean;
  image_url?: string;
}

// 📋 Interface para parâmetros de busca
export interface UseSecureProductsParams {
  searchTerm?: string;
  category?: string;
  is_active?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  limit?: number;
}

// 📋 Interface para opções de query
export interface UseSecureProductsOptions {
  enabled?: boolean;
}

/**
 * 🔐 Hook Seguro para Gerenciamento de Produtos
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 */
export function useSecureProducts(params: UseSecureProductsParams = {}, options: UseSecureProductsOptions = {}) {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const queryClient = useQueryClient();
  
  // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA - Só valida se a query estiver habilitada
  if (options.enabled !== false && !hasAccess) {
    throw new Error(accessError || 'Acesso negado');
  }
  
  const {
    searchTerm = '',
    category = '',
    is_active,
    minPrice,
    maxPrice,
    inStock,
    page = 1,
    limit = 10
  } = params;

  // 🔐 CONSULTA SEGURA COM RPC OTIMIZADA (similar aos serviços)
  const {
    data: productsData,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['products', currentTenant?.id, {
      searchTerm,
      category,
      is_active,
      minPrice,
      maxPrice,
      inStock,
      page,
      limit
    }],
    async (supabase, tenantId) => {
      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`[AUDIT] Consultando produtos via RPC - Tenant: ${tenantId}, Filtros:`, {
        searchTerm, category, is_active, minPrice, maxPrice, inStock, page, limit
      });
      
      // 🚀 USANDO RPC OTIMIZADA (similar aos serviços)
      const { data, error } = await supabase.rpc('get_products_by_tenant', {
        p_tenant_id: tenantId,
        p_search_term: searchTerm || null,
        p_category: category || null,
        p_is_active: is_active,
        p_min_price: minPrice || null,
        p_max_price: maxPrice || null,
        p_in_stock: inStock,
        p_page: page,
        p_limit: limit
      });
      
      if (error) {
        console.error('[AUDIT] Erro ao consultar produtos via RPC:', error);
        throw error;
      }
      
      // 🔒 VALIDAÇÃO DUPLA OBRIGATÓRIA
      if (data) {
        const invalidData = data.filter(item => item.tenant_id !== tenantId);
        if (invalidData.length > 0) {
          console.error('[SECURITY] Violação de segurança detectada - dados de outro tenant:', invalidData);
          throw new Error('Violação de segurança: dados de outro tenant detectados');
        }
      }
      
      const totalCount = data && data.length > 0 ? data[0].total_count : 0;
      console.log(`[AUDIT] Produtos consultados via RPC com sucesso - ${data?.length || 0} registros, Total: ${totalCount}`);
      
      return {
        products: data || [],
        total: totalCount || 0
      };
    },
    {
      enabled: (options.enabled !== false) && !!currentTenant?.id,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );

  // 🔐 MUTAÇÃO SEGURA PARA CRIAR PRODUTO
  const createProductMutation = useSecureTenantMutation(
    async (supabase, tenantId, productData: CreateProductDTO) => {
      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`[AUDIT] Criando produto - Tenant: ${tenantId}, Nome: ${productData.name}`);
      
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          tenant_id: tenantId, // 🛡️ TENANT_ID OBRIGATÓRIO
          is_active: productData.is_active !== undefined ? productData.is_active : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: tenantId // Assuming created_by should be set
        })
        .select()
        .single();
      
      if (error) {
        console.error('[AUDIT] Erro ao criar produto:', error);
        throw error;
      }
      
      // 🔒 VALIDAÇÃO DUPLA OBRIGATÓRIA
      if (data.tenant_id !== tenantId) {
        console.error('[SECURITY] Violação de segurança na criação:', data);
        throw new Error('Violação de segurança na criação do produto');
      }
      
      console.log(`[AUDIT] Produto criado com sucesso - ID: ${data.id}`);
      return data;
    },
    {
      onSuccess: () => {
        // 🔄 INVALIDAR CACHE ESPECÍFICO DO TENANT
        queryClient.invalidateQueries({
          queryKey: ['products', currentTenant?.id]
        });
      }
    }
  );

  // 🔐 MUTAÇÃO SEGURA PARA ATUALIZAR PRODUTO
  const updateProductMutation = useSecureTenantMutation(
    async (supabase, tenantId, { id, productData }: { id: string; productData: Partial<CreateProductDTO> }) => {
      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`[AUDIT] Atualizando produto - Tenant: ${tenantId}, ID: ${id}`);
      
      // 🛡️ VERIFICAR SE O PRODUTO PERTENCE AO TENANT
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (checkError || !existingProduct) {
        console.error('[SECURITY] Tentativa de atualização cross-tenant:', { id, tenantId });
        throw new Error('Produto não encontrado ou acesso negado');
      }
      
      const { data, error } = await supabase
        .from('products')
        .update({
          ...productData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO DUPLO DE SEGURANÇA
        .select()
        .single();
      
      if (error) {
        console.error('[AUDIT] Erro ao atualizar produto:', error);
        throw error;
      }
      
      // 🔒 VALIDAÇÃO DUPLA OBRIGATÓRIA
      if (data.tenant_id !== tenantId) {
        console.error('[SECURITY] Violação de segurança na atualização:', data);
        throw new Error('Violação de segurança na atualização do produto');
      }
      
      console.log(`[AUDIT] Produto atualizado com sucesso - ID: ${data.id}`);
      return data;
    },
    {
      onSuccess: () => {
        // 🔄 INVALIDAR CACHE ESPECÍFICO DO TENANT
        queryClient.invalidateQueries({
          queryKey: ['products', currentTenant?.id]
        });
      }
    }
  );

  // 🔐 MUTAÇÃO SEGURA PARA DELETAR PRODUTO
  const deleteProductMutation = useSecureTenantMutation(
    async (supabase, tenantId, productId: string) => {
      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`[AUDIT] Deletando produto - Tenant: ${tenantId}, ID: ${productId}`);
      
      // 🛡️ VERIFICAR SE O PRODUTO PERTENCE AO TENANT
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', productId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (checkError || !existingProduct) {
        console.error('[SECURITY] Tentativa de deleção cross-tenant:', { productId, tenantId });
        throw new Error('Produto não encontrado ou acesso negado');
      }
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('tenant_id', tenantId); // 🛡️ FILTRO DUPLO DE SEGURANÇA
      
      if (error) {
        console.error('[AUDIT] Erro ao deletar produto:', error);
        throw error;
      }
      
      console.log(`[AUDIT] Produto deletado com sucesso - ID: ${productId}, Nome: ${existingProduct.name}`);
      return { id: productId };
    },
    {
      onSuccess: () => {
        // 🔄 INVALIDAR CACHE ESPECÍFICO DO TENANT
        queryClient.invalidateQueries({
          queryKey: ['products', currentTenant?.id]
        });
      }
    }
  );

  return {
    // Dados
    products: (productsData as any)?.products || [],
    total: (productsData as any)?.total || 0,
    totalPages: Math.ceil(((productsData as any)?.total || 0) / limit),
    
    // Estados
    isLoading,
    error,
    
    // Ações
    refetch,
    createProduct: createProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    
    // Estados das mutações
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    
    // Erros das mutações
    createError: createProductMutation.error,
    updateError: updateProductMutation.error,
    deleteError: deleteProductMutation.error
  };
}

// AIDEV-NOTE: Interface para categorias de produtos da tabela product_categories
export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 🔐 Hook para obter categorias de produtos (com cache isolado por tenant)
 */
export function useProductCategories() {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA
  if (!hasAccess) {
    throw new Error(accessError || 'Acesso negado');
  }
  
  return useSecureTenantQuery(
    ['product-categories', currentTenant?.id],
    async (supabase, tenantId) => {
      console.log(`[AUDIT] Consultando categorias de produtos - Tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, description, is_active, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('[AUDIT] Erro ao consultar categorias:', error);
        throw error;
      }
      
      console.log(`[AUDIT] Categorias consultadas - ${data?.length || 0} encontradas`);
      return data as ProductCategory[];
    },
    {
      enabled: !!currentTenant?.id,
      staleTime: 15 * 60 * 1000, // 15 minutos
    }
  );
}
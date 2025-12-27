/**
 * 🏷️ Hook para gerenciamento de categorias de produtos
 * 
 * AIDEV-NOTE: Hook seguro que implementa o padrão multi-tenant
 * para categorias de produtos, seguindo a arquitetura do projeto
 * com useSecureTenantQuery e useSecureTenantMutation
 */

import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from './templates/useSecureTenantQuery';
import type { SupabaseClient } from '@supabase/supabase-js';

// 📋 Interface para categoria de produto
export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 📋 Interface para criação/atualização de categoria
export interface CreateProductCategoryDTO {
  name: string;
  description?: string;
  is_active?: boolean;
}

// 📋 Interface para parâmetros de busca
export interface UseProductCategoriesParams {
  searchTerm?: string;
  is_active?: boolean;
  limit?: number;
  page?: number;
  enabled?: boolean; // AIDEV-NOTE: Permitir desabilitar a query quando só precisamos da função de criação
}

/**
 * Hook seguro para gerenciamento de categorias de produtos
 * Implementa isolamento multi-tenant e auditoria completa
 */
export function useProductCategories(params?: UseProductCategoriesParams) {
  const { 
    searchTerm = "", 
    is_active = true,
    limit = 50, 
    page = 1 
  } = params || {};
  
  // 🔐 Validação de acesso obrigatória
  const { hasAccess, accessError } = useTenantAccessGuard();

  // 📊 Query function segura para buscar categorias
  const fetchCategoriesQuery = async (supabase: SupabaseClient, tenantId: string) => {
    
    // AIDEV-NOTE: Configurar contexto de tenant antes da query
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });
    
    let query = supabase
      .from('product_categories')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    // Aplicar filtros
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }
    
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }
    
    // Ordenação por nome
    query = query.order('name', { ascending: true });
    
    // Paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('🚨 [ERROR] Falha ao buscar categorias:', error);
      throw error;
    }
    
    // AIDEV-NOTE: Validação dupla de segurança - verificar se todos os dados pertencem ao tenant correto
    const invalidData = data?.filter(item => item.tenant_id !== tenantId);
    if (invalidData && invalidData.length > 0) {
      console.error('🚨 [SECURITY] Violação de segurança detectada:', {
        invalidItems: invalidData.length,
        expectedTenant: tenantId,
        invalidTenants: invalidData.map(item => item.tenant_id)
      });
      throw new Error('❌ ERRO CRÍTICO: Dados de tenant incorreto retornados - possível vazamento de segurança!');
    }
    
    
    return {
      categories: data || [],
      totalCount: count || 0
    };
  };

  // 🔍 Query segura usando o template
  const queryKey = searchTerm 
    ? ['product_categories', 'search', searchTerm, is_active, page, limit]
    : ['product_categories', 'list', is_active, page, limit];
  
  // AIDEV-NOTE: Permitir desabilitar a query quando só precisamos da função de criação
  const queryEnabled = params?.enabled !== undefined ? params.enabled : hasAccess;

  const {
    data,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    queryKey,
    fetchCategoriesQuery,
    {
      enabled: queryEnabled,
      staleTime: 15 * 60 * 1000, // AIDEV-NOTE: 15 minutos (categorias mudam muito pouco)
      gcTime: 30 * 60 * 1000, // AIDEV-NOTE: 30 minutos em cache (performance)
      refetchOnWindowFocus: false, // AIDEV-NOTE: Não recarregar ao mudar de aba do navegador
      refetchOnMount: false, // AIDEV-NOTE: Não recarregar ao remontar se já tiver dados em cache
      refetchOnReconnect: false, // AIDEV-NOTE: Não recarregar ao reconectar
    }
  );
  
  const categories = data?.categories || [];
  const totalCount = data?.totalCount || 0;

  // 🔄 Mutação segura para criar categoria
  const createCategoryMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, categoryData: CreateProductCategoryDTO) => {
      console.log(`📝 [AUDIT] Criando categoria para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto de tenant antes da mutation
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      const { data: insertedData, error } = await supabase
        .from('product_categories')
        .insert({
          ...categoryData,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao criar categoria:', error);
        throw error;
      }
      
      // AIDEV-NOTE: Validação dupla de segurança - verificar se o dado criado pertence ao tenant correto
      if (insertedData && insertedData.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Violação de segurança na criação:', {
          expectedTenant: tenantId,
          returnedTenant: insertedData.tenant_id
        });
        throw new Error('❌ ERRO CRÍTICO: Categoria criada com tenant_id incorreto - possível vazamento de segurança!');
      }
      
      console.log(`✅ [SUCCESS] Categoria criada com sucesso`);
      return insertedData || {
        ...categoryData,
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      };
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de categorias');
      },
      invalidateQueries: ['product_categories']
    }
  );

  // 🔄 Mutação segura para atualizar categoria
  const updateCategoryMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, { id, ...categoryData }: { id: string } & Partial<CreateProductCategoryDTO>) => {
      console.log(`📝 [AUDIT] Atualizando categoria ${id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto de tenant antes da mutation
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      const { error } = await supabase
        .from('product_categories')
        .update({
          ...categoryData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao atualizar categoria:', error);
        throw error;
      }
      
      console.log(`✅ [SUCCESS] Categoria atualizada com sucesso`);
      // AIDEV-NOTE: Retornando dados básicos sem consulta adicional
      return {
        id,
        ...categoryData,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      };
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de categorias');
      },
      invalidateQueries: ['product_categories']
    }
  );

  // 🗑️ Mutação segura para deletar categoria
  const deleteCategoryMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, categoryId: string) => {
      console.log(`🗑️ [AUDIT] Deletando categoria ${categoryId} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto de tenant antes da mutation
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', categoryId)
        .eq('tenant_id', tenantId);
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao deletar categoria:', error);
        throw error;
      }
      
      console.log(`✅ [SUCCESS] Categoria deletada: ${categoryId}`);
      return { id: categoryId };
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de categorias');
      },
      invalidateQueries: ['product_categories']
    }
  );

  // 🔄 Mutação segura para alternar status ativo/inativo
  const toggleCategoryStatusMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, { id, is_active }: { id: string; is_active: boolean }) => {
      console.log(`🔄 [AUDIT] Alternando status da categoria ${id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto de tenant antes da mutation
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      const { error } = await supabase
        .from('product_categories')
        .update({
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao alterar status da categoria:', error);
        throw error;
      }
      
      console.log(`✅ [SUCCESS] Status da categoria alterado -> ${is_active ? 'ativo' : 'inativo'}`);
      // AIDEV-NOTE: Retornando dados básicos sem consulta adicional
      return {
        id,
        is_active,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      };
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de categorias');
      },
      invalidateQueries: ['product_categories']
    }
  );

  return {
    // 📊 Dados
    categories,
    totalCount,
    
    // 🔄 Estados
    isLoading,
    error: error || accessError,
    hasAccess,
    
    // 🔄 Ações
    refetch,
    createCategory: createCategoryMutation.mutate, // AIDEV-NOTE: Retorna função mutate direta (mesmo padrão de useCustomers)
    updateCategory: updateCategoryMutation.mutate, // AIDEV-NOTE: Consistência no padrão
    deleteCategory: deleteCategoryMutation.mutate, // AIDEV-NOTE: Consistência no padrão
    toggleCategoryStatus: toggleCategoryStatusMutation.mutate, // AIDEV-NOTE: Consistência no padrão
    
    // 🔄 Estados das mutações
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
    isToggling: toggleCategoryStatusMutation.isPending,
    
    // 🚨 Erros das mutações
    createError: createCategoryMutation.error,
    updateError: updateCategoryMutation.error,
    deleteError: deleteCategoryMutation.error,
    toggleError: toggleCategoryStatusMutation.error
  };
}

/**
 * Hook simplificado para buscar apenas categorias ativas
 * Útil para selects e dropdowns
 */
export function useActiveProductCategories() {
  return useProductCategories({ 
    is_active: true, 
    limit: 100 // Buscar todas as categorias ativas
  });
}
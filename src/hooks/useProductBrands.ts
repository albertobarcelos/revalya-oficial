/**
 * 🏷️ Hook para gerenciamento de marcas de produtos
 * 
 * AIDEV-NOTE: Hook seguro que implementa o padrão multi-tenant
 * para marcas de produtos, seguindo a arquitetura do projeto
 * com useSecureTenantQuery e useSecureTenantMutation
 */

import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from './templates/useSecureTenantQuery';
import type { SupabaseClient } from '@supabase/supabase-js';

// 📋 Interface para marca de produto
export interface ProductBrand {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 📋 Interface para criação/atualização de marca
export interface CreateProductBrandDTO {
  name: string;
  description?: string;
  is_active?: boolean;
}

// 📋 Interface para parâmetros de busca
export interface UseProductBrandsParams {
  searchTerm?: string;
  is_active?: boolean;
  limit?: number;
  page?: number;
}

/**
 * Hook seguro para gerenciamento de marcas de produtos
 * Implementa isolamento multi-tenant e auditoria completa
 */
export function useProductBrands(params?: UseProductBrandsParams) {
  const { 
    searchTerm = "", 
    is_active = true,
    limit = 50, 
    page = 1 
  } = params || {};
  
  // 🔐 Validação de acesso obrigatória
  const { hasAccess, accessError } = useTenantAccessGuard();

  // 📊 Query function segura para buscar marcas
  const fetchBrandsQuery = async (supabase: SupabaseClient, tenantId: string) => {
    
    // AIDEV-NOTE: Configurar contexto de tenant antes da query
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });
    
    let query = supabase
      .from('product_brands')
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
      console.error('🚨 [ERROR] Falha ao buscar marcas:', error);
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
      brands: data || [],
      totalCount: count || 0
    };
  };

  // 🔍 Query segura usando o template
  const queryKey = searchTerm 
    ? ['product_brands', 'search', searchTerm, String(is_active), String(page), String(limit)]
    : ['product_brands', 'list', String(is_active), String(page), String(limit)];
  
  const {
    data,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    queryKey,
    fetchBrandsQuery,
    {
      enabled: hasAccess,
      staleTime: 15 * 60 * 1000, // AIDEV-NOTE: 15 minutos (marcas mudam muito pouco)
      gcTime: 30 * 60 * 1000, // AIDEV-NOTE: 30 minutos em cache (performance)
      refetchOnWindowFocus: false, // AIDEV-NOTE: Não recarregar ao mudar de aba do navegador
      refetchOnMount: false, // AIDEV-NOTE: Não recarregar ao remontar se já tiver dados em cache
      refetchOnReconnect: false, // AIDEV-NOTE: Não recarregar ao reconectar
    }
  );
  
  const brands = data?.brands || [];
  const totalCount = data?.totalCount || 0;

  // 🔄 Mutação segura para criar marca
  const createBrandMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, brandData: CreateProductBrandDTO) => {
      console.log(`📝 [AUDIT] Criando marca para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto de tenant antes da mutation
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      const { data: insertedData, error } = await supabase
        .from('product_brands')
        .insert({
          ...brandData,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao criar marca:', error);
        throw error;
      }
      
      // AIDEV-NOTE: Validação dupla de segurança - verificar se o dado criado pertence ao tenant correto
      if (insertedData && insertedData.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Violação de segurança na criação:', {
          expectedTenant: tenantId,
          returnedTenant: insertedData.tenant_id
        });
        throw new Error('❌ ERRO CRÍTICO: Marca criada com tenant_id incorreto - possível vazamento de segurança!');
      }
      
      console.log(`✅ [SUCCESS] Marca criada com sucesso`);
      return insertedData || {
        ...brandData,
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      };
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de marcas');
      },
      invalidateQueries: ['product_brands']
    }
  );

  return {
    // 📊 Dados
    brands,
    totalCount,
    
    // 🔄 Estados
    isLoading,
    error: error || accessError,
    hasAccess,
    
    // 🔄 Ações
    refetch,
    createBrand: createBrandMutation.mutateAsync, // AIDEV-NOTE: Retorna mutateAsync para suportar callbacks
    
    // 🔄 Estados das mutações
    isCreating: createBrandMutation.isPending,
    
    // 🚨 Erros das mutações
    createError: createBrandMutation.error,
  };
}

/**
 * Hook simplificado para buscar apenas marcas ativas
 * Útil para selects e dropdowns
 */
export function useActiveProductBrands() {
  return useProductBrands({ 
    is_active: true, 
    limit: 100 // Buscar todas as marcas ativas
  });
}


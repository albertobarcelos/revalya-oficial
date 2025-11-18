import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from './templates/useSecureTenantQuery';
import type { SupabaseClient } from '@supabase/supabase-js';

// 📋 Interface para StorageLocation
export interface StorageLocation {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  address?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// 📋 Interface para criação de local de estoque
export interface CreateStorageLocationDTO {
  name: string;
  description?: string;
  address?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

// 📋 Interface para atualização de local de estoque
export interface UpdateStorageLocationDTO {
  name?: string;
  description?: string;
  address?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

// 📋 Interface para parâmetros de busca
export interface UseStorageLocationsParams {
  searchTerm?: string;
  is_active?: boolean;
  limit?: number;
  page?: number;
}

/**
 * Hook seguro para gerenciamento de locais de estoque
 * Implementa isolamento multi-tenant e auditoria completa
 */
export function useStorageLocations(params?: UseStorageLocationsParams) {
  const { 
    searchTerm = "", 
    is_active = undefined,
    limit = 50, 
    page = 1 
  } = params || {};
  
  // 🔐 Validação de acesso obrigatória
  const { hasAccess, accessError } = useTenantAccessGuard();

  // 📊 Query function segura para buscar locais de estoque
  const fetchLocationsQuery = async (supabase: SupabaseClient, tenantId: string) => {
    console.log(`📊 [AUDIT] Buscando locais de estoque para tenant: ${tenantId}`);
    
    // AIDEV-NOTE: Configurar contexto de tenant antes da query
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });
    
    let query = supabase
      .from('storage_locations')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);
    
    // Aplicar filtros
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
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
      console.error('🚨 [ERROR] Falha ao buscar locais de estoque:', error);
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
    
    console.log(`✅ [SUCCESS] ${data?.length || 0} locais de estoque encontrados`);
    
    return {
      locations: data || [],
      totalCount: count || 0
    };
  };

  // 🔍 Query segura usando o template
  const queryKey = searchTerm
    ? ['storage_locations', 'list', searchTerm, is_active, page, limit]
    : ['storage_locations', 'list', is_active, page, limit];
  
  const {
    data,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    queryKey,
    fetchLocationsQuery,
    {
      enabled: hasAccess,
      staleTime: 10 * 60 * 1000, // 10 minutos (locais mudam pouco)
      refetchOnWindowFocus: false
    }
  );
  
  const locations = data?.locations || [];
  const totalCount = data?.totalCount || 0;

  // 🔄 Mutação segura para criar local de estoque
  const createLocationMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, locationData: CreateStorageLocationDTO) => {
      console.log(`📝 [AUDIT] Criando local de estoque para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto de tenant antes da mutation (igual ao useProductCategories)
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: tenantId
      });
      
      const { data, error } = await supabase
        .from('storage_locations')
        .insert({
          ...locationData,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao criar local de estoque:', error);
        throw error;
      }
      
      // AIDEV-NOTE: Validação dupla de segurança - verificar se o dado criado pertence ao tenant correto
      if (data && data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Violação de segurança na criação:', {
          expectedTenant: tenantId,
          returnedTenant: data.tenant_id
        });
        throw new Error('❌ ERRO CRÍTICO: Local de estoque criado com tenant_id incorreto - possível vazamento de segurança!');
      }
      
      console.log(`✅ [SUCCESS] Local de estoque criado com sucesso`);
      return data;
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de locais de estoque');
      },
      invalidateQueries: ['storage_locations']
    }
  );

  // 🔄 Mutação segura para atualizar local de estoque
  const updateLocationMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, { id, ...locationData }: UpdateStorageLocationDTO & { id: string }) => {
      console.log(`📝 [AUDIT] Atualizando local de estoque ${id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: O contexto de tenant já é configurado pelo useSecureTenantMutation
      
      const { data, error } = await supabase
        .from('storage_locations')
        .update({
          ...locationData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao atualizar local de estoque:', error);
        throw error;
      }
      
      console.log(`✅ [SUCCESS] Local de estoque atualizado com sucesso`);
      return data;
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de locais de estoque');
      },
      invalidateQueries: ['storage_locations']
    }
  );

  // 🔄 Mutação segura para deletar local de estoque
  const deleteLocationMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, id: string) => {
      console.log(`🗑️ [AUDIT] Deletando local de estoque ${id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: O contexto de tenant já é configurado pelo useSecureTenantMutation
      
      const { error } = await supabase
        .from('storage_locations')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao deletar local de estoque:', error);
        throw error;
      }
      
      console.log(`✅ [SUCCESS] Local de estoque deletado com sucesso`);
      return { id };
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de locais de estoque');
      },
      invalidateQueries: ['storage_locations']
    }
  );

  // 🔄 Mutação segura para alternar status do local
  const toggleLocationStatusMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, { id, is_active }: { id: string; is_active: boolean }) => {
      console.log(`🔄 [AUDIT] Alternando status do local de estoque ${id} para ${is_active ? 'ativo' : 'inativo'}`);
      
      // AIDEV-NOTE: O contexto de tenant já é configurado pelo useSecureTenantMutation
      
      const { data, error } = await supabase
        .from('storage_locations')
        .update({
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      
      if (error) {
        console.error('🚨 [ERROR] Falha ao alternar status do local de estoque:', error);
        throw error;
      }
      
      console.log(`✅ [SUCCESS] Status do local de estoque alternado com sucesso`);
      return data;
    },
    {
      onSuccess: () => {
        console.log('🔄 [CACHE] Invalidando cache de locais de estoque');
      },
      invalidateQueries: ['storage_locations']
    }
  );

  // Função auxiliar para toggle status
  const toggleLocationStatus = async (id: string, is_active: boolean) => {
    return toggleLocationStatusMutation.mutateAsync({ id, is_active });
  };

  // Funções auxiliares com callbacks
  const createLocationWithCallback = async (
    locationData: CreateStorageLocationDTO,
    callbacks?: {
      onSuccess?: (data: StorageLocation) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    try {
      const result = await createLocationMutation.mutateAsync(locationData);
      callbacks?.onSuccess?.(result);
      return result;
    } catch (error) {
      callbacks?.onError?.(error as Error);
      throw error;
    }
  };

  const updateLocationWithCallback = async (
    id: string,
    locationData: UpdateStorageLocationDTO,
    callbacks?: {
      onSuccess?: (data: StorageLocation) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    try {
      const result = await updateLocationMutation.mutateAsync({ id, ...locationData });
      callbacks?.onSuccess?.(result);
      return result;
    } catch (error) {
      callbacks?.onError?.(error as Error);
      throw error;
    }
  };

  const deleteLocationWithCallback = async (
    id: string,
    callbacks?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    try {
      await deleteLocationMutation.mutateAsync(id);
      callbacks?.onSuccess?.();
    } catch (error) {
      callbacks?.onError?.(error as Error);
      throw error;
    }
  };

  return {
    // Dados
    locations,
    totalCount,
    isLoading,
    error,
    hasAccess,
    accessError,
    
    // Ações (versões com callbacks)
    createLocation: createLocationWithCallback,
    updateLocation: updateLocationWithCallback,
    deleteLocation: deleteLocationWithCallback,
    toggleLocationStatus,
    refetch,
    
    // Estados das mutations
    isCreating: createLocationMutation.isPending,
    isUpdating: updateLocationMutation.isPending,
    isDeleting: deleteLocationMutation.isPending,
    isToggling: toggleLocationStatusMutation.isPending,
  };
}


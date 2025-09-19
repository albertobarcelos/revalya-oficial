/**
 * Template de hook seguro para dados multi-tenant
 * 
 * Este template deve ser usado como base para todos os hooks que fazem queries de dados,
 * garantindo isolamento completo entre tenants e prevenindo vazamento de dados.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useTenantContext } from './useTenantContext';
import { useRequireTenant } from './useTenantGuard';
import { supabase } from '@/lib/supabase';

/**
 * Hook base para queries seguras por tenant
 */
export function useSecureTenantQuery<TData = unknown, TError = Error>(
  queryKey: (string | number)[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  const { tenant } = useTenantContext();
  const { isValidTenant } = useRequireTenant();

  return useQuery({
    queryKey: [queryKey, tenant?.id].flat(),
    queryFn: async () => {
      if (!tenant?.id || !isValidTenant) {
        throw new Error('Tenant não encontrado ou inválido');
      }
      return queryFn();
    },
    enabled: !!tenant?.id && isValidTenant && (options?.enabled !== false),
    ...options
  });
}

/**
 * Hook base para mutations seguras por tenant
 */
export function useSecureTenantMutation<TData = unknown, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  const { tenant } = useTenantContext();
  const { isValidTenant } = useRequireTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      if (!tenant?.id || !isValidTenant) {
        throw new Error('Tenant não encontrado ou inválido');
      }
      return mutationFn(variables);
    },
    onSuccess: (data, variables, context) => {
      // Invalidar queries relacionadas ao tenant atual
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey.includes(tenant?.id);
        }
      });
      
      // Chamar callback personalizado se fornecido
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    ...options
  });
}

/**
 * Utilitário para criar query Supabase com filtro automático de tenant
 */
export function createTenantQuery(tableName: string) {
  return {
    from: (tenant_id: string) => {
      return supabase
        .from(tableName)
        .select('*')
        .eq('tenant_id', tenant_id);
    },
    
    insert: (tenant_id: string, data: any) => {
      return supabase
        .from(tableName)
        .insert({
          ...data,
          tenant_id
        })
        .select()
        .single();
    },
    
    update: (tenant_id: string, id: string, data: any) => {
      return supabase
        .from(tableName)
        .update(data)
        .eq('id', id)
        .eq('tenant_id', tenant_id)
        .select()
        .single();
    },
    
    delete: (tenant_id: string, id: string) => {
      return supabase
        .from(tableName)
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenant_id);
    }
  };
}

/**
 * Hook de exemplo usando o template seguro
 */
export function useSecureContracts() {
  const { tenant } = useTenantContext();
  const contractsQuery = createTenantQuery('contracts');

  // Query segura para listar contratos
  const query = useSecureTenantQuery(
    ['contracts'],
    async () => {
      const { data, error } = await contractsQuery.from(tenant!.id);
      if (error) throw error;
      return data;
    }
  );

  // Mutation segura para criar contrato
  const createMutation = useSecureTenantMutation(
    async (contractData: any) => {
      const { data, error } = await contractsQuery.insert(tenant!.id, contractData);
      if (error) throw error;
      return data;
    }
  );

  return {
    contracts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createContract: createMutation.mutate,
    isCreating: createMutation.isPending,
    refetch: query.refetch
  };
}

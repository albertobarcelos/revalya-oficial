/**
 * Hook para gerenciamento de clientes
 * 
 * Este hook exemplifica o uso da nova arquitetura para um recurso específico (clientes).
 * 
 * @module useCustomers
 */

import { useTenantData, useTenantMutation } from '../../../core/tenant/useTenantData';
import { OperationType } from '../../../core/security/SecurityMiddleware';
import { useSupabase } from '@/hooks/useSupabase';

/**
 * Tipo para cliente
 */
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

/**
 * Dados para criação/atualização de cliente
 */
export interface CustomerData {
  name: string;
  email: string;
  phone?: string;
  status?: 'active' | 'inactive';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

/**
 * Opções para listagem de clientes
 */
export interface CustomerListOptions {
  /** Status para filtrar */
  status?: 'active' | 'inactive';
  
  /** Campo para ordenar */
  orderBy?: keyof Customer;
  
  /** Direção da ordenação */
  orderDirection?: 'asc' | 'desc';
  
  /** Termo de pesquisa */
  searchTerm?: string;
  
  /** Se deve usar cache */
  useCache?: boolean;
}

/**
 * Hook para listagem de clientes
 */
export function useCustomerList(options: CustomerListOptions = {}) {
  const { supabase } = useSupabase();
  const { 
    status,
    orderBy = 'name',
    orderDirection = 'asc',
    searchTerm,
    useCache = true
  } = options;
  
  // Usar o hook genérico useTenantData com a lógica específica para clientes
  return useTenantData<Customer[]>(
    () => {
      // Construir consulta base
      let query = supabase.from('customers').select('*');
      
      // Aplicar filtros
      if (status) {
        query = query.eq('status', status);
      }
      
      // Aplicar pesquisa
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      // Aplicar ordenação
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });
      
      return query;
    },
    {
      resourceName: 'customers',
      cacheKey: `customers_${status || 'all'}_${orderBy}_${orderDirection}_${searchTerm || 'none'}`,
      enableCache: useCache,
      cacheTTL: 300000, // 5 minutos
      applyTenantFilter: true,
      setTenantContext: true,
      logAccess: true,
      operation: OperationType.READ,
      // Dependências para refazer a consulta quando mudarem
      deps: [status, orderBy, orderDirection, searchTerm]
    }
  );
}

/**
 * Hook para obter um cliente específico
 */
export function useCustomer(customerId: string | null) {
  const { supabase } = useSupabase();
  
  return useTenantData<Customer>(
    () => {
      if (!customerId) {
        // Se não tem ID, retornar erro
        throw new Error('ID de cliente não fornecido');
      }
      
      return supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
    },
    {
      resourceName: 'customer',
      cacheKey: `customer_${customerId}`,
      enableCache: true,
      cacheTTL: 300000, // 5 minutos
      deps: [customerId]
    }
  );
}

/**
 * Hook para criar um cliente
 */
export function useCreateCustomer() {
  const { supabase } = useSupabase();
  
  return useTenantMutation<Customer, CustomerData>(
    (data) => supabase.from('customers').insert(data).select('*').single(),
    {
      resourceName: 'customer',
      operation: OperationType.WRITE,
      invalidateKeys: ['customers']
    }
  );
}

/**
 * Hook para atualizar um cliente
 */
export function useUpdateCustomer(customerId: string) {
  const { supabase } = useSupabase();
  
  return useTenantMutation<Customer, CustomerData>(
    (data) => supabase
      .from('customers')
      .update(data)
      .eq('id', customerId)
      .select('*')
      .single(),
    {
      resourceName: 'customer',
      operation: OperationType.UPDATE,
      invalidateKeys: [`customer_${customerId}`, 'customers']
    }
  );
}

/**
 * Hook para excluir um cliente
 */
export function useDeleteCustomer() {
  const { supabase } = useSupabase();
  
  return useTenantMutation<{ success: boolean }, string>(
    (id) => supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .then(() => ({ data: { success: true }, error: null })),
    {
      resourceName: 'customer',
      operation: OperationType.DELETE,
      invalidateKeys: ['customers']
    }
  );
}

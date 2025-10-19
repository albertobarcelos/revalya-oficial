/**
 * Hook Seguro para Gerenciamento de Serviços
 * 
 * AIDEV-NOTE: Implementa todas as 5 camadas de segurança multi-tenant obrigatórias:
 * 1. Validação de acesso via useTenantAccessGuard
 * 2. Consultas seguras via useSecureTenantQuery
 * 3. Query keys padronizadas com tenant_id
 * 4. Validação dupla de dados
 * 5. Logs de auditoria obrigatórios
 * 
 * @module useServices
 */

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard, useSecureTenantQuery, useSecureTenantMutation } from './templates/useSecureTenantQuery';
import { supabase } from '../lib/supabase';

// AIDEV-NOTE: Interface para serviço com tenant_id obrigatório - CORRIGIDA para corresponder à estrutura real da tabela
export interface Service {
  id: string;
  name: string;
  description?: string;
  code?: string;
  default_price: number;
  tax_rate: number;
  tax_code?: string;
  is_active: boolean;
  withholding_tax?: boolean;
  lc_code?: string;
  municipality_code?: string;
  unit_type?: string; // AIDEV-NOTE: Campo para unidade de cobrança (hour, day, monthly, etc.)
  created_at: string;
  updated_at: string;
  tenant_id: string; // 🛡️ OBRIGATÓRIO para segurança multi-tenant
  
  // Campo de compatibilidade com versões antigas
  price?: number;
}

// AIDEV-NOTE: Parâmetros para filtros seguros
export interface ServiceFilters {
  searchTerm?: string;
  is_active?: boolean;
  withholding_tax?: boolean;
  category?: string;
  orderBy?: keyof Service;
  orderDirection?: 'asc' | 'desc';
  useCache?: boolean;
}

// AIDEV-NOTE: Dados para criação/atualização de serviço - CORRIGIDOS para corresponder à estrutura real da tabela
export interface ServiceData {
  name: string;
  description?: string;
  code?: string;
  default_price: number;
  tax_rate: number;
  tax_code?: string;
  is_active?: boolean;
  withholding_tax?: boolean;
  lc_code?: string;
  municipality_code?: string;
  unit_type?: string; // AIDEV-NOTE: Campo para unidade de cobrança (hour, day, monthly, etc.)
}

/**
 * 🔐 Hook Seguro para Gerenciamento de Serviços
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 */
export function useServices(filters: ServiceFilters = {}) {
  const queryClient = useQueryClient();
  
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  // 🔧 INICIALIZAÇÃO PROATIVA DO CONTEXTO DO TENANT
  // AIDEV-NOTE: Garante que o contexto esteja configurado mesmo em navegação direta
  const initializeTenantContext = useCallback(async () => {
    if (!currentTenant?.id) return false;
    
    try {
      console.log(`🔧 [INIT] Inicializando contexto do tenant: ${currentTenant.id}`);
      
      const { data: contextResult, error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant.id
      });
      
      if (contextError) {
        console.warn('⚠️ [INIT] Aviso ao configurar contexto inicial:', contextError);
        return false;
      }
      
      console.log('✅ [INIT] Contexto do tenant inicializado com sucesso');
      return true;
    } catch (error) {
      console.error('🚨 [INIT] Erro na inicialização do contexto:', error);
      return false;
    }
  }, [currentTenant?.id]);

  // 🔄 SINCRONIZAÇÃO AUTOMÁTICA DO CONTEXTO QUANDO TENANT MUDA
  // AIDEV-NOTE: Garante que o contexto do Supabase seja sempre atualizado quando o tenant for alterado
  useEffect(() => {
    if (currentTenant?.id) {
      console.log(`🔄 [SYNC] Tenant alterado, sincronizando contexto: ${currentTenant.id}`);
      initializeTenantContext();
    }
  }, [currentTenant?.id, initializeTenantContext]);

  const {
    searchTerm,
    is_active,
    withholding_tax,
    category,
    orderBy = 'name',
    orderDirection = 'asc',
    useCache = true
  } = filters;

  // 🔍 QUERY SEGURA PARA LISTAR SERVIÇOS
  const {
    data: servicesData,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['services', currentTenant?.id, {
      searchTerm,
      is_active,
      withholding_tax,
      category,
      orderBy,
      orderDirection
    }],
    async (supabase, tenantId) => {
      // 🛡️ AUDIT LOG OBRIGATÓRIO
      console.log(`[AUDIT] Consultando serviços - Tenant: ${tenantId}, Filtros:`, {
        searchTerm, is_active, withholding_tax, category
      });
      
      // 🛡️ USAR FUNÇÃO RPC SEGURA PARA BUSCAR SERVIÇOS
      // AIDEV-NOTE: Usando a função RPC get_services_by_tenant para otimizar consultas
      const { data, error } = await supabase.rpc('get_services_by_tenant', {
        tenant_uuid: tenantId
      });

      if (error) {
        console.error('🚨 [SECURITY] Erro ao consultar serviços via RPC:', error);
        throw new Error(`Erro ao consultar serviços: ${error.message}`);
      }

      // 🛡️ APLICAR FILTROS LOCALMENTE APÓS BUSCA RPC
      let filteredData: Service[] = data || [];

      // Aplicar filtros opcionais
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase().trim();
        filteredData = filteredData.filter((service: Service) => 
          service.name?.toLowerCase().includes(searchTermLower) ||
          service.description?.toLowerCase().includes(searchTermLower)
        );
      }
      
      if (is_active !== undefined) {
        filteredData = filteredData.filter((service: Service) => service.is_active === is_active);
      }
      
      if (withholding_tax !== undefined) {
        if (withholding_tax) {
          filteredData = filteredData.filter((service: Service) => 
            service.withholding_tax && service.withholding_tax > 0
          );
        } else {
          filteredData = filteredData.filter((service: Service) => 
            !service.withholding_tax || service.withholding_tax === 0
          );
        }
      }
      
      if (category) {
        filteredData = filteredData.filter((service: Service) => service.category === category);
      }

      // 🛡️ APLICAR ORDENAÇÃO
      filteredData.sort((a: Service, b: Service) => {
        const aValue = a[orderBy] || '';
        const bValue = b[orderBy] || '';
        
        if (orderDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // 🛡️ VALIDAÇÃO DUPLA DE SEGURANÇA
      const invalidData = filteredData?.filter(item => item.tenant_id !== tenantId);
      if (invalidData?.length > 0) {
        console.error('🚨 [SECURITY] Dados de tenant incorreto detectados:', invalidData);
        throw new Error('Violação de segurança: dados de tenant incorreto detectados');
      }

      console.log(`✅ [AUDIT] Serviços carregados com sucesso - Tenant: ${tenantId}, Total: ${filteredData?.length || 0}`);
      
      return {
        data: filteredData || [],
        total: filteredData?.length || 0,
        page: 1,
        limit: filteredData?.length || 0
      };
    },
    {
      enabled: hasAccess && !!currentTenant?.id,
      staleTime: useCache ? 5 * 60 * 1000 : 0, // 5 minutos se cache habilitado
      cacheTime: useCache ? 10 * 60 * 1000 : 0, // 10 minutos se cache habilitado
    }
  );

  // 🔐 MUTATION SEGURA PARA CRIAR SERVIÇO
  const createServiceMutation = useSecureTenantMutation(
    async (supabase, tenantId, serviceData: ServiceData) => {
      // AIDEV-NOTE: Inicialização proativa do contexto antes de qualquer operação
      await initializeTenantContext();
      
      console.log(`✏️ [AUDIT] Criando serviço para tenant: ${tenantId}`, serviceData);
      
      // AIDEV-NOTE: Usar a mesma função RPC que funciona na edição (set_tenant_context_simple)
      // Garante que o RLS (Row Level Security) funcione corretamente
      const { data: contextResult, error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId
      });
      
      if (contextError) {
        console.error('🚨 [SECURITY] Erro ao configurar contexto do tenant:', contextError);
        // Não falhar por isso, pode ser que a função não exista
      } else {
        console.log('✅ [SECURITY] Contexto do tenant configurado:', contextResult);
      }
      
      const { data, error } = await supabase
        .from('services')
        .insert({
          ...serviceData,
          tenant_id: tenantId // 🛡️ SEMPRE INCLUIR TENANT_ID
        })
        .select();

      if (error) {
        console.error('🚨 [SECURITY] Erro ao criar serviço:', error);
        throw new Error(`Erro ao criar serviço: ${error.message}`);
      }

      // AIDEV-NOTE: Verificação manual para garantir que exatamente um registro foi criado
      if (!data || !Array.isArray(data) || data.length !== 1) {
        console.error('🚨 [SECURITY] Erro: Nenhum serviço foi criado ou múltiplos registros retornados');
        throw new Error('Erro interno: Falha na criação do serviço');
      }

      console.log(`✅ [AUDIT] Serviço criado com sucesso:`, data[0]);
      return data[0] as Service;
    },
    {
      // AIDEV-NOTE: Invalidar todas as queries de services para este tenant (usando predicate)
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'services' && query.queryKey[1] === currentTenant?.id;
          }
        });
      }
    }
  );

  // 🔐 MUTATION SEGURA PARA ATUALIZAR SERVIÇO
  const updateServiceMutation = useSecureTenantMutation(
    async (supabase, tenantId, payload: { id: string; serviceData?: ServiceData } | (Partial<Service> & { id: string })) => {
      // AIDEV-NOTE: Inicialização proativa do contexto antes de qualquer operação
      await initializeTenantContext();
      
      // AIDEV-NOTE: Suporte para ambas as estruturas de dados - nova (com serviceData) e legada (direta)
      let id: string;
      let updates: Partial<ServiceData>;
      
      if ('serviceData' in payload && payload.serviceData) {
        // Nova estrutura: { id, serviceData }
        id = payload.id;
        updates = {
          name: payload.serviceData.name,
          description: payload.serviceData.description,
          code: payload.serviceData.code,
          default_price: payload.serviceData.default_price,
          tax_rate: payload.serviceData.tax_rate,
          tax_code: payload.serviceData.tax_code,
          municipality_code: payload.serviceData.municipality_code,
          lc_code: payload.serviceData.lc_code,
          withholding_tax: payload.serviceData.withholding_tax || false,
          is_active: payload.serviceData.is_active,
        };
      } else {
        // Estrutura legada: dados diretos
        const { id: serviceId, ...directUpdates } = payload;
        id = serviceId;
        updates = directUpdates;
      }
      
      console.log(`✏️ [AUDIT] Atualizando serviço ${id} para tenant: ${tenantId}`, updates);
      
      // AIDEV-NOTE: Configurar contexto do tenant antes da validação
      console.log(`🔍 [DEBUG] Configurando contexto do tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Usar a função set_tenant_context_simple que existe e funciona corretamente
      const { data: contextResult, error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId
      });
      
      if (contextError) {
        console.error('🚨 [SECURITY] Erro ao configurar contexto do tenant:', contextError);
        // Não falhar por isso, pode ser que a função não exista
      } else {
        console.log('✅ [SECURITY] Contexto do tenant configurado:', contextResult);
      }
      
      // AIDEV-NOTE: Remover validação prévia que está causando problemas com RLS
      // O serviço existe no banco, mas a query de validação não consegue encontrá-lo devido às políticas RLS
      // A validação será feita implicitamente na query de update - se não existir, retornará erro
      console.log(`🔍 [DEBUG] Atualizando serviço - ID: ${id}, TenantID: ${tenantId}`);
      
      // AIDEV-NOTE: Agora fazer a atualização com segurança - usar apenas filtro por tenant_id
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO DUPLO DE SEGURANÇA
        .select()
        .single();

      if (error) {
        console.error('🚨 [SECURITY] Erro ao atualizar serviço:', error);
        throw new Error(`Erro ao atualizar serviço: ${error.message}`);
      }

      console.log(`✅ [AUDIT] Serviço atualizado com sucesso:`, data);
      return data as Service;
    },
    {
      // AIDEV-NOTE: Invalidar todas as queries de services para este tenant (usando predicate)
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'services' && query.queryKey[1] === currentTenant?.id;
          }
        });
      }
    }
  );

  // 🔐 MUTATION SEGURA PARA DELETAR SERVIÇO
  const deleteServiceMutation = useSecureTenantMutation(
    async (supabase, tenantId, serviceId: string) => {
      // AIDEV-NOTE: Inicialização proativa do contexto antes de qualquer operação
      await initializeTenantContext();
      
      console.log(`🗑️ [AUDIT] Deletando serviço ${serviceId} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Usar a função set_tenant_context_simple para consistência
      const { data: contextResult, error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId,
        p_user_id: null
      });
      
      if (contextError) {
        console.error('🚨 [SECURITY] Erro ao configurar contexto do tenant:', contextError);
        // Não falhar por isso, pode ser que a função não exista
      } else {
        console.log('✅ [SECURITY] Contexto do tenant configurado:', contextResult);
      }
      
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)
        .eq('tenant_id', tenantId); // 🛡️ FILTRO DUPLO DE SEGURANÇA

      if (error) {
        console.error('🚨 [SECURITY] Erro ao deletar serviço:', error);
        throw new Error(`Erro ao deletar serviço: ${error.message}`);
      }

      console.log(`✅ [AUDIT] Serviço deletado com sucesso: ${serviceId}`);
      return { success: true };
    },
    {
      // AIDEV-NOTE: Invalidar todas as queries de services para este tenant (usando predicate)
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'services' && query.queryKey[1] === currentTenant?.id;
          }
        });
      }
    }
  );

  // 🔍 FUNÇÃO PARA VERIFICAR CÓDIGO DUPLICADO
  const checkDuplicateCode = useCallback(async (code: string, excludeId?: string): Promise<boolean> => {
    if (!currentTenant?.id || !code?.trim()) {
      return false;
    }

    try {
      console.log(`🔍 [AUDIT] Verificando código duplicado: ${code} para tenant: ${currentTenant.id}`);
      
      // AIDEV-NOTE: Configurar contexto do tenant antes da verificação
      const { data: contextResult, error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant.id,
        p_user_id: null
      });
      
      if (contextError) {
        console.error('🚨 [SECURITY] Erro ao configurar contexto do tenant:', contextError);
      }

      let query = supabase
        .from('services')
        .select('id, code')
        .eq('tenant_id', currentTenant.id)
        .eq('code', code.trim())
        .limit(1);

      // AIDEV-NOTE: Excluir o próprio serviço na edição
      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('🚨 [ERROR] Erro ao verificar código duplicado:', error);
        return false; // Em caso de erro, não bloquear
      }

      const isDuplicate = data && data.length > 0;
      console.log(`${isDuplicate ? '⚠️' : '✅'} [AUDIT] Código ${code} ${isDuplicate ? 'já existe' : 'disponível'} para tenant: ${currentTenant.id}`);
      
      return isDuplicate;
    } catch (error) {
      console.error('🚨 [ERROR] Erro na verificação de código duplicado:', error);
      return false; // Em caso de erro, não bloquear
    }
  }, [currentTenant?.id]);

  // 🔄 FUNÇÃO PARA REFRESH MANUAL
  const refresh = useCallback(() => {
    console.log(`🔄 [AUDIT] Refresh manual de serviços para tenant: ${currentTenant?.id}`);
    refetch();
  }, [refetch, currentTenant?.id]);

  // 🗑️ FUNÇÃO HELPER PARA DELETAR SERVIÇO
  const deleteService = useCallback(async (serviceId: string) => {
    if (!currentTenant?.id) {
      throw new Error('Tenant não encontrado');
    }
    return deleteServiceMutation.mutateAsync(serviceId);
  }, [deleteServiceMutation, currentTenant?.id]);

  return {
    // Dados
    services: servicesData?.data || [],
    data: servicesData?.data || [], // Alias para compatibilidade
    
    // Estados
    isLoading,
    error,
    hasAccess,
    accessError,
    
    // Mutations
    createServiceMutation,
    updateServiceMutation,
    deleteServiceMutation,
    
    // Funções helper
    refresh,
    deleteService,
    checkDuplicateCode, // 🔍 Nova função para validação de código duplicado
    
    // Informações do tenant
    currentTenant,
    
    // Metadados da paginação
    total: servicesData?.total || 0,
    page: servicesData?.page || 1,
    limit: servicesData?.limit || 0
  };
}

export default useServices;
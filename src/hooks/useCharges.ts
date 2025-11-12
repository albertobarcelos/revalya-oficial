import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/use-toast'
import { useState, useMemo } from 'react'
import { getCurrentUser } from '@/utils/supabaseAuthManager'

// Tipos para cobranças
export interface Charge {
  id: string
  tenant_id: string
  customer_id: string
  contract_id?: string
  status: 'PENDING' | 'RECEIVED' | 'RECEIVED_IN_CASH' | 'RECEIVED_PIX' | 'RECEIVED_BOLETO' | 'OVERDUE' | 'REFUNDED' | 'CONFIRMED'
  valor: number
  tipo: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'CASH'
  data_vencimento: string
  data_pagamento?: string
  descricao?: string
  asaas_id?: string
  metadata?: any
  created_at: string
  updated_at: string
  customers?: {
    id: string
    name: string
    company?: string
    email?: string
    phone?: string
    cpf_cnpj?: string
  }
  contracts?: {
    id: string
    contract_number: string
    services?: {
      id: string
      description?: string
      service?: {
        id: string
        name: string
        description?: string
      }
    }[]
  }
}

export interface UseChargesParams {
  page?: number
  limit?: number
  status?: string
  search?: string
  type?: string
  customerId?: string
  contractId?: string
  startDate?: string
  endDate?: string
}

/**
 * Hook seguro para gerenciar cobranças com proteção multi-tenant
 * Implementa todas as camadas de segurança obrigatórias
 */
export function useCharges(params: UseChargesParams = {}) {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard()
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)

  // AIDEV-NOTE: Memoizar parâmetros da query para evitar re-execuções desnecessárias
  // Isso garante que a query só seja re-executada quando os parâmetros realmente mudarem
  const memoizedParams = useMemo(() => {
    return {
      page: params.page ?? 1,
      limit: params.limit ?? 1000,
      status: params.status,
      search: params.search,
      type: params.type,
      customerId: params.customerId,
      contractId: params.contractId,
      startDate: params.startDate,
      endDate: params.endDate
    }
  }, [
    params.page,
    params.limit,
    params.status,
    params.search,
    params.type,
    params.customerId,
    params.contractId,
    params.startDate,
    params.endDate
  ])

  // AIDEV-NOTE: Memoizar query key para evitar recriação desnecessária
  const queryKey = useMemo(() => {
    return ['charges', currentTenant?.id, JSON.stringify(memoizedParams)]
  }, [currentTenant?.id, memoizedParams])

  // 🔐 CONSULTA SEGURA COM VALIDAÇÃO MULTI-TENANT
  const query = useSecureTenantQuery(
    queryKey,
    async (supabase, tenantId) => {
      console.log(`🔍 [CHARGES DEBUG] Iniciando busca de cobranças`);
      console.log(`🔍 [CHARGES DEBUG] TenantId recebido: ${tenantId}`);
      console.log(`🔍 [CHARGES DEBUG] CurrentTenant: ${currentTenant?.name} (${currentTenant?.id})`);
      console.log(`🔍 [CHARGES DEBUG] Parâmetros da query:`, memoizedParams);
      console.log(`🔍 [CHARGES DEBUG] HasAccess: ${hasAccess}`);
      console.log(`🔍 [CHARGES DEBUG] AccessError:`, accessError);
      
      // 🚨 VALIDAÇÃO CRÍTICA: Verificar se tenantId corresponde ao currentTenant
      if (tenantId !== currentTenant?.id) {
        console.error('🚨 [SECURITY BREACH] TenantId não corresponde ao currentTenant!', {
          queryTenantId: tenantId,
          currentTenantId: currentTenant?.id,
          currentTenantName: currentTenant?.name
        });
        throw new Error('Violação crítica de segurança: Tenant ID inconsistente');
      }
      
      // AIDEV-NOTE: Usando LEFT JOIN (customers) ao invés de INNER JOIN (!inner) para não excluir charges sem customer válido
      let query = supabase
        .from('charges')
        .select(`
          id,
          status,
          valor,
          tipo,
          data_vencimento,
          data_pagamento,
          descricao,
          asaas_id,
          metadata,
          created_at,
          updated_at,
          customer_id,
          contract_id,
          tenant_id,
          customers(
            id,
            name,
            company,
            email,
            phone,
            cpf_cnpj
          ),
          contracts(
            id,
            contract_number
          )
        `)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO

      // Aplicar filtros adicionais usando memoizedParams
      if (memoizedParams.status) {
        query = query.eq('status', memoizedParams.status)
      }
      if (memoizedParams.type) {
        query = query.eq('tipo', memoizedParams.type)
      }
      if (memoizedParams.customerId) {
        query = query.eq('customer_id', memoizedParams.customerId)
      }
      if (memoizedParams.contractId) {
        query = query.eq('contract_id', memoizedParams.contractId)
      }
      if (memoizedParams.startDate) {
        query = query.gte('data_vencimento', memoizedParams.startDate)
      }
      if (memoizedParams.endDate) {
        query = query.lte('data_vencimento', memoizedParams.endDate)
      }
      if (memoizedParams.search) {
        // AIDEV-NOTE: Busca expandida para incluir dados do cliente (nome, empresa, CPF/CNPJ)
        // PostgREST não suporta conversão de tipo (bigint -> text) para busca em CPF/CNPJ
        // Por isso, sempre usamos a função RPC quando há busca por texto
        // A função RPC faz a conversão corretamente e busca em todos os campos
        
        const searchTerm = memoizedParams.search.trim();
        
        // AIDEV-NOTE: Sempre usar função RPC para busca com texto
        // Isso garante busca correta em CPF/CNPJ (bigint) e evita problemas de URL longa
        console.log(`🔍 [CHARGES DEBUG] Busca por "${searchTerm}": Usando função RPC para busca eficiente (inclui CPF/CNPJ)`);
        
        // AIDEV-NOTE: Configurar contexto de tenant antes de chamar RPC
        await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: tenantId
        });
        
        // AIDEV-NOTE: Usar função RPC para busca eficiente (sempre quando há busca por texto)
        const { data: rpcResult, error: rpcError } = await supabase.rpc('search_charges', {
          p_tenant_id: tenantId,
          p_search_term: searchTerm,
          p_status: memoizedParams.status,
          p_type: memoizedParams.type,
          p_customer_id: memoizedParams.customerId || null,
          p_contract_id: memoizedParams.contractId || null,
          p_start_date: memoizedParams.startDate || null,
          p_end_date: memoizedParams.endDate || null,
          p_page: memoizedParams.page || 1,
          p_limit: memoizedParams.limit || 10
        });
        
        if (rpcError) {
          console.error(`❌ [CHARGES ERROR] Erro na função RPC search_charges:`, rpcError);
          throw rpcError;
        }
        
        // AIDEV-NOTE: Processar resultado da RPC
        const rpcData = rpcResult?.data || [];
        const rpcTotal = rpcResult?.total || 0;
        
        // AIDEV-NOTE: Buscar serviços dos contratos (se necessário)
        const contractIds = rpcData && rpcData.length > 0
          ? [...new Set(rpcData.filter((charge: any) => charge.contract_id).map((charge: any) => charge.contract_id))]
          : [];
        let contractServicesMap: Record<string, any[]> = {};
        
        if (contractIds.length > 0) {
          const { data: servicesData, error: servicesError } = await supabase
            .from('vw_contract_services_detailed')
            .select(`
              contract_id,
              contract_service_id,
              service_description,
              service_id,
              service_name
            `)
            .eq('tenant_id', tenantId)
            .in('contract_id', contractIds);
          
          if (servicesError) {
            console.error('🚨 [ERROR] useCharges - Erro ao buscar serviços na RPC:', servicesError);
          } else {
            contractServicesMap = (servicesData || []).reduce((acc: Record<string, any[]>, service: any) => {
              if (!acc[service.contract_id]) {
                acc[service.contract_id] = [];
              }
              acc[service.contract_id].push({
                id: service.contract_service_id,
                description: service.service_description,
                service: {
                  id: service.service_id,
                  name: service.service_name,
                  description: service.service_description
                }
              });
              return acc;
            }, {} as Record<string, any[]>);
          }
        }
        
        // AIDEV-NOTE: Converter dados da RPC para formato esperado (igual ao processamento normal)
        const enrichedData = rpcData.map((charge: any) => {
          const customers = charge.customers || null;
          const contracts = charge.contracts || null;
          
          return {
            ...charge,
            customers: customers || undefined,
            contracts: contracts ? {
              ...contracts,
              services: contractServicesMap[charge.contract_id!] || []
            } : null
          };
        });
        
        return {
          data: enrichedData,
          total: rpcTotal,
          hasError: false,
          hasCountError: false,
          errorMessage: undefined,
          countErrorMessage: undefined
        };
      }
      
      // AIDEV-NOTE: Se não há busca por texto, continuar com busca normal

      // Paginação
      if (memoizedParams.page && memoizedParams.limit) {
        const from = (memoizedParams.page - 1) * memoizedParams.limit
        const to = from + memoizedParams.limit - 1
        query = query.range(from, to)
      }

      console.log(`🔍 [CHARGES DEBUG] Executando query no Supabase...`);
      console.log(`🔍 [CHARGES DEBUG] Query params:`, JSON.stringify(memoizedParams, null, 2));
      
      // Query para obter o count total (sem paginação)
      // AIDEV-NOTE: Incluindo join com customers para permitir busca por dados do cliente
      // AIDEV-NOTE: Usando LEFT JOIN (customers) ao invés de INNER JOIN para não excluir charges sem customer válido
      let countQuery = supabase
        .from('charges')
        .select('id, customers(name, company, cpf_cnpj)', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      
      // Aplicar os mesmos filtros para o count usando memoizedParams
      if (memoizedParams.status) {
        countQuery = countQuery.eq('status', memoizedParams.status)
      }
      if (memoizedParams.type) {
        countQuery = countQuery.eq('tipo', memoizedParams.type)
      }
      if (memoizedParams.customerId) {
        countQuery = countQuery.eq('customer_id', memoizedParams.customerId)
      }
      if (memoizedParams.contractId) {
        countQuery = countQuery.eq('contract_id', memoizedParams.contractId)
      }
      if (memoizedParams.startDate) {
        countQuery = countQuery.gte('data_vencimento', memoizedParams.startDate)
      }
      if (memoizedParams.endDate) {
        countQuery = countQuery.lte('data_vencimento', memoizedParams.endDate)
      }
      if (memoizedParams.search) {
        // AIDEV-NOTE: Aplicar mesma lógica de busca para o count
        const searchTerm = memoizedParams.search.trim();
        const cleanedSearch = searchTerm.replace(/\D/g, '');
        
        // AIDEV-NOTE: Mesma lógica de busca de customers para o count
        const customerSearchConditions: string[] = [
          `name.ilike.%${searchTerm}%`,
          `company.ilike.%${searchTerm}%`
        ];
        
        if (cleanedSearch && cleanedSearch.length >= 3) {
          customerSearchConditions.push(`cpf_cnpj.ilike.%${cleanedSearch}%`);
        } else if (searchTerm.length >= 2) {
          customerSearchConditions.push(`cpf_cnpj.ilike.%${searchTerm}%`);
        }
        
        // Buscar customers que correspondem (reutilizar a busca anterior se possível)
        const { data: matchingCustomers } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .or(customerSearchConditions.join(','));
        
        const customerIds: string[] = matchingCustomers?.map((c: any) => c.id) || [];
        
        const orConditions: string[] = [
          `descricao.ilike.%${searchTerm}%`,
          `asaas_id.ilike.%${searchTerm}%`
        ];
        
        if (customerIds.length > 0) {
          // PostgREST usa sintaxe: customer_id.in.(id1,id2,id3)
          orConditions.push(`customer_id.in.(${customerIds.join(',')})`);
        }
        
        // AIDEV-NOTE: Aplicar filtro OR apenas se houver condições
        if (orConditions.length > 0) {
          countQuery = countQuery.or(orConditions.join(','));
        }
      }
      
      // Executar ambas as queries
      // AIDEV-NOTE: Ordenar por data_vencimento DESC e depois por created_at DESC
      // Isso mostra primeiro as charges mais recentes e com vencimento mais próximo
      const [{ data, error }, { count, error: countError }] = await Promise.all([
        query.order('data_vencimento', { ascending: false }).order('created_at', { ascending: false }),
        countQuery
      ])

      console.log(`🔍 [CHARGES DEBUG] Resultado da query:`, { 
        dataLength: data?.length, 
        total: count, 
        hasError: !!error, 
        hasCountError: !!countError,
        errorMessage: error?.message,
        countErrorMessage: countError?.message
      });
      
      if (error || countError) {
        const errorToLog = error || countError;
        console.error('❌ [CHARGES ERROR] Erro ao buscar cobranças:', errorToLog);
        console.error('❌ [CHARGES ERROR] Detalhes do erro:', {
          message: errorToLog.message,
          details: errorToLog.details,
          hint: errorToLog.hint,
          code: errorToLog.code,
          tenantId: tenantId,
          params: JSON.stringify(memoizedParams, null, 2)
        });
        
        // AIDEV-NOTE: Se o erro for relacionado a customers, tentar query sem join para debug
        if (errorToLog.message?.includes('customers') || errorToLog.hint?.includes('customers')) {
          console.warn('⚠️ [CHARGES DEBUG] Erro relacionado a customers detectado. Verificando se há charges sem customer válido...');
        }
        
        throw errorToLog
      }

      console.log(`✅ [CHARGES DEBUG] Cobranças encontradas: ${data?.length || 0}`);
      if (data && data.length > 0) {
        // AIDEV-NOTE: Debug detalhado da primeira cobrança para verificar estrutura dos dados
        const firstCharge = data[0];
        // AIDEV-NOTE: Normalizar customers e contracts que podem vir como arrays
        const firstCustomers = Array.isArray(firstCharge.customers) 
          ? (firstCharge.customers.length > 0 ? firstCharge.customers[0] : null)
          : firstCharge.customers
        const firstContracts = Array.isArray(firstCharge.contracts)
          ? (firstCharge.contracts.length > 0 ? firstCharge.contracts[0] : null)
          : firstCharge.contracts
        
        console.log(`🔍 [CHARGES DEBUG] Primeira cobrança completa:`, JSON.stringify(firstCharge, null, 2));
        console.log(`🔍 [CHARGES DEBUG] Estrutura da primeira cobrança:`, {
          id: firstCharge.id,
          valor: firstCharge.valor,
          customer_id: firstCharge.customer_id,
          contract_id: firstCharge.contract_id,
          hasCustomers: !!firstCustomers,
          customersData: firstCustomers,
          customersName: firstCustomers?.name,
          customersCompany: firstCustomers?.company,
          customersCpfCnpj: firstCustomers?.cpf_cnpj,
          hasContracts: !!firstContracts,
          contractsData: firstContracts,
          contractsNumber: firstContracts?.contract_number
        });
      } else {
        console.log(`⚠️ [CHARGES DEBUG] Nenhuma cobrança encontrada para o tenant ${tenantId}`);
      }

      // 🔍 VALIDAÇÃO ADICIONAL: Verificar se todos os dados pertencem ao tenant
      const invalidData = data?.filter(item => item.tenant_id !== tenantId)
      if (invalidData && invalidData.length > 0) {
        console.error('🚨 [SECURITY BREACH] Dados de outro tenant detectados!', invalidData)
        throw new Error('Violação de segurança detectada')
      }

      // AIDEV-NOTE: Buscar serviços dos contratos usando vw_contract_services_detailed
      const contractIds = [...new Set(data?.filter(charge => charge.contract_id).map(charge => charge.contract_id))]
      let contractServicesMap: Record<string, any[]> = {}

      if (contractIds.length > 0) {
        const { data: servicesData, error: servicesError } = await supabase
          .from('vw_contract_services_detailed')
          .select(`
            contract_id,
            contract_service_id,
            service_description,
            service_id,
            service_name
          `)
          .eq('tenant_id', tenantId)
          .in('contract_id', contractIds)

        if (servicesError) {
          console.error('🚨 [ERROR] useCharges - Erro ao buscar serviços:', servicesError)
        } else {
          // Agrupar serviços por contract_id
          contractServicesMap = (servicesData || []).reduce((acc, service) => {
            if (!acc[service.contract_id]) {
              acc[service.contract_id] = []
            }
            acc[service.contract_id].push({
              id: service.contract_service_id,
              description: service.service_description,
              service: {
                id: service.service_id,
                name: service.service_name,
                description: service.service_description
              }
            })
            return acc
          }, {} as Record<string, any[]>)
        }
      }

      // AIDEV-NOTE: Enriquecer dados com serviços dos contratos
      // AIDEV-NOTE: Normalizar customers e contracts que podem vir como arrays do Supabase
      const enrichedData = data?.map(charge => {
        // Normalizar customers (pode ser array ou objeto)
        const customers = Array.isArray(charge.customers) 
          ? (charge.customers.length > 0 ? charge.customers[0] : null)
          : charge.customers
        
        // Normalizar contracts (pode ser array ou objeto)
        const contracts = Array.isArray(charge.contracts)
          ? (charge.contracts.length > 0 ? charge.contracts[0] : null)
          : charge.contracts
        
        return {
          ...charge,
          customers: customers || undefined,
          contracts: contracts ? {
            ...contracts,
            services: contractServicesMap[charge.contract_id!] || []
          } : null
        }
      })

      return {
        data: enrichedData as Charge[],
        total: count || 0
      }
    },
    {
      // AIDEV-NOTE: Configurações otimizadas para evitar queries duplicadas
      staleTime: 30 * 1000, // 30 segundos - dados considerados frescos por mais tempo
      refetchOnWindowFocus: false, // Não refazer query ao focar na janela
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA CANCELAR COBRANÇA
  const cancelCharge = useSecureTenantMutation(
    async (supabase, tenantId, chargeId: string) => {
      console.log(`✏️ [AUDIT] Cancelando cobrança ${chargeId} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto do usuário para auditoria
      const currentUser = await getCurrentUser();
      if (currentUser) {
        await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: tenantId,
          p_user_id: currentUser.id
        });
      }
      
      // 🛡️ VERIFICAÇÃO DUPLA: Confirmar que a cobrança pertence ao tenant
      const { data: existingCharge } = await supabase
        .from('charges')
        .select('tenant_id')
        .eq('id', chargeId)
        .eq('tenant_id', tenantId) // FILTRO CRÍTICO
        .single()

      if (!existingCharge) {
        throw new Error('Cobrança não encontrada ou não pertence ao tenant')
      }

      const { data, error } = await supabase
        .from('charges')
        .update({ 
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', chargeId)
        .eq('tenant_id', tenantId) // FILTRO DUPLO
        .select('*')
        .single()

      if (error) throw error

      // 🔍 VALIDAÇÃO: Confirmar que a cobrança foi atualizada para o tenant correto
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Cobrança atualizada para tenant incorreto!')
        throw new Error('Erro de segurança na atualização')
      }

      return data
    },
    {
      onSuccess: () => {
        console.log('✅ Cobrança cancelada com sucesso')
        toast({
          title: "Sucesso!",
          description: "Cobrança cancelada com sucesso!",
        })
      },
      invalidateQueries: [
        'charges',                    // Lista de cobranças
        'contract_billing_periods',  // Histórico de recebimentos (RecebimentosHistorico)
        'recebimentos'               // Página de recebimentos
      ]
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA MARCAR COMO RECEBIDA
  const markAsReceived = useSecureTenantMutation(
    async (supabase, tenantId, chargeId: string) => {
      console.log(`✏️ [AUDIT] Marcando cobrança ${chargeId} como recebida para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto do usuário para auditoria
      const currentUser = await getCurrentUser();
      if (currentUser) {
        await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: tenantId,
          p_user_id: currentUser.id
        });
      }
      
      // 🛡️ VERIFICAÇÃO DUPLA: Confirmar que a cobrança pertence ao tenant
      const { data: existingCharge } = await supabase
        .from('charges')
        .select('tenant_id')
        .eq('id', chargeId)
        .eq('tenant_id', tenantId) // FILTRO CRÍTICO
        .single()

      if (!existingCharge) {
        throw new Error('Cobrança não encontrada ou não pertence ao tenant')
      }

      const { data, error } = await supabase
        .from('charges')
        .update({ 
          status: 'RECEIVED',
          data_pagamento: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', chargeId)
        .eq('tenant_id', tenantId) // FILTRO DUPLO
        .select('*')
        .single()

      if (error) throw error

      // 🔍 VALIDAÇÃO: Confirmar que a cobrança foi atualizada para o tenant correto
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Cobrança atualizada para tenant incorreto!')
        throw new Error('Erro de segurança na atualização')
      }

      return data
    },
    {
      onSuccess: () => {
        console.log('✅ Cobrança marcada como recebida com sucesso')
        toast({
          title: "Sucesso!",
          description: "Cobrança marcada como recebida!",
        })
      },
      invalidateQueries: ['charges']
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA ATUALIZAR COBRANÇA
  const updateCharge = useSecureTenantMutation(
    async (supabase, tenantId, { id, ...updates }: Partial<Charge> & { id: string }) => {
      console.log(`✏️ [AUDIT] Atualizando cobrança ${id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto do usuário para auditoria
      const currentUser = await getCurrentUser();
      if (currentUser) {
        await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: tenantId,
          p_user_id: currentUser.id
        });
      }
      
      // 🛡️ VERIFICAÇÃO DUPLA: Confirmar que a cobrança pertence ao tenant
      const { data: existingCharge } = await supabase
        .from('charges')
        .select('tenant_id')
        .eq('id', id)
        .eq('tenant_id', tenantId) // FILTRO CRÍTICO
        .single()

      if (!existingCharge) {
        throw new Error('Cobrança não encontrada ou não pertence ao tenant')
      }

      const { data, error } = await supabase
        .from('charges')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId) // FILTRO DUPLO
        .select('*')
        .single()

      if (error) throw error

      // 🔍 VALIDAÇÃO: Confirmar que a cobrança foi atualizada para o tenant correto
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Cobrança atualizada para tenant incorreto!')
        throw new Error('Erro de segurança na atualização')
      }

      return data
    },
    {
      onSuccess: () => {
        console.log('✅ Cobrança atualizada com sucesso')
        toast({
          title: "Sucesso!",
          description: "Cobrança atualizada com sucesso!",
        })
      },
      // AIDEV-NOTE: Invalidar TODAS as queries relacionadas à cobrança para garantir atualização completa
      invalidateQueries: [
        'charges',                    // Lista de cobranças
        'charge-details',            // Detalhes específicos da cobrança
        'payment-history',           // Histórico de pagamentos
        'message-history',           // Histórico de mensagens
        'contract_billing_periods',  // Histórico de recebimentos (RecebimentosHistorico)
        'recebimentos'               // Página de recebimentos
      ]
    }
  )

  // 📊 FUNÇÃO SEGURA PARA EXPORTAR COBRANÇAS PARA CSV
  const exportToCSV = async () => {
    try {
      // AIDEV-NOTE: Aguardar carregamento do tenant se necessário
      // Implementa retry com timeout para evitar condição de corrida
      let retryCount = 0;
      const maxRetries = 10;
      const retryDelay = 200; // 200ms entre tentativas
      
      while (!currentTenant?.id && retryCount < maxRetries) {
        console.log(`🔄 [exportToCSV] Aguardando carregamento do tenant (tentativa ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryCount++;
      }
      
      // Validar se o tenant foi carregado após as tentativas
      if (!currentTenant?.id) {
        console.error('🚨 [exportToCSV] Tenant não definido após aguardar carregamento');
        toast({
          title: "Erro",
          description: "Tenant não carregado. Aguarde um momento e tente novamente.",
          variant: "destructive",
        });
        return;
      }
      
      console.log(`✅ [exportToCSV] Tenant carregado: ${currentTenant.id}`);
      
      // AIDEV-NOTE: Mostrar toast de início da exportação
        toast({
          title: "Exportando...",
          description: "Preparando arquivo CSV das cobranças.",
        });
        
        setIsExporting(true)
        console.log(`📊 [AUDIT] Exportando cobranças para CSV - Tenant: ${currentTenant.name} (${currentTenant.id})`);
      
      // Buscar todas as cobranças do tenant para exportação
      const { data, error } = await supabase
        .from('charges')
        .select(`
          id,
          status,
          valor,
          tipo,
          data_vencimento,
          data_pagamento,
          descricao,
          asaas_id,
          created_at,
          customers(name, company, email),
          contracts(contract_number)
        `)
        .eq('tenant_id', currentTenant.id) // 🛡️ FILTRO OBRIGATÓRIO
        .order('created_at', { ascending: false })

      if (error) throw error

      // 🔍 VALIDAÇÃO: Verificar se todos os dados pertencem ao tenant
      const invalidData = data?.filter(item => !item.customers)
      if (invalidData && invalidData.length > 0) {
        console.error('🚨 [SECURITY] Dados inválidos detectados na exportação!')
        throw new Error('Erro de segurança na exportação')
      }

      // Converter para CSV
      const csvHeaders = 'ID,Status,Valor,Tipo,Vencimento,Pagamento,Descrição,Asaas ID,Cliente,Contrato,Criado em\n'
      const csvRows = data?.map(charge => {
        // AIDEV-NOTE: customers e contracts podem ser arrays do Supabase, tratar como objeto único
        const customers = Array.isArray(charge.customers) ? charge.customers[0] : charge.customers
        const contracts = Array.isArray(charge.contracts) ? charge.contracts[0] : charge.contracts
        const customerName = customers?.name || customers?.company || 'N/A'
        const contractNumber = contracts?.contract_number || 'N/A'
        return [
          charge.id,
          charge.status,
          charge.valor,
          charge.tipo,
          charge.data_vencimento,
          charge.data_pagamento || 'N/A',
          charge.descricao || 'N/A',
          charge.asaas_id || 'N/A',
          customerName,
          contractNumber,
          new Date(charge.created_at).toLocaleDateString('pt-BR')
        ].join(',')
      }).join('\n') || ''

      const csvContent = csvHeaders + csvRows
      
      // Criar e baixar o arquivo CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `cobrancas_${currentTenant.name}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Sucesso!",
        description: "Relatório exportado com sucesso!",
      })
    } catch (error: any) {
      console.error('❌ Erro ao exportar cobranças:', error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao exportar relatório",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return {
    // Dados da query
    data: query.data?.data || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Informações de acesso
    hasAccess,
    accessError,
    currentTenant,
    
    // Mutações
    cancelCharge: cancelCharge.mutate,
    isCancelling: cancelCharge.isPending,
    markAsReceived: markAsReceived.mutate,
    isMarkingAsReceived: markAsReceived.isPending,
    updateCharge: updateCharge.mutate,
    isUpdating: updateCharge.isPending,
    
    // Exportação
    exportToCSV,
    isExporting,
  }
}

import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/use-toast'
import { useState } from 'react'

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
  link_pagamento?: string
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

  // 🔐 CONSULTA SEGURA COM VALIDAÇÃO MULTI-TENANT
  const query = useSecureTenantQuery(
    ['charges', currentTenant?.id, JSON.stringify(params)],
    async (supabase, tenantId) => {
      console.log(`🔍 [CHARGES DEBUG] Iniciando busca de cobranças`);
      console.log(`🔍 [CHARGES DEBUG] TenantId recebido: ${tenantId}`);
      console.log(`🔍 [CHARGES DEBUG] CurrentTenant: ${currentTenant?.name} (${currentTenant?.id})`);
      console.log(`🔍 [CHARGES DEBUG] Parâmetros da query:`, params);
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
          link_pagamento,
          asaas_id,
          metadata,
          created_at,
          updated_at,
          customer_id,
          contract_id,
          tenant_id,
          customers!inner(
            id,
            name,
            company,
            email,
            phone,
            cpf_cnpj
          ),
          contracts(
            id,
            contract_number,
            services:contract_services(
              id,
              description,
              service:services(
                id,
                name,
                description
              )
            )
          )
        `)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO

      // Aplicar filtros adicionais
      if (params.status) {
        query = query.eq('status', params.status)
      }
      if (params.type) {
        query = query.eq('tipo', params.type)
      }
      if (params.customerId) {
        query = query.eq('customer_id', params.customerId)
      }
      if (params.contractId) {
        query = query.eq('contract_id', params.contractId)
      }
      if (params.startDate) {
        query = query.gte('data_vencimento', params.startDate)
      }
      if (params.endDate) {
        query = query.lte('data_vencimento', params.endDate)
      }
      if (params.search) {
        // AIDEV-NOTE: Busca expandida para incluir dados do cliente (nome, empresa, CPF/CNPJ)
        query = query.or(`descricao.ilike.%${params.search}%,asaas_id.ilike.%${params.search}%,customers.name.ilike.%${params.search}%,customers.company.ilike.%${params.search}%,customers.cpf_cnpj.ilike.%${params.search}%`)
      }

      // Paginação
      if (params.page && params.limit) {
        const from = (params.page - 1) * params.limit
        const to = from + params.limit - 1
        query = query.range(from, to)
      }

      console.log(`🔍 [CHARGES DEBUG] Executando query no Supabase...`);
      
      // Query para obter o count total (sem paginação)
      // AIDEV-NOTE: Incluindo join com customers para permitir busca por dados do cliente
      let countQuery = supabase
        .from('charges')
        .select('id, customers!inner(name, company, cpf_cnpj)', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      
      // Aplicar os mesmos filtros para o count
      if (params.status) {
        countQuery = countQuery.eq('status', params.status)
      }
      if (params.type) {
        countQuery = countQuery.eq('tipo', params.type)
      }
      if (params.customerId) {
        countQuery = countQuery.eq('customer_id', params.customerId)
      }
      if (params.contractId) {
        countQuery = countQuery.eq('contract_id', params.contractId)
      }
      if (params.startDate) {
        countQuery = countQuery.gte('data_vencimento', params.startDate)
      }
      if (params.endDate) {
        countQuery = countQuery.lte('data_vencimento', params.endDate)
      }
      if (params.search) {
        // AIDEV-NOTE: Busca expandida para incluir dados do cliente na contagem também
        countQuery = countQuery.or(`descricao.ilike.%${params.search}%,asaas_id.ilike.%${params.search}%,customers.name.ilike.%${params.search}%,customers.company.ilike.%${params.search}%,customers.cpf_cnpj.ilike.%${params.search}%`)
      }
      
      // Executar ambas as queries
      const [{ data, error }, { count, error: countError }] = await Promise.all([
        query.order('created_at', { ascending: false }),
        countQuery
      ])

      console.log(`🔍 [CHARGES DEBUG] Resultado da query:`, { data: data?.length, total: count, error, countError });
      
      if (error || countError) {
        const errorToLog = error || countError;
        console.error('❌ [CHARGES ERROR] Erro ao buscar cobranças:', errorToLog);
        console.error('❌ [CHARGES ERROR] Detalhes do erro:', {
          message: errorToLog.message,
          details: errorToLog.details,
          hint: errorToLog.hint,
          code: errorToLog.code
        });
        throw errorToLog
      }

      console.log(`✅ [CHARGES DEBUG] Cobranças encontradas: ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log(`🔍 [CHARGES DEBUG] Primeiras cobranças:`, data.slice(0, 3));
      } else {
        console.log(`⚠️ [CHARGES DEBUG] Nenhuma cobrança encontrada para o tenant ${tenantId}`);
      }

      // 🔍 VALIDAÇÃO ADICIONAL: Verificar se todos os dados pertencem ao tenant
      const invalidData = data?.filter(item => item.tenant_id !== tenantId)
      if (invalidData && invalidData.length > 0) {
        console.error('🚨 [SECURITY BREACH] Dados de outro tenant detectados!', invalidData)
        throw new Error('Violação de segurança detectada')
      }

      return {
        data: data as Charge[],
        total: count || 0
      }
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA CANCELAR COBRANÇA
  const cancelCharge = useSecureTenantMutation(
    async (supabase, tenantId, chargeId: string) => {
      console.log(`✏️ [AUDIT] Cancelando cobrança ${chargeId} para tenant: ${tenantId}`);
      
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
      invalidateQueries: ['charges']
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA MARCAR COMO RECEBIDA
  const markAsReceived = useSecureTenantMutation(
    async (supabase, tenantId, chargeId: string) => {
      console.log(`✏️ [AUDIT] Marcando cobrança ${chargeId} como recebida para tenant: ${tenantId}`);
      
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
        'charges',           // Lista de cobranças
        'charge-details',    // Detalhes específicos da cobrança
        'payment-history',   // Histórico de pagamentos
        'message-history'    // Histórico de mensagens
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
          customers!inner(name, company, email),
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
        const customerName = charge.customers?.name || charge.customers?.company || 'N/A'
        const contractNumber = charge.contracts?.contract_number || 'N/A'
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

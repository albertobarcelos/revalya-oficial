import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from '@/components/ui/use-toast'
import { throttledAudit } from '@/utils/logThrottle'
import { getCurrentUser } from '@/utils/supabaseAuthManager'
import { Contract, ContractFilters, ContractService } from './types'
import { useContractServices } from './useContractServices'
import * as Sentry from "@sentry/react"

export function useContracts(filters: ContractFilters & { page?: number; limit?: number; search?: string } = {}) {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard()
  const queryClient = useQueryClient()

  // 🔐 CONSULTA SEGURA COM VALIDAÇÃO MULTI-TENANT E PAGINAÇÃO
  // AIDEV-NOTE: Query key separada por parâmetros para garantir que mudanças de página sejam detectadas
  // Isso evita problemas de cache e garante que a query seja refeita quando a página muda
  const queryKey = [
    'contracts', 
    currentTenant?.id, 
    filters.page || 1, 
    filters.limit || 10, 
    filters.status || 'ALL',
    filters.search || ''
  ];
  
  const query = useSecureTenantQuery(
    queryKey,
    async (supabase, tenantId) => {
      throttledAudit('contracts_query', `Buscando contratos para tenant: ${tenantId}`, undefined, 30000); // 30s throttle
      throttledAudit('contracts_current_tenant', `CurrentTenant na query: ${currentTenant?.name} (${currentTenant?.id})`, undefined, 30000); // 30s throttle
      
      // 🚨 VALIDAÇÃO CRÍTICA: Verificar se tenantId corresponde ao currentTenant
      if (tenantId !== currentTenant?.id) {
        console.error('🚨 [SECURITY BREACH] TenantId não corresponde ao currentTenant!', {
          queryTenantId: tenantId,
          currentTenantId: currentTenant?.id,
          currentTenantName: currentTenant?.name
        });
        throw new Error('Violação crítica de segurança: Tenant ID inconsistente');
      }
      
      // 🏗️ APLICAR PAGINAÇÃO
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;
      const search = filters.search;
      let customerIds: string[] = [];
      if (search) {
        // AIDEV-NOTE: Normalizar CNPJ para buscar com ou sem pontuação
        // Remove todos os caracteres não numéricos para criar versão normalizada
        const normalizedSearch = search.replace(/\D/g, '');
        
        // Condições de busca para customers
        const searchConditions = [
          `name.ilike.%${search}%`,
          `company.ilike.%${search}%`
        ];
        
        // AIDEV-NOTE: Buscar CNPJ/CPF normalizado (sem pontuação)
        // Como cpf_cnpj é numérico no banco, usamos busca exata com o número normalizado
        if (normalizedSearch.length >= 11 && normalizedSearch.length <= 14) {
          // Busca exata pelo número normalizado
          const cnpjNumber = parseInt(normalizedSearch, 10);
          if (!isNaN(cnpjNumber)) {
            searchConditions.push(`cpf_cnpj.eq.${cnpjNumber}`);
          }
        }
        
        // AIDEV-NOTE: Se o usuário digitou com pontuação, também busca pelo número normalizado
        // Se o termo original tinha pontuação e foi normalizado, já foi coberto acima
        // Mas também tentamos buscar como string caso o banco tenha algum campo de texto
        // (alguns sistemas mantêm ambos os formatos)
        if (normalizedSearch !== search && normalizedSearch.length >= 11) {
          // Já coberto pela busca numérica acima, mas mantemos para compatibilidade
          const cnpjNumber = parseInt(normalizedSearch, 10);
          if (!isNaN(cnpjNumber)) {
            // A busca numérica já foi adicionada acima, não precisa duplicar
          }
        }
        
        const { data: customersMatches, error: customersError } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .or(searchConditions.join(','));
        if (!customersError) {
          customerIds = (customersMatches || []).map((c: any) => c.id);
        }
      }
      
      // 📊 BUSCAR TOTAL DE REGISTROS PRIMEIRO
      let countSelect = 'id';
      let countQuery = supabase
        .from('contracts')
        .select(countSelect, { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // 🔍 APLICAR FILTRO DE CUSTOMER_ID SE EXISTIR
      if (filters.customer_id) {
        countQuery = countQuery.eq('customer_id', filters.customer_id);
      }

      // 🔍 APLICAR FILTRO DE BUSCA SE EXISTIR
      if (search) {
        const orConditions = [
          `contract_number.ilike.%${search}%`,
          `description.ilike.%${search}%`
        ];
        if (customerIds.length > 0) {
          orConditions.push(`customer_id.in.(${customerIds.join(',')})`);
        }
        countQuery = countQuery.or(orConditions.join(','));
      }

      const { count: total, error: countError } = await countQuery;

      if (countError) {
        console.error('❌ Erro ao buscar total de contratos:', countError)
        throw countError
      }
      
      // 📋 BUSCAR CONTRATOS COM PAGINAÇÃO
      let contractsQuery = supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          status,
          initial_date,
          final_date,
          billing_type,
          billing_day,
          anticipate_weekends,
          reference_period,
          installments,
          total_amount,
          total_discount,
          total_tax,
          stage_id,
          description,
          internal_notes,
          created_at,
          updated_at,
          customer_id,
          billed,
          tenant_id,
          customers!inner(
            id,
            name,
            company,
            email,
            phone,
            cpf_cnpj
          )
        `)
        .eq('tenant_id', tenantId); // 🛡️ FILTRO OBRIGATÓRIO

      // 🔍 APLICAR FILTRO DE CUSTOMER_ID SE EXISTIR
      if (filters.customer_id) {
        contractsQuery = contractsQuery.eq('customer_id', filters.customer_id);
      }

      // 🔍 APLICAR FILTRO DE STATUS SE EXISTIR
      if (filters.status && filters.status !== 'ALL') {
        contractsQuery = contractsQuery.eq('status', filters.status);
      }

      contractsQuery = contractsQuery
        .range(offset, offset + limit - 1) // 📄 APLICAR LIMIT E OFFSET
        .order('created_at', { ascending: false }); // 📅 ORDENAR POR DATA DE CRIAÇÃO

      // 🔍 APLICAR FILTRO DE BUSCA SE EXISTIR
      if (search) {
        const orConditions = [
          `contract_number.ilike.%${search}%`,
          `description.ilike.%${search}%`
        ];
        if (customerIds.length > 0) {
          orConditions.push(`customer_id.in.(${customerIds.join(',')})`);
        }
        contractsQuery = contractsQuery.or(orConditions.join(','));
      }

      const { data, error } = await contractsQuery;

      if (error) {
        console.error('❌ Erro ao buscar contratos:', error)
        throw error
      }

      // AIDEV-NOTE: Logs com throttling para evitar spam no console
      throttledAudit('contracts_found', `Contratos encontrados: ${data?.length || 0}`);
      throttledAudit('contracts_preview', `Primeiros contratos encontrados`, data?.slice(0, 3));

      // 🔍 VALIDAÇÃO ADICIONAL: Verificar se todos os dados pertencem ao tenant
      const invalidData = data?.filter(item => item.tenant_id !== tenantId)
      if (invalidData && invalidData.length > 0) {
        console.error('🚨 [SECURITY BREACH] Dados de outro tenant detectados!', invalidData)
        throw new Error('Violação de segurança detectada')
      }

      // 📊 RETORNAR DADOS COM METADATA DE PAGINAÇÃO
      const totalPages = Math.ceil((total || 0) / limit);
      
      return {
        data: data as any[],
        pagination: {
          page,
          limit,
          total: total || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    },
    {
      // AIDEV-NOTE: Configurações específicas para paginação
      // staleTime: 0 garante que mudanças de página sempre refazem a query
      // Isso resolve o problema de cache retornando dados da página anterior
      staleTime: 0,
      refetchOnWindowFocus: false,
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA CRIAR CONTRATO
  const createContract = useSecureTenantMutation(
    async (supabase, tenantId, contractData: Partial<Contract>) => {
      throttledAudit(`✏️ Criando contrato para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Obter usuário atual para configurar contexto
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id || null;
      
      // AIDEV-NOTE: Configurar contexto com user_id para popular created_by e updated_by
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId,
        p_user_id: userId
      });
      
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          ...contractData,
          tenant_id: tenantId // 🛡️ SEMPRE INCLUIR TENANT_ID
        })
        .select()
        .single()

      if (error) throw error

      // 🔍 VALIDAÇÃO: Confirmar que o contrato foi criado para o tenant correto
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Contrato criado para tenant incorreto!')
        throw new Error('Erro de segurança na criação')
      }

      return data
    },
    {
      onSuccess: () => {
        console.log('✅ Contrato criado com sucesso')
        toast({
          title: "Sucesso!",
          description: "Contrato criado com sucesso!",
        })
      },
      // AIDEV-NOTE: Invalidar cache do kanban de faturamento quando contrato é criado
      // Isso garante que novos contratos apareçam automaticamente no kanban
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA ATUALIZAR CONTRATO
  const updateContract = useSecureTenantMutation(
    async (supabase, tenantId, { id, ...updates }: Partial<Contract> & { id: string }) => {
      throttledAudit(`✏️ Atualizando contrato ${id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Obter usuário atual para configurar contexto
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id || null;
      
      // AIDEV-NOTE: Configurar contexto com user_id para popular updated_by
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId,
        p_user_id: userId
      });
      
      // 🛡️ VERIFICAÇÃO DUPLA: Confirmar que o contrato pertence ao tenant
      const { data: existingContract } = await supabase
        .from('contracts')
        .select('tenant_id')
        .eq('id', id)
        .eq('tenant_id', tenantId) // FILTRO CRÍTICO
        .single()

      if (!existingContract) {
        throw new Error('Contrato não encontrado ou sem permissão')
      }

      const { data, error } = await supabase
        .from('contracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO DUPLO DE SEGURANÇA
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      // AIDEV-NOTE: CORREÇÃO - Removido toast duplicado
      // O toast de sucesso já é exibido em ContractFormActions.tsx
      // Não há necessidade de exibir outro toast aqui
      onSuccess: () => {
        // Toast removido - já exibido em ContractFormActions.tsx
      },
      // AIDEV-NOTE: Invalidar cache do kanban de faturamento quando contrato é atualizado
      // Mudanças no contrato podem afetar sua posição ou dados no kanban
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // 🗑️ MUTAÇÃO SEGURA PARA DELETAR CONTRATO
  const deleteContract = useSecureTenantMutation(
    async (supabase, tenantId, contractId: string) => {
      throttledAudit(`🗑️ Deletando contrato ${contractId} para tenant: ${tenantId}`);
      
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO

      if (error) throw error
      return { success: true }
    },
    {
      onSuccess: () => {
        toast({
          title: "Sucesso!",
          description: "Contrato deletado com sucesso!",
        })
      },
      // AIDEV-NOTE: Invalidar cache do kanban de faturamento quando contrato é deletado
      // Remoção de contratos deve atualizar o kanban imediatamente
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // 🔄 MUTAÇÃO SEGURA PARA ATUALIZAR STATUS DO CONTRATO
  const updateContractStatusMutation = useSecureTenantMutation(
    async (supabase, tenantId, { contractId, newStatus }: { contractId: string; newStatus: string }) => {
      throttledAudit(`🔄 Atualizando status do contrato ${contractId} para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('contracts')
        .update({ status: newStatus })
        .eq('id', contractId)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      onSuccess: () => {
        toast({
          title: "Sucesso!",
          description: "Status do contrato atualizado com sucesso!",
        })
      },
      // AIDEV-NOTE: Invalidar cache do kanban de faturamento quando status do contrato muda
      // Mudanças de status podem mover contratos entre colunas do kanban
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // ⏸️ MUTAÇÃO SEGURA PARA SUSPENDER CONTRATO
  const suspendContractMutation = useSecureTenantMutation(
    async (supabase, tenantId, { contractId, reason }: { contractId: string; reason: string }) => {
      return Sentry.startSpan({ name: 'suspendContractMutation', op: 'mutation.suspend' }, async (span) => {
        throttledAudit(`⏸️ Suspendendo contrato ${contractId} para tenant: ${tenantId}. Motivo: ${reason}`);
        
        try {
          // 1. Configurar contexto para segurança e performance do RLS
          await supabase.rpc('set_tenant_context_simple', { 
            p_tenant_id: tenantId 
          });

          // 2. Buscar notas internas atuais (Otimizado: apenas coluna necessária)
          const { data: currentContract, error: fetchError } = await supabase
            .from('contracts')
            .select('internal_notes')
            .eq('id', contractId)
            .eq('tenant_id', tenantId)
            .single();

          if (fetchError) {
             Sentry.captureException(fetchError);
             throw fetchError;
          }
            
          const currentNotes = currentContract?.internal_notes || '';
          const timestamp = new Date().toLocaleString('pt-BR');
          const newNotes = currentNotes 
            ? `${currentNotes}\n\n[${timestamp}] Suspenso: ${reason}`
            : `[${timestamp}] Suspenso: ${reason}`;

          // 3. Update com validação de tenant
          const { data, error } = await supabase
            .from('contracts')
            .update({ 
              status: 'SUSPENDED',
              internal_notes: newNotes,
              updated_at: new Date().toISOString()
            })
            .eq('id', contractId)
            .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO
            .select()
            .single()

          if (error) {
             Sentry.captureException(error);
             throw error;
          }
          
          span?.setStatus({ code: 1, message: 'ok' }); // STATUS_OK
          return data
        } catch (err) {
          span?.setStatus({ code: 2, message: 'internal_error' }); // STATUS_INTERNAL_ERROR
          throw err;
        }
      });
    },
    {
      onSuccess: () => {
        toast({
          title: "Contrato Suspenso",
          description: "O contrato foi suspenso com sucesso.",
        })
      },
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // ✅ MUTAÇÃO SEGURA PARA ATIVAR CONTRATO
  const activateContractMutation = useSecureTenantMutation(
    async (supabase, tenantId, contractId: string) => {
      return Sentry.startSpan({ name: 'activateContractMutation', op: 'mutation.activate' }, async (span) => {
        throttledAudit(`✅ Ativando contrato ${contractId} para tenant: ${tenantId}`);
        
        try {
          // 1. Configurar contexto
          await supabase.rpc('set_tenant_context_simple', { 
            p_tenant_id: tenantId 
          });

          const { data, error } = await supabase
            .from('contracts')
            .update({ 
              status: 'ACTIVE',
              updated_at: new Date().toISOString()
            })
            .eq('id', contractId)
            .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO
            .select()
            .single()

          if (error) {
             Sentry.captureException(error);
             throw error;
          }
          
          span?.setStatus({ code: 1, message: 'ok' });
          return data
        } catch (err) {
          span?.setStatus({ code: 2, message: 'internal_error' });
          throw err;
        }
      });
    },
    {
      onSuccess: () => {
        toast({
          title: "Contrato Ativado",
          description: "O contrato foi ativado com sucesso!",
        })
      },
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // 🔄 MUTAÇÃO PARA ATUALIZAR SERVIÇO DO CONTRATO
  const updateContractServiceMutation = useSecureTenantMutation(
    async (supabase, tenantId, serviceData: Partial<ContractService> & { id: string }) => {
      throttledAudit(`🔄 Atualizando serviço ${serviceData.id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto RPC antes da operação
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId,
        p_user_id: null
      });
      
      const { data, error } = await supabase
        .from('contract_services')
        .update({
          quantity: serviceData.quantity,
          unit_price: serviceData.unit_price,
          total: serviceData.total,
          // AIDEV-NOTE: Campos financeiros adicionados para resolver PGRST116
          payment_method: serviceData.payment_method,
          card_type: serviceData.card_type,
          billing_type: serviceData.billing_type,
          recurrence_frequency: serviceData.recurrence_frequency,
          installments: serviceData.installments,
          due_type: serviceData.due_type,
          due_value: serviceData.due_value,
          due_next_month: serviceData.due_next_month,
          generate_billing: serviceData.generate_billing,
          // AIDEV-NOTE: Não permitir alteração de tenant_id, contract_id ou service_id por segurança
        })
        .eq('id', serviceData.id)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO
        .select()
        .single()

      if (error) {
        console.error('🚨 [ERROR] Erro ao atualizar serviço:', error);
        throw error;
      }

      // AIDEV-NOTE: Validar dados retornados
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Serviço atualizado com tenant_id incorreto:', data);
        throw new Error('Violação de segurança: tenant_id incorreto no serviço atualizado');
      }

      throttledAudit(`✅ Serviço atualizado com sucesso: ${data.id}`);
      return data;
    },
    {
      onSuccess: () => {
        // AIDEV-NOTE: Invalidação específica por tenant
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'contract-services' && 
                   query.queryKey[1] === currentTenant?.id;
          }
        });
        toast({
          title: "Sucesso!",
          description: "Configurações financeiras atualizadas com sucesso!",
        });
      },
      onError: (error) => {
        console.error('🚨 [MUTATION] Erro na mutação updateContractService:', error);
        toast({
          title: "Erro ao salvar configurações financeiras",
          description: "Não foi possível atualizar as configurações. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  )

  // 🚫 MUTAÇÃO SEGURA PARA CANCELAR CONTRATO
  const cancelContractMutation = useSecureTenantMutation(
    async (supabase, tenantId, { contractId, reason }: { contractId: string; reason: string }) => {
      return Sentry.startSpan({ name: 'cancelContractMutation', op: 'mutation.cancel' }, async (span) => {
        throttledAudit(`🚫 Cancelando contrato ${contractId} para tenant: ${tenantId}. Motivo: ${reason}`);
        
        try {
          // 1. Configurar contexto para segurança e performance do RLS
          await supabase.rpc('set_tenant_context_simple', { 
            p_tenant_id: tenantId 
          });

          // 2. Buscar notas internas atuais (Otimizado: apenas coluna necessária)
          const { data: currentContract, error: fetchError } = await supabase
            .from('contracts')
            .select('internal_notes')
            .eq('id', contractId)
            .eq('tenant_id', tenantId)
            .single();

          if (fetchError) {
             Sentry.captureException(fetchError);
             throw fetchError;
          }
            
          const currentNotes = currentContract?.internal_notes || '';
          const timestamp = new Date().toLocaleString('pt-BR');
          const newNotes = currentNotes 
            ? `${currentNotes}\n\n[${timestamp}] Cancelado: ${reason}`
            : `[${timestamp}] Cancelado: ${reason}`;

          // 3. Update com validação de tenant
          const { data, error } = await supabase
            .from('contracts')
            .update({ 
              status: 'CANCELED',
              internal_notes: newNotes,
              updated_at: new Date().toISOString()
            })
            .eq('id', contractId)
            .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO
            .select()
            .single()

          if (error) {
             Sentry.captureException(error);
             throw error;
          }
          
          span?.setStatus({ code: 1, message: 'ok' }); // STATUS_OK
          return data
        } catch (err) {
          span?.setStatus({ code: 2, message: 'internal_error' }); // STATUS_INTERNAL_ERROR
          throw err;
        }
      });
    },
    {
      onSuccess: () => {
        toast({
          title: "Contrato Cancelado",
          description: "O contrato foi cancelado com sucesso.",
        })
      },
      invalidateQueries: [
        'contracts', 
        'billing_kanban', 
        'billing_periods', 
        'contract_billing_periods'
      ]
    }
  )

  // 🔄 FUNÇÃO PARA FORÇAR ATUALIZAÇÃO
  const refetch = () => {
    return queryClient.invalidateQueries({ queryKey: ['contracts', currentTenant?.id] })
  }

  // AIDEV-NOTE: Criando instância do hook de serviços para compatibilidade
  const contractServicesHook = useContractServices();

  // AIDEV-NOTE: Retornando objetos completos das mutações para permitir uso de mutate e mutateAsync
  return {
    contracts: query.data?.data || [],
    pagination: query.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
    isLoading: query.isLoading,
    error: query.error,
    createContract: createContract, // ✅ Objeto completo da mutação
    isCreating: createContract.isPending,
    updateContract: updateContract, // ✅ Objeto completo da mutação
    isUpdating: updateContract.isPending,
    deleteContract: deleteContract, // ✅ Objeto completo da mutação
    isDeleting: deleteContract.isPending,
    updateContractStatusMutation,
    suspendContractMutation,
    activateContractMutation,
    cancelContractMutation,
    updateContractServiceMutation, // ✅ Nova mutação para atualizar serviços
    // AIDEV-NOTE: Adicionando funções de serviços para compatibilidade com componentes existentes
    addContractService: contractServicesHook.addService,
    addContractServiceMutation: contractServicesHook.addServiceMutation,
    refetch,
    refreshContracts: refetch // Alias para compatibilidade
  }
}

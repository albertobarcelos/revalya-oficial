import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/use-toast'

// Tipos para Customer
export interface Customer {
  id: string
  name: string
  company?: string
  cpf_cnpj?: string | number
  email?: string
  phone?: string
  celular_whatsapp?: string
  active?: boolean
  tenant_id: string
  created_at?: string
  updated_at?: string
  // AIDEV-NOTE: Campos de endereço adicionados para compatibilidade com o banco
  address?: string
  address_number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  additional_info?: any
}

export interface CustomerFilters {
  search?: string
  active?: boolean
}

// AIDEV-NOTE: Interface para parâmetros de paginação do hook useCustomers
interface UseCustomersParams {
  searchTerm?: string;
  page?: number;
  limit?: number;
}

export function useCustomers(params?: UseCustomersParams) {
  const { searchTerm, page = 1, limit = 10 } = params || {};
  const filters: CustomerFilters = { search: searchTerm };
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard()
  const queryClient = useQueryClient()

  // 🔐 CONSULTA SEGURA COM VALIDAÇÃO MULTI-TENANT
  // AIDEV-NOTE: Query key agora inclui parâmetros de paginação para cache correto
  const query = useSecureTenantQuery(
    ['customers', currentTenant?.id, JSON.stringify(filters), page, limit],
    async (supabase, tenantId) => {
      // 🛡️ VALIDAÇÃO DE SEGURANÇA
      if (tenantId !== currentTenant?.id) {
        throw new Error('Tenant ID inconsistente');
      }

      // 🔑 SEGURANÇA MULTI-TENANT: Usando filtros diretos conforme guia de segurança
      // AIDEV-NOTE: Removida dependência de RPC set_tenant_context - usando filtros diretos de tenant_id
      
      let query = supabase
        .from('customers')
        .select('id, name, company, cpf_cnpj, email, phone, celular_whatsapp, created_at, updated_at', { count: 'estimated' })
        .eq('tenant_id', tenantId)

      // Aplicar filtros de busca se fornecidos
      if (filters.search) {
        const cleanedSearch = filters.search.replace(/\D/g, '');
        const orParts = [
          `name.ilike.%${filters.search}%`,
          `company.ilike.%${filters.search}%`,
          `email.ilike.%${filters.search}%`
        ];

        if (cleanedSearch) {
          orParts.push(`cpf_cnpj.eq.${cleanedSearch}`);
        }

        query = query.or(orParts.join(','));
        console.log(`🔍 [DEBUG] Aplicando busca por: "${filters.search}" nos campos: name, company, email, cpf_cnpj (busca exata em cpf_cnpj)`);
      }

      // AIDEV-NOTE: Implementação de paginação dinâmica no servidor
      // Calcula o offset baseado na página atual e limite
      const offset = (page - 1) * limit
      
      const { data, error, count } = await query
        .order('name')
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Erro ao buscar clientes:', error)
        throw error
      }

      console.log(`✅ Clientes carregados: ${data?.length || 0}`);

      // Adicionar active manualmente para compatibilidade
      const customersWithActive = (data || []).map(customer => ({
        ...customer,
        active: true // Valor padrão booleano
      }));

      return {
        customers: customersWithActive,
        totalCount: count || 0
      }
    }
  )

  // 🔍 FUNÇÃO AUXILIAR: Verificar se email já existe no tenant
  const checkEmailExists = async (supabase: any, tenantId: string, email: string): Promise<boolean> => {
    if (!email) return false; // AIDEV-NOTE: Se não há email, não há duplicata
    
    console.log(`🔍 [AUDIT] Verificando email duplicado: ${email} para tenant: ${tenantId}`);
    
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO POR TENANT
      .eq('email', email.toLowerCase()) // AIDEV-NOTE: Comparação case-insensitive
      .limit(1);
    
    if (error) {
      console.error('🚨 [ERROR] Erro ao verificar email duplicado:', error);
      throw new Error('Erro ao verificar email duplicado');
    }
    
    const exists = data && data.length > 0;
    console.log(`🔍 [AUDIT] Email ${email} ${exists ? 'JÁ EXISTE' : 'disponível'} para tenant: ${tenantId}`);
    
    return exists;
  };

  // ✏️ MUTAÇÃO SEGURA PARA CRIAR CLIENTE
  const createCustomer = useSecureTenantMutation(
    async (supabase, tenantId, customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
      console.log(`✏️ [AUDIT] Criando cliente para tenant: ${tenantId}`);
      
      // 🛡️ VALIDAÇÃO PRÉVIA: Verificar email duplicado
      if (customerData.email) {
        const emailExists = await checkEmailExists(supabase, tenantId, customerData.email);
        if (emailExists) {
          console.error(`🚨 [SECURITY] Email duplicado detectado: ${customerData.email} para tenant: ${tenantId}`);
          throw new Error(`Email ${customerData.email} já está cadastrado nesta empresa`);
        }
      }

      // 🔧 SANITIZAÇÃO: Garantir que cpf_cnpj seja salvo sem formatação e como número
      // Isso evita erros de "invalid input syntax for type bigint" quando o valor vem formatado.
      let sanitizedCpfCnpj: number | undefined = undefined;
      if (customerData.cpf_cnpj !== undefined && customerData.cpf_cnpj !== null) {
        if (typeof customerData.cpf_cnpj === 'string') {
          const onlyDigits = customerData.cpf_cnpj.replace(/\D/g, '');
          sanitizedCpfCnpj = onlyDigits ? Number(onlyDigits) : undefined;
        } else if (typeof customerData.cpf_cnpj === 'number') {
          sanitizedCpfCnpj = customerData.cpf_cnpj;
        }
      }
      
      const { data, error } = await supabase
        .from('customers')
        .insert({
          // AIDEV-NOTE: Espalhar dados do cliente, mas sobrescrever cpf_cnpj com valor sanitizado
          ...customerData,
          cpf_cnpj: sanitizedCpfCnpj,
          tenant_id: tenantId // 🛡️ SEMPRE INCLUIR TENANT_ID
        })
        .select()
        .single()

      if (error) {
        // AIDEV-NOTE: Tratamento específico para erro de constraint única
        if (error.code === '23505' && error.message.includes('customers_tenant_id_email_key')) {
          console.error('🚨 [SECURITY] Violação de constraint única detectada:', error);
          throw new Error(`Email ${customerData.email} já está cadastrado nesta empresa`);
        }
        throw error;
      }

      // 🔍 VALIDAÇÃO: Confirmar que o cliente foi criado para o tenant correto
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Cliente criado para tenant incorreto!')
        throw new Error('Erro de segurança na criação')
      }

      return data
    },
    {
      onSuccess: () => {
        console.log('✅ Cliente criado com sucesso')
        toast({
          title: "Sucesso!",
          description: "Cliente criado com sucesso!",
        })
      },
      invalidateQueries: ['customers']
    }
  )

  // ✏️ MUTAÇÃO SEGURA PARA ATUALIZAR CLIENTE
  const updateCustomer = useSecureTenantMutation(
    async (supabase, tenantId, { id, ...updates }: Partial<Customer> & { id: string }) => {
      console.log(`✏️ [AUDIT] Atualizando cliente ${id} para tenant: ${tenantId}`);
      
      // 🛡️ VERIFICAÇÃO DUPLA: Confirmar que o cliente pertence ao tenant
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('tenant_id')
        .eq('id', id)
        .eq('tenant_id', tenantId) // FILTRO CRÍTICO
        .single()

      if (!existingCustomer) {
        throw new Error('Cliente não encontrado ou sem permissão')
      }

      const { data, error } = await supabase
        .from('customers')
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
      onSuccess: () => {
        toast({
          title: "Sucesso!",
          description: "Cliente atualizado com sucesso!",
        })
      },
      invalidateQueries: ['customers']
    }
  )

  // 🗑️ MUTAÇÃO SEGURA PARA DELETAR CLIENTE
  const deleteCustomer = useSecureTenantMutation(
    async (supabase, tenantId, customerId: string) => {
      console.log(`🗑️ [AUDIT] Deletando cliente ${customerId} para tenant: ${tenantId}`);
      
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO OBRIGATÓRIO

      if (error) throw error
      return { success: true }
    },
    {
      onSuccess: () => {
        toast({
          title: "Sucesso!",
          description: "Cliente deletado com sucesso!",
        })
      },
      invalidateQueries: ['customers']
    }
  )

  // 🔄 FUNÇÃO PARA FORÇAR ATUALIZAÇÃO
  const refetch = () => {
    return queryClient.invalidateQueries({ queryKey: ['customers', currentTenant?.id] })
  }

  return {
    customers: query.data?.customers || [],
    totalCount: query.data?.totalCount || 0,
    isLoading: query.isLoading,
    error: query.error,
    createCustomer: createCustomer.mutate,
    createCustomerAsync: createCustomer.mutateAsync, // AIDEV-NOTE: Versão async para uso com await
    isCreating: createCustomer.isPending,
    updateCustomer: updateCustomer.mutate,
    isUpdating: updateCustomer.isPending,
    deleteCustomer: deleteCustomer.mutate,
    isDeleting: deleteCustomer.isPending,
    refetch,
    refreshCustomers: refetch // Alias para compatibilidade
  }
}

import { supabase } from '@/lib/supabase';
import type { Customer } from "@/types/database";
import { asaasService } from "./asaas";
import { mapAsaasCustomerToCustomer } from "@/types/asaas";

interface GetCustomersParams {
  page: number;
  limit: number;
  searchTerm?: string;
}

// Interface para dados do cliente
interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  cpfCnpj?: string;
  postal_code?: string; // AIDEV-NOTE: Campo correto conforme schema da tabela customers
  address?: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string; // AIDEV-NOTE: Campo correto conforme schema da tabela customers
  city?: string;
  state?: string;
  company?: string;
  [key: string]: any; // Para outras propriedades que possam ser adicionadas
}

const clientsService = {
  async getCustomers({ page, limit, searchTerm }: GetCustomersParams, tenantId?: string) {
    try {
      // Validação de tenant_id obrigatória
      if (!tenantId) {
        throw new Error('tenant_id é obrigatório para buscar clientes');
      }

      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId) // Filtro de segurança obrigatório
        .order('name');

      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase().trim();
        query = query.or(
          `name.ilike.%${searchTermLower}%,` +
          `email.ilike.%${searchTermLower}%,` +
          `cpf_cnpj.ilike.%${searchTermLower}%,` +
          `"company".ilike.%${searchTermLower}%`
        );
      }

      // Aplicar paginação
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      
      // Validação dupla de segurança
      const invalidData = data?.filter(item => item.tenant_id !== tenantId);
      if (invalidData?.length > 0) {
        console.error('[SECURITY] Dados de tenant incorreto detectados:', invalidData);
        throw new Error('Violação de segurança: dados de tenant incorreto');
      }
      
      console.log(`[AUDIT] Busca de clientes - Tenant: ${tenantId}, Total: ${count}`);
      
      return {
        data: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      return {
        data: [],
        total: 0
      };
    }
  },

  async syncCustomers(): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'syncCustomers'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro na sincronização de clientes [${response.status}]:`, errorText);
        throw new Error(`Failed to sync customers: ${response.status} - ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Erro ao sincronizar clientes:", error);
      throw error;
    }
  },

  async updateCustomer(
    id: string,
    data: CustomerFormData,
  ): Promise<Customer> {
    try {
      // Buscar o cliente atual para obter o asaas_id e outros dados
      const { data: currentCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar cliente atual:', fetchError);
        throw fetchError;
      }

      if (!currentCustomer) {
        throw new Error('Cliente não encontrado');
      }

      console.log('Cliente atual encontrado:', currentCustomer);
      console.log('CPF/CNPJ atual do cliente:', currentCustomer.cpf_cnpj);
      console.log('CPF/CNPJ no formData:', data.cpfCnpj);

      // Dados que serão atualizados no Supabase
      const updateData: any = {};

      // Separa os dados que vão para o Asaas dos dados que ficam só no Supabase
      const { ...asaasData } = data;

      // Usar o CPF/CNPJ do formData se existir, caso contrário usar o atual
      const cpfCnpjValue = data.cpfCnpj || currentCustomer.cpf_cnpj || '';

      // Mapeamento dos campos do formulário para o banco de dados
      updateData.cpf_cnpj = cpfCnpjValue;
      updateData.address = data.address;
      updateData.postal_code = data.postal_code; // AIDEV-NOTE: Campo correto conforme schema da tabela customers
      updateData.city = data.city;
      updateData.state = data.state;
      updateData.company = data.company;
      updateData.name = data.name;
      updateData.email = data.email;
      updateData.phone = data.phone;
      
      // Adiciona também no objeto que será enviado para o Asaas
      asaasData.cpfCnpj = cpfCnpjValue;

      // Remove cpfCnpj do updateData se existir
      if ('cpfCnpj' in updateData) {
        delete updateData.cpfCnpj;
      }

      console.log('Dados a serem atualizados no Supabase:', updateData);
      console.log('Dados a serem enviados para o Asaas:', asaasData);

      // Se tiver dados para atualizar no Asaas e tiver asaas_id, tenta atualizar no Asaas
      // if (Object.keys(asaasData).length > 0 && currentCustomer.asaas_id) {
      //   try {
      //     await asaasService.updateCustomer(currentCustomer.asaas_id, {
      //       name: data.name,
      //       email: data.email,
      //       phone: data.phone,
      //       cpfCnpj: cpfCnpjValue,
      //       postalCode: data.postalCode,
      //       address: data.address,
      //       addressNumber: data.addressNumber,
      //       complement: data.complement,
      //       province: data.province,
      //       city: data.city ? String(data.city) : undefined,
      //       state: data.state ? String(data.state) : undefined,
      //       company: data.company,
      //     });
      //     console.log(`Cliente ${currentCustomer.name} (${id}) atualizado no Asaas`);
      //   } catch (error) {
      //     // Apenas loga o erro do Asaas, mas continua com a atualização no Supabase
      //     console.error(`Erro ao atualizar cliente ${currentCustomer.name} (${id}) no Asaas:`, error);
      //   }
      // }
      
      // Atualiza no Supabase
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error(`Erro ao atualizar cliente ${id} no Supabase:`, updateError);
        throw updateError;
      }

      console.log(`Cliente ${updatedCustomer.name} (${id}) atualizado com sucesso no Supabase`);
      return updatedCustomer as Customer;
    } catch (error) {
      console.error(`Erro ao atualizar cliente ${id}:`, error);
      throw error;
    }
  },

  async handleWebhook(payload: any): Promise<void> {
    if (!payload) {
      console.error('Payload do webhook vazio ou inválido');
      return;
    }
    
    console.log('Received webhook payload:', payload);
    
    if (payload.event === 'CUSTOMER_UPDATED') {
      await clientsService.syncCustomers();
    }
  },

  getClients: async (tenantId: string) => {
    // Validação de tenant_id obrigatória
    if (!tenantId) {
      throw new Error('tenant_id é obrigatório para buscar clientes');
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId) // Filtro de segurança obrigatório
      .order('name');
      
    if (error) {
      console.error("Erro ao buscar clientes:", error);
      throw error;
    }
    
    // Validação dupla de segurança
    const invalidData = data?.filter(item => item.tenant_id !== tenantId);
    if (invalidData?.length > 0) {
      console.error('[SECURITY] Dados de tenant incorreto detectados:', invalidData);
      throw new Error('Violação de segurança: dados de tenant incorreto');
    }
    
    console.log(`[AUDIT] Lista de clientes - Tenant: ${tenantId}, Total: ${data?.length || 0}`);
    
    return { data };
  },

  getClientsPaginated: async ({ page = 1, limit = 20, search = '', tenantId }: { page?: number; limit?: number; search?: string; tenantId: string }) => {
    try {
      // Validação de tenant_id obrigatória
      if (!tenantId) {
        throw new Error('tenant_id é obrigatório para buscar clientes paginados');
      }

      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId); // Filtro de segurança obrigatório
      
      // Aplicar filtro de pesquisa se houver
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      
      // Ordenar e aplicar paginação
      query = query
        .order('name')
        .range((page - 1) * limit, page * limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Validação dupla de segurança
      const invalidData = data?.filter(item => item.tenant_id !== tenantId);
      if (invalidData?.length > 0) {
        console.error('[SECURITY] Dados de tenant incorreto detectados:', invalidData);
        throw new Error('Violação de segurança: dados de tenant incorreto');
      }
      
      console.log(`[AUDIT] Clientes paginados - Tenant: ${tenantId}, Página: ${page}, Total: ${count}`);
      
      return { 
        data, 
        total: count || 0,
        hasMore: count ? (page * limit) < count : false
      };
    } catch (error) {
      console.error("Erro ao buscar clientes paginados:", error);
      throw error;
    }
  },

  getClientById: async (id: string, tenantId: string) => {
    try {
      // Validação de parâmetros obrigatórios
      if (!id) {
        throw new Error('ID do cliente é obrigatório');
      }
      if (!tenantId) {
        throw new Error('tenant_id é obrigatório para buscar cliente');
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId) // Filtro de segurança obrigatório
        .single();
      
      if (error) throw error;
      
      // Validação dupla de segurança
      if (data && data.tenant_id !== tenantId) {
        console.error('[SECURITY] Tentativa de acesso a cliente de outro tenant:', { id, tenantId, dataTenantId: data.tenant_id });
        throw new Error('Violação de segurança: cliente não pertence ao tenant');
      }
      
      console.log(`[AUDIT] Cliente buscado por ID - Tenant: ${tenantId}, Cliente: ${id}`);
      
      return data;
    } catch (error) {
      console.error(`Erro ao buscar cliente com ID ${id}:`, error);
      return null;
    }
  },

  findClientByName: async (name: string, tenantId: string) => {
    try {
      // Validação de parâmetros obrigatórios
      if (!name) {
        throw new Error('Nome do cliente é obrigatório');
      }
      if (!tenantId) {
        throw new Error('tenant_id é obrigatório para buscar cliente');
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId) // Filtro de segurança obrigatório
        .ilike('name', `%${name}%`)
        .limit(1);
      
      if (error) throw error;
      
      // Validação dupla de segurança
      const invalidData = data?.filter(item => item.tenant_id !== tenantId);
      if (invalidData?.length > 0) {
        console.error('[SECURITY] Dados de tenant incorreto detectados:', invalidData);
        throw new Error('Violação de segurança: dados de tenant incorreto');
      }
      
      console.log(`[AUDIT] Cliente buscado por nome - Tenant: ${tenantId}, Nome: ${name}, Encontrados: ${data?.length || 0}`);
      
      return { data };
    } catch (error) {
      console.error(`Erro ao buscar cliente com nome ${name}:`, error);
      return { data: [] };
    }
  },

  async createClient(data: any): Promise<Customer> {
    console.log('clientsService.createClient - dados recebidos:', data);
    try {
      // Verificar se o usuário está autenticado
      const authResponse = await supabase.auth.getUser();
      console.log('Resposta de autenticação:', authResponse);
      
      if (!authResponse.data.user || !authResponse.data.user.id) {
        const error = new Error('Usuário não autenticado ou ID do usuário não disponível');
        console.error(error);
        throw error;
      }
      
      const userId = authResponse.data.user.id;
      console.log('ID do usuário:', userId);
      
      // Obter id do tenant atual do usuário
      console.log('Buscando tenant para o usuário:', userId);
      const { data: userTenants, error: tenantsError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1);
        
      if (tenantsError) {
        console.error('Erro ao buscar tenant do usuário:', tenantsError);
        throw tenantsError;
      }
      
      console.log('Resultado da busca de tenants:', userTenants);
      
      if (!userTenants || userTenants.length === 0) {
        const error = new Error('Usuário não possui nenhum tenant associado');
        console.error(error);
        throw error;
      }
      
      const currentTenantId = userTenants[0].tenant_id;
      console.log('Tenant ID do usuário (clientsService):', currentTenantId);
    
      // Criar cliente diretamente no banco de dados local sem chamar o Asaas
      const clientData = {
        name: data.name,
        cpf_cnpj: data.cpf_cnpj || data.cpfCnpj,
        email: data.email,
        phone: data.phone, // AIDEV-NOTE: Removido fallback para mobilePhone - campo não existe na tabela
        company: data.company,
        active: true,
        tenant_id: currentTenantId, // Adicionar o tenant_id
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Dados de endereço completos
        address: data.address,
        address_number: data.addressNumber,
        complement: data.complement,
        neighborhood: data.neighborhood, // AIDEV-NOTE: Campo correto conforme schema da tabela customers
        postal_code: data.postal_code, // AIDEV-NOTE: Campo correto conforme schema da tabela customers
        city: data.city,
        state: data.state,
        country: data.country || 'Brasil', // Valor padrão para Brasil
      };
      
      console.log('clientsService - dados para inserção:', clientData);
      
      const { data: newClient, error } = await supabase
        .from('customers')
        .insert(clientData)
        .select()
        .single();

      if (error) {
        console.error('Erro na inserção de cliente (clientsService):', error);
        throw error;
      }

      console.log('Cliente criado com sucesso (clientsService):', newClient);
      return newClient;
    } catch (error) {
      console.error('Erro ao criar cliente (clientsService):', error);
      // Garantir que o erro seja visível no console
      setTimeout(() => {
        console.error('Erro ao criar cliente (clientsService, timeout):', error);
      }, 500);
      throw error;
    }
  }
};

// Exportando o objeto completo para uso direto
export { clientsService };

// Exportando as funções individualmente para manter compatibilidade com código existente
export const syncCustomers = (...args: Parameters<typeof clientsService.syncCustomers>) => 
  clientsService.syncCustomers(...args);

export const handleWebhook = (...args: Parameters<typeof clientsService.handleWebhook>) => 
  clientsService.handleWebhook(...args);

export const updateCustomer = (...args: Parameters<typeof clientsService.updateCustomer>) => 
  clientsService.updateCustomer(...args);

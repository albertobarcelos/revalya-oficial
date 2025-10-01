import { supabase } from '../lib/supabase';
import { Service, CreateServiceDTO } from '../types/services';

/**
 * AIDEV-NOTE: Serviço para gerenciar operações CRUD de serviços
 * Implementa padrões de segurança multi-tenant e auditoria
 * Baseado no padrão do clientsService para consistência
 */

export interface ServiceFormData {
  name: string;
  description?: string;
  code?: string;
  default_price: number;
  cost_price?: number; // AIDEV-NOTE: Preço de custo para cálculo de margem
  tax_rate: number;
  tax_code?: string;
  withholding_tax?: boolean;
  is_active: boolean;
}

class ServicesService {
  /**
   * 🔐 Buscar serviço por ID com validação de tenant
   * @param id - ID do serviço
   * @param tenantId - ID do tenant (OBRIGATÓRIO)
   */
  async getServiceById(id: string, tenantId: string): Promise<Service> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de buscar serviço sem tenant_id');
      throw new Error('tenant_id é obrigatório para buscar serviços');
    }

    console.log(`🔍 [AUDIT] Buscando serviço ${id} para tenant: ${tenantId}`);
    
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
      .single();

    if (error) {
      console.error('🚨 [SECURITY] Erro ao buscar serviço:', error);
      throw new Error(`Erro ao buscar serviço: ${error.message}`);
    }

    if (!data) {
      console.error('🚨 [SECURITY] Serviço não encontrado ou não pertence ao tenant:', { id, tenantId });
      throw new Error('Serviço não encontrado ou acesso negado');
    }

    console.log(`✅ [AUDIT] Serviço ${id} encontrado para tenant: ${tenantId}`);
    return data as Service;
  }

  /**
   * 🔐 Atualizar serviço com validação de tenant_id
   * @param id - ID do serviço
   * @param data - Dados para atualização
   * @param tenantId - ID do tenant (OBRIGATÓRIO)
   */
  async updateService(
    id: string,
    data: ServiceFormData,
    tenantId: string
  ): Promise<Service> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de atualizar serviço sem tenant_id');
      throw new Error('tenant_id é obrigatório para atualizar serviços');
    }

    console.log(`✏️ [AUDIT] Atualizando serviço ${id} para tenant: ${tenantId}`, {
      name: data.name,
      code: data.code,
      price: data.default_price,
      // AIDEV-NOTE: Não logar dados sensíveis completos
    });
    
    // 🛡️ VALIDAÇÃO DUPLA: Verificar se o serviço pertence ao tenant antes de atualizar
    const { data: existingService, error: checkError } = await supabase
      .from('services')
      .select('tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
      .single();
    
    if (checkError || !existingService) {
      console.error('🚨 [SECURITY] Serviço não encontrado ou não pertence ao tenant:', { id, tenantId });
      throw new Error('Serviço não encontrado ou acesso negado');
    }

    // Preparar dados para atualização
    const updateData = {
      name: data.name,
      description: data.description,
      code: data.code,
      default_price: data.default_price,
      cost_price: data.cost_price, // AIDEV-NOTE: Incluindo preço de custo na atualização
      tax_rate: data.tax_rate,
      tax_code: data.tax_code,
      withholding_tax: data.withholding_tax || false,
      is_active: data.is_active,
      tenant_id: tenantId, // 🔑 REGRA DE OURO: SEMPRE MANTER TENANT_ID
      updated_at: new Date().toISOString()
    };

    console.log('Dados a serem atualizados no Supabase:', updateData);

    // Atualizar no Supabase
    const { data: updatedService, error: updateError } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId) // 🔑 DUPLA VALIDAÇÃO NO UPDATE
      .select()
      .single();

    if (updateError) {
      console.error(`🚨 [SECURITY] Erro ao atualizar serviço ${id} no Supabase:`, updateError);
      throw new Error(`Erro ao atualizar serviço: ${updateError.message}`);
    }

    console.log(`✅ [AUDIT] Serviço ${updatedService.name} (${id}) atualizado com sucesso para tenant: ${tenantId}`);
    return updatedService as Service;
  }

  /**
   * 🔐 Listar serviços com validação de tenant
   * @param tenantId - ID do tenant (OBRIGATÓRIO)
   */
  async getServices(tenantId: string): Promise<Service[]> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de listar serviços sem tenant_id');
      throw new Error('tenant_id é obrigatório para listar serviços');
    }

    console.log(`📋 [AUDIT] Listando serviços para tenant: ${tenantId}`);
    
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
      .order('name', { ascending: true });

    if (error) {
      console.error('🚨 [SECURITY] Erro ao listar serviços:', error);
      throw new Error(`Erro ao listar serviços: ${error.message}`);
    }

    console.log(`✅ [AUDIT] ${data?.length || 0} serviços encontrados para tenant: ${tenantId}`);
    return (data || []) as Service[];
  }

  /**
   * 🔐 Criar novo serviço com validação de tenant
   * @param data - Dados do serviço
   * @param tenantId - ID do tenant (OBRIGATÓRIO)
   */
  async createService(
    data: ServiceFormData,
    tenantId: string
  ): Promise<Service> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de criar serviço sem tenant_id');
      throw new Error('tenant_id é obrigatório para criar serviços');
    }

    console.log(`➕ [AUDIT] Criando serviço para tenant: ${tenantId}`, {
      name: data.name,
      code: data.code,
      price: data.default_price,
    });

    const createData = {
      ...data,
      tenant_id: tenantId, // 🔑 REGRA DE OURO: SEMPRE INCLUIR TENANT_ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newService, error } = await supabase
      .from('services')
      .insert(createData)
      .select()
      .single();

    if (error) {
      console.error('🚨 [SECURITY] Erro ao criar serviço:', error);
      throw new Error(`Erro ao criar serviço: ${error.message}`);
    }

    console.log(`✅ [AUDIT] Serviço ${newService.name} criado com sucesso para tenant: ${tenantId}`);
    return newService as Service;
  }

  /**
   * 🔐 Deletar serviço com validação de tenant
   * @param id - ID do serviço
   * @param tenantId - ID do tenant (OBRIGATÓRIO)
   */
  async deleteService(id: string, tenantId: string): Promise<void> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de deletar serviço sem tenant_id');
      throw new Error('tenant_id é obrigatório para deletar serviços');
    }

    console.log(`🗑️ [AUDIT] Deletando serviço ${id} para tenant: ${tenantId}`);
    
    // 🛡️ VALIDAÇÃO DUPLA: Verificar se o serviço pertence ao tenant antes de deletar
    const { data: existingService, error: checkError } = await supabase
      .from('services')
      .select('tenant_id, name')
      .eq('id', id)
      .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
      .single();
    
    if (checkError || !existingService) {
      console.error('🚨 [SECURITY] Serviço não encontrado ou não pertence ao tenant:', { id, tenantId });
      throw new Error('Serviço não encontrado ou acesso negado');
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId); // 🔑 DUPLA VALIDAÇÃO NO DELETE

    if (error) {
      console.error('🚨 [SECURITY] Erro ao deletar serviço:', error);
      throw new Error(`Erro ao deletar serviço: ${error.message}`);
    }

    console.log(`✅ [AUDIT] Serviço ${existingService.name} (${id}) deletado com sucesso para tenant: ${tenantId}`);
  }
}

// Exportar instância única
export const servicesService = new ServicesService();

// Exportar funções individuais para compatibilidade
export const getServiceById = (...args: Parameters<typeof servicesService.getServiceById>) => 
  servicesService.getServiceById(...args);

export const updateService = (...args: Parameters<typeof servicesService.updateService>) => 
  servicesService.updateService(...args);

export const getServices = (...args: Parameters<typeof servicesService.getServices>) => 
  servicesService.getServices(...args);

export const createService = (...args: Parameters<typeof servicesService.createService>) => 
  servicesService.createService(...args);

export const deleteService = (...args: Parameters<typeof servicesService.deleteService>) => 
  servicesService.deleteService(...args);
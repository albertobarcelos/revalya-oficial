/**
 * 🔐 TEMPLATE SERVICE SEGURO MULTI-TENANT
 * 
 * ⚠️ ATENÇÃO: Este service foi atualizado para seguir os padrões de segurança multi-tenant
 * Todas as operações DEVEM incluir tenant_id para garantir isolamento de dados
 * 
 * 🚨 IMPORTANTE: Use preferencialmente os hooks useSecureTenantQuery/useSecureTenantMutation
 * Este service deve ser usado apenas em casos específicos onde os hooks não são aplicáveis
 */

import { supabase } from '@/lib/supabase';
import type { MessageTemplate } from '@/types/settings';

export const templateService = {
  /**
   * 🔐 Buscar templates com validação de tenant_id obrigatória
   * @param tenantId - ID do tenant (OBRIGATÓRIO)
   */
  async getTemplates(tenantId: string): Promise<MessageTemplate[]> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de buscar templates sem tenant_id');
      throw new Error('tenant_id é obrigatório para buscar templates');
    }

    console.log(`🔍 [AUDIT] Buscando templates para tenant: ${tenantId}`);
    
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🚨 [SECURITY] Erro ao buscar templates:', error);
      throw new Error(`Erro ao buscar templates: ${error.message}`);
    }

    // 🛡️ VALIDAÇÃO DUPLA: Verificar se todos os registros pertencem ao tenant
    const invalidRecords = data?.filter(template => template.tenant_id !== tenantId) || [];
    if (invalidRecords.length > 0) {
      console.error('🚨 [SECURITY BREACH] Templates de outros tenants detectados:', invalidRecords);
      throw new Error('Erro de segurança: dados de outros tenants detectados');
    }

    console.log(`✅ [AUDIT] ${data?.length || 0} templates carregados com segurança para tenant: ${tenantId}`);
    return data || [];
  },

  /**
   * 🔐 Criar template com tenant_id obrigatório
   * @param tenantId - ID do tenant (OBRIGATÓRIO)
   * @param template - Dados do template
   */
  async createTemplate(
    tenantId: string, 
    template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>
  ): Promise<MessageTemplate> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de criar template sem tenant_id');
      throw new Error('tenant_id é obrigatório para criar templates');
    }

    console.log(`✏️ [AUDIT] Criando template para tenant: ${tenantId}`, template);
    
    const { data, error } = await supabase
      .from('notification_templates')
      .insert({
        ...template,
        tenant_id: tenantId, // 🔑 REGRA DE OURO: SEMPRE INCLUIR TENANT_ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('🚨 [SECURITY] Erro ao criar template:', error);
      throw new Error(`Erro ao criar template: ${error.message}`);
    }

    // 🛡️ VALIDAÇÃO DUPLA: Verificar se o template criado pertence ao tenant correto
    if (data.tenant_id !== tenantId) {
      console.error('🚨 [SECURITY BREACH] Template criado com tenant_id incorreto:', data);
      throw new Error('Erro de segurança: tenant_id incorreto no template criado');
    }

    console.log(`✅ [AUDIT] Template criado com sucesso para tenant: ${tenantId}`, data);
    return data;
  },

  /**
   * 🔐 Atualizar template com validação de tenant_id
   * @param tenantId - ID do tenant (OBRIGATÓRIO)
   * @param id - ID do template
   * @param template - Dados para atualização
   */
  async updateTemplate(
    tenantId: string,
    id: string, 
    template: Partial<Omit<MessageTemplate, 'id' | 'tenant_id'>>
  ): Promise<MessageTemplate> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de atualizar template sem tenant_id');
      throw new Error('tenant_id é obrigatório para atualizar templates');
    }

    console.log(`✏️ [AUDIT] Atualizando template ${id} para tenant: ${tenantId}`, template);
    
    // 🛡️ VALIDAÇÃO DUPLA: Verificar se o template pertence ao tenant antes de atualizar
    const { data: existingTemplate, error: checkError } = await supabase
      .from('notification_templates')
      .select('tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
      .single();
    
    if (checkError || !existingTemplate) {
      console.error('🚨 [SECURITY] Template não encontrado ou não pertence ao tenant:', { id, tenantId });
      throw new Error('Template não encontrado ou acesso negado');
    }

    const { data, error } = await supabase
      .from('notification_templates')
      .update({
        ...template,
        tenant_id: tenantId, // 🔑 REGRA DE OURO: SEMPRE MANTER TENANT_ID
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId) // 🔑 DUPLA VALIDAÇÃO NO UPDATE
      .select()
      .single();

    if (error) {
      console.error('🚨 [SECURITY] Erro ao atualizar template:', error);
      throw new Error(`Erro ao atualizar template: ${error.message}`);
    }

    console.log(`✅ [AUDIT] Template ${id} atualizado com sucesso para tenant: ${tenantId}`);
    return data;
  },

  /**
   * 🔐 Deletar template com validação de tenant_id
   * @param tenantId - ID do tenant (OBRIGATÓRIO)
   * @param id - ID do template
   */
  async deleteTemplate(tenantId: string, id: string): Promise<void> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de deletar template sem tenant_id');
      throw new Error('tenant_id é obrigatório para deletar templates');
    }

    console.log(`🗑️ [AUDIT] Excluindo template ${id} para tenant: ${tenantId}`);
    
    // 🛡️ VALIDAÇÃO DUPLA: Verificar se o template pertence ao tenant antes de excluir
    const { data: existingTemplate, error: checkError } = await supabase
      .from('notification_templates')
      .select('tenant_id, name')
      .eq('id', id)
      .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
      .single();
    
    if (checkError || !existingTemplate) {
      console.error('🚨 [SECURITY] Template não encontrado ou não pertence ao tenant:', { id, tenantId });
      throw new Error('Template não encontrado ou acesso negado');
    }

    const { error } = await supabase
      .from('notification_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId); // 🔑 DUPLA VALIDAÇÃO NO DELETE

    if (error) {
      console.error('🚨 [SECURITY] Erro ao deletar template:', error);
      throw new Error(`Erro ao deletar template: ${error.message}`);
    }

    console.log(`✅ [AUDIT] Template '${existingTemplate.name}' excluído com sucesso para tenant: ${tenantId}`);
  },
};

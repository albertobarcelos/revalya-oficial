/**
 * 🔐 Hook Seguro para Templates de Notificação
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard, useSecureTenantQuery, useSecureTenantMutation } from './templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import type { SupabaseClient } from '@supabase/supabase-js';

// AIDEV-NOTE: Interface para template de notificação seguro com tenant_id obrigatório
// Atualizada para corresponder à estrutura real da tabela notification_templates
export interface SecureNotificationTemplate {
  id: string;
  tenant_id: string; // 🛡️ OBRIGATÓRIO para segurança multi-tenant
  name: string;
  description?: string;
  category: string;
  message: string;
  active?: boolean;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  days_offset: number;
  is_before_due?: boolean;
  tags: string[];
}

// AIDEV-NOTE: Parâmetros para criação/atualização de template
// Atualizada para refletir campos obrigatórios da tabela notification_templates
interface NotificationTemplateData {
  name: string;                    // 🛡️ OBRIGATÓRIO na tabela
  description?: string;            // ✅ Opcional na tabela
  category: string;                // 🛡️ OBRIGATÓRIO na tabela
  message: string;                 // 🛡️ OBRIGATÓRIO na tabela
  active?: boolean;                // ✅ Opcional (default: true)
  settings?: Record<string, unknown>;  // ✅ Opcional (default: {})
  days_offset: number;             // 🛡️ OBRIGATÓRIO na tabela (default: 0)
  is_before_due?: boolean;         // ✅ Opcional (default: true)
  tags: string[];                  // 🛡️ OBRIGATÓRIO na tabela (default: [])
}

// AIDEV-NOTE: Parâmetros para filtros seguros
interface SecureTemplateFilters {
  category?: string;
  active?: boolean;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

// AIDEV-NOTE: Função para sanitizar dados do template, evitando referências circulares
// Remove propriedades extras que não pertencem à tabela notification_templates
// Inclui validação robusta para campos obrigatórios
function sanitizeTemplateData(templateData: NotificationTemplateData): NotificationTemplateData {
  // 🔍 DEBUG LOG - Verificar dados recebidos
  console.log('🔍 [DEBUG] sanitizeTemplateData - Dados recebidos:', {
    templateData,
    name: templateData?.name,
    nameType: typeof templateData?.name,
    nameLength: templateData?.name?.length,
    trimmedName: templateData?.name?.trim(),
    trimmedLength: templateData?.name?.trim()?.length
  });

  // 🛡️ VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
  if (!templateData.name || templateData.name.trim() === '') {
    console.error('🚨 [DEBUG] Campo name inválido:', {
      name: templateData.name,
      nameType: typeof templateData.name,
      trimmed: templateData.name?.trim(),
      fullData: templateData
    });
    throw new Error('Campo "name" é obrigatório e não pode estar vazio');
  }
  
  if (!templateData.category || templateData.category.trim() === '') {
    throw new Error('Campo "category" é obrigatório e não pode estar vazio');
  }
  
  if (!templateData.message || templateData.message.trim() === '') {
    throw new Error('Campo "message" é obrigatório e não pode estar vazio');
  }
  
  if (typeof templateData.days_offset !== 'number') {
    throw new Error('Campo "days_offset" deve ser um número');
  }
  
  if (!Array.isArray(templateData.tags)) {
    throw new Error('Campo "tags" deve ser um array');
  }

  const sanitizedData = {
    name: templateData.name.trim(),
    description: templateData.description?.trim() || null,
    category: templateData.category.trim(),
    message: templateData.message.trim(),
    active: templateData.active,
    settings: templateData.settings,
    days_offset: templateData.days_offset,
    is_before_due: templateData.is_before_due,
    tags: templateData.tags
  };

  // 🔍 DEBUG LOG - Verificar dados sanitizados
  console.log('✅ [DEBUG] sanitizeTemplateData - Dados sanitizados:', sanitizedData);

  return sanitizedData;
}

/**
 * 🔐 Hook Seguro para Gerenciamento de Templates de Notificação
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 */
export function useSecureNotificationTemplates(filters: SecureTemplateFilters = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  const {
    category,
    active,
    search,
    tags,
    limit = 50,
    offset = 0
  } = filters;

  // 🔍 QUERY SEGURA PARA LISTAR TEMPLATES
  const {
    data: templatesData,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['notification_templates', currentTenant?.id, {
      category,
      active,
      search,
      tags,
      limit,
      offset
    }],
    async (supabase, tenantId) => {
      // 🛡️ CONFIGURAR CONTEXTO DE TENANT ANTES DA CONSULTA
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId 
      });

      // 🛡️ CONSULTA COM FILTRO OBRIGATÓRIO DE TENANT_ID
      let query = supabase
        .from('notification_templates')
        .select('*')
        .eq('tenant_id', tenantId) // 🛡️ FILTRO CRÍTICO
        .order('created_at', { ascending: false });

      // Aplicar filtros opcionais
      if (category) {
        query = query.eq('category', category);
      }
      
      if (active !== undefined) {
        query = query.eq('active', active);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,message.ilike.%${search}%`);
      }

      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags);
      }

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [AUDIT] Erro ao buscar templates:', error);
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA: Verificar se todos os dados pertencem ao tenant correto
      const invalidData = data?.filter(template => template.tenant_id !== tenantId);
      if (invalidData && invalidData.length > 0) {
        console.error('🚨 [SECURITY VIOLATION] Templates de outro tenant detectados:', invalidData);
        throw new Error('Violação de segurança: dados de outro tenant detectados');
      }

      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`✅ [AUDIT] Templates carregados - Tenant: ${currentTenant?.name}, Count: ${data?.length || 0}`);

      return data || [];
    },
    {
      enabled: hasAccess && !!currentTenant?.id
    }
  );

  // 🔐 MUTATION SEGURA PARA CRIAR TEMPLATE - SEMPRE INICIALIZADA
  const createTemplateMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, templateData: NotificationTemplateData) => {
      // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA
      if (!hasAccess || !tenantId) {
        throw new Error('Tenant não definido ou acesso negado');
      }

      // 🔧 SANITIZAR DADOS PARA EVITAR REFERÊNCIAS CIRCULARES
      const sanitizedData = sanitizeTemplateData(templateData);

      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          name: sanitizedData.name,
          description: sanitizedData.description,
          category: sanitizedData.category,
          message: sanitizedData.message,
          tenant_id: tenantId, // 🛡️ INSERIR TENANT_ID OBRIGATÓRIO
          active: sanitizedData.active ?? true,
          days_offset: sanitizedData.days_offset ?? 0, // 🛡️ CAMPO OBRIGATÓRIO
          is_before_due: sanitizedData.is_before_due ?? true, // 🛡️ VALOR PADRÃO
          tags: sanitizedData.tags ?? [], // 🛡️ CAMPO OBRIGATÓRIO
          settings: sanitizedData.settings ?? {} // 🛡️ VALOR PADRÃO
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [AUDIT] Erro ao criar template:', error);
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA: Verificar se o template criado pertence ao tenant correto
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY VIOLATION] Template criado com tenant_id incorreto');
        throw new Error('Erro de segurança na criação do template');
      }

      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`✅ [AUDIT] Template criado - Tenant: ${currentTenant?.name}, Template: ${data.name}`);

      return data;
    },
    {
      onSuccess: () => {
        // Invalidar cache de templates
        queryClient.invalidateQueries({
          queryKey: ['notification_templates', currentTenant?.id]
        });
        
        toast({
          title: "Template criado",
          description: "Template de notificação criado com sucesso.",
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao criar template",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  );

  // 🔐 MUTATION SEGURA PARA ATUALIZAR TEMPLATE - SEMPRE INICIALIZADA
  const updateTemplateMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, { id, ...templateData }: NotificationTemplateData & { id: string }) => {
      // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA
      if (!hasAccess || !tenantId) {
        throw new Error('Tenant não definido ou acesso negado');
      }

      // 🔧 SANITIZAR DADOS PARA EVITAR REFERÊNCIAS CIRCULARES
      const sanitizedData = sanitizeTemplateData(templateData);

      const { data, error } = await supabase
        .from('notification_templates')
        .update({
          name: sanitizedData.name,
          description: sanitizedData.description,
          category: sanitizedData.category,
          message: sanitizedData.message,
          active: sanitizedData.active,
          settings: sanitizedData.settings,
          days_offset: sanitizedData.days_offset,
          is_before_due: sanitizedData.is_before_due,
          tags: sanitizedData.tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO DUPLO DE SEGURANÇA
        .select()
        .single();

      if (error) {
        console.error('❌ [AUDIT] Erro ao atualizar template:', error);
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY VIOLATION] Template atualizado com tenant_id incorreto');
        throw new Error('Erro de segurança na atualização do template');
      }

      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`✅ [AUDIT] Template atualizado - Tenant: ${currentTenant?.name}, Template: ${data.name}`);

      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['notification_templates', currentTenant?.id]
        });
        
        toast({
          title: "Template atualizado",
          description: "Template de notificação atualizado com sucesso.",
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao atualizar template",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  );

  // 🔐 MUTATION SEGURA PARA DELETAR TEMPLATE - SEMPRE INICIALIZADA
  const deleteTemplateMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, templateId: string) => {
      // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA
      if (!hasAccess || !tenantId) {
        throw new Error('Tenant não definido ou acesso negado');
      }

      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', templateId)
        .eq('tenant_id', tenantId); // 🛡️ FILTRO DUPLO DE SEGURANÇA

      if (error) {
        console.error('❌ [AUDIT] Erro ao deletar template:', error);
        throw error;
      }

      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`✅ [AUDIT] Template deletado - Tenant: ${currentTenant.name}, ID: ${templateId}`);

      return templateId;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['notification_templates', currentTenant?.id]
        });
        
        toast({
          title: "Template deletado",
          description: "Template de notificação deletado com sucesso.",
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao deletar template",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  );

  // 🔐 FUNÇÃO SEGURA PARA BUSCAR TEMPLATE POR ID - APENAS SE TIVER ACESSO
  const getTemplate = useCallback(async (templateId: string): Promise<SecureNotificationTemplate | null> => {
    // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA
    if (!hasAccess || !currentTenant?.id) {
      throw new Error('Tenant não definido ou acesso negado');
    }

    // 🛡️ CONFIGURAR CONTEXTO DE TENANT
    await supabase.rpc('set_tenant_context_simple', { 
      p_tenant_id: currentTenant.id 
    });

    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', currentTenant.id) // 🛡️ FILTRO CRÍTICO
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Template não encontrado
      }
      console.error('❌ [AUDIT] Erro ao buscar template:', error);
      throw error;
    }

    // 🛡️ VALIDAÇÃO DUPLA
    if (data.tenant_id !== currentTenant.id) {
      console.error('🚨 [SECURITY VIOLATION] Template de outro tenant acessado');
      throw new Error('Violação de segurança: template de outro tenant');
    }

    // 🔍 AUDIT LOG OBRIGATÓRIO
    console.log(`✅ [AUDIT] Template acessado - Tenant: ${currentTenant.name}, Template: ${data.name}`);

    return data;
  }, [hasAccess, currentTenant?.id, currentTenant?.name]);

  // 🛡️ GUARD CLAUSE OBRIGATÓRIO
  if (!hasAccess) {
    return {
      templates: [],
      isLoading: false,
      error: new Error(accessError || 'Acesso negado'),
      refetch: () => Promise.resolve(),
      createTemplate: () => Promise.reject(new Error('Acesso negado')),
      updateTemplate: () => Promise.reject(new Error('Acesso negado')),
      deleteTemplate: () => Promise.reject(new Error('Acesso negado')),
      getTemplate: () => Promise.reject(new Error('Acesso negado')),
      isCreating: false,
      isUpdating: false,
      isDeleting: false
    };
  }

  return {
    // Dados
    templates: templatesData || [],
    isLoading,
    error,
    
    // Ações
    refetch,
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    getTemplate,
    
    // Estados das mutations
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending
  };
}
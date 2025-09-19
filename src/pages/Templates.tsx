import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { templateService } from '@/services/templateService';
import { TemplateDialog } from '@/components/templates/TemplateDialog';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplateSearch } from '@/components/templates/TemplateSearch';
import { Plus, Search, Filter, Copy, Edit, Trash2 } from 'lucide-react';
import type { MessageTemplate } from '@/types/template';
import { AVAILABLE_TAGS } from '@/types/settings';
// 🔐 IMPORTS DE SEGURANÇA MULTI-TENANT OBRIGATÓRIOS
import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
// 🏗️ IMPORT DO LAYOUT PRINCIPAL
import { Layout } from '@/components/layout/Layout';

// Skeleton para card de template
const TemplateCardSkeleton = () => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton height={20} width="80%" />
            <Skeleton height={14} width="60%" />
          </div>
          <div className="flex gap-2">
            <Skeleton circle height={32} width={32} />
            <Skeleton circle height={32} width={32} />
            <Skeleton circle height={32} width={32} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton height={12} width="30%" />
          <div className="space-y-1">
            <Skeleton height={14} width="100%" />
            <Skeleton height={14} width="90%" />
            <Skeleton height={14} width="70%" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Skeleton height={20} width={60} />
          <Skeleton height={20} width={80} />
          <Skeleton height={20} width={50} />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton height={16} width={80} />
          <Skeleton height={20} width={60} />
        </div>
      </CardContent>
    </Card>
  );
};

export default function Templates() {
  // 🔐 VALIDAÇÃO DE ACESSO MULTI-TENANT OBRIGATÓRIA
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  // ✅ REMOÇÃO DO useState ANTIGO - Agora usando dados do useSecureTenantQuery
  // const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  // const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const { toast } = useToast();
  
  // 🚨 GUARD CLAUSE: Bloquear acesso se tenant inválido
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">🚨 Acesso Negado</CardTitle>
            <CardDescription>
              {accessError || 'Você não tem permissão para acessar esta página.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  // 🔍 LOG DE AUDITORIA: Acesso à página de templates
  console.log(`📋 [AUDIT] Acesso à página Templates - Tenant: ${currentTenant?.name} (${currentTenant?.id})`);

  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    message: "",
    category: "cobranca",
    days_offset: 0,
    is_before_due: true,
    active: true,
    tags: [] as string[],
  });

  // ✅ REMOÇÃO DO useEffect ANTIGO - Agora usando useSecureTenantQuery
  // O carregamento de templates é feito automaticamente pelo hook seguro

  // 🔐 CONSULTA SEGURA DE TEMPLATES COM TENANT_ID
  const {
    data: templates = [],
    isLoading: loading,
    error: templatesError,
    refetch: refetchTemplates
  } = useSecureTenantQuery(
    ['templates'], // Query key base
    async (supabase, tenantId) => {
      console.log(`🔍 [AUDIT] Carregando templates para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('🚨 [SECURITY] Erro ao carregar templates:', error);
        throw new Error(`Erro ao carregar templates: ${error.message}`);
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
    {
      enabled: !!currentTenant?.id,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false
    }
  );
  
  // 🚨 TRATAMENTO DE ERRO DE CONSULTA
  useEffect(() => {
    if (templatesError) {
      console.error('🚨 [SECURITY] Erro na consulta de templates:', templatesError);
      toast({
        title: "Erro de Segurança",
        description: "Não foi possível carregar os templates com segurança",
        variant: "destructive",
      });
    }
  }, [templatesError, toast]);

  // 🔐 MUTAÇÃO SEGURA PARA CRIAÇÃO DE TEMPLATES
  const createTemplateMutation = useSecureTenantMutation(
    async (supabase, tenantId, templateData: any) => {
      console.log(`✏️ [AUDIT] Criando template para tenant: ${tenantId}`, templateData);
      
      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          ...templateData,
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
    {
      onSuccess: () => {
        toast({
          title: "Template criado",
          description: "Template criado com sucesso!",
        });
        resetForm();
        refetchTemplates(); // Recarregar lista
      },
      onError: (error) => {
        console.error('🚨 [SECURITY] Erro na criação de template:', error);
        toast({
          title: "Erro de Segurança",
          description: "Não foi possível criar o template com segurança",
          variant: "destructive",
        });
      },
      invalidateQueries: ['templates']
    }
  );
  
  const handleCreate = async () => {
    createTemplateMutation.mutate(formData);
  };

  // 🔐 MUTAÇÃO SEGURA PARA EDIÇÃO DE TEMPLATES
  const updateTemplateMutation = useSecureTenantMutation(
    async (supabase, tenantId, { templateId, templateData }: { templateId: string, templateData: any }) => {
      console.log(`✏️ [AUDIT] Atualizando template ${templateId} para tenant: ${tenantId}`, templateData);
      
      // 🛡️ VALIDAÇÃO DUPLA: Verificar se o template pertence ao tenant antes de atualizar
      const { data: existingTemplate, error: checkError } = await supabase
        .from('notification_templates')
        .select('tenant_id')
        .eq('id', templateId)
        .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
        .single();
      
      if (checkError || !existingTemplate) {
        console.error('🚨 [SECURITY] Template não encontrado ou não pertence ao tenant:', { templateId, tenantId });
        throw new Error('Template não encontrado ou acesso negado');
      }
      
      const { data, error } = await supabase
        .from('notification_templates')
        .update({
          ...templateData,
          tenant_id: tenantId, // 🔑 REGRA DE OURO: SEMPRE MANTER TENANT_ID
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .eq('tenant_id', tenantId) // 🔑 DUPLA VALIDAÇÃO NO UPDATE
        .select()
        .single();
      
      if (error) {
        console.error('🚨 [SECURITY] Erro ao atualizar template:', error);
        throw new Error(`Erro ao atualizar template: ${error.message}`);
      }
      
      console.log(`✅ [AUDIT] Template ${templateId} atualizado com sucesso para tenant: ${tenantId}`);
      return data;
    },
    {
      onSuccess: () => {
        toast({
          title: "Template atualizado",
          description: "Template atualizado com sucesso!",
        });
        setIsDialogOpen(false);
        setEditingTemplate(null);
        resetForm();
        refetchTemplates();
      },
      onError: (error) => {
        console.error('🚨 [SECURITY] Erro na atualização de template:', error);
        toast({
          title: "Erro de Segurança",
          description: "Não foi possível atualizar o template com segurança",
          variant: "destructive",
        });
      },
      invalidateQueries: ['templates']
    }
  );
  
  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      message: template.message,
      category: template.category,
      days_offset: template.days_offset,
      is_before_due: template.is_before_due,
      active: template.active,
      tags: template.tags || [],
    });
    setIsDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;
    updateTemplateMutation.mutate({
      templateId: editingTemplate.id,
      templateData: {
        ...formData,
        tags: extractTags(formData.message),
      }
    });
  };

  // 🔐 MUTAÇÃO SEGURA PARA EXCLUSÃO DE TEMPLATES
  const deleteTemplateMutation = useSecureTenantMutation(
    async (supabase, tenantId, templateId: string) => {
      console.log(`🗑️ [AUDIT] Excluindo template ${templateId} para tenant: ${tenantId}`);
      
      // 🛡️ VALIDAÇÃO DUPLA: Verificar se o template pertence ao tenant antes de excluir
      const { data: existingTemplate, error: checkError } = await supabase
        .from('notification_templates')
        .select('tenant_id, name')
        .eq('id', templateId)
        .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
        .single();
      
      if (checkError || !existingTemplate) {
        console.error('🚨 [SECURITY] Template não encontrado ou não pertence ao tenant:', { templateId, tenantId });
        throw new Error('Template não encontrado ou acesso negado');
      }
      
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', templateId)
        .eq('tenant_id', tenantId); // 🔑 DUPLA VALIDAÇÃO NO DELETE
      
      if (error) {
        console.error('🚨 [SECURITY] Erro ao excluir template:', error);
        throw new Error(`Erro ao excluir template: ${error.message}`);
      }
      
      console.log(`✅ [AUDIT] Template '${existingTemplate.name}' excluído com sucesso para tenant: ${tenantId}`);
      return templateId;
    },
    {
      onSuccess: () => {
        toast({
          title: "Template excluído",
          description: "Template excluído com sucesso!",
        });
        refetchTemplates();
      },
      onError: (error) => {
        console.error('🚨 [SECURITY] Erro na exclusão de template:', error);
        toast({
          title: "Erro de Segurança",
          description: "Não foi possível excluir o template com segurança",
          variant: "destructive",
        });
      },
      invalidateQueries: ['templates']
    }
  );
  
  // 🔐 MUTAÇÃO SEGURA PARA CÓPIA DE TEMPLATES
  const copyTemplateMutation = useSecureTenantMutation(
    async (supabase, tenantId, template: MessageTemplate) => {
      console.log(`📋 [AUDIT] Copiando template ${template.id} para tenant: ${tenantId}`);
      
      // 🛡️ VALIDAÇÃO DUPLA: Verificar se o template original pertence ao tenant
      if (template.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY] Tentativa de copiar template de outro tenant:', { templateId: template.id, originalTenant: template.tenant_id, currentTenant: tenantId });
        throw new Error('Não é possível copiar template de outro tenant');
      }
      
      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          name: `${template.name} (Cópia)`,
          message: template.message,
          category: template.category,
          tags: template.tags,
          tenant_id: tenantId, // 🔑 REGRA DE OURO: SEMPRE INCLUIR TENANT_ID
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('🚨 [SECURITY] Erro ao copiar template:', error);
        throw new Error(`Erro ao copiar template: ${error.message}`);
      }
      
      console.log(`✅ [AUDIT] Template '${template.name}' copiado com sucesso para tenant: ${tenantId}`);
      return data;
    },
    {
      onSuccess: () => {
        toast({
          title: "Template copiado",
          description: "Template copiado com sucesso!",
        });
        refetchTemplates();
      },
      onError: (error) => {
        console.error('🚨 [SECURITY] Erro na cópia de template:', error);
        toast({
          title: "Erro de Segurança",
          description: "Não foi possível copiar o template com segurança",
          variant: "destructive",
        });
      },
      invalidateQueries: ['templates']
    }
  );

  const handleDelete = async (templateId: string) => {
    deleteTemplateMutation.mutate(templateId);
  };

  const handleCopy = (template: MessageTemplate) => {
    copyTemplateMutation.mutate(template);
  };

  const extractTags = (message: string): string[] => {
    const tags = Object.values(AVAILABLE_TAGS);
    return tags.filter(tag => message.includes(tag));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      message: "",
      category: "cobranca",
      days_offset: 0,
      is_before_due: true,
      active: true,
      tags: [],
    });
    setSelectedTemplate(null);
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Templates de Mensagem</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Template
              </Button>
            </DialogTrigger>
            <TemplateDialog
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              loading={loading}
              selectedTemplate={selectedTemplate}
              formData={formData}
              setFormData={setFormData}
              handleCreate={handleCreate}
              handleUpdate={handleUpdate}
              resetForm={resetForm}
            />
          </Dialog>
        </div>

        <TemplateSearch
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <TemplateCardSkeleton />
              <TemplateCardSkeleton />
              <TemplateCardSkeleton />
              <TemplateCardSkeleton />
              <TemplateCardSkeleton />
              <TemplateCardSkeleton />
            </>
          ) : filteredTemplates.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum template encontrado.
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onCopy={handleCopy}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

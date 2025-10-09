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
import { useSecureNotificationTemplates } from '@/hooks/useSecureNotificationTemplates';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';
import { motion } from 'framer-motion';
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
  // 🛡️ TODOS OS HOOKS DEVEM VIR PRIMEIRO - Regras do React
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const { toast } = useToast();
  // AIDEV-NOTE: Estado do formulário alinhado com schema da tabela notification_templates
  const [formData, setFormData] = useState({
    name: "",                    // Campo obrigatório - string vazia para input
    description: "",             // Campo opcional - string vazia para manter input controlado
    message: "",                 // Campo obrigatório - string vazia para input
    category: "cobranca",        // Campo obrigatório - valor padrão válido
    days_offset: 0,              // Campo obrigatório - corresponde ao padrão da tabela (0)
    is_before_due: true,         // Campo opcional - corresponde ao padrão da tabela (true)
    active: true,                // Campo opcional - corresponde ao padrão da tabela (true)
    tags: [] as string[],        // Campo obrigatório - array vazio corresponde ao padrão da tabela
    settings: {} as Record<string, Record<string, unknown>>, // Campo opcional - objeto vazio corresponde ao padrão da tabela
  });

  // 🛡️ HOOK SEGURO PARA TEMPLATES - Implementa todas as 5 camadas de segurança
  const {
    templates,
    isLoading: loading,
    error: templatesError,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: refetchTemplates
  } = useSecureNotificationTemplates();
  
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

  // 🚨 EARLY RETURN OBRIGATÓRIO - Não renderizar sem acesso
  if (!hasAccess) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="text-red-600 text-lg font-semibold">
              🚨 Acesso Negado
            </div>
            <div className="text-gray-600">
              {accessError || 'Você não tem permissão para acessar esta página'}
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // 🔍 AUDIT LOG OBRIGATÓRIO - Rastreamento de acesso
  console.log(`[AUDIT] Acessando Templates - Tenant: ${currentTenant?.name} (${currentTenant?.id})`);

  const handleCreate = async () => {
    try {
      // 🔍 DEBUG LOG - Verificar dados do formulário antes de enviar
      console.log('🔍 [DEBUG] handleCreate - Dados do formulário:', {
        formData,
        name: formData.name,
        nameType: typeof formData.name,
        nameLength: formData.name?.length,
        extractedTags: extractTags(formData.message)
      });

      const dataToSend = {
        ...formData,
        tags: extractTags(formData.message),
      };

      console.log('🔍 [DEBUG] handleCreate - Dados a serem enviados:', dataToSend);

      await createTemplate(dataToSend);
      
      toast({
        title: "Template criado",
        description: "Template criado com sucesso!",
      });
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('🚨 [SECURITY] Erro na criação de template:', error);
      toast({
        title: "Erro de Segurança",
        description: "Não foi possível criar o template com segurança",
        variant: "destructive",
      });
    }
  };


  
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
    
    try {
      // 🔍 DEBUG LOG - Verificar dados do formulário antes de atualizar
      console.log('🔍 [DEBUG] handleUpdate - Dados do formulário:', {
        formData,
        name: formData.name,
        nameType: typeof formData.name,
        nameLength: formData.name?.length,
        editingTemplate: editingTemplate,
        extractedTags: extractTags(formData.message)
      });

      const dataToSend = {
        ...formData,
        tags: extractTags(formData.message),
      };

      console.log('🔍 [DEBUG] handleUpdate - Dados a serem enviados:', dataToSend);

      // AIDEV-NOTE: Corrigindo assinatura - hook espera { id, ...templateData } em um único objeto
      await updateTemplate({ id: editingTemplate.id, ...dataToSend });
      
      toast({
        title: "Template atualizado",
        description: "Template atualizado com sucesso!",
      });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
    } catch (error) {
      console.error('🚨 [SECURITY] Erro na atualização de template:', error);
      toast({
        title: "Erro de Segurança",
        description: "Não foi possível atualizar o template com segurança",
        variant: "destructive",
      });
    }
  };


  


  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      toast({
        title: "Template excluído",
        description: "Template excluído com sucesso!",
      });
    } catch (error) {
      console.error('🚨 [SECURITY] Erro na exclusão de template:', error);
      toast({
        title: "Erro de Segurança",
        description: "Não foi possível excluir o template com segurança",
        variant: "destructive",
      });
    }
  };

  // AIDEV-NOTE: Função de cópia com todos os campos necessários do schema
  const handleCopy = async (template: MessageTemplate) => {
    try {
      await createTemplate({
        name: `${template.name} (Cópia)`,
        message: template.message,
        category: template.category,
        description: template.description,
        days_offset: template.days_offset,
        is_before_due: template.is_before_due,
        active: template.active,
        tags: template.tags || [],
        settings: template.settings || {}, // Campo settings incluído
      });
      
      toast({
        title: "Template copiado",
        description: "Template copiado com sucesso!",
      });
    } catch (error) {
      console.error('🚨 [SECURITY] Erro na cópia de template:', error);
      toast({
        title: "Erro de Segurança",
        description: "Não foi possível copiar o template com segurança",
        variant: "destructive",
      });
    }
  };

  const extractTags = (message: string): string[] => {
    const tags = Object.values(AVAILABLE_TAGS);
    return tags.filter(tag => message.includes(tag));
  };

  // AIDEV-NOTE: Reset do formulário com valores padrão alinhados ao schema da tabela
  const resetForm = () => {
    setFormData({
      name: "",                    // Campo obrigatório - string vazia para input
      description: "",             // Campo opcional - string vazia para manter input controlado
      message: "",                 // Campo obrigatório - string vazia para input
      category: "cobranca",        // Campo obrigatório - valor padrão válido
      days_offset: 0,              // Campo obrigatório - corresponde ao padrão da tabela (0)
      is_before_due: true,         // Campo opcional - corresponde ao padrão da tabela (true)
      active: true,                // Campo opcional - corresponde ao padrão da tabela (true)
      tags: [] as string[],        // Campo obrigatório - array vazio corresponde ao padrão da tabela
      settings: {} as Record<string, Record<string, unknown>>, // Campo opcional - objeto vazio corresponde ao padrão da tabela
    });
    setEditingTemplate(null);
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
              selectedTemplate={editingTemplate}
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

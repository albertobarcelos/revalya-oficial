import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Layout } from "@/components/layout/Layout";
import { Loader2, Users, Zap, BrainCircuit, Package, Warehouse, Banknote, FileText, MessageSquare, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { whatsappService } from "@/services/whatsappService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserManagement } from "@/components/users/UserManagement";
import { CobrancaInteligente } from "@/components/cobranca-inteligente/CobrancaInteligente";
import { FinanceSettingsEmbedded } from "./FinanceSettings";
import { ProductCategoriesManager } from "@/components/products/ProductCategoriesManager";
import { StorageLocationManager } from "@/components/estoque/StorageLocationManager";
import { ContractModelsManager } from "@/components/contracts/ContractModelsManager";
import { ContractContactsManager } from "@/components/contracts/ContractContactsManager";
import { logService } from "@/services/logService";
import { CanalIntegration } from "@/components/canais/CanalIntegration";
import { IntegrationServices } from "@/components/integracoes/IntegrationServices";
import { TemplateDialog } from "@/components/templates/TemplateDialog";
import { MyCompanySettings } from "@/components/company/MyCompanySettings";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplateSearch } from "@/components/templates/TemplateSearch";
import { useSecureNotificationTemplates } from "@/hooks/useSecureNotificationTemplates";
import { extractTagsFromMessage } from "@/utils/messageTags";
import type { MessageTemplate } from "@/types/template";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { setTenantData, getTenantData } from "@/features/tenant/storage/tenantStorage";
import { 
  setTenantData as setStandardTenantData, 
  getTenantData as getStandardTenantData,
  TENANT_STORAGE_KEYS 
} from "@/features/tenant/utils/tenantKeyMigration";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// AIDEV-NOTE: Importando hooks de segurança multi-tenant obrigatórios
import { useTenantAccessGuard, useSecureTenantQuery } from "@/hooks/templates/useSecureTenantQuery";

const DEFAULT_EVOLUTION_API_URL = import.meta.env.EVOLUTION_API_URL || 'https://evolution.nexsyn.com.br';
const DEFAULT_EVOLUTION_API_KEY = import.meta.env.EVOLUTION_API_KEY;

const MODULE_NAME = 'Settings';

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

// Componente de Templates para usar dentro da aba de Configurações
function TemplatesContent() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    message: "",
    category: "cobranca" as const,
    days_offset: 0,
    is_before_due: true,
    active: true,
    tags: [] as string[],
    settings: {} as Record<string, Record<string, unknown>>,
  });

  const {
    templates,
    isLoading: loading,
    error: templatesError,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useSecureNotificationTemplates();

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

  const extractTags = (message: string): string[] => {
    return extractTagsFromMessage(message);
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
      settings: {},
    });
    setEditingTemplate(null);
  };

  const handleCreate = async () => {
    try {
      const dataToSend = {
        ...formData,
        tags: extractTags(formData.message),
      };

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
      settings: template.settings || {},
    });
    setIsDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;
    
    try {
      const dataToSend = {
        ...formData,
        tags: extractTags(formData.message),
      };

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
        settings: template.settings || {},
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

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Templates de Mensagem</h3>
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
  );
}

export default function Settings() {
  const { toast } = useToast();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("minha-empresa");
  const [activeEstoqueSubTab, setActiveEstoqueSubTab] = useState("categorias");
  const [activeContratosSubTab, setActiveContratosSubTab] = useState("modelos");
  
  const [isSaving, setIsSaving] = useState(false);
  
  // AIDEV-NOTE: Usando hook de segurança multi-tenant obrigatório
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: Verificar hash da URL para ativar tab específica (Deep Linking)
  useEffect(() => {
    if (location.hash) {
      const tab = location.hash.replace('#', '');
      // Mapeamento de hashes para tabs
      const validTabs = [
        "minha-empresa",
        "usuarios", 
        "integracoes", 
        "cobranca-inteligente",
        "mensagens",
        "configuracoes-financeiras", 
        "estoque", 
        "contratos"
      ];
      
      if (validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [location.hash]);
  
  // Estado para integrações
  const [asaasApiKey, setAsaasApiKey] = useState("");
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");

  // AIDEV-NOTE: Query segura para buscar dados do tenant usando useSecureTenantQuery
  const {
    data: tenantData,
    isLoading: isTenantLoading,
    error: tenantError
  } = useSecureTenantQuery(
    ['tenant-settings'],
    async (supabase, tenantId) => {
      // Buscar dados do tenant pelo ID (já validado pelo hook)
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('id', tenantId)
        .single();
        
      if (error) throw error;
      return data;
    },
    {
      enabled: !!currentTenant?.id
    }
  );

  // AIDEV-NOTE: Função para carregar configurações específicas do tenant usando utilitário seguro
  const loadTenantSettings = (tenantId: string) => {
    try {
      const defaultSettings = {
        asaasApiKey: '',
        evolutionApiUrl: DEFAULT_EVOLUTION_API_URL,
        evolutionApiKey: DEFAULT_EVOLUTION_API_KEY || ''
      };
      
      const settings = getTenantData(tenantId, 'revalya-integrations-settings', defaultSettings);
      
      if (settings) {
        setAsaasApiKey(settings.asaasApiKey || '');
        setEvolutionApiUrl(settings.evolutionApiUrl || DEFAULT_EVOLUTION_API_URL);
        setEvolutionApiKey(settings.evolutionApiKey || DEFAULT_EVOLUTION_API_KEY || '');
        
        // Configurar o serviço de WhatsApp com as credenciais carregadas
        if (settings.evolutionApiUrl && settings.evolutionApiKey) {
          whatsappService.setCredentials(settings.evolutionApiUrl, settings.evolutionApiKey);
        }
        
        logService.info(MODULE_NAME, `Configurações carregadas para tenant: ${tenantId}`);
      } else {
        // Definir valores padrão se não houver configurações salvas
        setAsaasApiKey(defaultSettings.asaasApiKey);
        setEvolutionApiUrl(defaultSettings.evolutionApiUrl);
        setEvolutionApiKey(defaultSettings.evolutionApiKey);
        logService.info(MODULE_NAME, `Usando configurações padrão para tenant: ${tenantId}`);
      }
    } catch (error) {
      logService.error(MODULE_NAME, 'Erro ao carregar configurações do tenant', { error, tenantId });
      // Em caso de erro, usar valores padrão
      setAsaasApiKey('');
      setEvolutionApiUrl(DEFAULT_EVOLUTION_API_URL);
      setEvolutionApiKey(DEFAULT_EVOLUTION_API_KEY || '');
    }
  };

  // AIDEV-NOTE: Carregar configurações quando o tenant for carregado com segurança
  useEffect(() => {
    if (currentTenant?.id && tenantData) {
      // Armazenar dados do tenant usando chaves padronizadas
      setStandardTenantData({
        tenantId: currentTenant.id,
        tenantName: tenantData.name || 'Tenant',
        tenantSlug: tenantData.slug || currentTenant.slug || 'default'
      });
      
      // Carregar configurações específicas do tenant
      loadTenantSettings(currentTenant.id);
    }
  }, [currentTenant?.id, tenantData]);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      if (!currentTenant) {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível identificar o tenant atual",
          variant: "destructive",
        });
        return;
      }
      
      // Salvar configurações das integrações
      try {
        const settings = {
          asaasApiKey,
          evolutionApiUrl,
          evolutionApiKey,
        };
        
        // AIDEV-NOTE: Salvar configurações usando utilitário seguro específico do tenant
        setTenantData(currentTenant.id, 'revalya-integrations-settings', settings);
        
        // Configurar o serviço de WhatsApp
        whatsappService.setCredentials(evolutionApiUrl, evolutionApiKey);
        
        toast({
          title: "Integrações salvas",
          description: "As configurações de integrações foram salvas com sucesso.",
        });
      } catch (error) {
        logService.error(MODULE_NAME, "Erro ao salvar integrações:", error);
        toast({
          title: "Erro ao salvar",
          description: "Ocorreu um erro ao salvar as configurações de integrações.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logService.error(MODULE_NAME, "Erro geral ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title="Configurações">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-1 tracking-tight">Configurações</h2>
        </div>
        
        {/* AIDEV-NOTE: Verificação de acesso obrigatória antes de renderizar conteúdo */}
        {!hasAccess ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <p className="text-red-600">Acesso negado: {accessError}</p>
              </div>
            </CardContent>
          </Card>
        ) : isTenantLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <p>Carregando informações do tenant...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="overflow-auto">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="minha-empresa" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Minha Empresa
                </TabsTrigger>
                <TabsTrigger value="usuarios" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="integracoes" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Integrações
                </TabsTrigger>
                <TabsTrigger value="cobranca-inteligente" className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4" />
                  Cobrança Inteligente
                </TabsTrigger>
                <TabsTrigger value="mensagens" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Mensagens
                </TabsTrigger>
                <TabsTrigger value="configuracoes-financeiras" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Financeiro
                </TabsTrigger>
                <TabsTrigger value="estoque" className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4" />
                  Estoque
                </TabsTrigger>
                <TabsTrigger value="contratos" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contratos
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="tab-content h-[calc(100vh-240px)] overflow-auto pr-2">
              <TabsContent value="minha-empresa" className="space-y-4 mt-2 h-full">
                <MyCompanySettings />
              </TabsContent>

              <TabsContent value="usuarios" className="space-y-4 mt-2 h-full">
                <UserManagement tenantId={currentTenant.id} />
              </TabsContent>

              <TabsContent value="integracoes" className="space-y-4 mt-2 overflow-y-auto">
                <CanalIntegration 
                  tenantId={currentTenant.id}
                  tenantSlug={tenantData?.slug || currentTenant.slug || 'default'}
                  onToggle={(canal, enabled) => {
                    logService.info(MODULE_NAME, `Canal ${canal} ${enabled ? 'ativado' : 'desativado'}`);
                  }} 
                />
                
                <div className="mt-8">
                  <IntegrationServices
                    tenantId={currentTenant.id}
                    tenantSlug={tenantData?.slug || currentTenant.slug || 'default'}
                    onToggle={(service, enabled) => {
                      logService.info(MODULE_NAME, `Serviço ${service} ${enabled ? 'ativado' : 'desativado'}`);
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="cobranca-inteligente" className="space-y-4 mt-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
                <CobrancaInteligente 
                  tenantId={currentTenant.id}
                  tenantSlug={tenantData?.slug || currentTenant.slug || 'default'}
                />
              </TabsContent>

              <TabsContent value="mensagens" className="space-y-4 mt-2 h-full">
                <TemplatesContent />
              </TabsContent>

              <TabsContent value="configuracoes-financeiras" className="space-y-4 mt-2 h-full">
                <FinanceSettingsEmbedded tenantId={currentTenant.id} />
              </TabsContent>
              <TabsContent value="estoque" className="space-y-4 mt-2 h-full">
                <Tabs value={activeEstoqueSubTab} onValueChange={setActiveEstoqueSubTab} className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="categorias" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Categorias
                    </TabsTrigger>
                    <TabsTrigger value="local-estoque" className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      Local de Estoque
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="categorias" className="space-y-4 mt-2">
                    <ProductCategoriesManager />
                  </TabsContent>
                  
                  <TabsContent value="local-estoque" className="space-y-4 mt-2">
                    <StorageLocationManager />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="contratos" className="space-y-4 mt-2 h-full">
                <Tabs value={activeContratosSubTab} onValueChange={setActiveContratosSubTab} className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="modelos" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Modelos
                    </TabsTrigger>
                    <TabsTrigger value="contatos" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Contatos
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="modelos" className="space-y-4 mt-2">
                    <ContractModelsManager />
                  </TabsContent>
                  
                  <TabsContent value="contatos" className="space-y-4 mt-2">
                    <ContractContactsManager />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Layout } from "@/components/layout/Layout";
import { Loader2, Users, Zap, BrainCircuit, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { whatsappService } from "@/services/whatsappService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabase';
import { UserManagement } from "@/components/users/UserManagement";
import { CobrancaInteligente } from "@/components/cobranca-inteligente/CobrancaInteligente";
import { ProductCategoriesManager } from "@/components/products/ProductCategoriesManager";
import { logService } from "@/services/logService";
import { CanalIntegration } from "@/components/canais/CanalIntegration";
import { IntegrationServices } from "@/components/integracoes/IntegrationServices";
import { setTenantData, getTenantData } from "@/features/tenant/storage/tenantStorage";
import { 
  setTenantData as setStandardTenantData, 
  getTenantData as getStandardTenantData,
  TENANT_STORAGE_KEYS 
} from "@/features/tenant/utils/tenantKeyMigration";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const DEFAULT_EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL || 'https://evolution.nexsyn.com.br/api';
const DEFAULT_EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

const MODULE_NAME = 'Settings';

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("usuarios");
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para integrações
  const [asaasApiKey, setAsaasApiKey] = useState("");
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");
  
  // Estado para o nome do tenant e outros dados contextuais
  const [currentTenant, setCurrentTenant] = useState<{id: string; slug: string; name: string} | null>(null);

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

  // Carregar tenant atual ao inicializar a página
  useEffect(() => {
    const loadCurrentTenant = async () => {
      try {
        let tenantSlug = '';
        const path = window.location.pathname;
        const urlMatches = path.match(/\/gestao\/([^/]+)/);
        
        if (urlMatches && urlMatches[1]) {
          logService.info(MODULE_NAME, `Slug encontrado na URL: ${urlMatches[1]}`);
          tenantSlug = urlMatches[1];
        } else {
          const tenantData = getStandardTenantData();
          tenantSlug = tenantData.tenantSlug || 'nexsyn';
        }
        
        logService.info(MODULE_NAME, `Usando tenant: ${tenantSlug}`);
        
        // Buscar o ID real do tenant pelo slug
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id, name')
          .eq('slug', tenantSlug)
          .single();
          
        if (tenantError || !tenantData) {
          logService.error(MODULE_NAME, 'Erro ao buscar tenant por slug', { error: tenantError });
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados do tenant.",
            variant: "destructive",
          });
          return;
        }
        
        // Armazenar o ID real (UUID) do tenant usando chaves padronizadas
        setStandardTenantData({
          tenantId: tenantData.id,
          tenantName: tenantData.name || 'Tenant',
          tenantSlug: tenantSlug
        });
        
        setCurrentTenant({
          id: tenantData.id, // Usar o UUID real do tenant
          slug: tenantSlug,
          name: tenantData.name || 'Tenant'
        });
        
        // AIDEV-NOTE: Carregar configurações específicas do tenant após definir o tenant atual
        loadTenantSettings(tenantData.id);
      } catch (error) {
        logService.error(MODULE_NAME, 'Erro ao identificar tenant', { error });
        toast({
          title: "Erro",
          description: "Não foi possível identificar o tenant atual.",
          variant: "destructive",
        });
      }
    };
    
    loadCurrentTenant();
  }, [toast]);

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
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        </div>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-auto">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="usuarios" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="integracoes" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Integrações
              </TabsTrigger>
              <TabsTrigger value="categorias" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Categorias
              </TabsTrigger>
              <TabsTrigger value="cobranca-inteligente" className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                Cobrança Inteligente
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="tab-content h-[calc(100vh-240px)] overflow-auto pr-2">
            <TabsContent value="usuarios" className="space-y-4 mt-2 h-full">
              {currentTenant ? (
                <UserManagement tenantId={currentTenant.id} />
              ) : (
                <Card>
                  <CardContent className="p-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin mr-2" />
                      <p>Carregando informações do tenant...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="integracoes" className="space-y-4 mt-2 overflow-y-auto">
              {currentTenant && (
                <>
                  <CanalIntegration 
                    tenantId={currentTenant.id}
                    tenantSlug={currentTenant.slug}
                    onToggle={(canal, enabled) => {
                      logService.info(MODULE_NAME, `Canal ${canal} ${enabled ? 'ativado' : 'desativado'}`);
                    }} 
                  />
                  
                  <div className="mt-8">
                    <IntegrationServices
                      tenantId={currentTenant.id}
                      tenantSlug={currentTenant.slug}
                      onToggle={(service, enabled) => {
                        logService.info(MODULE_NAME, `Serviço ${service} ${enabled ? 'ativado' : 'desativado'}`);
                      }}
                    />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="categorias" className="space-y-4 mt-2 overflow-y-auto">
              <ProductCategoriesManager />
            </TabsContent>

            <TabsContent value="cobranca-inteligente" className="space-y-4 mt-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
              {currentTenant ? (
                <CobrancaInteligente 
                  tenantId={currentTenant.id}
                  tenantSlug={currentTenant.slug}
                />
              ) : (
                <Card>
                  <CardContent className="p-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin mr-2" />
                      <p>Carregando informações do tenant...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}

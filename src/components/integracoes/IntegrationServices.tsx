import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { logService } from "@/services/logService";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODULE_NAME = 'IntegrationServices';

interface IntegrationServicesProps {
  tenantId: string;
  tenantSlug: string;
  onToggle?: (service: string, enabled: boolean) => void;
}

interface AsaasConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  instanceName: string;
  apiUrl: string;
}

export function IntegrationServices({ tenantId, tenantSlug, onToggle }: IntegrationServicesProps) {
  const { toast } = useToast();
  
  // Estado para os serviços
  const [servicosAtivos, setServicosAtivos] = useState<Record<string, boolean>>({
    asaas: false,
    cora: false,
    omie: false,
    contaazul: false,
  });
  
  const [loadingServicos, setLoadingServicos] = useState<Record<string, boolean>>({
    asaas: false,
    cora: false,
    omie: false,
    contaazul: false,
  });

  // Estados para configuração do AsaaS
  const [showAsaasConfig, setShowAsaasConfig] = useState(false);
  const [asaasConfig, setAsaasConfig] = useState<AsaasConfig>({
    apiKey: '',
    environment: 'sandbox',
    instanceName: '',
    apiUrl: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Função para carregar o estado dos serviços de integração
  const carregarEstadoServicos = async () => {
    if (!tenantId) {
      logService.warn(MODULE_NAME, 'TenantId não fornecido, não é possível carregar estado dos serviços');
      return;
    }
    
    try {
      logService.info(MODULE_NAME, `Carregando estado inicial dos serviços para tenant ${tenantId}`);
      
      // AIDEV-NOTE: Verificar se o usuário está autenticado antes de carregar dados
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        logService.error(MODULE_NAME, 'Usuário não autenticado ao carregar serviços:', sessionError);
        return;
      }

      // AIDEV-NOTE: Configurar contexto de tenant com o ID do usuário autenticado
      const { error: contextError } = await supabase.rpc('set_tenant_context_flexible', {
        p_tenant_id: tenantId,
        p_user_id: session.user.id
      });
      
      if (contextError) {
        logService.error(MODULE_NAME, 'Erro ao configurar contexto do tenant:', contextError);
        return;
      }
      
      // AIDEV-NOTE: Usar função RPC segura para buscar integrações seguindo padrão dos serviços
      const { data: integrations, error } = await supabase.rpc('get_tenant_integrations_by_tenant', {
        tenant_uuid: tenantId
      });
        
      if (error) {
        logService.error(MODULE_NAME, `Erro ao buscar integrações: ${error.message}`);
        return;
      }
      
      // Definir estados iniciais dos serviços a partir dos dados do banco
      const novoEstado = { ...servicosAtivos };
      
      if (integrations && integrations.length > 0) {
        integrations.forEach(integration => {
          if (integration.integration_type in novoEstado) {
            novoEstado[integration.integration_type] = integration.is_active;
          }
        });
      }
      
      setServicosAtivos(novoEstado);
      
    } catch (error) {
      logService.error(MODULE_NAME, 'Erro ao carregar estado dos serviços:', error);
    }
  };
  
  // Carregar estado inicial dos serviços
  useEffect(() => {
    carregarEstadoServicos();
  }, [tenantId]);

  // AIDEV-NOTE: Função para carregar configuração específica do AsaaS
  const carregarConfigAsaas = async () => {
    try {
      // AIDEV-NOTE: Verificar se o usuário está autenticado antes de carregar configuração
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        logService.error(MODULE_NAME, 'Usuário não autenticado ao carregar config Asaas:', sessionError);
        return;
      }

      // AIDEV-NOTE: Configurar contexto de tenant com o ID do usuário autenticado
      const { error: contextError } = await supabase.rpc('set_tenant_context_flexible', {
        p_tenant_id: tenantId,
        p_user_id: session.user.id
      });
      
      if (contextError) {
        logService.error(MODULE_NAME, 'Erro ao configurar contexto do tenant:', contextError);
        return;
      }

      // AIDEV-NOTE: Usar função RPC segura para buscar configuração específica do AsaaS
      const { data: integrations, error } = await supabase.rpc('get_tenant_integrations_by_tenant', {
        tenant_uuid: tenantId
      });

      if (error) {
        logService.error(MODULE_NAME, `Erro ao buscar configuração AsaaS: ${error.message}`);
        return;
      }

      // Filtrar apenas a integração do AsaaS
      const integration = integrations?.find(int => int.integration_type === 'asaas');

      if (integration) {
        setAsaasConfig({
          apiKey: integration.config?.api_key || '',
          environment: integration.config?.environment || 'sandbox',
          instanceName: integration.config?.instance_name || '',
          apiUrl: integration.config?.api_url || (integration.config?.environment === 'production' 
            ? 'https://api.asaas.com' 
            : 'https://sandbox.asaas.com')
        });
      }
    } catch (error) {
      logService.error(MODULE_NAME, 'Erro ao carregar configuração AsaaS:', error);
    }
  };

  // AIDEV-NOTE: Função para salvar configuração do AsaaS
  const salvarConfigAsaas = async () => {
    if (!asaasConfig.apiKey || !asaasConfig.instanceName) {
      toast({
        title: "Campos obrigatórios",
        description: "API Key e Nome da Instância são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setSavingConfig(true);
    
    try {
      // AIDEV-NOTE: Verificar se o usuário está autenticado antes de configurar o contexto
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        logService.error(MODULE_NAME, 'Usuário não autenticado:', sessionError);
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para salvar configurações.",
          variant: "destructive",
        });
        return;
      }

      // AIDEV-NOTE: Configurar contexto de tenant com o ID do usuário autenticado
      // Isso é necessário para que as políticas RLS funcionem corretamente
      const { error: contextError } = await supabase.rpc('set_tenant_context_flexible', {
        p_tenant_id: tenantId,
        p_user_id: session.user.id // Usar o ID do usuário autenticado
      });
      
      if (contextError) {
        logService.error(MODULE_NAME, 'Erro ao configurar contexto do tenant:', contextError);
        toast({
          title: "Erro de contexto",
          description: "Não foi possível configurar o contexto do tenant.",
          variant: "destructive",
        });
        return;
      }

      const apiUrl = asaasConfig.environment === 'production' 
        ? 'https://api.asaas.com' 
        : 'https://sandbox.asaas.com';

      // AIDEV-NOTE: Usar função RPC segura para salvar configuração seguindo padrão dos serviços
      const { data: result, error } = await supabase.rpc('upsert_tenant_integration', {
        p_tenant_id: tenantId,
        p_integration_type: 'asaas',
        p_config: {
          api_key: asaasConfig.apiKey,
          environment: asaasConfig.environment,
          instance_name: asaasConfig.instanceName,
          api_url: apiUrl
        },
        p_is_active: true
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Configuração salva",
        description: "AsaaS configurado com sucesso!",
        variant: "default",
      });

      setShowAsaasConfig(false);
      await carregarEstadoServicos();
      
    } catch (error) {
      logService.error(MODULE_NAME, 'Erro ao salvar configuração AsaaS:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a configuração. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggle = async (servico: keyof typeof servicosAtivos) => {
    if (servico === 'asaas') {
      if (!servicosAtivos.asaas) {
        // Carregar configuração e abrir modal
        await carregarConfigAsaas();
        setShowAsaasConfig(true);
      } else {
        // Desativar integração
        setLoadingServicos(prev => ({ ...prev, [servico]: true }));
        
        try {
          // AIDEV-NOTE: Verificar se o usuário está autenticado antes de desativar integração
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session?.user) {
            logService.error(MODULE_NAME, 'Usuário não autenticado ao desativar integração:', sessionError);
            toast({
              title: "Erro de autenticação",
              description: "Você precisa estar logado para desativar integrações.",
              variant: "destructive",
            });
            return;
          }

          // AIDEV-NOTE: Configurar contexto de tenant com o ID do usuário autenticado
          const { error: contextError } = await supabase.rpc('set_tenant_context_flexible', {
            p_tenant_id: tenantId,
            p_user_id: session.user.id
          });
          
          if (contextError) {
            logService.error(MODULE_NAME, 'Erro ao configurar contexto do tenant:', contextError);
            toast({
              title: "Erro de contexto",
              description: "Não foi possível configurar o contexto do tenant.",
              variant: "destructive",
            });
            return;
          }

          // AIDEV-NOTE: Usar função RPC segura para desativar integração mantendo consistência
          const { data: result, error } = await supabase.rpc('upsert_tenant_integration', {
            p_tenant_id: tenantId,
            p_integration_type: 'asaas',
            p_config: {}, // Config vazia para desativação
            p_is_active: false
          });

          if (error) {
            throw error;
          }

          // AIDEV-NOTE: Atualizar estado local imediatamente após sucesso no backend
          setServicosAtivos(prev => ({ ...prev, [servico]: false }));
          
          // AIDEV-NOTE: Limpar configuração local quando desativar
          setAsaasConfig({
            apiKey: '',
            environment: 'sandbox',
            instanceName: '',
            apiUrl: ''
          });
          
          toast({
            title: "Integração desativada",
            description: "AsaaS foi desativado com sucesso.",
            variant: "default",
          });
          
          // AIDEV-NOTE: Recarregar estado para garantir sincronização
          await carregarEstadoServicos();
          
        } catch (error) {
          logService.error(MODULE_NAME, `Erro ao desativar ${servico}:`, error);
          toast({
            title: "Erro",
            description: "Não foi possível desativar a integração.",
            variant: "destructive",
          });
        } finally {
          setLoadingServicos(prev => ({ ...prev, [servico]: false }));
        }
      }
    } else {
      // Outros serviços ainda "em breve"
      toast({
        title: "Funcionalidade em breve",
        description: `A integração com ${servico.toUpperCase()} estará disponível em breve.`,
        variant: "default",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrações com Sistemas</h2>
        <p className="text-muted-foreground">Configure as integrações com sistemas financeiros e de gestão.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* AsaaS */}
        <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
          {!servicosAtivos.asaas && (
            <Badge className="absolute top-3 right-3 bg-blue-500">Configurar</Badge>
          )}
          {servicosAtivos.asaas && (
            <Badge className="absolute top-3 right-3 bg-green-500">Ativo</Badge>
          )}
          
          <div className="w-16 h-16 mb-4">
            <img 
              src="/logos/Integrações/asaas.png" 
              alt="AsaaS" 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/64x64/blue/white?text=A';
              }}
            />
          </div>
          
          <h3 className="font-semibold mb-1">AsaaS</h3>
          <p className="text-xs text-muted-foreground text-center mb-4">
            Gateway de pagamentos
          </p>
          
          <div className="mt-auto flex items-center gap-2">
            <Switch
              checked={servicosAtivos.asaas}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle('asaas');
              }}
              disabled={loadingServicos.asaas}
            />
            {loadingServicos.asaas ? (
              <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                <Spinner size="sm" /> Processando...
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {servicosAtivos.asaas ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
        </div>

        {/* Cora */}
        <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
          <Badge className="absolute top-3 right-3 bg-amber-500">Em breve</Badge>
          
          <div className="w-16 h-16 mb-4">
            <img 
              src="/logos/Integrações/cora.png" 
              alt="Cora" 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/64x64/purple/white?text=C';
              }}
            />
          </div>
          
          <h3 className="font-semibold mb-1">Cora</h3>
          
          <div className="mt-4 flex items-center gap-2">
            <Switch
              checked={servicosAtivos.cora}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle('cora');
              }}
              disabled={loadingServicos.cora}
            />
            {loadingServicos.cora ? (
              <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                <Spinner size="sm" /> Processando...
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {servicosAtivos.cora ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
        </div>

        {/* Omie */}
        <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
          <Badge className="absolute top-3 right-3 bg-amber-500">Em breve</Badge>
          
          <div className="rounded-full bg-green-100 p-3 mb-4">
            <img 
              src="https://play-lh.googleusercontent.com/jgaOuXsZ6u_dgsWiV4FZI1TfvNl2mUUVMQx4DYtLQXW0JxFbwUvvYFbQcuE-5wXoQvk" 
              alt="Omie" 
              className="w-6 h-6 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/64x64/green/white?text=O';
              }}
            />
          </div>
          
          <h3 className="font-semibold mb-1">Omie</h3>
          
          <div className="mt-4 flex items-center gap-2">
            <Switch
              checked={servicosAtivos.omie}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle('omie');
              }}
              disabled={loadingServicos.omie}
            />
            {loadingServicos.omie ? (
              <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                <Spinner size="sm" /> Processando...
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {servicosAtivos.omie ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
        </div>

        {/* Conta Azul */}
        <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
          <Badge className="absolute top-3 right-3 bg-amber-500">Em breve</Badge>
          
          <div className="rounded-full bg-cyan-100 p-3 mb-4">
            <img 
              src="https://www.4linux.com.br/wp-content/uploads/2023/01/logo-conta-azul.png" 
              alt="Conta Azul" 
              className="w-6 h-6 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/64x64/cyan/white?text=CA';
              }}
            />
          </div>
          
          <h3 className="font-semibold mb-1">Conta Azul</h3>
          
          <div className="mt-4 flex items-center gap-2">
            <Switch
              checked={servicosAtivos.contaazul}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle('contaazul');
              }}
              disabled={loadingServicos.contaazul}
            />
            {loadingServicos.contaazul ? (
              <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                <Spinner size="sm" /> Processando...
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {servicosAtivos.contaazul ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AIDEV-NOTE: Modal de configuração do AsaaS */}
      <Dialog open={showAsaasConfig} onOpenChange={setShowAsaasConfig}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar AsaaS
            </DialogTitle>
            <DialogDescription>
              Configure as credenciais de acesso à API do AsaaS para seu tenant.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="instanceName">Nome da Instância *</Label>
              <Input
                id="instanceName"
                placeholder="Ex: Minha Empresa - AsaaS"
                value={asaasConfig.instanceName}
                onChange={(e) => setAsaasConfig(prev => ({ ...prev, instanceName: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="environment">Ambiente</Label>
              <Select 
                value={asaasConfig.environment} 
                onValueChange={(value: 'sandbox' | 'production') => 
                  setAsaasConfig(prev => ({ ...prev, environment: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                  <SelectItem value="production">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Sua API Key do AsaaS"
                  value={asaasConfig.apiKey}
                  onChange={(e) => setAsaasConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="apiUrl">URL da API</Label>
              <Input
                id="apiUrl"
                value={asaasConfig.environment === 'production' 
                  ? 'https://api.asaas.com' 
                  : 'https://sandbox.asaas.com'
                }
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                A URL é definida automaticamente baseada no ambiente selecionado.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAsaasConfig(false)}
              disabled={savingConfig}
            >
              Cancelar
            </Button>
            <Button 
              onClick={salvarConfigAsaas}
              disabled={savingConfig}
            >
              {savingConfig ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configuração'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

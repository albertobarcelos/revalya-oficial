import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { logService } from "@/services/logService";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { SetupAsaasWebhook } from "@/components/asaas/setup-asaas-webhook";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
        // AIDEV-NOTE: Tentar descriptografar chave API usando função RPC
        // Se não conseguir, usar texto plano do config (compatibilidade)
        let apiKey = '';
        
        try {
          const { data: decryptedKey, error: decryptError } = await supabase.rpc('get_decrypted_api_key', {
            p_tenant_id: tenantId,
            p_integration_type: 'asaas'
          });
          
          if (!decryptError && decryptedKey) {
            apiKey = decryptedKey;
            logService.info(MODULE_NAME, 'Chave API descriptografada com sucesso');
          } else {
            // Fallback: usar texto plano do config
            apiKey = integration.config?.api_key || '';
            if (apiKey) {
              logService.warn(MODULE_NAME, 'Usando chave em texto plano (compatibilidade)');
            }
          }
        } catch (error) {
          // Se função não existir ou falhar, usar texto plano
          apiKey = integration.config?.api_key || '';
          logService.warn(MODULE_NAME, 'Erro ao descriptografar, usando texto plano:', error);
        }

        setAsaasConfig({
          apiKey: apiKey,
          environment: integration.config?.environment || 'sandbox',
          instanceName: integration.config?.instance_name || '',
          apiUrl: integration.config?.api_url || (integration.config?.environment === 'production' 
            ? 'https://api.asaas.com/v3' 
            : 'https://sandbox.asaas.com/v3')
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
        ? 'https://api.asaas.com/v3' 
        : 'https://sandbox.asaas.com/v3';

      // AIDEV-NOTE: Verificar se integração já existe
      const { data: existingIntegration, error: checkError } = await supabase
        .from('tenant_integrations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'asaas')
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      // AIDEV-NOTE: Tentar criptografar a chave API usando função RPC
      // Se criptografia não estiver configurada, salvar em texto plano (compatibilidade)
      let encryptedApiKey: string | null = null;
      try {
        const { data: encrypted, error: encryptError } = await supabase.rpc('encrypt_api_key', {
          plain_key: asaasConfig.apiKey
        });
        
        if (!encryptError && encrypted) {
          encryptedApiKey = encrypted;
          logService.info(MODULE_NAME, 'Chave API criptografada com sucesso');
        } else {
          // Se criptografia não estiver disponível, continuar com texto plano
          logService.warn(MODULE_NAME, 'Criptografia não disponível, salvando em texto plano (compatibilidade)');
        }
      } catch (error) {
        // Se função não existir ou falhar, continuar com texto plano
        logService.warn(MODULE_NAME, 'Erro ao tentar criptografar, usando texto plano:', error);
      }

      // AIDEV-NOTE: Config data - manter api_key apenas se não houver criptografia (compatibilidade)
      const configData: any = {
          environment: asaasConfig.environment,
          instance_name: asaasConfig.instanceName,
          api_url: apiUrl
      };

      // Se não conseguiu criptografar, manter em texto plano no config (compatibilidade)
      if (!encryptedApiKey) {
        configData.api_key = asaasConfig.apiKey;
      }

      let result;
      if (existingIntegration) {
        // Atualizar integração existente
        const updateData: any = {
          config: configData,
          is_active: true,
          environment: asaasConfig.environment,
          updated_at: new Date().toISOString()
        };

        // Adicionar chave criptografada se disponível
        if (encryptedApiKey) {
          updateData.encrypted_api_key = encryptedApiKey;
        }

        const { data, error } = await supabase
          .from('tenant_integrations')
          .update(updateData)
          .eq('id', existingIntegration.id)
          .select()
          .single();

        if (error) {
          throw error;
        }
        result = data;
      } else {
        // Criar nova integração
        const insertData: any = {
          tenant_id: tenantId,
          integration_type: 'asaas',
          config: configData,
          is_active: true,
          environment: asaasConfig.environment,
          created_by: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Adicionar chave criptografada se disponível
        if (encryptedApiKey) {
          insertData.encrypted_api_key = encryptedApiKey;
        }

        const { data, error } = await supabase
          .from('tenant_integrations')
          .insert(insertData)
          .select()
          .single();

      if (error) {
        throw error;
        }
        result = data;
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

          // AIDEV-NOTE: Buscar integração existente e deletar completamente
          const { data: existingIntegration, error: checkError } = await supabase
            .from('tenant_integrations')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('integration_type', 'asaas')
            .maybeSingle();

          if (checkError) {
            throw checkError;
          }

          if (existingIntegration) {
            // AIDEV-NOTE: Deletar completamente a linha do banco de dados ao desativar
            const { error: deleteError } = await supabase
              .from('tenant_integrations')
              .delete()
              .eq('id', existingIntegration.id)
              .eq('tenant_id', tenantId)
              .eq('integration_type', 'asaas');

            if (deleteError) {
              throw deleteError;
          }

            logService.info(MODULE_NAME, `Integração Asaas deletada completamente para tenant ${tenantId}`);

            // AIDEV-NOTE: Atualizar estado local IMEDIATAMENTE após deletar
            setServicosAtivos(prev => ({ ...prev, [servico]: false }));
          } else {
            // Se não encontrou integração, garantir que o estado está desativado
          setServicosAtivos(prev => ({ ...prev, [servico]: false }));
          }
          
          // AIDEV-NOTE: Limpar configuração local quando desativar
          setAsaasConfig({
            apiKey: '',
            environment: 'sandbox',
            instanceName: '',
            apiUrl: ''
          });
          
          toast({
            title: "Integração removida",
            description: "AsaaS foi removido completamente do banco de dados.",
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
        <div 
          className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer hover:border-blue-500 transition-colors"
          onClick={async () => {
            await carregarConfigAsaas();
            setShowAsaasConfig(true);
          }}
        >
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
              disabled={loadingServicos.asaas}
              onCheckedChange={(checked) => {
                // Previne a propagação do evento para não abrir o modal
                handleToggle('asaas');
              }}
            />
            {loadingServicos.asaas && (
              <Loader2 className="h-4 w-4 animate-spin" />
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
      <Dialog open={showAsaasConfig} onOpenChange={(open) => {
        if (open) {
          carregarConfigAsaas();
        }
        setShowAsaasConfig(open);
      }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurar AsaaS</DialogTitle>
            <DialogDescription>
              Configure as credenciais de acesso à API do AsaaS e o webhook para seu tenant.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue={servicosAtivos.asaas ? "webhook" : "credentials"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credentials">Credenciais</TabsTrigger>
              <TabsTrigger value="webhook" disabled={!servicosAtivos.asaas}>
                Webhook
              </TabsTrigger>
            </TabsList>
          
            <TabsContent value="credentials">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="instanceName">Nome da Instância *</Label>
                  <Input
                    id="instanceName"
                    value={asaasConfig.instanceName}
                    onChange={(e) => setAsaasConfig({
                      ...asaasConfig,
                      instanceName: e.target.value
                    })}
                    placeholder="Ex: ASAAS Principal"
                    disabled={servicosAtivos.asaas}
                    className={servicosAtivos.asaas ? "bg-muted" : ""}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="apiKey">Chave API *</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      value={servicosAtivos.asaas ? "••••••••••••••••" : asaasConfig.apiKey}
                      onChange={(e) => setAsaasConfig({
                        ...asaasConfig,
                        apiKey: e.target.value
                      })}
                      placeholder="$aact_YturanABCDEF..."
                      disabled={servicosAtivos.asaas}
                      className={servicosAtivos.asaas ? "bg-muted" : ""}
                    />
                    {!servicosAtivos.asaas && (
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
                    )}
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label>Ambiente</Label>
                  <Select
                    value={asaasConfig.environment}
                    onValueChange={(value) => setAsaasConfig({
                      ...asaasConfig,
                      environment: value as 'sandbox' | 'production'
                    })}
                    disabled={servicosAtivos.asaas}
                  >
                    <SelectTrigger className={servicosAtivos.asaas ? "bg-muted" : ""}>
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                      <SelectItem value="production">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="apiUrl">URL da API</Label>
                  <Input
                    id="apiUrl"
                    value={asaasConfig.environment === 'production' 
                      ? 'https://api.asaas.com/v3' 
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
            </TabsContent>
            
            <TabsContent value="webhook">
              {servicosAtivos.asaas ? (
                <SetupAsaasWebhook 
                  tenantId={tenantId} 
                  environment={asaasConfig.environment} 
                />
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  Configure primeiro as credenciais do ASAAS
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button onClick={() => setShowAsaasConfig(false)} variant="outline">
              Cancelar
            </Button>
            <Button onClick={salvarConfigAsaas} disabled={savingConfig}>
              {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

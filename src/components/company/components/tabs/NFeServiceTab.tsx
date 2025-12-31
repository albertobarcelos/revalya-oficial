/**
 * Aba de Nota Fiscal de Serviço (NFS-e)
 * AIDEV-NOTE: Componente completo com validação de integração e configurações
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, Info, Lock, Pencil, Loader2, Check, X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CompanyDataForm } from "../../schemas";
import { checkCityIntegration, getFocusNFeConfig, saveFocusNFeConfig } from "@/services/focusnfeCityService";
import { supabase } from "@/lib/supabase";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";

interface NFeServiceTabProps {
  form: UseFormReturn<CompanyDataForm>;
}

// AIDEV-NOTE: Modelos de integração disponíveis
const MODELOS_INTEGRACAO = [
  { value: "fisslex", label: "Fisslex (Recomendado)" },
  { value: "focusnfe", label: "FocusNFe" },
] as const;

// AIDEV-NOTE: Regimes especiais de tributação
const REGIMES_ESPECIAIS = [
  { value: "nenhum", label: "Nenhum" },
  { value: "microempresa_municipal", label: "Microempresa municipal" },
  { value: "estimativa", label: "Estimativa" },
  { value: "sociedade_profissionais", label: "Sociedade de profissionais" },
  { value: "cooperativa", label: "Cooperativa" },
  { value: "mei", label: "Microempresário Individual (MEI)" },
  { value: "me_epp", label: "Microempresário e Empresa de Pequeno Porte (ME EPP)" },
  { value: "tributacao_faturamento_variavel", label: "Tributação por Faturamento (Variável)" },
  { value: "fixo", label: "Fixo" },
  { value: "isencao", label: "Isenção" },
  { value: "imune", label: "Imune" },
  { value: "exigibilidade_suspensa_judicial", label: "Exigibilidade suspensa por decisão judicial" },
  { value: "exigibilidade_suspensa_administrativo", label: "Exigibilidade suspensa por procedimento administrativo" },
  { value: "eireli", label: "11 - Empresa Individual de Resp. Limitada (EIRELI)" },
  { value: "simples_nacional", label: "1 - Simples Nacional" },
  { value: "normal", label: "2 - Normal" },
  { value: "especial", label: "3 - Especial" },
  { value: "estimativa_num", label: "4 - Estimativa" },
  { value: "sociedade_uniprofissional", label: "5 - Sociedade Uniprofissional" },
  { value: "profissional_autonomo", label: "6 - Profissional Autônomo" },
  { value: "simples_nacional_sem_excesso", label: "Simples Nacional sem excesso de sublimite" },
] as const;

export function NFeServiceTab({ form }: NFeServiceTabProps) {
  const { toast } = useToast();
  const { currentTenant } = useTenantAccessGuard();
  const navigate = useNavigate();
  const [isGeneratingNFSe, setIsGeneratingNFSe] = useState(false);
  const [modeloIntegracao, setModeloIntegracao] = useState<string>("fisslex");
  const [cityStatus, setCityStatus] = useState<{ disponivel: boolean; mensagem?: string } | null>(null);
  const [isCheckingCity, setIsCheckingCity] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  // AIDEV-NOTE: Padrão único - api_key removido (chave está nos secrets do Supabase)
  const [focusNFeConfig, setFocusNFeConfig] = useState<{
    environment: 'homologacao' | 'producao';
    is_active: boolean;
  }>({
    environment: 'homologacao',
    is_active: false,
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // AIDEV-NOTE: Estados para RPS separados por ambiente
  const [rpsConfig, setRpsConfig] = useState({
    homologacao: {
      serie_rps: "1",
      proximo_numero_rps: "1",
    },
    producao: {
      serie_rps: "1",
      proximo_numero_rps: "1",
    },
  });

  // AIDEV-NOTE: Estados para credenciais da prefeitura
  const [prefeituraCredentials, setPrefeituraCredentials] = useState({
    usuario: "",
    senha: "",
    ambiente: "homologacao",
  });

  // AIDEV-NOTE: Estado para controlar qual ambiente está selecionado no modal
  const [selectedEnvironment, setSelectedEnvironment] = useState<'homologacao' | 'producao'>('homologacao');

  // AIDEV-NOTE: Estados do modal de configuração
  const [modalConfig, setModalConfig] = useState({
    ambiente: "homologacao",
    regime_especial: "nenhum",
    cidade_prestacao: "empresa_padrao",
    codigo_beneficio_fiscal: "",
    incentivador_cultural: false,
    exibir_quantidade_valor_unitario: false,
    enviar_parcelas_email: false,
    exibir_valor_liquido: false,
    nao_enviar_demonstrativo_email: false,
  });

  // AIDEV-NOTE: Verificar integração da cidade quando cidade/UF mudarem
  useEffect(() => {
    const cidade = form.watch("cidade");
    const uf = form.watch("uf");

    if (cidade && uf && cidade.length >= 2 && uf.length === 2) {
      setIsCheckingCity(true);
      checkCityIntegration(cidade, uf)
        .then((status) => {
          const statusToSet: { disponivel: boolean; mensagem?: string } = {
            disponivel: status.disponivel,
          };
          if (status.mensagem) {
            statusToSet.mensagem = status.mensagem;
          }
          setCityStatus(statusToSet);
        })
        .catch((error) => {
          console.error("Erro ao verificar cidade:", error);
          setCityStatus({
            disponivel: false,
            mensagem: "Erro ao verificar integração",
          });
        })
        .finally(() => {
          setIsCheckingCity(false);
        });
    } else {
      setCityStatus(null);
    }
  }, [form.watch("cidade"), form.watch("uf"), form]);

  // AIDEV-NOTE: Carregar configuração do FocusNFe
  useEffect(() => {
    if (currentTenant?.id) {
      setIsLoadingConfig(true);
      getFocusNFeConfig(currentTenant.id)
        .then((config) => {
          if (config) {
            // AIDEV-NOTE: Carregar configuração principal (sem api_key - padrão único)
            setFocusNFeConfig({
              environment: (config.environment as 'homologacao' | 'producao') || 'homologacao',
              is_active: config.is_active || false,
            });

            if (config.settings) {
              const settings = config.settings as any;
              if (settings.nfse) {
                setModeloIntegracao(settings.nfse.modelo_integracao || "fisslex");
                setModalConfig({
                  ambiente: settings.nfse.ambiente || "homologacao",
                  regime_especial: settings.nfse.regime_especial || "nenhum",
                  cidade_prestacao: settings.nfse.cidade_prestacao || "empresa_padrao",
                  codigo_beneficio_fiscal: settings.nfse.codigo_beneficio_fiscal || "",
                  incentivador_cultural: settings.nfse.incentivador_cultural || false,
                  exibir_quantidade_valor_unitario: settings.nfse.exibir_quantidade_valor_unitario || false,
                  enviar_parcelas_email: settings.nfse.enviar_parcelas_email || false,
                  exibir_valor_liquido: settings.nfse.exibir_valor_liquido || false,
                  nao_enviar_demonstrativo_email: settings.nfse.nao_enviar_demonstrativo_email || false,
                });
                
                // AIDEV-NOTE: Carregar configuração de RPS separada por ambiente
                if (settings.nfse.rps) {
                  setRpsConfig({
                    homologacao: {
                      serie_rps: settings.nfse.rps.homologacao?.serie_rps || settings.nfse.rps.serie_rps || "1",
                      proximo_numero_rps: settings.nfse.rps.homologacao?.proximo_numero_rps || settings.nfse.rps.homologacao?.numero_rps || settings.nfse.rps.proximo_numero_rps || settings.nfse.rps.numero_rps || "1",
                    },
                    producao: {
                      serie_rps: settings.nfse.rps.producao?.serie_rps || settings.nfse.rps.serie_rps || "1",
                      proximo_numero_rps: settings.nfse.rps.producao?.proximo_numero_rps || settings.nfse.rps.producao?.numero_rps || settings.nfse.rps.proximo_numero_rps || settings.nfse.rps.numero_rps || "1",
                    },
                  });
                }
                
                // AIDEV-NOTE: Carregar credenciais da prefeitura
                if (settings.nfse.prefeitura_credentials) {
                  setPrefeituraCredentials({
                    usuario: settings.nfse.prefeitura_credentials.usuario || "",
                    senha: settings.nfse.prefeitura_credentials.senha || "",
                    ambiente: settings.nfse.prefeitura_credentials.ambiente || "homologacao",
                  });
                }
                
                // AIDEV-NOTE: Carregar estado de habilitação da NFSe do config local
                if (settings.nfse.habilita_nfse !== undefined) {
                  setIsGeneratingNFSe(settings.nfse.habilita_nfse);
                }
              }
              
              // AIDEV-NOTE: Carregar habilita_nfse do nível raiz do config se não estiver em nfse
              if (settings.habilita_nfse !== undefined) {
                setIsGeneratingNFSe(settings.habilita_nfse);
              }
            }
          } else {
            // AIDEV-NOTE: Se não há configuração, inicializar como inativa
            setFocusNFeConfig({
              environment: 'homologacao',
              is_active: false,
            });
          }
        })
        .catch((error) => {
          console.error("Erro ao carregar configuração:", error);
          setFocusNFeConfig({
            environment: 'homologacao',
            is_active: false,
          });
        })
        .finally(() => {
          setIsLoadingConfig(false);
        });
    }
  }, [currentTenant?.id, form]);

  // AIDEV-NOTE: Recarregar configuração quando a página receber foco (após atualizar)
  useEffect(() => {
    const loadConfig = async () => {
      if (currentTenant?.id) {
        try {
          const config = await getFocusNFeConfig(currentTenant.id);
          if (config) {
            setFocusNFeConfig({
              environment: (config.environment as 'homologacao' | 'producao') || 'homologacao',
              is_active: config.is_active || false,
            });
            
            // AIDEV-NOTE: Recarregar estado de habilitação da NFSe do config local
            if (config.settings) {
              const settings = config.settings as any;
              if (settings.nfse?.habilita_nfse !== undefined) {
                setIsGeneratingNFSe(settings.nfse.habilita_nfse);
              } else if (settings.habilita_nfse !== undefined) {
                setIsGeneratingNFSe(settings.habilita_nfse);
              }
            }
          }
        } catch (error) {
          console.error("Erro ao recarregar configuração:", error);
        }
      }
    };

    loadConfig(); // Carregar inicialmente

    window.addEventListener('focus', loadConfig);
    return () => window.removeEventListener('focus', loadConfig);
  }, [currentTenant?.id]);

  // AIDEV-NOTE: Handler único para salvar todas as configurações da NFSe
  const handleSaveAllNFSeConfig = async () => {
    if (!currentTenant?.id) {
      toast({
        title: "Erro",
        description: "Tenant não identificado",
        variant: "destructive",
      });
      return;
    }

    setIsSavingConfig(true);
    try {
      const config = await getFocusNFeConfig(currentTenant.id);
      
      if (!config) {
        toast({
          title: "Configuração não encontrada",
          description: "Configure as credenciais do FocusNFe primeiro.",
          variant: "destructive",
        });
        return;
      }

      const settings = (config.settings as any) || {};
      // AIDEV-NOTE: Preservar todas as configurações existentes de nfse
      settings.nfse = {
        ...settings.nfse,
        // RPS
        rps: rpsConfig,
        // Credenciais da prefeitura - preservar se já existir, atualizar com novos valores
        prefeitura_credentials: {
          ...(settings.nfse?.prefeitura_credentials || {}),
          ...prefeituraCredentials,
        },
      };

      // AIDEV-NOTE: Salvar localmente primeiro
      // AIDEV-NOTE: Atualizar o ambiente no banco conforme a seleção do dropdown
      await saveFocusNFeConfig(currentTenant.id, {
        environment: selectedEnvironment, // Usar o ambiente selecionado no dropdown
        is_active: config.is_active,
        settings,
      });

      // AIDEV-NOTE: Buscar certificado digital se disponível
      let certificadoDigital: any = null;
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('company_data')
          .eq('id', currentTenant.id)
          .single();
        
        certificadoDigital = tenantData?.company_data?.certificado_digital;
      } catch (error) {
        console.warn('[handleSaveAllNFSeConfig] Erro ao buscar certificado:', error);
      }

      // AIDEV-NOTE: Sincronizar com Focus NFe via Edge Function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Usuário não autenticado');
        }

        const payload: any = {
          serie_rps_homologacao: rpsConfig.homologacao.serie_rps,
          proximo_numero_rps_homologacao: rpsConfig.homologacao.proximo_numero_rps,
          serie_rps_producao: rpsConfig.producao.serie_rps,
          proximo_numero_rps_producao: rpsConfig.producao.proximo_numero_rps,
          prefeitura_usuario: prefeituraCredentials.usuario?.trim() || undefined,
          prefeitura_senha: prefeituraCredentials.senha?.trim() || undefined,
        };
        
        // AIDEV-NOTE: Incluir certificado digital se disponível
        if (certificadoDigital?.arquivo_certificado_base64) {
          payload.arquivo_certificado_base64 = certificadoDigital.arquivo_certificado_base64;
        }
        if (certificadoDigital?.senha_certificado) {
          payload.senha_certificado = certificadoDigital.senha_certificado;
        }
        
        console.log('[handleSaveAllNFSeConfig] Payload enviado para Edge Function:', JSON.stringify({
          ...payload,
          arquivo_certificado_base64: payload.arquivo_certificado_base64 ? '***base64***' : undefined,
          senha_certificado: payload.senha_certificado ? '***senha***' : undefined,
        }, null, 2));
        console.log('[handleSaveAllNFSeConfig] Valores individuais:', {
          'serie_rps_homologacao': payload.serie_rps_homologacao,
          'proximo_numero_rps_homologacao': payload.proximo_numero_rps_homologacao,
          'serie_rps_producao': payload.serie_rps_producao,
          'proximo_numero_rps_producao': payload.proximo_numero_rps_producao,
          'prefeitura_usuario': payload.prefeitura_usuario ? '***preenchido***' : 'vazio',
          'prefeitura_senha': payload.prefeitura_senha ? '***preenchido***' : 'vazio',
          'arquivo_certificado_base64': payload.arquivo_certificado_base64 ? '***base64***' : 'vazio',
          'senha_certificado': payload.senha_certificado ? '***senha***' : 'vazio',
        });
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/focusnfe/empresas/configuracoes-nfse`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'x-tenant-id': currentTenant.id,
            },
            body: JSON.stringify(payload),
          }
        );

        const responseData = await response.json().catch(() => ({}));
        console.log('[handleSaveAllNFSeConfig] Resposta da Edge Function:', {
          status: response.status,
          ok: response.ok,
          data: JSON.stringify(responseData, null, 2)
        });

        if (!response.ok) {
          console.warn('[handleSaveAllNFSeConfig] Erro ao sincronizar com Focus NFe:', responseData);
          toast({
            title: "Configurações salvas localmente",
            description: "As configurações foram salvas, mas houve um erro ao sincronizar com Focus NFe.",
            variant: "default",
          });
        } else {
          toast({
            title: "Configurações salvas",
            description: "Todas as configurações da NFS-e foram salvas e sincronizadas com sucesso.",
          });
        }
      } catch (syncError: any) {
        console.error('[handleSaveAllNFSeConfig] Erro ao sincronizar:', syncError);
        toast({
          title: "Configurações salvas localmente",
          description: "As configurações foram salvas, mas houve um erro ao sincronizar com Focus NFe.",
          variant: "default",
        });
      }

      // AIDEV-NOTE: Recarregar configuração após salvar
      const updatedConfig = await getFocusNFeConfig(currentTenant.id);
      if (updatedConfig) {
        setFocusNFeConfig({
          environment: (updatedConfig.environment as 'homologacao' | 'producao') || 'homologacao',
          is_active: updatedConfig.is_active || false,
        });
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };


  // AIDEV-NOTE: Verificar se empresa está cadastrada no Focus NFe
  const checkCompanyInFocusNFe = async (cnpj: string): Promise<{ found: boolean; message: string }> => {
    if (!currentTenant?.id || !cnpj) {
      return { found: false, message: 'CNPJ não informado' };
    }

    try {
      // AIDEV-NOTE: Obter token de autenticação do usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { found: false, message: 'Usuário não autenticado' };
      }
      
      const cnpjClean = cnpj.replace(/\D/g, '');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/focusnfe/empresas?cnpj=${cnpjClean}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'x-tenant-id': currentTenant.id,
          },
        }
      );

      const result = await response.json();
      return {
        found: result.found || false,
        message: result.message || 'Empresa não encontrada no Focus NFe'
      };
    } catch (error: any) {
      console.error('[checkCompanyInFocusNFe] Erro:', error);
      return { found: false, message: 'Erro ao verificar empresa no Focus NFe' };
    }
  };


  const cidade = form.watch("cidade");
  const uf = form.watch("uf");
  // AIDEV-NOTE: Padrão único - verificar apenas se há configuração (sem api_key)
  const hasFocusNFeConfigured = true; // Sempre true pois chave está nos secrets

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label>Gerar Notas Fiscais Eletrônicas de Serviço (NFS-e)</Label>
        <div className="flex items-center gap-2">
          {isSavingConfig && <Loader2 className="h-4 w-4 animate-spin" />}
          <Switch
            checked={Boolean(isGeneratingNFSe && hasFocusNFeConfigured && focusNFeConfig.is_active)}
            onCheckedChange={async (checked) => {
              if (checked && !hasFocusNFeConfigured) {
                toast({
                  title: "Configure a integração primeiro",
                  description: "É necessário configurar o FocusNFe antes de ativar a geração de NFS-e.",
                  variant: "destructive",
                });
                navigate(`/${currentTenant?.slug}/configuracoes?tab=integracoes`);
                return;
              }
              
              setIsSavingConfig(true);
              
              // AIDEV-NOTE: Sincronizar com Focus NFe
              if (hasFocusNFeConfigured && focusNFeConfig.is_active && currentTenant?.id) {
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session?.access_token) {
                    throw new Error('Sessão não encontrada');
                  }
                  
                  // AIDEV-NOTE: Usar tipo padrão NFSe (municipal) por padrão
                  // O tipo pode ser alterado na página de Integrações
                  const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/focusnfe/empresas/documentos-fiscais`,
                    {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                        'x-tenant-id': currentTenant.id,
                      },
                      body: JSON.stringify({
                        habilita_nfse: checked,
                        habilita_nfsen_homologacao: false,
                        habilita_nfsen_producao: false,
                        environment: focusNFeConfig.environment,
                      }),
                    }
                  );
                  
                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Erro ao sincronizar NFSe');
                  }
                  
                  // AIDEV-NOTE: Salvar estado localmente após sincronizar com Focus NFe
                  const currentConfig = await getFocusNFeConfig(currentTenant.id);
                  if (currentConfig) {
                    const settings = (currentConfig.settings as any) || {};
                    settings.nfse = {
                      ...settings.nfse,
                      habilita_nfse: checked,
                    };
                    
                    await saveFocusNFeConfig(currentTenant.id, {
                      environment: currentConfig.environment as 'homologacao' | 'producao',
                      is_active: currentConfig.is_active,
                      settings,
                    });
                  }
                  
                  setIsGeneratingNFSe(checked);
                  toast({
                    title: "Sincronizado",
                    description: checked ? "NFSe ativada no Focus NFe" : "NFSe desativada no Focus NFe",
                  });
                } catch (error) {
                  console.error('[NFeServiceTab] Erro ao sincronizar:', error);
                  toast({
                    title: "Erro ao sincronizar",
                    description: error instanceof Error ? error.message : "Erro desconhecido",
                    variant: "destructive",
                  });
                  return; // Não atualizar estado local se falhar
                } finally {
                  setIsSavingConfig(false);
                }
              } else {
                setIsGeneratingNFSe(checked);
                setIsSavingConfig(false);
              }
            }}
            disabled={!hasFocusNFeConfigured || !focusNFeConfig.is_active || isSavingConfig}
          />
        </div>
      </div>
      
      <Card className="bg-yellow-50 dark:bg-yellow-900/20">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">
            Ambiente da Prefeitura: {focusNFeConfig.environment === 'producao' ? 'Produção' : 'Homologação'}
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Próximo número do RPS (Homologação):</span>
              <p className="font-medium">{rpsConfig.homologacao.proximo_numero_rps}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Série do RPS (Homologação):</span>
              <p className="font-medium">{rpsConfig.homologacao.serie_rps}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Próximo número do RPS (Produção):</span>
              <p className="font-medium">{rpsConfig.producao.proximo_numero_rps}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Série do RPS (Produção):</span>
              <p className="font-medium">{rpsConfig.producao.serie_rps}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto mt-2"
            onClick={() => {
              // AIDEV-NOTE: Inicializar com o ambiente atual da configuração ao abrir o modal
              setSelectedEnvironment(focusNFeConfig.environment || 'homologacao');
              setIsModalOpen(true);
            }}
          >
            Clique aqui para alterar as informações acima (obrigatórias para a geração da NFS-e)
          </Button>
        </CardContent>
      </Card>


      {/* AIDEV-NOTE: Modal único com todas as configurações da NFS-e */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          aria-describedby="nfse-config-description"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-primary">
              Configurações da NFS-e
            </DialogTitle>
            <p id="nfse-config-description" className="sr-only">
              Configure as opções de série e próximo número do RPS para homologação ou produção, além das credenciais da prefeitura
            </p>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* AIDEV-NOTE: Dropdown para selecionar ambiente */}
            <div className="space-y-2">
              <Label htmlFor="ambiente-select">Ambiente</Label>
              <Select
                value={selectedEnvironment}
                onValueChange={(value: 'homologacao' | 'producao') => setSelectedEnvironment(value)}
              >
                <SelectTrigger id="ambiente-select" className="w-full">
                  <SelectValue placeholder="Selecione o ambiente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homologacao">Homologação</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AIDEV-NOTE: Seção RPS - Mostrar apenas o ambiente selecionado */}
            {selectedEnvironment === 'homologacao' && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-medium text-sm text-primary">Homologação</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serie-rps-homologacao">Série do RPS</Label>
                    <Input
                      id="serie-rps-homologacao"
                      type="number"
                      min="1"
                      value={rpsConfig.homologacao.serie_rps}
                      onChange={(e) => setRpsConfig({ 
                        ...rpsConfig, 
                        homologacao: { ...rpsConfig.homologacao, serie_rps: e.target.value }
                      })}
                      placeholder="Ex: 1"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Série do RPS para Homologação (geralmente 1)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proximo-rps-homologacao">Próximo número do RPS</Label>
                    <Input
                      id="proximo-rps-homologacao"
                      type="number"
                      min="1"
                      value={rpsConfig.homologacao.proximo_numero_rps}
                      onChange={(e) => setRpsConfig({ 
                        ...rpsConfig, 
                        homologacao: { ...rpsConfig.homologacao, proximo_numero_rps: e.target.value }
                      })}
                      placeholder="Ex: 1"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Próximo número sequencial do Recibo de Prestação de Serviço para Homologação
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedEnvironment === 'producao' && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-medium text-sm text-primary">Produção</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serie-rps-producao">Série do RPS</Label>
                    <Input
                      id="serie-rps-producao"
                      type="number"
                      min="1"
                      value={rpsConfig.producao.serie_rps}
                      onChange={(e) => setRpsConfig({ 
                        ...rpsConfig, 
                        producao: { ...rpsConfig.producao, serie_rps: e.target.value }
                      })}
                      placeholder="Ex: 1"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Série do RPS para Produção (geralmente 1)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proximo-rps-producao">Próximo número do RPS</Label>
                    <Input
                      id="proximo-rps-producao"
                      type="number"
                      min="1"
                      value={rpsConfig.producao.proximo_numero_rps}
                      onChange={(e) => setRpsConfig({ 
                        ...rpsConfig, 
                        producao: { ...rpsConfig.producao, proximo_numero_rps: e.target.value }
                      })}
                      placeholder="Ex: 1"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Próximo número sequencial do Recibo de Prestação de Serviço para Produção
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Alert variant="default" className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Atenção: Alterar a numeração do RPS impacta diretamente no seu faturamento.
                Alguém pode estar faturando Ordens de Serviço agora mesmo.
              </AlertDescription>
            </Alert>

            {/* Seção: Login Prefeitura */}
            <div className="space-y-4 border rounded-lg p-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Algumas prefeituras utilizam usuário e senha para realizar a emissão de NFSe. Se for o caso para este município os dados podem ser informados abaixo. Contate nosso suporte em caso de dúvida.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usuario-prefeitura">Login</Label>
                  <Input
                    id="usuario-prefeitura"
                    value={prefeituraCredentials.usuario}
                    onChange={(e) => setPrefeituraCredentials({ ...prefeituraCredentials, usuario: e.target.value })}
                    placeholder="Login"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha-prefeitura">Senha</Label>
                  <Input
                    id="senha-prefeitura"
                    type="password"
                    value={prefeituraCredentials.senha}
                    onChange={(e) => setPrefeituraCredentials({ ...prefeituraCredentials, senha: e.target.value })}
                    placeholder="Senha"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSavingConfig}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveAllNFSeConfig}
              disabled={isSavingConfig}
            >
              {isSavingConfig ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


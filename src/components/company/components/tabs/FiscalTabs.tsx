/**
 * Abas de configuração fiscal (NF-e Produto, NF-e Serviço, etc.)
 * AIDEV-NOTE: Componentes separados para melhor organização
 */

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Loader2, X, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getFocusNFeConfig, saveFocusNFeConfig } from "@/services/focusnfeCityService";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";

export function MapTab() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
          <div className="text-center space-y-2">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Mapa será exibido aqui após preencher o endereço
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NFeProductTab() {
  const { toast } = useToast();
  const { currentTenant } = useTenantAccessGuard();
  const [habilitaNFe, setHabilitaNFe] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [focusNFeConfig, setFocusNFeConfig] = useState<{
    environment: 'homologacao' | 'producao';
    is_active: boolean;
  } | null>(null);
  
  // AIDEV-NOTE: Estados para configurações da NF-e
  const [nfeConfig, setNfeConfig] = useState({
    ambiente: 'producao' as 'homologacao' | 'producao',
    serie: '001',
    ultimaNfeEmitida: '1',
    orientacaoDanfe: 'retrato' as 'retrato' | 'paisagem',
    opcoesAvancadas: {
      exibirRecibo: true,
      exibirDescontoPorItem: false,
      exibirSecaoFaturas: false,
      exibirUnidadeTributaria: false,
      imprimirSempreColunasIpi: false,
      mostraDadosIssqn: false,
      imprimirImpostosAdicionais: false,
      sempreMostrarVolumes: false,
    },
  });
  
  // AIDEV-NOTE: Carregar configuração do Focus NFe na inicialização
  useEffect(() => {
    const loadConfig = async () => {
      if (!currentTenant?.id) return;
      
      try {
        const config = await getFocusNFeConfig(currentTenant.id);
        if (config) {
          setFocusNFeConfig({
            environment: config.environment || 'homologacao',
            is_active: config.is_active || false,
          });
          
          // AIDEV-NOTE: Carregar estado de habilitação da NFe do config local
          if (config.settings) {
            const settings = config.settings as any;
            if (settings.habilita_nfe !== undefined) {
              setHabilitaNFe(settings.habilita_nfe);
            }
            
            // AIDEV-NOTE: Carregar configurações completas da NF-e se existirem
            if (settings.nfe) {
              setNfeConfig({
                ambiente: settings.nfe.ambiente || 'producao',
                serie: settings.nfe.serie || '001',
                ultimaNfeEmitida: settings.nfe.ultima_nfe_emitida || '1',
                orientacaoDanfe: settings.nfe.orientacao_danfe || 'retrato',
                opcoesAvancadas: {
                  exibirRecibo: settings.nfe.opcoes_avancadas?.exibir_recibo ?? true,
                  exibirDescontoPorItem: settings.nfe.opcoes_avancadas?.exibir_desconto_por_item ?? false,
                  exibirSecaoFaturas: settings.nfe.opcoes_avancadas?.exibir_secao_faturas ?? false,
                  exibirUnidadeTributaria: settings.nfe.opcoes_avancadas?.exibir_unidade_tributaria ?? false,
                  imprimirSempreColunasIpi: settings.nfe.opcoes_avancadas?.imprimir_sempre_colunas_ipi ?? false,
                  mostraDadosIssqn: settings.nfe.opcoes_avancadas?.mostra_dados_issqn ?? false,
                  imprimirImpostosAdicionais: settings.nfe.opcoes_avancadas?.imprimir_impostos_adicionais ?? false,
                  sempreMostrarVolumes: settings.nfe.opcoes_avancadas?.sempre_mostrar_volumes ?? false,
                },
              });
            }
          }
        } else {
          setFocusNFeConfig(null);
        }
      } catch (error) {
        console.error('[NFeProductTab] Erro ao carregar configuração:', error);
        setFocusNFeConfig(null);
      }
    };
    
    loadConfig();
  }, [currentTenant?.id]);

  // AIDEV-NOTE: Recarregar configuração quando a página receber foco (após atualizar)
  useEffect(() => {
    const handleFocus = () => {
      if (currentTenant?.id) {
        getFocusNFeConfig(currentTenant.id)
          .then((config) => {
            if (config) {
              setFocusNFeConfig({
                environment: config.environment || 'homologacao',
                is_active: config.is_active || false,
              });
              
              // AIDEV-NOTE: Recarregar estado de habilitação da NFe do config local
              if (config.settings) {
                const settings = config.settings as any;
                if (settings.habilita_nfe !== undefined) {
                  setHabilitaNFe(settings.habilita_nfe);
                }
                
                // AIDEV-NOTE: Recarregar configurações da NF-e se existirem
                if (settings.nfe) {
                  setNfeConfig({
                    ambiente: settings.nfe.ambiente || 'producao',
                    serie: settings.nfe.serie || '001',
                    ultimaNfeEmitida: settings.nfe.ultima_nfe_emitida || '1',
                    orientacaoDanfe: settings.nfe.orientacao_danfe || 'retrato',
                    opcoesAvancadas: {
                      exibirRecibo: settings.nfe.opcoes_avancadas?.exibir_recibo ?? true,
                      exibirDescontoPorItem: settings.nfe.opcoes_avancadas?.exibir_desconto_por_item ?? false,
                      exibirSecaoFaturas: settings.nfe.opcoes_avancadas?.exibir_secao_faturas ?? false,
                      exibirUnidadeTributaria: settings.nfe.opcoes_avancadas?.exibir_unidade_tributaria ?? false,
                      imprimirSempreColunasIpi: settings.nfe.opcoes_avancadas?.imprimir_sempre_colunas_ipi ?? false,
                      mostraDadosIssqn: settings.nfe.opcoes_avancadas?.mostra_dados_issqn ?? false,
                      imprimirImpostosAdicionais: settings.nfe.opcoes_avancadas?.imprimir_impostos_adicionais ?? false,
                      sempreMostrarVolumes: settings.nfe.opcoes_avancadas?.sempre_mostrar_volumes ?? false,
                    },
                  });
                }
              }
            } else {
              setFocusNFeConfig(null);
            }
          })
          .catch((error) => {
            console.error('[NFeProductTab] Erro ao recarregar configuração:', error);
          });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentTenant?.id]);
  
  // AIDEV-NOTE: Sincronizar NFe com Focus NFe
  const handleToggleNFe = async (checked: boolean) => {
    if (!currentTenant?.id || !focusNFeConfig?.is_active) {
      toast({
        title: "Integração não configurada",
        description: "Configure a integração Focus NFe em Configurações > Integrações > Emissão Fiscal",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão não encontrada');
      }
      
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
            habilita_nfe: checked,
            environment: focusNFeConfig.environment,
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao sincronizar NFe');
      }
      
      // AIDEV-NOTE: Salvar estado localmente após sincronizar com Focus NFe
      const currentConfig = await getFocusNFeConfig(currentTenant.id);
      if (currentConfig) {
        const settings = (currentConfig.settings as any) || {};
        settings.habilita_nfe = checked;
        
        await saveFocusNFeConfig(currentTenant.id, {
          environment: currentConfig.environment as 'homologacao' | 'producao',
          is_active: currentConfig.is_active,
          settings,
        });
      }
      
      setHabilitaNFe(checked);
      toast({
        title: "Sincronizado",
        description: checked ? "NFe ativada no Focus NFe" : "NFe desativada no Focus NFe",
      });
    } catch (error) {
      console.error('[NFeProductTab] Erro ao sincronizar:', error);
      toast({
        title: "Erro ao sincronizar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // AIDEV-NOTE: Handler para salvar configurações da NF-e
  const handleSaveNFeConfig = async () => {
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
          description: "Configure a integração Focus NFe primeiro.",
          variant: "destructive",
        });
        return;
      }

      const settings = (config.settings as any) || {};
      settings.nfe = {
        ambiente: nfeConfig.ambiente,
        serie: nfeConfig.serie,
        ultima_nfe_emitida: nfeConfig.ultimaNfeEmitida,
        orientacao_danfe: nfeConfig.orientacaoDanfe,
        opcoes_avancadas: {
          exibir_recibo: nfeConfig.opcoesAvancadas.exibirRecibo,
          exibir_desconto_por_item: nfeConfig.opcoesAvancadas.exibirDescontoPorItem,
          exibir_secao_faturas: nfeConfig.opcoesAvancadas.exibirSecaoFaturas,
          exibir_unidade_tributaria: nfeConfig.opcoesAvancadas.exibirUnidadeTributaria,
          imprimir_sempre_colunas_ipi: nfeConfig.opcoesAvancadas.imprimirSempreColunasIpi,
          mostra_dados_issqn: nfeConfig.opcoesAvancadas.mostraDadosIssqn,
          imprimir_impostos_adicionais: nfeConfig.opcoesAvancadas.imprimirImpostosAdicionais,
          sempre_mostrar_volumes: nfeConfig.opcoesAvancadas.sempreMostrarVolumes,
        },
      };

      // AIDEV-NOTE: Salvar configurações localmente primeiro
      await saveFocusNFeConfig(currentTenant.id, {
        environment: config.environment as 'homologacao' | 'producao',
        is_active: config.is_active,
        settings,
      });

      // AIDEV-NOTE: Sincronizar configurações com Focus NFe se integração estiver ativa
      if (config.is_active && currentTenant?.id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error('Sessão não encontrada');
          }

          // AIDEV-NOTE: Enviar configurações para Focus NFe
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/focusnfe/empresas/configuracoes-nfe`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                'x-tenant-id': currentTenant.id,
                'x-environment': config.environment,
              },
              body: JSON.stringify({
                serie: nfeConfig.serie,
                ultima_nfe_emitida: nfeConfig.ultimaNfeEmitida,
                orientacao_danfe: nfeConfig.orientacaoDanfe,
                opcoes_avancadas: nfeConfig.opcoesAvancadas,
              }),
            }
          );

          const responseData = await response.json();
          
          if (!response.ok) {
            console.error('[handleSaveNFeConfig] Erro ao sincronizar com Focus NFe:', {
              status: response.status,
              statusText: response.statusText,
              error: responseData
            });
            
            toast({
              title: "Aviso na sincronização",
              description: responseData.message || responseData.error || "As configurações foram salvas localmente, mas pode haver problema na sincronização com Focus NFe.",
              variant: "destructive",
            });
          } else {
            // Verificar se há warning na resposta
            if (responseData.warning) {
              console.warn('[handleSaveNFeConfig] Aviso do Focus NFe:', responseData.warning);
              toast({
                title: "Sincronização parcial",
                description: responseData.message || responseData.warning || "Algumas configurações podem não ter sido sincronizadas com Focus NFe.",
                variant: "default",
              });
            } else {
              console.log('[handleSaveNFeConfig] Configurações sincronizadas com Focus NFe:', responseData);
              toast({
                title: "Sincronização concluída",
                description: "Configurações salvas e sincronizadas com Focus NFe com sucesso.",
              });
            }
          }
        } catch (error: any) {
          console.error('[handleSaveNFeConfig] Erro ao sincronizar com Focus NFe:', error);
          toast({
            title: "Erro na sincronização",
            description: error.message || "As configurações foram salvas localmente, mas houve erro ao sincronizar com Focus NFe. Verifique o console para mais detalhes.",
            variant: "destructive",
          });
        }
      }

      // AIDEV-NOTE: Toast de sucesso só aparece se não houve tentativa de sincronização
      // ou se a sincronização foi bem-sucedida (toast já foi mostrado acima)
      if (!config.is_active) {
        toast({
          title: "Configurações salvas",
          description: "As configurações da NF-e foram salvas localmente.",
        });
      }

      // AIDEV-NOTE: Recarregar configurações do banco para garantir sincronização
      if (currentTenant?.id) {
        try {
          const updatedConfig = await getFocusNFeConfig(currentTenant.id);
          if (updatedConfig?.settings) {
            const settings = updatedConfig.settings as any;
            if (settings.nfe) {
              setNfeConfig({
                ambiente: settings.nfe.ambiente || 'producao',
                serie: settings.nfe.serie || '001',
                ultimaNfeEmitida: settings.nfe.ultima_nfe_emitida || '1',
                orientacaoDanfe: settings.nfe.orientacao_danfe || 'retrato',
                opcoesAvancadas: {
                  exibirRecibo: settings.nfe.opcoes_avancadas?.exibir_recibo ?? true,
                  exibirDescontoPorItem: settings.nfe.opcoes_avancadas?.exibir_desconto_por_item ?? false,
                  exibirSecaoFaturas: settings.nfe.opcoes_avancadas?.exibir_secao_faturas ?? false,
                  exibirUnidadeTributaria: settings.nfe.opcoes_avancadas?.exibir_unidade_tributaria ?? false,
                  imprimirSempreColunasIpi: settings.nfe.opcoes_avancadas?.imprimir_sempre_colunas_ipi ?? false,
                  mostraDadosIssqn: settings.nfe.opcoes_avancadas?.mostra_dados_issqn ?? false,
                  imprimirImpostosAdicionais: settings.nfe.opcoes_avancadas?.imprimir_impostos_adicionais ?? false,
                  sempreMostrarVolumes: settings.nfe.opcoes_avancadas?.sempre_mostrar_volumes ?? false,
                },
              });
            }
          }
        } catch (error) {
          console.error('[handleSaveNFeConfig] Erro ao recarregar configurações:', error);
        }
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
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label>Gerar Notas Fiscais Eletrônicas (NF-e) na Secretaria da Fazenda (SEFAZ) do meu estado</Label>
        <div className="flex items-center gap-2">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Switch
            checked={habilitaNFe}
            onCheckedChange={handleToggleNFe}
            disabled={!focusNFeConfig?.is_active || isSaving}
          />
        </div>
      </div>
      <Card className="bg-yellow-50 dark:bg-yellow-900/20">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">
            Ambiente da SEFAZ: {nfeConfig.ambiente === 'producao' ? 'Produção' : 'Homologação'}
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Última NF-e emitida:</span>
              <p className="font-medium">{nfeConfig.ultimaNfeEmitida || '00000000'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Série da NF-e:</span>
              <p className="font-medium">{nfeConfig.serie || '001'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Orientação do DANFE:</span>
              <p className="font-medium">{nfeConfig.orientacaoDanfe === 'paisagem' ? 'Paisagem' : 'Retrato'}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto mt-2"
            onClick={() => setIsModalOpen(true)}
          >
            Clique aqui para alterar as informações acima (obrigatórias para a geração da NF-e)
          </Button>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <Label>Gerar também o Manifesto Eletrônico de Documentos Fiscais (MDF-e) na SEFAZ</Label>
        <Switch />
      </div>

      {/* AIDEV-NOTE: Modal de configurações da NF-e */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-primary">
              Nota Fiscal - Produto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Seção de Configuração da NF-e */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ambiente-nfe">Ambiente da NF-e</Label>
                  <Select
                    value={nfeConfig.ambiente}
                    onValueChange={(value: 'homologacao' | 'producao') =>
                      setNfeConfig({ ...nfeConfig, ambiente: value })
                    }
                  >
                    <SelectTrigger id="ambiente-nfe">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serie-nfe">Série da NF-e</Label>
                  <Input
                    id="serie-nfe"
                    value={nfeConfig.serie}
                    onChange={(e) => setNfeConfig({ ...nfeConfig, serie: e.target.value })}
                    placeholder="001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ultima-nfe">Última NF-e emitida</Label>
                  <Input
                    id="ultima-nfe"
                    value={nfeConfig.ultimaNfeEmitida}
                    onChange={(e) => setNfeConfig({ ...nfeConfig, ultimaNfeEmitida: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            {/* Seção Configurações Avançadas */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-primary">Configurações avançadas</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="exibir-recibo" className="text-sm font-normal cursor-pointer">
                    (NFe) Exibir recibo na DANFe
                  </Label>
                  <Switch
                    id="exibir-recibo"
                    checked={nfeConfig.opcoesAvancadas.exibirRecibo}
                    onCheckedChange={(checked) =>
                      setNfeConfig({
                        ...nfeConfig,
                        opcoesAvancadas: { ...nfeConfig.opcoesAvancadas, exibirRecibo: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="exibir-desconto-item" className="text-sm font-normal cursor-pointer">
                    (NFe) Exibir desconto por item na DANFe
                  </Label>
                  <Switch
                    id="exibir-desconto-item"
                    checked={nfeConfig.opcoesAvancadas.exibirDescontoPorItem}
                    onCheckedChange={(checked) =>
                      setNfeConfig({
                        ...nfeConfig,
                        opcoesAvancadas: { ...nfeConfig.opcoesAvancadas, exibirDescontoPorItem: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="exibir-secao-faturas" className="text-sm font-normal cursor-pointer">
                    (NFe) Exibir seção de faturas na DANFe
                  </Label>
                  <Switch
                    id="exibir-secao-faturas"
                    checked={nfeConfig.opcoesAvancadas.exibirSecaoFaturas}
                    onCheckedChange={(checked) =>
                      setNfeConfig({
                        ...nfeConfig,
                        opcoesAvancadas: { ...nfeConfig.opcoesAvancadas, exibirSecaoFaturas: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="exibir-unidade-tributaria" className="text-sm font-normal cursor-pointer">
                    (NFe) Exibir unidade tributária na DANFe
                  </Label>
                  <Switch
                    id="exibir-unidade-tributaria"
                    checked={nfeConfig.opcoesAvancadas.exibirUnidadeTributaria}
                    onCheckedChange={(checked) =>
                      setNfeConfig({
                        ...nfeConfig,
                        opcoesAvancadas: { ...nfeConfig.opcoesAvancadas, exibirUnidadeTributaria: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="imprimir-colunas-ipi" className="text-sm font-normal cursor-pointer">
                    (NFe) Imprimir sempre colunas do IPI
                  </Label>
                  <Switch
                    id="imprimir-colunas-ipi"
                    checked={nfeConfig.opcoesAvancadas.imprimirSempreColunasIpi}
                    onCheckedChange={(checked) =>
                      setNfeConfig({
                        ...nfeConfig,
                        opcoesAvancadas: { ...nfeConfig.opcoesAvancadas, imprimirSempreColunasIpi: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="mostra-dados-issqn" className="text-sm font-normal cursor-pointer">
                    (NFe) Mostra dados do ISSQN
                  </Label>
                  <Switch
                    id="mostra-dados-issqn"
                    checked={nfeConfig.opcoesAvancadas.mostraDadosIssqn}
                    onCheckedChange={(checked) =>
                      setNfeConfig({
                        ...nfeConfig,
                        opcoesAvancadas: { ...nfeConfig.opcoesAvancadas, mostraDadosIssqn: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="imprimir-impostos-adicionais" className="text-sm font-normal cursor-pointer">
                    (NFe) Imprimir impostos adicionais na DANFe (II, PIS, COFINS, ICMS UF Destino, ICMS UF Remetente, valor total tributos)
                  </Label>
                  <Switch
                    id="imprimir-impostos-adicionais"
                    checked={nfeConfig.opcoesAvancadas.imprimirImpostosAdicionais}
                    onCheckedChange={(checked) =>
                      setNfeConfig({
                        ...nfeConfig,
                        opcoesAvancadas: { ...nfeConfig.opcoesAvancadas, imprimirImpostosAdicionais: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sempre-mostrar-volumes" className="text-sm font-normal cursor-pointer">
                    (NFe) Sempre mostrar volumes na DANFe
                  </Label>
                  <Switch
                    id="sempre-mostrar-volumes"
                    checked={nfeConfig.opcoesAvancadas.sempreMostrarVolumes}
                    onCheckedChange={(checked) =>
                      setNfeConfig({
                        ...nfeConfig,
                        opcoesAvancadas: { ...nfeConfig.opcoesAvancadas, sempreMostrarVolumes: checked },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Seção Orientação DANFe */}
            <div className="space-y-4 border border-primary rounded-lg p-4">
              <Label className="text-sm font-medium text-primary">(NFe) Orientação DANFe</Label>
              <Select
                value={nfeConfig.orientacaoDanfe}
                onValueChange={(value: 'retrato' | 'paisagem') =>
                  setNfeConfig({ ...nfeConfig, orientacaoDanfe: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retrato">Retrato</SelectItem>
                  <SelectItem value="paisagem">Paisagem</SelectItem>
                </SelectContent>
              </Select>
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
              onClick={handleSaveNFeConfig}
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
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// AIDEV-NOTE: NFeServiceTab foi movido para arquivo separado
// Importar de NFeServiceTab.tsx
export { NFeServiceTab } from "./NFeServiceTab";

export function ReceiptTab() {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-muted-foreground">
          Configurações de Recibo de Prestação de Serviço serão implementadas aqui.
        </p>
      </CardContent>
    </Card>
  );
}

export function PDVTab() {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-muted-foreground">
          Configurações de PDV serão implementadas aqui.
        </p>
      </CardContent>
    </Card>
  );
}


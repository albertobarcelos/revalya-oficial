import { useState, useEffect } from "react";
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Mail, Phone, Bot, Edit, CheckCircle, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import AgenteIAService from "@/services/agenteIAService";
import { AgenteIA, EtapaReguaComAgente, AgenteIAMensagemRegua, AgenteIAMensagemReguaInsert } from "@/types/models/agente-ia";

interface AgenteIAReguaIntegracaoProps {
  tenantId: string;
  tenantSlug: string;
}

export function AgenteIAReguaIntegracao({ tenantId, tenantSlug }: AgenteIAReguaIntegracaoProps) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agenteIA, setAgenteIA] = useState<AgenteIA | null>(null);
  const [etapas, setEtapas] = useState<EtapaReguaComAgente[]>([]);
  
  const [editandoMensagem, setEditandoMensagem] = useState<{etapa: EtapaReguaComAgente, mensagem: string, mensagemId?: string} | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Carregar dados iniciais
  useEffect(() => {
    if (tenantId) {
      carregarDados();
    }
  }, [tenantId]);
  
  // Carregar agente IA e etapas com mensagens
  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar configuração do agente
      const agente = await AgenteIAService.buscarAgenteTenant(supabase, tenantId);
      setAgenteIA(agente);
      
      // Carregar etapas com mensagens personalizadas
      const etapasComAgente = await AgenteIAService.buscarEtapasComAgente(supabase, tenantId);
      setEtapas(etapasComAgente);
      
    } catch (error) {
      console.error("Erro ao carregar dados de integração:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da integração.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir diálogo para editar mensagem de uma etapa
  const abrirEdicaoMensagem = async (etapa: EtapaReguaComAgente) => {
    try {
      // Buscar mensagem personalizada, se existir
      const mensagem = await AgenteIAService.buscarMensagemEtapa(
        supabase, 
        tenantId, 
        etapa.etapa_id
      );
      
      setEditandoMensagem({
        etapa,
        mensagem: mensagem?.mensagem || etapa.mensagem_padrao,
        mensagemId: mensagem?.id
      });
      
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Erro ao carregar mensagem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a mensagem para edição.",
        variant: "destructive",
      });
    }
  };
  
  // Salvar mensagem personalizada
  const salvarMensagem = async () => {
    if (!editandoMensagem || !agenteIA) return;
    
    setSaving(true);
    try {
      const mensagemData: AgenteIAMensagemReguaInsert | Partial<AgenteIAMensagemRegua> = {
        tenant_id: tenantId,
        etapa_regua_id: editandoMensagem.etapa.etapa_id,
        mensagem: editandoMensagem.mensagem,
        variaveis_contexto: [],
        personalizado: true
      };
      
      // Se temos um ID, é uma atualização
      if (editandoMensagem.mensagemId) {
        mensagemData.id = editandoMensagem.mensagemId;
      }
      
      const { data, error } = await AgenteIAService.salvarMensagemEtapa(
        supabase,
        mensagemData as any
      );
      
      if (error) throw error;
      
      // Atualizar a lista de etapas com a nova mensagem
      const etapasAtualizadas = etapas.map(e => {
        if (e.etapa_id === editandoMensagem.etapa.etapa_id) {
          return {
            ...e,
            mensagem_agente: editandoMensagem.mensagem,
            personalizado: true
          };
        }
        return e;
      });
      
      setEtapas(etapasAtualizadas);
      setIsDialogOpen(false);
      setEditandoMensagem(null);
      
      toast({
        title: "Mensagem salva",
        description: "A mensagem personalizada foi salva com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar mensagem:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a mensagem personalizada.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Remover personalização
  const removerPersonalizacao = async (etapaId: string) => {
    if (!confirm("Tem certeza que deseja remover a personalização desta mensagem?")) {
      return;
    }
    
    try {
      // Buscar mensagem personalizada
      const mensagem = await AgenteIAService.buscarMensagemEtapa(
        supabase, 
        tenantId, 
        etapaId
      );
      
      if (mensagem?.id) {
        const { error } = await supabase
          .from('agente_ia_mensagens_regua')
          .delete()
          .eq('id', mensagem.id);
          
        if (error) throw error;
        
        // Atualizar lista local
        const etapasAtualizadas = etapas.map(e => {
          if (e.etapa_id === etapaId) {
            return {
              ...e,
              mensagem_agente: '',
              personalizado: false
            };
          }
          return e;
        });
        
        setEtapas(etapasAtualizadas);
        
        toast({
          title: "Personalização removida",
          description: "A mensagem voltou para o texto padrão da régua.",
        });
      }
    } catch (error) {
      console.error("Erro ao remover personalização:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a personalização da mensagem.",
        variant: "destructive",
      });
    }
  };
  
  // Obter ícone do canal
  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <Phone className="h-4 w-4" />;
      default:
        return null;
    }
  };
  
  // Obter cor do canal
  const getCanalColor = (canal: string) => {
    switch (canal) {
      case 'whatsapp':
        return 'text-green-600 bg-green-50';
      case 'email':
        return 'text-blue-600 bg-blue-50';
      case 'sms':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };
  
  // Obter texto do gatilho
  const getGatilhoText = (gatilho: string, dias: number) => {
    if (gatilho === 'antes_vencimento') {
      return `${dias} dia${dias > 1 ? 's' : ''} antes do vencimento`;
    } else if (gatilho === 'no_vencimento') {
      return 'No dia do vencimento';
    } else {
      return `${dias} dia${dias > 1 ? 's' : ''} após o vencimento`;
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Personalização de Mensagens de Cobrança</h2>
      <p className="text-muted-foreground">
        Configure as mensagens que o agente IA enviará em cada etapa da régua de cobrança.
      </p>
      
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !agenteIA ? (
        <Card>
          <CardHeader>
            <CardTitle>Configuração Incompleta</CardTitle>
            <CardDescription>
              É necessário configurar o Agente IA antes de integrá-lo com a Régua de Cobrança.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Acesse a aba "Agente de Cobrança IA" para configurar seu agente virtual.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personalização de Mensagens por Etapa</CardTitle>
                  <CardDescription>
                    Configure como seu agente IA vai se comunicar em cada etapa da régua de cobrança.
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Bot className="h-6 w-6 text-primary" />
                  <span className="font-medium">{agenteIA.nome_agente}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {etapas.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      Nenhuma etapa de régua de cobrança configurada.
                      <div className="mt-2">
                        Configure sua régua de cobrança primeiro.
                      </div>
                    </div>
                  ) : (
                    etapas.map((etapa, index) => (
                      <Card key={etapa.etapa_id} className="overflow-hidden">
                        <div className="bg-muted p-4 flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="font-normal">
                              Etapa {etapa.posicao}
                            </Badge>
                            <span className="text-sm font-medium">
                              {getGatilhoText(etapa.gatilho, etapa.dias)}
                            </span>
                            <Badge className={`flex items-center space-x-1 ${getCanalColor(etapa.canal)}`}>
                              {getCanalIcon(etapa.canal)}
                              <span>{AgenteIAService.getNomeCanalRegua(etapa.canal)}</span>
                            </Badge>
                            {etapa.personalizado ? (
                              <Badge variant="default" className="bg-primary text-primary-foreground">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mensagem Configurada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 bg-amber-50">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Mensagem Não Configurada
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => abrirEdicaoMensagem(etapa)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {etapa.personalizado ? "Editar Mensagem" : "Adicionar Mensagem"}
                            </Button>
                            {etapa.personalizado && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removerPersonalizacao(etapa.etapa_id)}
                              >
                                Remover mensagem
                              </Button>
                            )}
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="text-sm font-medium">
                              {etapa.personalizado ? 'Mensagem personalizada:' : 'Mensagem padrão da régua:'}
                            </div>
                            <div className="bg-muted p-3 rounded-md text-sm">
                              {etapa.personalizado ? etapa.mensagem_agente : etapa.mensagem_padrao}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Diálogo de edição de mensagem */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Personalizar Mensagem do Agente</DialogTitle>
                <DialogDescription>
                  Adapte a mensagem que o agente "{agenteIA?.nome_agente}" enviará nesta etapa.
                </DialogDescription>
              </DialogHeader>
              
              {editandoMensagem && (
                <>
                  <div className="space-y-4 my-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="font-normal">
                        Etapa {editandoMensagem.etapa.posicao}
                      </Badge>
                      <span className="text-sm font-medium">
                        {getGatilhoText(editandoMensagem.etapa.gatilho, editandoMensagem.etapa.dias)}
                      </span>
                      <Badge className={`flex items-center space-x-1 ${getCanalColor(editandoMensagem.etapa.canal)}`}>
                        {getCanalIcon(editandoMensagem.etapa.canal)}
                        <span>{AgenteIAService.getNomeCanalRegua(editandoMensagem.etapa.canal)}</span>
                      </Badge>
                    </div>
                    
                    <div>
                      <Label htmlFor="mensagem-agente">Mensagem do Agente IA</Label>
                      <Textarea
                        id="mensagem-agente"
                        value={editandoMensagem.mensagem}
                        onChange={(e) => setEditandoMensagem({
                          ...editandoMensagem,
                          mensagem: e.target.value
                        })}
                        placeholder="Digite a mensagem personalizada para esta etapa..."
                        className="h-[150px] mt-1"
                      />
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <div className="font-medium mb-1">Dicas:</div>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Mantenha a mensagem alinhada com o tom de voz do agente: "{agenteIA?.tom_de_voz}"</li>
                        <li>Use variáveis de contexto como {"{{nome_cliente}}"}, {"{{valor}}"}, {"{{data_vencimento}}"}</li>
                        {agenteIA?.usa_emojis && <li>Você pode usar emojis nesta mensagem 😊</li>}
                      </ul>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={salvarMensagem} 
                      disabled={saving}
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Mensagem
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

export default AgenteIAReguaIntegracao;

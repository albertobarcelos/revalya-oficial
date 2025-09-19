import React, { useEffect, useState } from "react";
import { CalendarClock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bot, MessageCircle, Mail, Phone, Clock, AlertTriangle, CheckCircle, ArrowDown, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from "@/components/ui/use-toast";

import AgenteIAService from "@/services/agenteIAService";
import { AgenteIA, EtapaReguaComAgente } from "@/types/models/agente-ia";

interface Props {
  tenantId: string;
  tenantSlug: string;
}

// Renderizar o fluxo de cobrança
export function FluxoCobrancaVisualizer({ tenantId, tenantSlug }: Props) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [etapas, setEtapas] = useState<EtapaReguaComAgente[]>([]);
  const [agenteIA, setAgenteIA] = useState<AgenteIA | null>(null);
  const [reguaAtiva, setReguaAtiva] = useState(true);
  
  // Estado para controle dos canais ativos
  const [canalWhatsapp, setCanalWhatsapp] = useState(true);
  const [canalEmail, setCanalEmail] = useState(true);
  const [canalSMS, setCanalSMS] = useState(false);
  const [visualizacao, setVisualizacao] = useState('vertical');
  
  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        // Definir régua como ativa por padrão
        setReguaAtiva(true);
        
        // Carregar o agente IA
        const agente = await AgenteIAService.buscarAgenteTenant(supabase, tenantId);
        setAgenteIA(agente);
        
        // Carregar etapas com mensagens do agente
        const etapasComAgente = await AgenteIAService.buscarEtapasComAgente(supabase, tenantId);
        setEtapas(etapasComAgente);
      } catch (error) {
        console.error('Erro ao carregar dados do fluxo:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as informações do fluxo de cobrança.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (tenantId) {
      carregarDados();
    }
  }, [tenantId, supabase, toast]);
  
  // Obter ícone do canal
  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case 'whatsapp':
        return <MessageCircle className="h-5 w-5" />;
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'sms':
        return <Phone className="h-5 w-5" />;
      default:
        return null;
    }
  };
  
  // Obter cor do canal
  const getCanalColor = (canal: string) => {
    switch (canal) {
      case 'whatsapp':
        return 'text-green-600 bg-green-100';
      case 'email':
        return 'text-blue-600 bg-blue-100';
      case 'sms':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  
  // Verificar se o canal está ativo
  const isCanalAtivo = (canal: string) => {
    switch (canal) {
      case 'whatsapp':
        return canalWhatsapp;
      case 'email':
        return canalEmail;
      case 'sms':
        return canalSMS;
      default:
        return false;
    }
  };
  
  // Obter descrição do momento da etapa
  const getMomentoEtapa = (etapa: EtapaReguaComAgente) => {
    if (etapa.gatilho === 'antes_vencimento') {
      return { 
        texto: `${etapa.dias} dia${etapa.dias > 1 ? 's' : ''} antes do vencimento`,
        icone: <Clock className="h-5 w-5" />,
        cor: 'text-blue-600 bg-blue-100'
      };
    } else if (etapa.gatilho === 'no_vencimento') {
      return { 
        texto: 'No dia do vencimento',
        icone: <Info className="h-5 w-5" />,
        cor: 'text-yellow-600 bg-yellow-100'
      };
    } else {
      return { 
        texto: `${etapa.dias} dia${etapa.dias > 1 ? 's' : ''} após o vencimento`,
        icone: <AlertTriangle className="h-5 w-5" />,
        cor: 'text-red-600 bg-red-100'
      };
    }
  };
  
  // Renderizar fluxo vertical
  const renderFluxoVertical = () => {
    if (etapas.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          Nenhuma etapa configurada na régua de cobrança.
        </div>
      );
    }
    
    return (
      <div className="space-y-4 py-4 px-2">
        <div className="flex justify-center mb-6">
          <div className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow">
            <Bot className="h-5 w-5 mr-2" />
            <span className="font-medium">Fatura Emitida</span>
          </div>
        </div>
        
        {etapas
          .filter(e => e.ativo)
          .sort((a, b) => {
            // Ordenar primeiramente por "tempo":
            // 1. antes_vencimento (ordem decrescente de dias)
            // 2. no_vencimento
            // 3. apos_vencimento (ordem crescente de dias)
            if (a.gatilho === 'antes_vencimento' && b.gatilho === 'antes_vencimento') {
              return b.dias - a.dias; // Ordem decrescente para antes_vencimento
            }
            if (a.gatilho === 'apos_vencimento' && b.gatilho === 'apos_vencimento') {
              return a.dias - b.dias; // Ordem crescente para apos_vencimento
            }
            
            // Ordem de prioridade entre tipos
            const prioridade = {
              'antes_vencimento': 1,
              'no_vencimento': 2,
              'apos_vencimento': 3
            };
            
            return prioridade[a.gatilho] - prioridade[b.gatilho];
          })
          .map((etapa, index, arr) => {
            const momento = getMomentoEtapa(etapa);
            const canalAtivo = isCanalAtivo(etapa.canal);
            const mensagem = etapa.mensagem_agente || "Mensagem não configurada";
            
            return (
              <div key={etapa.etapa_id} className="flex flex-col items-center">
                <div className="h-12 w-0.5 bg-border"></div>
                
                <div className={`w-full max-w-xl border rounded-lg overflow-hidden ${!canalAtivo ? 'opacity-60' : ''}`}>
                  <div className={`flex items-center justify-between p-3 ${momento.cor}`}>
                    <div className="flex items-center space-x-2">
                      {momento.icone}
                      <span className="font-medium">{momento.texto}</span>
                    </div>
                    
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getCanalColor(etapa.canal)}`}>
                      {getCanalIcon(etapa.canal)}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-card">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 flex-shrink-0">
                        <Bot className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium mb-1">
                          {agenteIA?.nome_agente || 'Agente de Cobrança'}
                          {etapa.personalizado ? (
                            <Badge variant="outline" className="ml-2 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Configurada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="ml-2 text-xs text-amber-600 bg-amber-50">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Não configurada
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm bg-muted p-3 rounded-lg">
                          {etapa.personalizado ? mensagem : (
                            <span className="text-muted-foreground italic">
                              Mensagem não configurada. Configure na seção de personalização.
                            </span>
                          )}
                        </div>
                        
                        {!canalAtivo && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-yellow-600 bg-yellow-50">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Canal desativado
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {index < arr.length - 1 && (
                  <div className="h-12 w-0.5 bg-border"></div>
                )}
              </div>
            );
          })}
          
        <div className="h-12 w-0.5 bg-border mx-auto"></div>
        <div className="flex justify-center">
          <div className="flex items-center bg-muted px-4 py-2 rounded-lg text-muted-foreground">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">Final do Fluxo</span>
          </div>
        </div>
      </div>
    );
  };
  
  // Renderizar fluxo horizontal
  const renderFluxoHorizontal = () => {
    if (etapas.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          Nenhuma etapa configurada na régua de cobrança.
        </div>
      );
    }
    
    const etapasOrdenadas = etapas
      .filter(e => e.ativo)
      .sort((a, b) => {
        // Ordenar primeiramente por "tempo":
        if (a.gatilho === 'antes_vencimento' && b.gatilho === 'antes_vencimento') {
          return b.dias - a.dias;
        }
        if (a.gatilho === 'apos_vencimento' && b.gatilho === 'apos_vencimento') {
          return a.dias - b.dias;
        }
        
        const prioridade = {
          'antes_vencimento': 1,
          'no_vencimento': 2,
          'apos_vencimento': 3
        };
        
        return prioridade[a.gatilho] - prioridade[b.gatilho];
      });
      
    return (
      <div className="py-4 px-2 overflow-auto">
        <div className="min-w-max">
          <div className="flex items-center">
            <div className="flex flex-col items-center mr-4">
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow mb-2">
                <Bot className="h-5 w-5" />
              </div>
              <div className="text-xs text-center whitespace-nowrap">Fatura Emitida</div>
            </div>
            
            {etapasOrdenadas.map((etapa, index, arr) => {
              const momento = getMomentoEtapa(etapa);
              const canalAtivo = isCanalAtivo(etapa.canal);
              
              return (
                <div key={etapa.etapa_id} className="flex items-center">
                  <div className="w-6 h-0.5 bg-border"></div>
                  
                  <div className="flex flex-col items-center mx-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${momento.cor} mb-1`}>
                      {momento.icone}
                    </div>
                    <div className="text-xs text-center max-w-[100px] whitespace-nowrap overflow-hidden text-ellipsis">
                      {momento.texto}
                    </div>
                  </div>
                  
                  <div className="w-6 h-0.5 bg-border"></div>
                  
                  <div className={`flex flex-col items-center mx-1 ${!canalAtivo ? 'opacity-60' : ''}`}>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getCanalColor(etapa.canal)} mb-1`}>
                      {getCanalIcon(etapa.canal)}
                    </div>
                    <div className="text-xs text-center">
                      {AgenteIAService.getNomeCanalRegua(etapa.canal)}
                    </div>
                  </div>
                  
                  {index < arr.length - 1 && (
                    <div className="w-6 h-0.5 bg-border"></div>
                  )}
                </div>
              );
            })}
            
            <div className="w-6 h-0.5 bg-border"></div>
            
            <div className="flex flex-col items-center ml-2">
              <div className="bg-muted text-muted-foreground px-4 py-2 rounded-lg mb-1">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="text-xs text-center">Fim</div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Loading
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando fluxo de cobrança...</span>
      </div>
    );
  }
  
  // Régua inativa
  if (!reguaAtiva) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Régua de Cobrança Desativada</CardTitle>
          <CardDescription>
            A régua de cobrança está desativada. Ative-a na aba "Configuração" para visualizar o fluxo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.hash = "#configuracao"}
          >
            Ir para Configuração
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-center space-x-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVisualizacao('vertical')}
          className={visualizacao === 'vertical' ? 'bg-primary text-primary-foreground' : ''}
        >
          <ArrowDown className="h-4 w-4 mr-2" />
          Visão Vertical
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVisualizacao('horizontal')}
          className={visualizacao === 'horizontal' ? 'bg-primary text-primary-foreground' : ''}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Visão Horizontal
        </Button>
      </div>
      
      {visualizacao === 'vertical' ? renderFluxoVertical() : renderFluxoHorizontal()}
    </div>
  );
}

export default FluxoCobrancaVisualizer;

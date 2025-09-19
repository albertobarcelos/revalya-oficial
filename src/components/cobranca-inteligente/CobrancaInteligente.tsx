import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReguaCobrancaConfig } from "@/components/regua-cobranca/ReguaCobrancaConfig";
import { AgenteIAConfig } from "@/components/agente-ia/AgenteIAConfig";
import { AgenteIAReguaIntegracao } from "@/components/agente-ia/AgenteIAReguaIntegracao";
import { FluxoCobrancaVisualizer } from "@/components/agente-ia/FluxoCobrancaVisualizer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, BarChart2, ArrowRightLeft, MessageCircle, Settings2, Eye } from "lucide-react";

interface CobrancaInteligenteProps {
  tenantId: string;
  tenantSlug: string;
}

export function CobrancaInteligente({ tenantId, tenantSlug }: CobrancaInteligenteProps) {
  const [activeTab, setActiveTab] = useState("visao-geral");

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Cobrança Inteligente</h2>
        <p className="text-muted-foreground">
          Configure seu sistema de cobrança automatizada com inteligência artificial
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Sistema de Cobrança Viva</CardTitle>
          <CardDescription>
            Automatize todo o processo de cobrança com um agente virtual personalizado que se comunica 
            com seus clientes de forma natural e eficiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-4 gap-2">
              <TabsTrigger value="visao-geral" className="flex items-center justify-center">
                <Eye className="h-4 w-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="configuracao" className="flex items-center justify-center">
                <Settings2 className="h-4 w-4 mr-2" />
                Configuração
              </TabsTrigger>
              <TabsTrigger value="personalizacao" className="flex items-center justify-center">
                <Bot className="h-4 w-4 mr-2" />
                Personalização
              </TabsTrigger>
              <TabsTrigger value="visualizacao" className="flex items-center justify-center">
                <MessageCircle className="h-4 w-4 mr-2" />
                Visualização
              </TabsTrigger>
            </TabsList>

            {/* Visão Geral - Mostra o fluxo completo e um resumo das configurações */}
            <TabsContent value="visao-geral" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Sistema de Cobrança Viva</CardTitle>
                  <CardDescription>
                    Automatize todo o processo de cobrança com um agente virtual personalizado
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-6 text-center">
                    <Bot className="h-16 w-16 mx-auto text-primary mb-4" />
                    <h3 className="text-xl font-medium mb-2">Cobrança Automatizada e Inteligente</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Configure sua régua de cobrança, personalize seu agente IA 
                      e automatize todo o processo de comunicação com seus clientes.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Régua de Cobrança</CardTitle>
                    <CardDescription>
                      Etapas e canais configurados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <BarChart2 className="h-12 w-12 mx-auto text-primary mb-2" />
                      <p className="font-medium">Configurar Régua</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Defina quando e como entrar em contato
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Agente Virtual</CardTitle>
                    <CardDescription>
                      Personalidade e estilo de comunicação
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <Bot className="h-12 w-12 mx-auto text-primary mb-2" />
                      <p className="font-medium">Configurar Agente</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Defina como seu assistente se comunica
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Mensagens</CardTitle>
                    <CardDescription>
                      Textos personalizados por etapa
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <ArrowRightLeft className="h-12 w-12 mx-auto text-primary mb-2" />
                      <p className="font-medium">Personalizar Mensagens</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adapte o conteúdo para cada situação
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Configuração - Régua de Cobrança */}
            <TabsContent value="configuracao" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Estrutura da Régua de Cobrança</CardTitle>
                  <CardDescription>
                    Defina quando e como seu sistema entrará em contato com os clientes.
                    Aqui você configura apenas o esqueleto do processo (momentos e canais).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[530px]">
                    <ReguaCobrancaConfig 
                      tenantId={tenantId} 
                      tenantSlug={tenantSlug} 
                    />
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Personalização - Agente IA e Integração */}
            <TabsContent value="personalizacao" className="space-y-4">
              <Tabs defaultValue="agente" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="agente">
                    <Bot className="h-4 w-4 mr-2" />
                    Perfil do Agente
                  </TabsTrigger>
                  <TabsTrigger value="mensagens">
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Mensagens por Etapa
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="agente" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Personalize seu Agente de Cobrança</CardTitle>
                      <CardDescription>
                        Configure a personalidade e o estilo de comunicação do seu agente virtual.
                        Estas configurações afetarão todas as mensagens enviadas.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px]">
                        <AgenteIAConfig 
                          tenantId={tenantId} 
                          tenantSlug={tenantSlug} 
                        />
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="mensagens" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Mensagens de Cobrança</CardTitle>
                      <CardDescription>
                        Configure o texto que será enviado em cada etapa da régua de cobrança.
                        As mensagens serão enviadas respeitando o perfil do agente configurado.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px]">
                        <AgenteIAReguaIntegracao 
                          tenantId={tenantId} 
                          tenantSlug={tenantSlug} 
                        />
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Visualização - Fluxo Completo */}
            <TabsContent value="visualizacao" className="space-y-4">
              <Card>
                <CardContent>
                  <FluxoCobrancaVisualizer 
                    tenantId={tenantId} 
                    tenantSlug={tenantSlug} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default CobrancaInteligente;

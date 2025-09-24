import { useState, useEffect } from "react";
import { useSupabase } from '@/hooks/useSupabase';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard'; // AIDEV-NOTE: Hook obrigatório para segurança multi-tenant
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, Bot, Smile } from "lucide-react";
import { AgenteIA, AgenteIAInsert } from "@/types/models/agente-ia";
import AgenteIAService from "@/services/agenteIAService";

interface AgenteIAConfigProps {
  tenantId: string;
  tenantSlug: string;
}

export function AgenteIAConfig({ tenantId, tenantSlug }: AgenteIAConfigProps) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  
  // AIDEV-NOTE: Validação de acesso obrigatória para segurança multi-tenant
  const { hasAccess, currentTenant } = useTenantAccessGuard(tenantId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agenteId, setAgenteId] = useState<string | null>(null);
  const [nomeAgente, setNomeAgente] = useState("");
  const [tomDeVoz, setTomDeVoz] = useState("");
  const [usaEmojis, setUsaEmojis] = useState(true);
  const [mensagens, setMensagens] = useState<string[]>(["", "", ""]);
  const [previewHtml, setPreviewHtml] = useState("");
  
  // AIDEV-NOTE: Verificação de acesso antes de qualquer operação
  if (!hasAccess || !currentTenant) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive">Acesso Negado</h3>
          <p className="text-sm text-muted-foreground">Você não tem permissão para acessar esta configuração.</p>
        </div>
      </div>
    );
  }
  
  // Carregar dados do agente ao iniciar
  useEffect(() => {
    if (tenantId) {
      carregarAgenteIA();
    }
  }, [tenantId]);
  
  // Atualizar preview quando os campos mudarem
  useEffect(() => {
    const mensagensFiltradas = mensagens.filter(msg => msg.trim() !== "");
    const preview = AgenteIAService.gerarPrevia(
      nomeAgente || "Seu Agente", 
      tomDeVoz || "Estilo não definido", 
      mensagensFiltradas.length > 0 ? mensagensFiltradas : ["Nenhum exemplo de mensagem definido."],
      usaEmojis
    );
    setPreviewHtml(preview);
  }, [nomeAgente, tomDeVoz, mensagens, usaEmojis]);
  
  // Carregar configuração do agente IA
  const carregarAgenteIA = async () => {
    try {
      setLoading(true);
      const agente = await AgenteIAService.buscarAgenteTenant(supabase, tenantId);
      
      if (agente) {
        setAgenteId(agente.id);
        setNomeAgente(agente.nome_agente);
        setTomDeVoz(agente.tom_de_voz);
        setUsaEmojis(agente.usa_emojis);
        
        // Garantir que sempre tenhamos 3 posições para mensagens
        const exemplosMensagens = [...agente.exemplos_de_mensagem];
        while (exemplosMensagens.length < 3) {
          exemplosMensagens.push("");
        }
        setMensagens(exemplosMensagens.slice(0, 3));
      } else {
        // Valores default para novo agente
        resetarFormulario();
      }
    } catch (error) {
      console.error("Erro ao carregar agente IA:", error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar a configuração do agente IA.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Resetar formulário para valores padrão
  const resetarFormulario = () => {
    setAgenteId(null);
    setNomeAgente("Assistente de Cobrança");
    setTomDeVoz("Gentil e profissional. Busca resolver problemas sem ser agressivo. Oferece ajuda quando necessário.");
    setUsaEmojis(true);
    setMensagens(["Olá, notei que você tem uma fatura pendente. Posso ajudar com o pagamento?", "Bom dia! Só para lembrar que temos uma fatura vencendo esta semana.", ""]);
  };
  
  // Atualizar uma mensagem específica no array
  const atualizarMensagem = (index: number, texto: string) => {
    const novasMensagens = [...mensagens];
    novasMensagens[index] = texto;
    setMensagens(novasMensagens);
  };
  
  // Salvar configuração do agente
  const salvarAgente = async () => {
    if (!tenantId) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o tenant atual.",
        variant: "destructive",
      });
      return;
    }
    
    if (!nomeAgente || !tomDeVoz) {
      toast({
        title: "Campos obrigatórios",
        description: "O nome do agente e o estilo de comunicação são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    // Filtrar mensagens vazias
    const mensagensFiltradas = mensagens.filter(msg => msg.trim() !== "");
    
    if (mensagensFiltradas.length === 0) {
      toast({
        title: "Exemplos necessários",
        description: "Inclua pelo menos um exemplo de mensagem.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      
      const dadosAgente: AgenteIAInsert | Partial<AgenteIA> = {
        tenant_id: tenantId,
        nome_agente: nomeAgente,
        tom_de_voz: tomDeVoz,
        exemplos_de_mensagem: mensagensFiltradas,
        usa_emojis: usaEmojis
      };
      
      if (agenteId) {
        // Atualizar agente existente
        dadosAgente.id = agenteId;
      }
      
      const { data, error } = await AgenteIAService.salvarAgente(supabase, dadosAgente as any);
      
      if (error) throw error;
      
      if (data) {
        setAgenteId(data.id);
        toast({
          title: "Configuração salva",
          description: "As configurações do agente IA foram salvas com sucesso.",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar agente IA:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações do agente IA.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Configuração do Agente de Cobrança IA</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Seu Agente de Cobrança IA</CardTitle>
          <CardDescription>
            Configure a personalidade e o estilo de comunicação do seu agente virtual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome-agente">Nome do Agente IA</Label>
                  <Input
                    id="nome-agente"
                    placeholder="Ex: Luma, Carlos, Assistente de Cobrança"
                    value={nomeAgente}
                    onChange={(e) => setNomeAgente(e.target.value)}
                    maxLength={50}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Este nome será usado para identificar seu agente nas comunicações.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="tom-de-voz">Tom de voz e estilo</Label>
                  <Textarea
                    id="tom-de-voz"
                    placeholder="Ex: Gentil, mas firme quando necessário. Evita ameaças. Usa linguagem humana e empática."
                    value={tomDeVoz}
                    onChange={(e) => setTomDeVoz(e.target.value)}
                    className="mt-1 min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Descreva como o agente deve se comunicar com seus clientes.
                  </p>
                </div>
                
                <div>
                  <Label>Mensagens exemplo (até 3)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Forneça exemplos de mensagens no estilo que você deseja que seu agente utilize.
                  </p>
                  
                  <div className="space-y-3">
                    {mensagens.map((mensagem, index) => (
                      <div key={index} className="relative">
                        <Textarea
                          placeholder={`Exemplo ${index + 1}: Olá, notei que sua fatura...`}
                          value={mensagem}
                          onChange={(e) => atualizarMensagem(index, e.target.value)}
                          maxLength={250}
                          className="pr-8"
                        />
                        <div className="absolute right-2 bottom-2 text-xs text-muted-foreground">
                          {mensagem.length}/250
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="usa-emojis"
                    checked={usaEmojis}
                    onCheckedChange={setUsaEmojis}
                  />
                  <Label htmlFor="usa-emojis" className="flex items-center gap-2">
                    <Smile className="h-4 w-4 text-yellow-500" /> Permitir uso de emojis
                  </Label>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label>Pré-visualização do Agente</Label>
                <div 
                  className="mt-2 rounded-md border p-4"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={resetarFormulario}
                  disabled={saving}
                >
                  Redefinir
                </Button>
                <Button
                  onClick={salvarAgente}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      {agenteId ? 'Atualizar Agente' : 'Criar Agente'}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AgenteIAConfig;

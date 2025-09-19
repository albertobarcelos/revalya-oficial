import { useState, useEffect } from "react";
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, MessageCircle, Mail, Phone, AlertTriangle, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TemplateSelector } from "./TemplateSelector";

interface ReguaCobrancaConfigProps {
  tenantId: string;
  tenantSlug: string;
}

type EtapaRegua = {
  id: string;
  posicao: number;
  gatilho: 'antes_vencimento' | 'no_vencimento' | 'apos_vencimento';
  dias: number;
  canal: 'whatsapp' | 'email' | 'sms';
  ativo: boolean;
};

export function ReguaCobrancaConfig({ tenantId, tenantSlug }: ReguaCobrancaConfigProps) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null); // Armazenar o ID da configuração
  const [reguaAtiva, setReguaAtiva] = useState(false);
  const [canalWhatsapp, setCanalWhatsapp] = useState(true);
  const [canalEmail, setCanalEmail] = useState(true);
  const [canalSMS, setCanalSMS] = useState(false);
  
  const [etapas, setEtapas] = useState<EtapaRegua[]>([]);
  const [editandoEtapa, setEditandoEtapa] = useState<EtapaRegua | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  
  // Definindo as funções antes de usá-las no useEffect
  const fetchReguaConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('regua_cobranca_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 é "não encontrado"
        throw error;
      }

      if (data) {
        setConfigId(data.id);
        setReguaAtiva(data.ativo);
        setCanalWhatsapp(data.canal_whatsapp);
        setCanalEmail(data.canal_email);
        setCanalSMS(data.canal_sms);
      } else {
        // Não existe configuração ainda
        setConfigId(null);
        setReguaAtiva(false);
        setCanalWhatsapp(true);
        setCanalEmail(true);
        setCanalSMS(false);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da régua:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEtapas = async () => {
    try {
      const { data, error } = await supabase
        .from('regua_cobranca_etapas')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('posicao', { ascending: true });

      if (error) throw error;

      if (data) {
        setEtapas(data);
      }
    } catch (error) {
      console.error('Erro ao carregar etapas da régua:', error);
    }
  };
  
  // Carregar configurações existentes no início
  useEffect(() => {
    fetchReguaConfig();
    fetchEtapas();
  }, [tenantId]);
  
  // Função para gerenciar alteração no estado ativo da régua
  const handleReguaAtivaChange = async (value: boolean) => {
    setSaving(true);
    
    try {
      if (value) {
        // Se está ativando a régua
        if (!configId) {
          // Se não existe configuração, criar uma nova
          const { data, error } = await supabase
            .from('regua_cobranca_config')
            .insert({
              tenant_id: tenantId,
              ativo: true,
              canal_whatsapp: canalWhatsapp,
              canal_email: canalEmail,
              canal_sms: canalSMS,
              updated_at: new Date().toISOString()
            })
            .select();
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            setConfigId(data[0].id);
          }
        } else {
          // Se já existe, apenas atualizar o estado ativo
          const { error } = await supabase
            .from('regua_cobranca_config')
            .update({
              ativo: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', configId);
          
          if (error) throw error;
        }
        
        setReguaAtiva(true);
      } else {
        // Se está desativando a régua
        if (configId) {
          const { error } = await supabase
            .from('regua_cobranca_config')
            .update({
              ativo: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', configId);
          
          if (error) throw error;
        }
        
        setReguaAtiva(false);
      }
    } catch (error) {
      console.error('Erro ao alterar estado da régua:', error);
      toast({
        title: 'Erro ao alterar estado da régua',
        description: 'Não foi possível salvar as alterações automaticamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Função para gerenciar alteração nos canais
  const handleCanalChange = async (canal: string, value: boolean) => {
    if (!configId || !reguaAtiva) return;
    
    setSaving(true);
    
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      switch (canal) {
        case 'whatsapp':
          updateData.canal_whatsapp = value;
          setCanalWhatsapp(value);
          break;
        case 'email':
          updateData.canal_email = value;
          setCanalEmail(value);
          break;
        case 'sms':
          updateData.canal_sms = value;
          setCanalSMS(value);
          break;
      }
      
      const { error } = await supabase
        .from('regua_cobranca_config')
        .update(updateData)
        .eq('id', configId);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Erro ao alterar canal ${canal}:`, error);
      toast({
        title: 'Erro ao alterar canal',
        description: 'Não foi possível salvar as alterações automaticamente.',
        variant: 'destructive',
      });
      
      // Reverter alteração em caso de erro
      switch (canal) {
        case 'whatsapp':
          setCanalWhatsapp(!value);
          break;
        case 'email':
          setCanalEmail(!value);
          break;
        case 'sms':
          setCanalSMS(!value);
          break;
      }
    } finally {
      setSaving(false);
    }
  };

  // Adicionar nova etapa
  const adicionarEtapa = () => {
    const novaEtapa: EtapaRegua = {
      id: `novo-${Date.now()}`,
      posicao: etapas.length + 1,
      gatilho: 'apos_vencimento',
      dias: 1,
      canal: 'whatsapp',
      ativo: true
    };
    
    setEditandoEtapa(novaEtapa);
    setIsDialogOpen(true);
  };
  
  // Editar etapa existente
  const editarEtapa = (etapa: EtapaRegua) => {
    setEditandoEtapa({ ...etapa });
    setIsDialogOpen(true);
  };
  
  // Excluir etapa
  const excluirEtapa = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta etapa?')) {
      try {
        // Se for uma etapa salva no banco
        if (!id.startsWith('novo-')) {
          const { error } = await supabase
            .from('regua_cobranca_etapas')
            .delete()
            .eq('id', id);
            
          if (error) throw error;
        }
        
        // Atualizar lista local
        const novasEtapas = etapas.filter(e => e.id !== id);
        
        // Reordenar posições
        const etapasAtualizadas = novasEtapas.map((e, index) => ({
          ...e,
          posicao: index + 1
        }));
        
        setEtapas(etapasAtualizadas);
        
        toast({
          title: 'Etapa removida',
          description: 'A etapa foi removida com sucesso da régua de cobrança.',
        });
      } catch (error) {
        console.error('Erro ao excluir etapa:', error);
        toast({
          title: 'Erro ao excluir etapa',
          description: 'Não foi possível excluir a etapa da régua de cobrança.',
          variant: 'destructive',
        });
      }
    }
  };
  
  // Salvar etapa em edição
  const salvarEtapa = async () => {
    if (!editandoEtapa) return;
    
    try {
      const isNova = editandoEtapa.id.startsWith('novo-');
      
      // Preparar dados para inserção/atualização
      const etapaData = {
        ...editandoEtapa,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      };
      
      if (isNova) {
        // Remover id temporário para o banco gerar um novo
        delete (etapaData as any).id;
      }
      
      // Salvar no banco
      const { data, error } = await supabase
        .from('regua_cobranca_etapas')
        .upsert(etapaData)
        .select()
        .single();
        
      if (error) throw error;
      
      // Atualizar lista local
      if (isNova) {
        setEtapas([...etapas, data]);
      } else {
        setEtapas(etapas.map(e => e.id === editandoEtapa.id ? data : e));
      }
      
      setIsDialogOpen(false);
      setEditandoEtapa(null);
      
      toast({
        title: isNova ? 'Etapa adicionada' : 'Etapa atualizada',
        description: `A etapa foi ${isNova ? 'adicionada' : 'atualizada'} com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao salvar etapa:', error);
      toast({
        title: 'Erro ao salvar etapa',
        description: 'Não foi possível salvar a etapa na régua de cobrança.',
        variant: 'destructive',
      });
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
        return 'text-muted-foreground bg-muted';
    }
  };
  
  // Renderizar etapa para edição
  const renderEtapaEditor = () => {
    if (!editandoEtapa) return null;
    
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editandoEtapa.id.startsWith('novo-') ? 'Adicionar' : 'Editar'} Etapa da Régua
            </DialogTitle>
            <DialogDescription>
              Configure quando, como e o que enviar nesta etapa da régua de cobrança.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gatilho" className="text-right">
                Quando enviar
              </Label>
              <div className="col-span-3">
                <Select
                  value={editandoEtapa.gatilho}
                  onValueChange={(value: any) => setEditandoEtapa({
                    ...editandoEtapa,
                    gatilho: value
                  })}
                >
                  <SelectTrigger id="gatilho">
                    <SelectValue placeholder="Selecione o gatilho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="antes_vencimento">Antes do vencimento</SelectItem>
                    <SelectItem value="no_vencimento">No dia do vencimento</SelectItem>
                    <SelectItem value="apos_vencimento">Após o vencimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {editandoEtapa.gatilho !== 'no_vencimento' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dias" className="text-right">
                  Quantos dias
                </Label>
                <div className="col-span-3">
                  <Input
                    id="dias"
                    type="number"
                    min="1"
                    max="90"
                    value={editandoEtapa.dias}
                    onChange={(e) => setEditandoEtapa({
                      ...editandoEtapa,
                      dias: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="canal" className="text-right">
                Canal de envio
              </Label>
              <div className="col-span-3">
                <Select
                  value={editandoEtapa.canal}
                  onValueChange={(value: any) => setEditandoEtapa({
                    ...editandoEtapa,
                    canal: value
                  })}
                >
                  <SelectTrigger id="canal">
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp" disabled={!canalWhatsapp}>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="email" disabled={!canalEmail}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sms" disabled={!canalSMS}>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>SMS</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ativo" className="text-right">
                Ativo
              </Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={editandoEtapa.ativo}
                  onCheckedChange={(checked) => setEditandoEtapa({
                    ...editandoEtapa,
                    ativo: checked
                  })}
                />
                <Label htmlFor="ativo">{editandoEtapa.ativo ? 'Sim' : 'Não'}</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditandoEtapa(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={salvarEtapa}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>Carregando configurações da régua de cobrança...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Régua de Cobrança</h2>
        
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              disabled={!reguaAtiva || loading || saving}
            >
              <FileText className="h-4 w-4" />
              Templates
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Templates de Régua de Cobrança</DialogTitle>
              <DialogDescription>
                Selecione um template pré-configurado para aplicar à sua régua.
              </DialogDescription>
            </DialogHeader>
            
            <TemplateSelector 
              tenantId={tenantId} 
              onTemplateApplied={() => {
                setTemplateDialogOpen(false);
                fetchReguaConfig();
                fetchEtapas();
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações da Régua de Cobrança</CardTitle>
          <CardDescription>
            Configure as mensagens automáticas e os canais de comunicação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar Régua de Cobrança</Label>
              <p className="text-sm text-muted-foreground">
                Ativar o envio automático de mensagens de cobrança.
              </p>
            </div>

            <Switch 
              checked={reguaAtiva}
              onCheckedChange={handleReguaAtivaChange}
              disabled={loading || saving}
            />
          </div>

          <Separator />

          <div className={!reguaAtiva ? "opacity-50 pointer-events-none" : ""}>
            <div className="space-y-3">
              <Label>Canais de Comunicação</Label>
              <p className="text-sm text-muted-foreground">
                Selecione quais canais estarão disponíveis para envio das mensagens.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="whatsapp" 
                    checked={canalWhatsapp} 
                    onCheckedChange={(value) => handleCanalChange('whatsapp', value)}
                    disabled={loading || saving || !reguaAtiva}
                  />
                  <Label htmlFor="whatsapp" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="email" 
                    checked={canalEmail} 
                    onCheckedChange={(value) => handleCanalChange('email', value)}
                    disabled={loading || saving || !reguaAtiva}
                  />
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" /> Email
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="sms" 
                    checked={canalSMS} 
                    onCheckedChange={(value) => handleCanalChange('sms', value)}
                    disabled={loading || saving || !reguaAtiva}
                  />
                  <Label htmlFor="sms" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-600" /> SMS
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className={!reguaAtiva ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Etapas da Régua de Cobrança</CardTitle>
            <CardDescription>
              Configure as etapas que compõem sua régua de cobrança automática.
            </CardDescription>
          </div>
          
          <Button
            onClick={() => adicionarEtapa()}
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            disabled={loading || saving || !reguaAtiva}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Etapa
          </Button>
        </CardHeader>

        <CardContent>
          {etapas.length === 0 ? (
            <div className="text-center py-8 border rounded-md">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma etapa configurada</h3>
              <p className="text-muted-foreground mb-4">
                Sua régua de cobrança não tem nenhuma etapa configurada.
                Adicione etapas para começar a enviar cobranças automaticamente.
              </p>
              <Button onClick={adicionarEtapa}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Etapa
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {etapas.map((etapa, index) => (
                <div 
                  key={etapa.id}
                  className="flex justify-between items-start p-4 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">
                        {getGatilhoText(etapa.gatilho, etapa.dias)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`${getCanalColor(etapa.canal)} flex items-center gap-1`}>
                          {getCanalIcon(etapa.canal)}
                          {etapa.canal === 'whatsapp' ? 'WhatsApp' : etapa.canal === 'email' ? 'Email' : 'SMS'}
                        </Badge>
                        {!etapa.ativo && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => editarEtapa(etapa)}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => excluirEtapa(etapa.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Renderizar editor de etapas */}
      {renderEtapaEditor()}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TagSelector } from "./TagSelector";
import { useToast } from '@/components/ui/use-toast';
import { processMessageTags } from '@/utils/messageUtils';
import { useCurrentTenant } from '@/hooks/useZustandTenant';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'; // AIDEV-NOTE: Hooks seguros para multi-tenant

interface MessageTemplate {
  id: string;
  name: string;
  message: string;
}

interface BulkMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCharges: string[];
  onSendMessages: (templateId: string, customMessage?: string) => Promise<any>;
  isLoading: boolean;
}

export function BulkMessageDialog({
  open,
  onOpenChange,
  selectedCharges,
  onSendMessages,
  isLoading
}: BulkMessageDialogProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [messageMode, setMessageMode] = useState<'template' | 'custom'>('template');
  const [customMessage, setCustomMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null); // AIDEV-NOTE: Ref para acesso direto ao textarea
  // AIDEV-NOTE: Estado do popover removido - agora gerenciado pelo TagSelector
  const [previewMessage, setPreviewMessage] = useState("");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard(); // AIDEV-NOTE: Hook seguro para validação multi-tenant

  // AIDEV-NOTE: Validação crítica de segurança - bloquear acesso se não autorizado
  useEffect(() => {
    if (!hasAccess && accessError) {
      console.error('🚨 [SECURITY] Acesso negado ao BulkMessageDialog:', accessError);
      toast({
        title: "Acesso Negado",
        description: accessError,
        variant: "destructive"
      });
      onOpenChange(false);
    }
  }, [hasAccess, accessError, onOpenChange, toast]);

  // AIDEV-NOTE: Lista de tags disponíveis com estrutura compatível com TagSelector
  const availableTags = [
    { id: "{cliente.nome}", name: "Nome do Cliente", color: "#3b82f6" },
    { id: "{cliente.empresa}", name: "Empresa", color: "#10b981" },
    { id: "{cliente.cpf_cnpj}", name: "CPF/CNPJ", color: "#f59e0b" },
    { id: "{cliente.email}", name: "Email", color: "#ef4444" },
    { id: "{cliente.telefone}", name: "Telefone", color: "#8b5cf6" },
    { id: "{cobranca.valor}", name: "Valor da Cobrança", color: "#06b6d4" },
    { id: "{cobranca.vencimento}", name: "Data de Vencimento", color: "#f97316" },
    { id: "{cobranca.descricao}", name: "Descrição", color: "#84cc16" },
    { id: "{cobranca.status}", name: "Status", color: "#ec4899" },
    { id: "{cobranca.link_pagamento}", name: "Link de Pagamento", color: "#6366f1" },
  ];

  useEffect(() => {
    if (open) {
      loadTemplates();
    } else {
      // Reset fields when dialog closes
      setSelectedTemplateId("");
      setCustomMessage("");
      setPreviewMessage("");
      setMessageMode('template');
    }
  }, [open]);

  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        generatePreview(template.message);
      }
    }
  }, [selectedTemplateId, templates]);

  // Carregar templates de mensagem
  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('tenant_id', currentTenant?.id) // AIDEV-NOTE: Filtro obrigatório por tenant
        .order('name');

      if (error) throw error;
      
      setTemplates(data || []);
      // Set default template if available
      if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast({
        title: "Erro ao carregar templates",
        description: "Não foi possível carregar os templates de mensagem.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // AIDEV-NOTE: Função otimizada para inserir tags usando useRef
  const insertTag = (tag: string) => {
    console.log('🏷️ [TAG INSERT] Iniciando inserção:', tag);
    
    if (!textareaRef.current) {
      console.error('❌ [TAG INSERT] Textarea ref não disponível');
      return;
    }
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    
    console.log('📝 [TAG INSERT] Estado atual:', {
      currentText: customMessage.substring(0, 50) + '...',
      selectionStart: start,
      selectionEnd: end,
      tagToInsert: tag
    });
    
    // AIDEV-NOTE: Construir novo texto com a tag inserida
    const newText = customMessage.substring(0, start) + tag + customMessage.substring(end);
    
    // AIDEV-NOTE: Atualizar estado
    setCustomMessage(newText);
    generatePreview(newText);
    
    // AIDEV-NOTE: Focar e posicionar cursor após inserção
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPosition = start + tag.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      console.log('✅ [TAG INSERT] Tag inserida com sucesso. Nova posição:', newCursorPosition);
    });
    
    // AIDEV-NOTE: Popover será fechado pelo evento de clique
  };

  // AIDEV-NOTE: Hook seguro para buscar dados da cobrança para preview
  const { data: previewChargeData, isLoading: isLoadingPreview } = useSecureTenantQuery(
    ['charge-preview', currentTenant?.id, selectedCharges?.[0]],
    async (supabase, tenantId) => {
      if (!selectedCharges || selectedCharges.length === 0) return null;
      
      console.log('🔍 [PREVIEW DEBUG] Buscando dados para preview:', {
        tenantId,
        chargeId: selectedCharges[0]
      });
      
      const { data, error } = await supabase
        .from('charges')
        .select(`
          *,
          customers(
            name,
            email,
            phone,
            cpf_cnpj,
            company
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('id', selectedCharges[0])
        .single();
        
      if (error) {
        console.error('❌ [PREVIEW ERROR] Erro ao buscar cobrança:', error);
        throw error;
      }
      
      return data;
    },
    {
      enabled: !!(selectedCharges && selectedCharges.length > 0 && currentTenant?.id && hasAccess)
    }
  );

  // Gerar preview da mensagem
  const generatePreview = async (text: string) => {
    try {
      // AIDEV-NOTE: Validação crítica de segurança multi-tenant
      if (!hasAccess) {
        console.error('🚨 [SECURITY] Acesso negado para preview:', accessError);
        setPreviewMessage('❌ Acesso negado: ' + (accessError || 'Tenant não autorizado'));
        return;
      }
      
      if (!currentTenant?.id) {
        console.error('🚨 [SECURITY] Tenant não definido para preview');
        setPreviewMessage('❌ Erro: Tenant não definido');
        return;
      }
      
      // Se houver cobranças selecionadas, usar dados reais para preview
      if (selectedCharges && selectedCharges.length > 0) {
        if (isLoadingPreview) {
          setPreviewMessage('⏳ Carregando dados para preview...');
        } else if (previewChargeData) {
          const chargeData = previewChargeData;
          
          // AIDEV-NOTE: Validação dupla de segurança - verificar se os dados pertencem ao tenant correto
          if (chargeData.tenant_id !== currentTenant.id) {
            console.error('🚨 [SECURITY VIOLATION] Dados de cobrança não pertencem ao tenant atual:', {
              dataTenantId: chargeData.tenant_id,
              currentTenantId: currentTenant.id,
              chargeId: chargeData.id
            });
            setPreviewMessage('❌ Erro de segurança: Dados não autorizados');
            return;
          }
          
          // Formatar a data no formato brasileiro e incluir o dia da semana
          const dueDate = chargeData.data_vencimento.split('T')[0];
          const formattedDate = new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          // Formatar o valor
          const formattedValue = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(chargeData.valor);

          const processedMessage = processMessageTags(text, {
            customerData: chargeData.customers,
            chargeData: {
              ...chargeData,
              data_vencimento_formatada: formattedDate,
              valor_formatado: formattedValue
            }
          });

          setPreviewMessage(processedMessage);
        } else {
          setPreviewMessage('❌ Erro ao carregar dados da cobrança para preview');
        }
      } else {
        // Preview com dados fictícios se não houver cobranças selecionadas
        const processedMessage = processMessageTags(text, {
          customerData: {
            name: 'João Silva',
            email: 'joao@email.com',
            phone: '(11) 99999-9999',
            cpf_cnpj: '123.456.789-00',
            company: 'Empresa Exemplo Ltda'
          },
          chargeData: {
            id: 'exemplo-123',
            numero_cobranca: 'COB-001',
            valor: 150.00,
            valor_formatado: 'R$ 150,00',
            data_vencimento: '2024-01-15',
            data_vencimento_formatada: 'segunda-feira, 15 de janeiro de 2024',
            status: 'pendente',
            descricao: 'Serviço de exemplo'
          }
        });
        setPreviewMessage(processedMessage);
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      setPreviewMessage(text);
    }
  };

  const handleSendMessage = async () => {
    if (messageMode === 'template' && !selectedTemplateId) {
      toast({
        title: "Selecione um template",
        description: "Por favor, selecione um modelo de mensagem.",
        variant: "destructive",
      });
      return;
    }

    if (messageMode === 'custom' && !customMessage.trim()) {
      toast({
        title: "Digite uma mensagem",
        description: "Por favor, digite uma mensagem para enviar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log(`Modo: ${messageMode}, Mensagem: ${customMessage.substring(0, 30)}...`);
      
      if (messageMode === 'template') {
        await onSendMessages(selectedTemplateId);
      } else {
        // Enviar mensagem customizada com um ID temporário
        const tempTemplateId = 'custom_' + Date.now();
        console.log('Enviando mensagem customizada:', tempTemplateId, customMessage);
        
        await onSendMessages(tempTemplateId, customMessage);
      }
      
      // Após o envio bem-sucedido, fechar o diálogo
      onOpenChange(false);
      
    } catch (error) {
      console.error('Erro ao enviar mensagens:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Enviar mensagem ({selectedCharges?.length || 0})</DialogTitle>
          <DialogDescription>
            Selecione um modelo de mensagem para enviar para as cobranças selecionadas.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="template" onValueChange={(value) => setMessageMode(value as 'template' | 'custom')}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="template">Usar Modelo</TabsTrigger>
            <TabsTrigger value="custom">Digitar Mensagem</TabsTrigger>
          </TabsList>
          
          <TabsContent value="template">
            <div className="py-4">
              <label className="text-sm font-medium">Modelo de Mensagem</label>
              <Select
                disabled={isLoadingTemplates}
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTemplateId && templates.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Preview da mensagem:</p>
                  <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {previewMessage || templates.find(t => t.id === selectedTemplateId)?.message || ""}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="custom">
            <div className="py-4 space-y-4">
              <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Digite sua mensagem</label>
                  <TagSelector 
                    availableTags={availableTags}
                    onTagSelect={insertTag}
                  />
                </div>
              
              <Textarea
                ref={textareaRef}
                id="custom-message"
                placeholder="Digite sua mensagem aqui. Você pode inserir tags como {cliente.nome} que serão substituídas por valores reais."
                className="min-h-[150px]"
                value={customMessage}
                onChange={(e) => {
                  setCustomMessage(e.target.value);
                  generatePreview(e.target.value);
                }}
              />
              
              {customMessage && (
                <div>
                  <p className="text-sm font-medium mb-2">Preview da mensagem:</p>
                  <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {previewMessage}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSendMessage} 
            disabled={isSubmitting || isLoading || (messageMode === 'template' && !selectedTemplateId) || (messageMode === 'custom' && !customMessage.trim())}
          >
            {(isSubmitting || isLoading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando mensagem...
              </>
            ) : 'Enviar Mensagem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

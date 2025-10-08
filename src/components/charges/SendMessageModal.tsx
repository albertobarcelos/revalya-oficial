import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFinancialNotifications } from "@/hooks/useFinancialNotifications";
import { TagSelector } from "@/components/charges/TagSelector";

// AIDEV-NOTE: Interface para template de mensagem
interface MessageTemplate {
  id: string;
  name: string;
  message: string;
}

// AIDEV-NOTE: Props do modal de envio de mensagem individual
interface SendMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chargeId: string;
  customerName?: string;
  onSendMessage: (templateId: string, customMessage?: string) => Promise<any>;
  isLoading: boolean;
}

// AIDEV-NOTE: Tags disponíveis para substituição na mensagem
const availableTags = [
  { label: "Nome do Cliente", value: "{cliente.nome}" },
  { label: "Valor da Cobrança", value: "{cobranca.valor}" },
  { label: "Data de Vencimento", value: "{cobranca.vencimento}" },
  { label: "Código da Cobrança", value: "{cobranca.codigo}" },
  { label: "Descrição", value: "{cobranca.descricao}" },
  { label: "Status", value: "{cobranca.status}" },
  { label: "Telefone", value: "{cliente.telefone}" },
  { label: "Email", value: "{cliente.email}" },
];

export function SendMessageModal({
  open,
  onOpenChange,
  chargeId,
  customerName,
  onSendMessage,
  isLoading
}: SendMessageModalProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // AIDEV-NOTE: Estados para controle do modal
  const [messageMode, setMessageMode] = useState<'template' | 'custom'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [previewMessage, setPreviewMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AIDEV-NOTE: Hook para buscar templates de notificação
  const { 
    templates, 
    loading: isLoadingTemplates,
    getTemplates,
    error: templatesError
  } = useFinancialNotifications();

  // AIDEV-NOTE: Carregar templates quando o modal abrir
  useEffect(() => {
    if (open) {
      getTemplates();
    }
  }, [open, getTemplates]);

  // AIDEV-NOTE: Resetar estados quando o modal abrir/fechar
  useEffect(() => {
    if (open) {
      setMessageMode('template');
      setSelectedTemplateId('');
      setCustomMessage('');
      setPreviewMessage('');
      setIsSubmitting(false);
    }
  }, [open]);

  // AIDEV-NOTE: Gerar preview da mensagem com substituição de tags e sanitização
  const generatePreview = (message: string) => {
    if (!message || typeof message !== 'string') {
      setPreviewMessage('');
      return;
    }

    try {
      let preview = message;
      
      // AIDEV-NOTE: Sanitizar entrada para prevenir XSS
      preview = preview.replace(/[<>]/g, '');
      
      // Substituir tags por valores de exemplo
      preview = preview.replace(/{cliente\.nome}/g, customerName || 'João Silva');
      preview = preview.replace(/{cobranca\.valor}/g, 'R$ 150,00');
      preview = preview.replace(/{cobranca\.vencimento}/g, '15/12/2024');
      preview = preview.replace(/{cobranca\.codigo}/g, 'COB-001');
      preview = preview.replace(/{cobranca\.descricao}/g, 'Serviços prestados');
      preview = preview.replace(/{cobranca\.status}/g, 'Pendente');
      preview = preview.replace(/{cliente\.telefone}/g, '(11) 99999-9999');
      preview = preview.replace(/{cliente\.email}/g, 'cliente@email.com');
      
      setPreviewMessage(preview);
    } catch (error) {
      console.error('❌ [SEND-MESSAGE-MODAL] Erro ao gerar preview:', error);
      setPreviewMessage('Erro ao gerar preview da mensagem');
    }
  };

  // AIDEV-NOTE: Atualizar preview quando template for selecionado
  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template && template.message) {
        generatePreview(template.message);
      } else {
        setPreviewMessage('Template não encontrado');
      }
    } else {
      setPreviewMessage('');
    }
  }, [selectedTemplateId, templates, customerName]);

  // AIDEV-NOTE: Inserir tag na posição do cursor
  const insertTag = (tag: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = customMessage.substring(0, start) + tag + customMessage.substring(end);
      setCustomMessage(newMessage);
      generatePreview(newMessage);
      
      // Reposicionar cursor após a tag inserida
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    }
  };

  // AIDEV-NOTE: Função principal para envio da mensagem
  const handleSendMessage = async () => {
    console.log('🚀 [SEND-MESSAGE-MODAL] Iniciando handleSendMessage');
    console.log('📋 [SEND-MESSAGE-MODAL] Estado atual:', {
      messageMode,
      selectedTemplateId,
      customMessage: customMessage.substring(0, 50) + '...',
      chargeId
    });

    // Validações
    if (messageMode === 'template' && !selectedTemplateId) {
      console.log('❌ [SEND-MESSAGE-MODAL] Erro: Template não selecionado');
      toast({
        title: "Selecione um template",
        description: "Por favor, selecione um modelo de mensagem.",
        variant: "destructive",
      });
      return;
    }

    if (messageMode === 'custom' && !customMessage.trim()) {
      console.log('❌ [SEND-MESSAGE-MODAL] Erro: Mensagem customizada vazia');
      toast({
        title: "Digite uma mensagem",
        description: "Por favor, digite uma mensagem para enviar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log(`📝 [SEND-MESSAGE-MODAL] Modo: ${messageMode}, Mensagem: ${customMessage.substring(0, 30)}...`);
      
      if (messageMode === 'template') {
        console.log('🎯 [SEND-MESSAGE-MODAL] Chamando onSendMessage com template:', selectedTemplateId);
        await onSendMessage(selectedTemplateId);
        console.log('✅ [SEND-MESSAGE-MODAL] onSendMessage (template) executado com sucesso');
      } else {
        // AIDEV-NOTE: Enviar mensagem customizada com um ID temporário
        const tempTemplateId = 'custom_' + Date.now();
        console.log('🎯 [SEND-MESSAGE-MODAL] Chamando onSendMessage com mensagem customizada:', tempTemplateId, customMessage);
        
        await onSendMessage(tempTemplateId, customMessage);
        console.log('✅ [SEND-MESSAGE-MODAL] onSendMessage (custom) executado com sucesso');
      }
      
      console.log('🎉 [SEND-MESSAGE-MODAL] Processo concluído, fechando diálogo');
      // Após o envio bem-sucedido, fechar o diálogo
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ [SEND-MESSAGE-MODAL] Erro detalhado no handleSendMessage:', error);
      console.error('❌ [SEND-MESSAGE-MODAL] Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      
      // AIDEV-NOTE: Feedback específico baseado no tipo de erro
      let title = "Erro ao enviar mensagem";
      let description = "Não foi possível enviar a mensagem. Tente novamente.";
      
      if (error instanceof Error) {
        if (error.message.includes('Token de autenticação')) {
          title = "Sessão expirada";
          description = "Sua sessão expirou. Faça login novamente.";
        } else if (error.message.includes('Acesso negado') || error.message.includes('permissões insuficientes')) {
          title = "Acesso negado";
          description = "Você não tem permissão para enviar mensagens.";
        } else if (error.message.includes('telefone')) {
          title = "Telefone inválido";
          description = "O cliente não possui um número de telefone válido.";
        } else if (error.message.includes('Evolution API')) {
          title = "Erro de integração";
          description = "Problema na integração com WhatsApp. Verifique as configurações.";
        }
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col relative !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]">
        {/* AIDEV-NOTE: Overlay de carregamento durante envio */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Enviando mensagem...</p>
                <p className="text-sm text-muted-foreground">
                  Para {customerName || 'cliente'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Enviar mensagem</DialogTitle>
          <DialogDescription>
            {customerName 
              ? `Enviar mensagem para ${customerName}`
              : "Enviar mensagem para o cliente"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="template" onValueChange={(value) => setMessageMode(value as 'template' | 'custom')}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="template">Usar Modelo</TabsTrigger>
              <TabsTrigger value="custom">Digitar Mensagem</TabsTrigger>
            </TabsList>
          
            <TabsContent value="template">
              <div className="py-4">
                <label className="text-sm font-medium">Modelo de Mensagem</label>
                
                {/* AIDEV-NOTE: Mostrar erro de carregamento de templates */}
                {templatesError && (
                  <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">
                      ❌ Erro ao carregar templates: {templatesError}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => getTemplates()}
                      disabled={isLoadingTemplates}
                    >
                      {isLoadingTemplates ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        'Tentar novamente'
                      )}
                    </Button>
                  </div>
                )}
                
                <Select
                  disabled={isLoadingTemplates || !!templatesError}
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        isLoadingTemplates 
                          ? "Carregando templates..." 
                          : templatesError 
                            ? "Erro ao carregar templates"
                            : templates.length === 0
                              ? "Nenhum template disponível"
                              : "Selecione um modelo..."
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* AIDEV-NOTE: Preview com melhor tratamento de erro */}
                {selectedTemplateId && templates.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Preview da mensagem:</p>
                    <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                      {previewMessage || (
                        <span className="text-muted-foreground italic">
                          Gerando preview...
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* AIDEV-NOTE: Mostrar quando não há templates */}
                {!isLoadingTemplates && !templatesError && templates.length === 0 && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      📝 Nenhum template de mensagem encontrado. 
                      <br />
                      Você pode criar templates na seção de Notificações.
                    </p>
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
        </div>
        
        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSendMessage} 
            disabled={isSubmitting || isLoading || (messageMode === 'template' && !selectedTemplateId) || (messageMode === 'custom' && !customMessage.trim())}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
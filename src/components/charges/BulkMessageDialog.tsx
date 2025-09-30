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
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TagSelector } from "./TagSelector";
import { useToast } from '@/components/ui/use-toast';
import { processMessageTags } from '@/utils/messageUtils';
import { useCurrentTenant } from '@/hooks/useZustandTenant';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';

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
  const [customMessage, setCustomMessage] = useState<string>("");
  const [messageMode, setMessageMode] = useState<'template' | 'custom'>('custom');
  const [previewMessage, setPreviewMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedChargesData, setSelectedChargesData] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { currentTenant } = useCurrentTenant();
  const { hasAccess, accessError } = useTenantAccessGuard();

  // AIDEV-NOTE: Hook para carregar templates de forma segura no nível do componente
  const {
    data: templatesData,
    error: templatesError,
    isLoading: isTemplatesLoading,
    refetch: refetchTemplates
  } = useSecureTenantQuery(
    ['notification_templates'],
    async (supabase, tenantId) => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('id, name, message')
        .eq('tenant_id', tenantId)
        .eq('active', true);

      if (error) {
        throw error;
      }

      return data as MessageTemplate[];
    },
    {
      enabled: open && !!currentTenant?.slug, // Só carrega quando o dialog está aberto e há tenant
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );

  // AIDEV-NOTE: Efeito para atualizar templates quando os dados chegam
  useEffect(() => {
    if (templatesData) {
      setTemplates(templatesData);
    }
  }, [templatesData]);

  // AIDEV-NOTE: Efeito para tratar erros de carregamento de templates
  useEffect(() => {
    if (templatesError) {
      console.error('Erro ao carregar templates:', templatesError);
      toast({
        title: "Erro ao carregar modelos",
        description: "Não foi possível carregar os modelos de mensagem.",
        variant: "destructive",
      });
    }
  }, [templatesError, toast]);

  // AIDEV-NOTE: Validação de acesso e segurança multi-tenant
  useEffect(() => {
    if (!hasAccess && accessError) {
      console.error('🚨 [SECURITY] Acesso negado ao BulkMessageDialog:', accessError);
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta funcionalidade.",
        variant: "destructive",
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

  // AIDEV-NOTE: Função para inserir tags no textarea
  const insertTag = (tag: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + tag + after;
      
      setCustomMessage(newText);
      
      // Restaurar posição do cursor
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
      
      generatePreview(newText);
    }
  };

  // AIDEV-NOTE: Função para gerar preview da mensagem com dados reais das cobranças selecionadas
  const generatePreview = (message: string) => {
    // Se não há dados das cobranças ainda, usar dados de exemplo
    if (selectedChargesData.length === 0) {
      const preview = processMessageTags(message, {
        customer: {
          name: "Carregando...",
          company: "Carregando...",
          cpf_cnpj: "000.000.000-00",
          email: "carregando@exemplo.com",
          phone: "(00) 00000-0000"
        },
        charge: {
          valor: 0.00,
          data_vencimento: "2025-01-01",
          descricao: "Carregando...",
          link_pagamento: "https://exemplo.com/pagamento/123",
          codigo_barras: "00000000000000000000000000000000000000000"
        }
      });
      setPreviewMessage(preview);
      return;
    }

    // Usar dados da primeira cobrança selecionada para o preview
    const firstCharge = selectedChargesData[0];
    const preview = processMessageTags(message, {
      customer: {
        name: firstCharge.customers?.name || "Cliente não informado",
        company: firstCharge.customers?.company || "",
        cpf_cnpj: firstCharge.customers?.cpf_cnpj || "",
        email: firstCharge.customers?.email || "",
        phone: firstCharge.customers?.phone || ""
      },
      charge: {
        valor: firstCharge.valor || 0,
        data_vencimento: firstCharge.data_vencimento || "",
        descricao: firstCharge.descricao || "",
        link_pagamento: firstCharge.link_pagamento || "",
        codigo_barras: firstCharge.codigo_barras || ""
      }
    });
    setPreviewMessage(preview);
  };

  useEffect(() => {
    if (!open) {
      // Reset fields when dialog closes
      setSelectedTemplateId("");
      setCustomMessage("");
      setPreviewMessage("");
      setMessageMode('custom');
      setSelectedChargesData([]);
    }
  }, [open]);

  // AIDEV-NOTE: Buscar dados das cobranças selecionadas para preview correto
  useEffect(() => {
    const fetchSelectedChargesData = async () => {
      if (!open || selectedCharges.length === 0 || !currentTenant?.id) {
        return;
      }

      try {
        const { data: chargesData, error } = await supabase
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
          .eq('tenant_id', currentTenant.id)
          .in('id', selectedCharges);

        if (error) {
          console.error('❌ Erro ao buscar dados das cobranças:', error);
          return;
        }

        setSelectedChargesData(chargesData || []);
      } catch (error) {
        console.error('❌ Erro ao buscar dados das cobranças:', error);
      }
    };

    fetchSelectedChargesData();
  }, [open, selectedCharges, currentTenant?.id]);

  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        generatePreview(template.message);
      }
    }
  }, [selectedTemplateId, templates]);

  // AIDEV-NOTE: Regenerar preview quando dados das cobranças são carregados
  useEffect(() => {
    if (selectedChargesData.length > 0) {
      if (messageMode === 'template' && selectedTemplateId && templates.length > 0) {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (template) {
          generatePreview(template.message);
        }
      } else if (messageMode === 'custom' && customMessage.trim()) {
        generatePreview(customMessage);
      }
    }
  }, [selectedChargesData, messageMode, selectedTemplateId, templates, customMessage]);

  // AIDEV-NOTE: Função para enviar mensagens com validação de segurança
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
      console.log(`🚀 [BulkMessageDialog] Iniciando envio - Modo: ${messageMode}, Mensagem: ${customMessage.substring(0, 30)}...`);
      
      if (messageMode === 'template') {
        console.log('📋 [BulkMessageDialog] Chamando onSendMessages com template:', selectedTemplateId);
        const result = await onSendMessages(selectedTemplateId);
        console.log('✅ [BulkMessageDialog] Resultado do envio via template:', result);
      } else {
        // Enviar mensagem customizada com um ID temporário
        const tempTemplateId = 'custom_' + Date.now();
        console.log('📝 [BulkMessageDialog] Enviando mensagem customizada:', tempTemplateId, customMessage);
        console.log('📞 [BulkMessageDialog] Chamando onSendMessages com:', { tempTemplateId, customMessage });
        
        const result = await onSendMessages(tempTemplateId, customMessage);
        console.log('✅ [BulkMessageDialog] Resultado do envio personalizado:', result);
      }
      
      console.log('🎉 [BulkMessageDialog] Envio concluído com sucesso, fechando diálogo');
      // Após o envio bem-sucedido, fechar o diálogo
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ [BulkMessageDialog] Erro ao enviar mensagens:', error);
      console.error('❌ [BulkMessageDialog] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 [BulkMessageDialog] Finalizando processo, setIsSubmitting(false)');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0">
        {/* AIDEV-NOTE: Cabeçalho com ícone e informações do cliente */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Enviar Mensagem</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Selecione um template ou escreva uma mensagem personalizada para enviar ao cliente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* AIDEV-NOTE: Informações do cliente em destaque */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Cliente:</span>
              <p className="text-gray-900 font-semibold">KLEVERSON SILVA JARA</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Telefone:</span>
              <p className="text-gray-900">(65) 99974-5637</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Valor:</span>
              <p className="text-gray-900 font-semibold text-green-600">R$ 300,00</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Vencimento:</span>
              <p className="text-gray-900">03/10/2025</p>
            </div>
          </div>
        </div>

        {/* AIDEV-NOTE: Conteúdo principal com seleção de modo */}
        <div className="px-6 py-6 space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Selecione um template ou escreva uma mensagem personalizada</Label>
            
            <RadioGroup 
              value={messageMode} 
              onValueChange={(value) => setMessageMode(value as 'template' | 'custom')}
              className="space-y-4"
            >
              {/* AIDEV-NOTE: Opção de template */}
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="template" id="template" />
                <Label htmlFor="template" className="font-medium">Usar Template</Label>
              </div>
              
              {messageMode === 'template' && (
                <div className="ml-6 space-y-3">
                  <Select
                    disabled={isTemplatesLoading}
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
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <p className="text-sm font-medium mb-2 text-gray-700">Preview da mensagem:</p>
                      <div className="text-sm text-gray-900 whitespace-pre-wrap">
                        {previewMessage || templates.find(t => t.id === selectedTemplateId)?.message || ""}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AIDEV-NOTE: Opção de mensagem personalizada */}
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-medium">Mensagem Personalizada</Label>
              </div>
            </RadioGroup>
          </div>

          {/* AIDEV-NOTE: Área de mensagem personalizada */}
          {messageMode === 'custom' && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">Mensagem Personalizada</Label>
              
              <div className="space-y-3">
                <div className="flex justify-end">
                  <TagSelector 
                    availableTags={availableTags}
                    onTagSelect={insertTag}
                  />
                </div>
                
                <Textarea
                  ref={textareaRef}
                  placeholder="Digite sua mensagem aqui..."
                  className="min-h-[120px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  value={customMessage}
                  onChange={(e) => {
                    setCustomMessage(e.target.value);
                    generatePreview(e.target.value);
                  }}
                />
                
                {customMessage && (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-medium mb-2 text-gray-700">Preview da mensagem:</p>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                      {previewMessage}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* AIDEV-NOTE: Rodapé com botões de ação */}
        <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSendMessage} 
            disabled={isSubmitting || isLoading || (messageMode === 'template' && !selectedTemplateId) || (messageMode === 'custom' && !customMessage.trim())}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            {(isSubmitting || isLoading) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando mensagem...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

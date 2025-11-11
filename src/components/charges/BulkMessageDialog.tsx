import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Loader2, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TagSelector } from "./TagSelector";
import { useToast } from '@/components/ui/use-toast';
import { processMessageTags } from '@/utils/messageUtils';
import { useSecureNotificationTemplates } from '@/hooks/useSecureNotificationTemplates'; // AIDEV-NOTE: Hook seguro para templates
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'; // AIDEV-NOTE: Hooks seguros para validação multi-tenant
import { supabase } from '@/lib/supabase'; // AIDEV-NOTE: Cliente Supabase para queries

interface MessageTemplate {
  id: string;
  name: string;
  message: string;
}

interface BulkMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCharges: string[];
  onSendMessages: (templateId: string, customMessage?: string) => Promise<void>;
  isLoading: boolean;
}

export function BulkMessageDialog({
  open,
  onOpenChange,
  selectedCharges,
  onSendMessages,
  isLoading
}: BulkMessageDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [messageMode, setMessageMode] = useState<'template' | 'custom'>('template');
  const [customMessage, setCustomMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null); // AIDEV-NOTE: Ref para acesso direto ao textarea
  const [previewMessage, setPreviewMessage] = useState("");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🛡️ HOOKS SEGUROS PARA VALIDAÇÃO MULTI-TENANT - Implementa todas as 5 camadas de segurança
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  // 🛡️ HOOK SEGURO PARA TEMPLATES - Implementa todas as 5 camadas de segurança
  const {
    templates,
    isLoading: isLoadingTemplates,
    error: templatesError
  } = useSecureNotificationTemplates({
    active: true // Apenas templates ativos
  });

  // AIDEV-NOTE: Validação crítica de segurança - verificar se há erro de acesso
  useEffect(() => {
    if (templatesError) {
      console.error('🚨 [SECURITY] Erro ao acessar templates:', templatesError);
      toast({
        title: "Erro de Acesso",
        description: "Não foi possível carregar os templates. Verifique suas permissões.",
        variant: "destructive"
      });
      onOpenChange(false);
    }
  }, [templatesError, onOpenChange, toast]);

  // AIDEV-NOTE: Query segura para buscar dados de preview das cobranças selecionadas
  const { data: previewChargeData, isLoading: isLoadingPreview, error: previewError } = useSecureTenantQuery(
    ['charge-preview', selectedCharges?.[0], currentTenant?.id],
    async () => {
      if (!selectedCharges || selectedCharges.length === 0) {
        console.log('🔍 [PREVIEW QUERY] Nenhuma cobrança selecionada para preview');
        return null;
      }
      
      console.log('🔍 [PREVIEW QUERY] Iniciando query para cobrança:', {
        chargeId: selectedCharges[0],
        tenantId: currentTenant?.id,
        hasAccess,
        selectedChargesCount: selectedCharges.length
      });
      
      const { data, error } = await supabase
        .from('charges')
        .select(`
          id,
          valor,
          data_vencimento,
          descricao,
          tenant_id,
          customers (
            id,
            name,
            email,
            phone,
            cpf_cnpj,
            company
          )
        `)
        .eq('id', selectedCharges[0])
        .single();
      
      if (error) {
        console.error('🚨 [PREVIEW QUERY ERROR] Erro na query de preview:', {
          error,
          chargeId: selectedCharges[0],
          tenantId: currentTenant?.id
        });
        throw error;
      }
      
      console.log('✅ [PREVIEW QUERY SUCCESS] Dados carregados com sucesso:', {
        chargeId: data?.id,
        hasCustomer: !!data?.customers,
        customerName: data?.customers?.name,
        tenantId: data?.tenant_id
      });
      
      return data;
    },
    {
      enabled: !!(selectedCharges && selectedCharges.length > 0 && currentTenant?.id && hasAccess),
      retry: 1,
      onError: (error) => {
        console.error('🚨 [PREVIEW QUERY] Erro capturado pelo onError:', error);
      }
    }
  );

  // AIDEV-NOTE: Função para gerar preview da mensagem - definida antes dos useEffects que a utilizam
  const generatePreview = useCallback(async (text: string) => {
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
        console.log('🔍 [GENERATE PREVIEW] Estado da query:', {
          isLoadingPreview,
          hasPreviewChargeData: !!previewChargeData,
          previewError: previewError?.message,
          selectedChargesCount: selectedCharges.length,
          firstChargeId: selectedCharges[0]
        });
        
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

          // AIDEV-NOTE: Log para debug dos dados antes de processar
          console.log('🔍 [PREVIEW DEBUG] Dados da cobrança completos:', chargeData);
          console.log('🔍 [PREVIEW DEBUG] Dados do customer:', chargeData.customers);
          
          // AIDEV-NOTE: Estrutura de dados correta para processMessageTags - mapeamento explícito
          const dataForProcessing = {
            customer: {
              name: chargeData.customers?.name,
              email: chargeData.customers?.email,
              phone: chargeData.customers?.phone,
              cpf_cnpj: chargeData.customers?.cpf_cnpj,
              // AIDEV-NOTE: Mapear Company (maiúsculo do banco) para company (minúsculo esperado pela função)
              company: chargeData.customers?.company
            },
            charge: {
              valor: chargeData.valor,
              data_vencimento: dueDate,
              descricao: chargeData.descricao,
              codigo_barras: chargeData.codigo_barras
            }
          };
          
          console.log('🔍 [PREVIEW DEBUG] Dados sendo enviados para processMessageTags:', dataForProcessing);
          console.log('🔍 [PREVIEW DEBUG] Verificação específica do campo company:', {
            'chargeData.customers?.Company (original)': chargeData.customers?.Company,
            'dataForProcessing.customer.company (mapeado)': dataForProcessing.customer.company,
            'typeof Company': typeof chargeData.customers?.company,
            'typeof company': typeof dataForProcessing.customer.company
          });
          
          const processedMessage = processMessageTags(text, dataForProcessing);

          setPreviewMessage(processedMessage);
        } else {
          const errorMessage = previewError 
            ? `❌ Erro ao carregar dados da cobrança: ${previewError.message}`
            : '❌ Erro ao carregar dados da cobrança para preview';
          
          console.error('🚨 [GENERATE PREVIEW] Falha ao carregar dados:', {
            previewError,
            selectedCharges,
            currentTenant: currentTenant?.id,
            hasAccess
          });
          
          setPreviewMessage(errorMessage);
        }
      } else {
        // AIDEV-NOTE: Preview com dados fictícios usando estrutura correta
        const processedMessage = processMessageTags(text, {
          customer: {
            name: 'João Silva',
            email: 'joao@email.com',
            phone: '(11) 99999-9999',
            cpf_cnpj: '123.456.789-00',
            company: 'Empresa Exemplo Ltda'
          },
          charge: {
            valor: 150.00,
            data_vencimento: '2024-01-15',
            descricao: 'Serviço de exemplo',
            codigo_barras: '00000000000000000000000000000000000000000000'
          }
        });
        setPreviewMessage(processedMessage);
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      setPreviewMessage(text);
    }
  }, [hasAccess, accessError, currentTenant, selectedCharges, isLoadingPreview, previewChargeData]);

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
  ];

  useEffect(() => {
    if (!open) {
      // Reset fields when dialog closes
      setSelectedTemplateId("");
      setCustomMessage("");
      setPreviewMessage("");
      setMessageMode('template');
    }
  }, [open]);

  // AIDEV-NOTE: useEffect para atualizar preview quando template é selecionado
  useEffect(() => {
    if (messageMode === 'template' && selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        generatePreview(template.message);
      }
    }
  }, [selectedTemplateId, templates, generatePreview, messageMode]);

  // AIDEV-NOTE: useEffect para atualizar preview quando mensagem customizada é alterada
  useEffect(() => {
    if (messageMode === 'custom' && customMessage) {
      generatePreview(customMessage);
    }
  }, [customMessage, generatePreview, messageMode]);

  // AIDEV-NOTE: useEffect para limpar e atualizar preview quando o modo muda
  useEffect(() => {
    if (messageMode === 'template') {
      // Se mudou para template, gerar preview do template selecionado
      if (selectedTemplateId && templates.length > 0) {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (template) {
          generatePreview(template.message);
        } else {
          setPreviewMessage("");
        }
      } else {
        setPreviewMessage("");
      }
    } else if (messageMode === 'custom') {
      // Se mudou para custom, gerar preview da mensagem digitada
      if (customMessage.trim()) {
        generatePreview(customMessage);
      } else {
        setPreviewMessage("");
      }
    }
  }, [messageMode, selectedTemplateId, templates, customMessage, generatePreview]);

  // AIDEV-NOTE: Templates são carregados automaticamente pelo hook seguro

  // AIDEV-NOTE: Função otimizada para inserir tags usando useRef
  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = customMessage;
    
    // AIDEV-NOTE: Inserir tag na posição do cursor
    const newValue = currentValue.substring(0, start) + tag + currentValue.substring(end);
    setCustomMessage(newValue);
    
    // AIDEV-NOTE: Restaurar foco e posição do cursor após a inserção
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + tag.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };





  const handleSendMessage = async () => {
    console.log('🚀 [BULK-MESSAGE-DIALOG] Iniciando handleSendMessage');
    console.log('📋 [BULK-MESSAGE-DIALOG] Estado atual:', {
      messageMode,
      selectedTemplateId,
      customMessage: customMessage.substring(0, 50) + '...',
      selectedChargesCount: selectedCharges?.length || 0
    });

    if (messageMode === 'template' && !selectedTemplateId) {
      console.log('❌ [BULK-MESSAGE-DIALOG] Erro: Template não selecionado');
      toast({
        title: "Selecione um template",
        description: "Por favor, selecione um modelo de mensagem.",
        variant: "destructive",
      });
      return;
    }

    if (messageMode === 'custom' && !customMessage.trim()) {
      console.log('❌ [BULK-MESSAGE-DIALOG] Erro: Mensagem customizada vazia');
      toast({
        title: "Digite uma mensagem",
        description: "Por favor, digite uma mensagem para enviar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log(`📝 [BULK-MESSAGE-DIALOG] Modo: ${messageMode}, Mensagem: ${customMessage.substring(0, 30)}...`);
      
      if (messageMode === 'template') {
        console.log('🎯 [BULK-MESSAGE-DIALOG] Chamando onSendMessages com template:', selectedTemplateId);
        await onSendMessages(selectedTemplateId);
        console.log('✅ [BULK-MESSAGE-DIALOG] onSendMessages (template) executado com sucesso');
      } else {
        // Enviar mensagem customizada com um ID temporário
        const tempTemplateId = 'custom_' + Date.now();
        console.log('🎯 [BULK-MESSAGE-DIALOG] Chamando onSendMessages com mensagem customizada:', tempTemplateId, customMessage);
        
        await onSendMessages(tempTemplateId, customMessage);
        console.log('✅ [BULK-MESSAGE-DIALOG] onSendMessages (custom) executado com sucesso');
      }
      
      console.log('🎉 [BULK-MESSAGE-DIALOG] Processo concluído, fechando diálogo');
      // Após o envio bem-sucedido, fechar o diálogo
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ [BULK-MESSAGE-DIALOG] Erro detalhado no handleSendMessage:', error);
      console.error('❌ [BULK-MESSAGE-DIALOG] Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      
      // AIDEV-NOTE: Feedback específico baseado no tipo de erro
      let title = "Erro ao enviar mensagem";
      let description = "Não foi possível enviar a mensagem. Tente novamente.";
      
      if (error instanceof Error) {
        if (error.message.includes('Token de autenticação')) {
          title = "Sessão expirada";
          description = "Sua sessão expirou. Faça login novamente.";
        } else if (error.message.includes('Acesso negado') || error.message.includes('permissões insuficientes')) {
          title = "Acesso negado";
          description = "Você não tem permissão para enviar mensagens. Contate o administrador.";
        } else if (error.message.includes('Dados da requisição inválidos')) {
          title = "Dados inválidos";
          description = "Verifique se todas as cobranças e o template estão corretos.";
        } else if (error.message.includes('Erro interno do servidor')) {
          title = "Erro de configuração";
          description = "Problema na configuração do sistema. Contate o suporte técnico.";
        } else if (error.message.includes('Serviço temporariamente indisponível')) {
          title = "Serviço indisponível";
          description = "O serviço está temporariamente indisponível. Tente novamente em alguns minutos.";
        } else if (error.message.includes('Falha após todas as tentativas')) {
          title = "Falha persistente";
          description = "Múltiplas tentativas falharam. Verifique sua conexão e tente novamente.";
        } else {
          // Usar a mensagem de erro específica se disponível
          description = error.message || description;
        }
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      console.log('🏁 [BULK-MESSAGE-DIALOG] Finalizando handleSendMessage');
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
                <p className="font-medium">Enviando mensagens...</p>
                <p className="text-sm text-muted-foreground">Processando {selectedCharges?.length || 0} cobranças</p>
              </div>
            </div>
          </div>
        )}
        
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Enviar mensagem ({selectedCharges?.length || 0})</DialogTitle>
          <DialogDescription>
            Selecione um modelo de mensagem para enviar para as cobranças selecionadas.
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
                  // AIDEV-NOTE: Removido generatePreview daqui - agora é gerenciado pelo useEffect
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
                Processando...
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

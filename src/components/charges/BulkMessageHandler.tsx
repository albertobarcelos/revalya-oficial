import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { processMessageTags } from '@/utils/messageUtils';
import { BulkMessageDialog } from './BulkMessageDialog';
import { useCurrentTenant } from '@/hooks/useZustandTenant';
import { useEvolutionApiConfig } from '@/hooks/useEvolutionApiConfig';
import { edgeFunctionService } from '@/services/edgeFunctionService';
import type { Cobranca } from '@/types/database';
// AIDEV-NOTE: Hook obrigatório para segurança multi-tenant e serviço Edge Function

interface BulkMessageHandlerProps {
  selectedCharges: string[];
  charges: Cobranca[];
}

export const BulkMessageHandler: React.FC<BulkMessageHandlerProps> = ({
  selectedCharges,
  charges,
}) => {
  const [showBulkMessageDialog, setShowBulkMessageDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { currentTenant } = useCurrentTenant();
  const evolutionConfig = useEvolutionApiConfig();

  const handleSendBulkMessages = async (templateId: string, customMessage?: string) => {
    try {
      console.log('🚀 Iniciando envio de mensagens em massa via Edge Function');
      console.log('📝 Template ID:', templateId);
      console.log('📝 Mensagem customizada:', customMessage ? 'Sim' : 'Não');
      console.log('🎯 Cobranças selecionadas:', selectedCharges);
      
      setIsSending(true);

      // AIDEV-NOTE: Validação de configuração Evolution API
      if (!evolutionConfig.isConfigured) {
        console.error('❌ Configuração Evolution API inválida:', evolutionConfig.errors);
        throw new Error(`Configuração Evolution API inválida: ${evolutionConfig.errors.join(', ')}`);
      }

      // AIDEV-NOTE: Validação de segurança multi-tenant obrigatória
      if (!currentTenant?.id) {
        throw new Error('Tenant não definido - violação de segurança');
      }

      // AIDEV-NOTE: Verificar se é mensagem customizada
      let finalTemplateId = templateId;
      
      if (customMessage && templateId.startsWith('custom_')) {
        console.log('📝 Criando template temporário para mensagem customizada');
        
        // AIDEV-NOTE: Criar template temporário para mensagem customizada
        const { data: tempTemplate, error: tempTemplateError } = await supabase
          .from('notification_templates')
          .insert({
            tenant_id: currentTenant.id,
            name: `Mensagem Customizada - ${new Date().toLocaleString('pt-BR')}`,
            message: customMessage,
            is_temporary: true,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (tempTemplateError) {
          console.error('❌ Erro ao criar template temporário:', tempTemplateError);
          throw new Error('Erro ao criar template temporário para mensagem customizada');
        }

        finalTemplateId = tempTemplate.id;
        console.log('✅ Template temporário criado:', finalTemplateId);
      }

      // AIDEV-NOTE: Chamar Edge Function com segurança JWT + RLS
      console.log('🔄 Chamando Edge Function send-bulk-messages...');
      const result = await edgeFunctionService.sendBulkMessages(
        selectedCharges,
        finalTemplateId,
        true // sendImmediately
      );

      console.log('✅ Resultado da Edge Function:', result);

      // AIDEV-NOTE: Processar resultado e exibir feedback detalhado
      if (result.success) {
        const { summary } = result;
        
        toast({
          title: 'Mensagens processadas',
          description: `${summary.sent} mensagens enviadas com sucesso de ${summary.total} total. ${summary.failed > 0 ? `${summary.failed} falharam.` : ''}`,
        });

        // AIDEV-NOTE: Log detalhado para debug
        if (summary.failed > 0) {
          console.warn('⚠️ Algumas mensagens falharam:', result.results.failed);
        }
        
        if (result.results.processingErrors.length > 0) {
          console.warn('⚠️ Erros de processamento:', result.results.processingErrors);
        }
      } else {
        throw new Error('Edge Function retornou sucesso = false');
      }

      // AIDEV-NOTE: Limpar template temporário se foi criado
      if (customMessage && templateId.startsWith('custom_') && finalTemplateId !== templateId) {
        try {
          await supabase
            .from('notification_templates')
            .delete()
            .eq('id', finalTemplateId)
            .eq('tenant_id', currentTenant.id)
            .eq('is_temporary', true);
          
          console.log('🗑️ Template temporário removido:', finalTemplateId);
        } catch (cleanupError) {
          console.warn('⚠️ Erro ao limpar template temporário:', cleanupError);
          // Não falhar o processo por causa da limpeza
        }
      }

    } catch (error) {
      console.error('❌ Erro detalhado no envio de mensagens:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      
      // AIDEV-NOTE: Tratamento de erro mais específico
      let errorMessage = 'Ocorreu um erro ao enviar as mensagens. Tente novamente.';
      
      if (error instanceof Error) {
        if (error.message.includes('Tenant não encontrado')) {
          errorMessage = 'Sessão expirada. Faça login novamente.';
        } else if (error.message.includes('EVOLUTION_API')) {
          errorMessage = 'Configuração da API Evolution não encontrada. Verifique as configurações.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Erro ao enviar mensagens',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 Finalizando processo de envio');
      setIsSending(false);
      setShowBulkMessageDialog(false);
    }
  };

  return (
    <>
      {selectedCharges.length > 0 && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={() => setShowBulkMessageDialog(true)}
            disabled={!evolutionConfig.isConfigured}
            title={!evolutionConfig.isConfigured ? `Configuração Evolution API inválida: ${evolutionConfig.errors.join(', ')}` : undefined}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Enviar Mensagem ({selectedCharges.length})
            {!evolutionConfig.isConfigured && (
              <span className="ml-2 text-red-500">⚠️</span>
            )}
          </Button>
        </div>
      )}

      <BulkMessageDialog
        open={showBulkMessageDialog}
        onOpenChange={setShowBulkMessageDialog}
        selectedCharges={selectedCharges}
        onSendMessages={handleSendBulkMessages}
        isLoading={isSending}
      />
    </>
  );
};

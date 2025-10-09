import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { processMessageTags } from '@/utils/messageUtils';
import { BulkMessageDialog } from './BulkMessageDialog';
import { useCurrentTenant } from '@/hooks/useZustandTenant';
import { useEvolutionApiConfig } from '@/hooks/useEvolutionApiConfig';
import { edgeFunctionService } from '@/services/edgeFunctionService';
import { useSecureNotificationTemplates } from '@/hooks/useSecureNotificationTemplates';
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
  
  // 🛡️ HOOK SEGURO PARA TEMPLATES - Implementa todas as 5 camadas de segurança
  // AIDEV-NOTE: Removido createTemplate e deleteTemplate pois não são mais necessários para mensagens customizadas
  const { } = useSecureNotificationTemplates();

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

      // AIDEV-NOTE: Processar mensagem customizada diretamente sem criar template temporário
      console.log('🔄 Chamando Edge Function send-bulk-messages...');
      const result = await edgeFunctionService.sendBulkMessages(
        selectedCharges,
        templateId,
        true, // sendImmediately
        customMessage // Passar mensagem customizada diretamente
      );

      console.log('✅ Resultado da Edge Function:', result);

      // AIDEV-NOTE: Processar resultado e exibir feedback detalhado
      if (result.success) {
        const { summary, results } = result;
        
        toast({
          title: 'Mensagens processadas',
          description: `${summary.sent} mensagens enviadas com sucesso de ${summary.total} total. ${summary.failed > 0 ? `${summary.failed} falharam.` : ''}`,
        });

        // AIDEV-NOTE: Log detalhado para debug - usando o shape correto do BulkMessageResponse
        if (summary.failed > 0 && results) {
          const failedResults = results.filter(r => !r.success);
          console.warn('⚠️ Algumas mensagens falharam:', failedResults);
          
          // Log das mensagens de erro específicas
          failedResults.forEach(failed => {
            if (failed.message) {
              console.warn(`❌ Cobrança ${failed.charge_id}: ${failed.message}`);
            }
          });
        }
      } else {
        throw new Error('Edge Function retornou sucesso = false');
      }

      // AIDEV-NOTE: Não há mais necessidade de limpeza de templates temporários

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

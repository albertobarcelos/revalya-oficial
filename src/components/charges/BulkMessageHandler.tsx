import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { processMessageTags } from '@/utils/messageUtils';
import { BulkMessageDialog } from './BulkMessageDialog';
import { useCurrentTenant } from '@/hooks/useZustandTenant';
import type { Cobranca } from '@/types/database';
// AIDEV-NOTE: Hook obrigatório para segurança multi-tenant

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

  const handleSendBulkMessages = async (templateId: string) => {
    try {
      console.log('🚀 Iniciando envio de mensagens em massa');
      console.log('📝 Template ID:', templateId);
      console.log('🎯 Cobranças selecionadas:', selectedCharges);
      
      setIsSending(true);

      // AIDEV-NOTE: Validação de segurança multi-tenant obrigatória
      if (!currentTenant?.id) {
        throw new Error('Tenant não definido - violação de segurança');
      }
      
      const { data: selectedChargesData, error: chargesError } = await supabase
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

      if (chargesError) {
        console.error('❌ Erro ao buscar dados das cobranças:', chargesError);
        throw new Error('Erro ao buscar dados das cobranças');
      }

      console.log('✅ Dados das cobranças carregados:', selectedChargesData);

      const { data: templateData, error: templateError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('id', templateId)
        .single();

      if (templateError) {
        console.error('❌ Erro ao buscar template:', templateError);
        throw new Error('Erro ao buscar template');
      }

      console.log('✅ Template carregado:', templateData);

      const messages = selectedChargesData.map(charge => {
        const processedMessage = processMessageTags(templateData.message, {
          customer: charge.customer || {},
          charge: charge
        });

        return {
          customer: {
            name: charge.customer?.name,
            phone: charge.customer?.phone?.replace(/\D/g, ''),
            document: charge.customer?.cpf_cnpj?.toString().replace(/\D/g, '') || '',
          },
          charge: {
            id: charge.id,
            amount: charge.valor,
            dueDate: charge.data_vencimento,
            status: charge.status,
          },
          template: {
            id: templateId,
            message: processedMessage,
          }
        };
      });

      console.log('✅ Mensagens processadas:', messages);
      console.log('🌐 Enviando requisição para:', 'https://n8n-wh.nexsyn.com.br/webhook/asaas/messages');
      console.log('📦 Payload:', JSON.stringify({
        messages,
        templateId,
      }, null, 2));

      const response = await fetch('https://n8n-wh.nexsyn.com.br/webhook/asaas/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          messages,
          templateId,
        }),
      });

      console.log('📡 Status da resposta:', response.status);
      const responseText = await response.text();
      console.log('📡 Resposta completa:', responseText);

      if (!response.ok) {
        console.error('❌ Erro na resposta do servidor:', response.status, responseText);
        throw new Error(responseText || `Failed to send messages: ${response.statusText}`);
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('✅ Resultado do envio:', result);
      } catch (e) {
        console.warn('⚠️ Resposta não é um JSON válido:', responseText);
      }

      toast({
        title: 'Mensagens enviadas',
        description: 'As mensagens foram enviadas com sucesso!',
      });
    } catch (error) {
      console.error('❌ Erro detalhado:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      toast({
        title: 'Erro ao enviar mensagens',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao enviar as mensagens. Tente novamente.',
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
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Enviar Mensagem ({selectedCharges.length})
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

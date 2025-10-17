import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Printer, FileText, X, Shield, CheckCircle, CreditCard, QrCode, Banknote } from 'lucide-react';
import { useChargeDetails } from '@/hooks/useChargeDetails';
import { useMessageHistory } from '@/hooks/useMessageHistory';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { useChargeActions } from '@/hooks/useChargeActions';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { ChargeCustomerInfo } from './ChargeCustomerInfo';
import { ChargePaymentDetails } from './ChargePaymentDetails';
import { ChargeMessageHistory } from './ChargeMessageHistory';
import { ChargePaymentHistory } from './ChargePaymentHistory';
import { ChargeItemsList } from './ChargeItemsList';
import { SendMessageModal } from './SendMessageModal';

interface ChargeDetailsProps {
  charge: {
    id: string;
  } | null;
  onRefresh: () => void;
}

export function ChargeDetails({ charge, onRefresh }: ChargeDetailsProps) {
  // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA (CAMADA 1)
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showPaymentTypeModal, setShowPaymentTypeModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);

  const { chargeDetails, isLoading: isLoadingCharge, refreshChargeDetails } = useChargeDetails(charge?.id || null);
  const { messageHistory, isLoading: isLoadingMessages } = useMessageHistory(charge?.id || null);
  const { paymentHistory, isLoading: isLoadingPayments } = usePaymentHistory(charge?.id || null);
  const { cancelCharge, printBoleto, copyPixCode, sendMessage, markAsPaid, isUpdating } = useChargeActions();
  
  // 🔍 LOGS DE AUDITORIA OBRIGATÓRIOS
  console.log('🔍 ChargeDetails - Dados dos hooks:', {
    chargeId: charge?.id,
    chargeDetails,
    isLoadingCharge,
    messageHistoryCount: messageHistory?.length || 0,
    paymentHistoryCount: paymentHistory?.length || 0,
    isLoadingMessages,
    isLoadingPayments,
    hasAccess,
    currentTenant: currentTenant?.name,
    tenantId: currentTenant?.id
  });

  // 🚨 GUARD CLAUSE OBRIGATÓRIA - VERIFICAÇÃO DE ACESSO
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Acesso Negado</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{accessError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!charge) return null;

  const handleCancelCharge = async () => {
    setIsCancelling(true);
    try {
      await cancelCharge(charge.id);
      refreshChargeDetails();
      onRefresh();
    } finally {
      setIsCancelling(false);
    }
  };

  // AIDEV-NOTE: Abre o modal de envio de mensagem ao invés de enviar diretamente
  const handleSendMessage = () => {
    setShowSendMessageModal(true);
  };

  // AIDEV-NOTE: Função para processar o envio de mensagem com template ou mensagem customizada
  const handleConfirmSendMessage = async (templateId?: string, customMessage?: string) => {
    setIsSendingMessage(true);
    try {
      await sendMessage(charge.id, templateId, customMessage);
      refreshChargeDetails();
      setShowSendMessageModal(false);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handlePrintBoleto = () => {
    if (chargeDetails?.boleto_url) {
      printBoleto(chargeDetails.boleto_url);
    }
  };

  const handleCopyPixCode = () => {
    if (chargeDetails?.pix_code) {
      copyPixCode(chargeDetails.pix_code);
    }
  };

  // AIDEV-NOTE: Função para abrir modal de seleção do tipo de recebimento
  const handleMarkAsPaid = () => {
    setShowPaymentTypeModal(true);
  };

  // AIDEV-NOTE: Função para processar baixa com tipo específico de recebimento
  const handleConfirmPayment = async (paymentType: 'PIX' | 'BOLETO' | 'DINHEIRO' | 'CARTAO_CREDITO') => {
    try {
      await markAsPaid(charge.id, paymentType);
      refreshChargeDetails();
      onRefresh();
      setShowPaymentTypeModal(false);
    } catch (error) {
      console.error('Erro ao dar baixa na cobrança:', error);
    }
  };

  if (isLoadingCharge) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChargeCustomerInfo
        chargeDetails={chargeDetails}
        onSendMessage={handleSendMessage}
      />

      <ChargePaymentDetails chargeDetails={chargeDetails} />

      <ChargeItemsList 
        description={chargeDetails?.descricao || ''} 
        contractServices={chargeDetails?.contract?.contract_services || []}
        contractProducts={chargeDetails?.contract?.contract_products || []}
      />

      <Tabs defaultValue="messages">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="messages">Histórico de Mensagens</TabsTrigger>
          <TabsTrigger value="payments">Histórico de Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="border rounded-md p-4">
          <ChargeMessageHistory
            messages={messageHistory}
            isLoading={isLoadingMessages}
          />
        </TabsContent>

        <TabsContent value="payments" className="border rounded-md p-4">
          <ChargePaymentHistory
            payments={paymentHistory}
            isLoading={isLoadingPayments}
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-4 mt-6">
        {/* AIDEV-NOTE: Botão para dar baixa na cobrança - só aparece se não estiver paga ou cancelada */}
        {chargeDetails?.status !== "PAID" && 
         chargeDetails?.status !== "CANCELLED" && 
         chargeDetails?.status !== "RECEIVED" &&
         chargeDetails?.status !== "RECEIVED_PIX" &&
         chargeDetails?.status !== "RECEIVED_BOLETO" &&
         chargeDetails?.status !== "RECEIVED_IN_CASH" && (
          <Button 
            variant="default" 
            onClick={handleMarkAsPaid} 
            disabled={isUpdating}
            className="bg-green-600 hover:bg-green-700"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Realizar Recebimento
          </Button>
        )}

        {chargeDetails?.status !== "PAID" && chargeDetails?.status !== "CANCELLED" && (
          <Button variant="destructive" onClick={handleCancelCharge} disabled={isCancelling}>
            {isCancelling ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <X className="h-4 w-4 mr-2" />
            )}
            Cancelar Cobrança
          </Button>
        )}

        {chargeDetails?.status !== "CANCELLED" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {chargeDetails?.payment_type === "BOLETO" && chargeDetails?.boleto_url && (
              <Button variant="outline" onClick={handlePrintBoleto}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Boleto
              </Button>
            )}
            {chargeDetails?.payment_type === "PIX" && chargeDetails?.pix_code && (
              <Button variant="outline" onClick={handleCopyPixCode}>
                <FileText className="h-4 w-4 mr-2" />
                Copiar Código PIX
              </Button>
            )}
          </div>
        )}
      </div>

      {/* AIDEV-NOTE: Modal elegante para seleção do tipo de recebimento */}
      <Dialog open={showPaymentTypeModal} onOpenChange={setShowPaymentTypeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirmar Recebimento
            </DialogTitle>
            <DialogDescription>
              Selecione como esta cobrança foi recebida para dar baixa no sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4">
            {/* Opção PIX */}
            <Button
              variant="outline"
              className="h-16 justify-start gap-4 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
              onClick={() => handleConfirmPayment('PIX')}
              disabled={isUpdating}
            >
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <QrCode className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">PIX</div>
                <div className="text-sm text-muted-foreground">Recebido via PIX</div>
              </div>
            </Button>

            {/* Opção Boleto */}
            <Button
              variant="outline"
              className="h-16 justify-start gap-4 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200"
              onClick={() => handleConfirmPayment('BOLETO')}
              disabled={isUpdating}
            >
              <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Boleto</div>
                <div className="text-sm text-muted-foreground">Recebido via boleto bancário</div>
              </div>
            </Button>

            {/* Opção Dinheiro */}
            <Button
              variant="outline"
              className="h-16 justify-start gap-4 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
              onClick={() => handleConfirmPayment('DINHEIRO')}
              disabled={isUpdating}
            >
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Dinheiro</div>
                <div className="text-sm text-muted-foreground">Recebido em dinheiro</div>
              </div>
            </Button>

            {/* Opção Cartão de Crédito */}
            <Button
              variant="outline"
              className="h-16 justify-start gap-4 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
              onClick={() => handleConfirmPayment('CARTAO_CREDITO')}
              disabled={isUpdating}
            >
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Cartão de Crédito</div>
                <div className="text-sm text-muted-foreground">Recebido via cartão de crédito</div>
              </div>
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentTypeModal(false)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AIDEV-NOTE: Modal para envio de mensagem com seleção de template ou mensagem customizada */}
      <SendMessageModal
        isOpen={showSendMessageModal}
        onClose={() => setShowSendMessageModal(false)}
        onSendMessage={handleConfirmSendMessage}
        isLoading={isSendingMessage}
        charge={chargeDetails}
      />
    </div>
  );
}
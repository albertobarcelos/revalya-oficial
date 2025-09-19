import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Printer, FileText, X } from 'lucide-react';
import { useChargeDetails } from '@/hooks/useChargeDetails';
import { useMessageHistory } from '@/hooks/useMessageHistory';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { useChargeActions } from '@/hooks/useChargeActions';
import { ChargeCustomerInfo } from './ChargeCustomerInfo';
import { ChargePaymentDetails } from './ChargePaymentDetails';
import { ChargeMessageHistory } from './ChargeMessageHistory';
import { ChargePaymentHistory } from './ChargePaymentHistory';

interface ChargeDetailsProps {
  charge: {
    id: string;
  } | null;
  onRefresh: () => void;
}

export function ChargeDetails({ charge, onRefresh }: ChargeDetailsProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const { chargeDetails, isLoading: isLoadingCharge, refreshChargeDetails } = useChargeDetails(charge?.id || null);
  const { messageHistory, isLoading: isLoadingMessages } = useMessageHistory(charge?.id || null);
  const { paymentHistory, isLoading: isLoadingPayments } = usePaymentHistory(charge?.id || null);
  const { cancelCharge, printBoleto, copyPixCode, sendMessage } = useChargeActions();
  
  // AIDEV-NOTE: Debug - Log dos dados carregados pelos hooks
  console.log('🔍 ChargeDetails - Dados dos hooks:', {
    chargeId: charge?.id,
    chargeDetails,
    isLoadingCharge,
    messageHistoryCount: messageHistory?.length || 0,
    paymentHistoryCount: paymentHistory?.length || 0,
    isLoadingMessages,
    isLoadingPayments
  });

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

  const handleSendMessage = async () => {
    setIsSendingMessage(true);
    try {
      await sendMessage(charge.id);
      refreshChargeDetails();
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
    </div>
  );
}
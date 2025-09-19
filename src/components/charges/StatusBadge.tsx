import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string | null;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const translateStatus = (status: string | null): string => {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'Pendente',
      'RECEIVED': 'Recebido',
      'CONFIRMED': 'Confirmado',
      'OVERDUE': 'Vencido',
      'REFUNDED': 'Reembolsado',
      'RECEIVED_IN_CASH': 'Recebido em Dinheiro',
      'REFUND_REQUESTED': 'Reembolso Solicitado',
      'REFUND_IN_PROGRESS': 'Reembolso em Andamento',
      'CHARGEBACK_REQUESTED': 'Estorno Solicitado',
      'CHARGEBACK_DISPUTE': 'Disputa de Estorno',
      'AWAITING_CHARGEBACK_REVERSAL': 'Aguardando Reversão de Estorno',
      'DUNNING_REQUESTED': 'Cobrança Solicitada',
      'DUNNING_RECEIVED': 'Cobrança Recebida',
      'AWAITING_RISK_ANALYSIS': 'Aguardando Análise de Risco',
      'CANCELLED': 'Cancelado'
    };
    return statusMap[status || ''] || status || 'Desconhecido';
  };

  switch (status?.toUpperCase()) {
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200">
          <Clock className="w-3 h-3 mr-1" />
          {translateStatus(status)}
        </Badge>
      );
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'DUNNING_RECEIVED':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {translateStatus(status)}
        </Badge>
      );
    case 'RECEIVED_IN_CASH':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Pago Dinheiro
        </Badge>
      );
    case 'RECEIVED_PIX':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Pago PIX
        </Badge>
      );
    case 'RECEIVED_BOLETO':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Pago Boleto
        </Badge>
      );
    case 'OVERDUE':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
    case 'DUNNING_REQUESTED':
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {translateStatus(status)}
        </Badge>
      );
    case 'CANCELLED':
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'REFUND_IN_PROGRESS':
    case 'AWAITING_CHARGEBACK_REVERSAL':
      return (
        <Badge variant="secondary">
          <XCircle className="w-3 h-3 mr-1" />
          {translateStatus(status)}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {translateStatus(status)}
        </Badge>
      );
  }
};

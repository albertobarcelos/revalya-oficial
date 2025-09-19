import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, CreditCard, FileText, Receipt } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Cobranca } from '@/types';

interface ChargePaymentDetailsProps {
  chargeDetails: Cobranca | null;
}

function ChargePaymentDetailsComponent({ chargeDetails }: ChargePaymentDetailsProps) {
  if (!chargeDetails) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
      case 'OVERDUE':
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Valor</h3>
          <p className="text-xl font-bold">{formatCurrency(parseFloat(chargeDetails.valor) || 0)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Vencimento</h3>
          <p className="text-lg">{formatDate(chargeDetails.data_vencimento)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
          <div className="mt-1">{getStatusBadge(chargeDetails.status)}</div>
        </div>
      </div>

      {chargeDetails.description && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Descrição</h3>
          <p className="p-2 bg-muted rounded-md mt-1">{chargeDetails.descricao}</p>
        </div>
      )}

      {chargeDetails.status === "OVERDUE" && (
        <div className="mb-4 p-3 bg-destructive/10 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">
            Esta cobrança está vencida desde {formatDate(chargeDetails.data_vencimento)}
          </p>
        </div>
      )}

      <div className="flex items-center space-x-2 mt-2">
        <Badge
          className={`
            ${chargeDetails.tipo === 'BOLETO' ? 'bg-blue-100 text-blue-800' :
              chargeDetails.tipo === 'PIX' ? 'bg-green-100 text-green-800' :
              chargeDetails.tipo === 'CREDIT_CARD' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'}
          `}
        >
          {chargeDetails.tipo === 'BOLETO' ? (
            <Receipt className="h-3 w-3 mr-1" />
          ) : chargeDetails.tipo === 'PIX' ? (
            <FileText className="h-3 w-3 mr-1" />
          ) : chargeDetails.tipo === 'CREDIT_CARD' ? (
            <CreditCard className="h-3 w-3 mr-1" />
          ) : (
            <Calendar className="h-3 w-3 mr-1" />
          )}
          {chargeDetails.tipo}
        </Badge>
      </div>
    </div>
  );
}

export const ChargePaymentDetails = memo(ChargePaymentDetailsComponent);
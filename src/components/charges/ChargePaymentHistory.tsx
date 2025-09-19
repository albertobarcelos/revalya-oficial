import { memo } from 'react';
import { Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { PaymentHistory } from '@/hooks/usePaymentHistory';

interface ChargePaymentHistoryProps {
  payments: PaymentHistory[];
  isLoading: boolean;
}

function ChargePaymentHistoryComponent({ payments, isLoading }: ChargePaymentHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-3">
            <div className="flex justify-between">
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p>Nenhum pagamento registrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <div key={payment.id} className="bg-card border rounded-lg p-3">
          <div className="flex justify-between">
            <div>
              <p className="font-medium">
                {format(new Date(payment.paid_at), 'dd/MM/yyyy')}
              </p>
              <p className="text-sm text-muted-foreground">{payment.payment_method}</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-green-600">
                {formatCurrency(payment.amount)}
              </p>
              <p className="text-xs text-muted-foreground">{payment.transaction_id}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const ChargePaymentHistory = memo(ChargePaymentHistoryComponent);
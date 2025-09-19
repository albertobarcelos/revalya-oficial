import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, CreditCard, Landmark, QrCode, Receipt } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useCurrentTenant } from '@/hooks/useZustandTenant';
// AIDEV-NOTE: Hook obrigatório para segurança multi-tenant

interface PaymentHistoryProps {
  chargeId: string;
}

export function PaymentHistory({ chargeId }: PaymentHistoryProps) {
  // AIDEV-NOTE: Hook obrigatório para segurança multi-tenant
  const { currentTenant } = useCurrentTenant();
  
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payment-history', chargeId, currentTenant?.id],
    queryFn: async () => {
      // AIDEV-NOTE: Validação de segurança multi-tenant obrigatória
      if (!currentTenant?.id) {
        console.error('Tenant não definido - violação de segurança');
        return [];
      }
      
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('charge_id', chargeId)
        .eq('tenant_id', currentTenant.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id && !!chargeId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!payments?.length) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Nenhum pagamento registrado para esta cobrança.
      </div>
    );
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'credit_card':
        return <CreditCard className="h-4 w-4" />;
      case 'bank_slip':
        return <Landmark className="h-4 w-4" />;
      case 'pix':
        return <QrCode className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'credit_card':
        return 'Cartão de Crédito';
      case 'bank_slip':
        return 'Boleto Bancário';
      case 'pix':
        return 'PIX';
      case 'cash':
        return 'Dinheiro';
      default:
        return method || 'Desconhecido';
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>ID Transação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                {payment.payment_date
                  ? format(new Date(payment.payment_date), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })
                  : 'N/A'}
              </TableCell>
              <TableCell>{formatCurrency(payment.amount)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getPaymentMethodIcon(payment.payment_method)}
                  <span>{getPaymentMethodName(payment.payment_method)}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={payment.status === 'confirmed' ? 'secondary' : 'outline'}
                >
                  {payment.status === 'confirmed' ? 'Confirmado' : payment.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {payment.transaction_id || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

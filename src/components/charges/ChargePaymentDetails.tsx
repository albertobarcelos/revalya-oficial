import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, CreditCard, FileText, Receipt, Smartphone, Building2, Banknote, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Cobranca } from '@/types';

interface ChargePaymentDetailsProps {
  chargeDetails: Cobranca | null;
}

function ChargePaymentDetailsComponent({ chargeDetails }: ChargePaymentDetailsProps) {
  if (!chargeDetails) return null;

  // AIDEV-NOTE: Função para formatar tipos de pagamento para exibição amigável
  const formatPaymentType = (type: string): string => {
    if (!type) return 'Não informado';
    
    const typeMap: Record<string, string> = {
      'CREDIT_CARD': 'Cartão de Crédito',
      'CREDIT_CARD_RECURRING': 'Cartão Recorrente',
      'BOLETO': 'Boleto Bancário',
      'PIX': 'PIX',
      'CASH': 'Dinheiro',
      'TRANSFER': 'Transferência',
      'DEBIT_CARD': 'Cartão de Débito',
      // Valores em português (caso já venham formatados)
      'Cartão': 'Cartão de Crédito',
      'Boleto': 'Boleto Bancário',
      'Dinheiro': 'Dinheiro',
      'Transferência': 'Transferência Bancária'
    };
    
    return typeMap[type] || type;
  };

  // AIDEV-NOTE: Função para obter ícone do método de pagamento
  const getPaymentIcon = (type: string) => {
    const normalizedType = type?.toUpperCase() || '';
    
    switch (normalizedType) {
      case 'CREDIT_CARD':
      case 'CREDIT_CARD_RECURRING':
      case 'DEBIT_CARD':
        return <CreditCard className="h-3 w-3 mr-1" />;
      case 'PIX':
        return <Smartphone className="h-3 w-3 mr-1" />;
      case 'BOLETO':
        return <Building2 className="h-3 w-3 mr-1" />;
      case 'CASH':
        return <Banknote className="h-3 w-3 mr-1" />;
      case 'TRANSFER':
        return <Building2 className="h-3 w-3 mr-1" />;
      default:
        return <DollarSign className="h-3 w-3 mr-1" />;
    }
  };

  // AIDEV-NOTE: Função para obter cores específicas para cada tipo de pagamento
  const getPaymentTypeColor = (type: string): string => {
    const normalizedType = type?.toUpperCase() || '';
    
    switch (normalizedType) {
      case 'CREDIT_CARD':
      case 'CREDIT_CARD_RECURRING':
      case 'DEBIT_CARD':
        return 'bg-purple-100 text-purple-800';
      case 'PIX':
        return 'bg-green-100 text-green-800';
      case 'BOLETO':
        return 'bg-blue-100 text-blue-800';
      case 'CASH':
        return 'bg-orange-100 text-orange-800';
      case 'TRANSFER':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // AIDEV-NOTE: Função para extrair informação de parcelas da descrição
  const extractInstallmentInfo = (description: string): string => {
    if (!description) return 'N/A';
    
    // Regex para capturar "Parcela X/Y" da descrição
    const installmentMatch = description.match(/Parcela (\d+)\/(\d+)/i);
    
    if (installmentMatch) {
      const currentInstallment = installmentMatch[1];
      const totalInstallments = installmentMatch[2];
      return `${currentInstallment}/${totalInstallments}`;
    }
    
    return 'N/A';
  };

  const installmentInfo = extractInstallmentInfo(chargeDetails.descricao || '');

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Valor</h3>
          <p className="text-xl font-bold">{formatCurrency(parseFloat(chargeDetails.valor) || 0)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Vencimento</h3>
          <p className="text-lg">{formatDate(chargeDetails.data_vencimento)}</p>
        </div>
        {installmentInfo !== 'N/A' && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Parcelas</h3>
            <p className="text-lg font-medium">{installmentInfo}</p>
          </div>
        )}
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

      {/* AIDEV-NOTE: Badge de método de pagamento com formatação adequada e ícones */}
      <div className="flex items-center space-x-2 mt-2">
        <Badge className={`${getPaymentTypeColor(chargeDetails.tipo)} flex items-center`}>
          {getPaymentIcon(chargeDetails.tipo)}
          {formatPaymentType(chargeDetails.tipo)}
        </Badge>
      </div>
    </div>
  );
}

export const ChargePaymentDetails = memo(ChargePaymentDetailsComponent);

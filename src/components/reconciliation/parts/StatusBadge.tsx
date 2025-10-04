// =====================================================
// STATUS BADGE COMPONENT
// Descrição: Componente extraído de ReconciliationTable para renderizar badges de status
// Responsabilidade: Renderizar badges de status de reconciliação e pagamento
// =====================================================

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { 
  ReconciliationStatus, 
  PaymentStatus, 
  ReconciliationSource 
} from '@/types/reconciliation';
import { StatusBadgeProps } from '../types/table-parts';

// AIDEV-NOTE: Componente extraído de ReconciliationTable para melhor organização
// Responsabilidade: Renderizar badges de status com cores e ícones apropriados
// Props: status (obrigatório), paymentStatus (opcional), className (opcional)
// Estado: Stateless - componente puro

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  paymentStatus, 
  className = '' 
}) => {
  
  // AIDEV-NOTE: Configuração de status de reconciliação com ícones e cores
  const getReconciliationStatusBadge = (status: ReconciliationStatus) => {
    const statusConfig = {
      [ReconciliationStatus.PENDING]: {
        label: 'Pendente',
        variant: 'secondary' as const,
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      },
      [ReconciliationStatus.RECONCILED]: {
        label: 'Conciliado',
        variant: 'default' as const,
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 border-green-300'
      },
      [ReconciliationStatus.DIVERGENT]: {
        label: 'Divergente',
        variant: 'destructive' as const,
        icon: AlertTriangle,
        className: 'bg-orange-100 text-orange-800 border-orange-300'
      },
      [ReconciliationStatus.CANCELLED]: {
        label: 'Cancelado',
        variant: 'outline' as const,
        icon: Clock,
        className: 'bg-gray-100 text-gray-800 border-gray-300'
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`${config.className} ${className}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // AIDEV-NOTE: Configuração de status de pagamento (quando fornecido)
  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const statusConfig = {
      [PaymentStatus.PENDING]: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      [PaymentStatus.PAID]: { label: 'Pago', className: 'bg-green-100 text-green-800' },
      [PaymentStatus.CANCELLED]: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
      [PaymentStatus.OVERDUE]: { label: 'Vencido', className: 'bg-orange-100 text-orange-800' }
    };

    const config = statusConfig[status];
    
    // AIDEV-NOTE: Verificação de segurança para evitar erro quando status não está mapeado
    if (!config) {
      console.warn(`PaymentStatus não mapeado: ${status}`);
      return (
        <Badge variant="outline" className={`bg-gray-100 text-gray-800 ${className}`}>
          {status || 'Desconhecido'}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className={`${config.className} ${className}`}>
        {config.label}
      </Badge>
    );
  };

  // AIDEV-NOTE: Renderização condicional baseada nos props fornecidos
  // Se paymentStatus for fornecido, renderiza badge de pagamento
  // Caso contrário, renderiza badge de reconciliação
  if (paymentStatus) {
    return getPaymentStatusBadge(paymentStatus);
  }

  return getReconciliationStatusBadge(status);
};

export default StatusBadge;
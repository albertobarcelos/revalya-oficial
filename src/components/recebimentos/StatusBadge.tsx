import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
}

/**
 * Renderiza um badge para o status do recebimento.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    PENDING: { label: 'Pendente', variant: 'secondary' as const },
    PAID: { label: 'Pago', variant: 'default' as const },
    OVERDUE: { label: 'Vencido', variant: 'destructive' as const },
    CANCELLED: { label: 'Cancelado', variant: 'outline' as const }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}


/**
 * Componente FiscalBadge
 * 
 * AIDEV-NOTE: Badge visual indicando status fiscal (NF-e e NFS-e)
 * Exibe separadamente para produtos e serviços
 * 
 * @module FiscalBadge
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';
import type { FiscalInvoiceStatus } from '@/types/fiscal';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FiscalBadgeProps {
  billingPeriodId?: string;
  chargeId?: string;
  className?: string;
  showLabel?: boolean;
}

interface FiscalStatus {
  nfe?: {
    status: FiscalInvoiceStatus;
    numero?: string;
  };
  nfse?: {
    status: FiscalInvoiceStatus;
    numero?: string;
  };
}

/**
 * AIDEV-NOTE: Mapeamento de status para variantes do Badge
 */
const statusVariantMap: Record<FiscalInvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'PENDENTE': 'outline',
  'PROCESSANDO': 'secondary',
  'EMITIDA': 'default',
  'CANCELADA': 'secondary',
  'ERRO': 'destructive'
};

/**
 * AIDEV-NOTE: Labels dos status
 */
const statusLabelMap: Record<FiscalInvoiceStatus, string> = {
  'PENDENTE': 'Pendente',
  'PROCESSANDO': 'Processando',
  'EMITIDA': 'Emitida',
  'CANCELADA': 'Cancelada',
  'ERRO': 'Erro'
};

/**
 * AIDEV-NOTE: Cores do badge baseado no status
 */
const statusColorMap: Record<FiscalInvoiceStatus, string> = {
  'PENDENTE': 'border-yellow-500 text-yellow-700 bg-yellow-50',
  'PROCESSANDO': 'border-blue-500 text-blue-700 bg-blue-50',
  'EMITIDA': 'border-green-500 text-green-700 bg-green-50',
  'CANCELADA': 'border-gray-500 text-gray-700 bg-gray-50',
  'ERRO': 'border-red-500 text-red-700 bg-red-50'
};

export function FiscalBadge({ 
  billingPeriodId, 
  chargeId, 
  className,
  showLabel = true 
}: FiscalBadgeProps) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: Buscar status fiscal do billing period ou charge
  const { data: fiscalStatus, isLoading } = useSecureTenantQuery<FiscalStatus>(
    ['fiscal', 'status', currentTenant?.id, billingPeriodId, chargeId],
    async (supabaseClient, tenantId) => {
      const status: FiscalStatus = {};

      // Buscar NF-e por billing_period_id
      if (billingPeriodId) {
        const { data: nfeInvoice } = await supabaseClient
          .from('fiscal_invoices')
          .select('status, numero')
          .eq('tenant_id', tenantId)
          .eq('billing_period_id', billingPeriodId)
          .eq('tipo', 'NFE')
          .maybeSingle();

        if (nfeInvoice) {
          status.nfe = {
            status: nfeInvoice.status as FiscalInvoiceStatus,
            numero: nfeInvoice.numero || undefined
          };
        } else {
          // Verificar se tem produtos para emitir NF-e
          const { data: items } = await supabaseClient
            .from('billing_period_items')
            .select('product_id')
            .eq('billing_period_id', billingPeriodId)
            .not('product_id', 'is', null)
            .limit(1);

          if (items && items.length > 0) {
            status.nfe = { status: 'PENDENTE' };
          }
        }
      }

      // Buscar NFS-e por charge_id
      if (chargeId) {
        const { data: nfseInvoice } = await supabaseClient
          .from('fiscal_invoices')
          .select('status, numero')
          .eq('tenant_id', tenantId)
          .eq('charge_id', chargeId)
          .eq('tipo', 'NFSE')
          .maybeSingle();

        if (nfseInvoice) {
          status.nfse = {
            status: nfseInvoice.status as FiscalInvoiceStatus,
            numero: nfseInvoice.numero || undefined
          };
        } else {
          // Verificar se a charge está paga e tem serviços
          const { data: charge } = await supabaseClient
            .from('charges')
            .select('status, billing_periods')
            .eq('id', chargeId)
            .single();

          if (charge && charge.status?.startsWith('RECEIVED')) {
            // Verificar se tem serviços no billing period
            if (charge.billing_periods) {
              const { data: items } = await supabaseClient
                .from('billing_period_items')
                .select('service_id')
                .eq('billing_period_id', charge.billing_periods)
                .not('service_id', 'is', null)
                .limit(1);

              if (items && items.length > 0) {
                status.nfse = { status: 'PENDENTE' };
              }
            }
          }
        }
      }

      return status;
    },
    {
      enabled: hasAccess && !!currentTenant?.id && (!!billingPeriodId || !!chargeId),
      staleTime: 30 * 1000 // 30 segundos
    }
  );

  // AIDEV-NOTE: Se não há dados fiscais, não exibir nada
  if (!fiscalStatus || (!fiscalStatus.nfe && !fiscalStatus.nfse)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {fiscalStatus.nfe && (
        <Badge
          variant={statusVariantMap[fiscalStatus.nfe.status]}
          className={cn(
            'text-xs',
            statusColorMap[fiscalStatus.nfe.status]
          )}
        >
          {showLabel && 'NF-e: '}
          {statusLabelMap[fiscalStatus.nfe.status]}
          {fiscalStatus.nfe.numero && ` #${fiscalStatus.nfe.numero}`}
        </Badge>
      )}
      {fiscalStatus.nfse && (
        <Badge
          variant={statusVariantMap[fiscalStatus.nfse.status]}
          className={cn(
            'text-xs',
            statusColorMap[fiscalStatus.nfse.status]
          )}
        >
          {showLabel && 'NFS-e: '}
          {statusLabelMap[fiscalStatus.nfse.status]}
          {fiscalStatus.nfse.numero && ` #${fiscalStatus.nfse.numero}`}
        </Badge>
      )}
    </div>
  );
}


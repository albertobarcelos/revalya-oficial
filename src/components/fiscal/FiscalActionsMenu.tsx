/**
 * Componente FiscalActionsMenu
 * 
 * AIDEV-NOTE: Menu dropdown com ações fiscais (emitir, visualizar, baixar)
 * Integra com dialogs de emissão e visualização
 * 
 * @module FiscalActionsMenu
 */

import { useState } from 'react';
import { MoreHorizontal, FileText, Download, Mail, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmitNFeDialog } from './EmitNFeDialog';
import { EmitNFSeDialog } from './EmitNFSeDialog';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';
import type { FiscalInvoice } from '@/types/fiscal';

interface FiscalActionsMenuProps {
  billingPeriodId?: string;
  chargeId?: string;
  hasProducts?: boolean;
  hasServices?: boolean;
  className?: string;
}

export function FiscalActionsMenu({
  billingPeriodId,
  chargeId,
  hasProducts = false,
  hasServices = false,
  className
}: FiscalActionsMenuProps) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const [isNFeDialogOpen, setIsNFeDialogOpen] = useState(false);
  const [isNFSeDialogOpen, setIsNFSeDialogOpen] = useState(false);

  // AIDEV-NOTE: Buscar invoices existentes para determinar ações disponíveis
  const { data: invoices } = useSecureTenantQuery<{
    nfe?: FiscalInvoice;
    nfse?: FiscalInvoice;
  }>(
    ['fiscal', 'invoices', currentTenant?.id, billingPeriodId, chargeId],
    async (supabaseClient, tenantId) => {
      const result: { nfe?: FiscalInvoice; nfse?: FiscalInvoice } = {};

      // Buscar NF-e
      if (billingPeriodId) {
        const { data: nfe } = await supabaseClient
          .from('fiscal_invoices')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('billing_period_id', billingPeriodId)
          .eq('tipo', 'NFE')
          .maybeSingle();

        if (nfe) {
          result.nfe = nfe as FiscalInvoice;
        }
      }

      // Buscar NFS-e
      if (chargeId) {
        const { data: nfse } = await supabaseClient
          .from('fiscal_invoices')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('charge_id', chargeId)
          .eq('tipo', 'NFSE')
          .maybeSingle();

        if (nfse) {
          result.nfse = nfse as FiscalInvoice;
        }
      }

      return result;
    },
    {
      enabled: hasAccess && !!currentTenant?.id && (!!billingPeriodId || !!chargeId),
      staleTime: 30 * 1000
    }
  );

  const nfeInvoice = invoices?.nfe;
  const nfseInvoice = invoices?.nfse;

  // AIDEV-NOTE: Determinar se pode emitir NF-e
  const canEmitNFe = hasProducts && !nfeInvoice && billingPeriodId;
  const canEmitNFSe = hasServices && !nfseInvoice && chargeId;

  // AIDEV-NOTE: Determinar se tem nota emitida
  const hasEmittedNFe = nfeInvoice?.status === 'EMITIDA';
  const hasEmittedNFSe = nfseInvoice?.status === 'EMITIDA';

  // AIDEV-NOTE: Se não há ações disponíveis, não exibir menu
  if (!canEmitNFe && !canEmitNFSe && !hasEmittedNFe && !hasEmittedNFSe) {
    return null;
  }

  const handleDownloadPDF = (invoice: FiscalInvoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    }
  };

  const handleDownloadXML = (invoice: FiscalInvoice) => {
    if (invoice.xml_url) {
      window.open(invoice.xml_url, '_blank');
    }
  };

  const handleResendEmail = async (invoice: FiscalInvoice) => {
    // TODO: Implementar reenvio de email via Edge Function
    console.log('Reenviar email para:', invoice);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={className}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Ações de emissão */}
          {canEmitNFe && (
            <DropdownMenuItem onClick={() => setIsNFeDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Emitir NF-e
            </DropdownMenuItem>
          )}
          {canEmitNFSe && (
            <DropdownMenuItem onClick={() => setIsNFSeDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Emitir NFS-e
            </DropdownMenuItem>
          )}

          {/* Separador se houver ações de emissão e visualização */}
          {(canEmitNFe || canEmitNFSe) && (hasEmittedNFe || hasEmittedNFSe) && (
            <DropdownMenuSeparator />
          )}

          {/* Ações de visualização/download */}
          {hasEmittedNFe && nfeInvoice && (
            <>
              <DropdownMenuItem onClick={() => handleDownloadPDF(nfeInvoice)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF (NF-e)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadXML(nfeInvoice)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar XML (NF-e)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResendEmail(nfeInvoice)}>
                <Mail className="h-4 w-4 mr-2" />
                Reenviar Email (NF-e)
              </DropdownMenuItem>
            </>
          )}

          {hasEmittedNFSe && nfseInvoice && (
            <>
              <DropdownMenuItem onClick={() => handleDownloadPDF(nfseInvoice)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF (NFS-e)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadXML(nfseInvoice)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar XML (NFS-e)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResendEmail(nfseInvoice)}>
                <Mail className="h-4 w-4 mr-2" />
                Reenviar Email (NFS-e)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs de emissão */}
      {billingPeriodId && (
        <EmitNFeDialog
          open={isNFeDialogOpen}
          onOpenChange={setIsNFeDialogOpen}
          billingPeriodId={billingPeriodId}
        />
      )}

      {chargeId && (
        <EmitNFSeDialog
          open={isNFSeDialogOpen}
          onOpenChange={setIsNFSeDialogOpen}
          chargeId={chargeId}
        />
      )}
    </>
  );
}


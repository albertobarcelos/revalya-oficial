/**
 * Componente EmitNFSeDialog
 * 
 * AIDEV-NOTE: Modal de confirmação para emissão de NFS-e
 * Exibe resumo dos serviços e valor calculado automaticamente
 * 
 * @module EmitNFSeDialog
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import { useEmitServiceInvoice, useCanEmitServiceInvoice } from '@/hooks/useFiscal';
import { formatCurrency } from '@/utils/financial';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';

interface EmitNFSeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chargeId: string;
}

export function EmitNFSeDialog({
  open,
  onOpenChange,
  chargeId
}: EmitNFSeDialogProps) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const [isEmitting, setIsEmitting] = useState(false);

  // AIDEV-NOTE: Verificar se pode emitir e obter valor máximo
  const { data: canEmit, isLoading: isLoadingCanEmit } = useCanEmitServiceInvoice(chargeId);

  // AIDEV-NOTE: Buscar dados da charge para exibir resumo
  const { data: chargeData } = useSecureTenantQuery(
    ['charge', currentTenant?.id, chargeId],
    async (supabaseClient, tenantId) => {
      const { data: charge, error: chargeError } = await supabaseClient
        .from('charges')
        .select(`
          id,
          valor,
          status,
          billing_periods,
          customer:customers(name)
        `)
        .eq('id', chargeId)
        .eq('tenant_id', tenantId)
        .single();

      if (chargeError) throw chargeError;

      // Buscar itens de serviço do período
      if (charge.billing_periods) {
        const { data: items, error: itemsError } = await supabaseClient
          .from('billing_period_items')
          .select(`
            id,
            quantity,
            unit_price,
            description,
            service_nfse_emitted_amount,
            service:services(name, code)
          `)
          .eq('billing_period_id', charge.billing_periods)
          .not('service_id', 'is', null);

        if (itemsError) throw itemsError;

        return {
          charge,
          items: items || []
        };
      }

      return { charge, items: [] };
    },
    {
      enabled: hasAccess && !!currentTenant?.id && open,
      staleTime: 60 * 1000
    }
  );

  const emitMutation = useEmitServiceInvoice();

  const handleEmit = async () => {
    if (!canEmit?.canEmit) return;

    setIsEmitting(true);
    try {
      await emitMutation.mutateAsync(chargeId);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao emitir NFS-e:', error);
    } finally {
      setIsEmitting(false);
    }
  };

  const chargeValue = parseFloat(chargeData?.charge?.valor) || 0;
  const maxValue = canEmit?.valorMaximo || chargeValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Emitir Nota Fiscal de Serviços Eletrônica (NFS-e)
          </DialogTitle>
          <DialogDescription>
            Confirme a emissão da NFS-e para os serviços do recebimento
          </DialogDescription>
        </DialogHeader>

        {isLoadingCanEmit ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !canEmit?.canEmit ? (
          <div className="py-4">
            <p className="text-sm text-destructive">
              {canEmit?.reason || 'Não é possível emitir NFS-e no momento'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo dos serviços */}
            {chargeData?.items && chargeData.items.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Serviços a serem incluídos na NFS-e:</h4>
                <div className="space-y-2">
                  {chargeData.items.map((item: any) => {
                    const qty = parseFloat(item.quantity) || 0;
                    const price = parseFloat(item.unit_price) || 0;
                    const total = qty * price;
                    const emitted = parseFloat(item.service_nfse_emitted_amount) || 0;
                    const available = total - emitted;

                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium">
                            {item.service?.name || item.description || 'Serviço'}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {qty} x {formatCurrency(price)} = {formatCurrency(total)}
                            {emitted > 0 && (
                              <span className="ml-2 text-yellow-600">
                                (Já emitido: {formatCurrency(emitted)})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Valores */}
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span className="text-sm">Valor Recebido:</span>
                <span className="font-medium">{formatCurrency(chargeValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Valor Máximo para Emissão:</span>
                <span className="font-medium">{formatCurrency(maxValue)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Valor da NFS-e:</span>
                <span className="text-lg font-bold">{formatCurrency(maxValue)}</span>
              </div>
            </div>

            {/* Aviso */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                A NFS-e será emitida automaticamente e você receberá uma notificação quando estiver pronta.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isEmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleEmit}
            disabled={!canEmit?.canEmit || isEmitting || emitMutation.isPending}
          >
            {isEmitting || emitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Emitindo...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Confirmar Emissão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


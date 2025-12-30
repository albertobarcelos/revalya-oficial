/**
 * Componente EmitNFeDialog
 * 
 * AIDEV-NOTE: Modal de confirmação para emissão de NF-e
 * Exibe resumo dos itens e valor calculado automaticamente
 * 
 * @module EmitNFeDialog
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
import { useEmitProductInvoice, useCanEmitProductInvoice } from '@/hooks/useFiscal';
import { formatCurrency } from '@/utils/financial';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';

interface EmitNFeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingPeriodId: string;
}

export function EmitNFeDialog({
  open,
  onOpenChange,
  billingPeriodId
}: EmitNFeDialogProps) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const [isEmitting, setIsEmitting] = useState(false);

  // AIDEV-NOTE: Verificar se pode emitir e obter valor
  const { data: canEmit, isLoading: isLoadingCanEmit } = useCanEmitProductInvoice(billingPeriodId);

  // AIDEV-NOTE: Buscar itens do período para exibir resumo
  const { data: items } = useSecureTenantQuery(
    ['billing_period_items', currentTenant?.id, billingPeriodId],
    async (supabaseClient, tenantId) => {
      const { data, error } = await supabaseClient
        .from('billing_period_items')
        .select(`
          id,
          quantity,
          unit_price,
          description,
          product:products(name, code)
        `)
        .eq('billing_period_id', billingPeriodId)
        .not('product_id', 'is', null);

      if (error) throw error;
      return data;
    },
    {
      enabled: hasAccess && !!currentTenant?.id && open,
      staleTime: 60 * 1000
    }
  );

  const emitMutation = useEmitProductInvoice();

  const handleEmit = async () => {
    if (!canEmit?.canEmit) return;

    setIsEmitting(true);
    try {
      await emitMutation.mutateAsync(billingPeriodId);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao emitir NF-e:', error);
    } finally {
      setIsEmitting(false);
    }
  };

  const totalValue = items?.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return sum + (qty * price);
  }, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Emitir Nota Fiscal Eletrônica (NF-e)
          </DialogTitle>
          <DialogDescription>
            Confirme a emissão da NF-e para os produtos do faturamento
          </DialogDescription>
        </DialogHeader>

        {isLoadingCanEmit ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !canEmit?.canEmit ? (
          <div className="py-4">
            <p className="text-sm text-destructive">
              {canEmit?.reason || 'Não é possível emitir NF-e no momento'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo dos itens */}
            {items && items.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Itens a serem incluídos na NF-e:</h4>
                <div className="space-y-2">
                  {items.map((item: any) => {
                    const qty = parseFloat(item.quantity) || 0;
                    const price = parseFloat(item.unit_price) || 0;
                    const total = qty * price;

                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium">
                            {item.product?.name || item.description || 'Produto'}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {qty} x {formatCurrency(price)} = {formatCurrency(total)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Valor total */}
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="font-medium">Valor Total da NF-e:</span>
              <span className="text-lg font-bold">
                {formatCurrency(canEmit.valor || totalValue)}
              </span>
            </div>

            {/* Aviso */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                A NF-e será emitida automaticamente e você receberá uma notificação quando estiver pronta.
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


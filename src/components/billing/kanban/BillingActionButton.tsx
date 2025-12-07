// AIDEV-NOTE: Botão de ação de faturamento em lote
// Exibido quando há contratos selecionados no Kanban

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import type { BillingActionButtonProps } from '@/types/billing/kanban.types';

/**
 * Botão de faturamento em lote
 * Exibe contador de contratos selecionados e estado de loading
 */
export function BillingActionButton({
  selectedCount,
  isLoading,
  onBilling,
}: BillingActionButtonProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-center mt-4">
      <Button
        onClick={onBilling}
        disabled={isLoading}
        size="lg"
        className="flex items-center space-x-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processando Faturamento...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            <span>
              Faturar {selectedCount} Contrato{selectedCount > 1 ? 's' : ''}
            </span>
          </>
        )}
      </Button>
    </div>
  );
}

export default BillingActionButton;

// AIDEV-NOTE: Botão de ação de faturamento em lote
// Exibido no rodapé da coluna "Faturar Hoje" quando há contratos selecionados

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
    <Button
      onClick={onBilling}
      disabled={isLoading}
      size="sm"
      className="w-full h-9 text-sm font-medium"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>Processando...</span>
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4 mr-2" />
          <span>Faturar ({selectedCount})</span>
        </>
      )}
    </Button>
  );
}

export default BillingActionButton;

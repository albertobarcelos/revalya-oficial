/**
 * AIDEV-NOTE: Modal para escolher entre adicionar Produto ou Serviço
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { BillingDialogContent } from '@/components/billing/kanban/BillingDialogContent';
import { Button } from '@/components/ui/button';
import { Package, Wrench, X } from 'lucide-react';

interface AddItemChooserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: () => void;
  onSelectService: () => void;
}

/**
 * Modal para escolher entre adicionar Produto ou Serviço
 */
export function AddItemChooserModal({
  open,
  onOpenChange,
  onSelectProduct,
  onSelectService,
}: AddItemChooserModalProps) {
  const handleSelectProduct = () => {
    onSelectProduct();
    onOpenChange(false);
  };

  const handleSelectService = () => {
    onSelectService();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      {/* AIDEV-NOTE: Modal com 50% da altura do modal principal (98vw x 47.5vh) */}
      <BillingDialogContent className="p-0 m-0 border-0 w-[98vw] max-w-[98vw] h-[47.5vh] max-h-[47.5vh]">
        <DialogPrimitive.Title className="sr-only">
          Adicionar Item
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">
          Escolha entre adicionar um produto ou serviço ao faturamento
        </DialogPrimitive.Description>
        
        {/* AIDEV-NOTE: Container principal com padding e estrutura flex */}
        <div className="flex flex-col h-full min-h-0 overflow-hidden p-6">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between flex-shrink-0 mb-6">
            <DialogTitle className="text-xl font-semibold">Adicionar Item</DialogTitle>
            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
          </div>

          {/* AIDEV-NOTE: Botões quase quadrados com altura maior */}
          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
              <Button 
                variant="outline" 
                onClick={handleSelectProduct}
                className="h-48 w-full flex flex-col items-center justify-center gap-3 text-lg font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Package className="h-12 w-12" />
                Produto
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSelectService}
                className="h-48 w-full flex flex-col items-center justify-center gap-3 text-lg font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Wrench className="h-12 w-12" />
                Serviço
              </Button>
            </div>
          </div>
        </div>
      </BillingDialogContent>
    </Dialog>
  );
}

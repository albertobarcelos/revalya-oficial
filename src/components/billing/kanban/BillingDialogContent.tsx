// AIDEV-NOTE: DialogContent customizado com sistema de scroll otimizado
// Mesmo padrão usado em Contracts.tsx para consistência visual

import React from 'react';
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

interface BillingDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  children: React.ReactNode;
  className?: string;
}

/**
 * DialogContent customizado para modais de faturamento
 * Inclui sistema de scroll otimizado e tamanho maximizado
 */
export const BillingDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  BillingDialogContentProps
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh]',
        'translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background shadow-lg',
        'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        'rounded-2xl overflow-hidden flex flex-col',
        className
      )}
      onOpenAutoFocus={(e) => {
        // Previne o foco automático que pode causar conflito com aria-hidden
        e.preventDefault();
      }}
      {...props}
    >
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">{children}</div>
    </DialogPrimitive.Content>
  </DialogPortal>
));

BillingDialogContent.displayName = 'BillingDialogContent';

export default BillingDialogContent;

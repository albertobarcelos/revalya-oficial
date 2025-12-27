import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

import { useCreatePayableLogic } from './create-payable-parts/useCreatePayableLogic';
import { CreatePayableModalProps } from './create-payable-parts/types';
import { ModalHeader } from './create-payable-parts/ModalHeader';
import { CreatePayableGeneralTab } from './create-payable-parts/tabs/CreatePayableGeneralTab';

const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh] translate-x-[-50%] translate-y-[-50%] gap-0 border-0 bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl overflow-hidden flex flex-col outline-none",
        className
      )}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
      }}
      {...props}
    >
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

export function CreatePayableModal(props: CreatePayableModalProps) {
  const { open, onOpenChange } = props;
  
  const form = useCreatePayableLogic(props);
  const { handleClose } = form;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) handleClose(); }}>
      <CustomDialogContent className="p-0 m-0 border-0">
        <ModalHeader handleClose={handleClose} />

        <div className="flex-1 overflow-hidden p-8 bg-muted/30">
          <Card className="h-full flex flex-col overflow-hidden border-0 shadow-sm">
            <CardHeader className="px-8 py-6 border-b bg-background shrink-0">
              <CardTitle className="text-lg">Dados gerais</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-8 bg-background">
              <CreatePayableGeneralTab form={form} />
            </CardContent>
          </Card>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
}

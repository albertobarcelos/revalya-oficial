import React from 'react';
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomClientDialogContent } from "./CustomClientDialogContent";
import { CreateClientForm } from "./CreateClientForm";
import { PlusCircle } from "lucide-react";
import { ClientDialogHeader } from "./ClientDialogHeader";

interface CreateClientDialogProps {
  onClientCreated?: (clientId: string) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateClientDialog({ 
  onClientCreated,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: CreateClientDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const handleSuccess = (clientId: string) => {
    console.log('Cliente criado com sucesso, ID:', clientId);
    if (onClientCreated) {
      onClientCreated(clientId);
    }
    // Forçar o fechamento do diálogo
    setTimeout(() => {
      setOpen(false);
      console.log('Diálogo fechado após criação de cliente');
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      {!trigger && !isControlled && (
        <DialogTrigger asChild>
          <PlusCircle className="h-4 w-4 cursor-pointer text-primary hover:text-primary/80" />
        </DialogTrigger>
      )}
      <CustomClientDialogContent>
        <ClientDialogHeader mode="create" />
        <div className="flex-1 overflow-y-auto bg-muted/30 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
          <CreateClientForm 
            onSuccess={handleSuccess} 
            onCancel={() => setOpen(false)}
          />
        </div>
      </CustomClientDialogContent>
    </Dialog>
  );
}

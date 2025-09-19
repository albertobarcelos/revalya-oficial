import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateClientForm } from "./CreateClientForm";
import { PlusCircle } from "lucide-react";

interface CreateClientDialogProps {
  onClientCreated?: (clientId: string) => void;
  trigger?: React.ReactNode;
}

export function CreateClientDialog({ 
  onClientCreated,
  trigger 
}: CreateClientDialogProps) {
  const [open, setOpen] = React.useState(false);

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
      <DialogTrigger asChild>
        {trigger || <PlusCircle className="h-4 w-4 cursor-pointer text-primary hover:text-primary/80" />}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo cliente.
          </DialogDescription>
        </DialogHeader>
        <CreateClientForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}

import React from 'react';
import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ChargeForm } from './ChargeForm';

interface ChargesHeaderProps {
  onExport: () => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
}

export const ChargesHeader: React.FC<ChargesHeaderProps> = ({
  onExport,
  isDialogOpen,
  setIsDialogOpen,
}) => {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Cobranças</h1>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nova Cobrança
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Cobrança</DialogTitle>
              <DialogDescription>
                Crie uma nova cobrança para um cliente.
              </DialogDescription>
            </DialogHeader>
            <ChargeForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

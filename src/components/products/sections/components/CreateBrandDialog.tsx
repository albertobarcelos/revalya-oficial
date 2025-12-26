/**
 * Dialog para criar nova marca
 * 
 * AIDEV-NOTE: Componente isolado para criação de marca
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface CreateBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateBrand: (name: string) => Promise<{ id: string; name: string }>;
  isCreating: boolean;
  onBrandCreated: (brandId: string) => void;
}

export function CreateBrandDialog({
  open,
  onOpenChange,
  onCreateBrand,
  isCreating,
  onBrandCreated,
}: CreateBrandDialogProps) {
  const { toast } = useToast();
  const [newBrandName, setNewBrandName] = useState('');

  const handleCreate = async () => {
    if (!newBrandName.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome da marca é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newBrand = await onCreateBrand(newBrandName.trim());
      onBrandCreated(newBrand.id);
      onOpenChange(false);
      setNewBrandName('');
      toast({
        title: 'Sucesso!',
        description: 'Marca criada com sucesso',
      });
    } catch (error: any) {
      console.error('[ERROR] Erro ao criar marca:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar marca. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Marca</DialogTitle>
          <DialogDescription>
            Digite o nome da nova marca para adicionar ao sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name">Nome da Marca</Label>
            <Input
              id="brand-name"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Ex: Samsung, Apple, etc."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setNewBrandName('');
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!newBrandName.trim() || isCreating}
          >
            {isCreating ? 'Criando...' : 'Criar Marca'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


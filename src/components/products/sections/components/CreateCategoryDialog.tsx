/**
 * Dialog para criar nova categoria
 * 
 * AIDEV-NOTE: Componente isolado para criação de categoria
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import type { ProductCategory } from '@/hooks/useProductCategories';

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCategory: (name: string, onSuccess: (category: ProductCategory) => void, onError: (error: Error) => void) => void;
  isCreating: boolean;
  onCategoryCreated: (categoryId: string) => void;
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
  onCreateCategory,
  isCreating,
  onCategoryCreated,
}: CreateCategoryDialogProps) {
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleCreate = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome da categoria é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    onCreateCategory(
      newCategoryName.trim(),
      (newCategory) => {
        onCategoryCreated(newCategory.id);
        onOpenChange(false);
        setNewCategoryName('');
        toast({
          title: 'Sucesso!',
          description: 'Categoria criada com sucesso',
        });
      },
      (error) => {
        console.error('[ERROR] Erro ao criar categoria:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao criar categoria. Tente novamente.',
          variant: 'destructive',
        });
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Categoria</DialogTitle>
          <DialogDescription>
            Digite o nome da nova categoria para adicionar ao sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome da Categoria</Label>
            <Input
              id="category-name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Ex: Eletrônicos, Roupas, etc."
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
              setNewCategoryName('');
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!newCategoryName.trim() || isCreating}
          >
            {isCreating ? 'Criando...' : 'Criar Categoria'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


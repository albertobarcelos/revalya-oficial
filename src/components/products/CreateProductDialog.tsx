// AIDEV-NOTE: Modal de criação de produtos - Agora usa componente unificado
// Redireciona para ProductFormDialog com modo de criação

import { ProductFormDialog } from './ProductFormDialog';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  close?: () => void; // AIDEV-NOTE: Compatibilidade com prop antiga
  onSuccess?: () => void;
}

export function CreateProductDialog({
  open,
  onOpenChange,
  close,
  onSuccess,
}: CreateProductDialogProps) {
  // AIDEV-NOTE: Suporta tanto onOpenChange quanto close para compatibilidade
  const handleOpenChange = onOpenChange || ((open: boolean) => {
    if (!open && close) {
      close();
    }
  });

  return (
    <ProductFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      onSuccess={onSuccess}
    />
  );
}

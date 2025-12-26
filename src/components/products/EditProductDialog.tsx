// AIDEV-NOTE: Modal de edição de produtos - Agora usa componente unificado
// Redireciona para ProductFormDialog com modo de edição

import { ProductFormDialog } from './ProductFormDialog';
import type { Product } from '@/hooks/useSecureProducts';

interface EditProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditProductDialog({
  product,
  isOpen,
  onClose,
  onSuccess,
}: EditProductDialogProps) {
  // AIDEV-NOTE: Verificação de segurança - não renderiza se product for null
  if (!product) {
    return null;
  }

  return (
    <ProductFormDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
      onClose();
        }
      }}
      product={product}
      onSuccess={onSuccess}
    />
  );
}

// =====================================================
// ACCESS DENIED DIALOG COMPONENT
// Descrição: Componente para exibir diálogo de acesso negado
// Padrão: Responsabilidade única + Type Safety + Reusabilidade
// =====================================================

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// AIDEV-NOTE: Interface para props do componente AccessDeniedDialog
interface AccessDeniedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accessError?: string;
}

// AIDEV-NOTE: Componente reutilizável para exibir acesso negado
// Extraído do ReconciliationModal para melhor modularização
const AccessDeniedDialog: React.FC<AccessDeniedDialogProps> = ({
  isOpen,
  onClose,
  accessError
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Acesso Negado
          </DialogTitle>
          <DialogDescription>
            {accessError || 'Você não tem permissão para acessar a conciliação.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccessDeniedDialog;
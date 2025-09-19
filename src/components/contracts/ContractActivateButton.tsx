import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useContracts } from '@/hooks/useContracts';
import { cn } from '@/lib/utils';

// AIDEV-NOTE: Componente para ativar contratos em status DRAFT
// Permite mudança de status de rascunho para ativo com confirmação
interface ContractActivateButtonProps {
  contractId: string;
  contractNumber: string;
  currentStatus: string;
  onSuccess?: () => void;
  className?: string;
  disabled?: boolean;
}

export function ContractActivateButton({
  contractId,
  contractNumber,
  currentStatus,
  onSuccess,
  className,
  disabled = false
}: ContractActivateButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { activateContractMutation } = useContracts();

  // AIDEV-NOTE: Só mostrar o botão se o contrato estiver em rascunho
  if (currentStatus !== 'DRAFT') {
    return null;
  }

  const handleActivate = async () => {
    try {
      await activateContractMutation.mutateAsync(contractId);
      setShowDialog(false);
      onSuccess?.();
    } catch (error) {
      // Erro já é tratado pela mutation
      console.error('Erro ao ativar contrato:', error);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        disabled={disabled || activateContractMutation.isPending}
        className={cn(
          "bg-green-600 hover:bg-green-700 text-white flex items-center gap-2",
          className
        )}
        size="sm"
      >
        {activateContractMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle className="h-3 w-3" />
        )}
        <span className="text-[8px] font-medium">Ativar</span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Ativar Contrato
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja ativar o contrato <strong>{contractNumber}</strong>?
              <br /><br />
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Alterar o status do contrato de "Rascunho" para "Ativo"</li>
                <li>Mover o contrato para o estágio "Ativo"</li>
                <li>Registrar o histórico da mudança</li>
                <li>Permitir a geração de faturas</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={activateContractMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleActivate}
              disabled={activateContractMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {activateContractMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ativando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Ativação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ContractActivateButton;

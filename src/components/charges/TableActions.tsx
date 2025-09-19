import React, { useState } from 'react';
import { MoreVertical, Send, FileText, Ban, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageHistory } from './MessageHistory';
import { isChargeActionable } from './utils/chargeUtils';
import type { Cobranca } from '@/types/database';

interface TableActionsProps {
  charge: Cobranca;
  onSendReminder: (id: string) => void;
  onCancelCharge: (id: string) => void;
}

export const TableActions: React.FC<TableActionsProps> = ({
  charge,
  onSendReminder,
  onCancelCharge,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setShowHistory(open);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onSendReminder(charge.id)}
            disabled={!isChargeActionable(charge.status)}
          >
            <Send className="mr-2 h-4 w-4" />
            Enviar Lembrete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowHistory(true)}>
            <History className="mr-2 h-4 w-4" />
            Histórico de Mensagens
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FileText className="mr-2 h-4 w-4" />
            Ver Detalhes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onCancelCharge(charge.id)}
            disabled={!isChargeActionable(charge.status)}
            className="text-destructive"
          >
            <Ban className="mr-2 h-4 w-4" />
            Cancelar Cobrança
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showHistory} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle>Histórico de Mensagens</DialogTitle>
            <DialogDescription>
              Histórico de mensagens enviadas para esta cobrança
            </DialogDescription>
          </DialogHeader>
          {showHistory && <MessageHistory chargeId={charge.id} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

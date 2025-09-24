import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Cobranca } from "@/types/models/cobranca";
import { BulkMessageDialog } from "./BulkMessageDialog";
import { ChargeDetails } from './ChargeDetails';

// AIDEV-NOTE: Função movida para utils/installmentUtils.ts para reutilização

interface ChargeDetailDrawerProps {
  charge: Cobranca | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function ChargeDetailDrawer({ charge, isOpen, onClose, onRefresh }: ChargeDetailDrawerProps) {
  // AIDEV-NOTE: Estado para controle do dialog de mensagem
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  
  if (!charge) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Detalhes da Cobrança</DrawerTitle>
          <DrawerDescription>
            Informações detalhadas da cobrança selecionada
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-6 overflow-y-auto">
          <ChargeDetails charge={charge} onRefresh={onRefresh} />
        </div>
      </DrawerContent>
      <BulkMessageDialog
        open={isMessageDialogOpen}
        onOpenChange={setIsMessageDialogOpen}
        selectedCharges={charge ? [charge.id] : []}
        onSendMessages={() => {}}
        isLoading={false}
      />
    </Drawer>
  );
}

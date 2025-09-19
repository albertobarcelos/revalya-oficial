import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tag } from "lucide-react";
import { AVAILABLE_TAGS } from "@/types/settings";

interface TagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagsDialog({ open, onOpenChange }: TagsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tags Disponíveis</DialogTitle>
          <DialogDescription>
            Use estas tags para inserir dados dinâmicos nas suas mensagens.
            Dica: Digite / na mensagem para abrir o seletor de tags rapidamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(AVAILABLE_TAGS).map(([key, value]) => (
            <div key={key} className="flex flex-col space-y-1">
              <code className="text-sm bg-muted p-1 rounded">{value}</code>
              <span className="text-xs text-muted-foreground">
                {key.replace(/_/g, ' ').toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

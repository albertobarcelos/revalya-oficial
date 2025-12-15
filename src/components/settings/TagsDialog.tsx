import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tag } from "lucide-react";
import { TAG_DEFINITIONS, getTagsByCategory } from "@/utils/messageTags"; // AIDEV-NOTE: Tags centralizadas

interface TagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagsDialog({ open, onOpenChange }: TagsDialogProps) {
  // AIDEV-NOTE: Organizar tags por categoria para melhor visualização
  const tagsByCategory = {
    cliente: getTagsByCategory('cliente'),
    cobranca: getTagsByCategory('cobranca'),
    dias: getTagsByCategory('dias'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags Disponíveis
          </DialogTitle>
          <DialogDescription>
            Use estas tags para inserir dados dinâmicos nas suas mensagens.
            Dica: Digite / na mensagem para abrir o seletor de tags rapidamente.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Tags de Cliente */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-blue-600">Cliente</h3>
            <div className="grid grid-cols-2 gap-3">
              {tagsByCategory.cliente.map((tag) => (
                <div key={tag.key} className="flex flex-col space-y-1 p-2 border rounded">
                  <code className="text-sm bg-muted p-1 rounded font-mono">{tag.value}</code>
                  <span className="text-xs font-medium">{tag.label}</span>
                  {tag.description && (
                    <span className="text-xs text-muted-foreground">{tag.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tags de Cobrança */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-cyan-600">Cobrança</h3>
            <div className="grid grid-cols-2 gap-3">
              {tagsByCategory.cobranca.map((tag) => (
                <div key={tag.key} className="flex flex-col space-y-1 p-2 border rounded">
                  <code className="text-sm bg-muted p-1 rounded font-mono">{tag.value}</code>
                  <span className="text-xs font-medium">{tag.label}</span>
                  {tag.description && (
                    <span className="text-xs text-muted-foreground">{tag.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tags de Dias */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-green-600">Dias</h3>
            <div className="grid grid-cols-2 gap-3">
              {tagsByCategory.dias.map((tag) => (
                <div key={tag.key} className="flex flex-col space-y-1 p-2 border rounded">
                  <code className="text-sm bg-muted p-1 rounded font-mono">{tag.value}</code>
                  <span className="text-xs font-medium">{tag.label}</span>
                  {tag.description && (
                    <span className="text-xs text-muted-foreground">{tag.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

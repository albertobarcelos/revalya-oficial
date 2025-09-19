import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { AVAILABLE_TAGS } from "@/types/settings";
import type { MessageTemplate } from "@/types/settings";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  selectedTemplate: MessageTemplate | null;
  formData: {
    name: string;
    description: string;
    message: string;
    category: string;
    days_offset: number;
    is_before_due: boolean;
    active: boolean;
    tags: string[];
  };
  setFormData: (data: any) => void;
  handleCreate: () => void;
  handleUpdate: () => void;
  resetForm: () => void;
}

export function TemplateDialog({
  open,
  onOpenChange,
  loading,
  selectedTemplate,
  formData,
  setFormData,
  handleCreate,
  handleUpdate,
  resetForm,
}: TemplateDialogProps) {
  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>
          {selectedTemplate ? "Editar Template" : "Novo Template"}
        </DialogTitle>
        <DialogDescription>
          Crie ou edite um template de mensagem. Use as tags disponíveis para inserir dados dinâmicos.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Primeira Cobrança"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Template padrão para primeira cobrança"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">Categoria</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cobranca">Cobrança</SelectItem>
              <SelectItem value="lembrete">Lembrete</SelectItem>
              <SelectItem value="agradecimento">Agradecimento</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="message">Mensagem</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={8}
            placeholder="Digite sua mensagem aqui. Use as tags disponíveis para dados dinâmicos."
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(AVAILABLE_TAGS).map(([key, value]) => (
              <Badge
                key={key}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => {
                  const textarea = document.getElementById("message") as HTMLTextAreaElement;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newMessage = formData.message.substring(0, start) + value + formData.message.substring(end);
                    setFormData({ ...formData, message: newMessage });
                  }
                }}
              >
                {key.toLowerCase().replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            resetForm();
            onOpenChange(false);
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={selectedTemplate ? handleUpdate : handleCreate}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {selectedTemplate ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

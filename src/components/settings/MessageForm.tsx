import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationMessage } from "@/types/settings";
import { Trash2 } from "lucide-react";

interface MessageFormProps {
  message: NotificationMessage;
  index: number;
  onRemove: () => void;
  onChange: (message: NotificationMessage) => void;
}

export function MessageForm({ message, index, onRemove, onChange }: MessageFormProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Mensagem {index + 1}</h3>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={message.active}
              onCheckedChange={(checked) => onChange({ ...message, active: checked })}
            />
            <Button
              variant="destructive"
              size="icon"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dias</Label>
            <Input 
              type="number" 
              value={message.days}
              onChange={(e) => onChange({ ...message, days: parseInt(e.target.value) })}
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select 
              value={message.isBeforeDue ? "before" : "after"}
              onValueChange={(value) => onChange({ ...message, isBeforeDue: value === "before" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Antes do vencimento</SelectItem>
                <SelectItem value="after">Após o vencimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mensagem</Label>
          <Textarea
            value={message.message}
            onChange={(e) => onChange({ ...message, message: e.target.value })}
            rows={4}
            placeholder="Digite sua mensagem aqui. Use / para inserir tags."
          />
        </div>
      </CardContent>
    </Card>
  );
}

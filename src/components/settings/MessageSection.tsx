import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Tag, Trash2 } from "lucide-react";
import { NotificationMessage } from "@/types/settings";
import { MessageForm } from "./MessageForm";

interface MessageSectionProps {
  messages: NotificationMessage[];
  setMessages: (messages: NotificationMessage[]) => void;
  showTagsDialog: boolean;
  setShowTagsDialog: (show: boolean) => void;
}

export function MessageSection({
  messages,
  setMessages,
  showTagsDialog,
  setShowTagsDialog
}: MessageSectionProps) {
  const handleAddMessage = () => {
    setMessages([
      ...messages,
      {
        id: crypto.randomUUID(),
        days: 1,
        isBeforeDue: true,
        message: "",
        active: true
      }
    ]);
  };

  const handleRemoveMessage = (id: string) => {
    setMessages(messages.filter(msg => msg.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mensagens</span>
          <Button variant="outline" size="sm" onClick={() => setShowTagsDialog(true)}>
            <Tag className="mr-2 h-4 w-4" />
            Tags Disponíveis
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.map((message, index) => (
          <MessageForm
            key={message.id}
            message={message}
            index={index}
            onRemove={() => handleRemoveMessage(message.id)}
            onChange={(updatedMessage) => {
              setMessages(messages.map(msg =>
                msg.id === message.id ? updatedMessage : msg
              ));
            }}
          />
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleAddMessage}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Nova Mensagem
        </Button>
      </CardContent>
    </Card>
  );
}

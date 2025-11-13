import { memo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageHistory } from '@/hooks/useMessageHistory';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChargeMessageHistoryProps {
  messages: MessageHistory[];
  isLoading: boolean;
}

function ChargeMessageHistoryComponent({ messages, isLoading }: ChargeMessageHistoryProps) {
  const [selectedMessage, setSelectedMessage] = useState<MessageHistory | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p>Nenhuma mensagem enviada ainda.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
      'SENT': { label: 'Enviada', variant: 'default' },
      'DELIVERED': { label: 'Entregue', variant: 'default' },
      'READ': { label: 'Lida', variant: 'default' },
      'FAILED': { label: 'Falhou', variant: 'destructive' },
    };

    const statusInfo = statusMap[status] || { label: status || 'Desconhecido', variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <>
      <div className="space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">
                  {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
                {getStatusBadge(msg.status)}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {msg.template_id ? `Template: ${msg.template_id.slice(0, 8)}...` : 'Mensagem Personalizada'}
              </p>
              {msg.error_details && (
                <p className="text-xs text-red-500 mt-1 truncate">
                  {msg.error_details}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              onClick={() => setSelectedMessage(msg)}
              title="Ver mensagem completa"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Modal para visualizar mensagem completa */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Detalhes da Mensagem
            </DialogTitle>
            <DialogDescription>
              {selectedMessage && (
                <>
                  Enviada em {format(new Date(selectedMessage.created_at), "dd/MM/yyyy 'às' HH:mm")}
                  {selectedMessage.template_id && (
                    <span className="block mt-1">
                      Template ID: {selectedMessage.template_id}
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(selectedMessage.status)}
              </div>

              {selectedMessage.error_details && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg">
                  <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">Erro:</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{selectedMessage.error_details}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Mensagem:</p>
                <ScrollArea className="max-h-[400px] p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm whitespace-pre-wrap break-words">{selectedMessage.message}</p>
                </ScrollArea>
              </div>

              {selectedMessage.metadata && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {selectedMessage.metadata.phone && (
                      <span className="block">Telefone: {selectedMessage.metadata.phone}</span>
                    )}
                    {selectedMessage.metadata.message_id && (
                      <span className="block">ID da Mensagem: {selectedMessage.metadata.message_id}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export const ChargeMessageHistory = memo(ChargeMessageHistoryComponent);
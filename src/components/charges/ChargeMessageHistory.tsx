import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageHistory } from '@/hooks/useMessageHistory';

interface ChargeMessageHistoryProps {
  messages: MessageHistory[];
  isLoading: boolean;
}

function ChargeMessageHistoryComponent({ messages, isLoading }: ChargeMessageHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-l-2 border-primary/20 pl-4 py-2">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-3/4 mt-2" />
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

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="border-l-2 border-primary pl-4 py-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">
                {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {msg.template_id ? `Template: ${msg.template_id}` : 'Mensagem Enviada'}
              </p>
            </div>
            <Badge variant={msg.status === 'delivered' ? 'default' : 'outline'}>
              {msg.status === 'delivered'
                ? 'Entregue'
                : msg.status === 'read'
                ? 'Lida'
                : 'Enviada'}
            </Badge>
          </div>
          <p className="text-sm mt-2">{msg.message}</p>
        </div>
      ))}
    </div>
  );
}

export const ChargeMessageHistory = memo(ChargeMessageHistoryComponent);
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useCurrentTenant } from '@/hooks/useZustandTenant';
// AIDEV-NOTE: Hook obrigatório para segurança multi-tenant

interface MessageHistoryProps {
  chargeId: string;
}

export function MessageHistory({ chargeId }: MessageHistoryProps) {
  const { currentTenant } = useCurrentTenant();
  
  const { data: logs, isLoading } = useQuery({
    queryKey: ['message-logs', chargeId, currentTenant?.id],
    queryFn: async () => {
      // AIDEV-NOTE: Validação de segurança multi-tenant obrigatória
      if (!currentTenant?.id) {
        throw new Error('Tenant não definido - violação de segurança');
      }
      
      const { data, error } = await supabase
        .from('message_logs')
        .select(`
          *,
          template:notification_templates(
            name,
            category
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('charge_id', chargeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentTenant?.id && !!chargeId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Nenhuma mensagem enviada ainda.
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Enviada';
      case 'error':
        return 'Erro';
      default:
        return 'Pendente';
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Data de Envio</TableHead>
            <TableHead>Mensagem</TableHead>
            <TableHead>Erro</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusIcon(log.status)}
                  <span>{getStatusText(log.status)}</span>
                </div>
              </TableCell>
              <TableCell>{log.template?.name || 'N/A'}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {log.template?.category || 'N/A'}
                </Badge>
              </TableCell>
              <TableCell>
                {log.sent_at
                  ? format(new Date(log.sent_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })
                  : 'N/A'}
              </TableCell>
              <TableCell className="max-w-md">
                <div className="truncate">{log.message}</div>
              </TableCell>
              <TableCell className="text-red-500">
                {log.error_message || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

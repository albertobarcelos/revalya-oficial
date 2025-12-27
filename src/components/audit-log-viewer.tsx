import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinancialAudit } from '@/hooks/useFinancialAudit';
import { AuditEntityType } from '@/services/financialAuditService';
import { Loader2 } from 'lucide-react';

interface AuditLogViewerProps {
  tenantId: string;
  entityType: string;
  entityId: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  tenantId,
  entityType,
  entityId,
}) => {
  const {
    auditLogs,
    isFetchingLogs,
    fetchAuditLogs,
  } = useFinancialAudit();

  useEffect(() => {
    if (tenantId && entityId) {
      // Cast entityType to AuditEntityType since we know it's valid or we treat it as such
      // If the passed string is not in AuditEntityType, it might be an issue if strict,
      // but fetchAuditLogs implementation likely passes it to DB where it's a string.
      // However, we added PAYABLE to the type, so we should use that.
      fetchAuditLogs({
        tenant_id: tenantId,
        entity_type: entityType as AuditEntityType,
        entity_id: entityId,
        limit: 50,
        offset: 0
      });
    }
  }, [tenantId, entityType, entityId, fetchAuditLogs]);

  if (isFetchingLogs && auditLogs.length === 0) {
    return (
      <div className="flex justify-center items-center h-full min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto h-full">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-background border-b">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Data/Hora</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Usuário</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Ação</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                Nenhum registro encontrado
              </td>
            </tr>
          ) : (
            auditLogs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-2 whitespace-nowrap">
                  {log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                </td>
                <td className="px-4 py-2">{log.user_id || 'Sistema'}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2 max-w-[300px] truncate">
                  {log.metadata ? JSON.stringify(log.metadata) : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

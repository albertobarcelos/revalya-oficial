import React from 'react';
import { AuditLogViewer } from '@/components/audit-log-viewer';

interface PayableHistoryTabProps {
  currentTenantId?: string;
  entryId?: string;
}

export const PayableHistoryTab: React.FC<PayableHistoryTabProps> = ({ currentTenantId, entryId }) => {
  if (!currentTenantId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
        Erro: Identificação da organização não encontrada.
      </div>
    );
  }

  if (!entryId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
        Histórico indisponível para novos registros. Salve a conta para iniciar o rastreamento.
      </div>
    );
  }

  return (
    <div className="h-full min-h-[400px]">
      <AuditLogViewer
        tenantId={currentTenantId}
        entityType="PAYABLE"
        entityId={entryId}
      />
    </div>
  );
};

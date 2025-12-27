import React from 'react';
import { AuditLogViewer } from '@/components/audit-log-viewer';

interface PayableHistoryTabProps {
  currentTenantId?: string;
  entryId?: string;
}

export const PayableHistoryTab: React.FC<PayableHistoryTabProps> = ({ currentTenantId, entryId }) => {
  if (!currentTenantId || !entryId) return null;

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

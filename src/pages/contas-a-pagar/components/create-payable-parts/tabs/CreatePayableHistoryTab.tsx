import React from 'react';
import { AuditLogViewer } from '@/components/audit-log-viewer';

interface CreatePayableHistoryTabProps {
  currentTenantId?: string;
  entryId?: string;
}

export const CreatePayableHistoryTab: React.FC<CreatePayableHistoryTabProps> = ({ currentTenantId, entryId }) => {
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

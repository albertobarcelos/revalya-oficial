import { useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { markAsPaid as markPayableAsPaid, createPayable, updatePayable } from '@/services/financialPayablesService';
import { useToast } from '@/components/ui/use-toast';
import FinancialAuditService from '@/services/financialAuditService';
import { supabase } from '@/lib/supabase';

export function usePayablesMutations(payables: Array<{ id: string; tenant_id: string; net_amount?: number }>) {
  const { toast } = useToast();
  const { currentTenant } = useTenantAccessGuard();
  const audit = new FinancialAuditService();

  async function logAudit(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT_RECEIVED',
    entityId: string,
    newValues?: Record<string, any>,
    oldValues?: Record<string, any>
  ) {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id || 'system';
    const tenantId = currentTenant?.id || '';
    await audit.logAuditEntry({
      tenant_id: tenantId,
      user_id: userId,
      action_type: action,
      entity_type: 'PAYMENT',
      entity_id: entityId,
      new_values: newValues,
      old_values: oldValues,
      metadata: { source: 'contas-a-pagar' }
    } as any);
  }

  const markAsPaidMutation = useSecureTenantMutation(
    async (_supabase, tenantId, { entryId }: { entryId: string }) => {
      const entry = payables.find((p) => p.id === entryId);
      if (!entry || entry.tenant_id !== tenantId) {
        throw new Error('VIOLAÇÃO DE SEGURANÇA: Tentativa de alterar outro tenant');
      }
      const amount = entry.net_amount ?? 0;
      const updated = await markPayableAsPaid(entryId, amount, 'MANUAL');
      await logAudit('PAYMENT_RECEIVED', entryId, { status: 'PAID', paid_amount: amount }, { status: 'PENDING', paid_amount: 0 });
      return updated;
    },
    {
      onSuccess: () => {
        toast({ title: 'Sucesso', description: 'Conta marcada como paga' });
      },
      onError: (e) => {
        toast({
          title: 'Erro',
          description: e.message.includes('VIOLAÇÃO') ? 'Operação não autorizada' : 'Falha ao marcar como paga',
          variant: 'destructive',
        });
      },
      invalidateQueries: ['contas-a-pagar', 'financial-metrics'],
    }
  );

  const createPayableAddAnotherMutation = useSecureTenantMutation(
    async (_supabase, tenantId, payload: any) => {
      const created = await createPayable({ tenant_id: tenantId, ...payload } as any);
      await logAudit('CREATE', created.id, created, undefined);
      return created;
    },
    {
      invalidateQueries: ['contas-a-pagar'],
      onSuccess: () => {
        toast({ title: 'Salvo', description: 'Conta a pagar criada' });
      },
    }
  );

  const createPayableSaveInfoMutation = useSecureTenantMutation(
    async (_supabase, tenantId, payload: any) => {
      const created = await createPayable({ tenant_id: tenantId, ...payload } as any);
      await logAudit('CREATE', created.id, created, undefined);
      return created;
    },
    {
      invalidateQueries: ['contas-a-pagar'],
      onSuccess: () => {
        toast({ title: 'Salvo', description: 'Conta a pagar criada' });
      },
    }
  );

  const updatePayableMutation = useSecureTenantMutation(
    async (_supabase, tenantId, variables: { id: string; patch: any }) => {
      const { data: oldRow, error: fetchError } = await supabase
        .from('financial_payables')
        .select('*')
        .eq('id', variables.id)
        .eq('tenant_id', tenantId)
        .single();
      if (fetchError) throw new Error(fetchError.message);
      const updated = await updatePayable(variables.id, variables.patch);
      await logAudit('UPDATE', variables.id, updated as any, oldRow as any);
      return updated;
    },
    {
      invalidateQueries: ['contas-a-pagar'],
      onSuccess: () => {
        toast({ title: 'Salvo', description: 'Conta a pagar atualizada' });
      },
    }
  );

  return { markAsPaidMutation, createPayableAddAnotherMutation, createPayableSaveInfoMutation, updatePayableMutation, currentTenant };
}

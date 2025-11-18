import { useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { markAsPaid as markPayableAsPaid, createPayable, updatePayable } from '@/services/financialPayablesService';
import { useToast } from '@/components/ui/use-toast';

export function usePayablesMutations(payables: Array<{ id: string; tenant_id: string; net_amount?: number }>) {
  const { toast } = useToast();
  const { currentTenant } = useTenantAccessGuard();

  const markAsPaidMutation = useSecureTenantMutation(
    async (_supabase, tenantId, { entryId }: { entryId: string }) => {
      const entry = payables.find((p) => p.id === entryId);
      if (!entry || entry.tenant_id !== tenantId) {
        throw new Error('VIOLAÇÃO DE SEGURANÇA: Tentativa de alterar outro tenant');
      }
      const amount = entry.net_amount ?? 0;
      return await markPayableAsPaid(entryId, amount, 'MANUAL');
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
      return await createPayable({ tenant_id: tenantId, ...payload } as any);
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
      return await createPayable({ tenant_id: tenantId, ...payload } as any);
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
      return await updatePayable(variables.id, variables.patch);
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

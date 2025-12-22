import { useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { markAsPaid as markPayableAsPaid, createPayable, updatePayable, getNextPayableEntryNumber, PayableInsert, PayableRow } from '@/services/financialPayablesService';
import { useToast } from '@/components/ui/use-toast';
import { financialAuditService } from '@/services/financialAuditService';
import { supabase } from '@/lib/supabase';
import { addWeeks, addMonths, addYears } from 'date-fns';

export function usePayablesMutations(payables: Array<{ id: string; tenant_id: string; net_amount?: number }>) {
  const { toast } = useToast();
  const { currentTenant } = useTenantAccessGuard();
  const audit = financialAuditService;

  async function logAudit(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT_RECEIVED',
    entityId: string,
    newValues?: Record<string, unknown> | null,
    oldValues?: Record<string, unknown> | null
  ) {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id || 'system';
    const tenantId = currentTenant?.id || '';
    
    // Convert Record<string, unknown> to Record<string, any> implicitly by passing to the service
    // which expects Record<string, any>. We avoid explicit 'any' casting here.
    await audit.logAuditEntry({
      tenant_id: tenantId,
      user_id: userId,
      action: action,
      entity_type: 'PAYMENT',
      entity_id: entityId,
      new_values: newValues || undefined,
      old_values: oldValues || undefined,
      metadata: { source: 'contas-a-pagar' },
      risk_level: 'LOW',
    });
  }

  const markAsPaidMutation = useSecureTenantMutation(
    async (_supabase, tenantId, { entryId }: { entryId: string }) => {
      // 1. Validação Client-Side
      const entry = payables.find((p) => p.id === entryId);
      if (!entry || entry.tenant_id !== tenantId) {
        throw new Error('VIOLAÇÃO DE SEGURANÇA: Tentativa de alterar outro tenant');
      }
      const amount = entry.net_amount ?? 0;
      
      // 2. Execução com cliente injetado (context aware)
      const updated = await markPayableAsPaid(entryId, amount, 'MANUAL', _supabase);
      
      // 3. Auditoria Obrigatória
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

  type CreatePayload = Omit<PayableInsert, 'tenant_id'> & {
    recurrence?: {
      period: 'WEEKLY' | 'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL';
      times: number;
    };
  };

  const handleCreatePayable = async (_supabase: any, tenantId: string, payload: CreatePayload) => {
    // Check if recurrence is requested
    if (payload.recurrence && payload.recurrence.times > 1) {
      const { period, times } = payload.recurrence;
      // Remove recurrence from payload to avoid sending it to DB if it's not in schema (though extra fields might be ignored or cause error depending on implementation)
      // The service createPayable takes PayableInsert which doesn't have 'recurrence' object, but 'metadata'
      
      const baseDueDate = new Date(payload.due_date);
      // Ajuste de fuso horário simples para garantir que a data não volte um dia ao converter
      // Assumindo que o input date vem como YYYY-MM-DD
      const [y, m, d] = payload.due_date.split('-').map(Number);
      const baseDateObj = new Date(y, m - 1, d);

      const baseIssueDate = payload.issue_date ? new Date(payload.issue_date) : null;
      const results = [];

      // Determine base entry number if not provided
      let baseEntryNumber = payload.entry_number;
      if (!baseEntryNumber) {
        // Generate a new number to serve as base for the recurrence set
        baseEntryNumber = await getNextPayableEntryNumber(tenantId, _supabase);
      }

      for (let i = 0; i < times; i++) {
        let newDueDate = baseDateObj;
        // let newIssueDate = baseIssueDate; // Issue date usually remains same for the invoice, but due date changes. Or maybe issue date changes too? Usually issue date is when the bill was created. Let's keep issue date same for now or maybe add months too?
        // User requirement: "parcelas... um para o mes atual e outra para o proximo mes". This refers to due date.

        if (i > 0) {
          if (period === 'WEEKLY') {
            newDueDate = addWeeks(baseDateObj, i);
          } else if (period === 'MONTHLY') {
            newDueDate = addMonths(baseDateObj, i);
          } else if (period === 'SEMIANNUAL') {
            newDueDate = addMonths(baseDateObj, i * 6);
          } else if (period === 'ANNUAL') {
            newDueDate = addYears(baseDateObj, i);
          }
        }

        const { recurrence, ...basePayload } = payload; // remove recurrence object

        const itemPayload: PayableInsert = {
          tenant_id: tenantId,
          ...basePayload,
          due_date: format(newDueDate, 'yyyy-MM-dd'),
          // Handle entry_number with suffix for recurrence
          entry_number: `${baseEntryNumber} ${i + 1}/${times}`,
          metadata: {
            ...payload.metadata,
            recurrence: {
              current: i + 1,
              total: times,
              period
            }
          }
        };

        const created = await createPayable(itemPayload, _supabase);
        
        if (created.tenant_id !== tenantId) {
          throw new Error('Security Violation: Tenant Data Leak Detected');
        }

        await logAudit('CREATE', created.id, created as unknown as Record<string, unknown>, undefined);
        results.push(created);
      }
      return results[0]; // Return the first one as representative
    } else {
      // Single creation
      const { recurrence, ...basePayload } = payload;
      const created = await createPayable({ tenant_id: tenantId, ...basePayload }, _supabase);
      
      if (created.tenant_id !== tenantId) {
        throw new Error('Security Violation: Tenant Data Leak Detected');
      }

      await logAudit('CREATE', created.id, created as unknown as Record<string, unknown>, undefined);
      return created;
    }
  };

  const createPayableAddAnotherMutation = useSecureTenantMutation(
    async (_supabase, tenantId, payload: CreatePayload) => {
      return handleCreatePayable(_supabase, tenantId, payload);
    },
    {
      invalidateQueries: ['contas-a-pagar'],
      onSuccess: () => {
        toast({ title: 'Salvo', description: 'Contas a pagar criadas' });
      },
    }
  );

  const createPayableSaveInfoMutation = useSecureTenantMutation(
    async (_supabase, tenantId, payload: CreatePayload) => {
      return handleCreatePayable(_supabase, tenantId, payload);
    },
    {
      invalidateQueries: ['contas-a-pagar'],
      onSuccess: () => {
        toast({ title: 'Salvo', description: 'Contas a pagar criadas' });
      },
    }
  );

  const updatePayableMutation = useSecureTenantMutation(
    async (_supabase, tenantId, variables: { id: string; patch: Partial<PayableInsert> }) => {
      // 1. Verificação de Propriedade (Read before Write) usando cliente injetado
      const { data: oldRow, error: fetchError } = await _supabase
        .from('financial_payables')
        .select('*')
        .eq('id', variables.id)
        .eq('tenant_id', tenantId)
        .single();
        
      if (fetchError) throw new Error(fetchError.message);
      
      // 2. Atualização Segura
      const updated = await updatePayable(variables.id, variables.patch, _supabase);
      
      // 3. Auditoria
      await logAudit('UPDATE', variables.id, updated as unknown as Record<string, unknown>, oldRow as unknown as Record<string, unknown>);
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

function format(date: Date, fmt: string): string {
  // Simple format wrapper to match yyyy-MM-dd
  // Or import from date-fns
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

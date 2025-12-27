import { useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { markAsPaid as markPayableAsPaid, createPayable, updatePayable, getNextPayableEntryNumber, PayableInsert, PayableRow } from '@/services/financialPayablesService';
import { useToast } from '@/components/ui/use-toast';
import { financialAuditService } from '@/services/financialAuditService';
import { supabase } from '@/lib/supabase';
import { addWeeks, addMonths, addYears, isWeekend, addDays, subDays, format } from 'date-fns';

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
      entity_type: 'PAYABLE',
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
      
      // Obter usuário atual para auditoria
      const { data: authData } = await _supabase.auth.getUser();
      const userId = authData.user?.id || null;

      // 2. Execução com cliente injetado (context aware)
      const updated = await markPayableAsPaid(entryId, amount, 'MANUAL', userId, _supabase);
      
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
      weekendRule?: 'KEEP' | 'ANTICIPATE' | 'POSTPONE';
      repeatDay?: number;
    };
  };

  const handleCreatePayable = async (_supabase: any, tenantId: string, payload: CreatePayload) => {
    // Obter usuário atual para auditoria
    const { data: authData } = await _supabase.auth.getUser();
    const userId = authData.user?.id || null;

    // Check if recurrence is requested
    if (payload.recurrence && payload.recurrence.times > 1) {
      const { period, times, weekendRule, repeatDay } = payload.recurrence;
      
      const [y, m, d] = payload.due_date.split('-').map(Number);
      const initialDate = new Date(y, m - 1, d);
      // Use repeatDay if provided, otherwise use the day of initial date
      const baseDay = repeatDay || initialDate.getDate();

      const results = [];

      // Determine base entry number if not provided
      let baseEntryNumber = payload.entry_number;
      if (!baseEntryNumber) {
        baseEntryNumber = await getNextPayableEntryNumber(tenantId, _supabase);
      }

      const recurrenceId = self.crypto.randomUUID();

      for (let i = 0; i < times; i++) {
        let nextDate = new Date(initialDate);

        if (i > 0) {
          if (period === 'WEEKLY') {
            nextDate = addWeeks(initialDate, i);
          } else if (period === 'MONTHLY') {
            nextDate = addMonths(initialDate, i);
            // Adjust day for monthly recurrence
            if (baseDay > 28) {
                 const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
                 nextDate.setDate(Math.min(baseDay, lastDayOfMonth));
            } else {
                 nextDate.setDate(baseDay);
            }
          } else if (period === 'SEMIANNUAL') {
            nextDate = addMonths(initialDate, i * 6);
          } else if (period === 'ANNUAL') {
            nextDate = addYears(initialDate, i);
          }
        }

        // Apply weekend rule
        let finalDate = new Date(nextDate);
        if (weekendRule && isWeekend(finalDate)) {
            if (weekendRule === 'ANTICIPATE') {
                while (isWeekend(finalDate)) {
                    finalDate = subDays(finalDate, 1);
                }
            } else if (weekendRule === 'POSTPONE') {
                while (isWeekend(finalDate)) {
                    finalDate = addDays(finalDate, 1);
                }
            }
        }

        const { recurrence, ...basePayload } = payload; // remove recurrence object

        const itemPayload: PayableInsert = {
          tenant_id: tenantId,
          ...basePayload,
          due_date: format(finalDate, 'yyyy-MM-dd'),
          // Handle entry_number without suffix
          entry_number: baseEntryNumber,
          installments: `${String(i + 1).padStart(3, '0')}/${String(times).padStart(3, '0')}`,
          metadata: {
            ...payload.metadata,
            recurrence: {
              current: i + 1,
              total: times,
              period,
              weekendRule,
              repeatDay
            }
          },
          created_by: userId,
          updated_by: userId
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
      const created = await createPayable({ 
        tenant_id: tenantId, 
        ...basePayload,
        installments: '001/001',
        created_by: userId,
        updated_by: userId
      }, _supabase);
      
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
      // Obter usuário atual para auditoria
      const { data: authData } = await _supabase.auth.getUser();
      const userId = authData.user?.id || null;

      const patchWithUser = {
        ...variables.patch,
        updated_by: userId,
      };

      // 1. Verificação de Propriedade (Read before Write) usando cliente injetado
      const { data: oldRow, error: fetchError } = await _supabase
        .from('financial_payables')
        .select('*')
        .eq('id', variables.id)
        .eq('tenant_id', tenantId)
        .single();
        
      if (fetchError) throw new Error(fetchError.message);
      
      // 2. Atualização Segura
      const updated = await updatePayable(variables.id, patchWithUser, _supabase);
      
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

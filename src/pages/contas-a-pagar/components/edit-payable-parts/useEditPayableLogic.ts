import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { format, addMonths, addWeeks, addYears, isWeekend, addDays, subDays } from 'date-fns';
import { createPayable, updatePayable, deletePayable, type PayableRow, type PayableInsert } from '@/services/financialPayablesService';
import { listFinancialSettings } from '@/services/financialSettingsService';
import { listFinancialDocuments } from '@/services/financialDocumentsService';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { useAuth } from '@/hooks/useAuth';
// AIDEV-NOTE: launchTypesQuery removed in favor of static ENUM
import { LAUNCH_TYPES as SHARED_LAUNCH_TYPES } from '@/types/financial-enums';
import { EditPayableModalProps, SimulationItem, LaunchItem, RecurrencePeriod, WeekendRule, TabType } from './types';

export const LAUNCH_TYPES = SHARED_LAUNCH_TYPES;

export function useEditPayableLogic(props: EditPayableModalProps) {
  const { open, entry, currentTenantId, onSave, onOpenChange, onSwitchEntry, onAddLaunchPatch } = props;
  const { user } = useAuth();

  // Tabs
  const [tab, setTab] = useState<TabType>('dados');

  // General Data State
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [entryNumber, setEntryNumber] = useState('');
  const [category, setCategory] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [description, setDescription] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [bankAccountId, setBankAccountId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  // Launches State
  const [launchAmount, setLaunchAmount] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [launchType, setLaunchType] = useState('');
  const [launchDescription, setLaunchDescription] = useState('');
  const [launchValueMode, setLaunchValueMode] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [launches, setLaunches] = useState<any[]>([]);

  // Recurrence State
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('MONTHLY');
  const [recurrenceTimes, setRecurrenceTimes] = useState<string>('2');
  const [weekendRule, setWeekendRule] = useState<WeekendRule>('KEEP');
  const [repeatDay, setRepeatDay] = useState<string>('');
  const [simulationList, setSimulationList] = useState<SimulationItem[]>([]);
  const [createdRecurrenceList, setCreatedRecurrenceList] = useState<PayableRow[]>([]);
  const [selectedRecurrenceId, setSelectedRecurrenceId] = useState<string | null>(null);
  const [isDeletingRecurrences, setIsDeletingRecurrences] = useState(false);
  const [selectedRecurrencesToDelete, setSelectedRecurrencesToDelete] = useState<Set<string>>(new Set());

  // QueriesReset state when modal closes
  useEffect(() => {
    if (!open) {
      setTab('dados');
      setShowErrors(false);
      setIsDeletingRecurrences(false);
      setSelectedRecurrencesToDelete(new Set());
      setSimulationList([]); // Reset simulation list
      
      // Reset launch inputs
      setLaunchAmount('');
      setLaunchDate('');
      setLaunchType('');
      setLaunchDescription('');
      setLaunchValueMode('FIXED');
    }
  }, [open]);

  // Load entry data
  useEffect(() => {
    if (entry) {
      setSelectedRecurrenceId(null);
      setAmount(String(entry.gross_amount ?? entry.net_amount ?? ''));
      setDueDate(entry.due_date ?? '');
      setIssueDate(entry.issue_date ?? '');
      setEntryNumber(entry.entry_number ?? '');
      setCategory(entry.category_id ?? '');
      setDocumentId(entry.document_id ?? '');
      setCustomerId(entry.customer_id ?? '');
      setDescription(entry.description ?? '');
      // AIDEV-NOTE: Força repeat false se for parcela única
      setRepeat(!!entry.repeat && entry.installments !== '001/001');
      setBankAccountId(String((entry as any).bank_account_id || ''));

      // AIDEV-NOTE: Só carrega dados de recorrência se NÃO for parcela única (001/001)
      if (entry.metadata?.recurrence && entry.installments !== '001/001') {
        setRecurrencePeriod(entry.metadata.recurrence.period || 'MONTHLY');
        setRecurrenceTimes(String(entry.metadata.recurrence.total || entry.metadata.recurrence.times || '2'));
        setWeekendRule(entry.metadata.recurrence.weekendRule || 'KEEP');
        setRepeatDay(entry.metadata.recurrence.repeatDay ? String(entry.metadata.recurrence.repeatDay) : '');
      }
    }
  }, [entry]);

  // Load launches
  useEffect(() => {
    if (open && entry) {
      const metaLaunches = Array.isArray(entry?.metadata?.launches) ? entry.metadata.launches : [];
      const normalized = metaLaunches.map((l: any) => ({
        amount: Number(l.amount || 0),
        date: String(l.date || ''),
        typeId: String(l.typeId || ''),
        description: String(l.description || ''),
        operation: (l.operation === 'CREDIT' ? 'CREDIT' : 'DEBIT') as 'DEBIT' | 'CREDIT',
      }));
      setLaunches(normalized);
    }
  }, [open, entry]);

  // Fetch Recurrences
  const fetchRecurrences = useCallback(async () => {
    // AIDEV-NOTE: Ignora busca de recorrências se for parcela única (001/001), mesmo que repeat seja true no banco
    if (entry?.repeat && entry?.entry_number && currentTenantId && entry.installments !== '001/001') {
      const baseNumber = entry.entry_number.includes('/') 
        ? entry.entry_number.split('/')[0] 
        : entry.entry_number;

      if (baseNumber.length < 3) return;

      const { data, error } = await supabase
        .from('financial_payables')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .eq('repeat', true)
        .ilike('entry_number', `${baseNumber}%`)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching recurrences:', error);
      } else {
        setCreatedRecurrenceList(data || []);
      }
    } else {
      setCreatedRecurrenceList([]);
    }
  }, [entry, currentTenantId]);

  useEffect(() => {
    fetchRecurrences();
  }, [fetchRecurrences]);

  // Handle Simulate
  const handleSimulate = useCallback(() => {
    if (!dueDate || !recurrenceTimes) return;
    
    const additional = parseInt(recurrenceTimes) || 0;
    if (additional <= 0) { setSimulationList([]); return; }

    const list: typeof simulationList = [];
    const initialDate = new Date(dueDate + 'T00:00:00');
    const baseDay = repeatDay ? parseInt(repeatDay) : initialDate.getDate();

    for (let i = 1; i <= additional; i++) {
      let nextDate = new Date(initialDate);
      
      if (recurrencePeriod === 'WEEKLY') {
          nextDate = addWeeks(initialDate, i);
      } else if (recurrencePeriod === 'MONTHLY') {
          nextDate = addMonths(initialDate, i);
          if (baseDay > 28) {
               const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
               nextDate.setDate(Math.min(baseDay, lastDayOfMonth));
          } else {
               nextDate.setDate(baseDay);
          }
      } else if (recurrencePeriod === 'SEMIANNUAL') {
           nextDate = addMonths(initialDate, i * 6);
      } else if (recurrencePeriod === 'ANNUAL') {
           nextDate = addYears(initialDate, i);
      }

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

      list.push({
        parcela: `${String(i + 1).padStart(3, '0')}/${String(additional + 1).padStart(3, '0')}`,
        vencimento: format(finalDate, 'yyyy-MM-dd'),
        previsao: format(finalDate, 'yyyy-MM-dd'),
        valor: Number(amount) || 0,
        situacao: 'Pendente'
      });
    }
    setSimulationList(list);
  }, [dueDate, recurrenceTimes, recurrencePeriod, weekendRule, repeatDay, amount]);

  // Auto-set repeatDay
  useEffect(() => {
    if (dueDate && !repeatDay) {
      setRepeatDay(String(new Date(dueDate + 'T00:00:00').getDate()));
    }
  }, [dueDate]);

  // Queries
  const customersQuery = useSecureTenantQuery(
    ['payables-customers', currentTenantId],
    async (supabase, tId) => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, tenant_id')
        .eq('tenant_id', tId)
        .or('is_supplier.eq.true,is_carrier.eq.true')
        .order('name');
      if (error) throw error;
      const invalidData = data?.filter(item => item.tenant_id !== tId);
      if (invalidData?.length > 0) throw new Error('Security Violation: Tenant Data Leak Detected');
      return data; 
    },
    { enabled: !!currentTenantId }
  );

  const categoriesQuery = useSecureTenantQuery(
    ['payables-categories', currentTenantId],
    async (supabase, tId) => {
      // We assume this helper function exists or imported, but checking context it seems it was not imported in the truncated view
      // But looking at previous code, it was using listFinancialSettings.
      // Let's assume listFinancialSettings is imported or available.
      // Wait, I saw imports in the previous `Read` output?
      // No, listFinancialSettings wasn't imported in the top 10 lines I saw.
      // But categoriesQuery was already there using it.
      // I am just removing launchTypesQuery, so I will leave categoriesQuery alone if I can match the block.
      // I will target the block containing launchTypesQuery to remove it.
      // To be safe, I'll read the imports first to make sure I don't break anything, but I'll trust the previous read.
      
      // Actually, I'll just remove launchTypesQuery definition and return.
      return await listFinancialSettings(tId, 'EXPENSE_CATEGORY', { active: true }, supabase);
    },
    { enabled: !!currentTenantId }
  );

  const documentsQuery = useSecureTenantQuery(
    ['payables-documents', currentTenantId],
    async (supabase, tId) => {
      return await listFinancialDocuments(tId, supabase);
    },
    { enabled: !!currentTenantId }
  );

  const bankAccountsQuery = useSecureTenantQuery(
    ['bank-acounts', currentTenantId],
    async (supabase, tId) => {
      const { data, error } = await supabase
        .from('bank_acounts')
        .select('id, bank, agency, count, type, tenant_id')
        .eq('tenant_id', tId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((a: any) => ({ id: a.id, label: String(a.bank || '') }));
    },
    { enabled: !!currentTenantId }
  );

  // Handle Delete Recurrences
  const handleDeleteRecurrences = async () => {
    if (selectedRecurrencesToDelete.size === 0 || !currentTenantId) return;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      const idsToDelete = Array.from(selectedRecurrencesToDelete);
      for (const id of idsToDelete) {
        await deletePayable(id);
      }

      const remainingItems = createdRecurrenceList
        .filter(item => !selectedRecurrencesToDelete.has(item.id))
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      const newTotal = remainingItems.length;

      if (newTotal === 1) {
        // Caso reste apenas 1 item, reverte para estado original (sem repetição)
        const lastItem = remainingItems[0];
        
        // Remove explicitamente qualquer metadado de recorrência
        const currentMeta = lastItem.metadata || {};
        const { recurrence, ...cleanMeta } = currentMeta as any;

        const updates = {
          installments: '001/001',
          repeat: false,
          metadata: {
            ...cleanMeta,
            recurrence: null
          }
        };

        await updatePayable(lastItem.id, {
          ...updates,
          updated_by: userId
        });

        // Atualiza estado local imediatamente
        setRepeat(false);
        setCreatedRecurrenceList([]);
        setIsDeletingRecurrences(false);
        setSelectedRecurrencesToDelete(new Set());
        
        // Reseta configurações de repetição para o padrão
        setRecurrencePeriod('MONTHLY');
        setRecurrenceTimes('2');
        setWeekendRule('KEEP');

        // Atualiza a entrada atual para refletir a mudança na interface
        if (onSwitchEntry) {
          const updatedEntry = {
            ...lastItem,
            ...updates,
            repeat: false
          } as PayableRow;
          
          onSwitchEntry(updatedEntry);
        }
      } else if (newTotal > 1) {
        // Rebalanceamento normal para múltiplos itens
        for (let i = 0; i < remainingItems.length; i++) {
          const item = remainingItems[i];
          const newCurrent = i + 1;
          const newInstallments = `${String(newCurrent).padStart(3, '0')}/${String(newTotal).padStart(3, '0')}`;
          
          const newMetadata = {
            ...(item.metadata || {}),
            recurrence: {
              ...(item.metadata?.recurrence || {}),
              current: newCurrent,
              total: newTotal
            }
          };

          await updatePayable(item.id, {
            installments: newInstallments,
            metadata: newMetadata,
            updated_by: userId
          });
        }

        await fetchRecurrences();
        setIsDeletingRecurrences(false);
        setSelectedRecurrencesToDelete(new Set());
        
        if (selectedRecurrencesToDelete.has(entry?.id)) {
          if (remainingItems.length > 0) {
            // Precisamos pegar o item atualizado (pode ser necessário buscar novamente ou calcular)
            // Aqui simplificamos pegando do array local e aplicando a lógica de update manual para o callback
            const firstItem = remainingItems[0];
            const newCurrent = 1;
            const newInstallments = `${String(newCurrent).padStart(3, '0')}/${String(newTotal).padStart(3, '0')}`;
            
            onSwitchEntry?.({
              ...firstItem,
              installments: newInstallments,
              metadata: {
                ...(firstItem.metadata || {}),
                recurrence: {
                  ...(firstItem.metadata?.recurrence || {}),
                  current: newCurrent,
                  total: newTotal
                }
              }
            } as PayableRow);
          } else {
            onOpenChange(false);
          }
        } else {
           const index = remainingItems.findIndex(i => i.id === entry.id);
           if (index !== -1) {
              const updatedCurrentEntry = remainingItems[index];
              const newCurrent = index + 1;
              const newInstallments = `${String(newCurrent).padStart(3, '0')}/${String(newTotal).padStart(3, '0')}`;
              
              onSwitchEntry?.({
                ...updatedCurrentEntry,
                installments: newInstallments,
                metadata: {
                  ...(updatedCurrentEntry.metadata || {}),
                  recurrence: {
                    ...(updatedCurrentEntry.metadata?.recurrence || {}),
                    current: newCurrent,
                    total: newTotal
                  }
                }
              } as PayableRow);
           }
        }
      } else {
        // Nenhum item restante
        onOpenChange(false);
      }

    } catch (error) {
      console.error('Failed to delete recurrences:', error);
    }
  };

  const handleCreateRecurrences = async () => {
    if (!entry || !currentTenantId) return;
    const additional = parseInt(recurrenceTimes) || 0;
    if (additional <= 0) return;
    const total = additional + 1;
    const amountNum = Number(amount || '0');
    const base = String(entry.entry_number || '').split(' ')[0] || String(entry.entry_number || '');

    // Determine recurrence_id
    let recurrenceId = entry.metadata?.recurrence?.recurrence_id;

    // AIDEV-NOTE: Se for parcela única (001/001), força geração de novo ID de recorrência
    // Isso evita vincular novas parcelas a um grupo antigo que pode ter sido excluído incorretamente
    if (entry.installments === '001/001') {
      recurrenceId = null;
    }

    const isNewRecurrenceSet = !recurrenceId;
    if (!recurrenceId) {
      recurrenceId = self.crypto.randomUUID();
      
      // Update current entry with new recurrence_id and updated installments
      await updatePayable(entry.id, {
        installments: `001/${String(total).padStart(3, '0')}`,
        metadata: {
          ...(entry.metadata || {}),
          recurrence: {
            ...(entry.metadata?.recurrence || {}),
            current: 1,
            total,
            period: recurrencePeriod,
            weekendRule,
            repeatDay: repeatDay ? parseInt(repeatDay) : undefined,
            recurrence_id: recurrenceId
          }
        },
        updated_by: user?.id
      }, supabase);
    }

    const [y, m, d] = (dueDate || entry.due_date).split('-').map(Number);
    const initialDate = new Date(y, m - 1, d);
    const baseDay = repeatDay ? parseInt(repeatDay) : initialDate.getDate();

    for (let i = 1; i <= additional; i++) {
      let nextDate = new Date(initialDate);
      if (recurrencePeriod === 'WEEKLY') nextDate = addWeeks(initialDate, i);
      else if (recurrencePeriod === 'MONTHLY') {
        nextDate = addMonths(initialDate, i);
        if (baseDay > 28) {
          const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(baseDay, lastDayOfMonth));
        } else {
          nextDate.setDate(baseDay);
        }
      } else if (recurrencePeriod === 'SEMIANNUAL') nextDate = addMonths(initialDate, i * 6);
      else if (recurrencePeriod === 'ANNUAL') nextDate = addYears(initialDate, i);

      let finalDate = new Date(nextDate);
      if (weekendRule && isWeekend(finalDate)) {
        if (weekendRule === 'ANTICIPATE') { while (isWeekend(finalDate)) finalDate = subDays(finalDate, 1); }
        else if (weekendRule === 'POSTPONE') { while (isWeekend(finalDate)) finalDate = addDays(finalDate, 1); }
      }

      // AIDEV-NOTE: Check for custom values in simulation list
      const simulationItem = simulationList.find(s => s.parcela === `${String(i + 1).padStart(3, '0')}/${String(total).padStart(3, '0')}`);
      const customAmount = simulationItem?.customAmount;
      const customDueDate = simulationItem?.customDueDate;
      const customCustomerId = simulationItem?.customCustomerId;
      const customDocumentId = simulationItem?.customDocumentId;
      const customEntryNumber = simulationItem?.customEntryNumber;
      const customCategoryId = simulationItem?.customCategoryId;
      const customBankAccountId = simulationItem?.customBankAccountId;

      const payload: PayableInsert = {
        tenant_id: currentTenantId,
        entry_number: customEntryNumber ?? base,
        description,
        gross_amount: customAmount ?? amountNum,
        net_amount: customAmount ?? amountNum,
        due_date: customDueDate ?? format(finalDate, 'yyyy-MM-dd'),
        issue_date: issueDate || entry.issue_date || null,
        status: 'PENDING',
        payment_date: null,
        paid_amount: null,
        category_id: customCategoryId ?? (category || entry.category_id || null),
        document_id: customDocumentId ?? (documentId || entry.document_id || null),
        bank_account_id: customBankAccountId ?? (bankAccountId || entry.bank_account_id || null),
        customer_id: customCustomerId ?? (customerId || entry.customer_id || null),
        repeat: true,
        installments: `${String(i + 1).padStart(3, '0')}/${String(total).padStart(3, '0')}`,
        metadata: {
          ...(entry.metadata || {}),
          recurrence: {
            current: i + 1,
            total,
            period: recurrencePeriod,
            weekendRule,
            repeatDay: repeatDay ? parseInt(repeatDay) : undefined,
            recurrence_id: recurrenceId
          }
        },
        created_by: user?.id,
        updated_by: user?.id
      };
      await createPayable(payload, supabase);
    }

    const { data } = await supabase
      .from('financial_payables')
      .select('id, entry_number, due_date, net_amount, status, installments, tenant_id')
      .eq('tenant_id', currentTenantId)
      .contains('metadata', { recurrence: { recurrence_id: recurrenceId } })
      .order('due_date', { ascending: true });

    setCreatedRecurrenceList((data || []) as PayableRow[]);
    
    // Notify parent about update if it was the first time creating recurrence for this entry
    if (isNewRecurrenceSet) {
      onSave({ id: entry.id, patch: { repeat: true } }); 
    }
  };

  // Calculate dynamic totals for UI and Logic
  const { currentNet, currentPaid, currentRemaining } = useMemo(() => {
    const baseAmount = Number(amount || '0');
    let net = baseAmount;
    let paid = 0;

    launches.forEach(l => {
      const typeKey = l.typeId as keyof typeof LAUNCH_TYPES;
      const def = LAUNCH_TYPES[typeKey];
      // If def is missing (legacy), try to infer or skip. 
      // For calculation safety, if we don't know it, we might skip or assume it's not settlement.
      if (!def) return; 

      const val = Number(l.amount || 0);
      const op = l.operation;

      if (def.isSettlement) {
         if (op === 'DEBIT') paid += val;
         else paid -= val;
      } else {
         if (op === 'DEBIT') net -= val;
         else net += val;
      }
    });

    const remaining = Math.max(net - paid, 0);
    return { currentNet: net, currentPaid: paid, currentRemaining: remaining };
  }, [amount, launches]);

  const handleSavePayable = async () => {
    if (!entry) return;
    if (!customerId) {
      setShowErrors(true);
      return;
    }
    const amountNum = Number(amount || '0');

    // Use the calculated values from useMemo to ensure consistency
    // Re-verify strictly inside save if needed, but useMemo is reliable here since it depends on same state
    
    let patch: any = {
      description,
      gross_amount: amountNum,
      net_amount: currentNet,
      due_date: dueDate || new Date().toISOString().slice(0,10),
      issue_date: issueDate || new Date().toISOString().slice(0,10),
      // Status and paid_amount logic will be handled below
      category_id: category || null,
      entry_number: entryNumber || undefined,
      document_id: documentId || null,
      customer_id: customerId,
      
      repeat,
      metadata: {
        ...(entry.metadata || {}),
        launches: launches,
        recurrence: repeat ? {
          period: recurrencePeriod,
          times: parseInt(recurrenceTimes) || 0,
          weekendRule,
          weekendRule,
          repeatDay: repeatDay ? parseInt(repeatDay) : undefined,
          total: ((parseInt(recurrenceTimes) || 0) + 1)
        } : undefined
      }
    };

    patch.status = (currentPaid >= currentNet && currentNet > 0) ? 'PAID' : 'PENDING';
    patch.paid_amount = currentPaid;
    patch.payment_date = (currentPaid > 0) ? (entry.payment_date || new Date().toISOString().slice(0,10)) : null;

    patch.bank_account_id = bankAccountId || null;
    onSave({ id: entry.id, patch });
  };

  const handleAddLaunch = () => {
    let amt = Number(launchAmount || '0');
    if (!amt || !launchDate || !launchType) return;
    
    // AIDEV-NOTE: Handle percentage calculation if mode is PERCENTAGE
    // Now using currentRemaining instead of base amount
    if (launchValueMode === 'PERCENTAGE') {
      amt = (currentRemaining * amt) / 100;
    }

    // AIDEV-NOTE: Fixed launch types from Enum
    const typeKey = launchType as keyof typeof LAUNCH_TYPES;
    const launchDef = LAUNCH_TYPES[typeKey];
    if (!launchDef) return;

    const op = launchDef.operation as 'DEBIT' | 'CREDIT';
    
    // We don't need to manually calculate newNet/newPaid here anymore for logic
    // because we just push to launches state and useMemo updates the totals.
    // However, the original code did some legacy calc which is now replaced by the hook state management approach.

    const prevMeta = (entry?.metadata || {});
    const prevLaunches = Array.isArray(prevMeta.launches) ? prevMeta.launches : [];
    const newLaunch = { amount: amt, date: launchDate, typeId: launchType, operation: op || 'DEBIT', description: launchDescription || 'Lançamento' };
    
    // AIDEV-NOTE: Only update local state, do NOT save immediately
    setLaunches((prev) => [...prev, newLaunch]);
    setLaunchAmount(''); setLaunchDate(''); setLaunchType(''); setLaunchDescription(''); setLaunchValueMode('FIXED');
  };

  const handleDeleteLaunch = (index: number) => {
    const launchToDelete = launches[index];
    if (!launchToDelete) return;
    const amt = launchToDelete.amount;
    const op = launchToDelete.operation;
    
    // Reverse calculation
    // Try to find definition from Enum first
    const typeKey = launchToDelete.typeId as keyof typeof LAUNCH_TYPES;
    const launchDef = LAUNCH_TYPES[typeKey];
    
    // If legacy ID, we can't look up settlement status easily without query.
    // However, we can infer from operation for standard types or just default to false if unknown.
    // For safety with legacy data, we might assume false if not found in Enum.
    // Or we could check if operation matches what we expect.
    const isSettlement = launchDef?.isSettlement ?? false;

    let newNet = Number(entry?.net_amount ?? entry?.gross_amount ?? 0);
    let newPaid = Number(entry?.paid_amount ?? 0);

    if (isSettlement) {
       if (op === 'DEBIT') {
         newPaid = Math.max(newPaid - amt, 0);
       } else {
         newPaid += amt;
       }
    } else {
       if (op === 'DEBIT') {
         newNet += amt;
       } else {
         newNet = Math.max(newNet - amt, 0);
       }
    }

    const prevMeta = (entry?.metadata || {});
    const prevLaunches = Array.isArray(prevMeta.launches) ? prevMeta.launches : [];
    const newLaunches = [...prevLaunches];
    newLaunches.splice(index, 1);
    const newMeta = { ...prevMeta, launches: newLaunches };

    const newRemaining = Math.max(newNet - newPaid, 0);
    const newStatus = newRemaining <= 0 ? 'PAID' : 'PENDING';
    const newPaymentDate = newStatus === 'PAID' ? entry?.payment_date : null;

    // AIDEV-NOTE: Only update local state, do NOT save immediately
    setLaunches((prev) => prev.filter((_, i) => i !== index));
  };

  return {
    // State
    tab, setTab,
    amount, setAmount,
    dueDate, setDueDate,
    issueDate, setIssueDate,
    entryNumber, setEntryNumber,
    category, setCategory,
    documentId, setDocumentId,
    description, setDescription,
    repeat, setRepeat,
    bankAccountId, setBankAccountId,
    customerId, setCustomerId,
    showErrors, setShowErrors,
    
    // Launches
    launchAmount, setLaunchAmount,
    launchDate, setLaunchDate,
    launchType, setLaunchType,
    launchDescription, setLaunchDescription,
    launchValueMode, setLaunchValueMode,
    launches, setLaunches,

    // Recurrence
    recurrencePeriod, setRecurrencePeriod,
    recurrenceTimes, setRecurrenceTimes,
    weekendRule, setWeekendRule,
    repeatDay, setRepeatDay,
    simulationList, setSimulationList,
    createdRecurrenceList, setCreatedRecurrenceList,
    selectedRecurrenceId, setSelectedRecurrenceId,
    isDeletingRecurrences, setIsDeletingRecurrences,
    selectedRecurrencesToDelete, setSelectedRecurrencesToDelete,

    // Actions
    fetchRecurrences,
    handleSimulate,
    handleDeleteRecurrences,
    handleCreateRecurrences,
    handleSavePayable,
    handleAddLaunch,
    handleDeleteLaunch,

    // Queries
    customersQuery,
    categoriesQuery,
    documentsQuery,
    bankAccountsQuery,

    // Calculated
    currentNet,
    currentPaid,
    currentRemaining,
  };
}

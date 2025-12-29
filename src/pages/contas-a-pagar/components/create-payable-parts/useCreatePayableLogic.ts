import { useState, useEffect, useCallback } from 'react';
import { format, addMonths, addWeeks, addYears, isWeekend, addDays, subDays } from 'date-fns';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { listFinancialSettings } from '@/services/financialSettingsService';
import { listFinancialDocuments } from '@/services/financialDocumentsService';
import { previewNextPayableEntryNumber, PayableRow } from '@/services/financialPayablesService';
import { supabase } from '@/lib/supabase';
import { CreatePayableModalProps, RecurrencePeriod, WeekendRule, SimulationItem } from './types';

export function useCreatePayableLogic({
  open,
  onOpenChange,
  onSave,
  onSaveAndAddAnother,
  onGenerateRecurrences,
  currentTenantId,
}: CreatePayableModalProps) {
  const [tab, setTab] = useState<'dados' | 'repeticoes' | 'lancamentos' | 'historico'>('dados');
  const [createdEntry, setCreatedEntry] = useState<Partial<PayableRow> | null>(null);
  
  // Form Fields
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entryNumber, setEntryNumber] = useState('');
  const [category, setCategory] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [description, setDescription] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('MONTHLY');
  const [recurrenceTimes, setRecurrenceTimes] = useState<string>('2');
  const [weekendRule, setWeekendRule] = useState<WeekendRule>('KEEP');
  const [repeatDay, setRepeatDay] = useState<string>('');
  const [simulationList, setSimulationList] = useState<SimulationItem[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [createdRecurrenceList, setCreatedRecurrenceList] = useState<PayableRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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

      // STRICT SECURITY VALIDATION
      const invalidData = data?.filter(item => item.tenant_id !== tId);
      if (invalidData?.length > 0) throw new Error('Security Violation: Tenant Data Leak Detected');

      return data; 
    },
    { enabled: !!currentTenantId }
  );

  const categoriesQuery = useSecureTenantQuery(
    ['payables-categories', currentTenantId],
    async (supabase, tId) => {
      const data = await listFinancialSettings(tId, 'EXPENSE_CATEGORY', { active: true }, supabase);
      // STRICT SECURITY VALIDATION
      const invalidData = data?.filter(item => item.tenant_id !== tId);
      if (invalidData?.length > 0) throw new Error('Security Violation: Tenant Data Leak Detected');
      return data;
    },
    { enabled: !!currentTenantId }
  );

  const documentsQuery = useSecureTenantQuery(
    ['payables-documents', currentTenantId],
    async (supabase, tId) => {
      const data = await listFinancialDocuments(tId, supabase);
      // STRICT SECURITY VALIDATION
      const invalidData = data?.filter(item => item.tenant_id !== tId);
      if (invalidData?.length > 0) throw new Error('Security Violation: Tenant Data Leak Detected');
      return data;
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
      
      // STRICT SECURITY VALIDATION
      const invalidData = data?.filter(item => item.tenant_id !== tId);
      if (invalidData?.length > 0) throw new Error('Security Violation: Tenant Data Leak Detected');

      return (data || []).map((a: { id: string; bank: string | null; agency: string | null; count: number | null; type: string | null; tenant_id: string }) => ({ id: a.id, label: String(a.bank ?? 'Banco') }));
    },
    { enabled: !!currentTenantId }
  );

  // Effects & Logic
  const handleSimulate = useCallback(() => {
    if (!dueDate || !recurrenceTimes) return;
    
    const additional = parseInt(recurrenceTimes) || 0;
    if (additional <= 0) { setSimulationList([]); return; }

    const list: SimulationItem[] = [];
    const initialDate = new Date(dueDate + 'T00:00:00');
    const baseDay = repeatDay ? parseInt(repeatDay) : initialDate.getDate();

    // Excluir a parcela original: iniciar do próximo período
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
      if (isWeekend(finalDate)) {
        if (weekendRule === 'ANTICIPATE') {
          while (isWeekend(finalDate)) finalDate = subDays(finalDate, 1);
        } else if (weekendRule === 'POSTPONE') {
          while (isWeekend(finalDate)) finalDate = addDays(finalDate, 1);
        }
      }

      list.push({
        parcela: `${String(i + 1).padStart(3, '0')}/${String(additional + 1).padStart(3, '0')}`,
        vencimento: format(finalDate, 'yyyy-MM-dd'),
        previsao: format(finalDate, 'yyyy-MM-dd'),
        valor: Number(amount) || 0,
        situacao: 'Pendente',
      });
    }
    setSimulationList(list);
  }, [dueDate, recurrenceTimes, recurrencePeriod, weekendRule, repeatDay, amount]);

  useEffect(() => {
    if (dueDate && !repeatDay) {
      setRepeatDay(String(new Date(dueDate + 'T00:00:00').getDate()));
    }
  }, [dueDate]);

  const reset = useCallback(() => {
    setAmount(''); setDueDate(''); setIssueDate(new Date().toISOString().slice(0,10)); setEntryNumber('');
    setCategory(''); setDocumentId(''); setDescription(''); setRepeat(false); setRecurrencePeriod('MONTHLY'); setRecurrenceTimes('2'); setCreatedEntry(null); setTab('dados');
    setWeekendRule('KEEP'); setRepeatDay(''); setSimulationList([]);
    setBankAccountId(''); setCustomerId(''); setShowErrors(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const handleSave = async (addAnother: boolean) => {
    if (!customerId) {
      setShowErrors(true);
      return;
    }

    setIsSaving(true);
    try {
      const amountNum = Number(amount || '0');
      const payload: any = {
        description: description || 'Conta a pagar',
        gross_amount: amountNum,
        net_amount: amountNum,
        due_date: dueDate || new Date().toISOString().slice(0, 10),
        issue_date: issueDate || new Date().toISOString().slice(0, 10),
        status: 'PENDING',
        payment_date: null,
        paid_amount: null,
        category_id: category || null,
        entry_number: (entryNumber && !entryNumber.startsWith('DES-')) ? entryNumber : undefined,
        document_id: documentId || null,
        customer_id: customerId,

        repeat,
        recurrence: repeat ? {
          period: recurrencePeriod,
          times: (parseInt(recurrenceTimes) || 0) + 1,
          weekendRule,
          repeatDay: repeatDay ? parseInt(repeatDay) : undefined,
          total: ((parseInt(recurrenceTimes) || 0) + 1),
        } : undefined,
        bank_account_id: bankAccountId || null,
      };

      if (addAnother) {
        onSaveAndAddAnother(payload);
        reset();
      } else {
        await onSave(payload);
        handleClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmGenerate = useCallback(async () => {
    if (!customerId || !currentTenantId) { setShowErrors(true); return; }
    const additional = parseInt(recurrenceTimes) || 0;
    const total = additional + 1;
    const amountNum = Number(amount || '0');

    const payload: any = {
      description: description || 'Conta a pagar',
      gross_amount: amountNum,
      net_amount: amountNum,
      due_date: dueDate || new Date().toISOString().slice(0, 10),
      issue_date: issueDate || new Date().toISOString().slice(0, 10),
      status: 'PENDING',
      payment_date: null,
      paid_amount: null,
      category_id: category || null,
      entry_number: (entryNumber && !entryNumber.startsWith('DES-')) ? entryNumber : undefined,
      document_id: documentId || null,
      customer_id: customerId,
      repeat: true,
      recurrence: {
        period: recurrencePeriod,
        times: total,
        weekendRule,
        repeatDay: repeatDay ? parseInt(repeatDay) : undefined
      },
      bank_account_id: bankAccountId || null,
    };

    const created = await onGenerateRecurrences?.(payload);
    const createdEntryNumber: string | undefined = created?.entry_number || entryNumber;
    const base = createdEntryNumber ? String(createdEntryNumber).split(' ')[0] : (entryNumber || await previewNextPayableEntryNumber(currentTenantId));

    const { data } = await supabase
      .from('financial_payables')
      .select('id, entry_number, due_date, net_amount, status, installments, tenant_id')
      .eq('tenant_id', currentTenantId)
      .ilike('entry_number', `${base}%`)
      .order('due_date', { ascending: true });

    setCreatedRecurrenceList((data || []) as PayableRow[]);
    setTab('repeticoes');
  }, [customerId, currentTenantId, recurrenceTimes, amount, description, dueDate, issueDate, category, entryNumber, documentId, recurrencePeriod, weekendRule, repeatDay, bankAccountId, onGenerateRecurrences]);

  const handleGenerateNumber = useCallback(async () => {
    if (!currentTenantId) return;
    const nextNumber = await previewNextPayableEntryNumber(currentTenantId);
    if (nextNumber) setEntryNumber(nextNumber);
  }, [currentTenantId]);

  return {
    tab, setTab,
    createdEntry, setCreatedEntry,
    amount, setAmount,
    dueDate, setDueDate,
    issueDate, setIssueDate,
    entryNumber, setEntryNumber,
    category, setCategory,
    documentId, setDocumentId,
    customerId, setCustomerId,
    description, setDescription,
    repeat, setRepeat,
    recurrencePeriod, setRecurrencePeriod,
    recurrenceTimes, setRecurrenceTimes,
    weekendRule, setWeekendRule,
    repeatDay, setRepeatDay,
    simulationList, setSimulationList,
    bankAccountId, setBankAccountId,
    isSaving,

    showErrors, setShowErrors,
    createdRecurrenceList, setCreatedRecurrenceList,
    customersQuery,
    categoriesQuery,
    documentsQuery,
    bankAccountsQuery,
    handleSimulate,
    reset,
    handleClose,
    handleSave,
    handleConfirmGenerate,
    handleGenerateNumber
  };
}

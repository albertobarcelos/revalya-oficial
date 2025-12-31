import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { financeEntriesService, type FinanceEntry, type FinanceEntryUpdate, type FinanceEntryInsert } from '@/services/financeEntriesService';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';
import { toast } from '@/components/ui/use-toast';

export interface EditRecebimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FinanceEntry | null;
  onSave?: () => void;
  readOnly?: boolean;
}

export function useEditRecebimentoLogic(props: EditRecebimentoModalProps) {
  const { open, entry, onSave, onOpenChange } = props;
  const { currentTenant } = useTenantAccessGuard();

  // Tab state
  const [tab, setTab] = useState<'dados' | 'historico'>('dados');

  // Form State
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load entry data
  useEffect(() => {
    if (open) {
      if (entry) {
        // AIDEV-NOTE: Check for amount in multiple possible fields (amount is used in table)
        const val = (entry as any).amount ?? entry.gross_amount ?? entry.net_amount ?? 0;
        setAmount(String(val).replace('.', ',')); // Format for input

        setDueDate(entry.due_date ? String(entry.due_date).substring(0, 10) : '');
        
        setPaymentDate(entry.payment_date ? String(entry.payment_date).substring(0, 10) : '');
        
        setDescription(entry.description ?? '');
        setCategory(entry.category_id ?? '');
        setCustomerId(entry.customer_id ?? '');
        setBankAccountId(entry.bank_account_id ?? '');
        setTab('dados');
        setShowErrors(false);
      } else {
        // Reset fields for new entry
        setAmount('');
        setDueDate('');
        setPaymentDate('');
        setDescription('');
        setCategory('');
        setCustomerId('');
        setBankAccountId('');
        setTab('dados');
        setShowErrors(false);
      }
    }
  }, [open, entry]);

  // Queries
  const customersQuery = useSecureTenantQuery(
    ['customers', currentTenant?.id],
    async (supabaseClient, tenantId) => {
      const { data, error } = await supabaseClient
        .from('customers')
        .select('id, name, company')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return data;
    },
    { enabled: open }
  );

  // Categories Query
  const categoriesQuery = useSecureTenantQuery(
    ['financial_settings', currentTenant?.id, 'RECEIVABLE_CATEGORY'],
    async (supabaseClient, tenantId) => {
      const { data, error } = await supabaseClient
        .from('financial_settings')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('type', 'RECEIVABLE_CATEGORY')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    { enabled: open }
  );

  const bankAccountsQuery = useSecureTenantQuery(
    ['bank_accounts', currentTenant?.id],
    async (supabaseClient, tenantId) => {
      // Note: Using 'bank_acounts' as seen in other parts of the codebase
      const { data, error } = await supabaseClient
        .from('bank_acounts') 
        .select('id, bank, agency, count, type')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      return (data || []).map(acc => ({
        id: acc.id,
        name: acc.bank,
      }));
    },
    { enabled: open }
  );

  // Save handler
  const handleSave = async () => {
    if (!description || !amount || !dueDate) {
      setShowErrors(true);
      toast({
        title: "Erro de validação",
        description: "Preencha os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: FinanceEntryUpdate = {
        description,
        amount: parseFloat(amount.replace(',', '.')), // Usando amount ao invés de gross_amount/net_amount
        due_date: dueDate,
        payment_date: paymentDate || null,
        category_id: category || null,
        customer_id: customerId || null,
        bank_account_id: bankAccountId || null,
        status: paymentDate ? 'PAID' : 'PENDING',
      };

      if (entry?.id) {
        await financeEntriesService.updateEntry(entry.id, payload);
        toast({
          title: "Sucesso",
          description: "Recebimento atualizado com sucesso."
        });
        onSave?.();
        onOpenChange(false);
      } else {
        if (!currentTenant?.id) {
          throw new Error("Sessão inválida. Tente recarregar a página.");
        }

        const insertPayload: FinanceEntryInsert = {
          ...payload,
          tenant_id: currentTenant.id,
          type: 'RECEIVABLE',
          status: paymentDate ? 'PAID' : 'PENDING',
        } as FinanceEntryInsert;

        await financeEntriesService.createEntry(insertPayload);
        toast({
          title: "Sucesso",
          description: "Recebimento criado com sucesso."
        });
        onSave?.();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Erro ao salvar recebimento:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar recebimento.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // State
    tab, setTab,
    amount, setAmount,
    dueDate, setDueDate,
    paymentDate, setPaymentDate,
    description, setDescription,
    category, setCategory,
    customerId, setCustomerId,
    bankAccountId, setBankAccountId,
    showErrors,
    isSaving,

    // Queries
    customersQuery,
    categoriesQuery,
    bankAccountsQuery,

    // Actions
    handleSave
  };
}

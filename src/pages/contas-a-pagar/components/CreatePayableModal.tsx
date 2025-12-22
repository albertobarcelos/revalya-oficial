import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect, useCallback } from 'react';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { listFinancialSettings, FinancialSettingRow } from '@/services/financialSettingsService';
import { listFinancialDocuments, FinancialDocumentRow } from '@/services/financialDocumentsService';
import { previewNextPayableEntryNumber, PayableInsert, PayableRow } from '@/services/financialPayablesService';
import { X } from 'lucide-react';

type PayableFormPayload = Omit<PayableInsert, 'tenant_id'>;

export function CreatePayableModal({
  open,
  onOpenChange,
  onSave,
  onSaveAndAddAnother,
  currentTenantId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (payload: PayableFormPayload) => void;
  onSaveAndAddAnother: (payload: PayableFormPayload) => void;
  currentTenantId?: string;
}) {
  const [tab, setTab] = useState<'dados' | 'lancamentos' | 'historico'>('dados');
  const [createdEntry, setCreatedEntry] = useState<Partial<PayableRow> | null>(null);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entryNumber, setEntryNumber] = useState('');
  const [category, setCategory] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [description, setDescription] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<'WEEKLY' | 'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL'>('MONTHLY');
  const [recurrenceTimes, setRecurrenceTimes] = useState<string>('2');
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [bankAccountId, setBankAccountId] = useState('');

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

  const reset = useCallback(() => {
    setAmount(''); setDueDate(''); setIssueDate(new Date().toISOString().slice(0,10)); setEntryNumber('');
    setCategory(''); setDocumentId(''); setDescription(''); setRepeat(false); setRecurrencePeriod('MONTHLY'); setRecurrenceTimes('2'); setPaidConfirmed(false); setCreatedEntry(null); setTab('dados');
    setBankAccountId('');
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

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="!max-w-[calc(100vw-30px)] !w-[calc(100vw-30px)] !h-[calc(100vh-30px)] !left-[15px] !right-[15px] !top-[15px] !bottom-[15px] !translate-x-0 !translate-y-0 p-0 flex flex-col [&>button]:hidden">
        <div className="flex items-center justify-between h-[55px] min-h-[55px] bg-[rgb(244,245,246)] px-6">
          <DialogTitle className="text-[18px] font-normal leading-[18.48px] text-[rgb(0,0,0)]">Contas a Pagar</DialogTitle>
          <DialogDescription className="sr-only">Criar nova conta a pagar</DialogDescription>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-[rgb(91,91,91)] hover:bg-transparent"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 pb-6 overflow-y-auto">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova conta a pagar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant={tab==='dados' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setTab('dados')}>Dados gerais <span>›</span></Button>
                <Button variant={tab==='lancamentos' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setTab('lancamentos')} disabled={!createdEntry}>Lançamentos <span>›</span></Button>
                <Button variant={tab==='historico' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setTab('historico')} disabled={!createdEntry}>Histórico de alterações <span>›</span></Button>
                <Button variant="outline" className="w-full" onClick={handleClose}>Voltar à listagem</Button>
                {createdEntry && (
                  <div className="space-y-2 mt-2 text-sm">
                    <div className="bg-muted px-3 py-2 rounded">{createdEntry.entry_number}</div>
                    <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                      <span>Vencimento</span>
                      <span>{createdEntry.due_date ? format(new Date(createdEntry.due_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span>
                    </div>
                    <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                      <span>Valor</span>
                      <span>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(createdEntry.gross_amount || createdEntry.net_amount || 0)}</span>
                    </div>
                    <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                      <span>Saldo</span>
                      <span>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Math.max((createdEntry.net_amount || 0) - (createdEntry.paid_amount || 0), 0))}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados gerais da conta a pagar</CardTitle>
              </CardHeader>
              <CardContent>
                {createdEntry && (
                  <div className="mb-4 w-full rounded bg-emerald-600/10 text-emerald-700 px-4 py-2">Conta a pagar salva com sucesso.</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>Valor</Label>
                    <Input placeholder="R$ 0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <Label>Data de vencimento</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Data de emissão</Label>
                    <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label>Número</Label>
                      <Input value={entryNumber} onChange={(e) => setEntryNumber(e.target.value)} disabled={!!createdEntry} />
                    </div>
                    <Button variant="link" onClick={async () => {
                      if (!currentTenantId) return;
                      const next = await previewNextPayableEntryNumber(currentTenantId);
                      setEntryNumber(next);
                    }}>Gerar número</Button>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="w-full h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent className="w-[380px] max-h-[320px] overflow-auto">
                        {categoriesQuery.data?.map((c) => (
                          <SelectItem
                            key={c.id}
                            value={c.id}
                            className="whitespace-normal break-words py-2.5 px-3 text-sm leading-5 min-h-[36px]"
                          >
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de documento</Label>
                    <Select value={documentId} onValueChange={setDocumentId}>
                      <SelectTrigger className="w-full h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent className="w-[380px] max-h-[320px] overflow-auto">
                        {documentsQuery.data?.map((d) => (
                          <SelectItem
                            key={d.id}
                            value={d.id}
                            className="whitespace-normal break-words py-2.5 px-3 text-sm leading-5 min-h-[36px]"
                          >
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Conta bancária</Label>
                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                      <SelectTrigger className="w-full h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent className="w-[380px] max-h-[320px] overflow-auto">
                        {bankAccountsQuery.data?.map((b) => (
                          <SelectItem
                            key={b.id}
                            value={b.id}
                            className="whitespace-normal break-words py-2.5 px-3 text-sm leading-5 min-h-[36px]"
                          >
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-3">
                    <Label>Descrição (opcional)</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="md:col-span-3 space-y-3">
                    <label className="flex items-center gap-2">
                      <Checkbox checked={repeat} onCheckedChange={(v) => setRepeat(!!v)} />
                      Esta conta a pagar irá se repetir
                    </label>
                    
                    {repeat && (
                      <div className="ml-6 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-md border">
                        <div>
                          <Label className="text-xs mb-1.5 block">Período</Label>
                          <Select value={recurrencePeriod} onValueChange={(v: any) => setRecurrencePeriod(v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="WEEKLY">Semanal</SelectItem>
                              <SelectItem value="MONTHLY">Mensal</SelectItem>
                              <SelectItem value="SEMIANNUAL">Semestral</SelectItem>
                              <SelectItem value="ANNUAL">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs mb-1.5 block">Vezes</Label>
                          <Input
                            type="number"
                            min="2"
                            max="99"
                            className="h-8 text-sm"
                            value={recurrenceTimes}
                            onChange={(e) => setRecurrenceTimes(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <label className="flex items-center gap-2">
                      <Checkbox checked={paidConfirmed} onCheckedChange={(v) => setPaidConfirmed(!!v)} />
                      Pagamento confirmado
                    </label>
                  </div>
                </div>
                {tab === 'dados' && (
                  <div className="mt-6 flex justify-end gap-2 sticky bottom-0 bg-white/95 backdrop-blur-sm py-3">
                    <Button variant="outline" onClick={() => {
                      const amountNum = Number(amount || '0');
                      onSaveAndAddAnother({
                        description: description || 'Conta a pagar',
                        gross_amount: amountNum,
                        net_amount: amountNum,
                        due_date: dueDate || new Date().toISOString().slice(0,10),
                        issue_date: issueDate || new Date().toISOString().slice(0,10),
                        status: paidConfirmed ? 'PAID' : 'PENDING',
                        payment_date: paidConfirmed ? new Date().toISOString().slice(0,10) : null,
                        paid_amount: paidConfirmed ? amountNum : null,
                        category_id: category || null,
                        entry_number: (entryNumber && !entryNumber.startsWith('DES-')) ? entryNumber : undefined,
                        document_id: documentId || null,
                        
                        repeat,
                        recurrence: repeat ? {
                          period: recurrencePeriod,
                          times: parseInt(recurrenceTimes) || 2
                        } : undefined,
                        bank_account_id: bankAccountId || null,
                      });
                      reset();
                    }}>Salvar e adicionar outro</Button>
                    <Button onClick={() => {
                      const amountNum = Number(amount || '0');
                      onSave({
                        description: description || 'Conta a pagar',
                        gross_amount: amountNum,
                        net_amount: amountNum,
                        due_date: dueDate || new Date().toISOString().slice(0,10),
                        issue_date: issueDate || new Date().toISOString().slice(0,10),
                        status: paidConfirmed ? 'PAID' : 'PENDING',
                        payment_date: paidConfirmed ? new Date().toISOString().slice(0,10) : null,
                        paid_amount: paidConfirmed ? amountNum : null,
                        category_id: category || null,
                        entry_number: (entryNumber && !entryNumber.startsWith('DES-')) ? entryNumber : undefined,
                        document_id: documentId || null,
                        
                        repeat,
                        recurrence: repeat ? {
                          period: recurrencePeriod,
                          times: parseInt(recurrenceTimes) || 2
                        } : undefined,
                        bank_account_id: bankAccountId || null,
                      });
                      setCreatedEntry({ entry_number: entryNumber, due_date: dueDate, gross_amount: Number(amount) });
                    }}>Salvar informações</Button>
                  </div>
                )}
                {tab === 'lancamentos' && createdEntry && (
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground">Lançamentos vinculados à conta { createdEntry.entry_number } serão exibidos aqui.</p>
                  </div>
                )}
                {tab === 'historico' && createdEntry && (
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground">Histórico de alterações da conta { createdEntry.entry_number }.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

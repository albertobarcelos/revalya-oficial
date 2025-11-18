import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { listFinancialSettings } from '@/services/financialSettingsService';
import { listFinancialDocuments } from '@/services/financialDocumentsService';
import { previewNextPayableEntryNumber } from '@/services/financialPayablesService';

export function CreatePayableModal({
  open,
  onOpenChange,
  onSave,
  onSaveAndAddAnother,
  currentTenantId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (payload: any) => void;
  onSaveAndAddAnother: (payload: any) => void;
  currentTenantId?: string;
}) {
  const [tab, setTab] = useState<'dados' | 'lancamentos' | 'historico'>('dados');
  const [createdEntry, setCreatedEntry] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entryNumber, setEntryNumber] = useState('');
  const [category, setCategory] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [paidConfirmed, setPaidConfirmed] = useState(false);

  const categoriesQuery = useSecureTenantQuery(
    ['payables-categories', currentTenantId],
    async (supabase, tId) => {
      const data = await listFinancialSettings(tId, 'EXPENSE_CATEGORY', { active: true }, supabase);
      return data;
    },
    { enabled: !!currentTenantId }
  );

  const documentsQuery = useSecureTenantQuery(
    ['payables-documents', currentTenantId],
    async (supabase, tId) => {
      const data = await listFinancialDocuments(tId, supabase);
      return data;
    },
    { enabled: !!currentTenantId }
  );

  const reset = () => {
    setAmount(''); setDueDate(''); setIssueDate(new Date().toISOString().slice(0,10)); setEntryNumber('');
    setCategory(''); setDocumentId(''); setSupplier(''); setDescription(''); setRepeat(false); setPaidConfirmed(false); setCreatedEntry(null); setTab('dados');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="w-[95vw] max-w-none md:max-w-5xl max-h-[85vh] h-auto overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova conta a pagar</DialogTitle>
          <DialogDescription>Preencha os dados abaixo e salve.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova conta a pagar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant={tab==='dados' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setTab('dados')}>Dados gerais <span>›</span></Button>
                <Button variant={tab==='lancamentos' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setTab('lancamentos')} disabled={!createdEntry}>Lançamentos <span>›</span></Button>
                <Button variant={tab==='historico' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setTab('historico')} disabled={!createdEntry}>Histórico de alterações <span>›</span></Button>
                <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Voltar à listagem</Button>
                {createdEntry && (
                  <div className="space-y-2 mt-2 text-sm">
                    <div className="bg-muted px-3 py-2 rounded">{(createdEntry as any).entry_number}</div>
                    <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                      <span>Vencimento</span>
                      <span>{format(new Date((createdEntry as any).due_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                    <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                      <span>Valor</span>
                      <span>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((createdEntry as any).gross_amount || (createdEntry as any).net_amount || 0)}</span>
                    </div>
                    <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                      <span>Saldo</span>
                      <span>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Math.max(((createdEntry as any).net_amount || 0) - ((createdEntry as any).paid_amount || 0), 0))}</span>
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
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {categoriesQuery.data?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de documento</Label>
                    <Select value={documentId} onValueChange={setDocumentId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {documentsQuery.data?.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fornecedor ou transportadora (opcional)</Label>
                    <Input placeholder="Selecione ou digite para pesquisar" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
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
                        supplier_name: supplier || null,
                        repeat,
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
                        supplier_name: supplier || null,
                        repeat,
                      });
                      setCreatedEntry({ entry_number: entryNumber, due_date: dueDate, gross_amount: Number(amount) });
                    }}>Salvar informações</Button>
                  </div>
                )}
                {tab === 'lancamentos' && createdEntry && (
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground">Lançamentos vinculados à conta { (createdEntry as any).entry_number } serão exibidos aqui.</p>
                  </div>
                )}
                {tab === 'historico' && createdEntry && (
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground">Histórico de alterações da conta { (createdEntry as any).entry_number }.</p>
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

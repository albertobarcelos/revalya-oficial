import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useState } from 'react';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { useCustomers } from '@/hooks/useCustomers';
import { listFinancialSettings } from '@/services/financialSettingsService';
import { listFinancialDocuments } from '@/services/financialDocumentsService';
import { listFinancialLaunchs } from '@/services/financialLaunchsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditPayableModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry: any | null;
  onSave: (variables: { id: string; patch: any }) => void;
  currentTenantId?: string;
  onAddLaunchPatch?: (variables: { id: string; patch: any }) => void;
  readOnly?: boolean;
}

export const EditPayableModal: React.FC<EditPayableModalProps> = ({ open, onOpenChange, entry, onSave, onAddLaunchPatch, currentTenantId, readOnly }) => {
  const [tab, setTab] = useState<'dados' | 'lancamentos' | 'historico'>('dados');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [entryNumber, setEntryNumber] = useState('');
  const [category, setCategory] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [description, setDescription] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [paidConfirmed, setPaidConfirmed] = useState(false);

  const [launchAmount, setLaunchAmount] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [launchType, setLaunchType] = useState('');
  const [launchDescription, setLaunchDescription] = useState('');
  const [launches, setLaunches] = useState<Array<{ amount: number; date: string; typeId: string; description: string }>>([]);

  useEffect(() => {
    if (entry) {
      setAmount(String(entry.net_amount ?? entry.gross_amount ?? ''));
      setDueDate(entry.due_date ?? '');
      setIssueDate(entry.issue_date ?? '');
      setEntryNumber(entry.entry_number ?? '');
      setCategory(entry.category_id ?? '');
      setDocumentId(entry.document_id ?? '');
      setSupplier(entry.supplier_name ?? '');
      setSupplierId(entry.supplier_id ?? '');
      setDescription(entry.description ?? '');
      setRepeat(!!entry.repeat);
      setPaidConfirmed(entry.status === 'PAID');
    }
  }, [entry]);

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

  const launchTypesQuery = useSecureTenantQuery(
    ['payables-launch-types', currentTenantId],
    async (supabase, tId) => {
      const data = await listFinancialLaunchs(tId, supabase);
      return data;
    },
    { enabled: !!currentTenantId }
  );

  const { customers } = useCustomers();

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

  const DadosConteudo = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label>Valor</Label>
          <Input placeholder="R$ 0,00" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!!readOnly} />
        </div>
        <div>
          <Label>Data de vencimento</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!!readOnly} />
        </div>
        <div>
          <Label>Data de emissão</Label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} disabled={!!readOnly} />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Número</Label>
            <Input value={entryNumber} onChange={(e) => setEntryNumber(e.target.value)} disabled={!!readOnly} />
          </div>
        </div>
        <div>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory} disabled={!!readOnly}>
            <SelectTrigger disabled={!!readOnly}><SelectValue placeholder="Selecione ou digite para pesquisar" /></SelectTrigger>
            <SelectContent>
              {categoriesQuery.data?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo de documento</Label>
          <Select value={documentId} onValueChange={setDocumentId} disabled={!!readOnly}>
            <SelectTrigger disabled={!!readOnly}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {documentsQuery.data?.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Fornecedor ou transportadora (opcional)</Label>
          <Select value={supplierId} onValueChange={(v) => {
            setSupplierId(v);
            const c = customers?.find((cust: any) => cust.id === v);
            setSupplier(c?.name || '');
          }} disabled={!!readOnly}>
            <SelectTrigger disabled={!!readOnly}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {customers?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Label>Descrição (opcional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} disabled={!!readOnly} />
        </div>
        <div className="md:col-span-3 space-y-3">
          <label className="flex items-center gap-2">
            <Checkbox checked={repeat} onCheckedChange={(v) => setRepeat(!!v)} disabled={!!readOnly} />
            Esta conta a pagar irá se repetir
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={paidConfirmed} onCheckedChange={(v) => setPaidConfirmed(!!v)} disabled={!!readOnly} />
            Pagamento confirmado
          </label>
        </div>
      </div>
      {!readOnly && (
      <div className="mt-6 flex justify-end gap-2 sticky bottom-0 bg-white/95 backdrop-blur-sm py-3">
        <Button onClick={() => {
          if (!entry) return;
          const amountNum = Number(amount || '0');
          let patch: any = {
            description,
            gross_amount: amountNum,
            net_amount: amountNum,
            due_date: dueDate || new Date().toISOString().slice(0,10),
            issue_date: issueDate || new Date().toISOString().slice(0,10),
            status: paidConfirmed ? 'PAID' : 'PENDING',
            payment_date: paidConfirmed ? new Date().toISOString().slice(0,10) : null,
            paid_amount: paidConfirmed ? amountNum : null,
            category_id: category || null,
            entry_number: entryNumber || undefined,
            document_id: documentId || null,
            supplier_id: supplierId || null,
            supplier_name: supplier || null,
            repeat,
          };
          if (paidConfirmed) {
            const doc = documentsQuery.data?.find((d: any) => d.id === (documentId || entry.document_id));
            const typeId = doc?.settle_id ?? (documentId || entry.document_id) ?? '';
            const prevMeta: any = entry.metadata || {};
            const prevLaunches = Array.isArray(prevMeta.launches) ? prevMeta.launches : [];
            const newLaunch = {
              amount: amountNum,
              date: new Date().toISOString().slice(0,10),
              typeId: String(typeId),
              operation: 'DEBIT',
              description: 'Movimento de Quitação',
            };
            patch.metadata = { ...prevMeta, launches: [...prevLaunches, newLaunch] };
          }
          onSave({ id: entry.id, patch });
        }}>Salvar alterações</Button>
      </div>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-none md:max-w-5xl max-h-[85vh] h-auto overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar conta a pagar</DialogTitle>
          <DialogDescription>Atualize os dados da conta a pagar.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant={tab==='dados' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setTab('dados')}>Dados gerais <span>›</span></Button>
                <Button variant={tab==='lancamentos' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setTab('lancamentos')} disabled={!entry}>Lançamentos <span>›</span></Button>
                <Button variant={tab==='historico' ? 'default' : 'outline'} className="w-full justify-between" onClick={() => setTab('historico')} disabled={!entry}>Histórico de alterações <span>›</span></Button>
                {entry && (
                  <div className="space-y-2 mt-2 text-sm">
                    <div className="bg-muted px-3 py-2 rounded">{entryNumber}</div>
                    <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                      <span>Vencimento</span>
                      <span>{dueDate ? format(new Date(dueDate), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span>
                    </div>
                    <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                      <span>Valor</span>
                      <div className="flex flex-col items-end">
                        <span>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(entry?.gross_amount ?? 0))}</span>
                        {(entry?.status === 'PAID' && Number(entry?.paid_amount || 0) > 0) && (
                          <span className="text-red-600 text-xs">-{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(entry?.paid_amount || 0))}</span>
                        )}
                      </div>
                    </div>
                    {!(paidConfirmed || entry?.status === 'PAID') && (
                      <div className="bg-muted px-3 py-2 rounded flex items-center justify-between">
                        <span>Saldo</span>
                        <span>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(entry?.net_amount ?? entry?.gross_amount ?? 0))}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados gerais</CardTitle>
              </CardHeader>
              <CardContent>
                {tab === 'dados' ? DadosConteudo : null}
                {tab === 'lancamentos' && entry && (
                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label>Valor</Label>
                        <Input placeholder="R$ 0,00" value={launchAmount} onChange={(e) => setLaunchAmount(e.target.value)} />
                      </div>
                      <div>
                        <Label>Data</Label>
                        <Input type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Tipo de lançamento</Label>
                        <Select value={launchType} onValueChange={setLaunchType}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {launchTypesQuery.data?.map((lt: any) => (
                              <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-3">
                        <Label>Descrição</Label>
                        <Input value={launchDescription} onChange={(e) => setLaunchDescription(e.target.value)} />
                      </div>
                      <div className="md:col-span-3 flex justify-end">
                        <Button onClick={() => {
                          const amt = Number(launchAmount || '0');
                          if (!amt || !launchDate || !launchType) return;
                          const op = (launchTypesQuery.data?.find((t:any)=>t.id===launchType)?.operation_type) as ('DEBIT'|'CREDIT'|undefined);
                          const base = Number(entry?.net_amount ?? entry?.gross_amount ?? 0);
                          const newNet = op === 'DEBIT' ? Math.max(base - amt, 0) : base + amt;
                          const prevMeta = (entry?.metadata || {});
                          const prevLaunches = Array.isArray(prevMeta.launches) ? prevMeta.launches : [];
                          const newLaunch = { amount: amt, date: launchDate, typeId: launchType, operation: op || 'DEBIT', description: launchDescription || 'Lançamento' };
                          const newMeta = { ...prevMeta, launches: [...prevLaunches, newLaunch] };
                          onAddLaunchPatch?.({ id: entry!.id, patch: { net_amount: newNet, metadata: newMeta } });
                          setLaunches((prev) => [...prev, newLaunch]);
                          setLaunchAmount(''); setLaunchDate(''); setLaunchType(''); setLaunchDescription('');
                        }}>Lançar</Button>
                      </div>
                    </div>

                    <div className="rounded border p-4">
                      <div className="font-semibold mb-3">Listagem de lançamentos</div>
                      {launches.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Nenhum lançamento cadastrado</div>
                      ) : (
                        <div className="space-y-2">
                          {launches.map((l, idx) => (
                            <div key={idx} className="grid grid-cols-6 items-center gap-2 py-2 border-b">
                              <div className="col-span-1">
                                <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                              </div>
                              <div className="col-span-1 text-sm">{new Date(l.date).toLocaleDateString('pt-BR')}</div>
                              <div className="col-span-2 text-sm">
                                <div className="font-medium">{launchTypesQuery.data?.find((t:any)=>t.id===l.typeId)?.name || 'Lançamento'}</div>
                                <div className="text-muted-foreground">{l.description}</div>
                              </div>
                              <div className={`col-span-1 text-sm ${l.operation==='DEBIT' ? 'text-red-600' : 'text-emerald-600'}`}>{`${l.operation==='DEBIT' ? '-' : '+'}`}{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(l.amount)}</div>
                              <div className="col-span-1 flex justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setLaunches((prev) => prev.filter((_,i)=>i!==idx))}>Desfazer</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {tab === 'historico' && entry && (
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground">Histórico de alterações da conta { entryNumber }.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

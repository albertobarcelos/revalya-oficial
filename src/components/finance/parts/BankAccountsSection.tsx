import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Landmark, Pencil, Plus, QrCode, Settings, Trash2, CheckCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSecureTenantMutation, useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { toast } from '@/components/ui/use-toast';
import banksData from 'bancos-brasileiros';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText } from 'lucide-react';

type BankStep = 'bank' | 'pix' | 'preferences' | 'review';

/**
 * Componente de Contas Bancárias
 * Responsabilidade: Gerenciar criação e listagem de contas bancárias
 * Persistência: Salva em `public.bank_acounts` via Supabase com RLS e contexto de tenant
 */
export function BankAccountsSection() {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; bank: string; agency: string; account: string; type: 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA'; balance: number; active: boolean }>>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAgency, setBankAgency] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankType, setBankType] = useState<'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA' | ''>('');
  const [bankPix, setBankPix] = useState('');
  const [bankActive, setBankActive] = useState(true);
  const [editBankId, setEditBankId] = useState<string | null>(null);
  const [currentBankStep, setCurrentBankStep] = useState<BankStep>('bank');
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});
  const [showBankSearch, setShowBankSearch] = useState(false);

  type BankItem = { shortName: string; longName: string; compe: string; ispb: string };
  type BankLike = { ShortName?: string; LongName?: string; COMPE?: string; ISPB?: string };
  const bankOptions: BankItem[] = useMemo(() => {
    const arr = (banksData as unknown as BankLike[]) || [];
    return arr
      .filter(b => (b.ShortName || b.LongName))
      .map(b => ({
        shortName: String(b.ShortName || b.LongName || ''),
        longName: String(b.LongName || b.ShortName || ''),
        compe: String(b.COMPE || ''),
        ispb: String(b.ISPB || ''),
      }));
  }, []);

  const listQuery = useSecureTenantQuery(
    ['bank-acounts', currentTenant?.id],
    async (supabase, tenantId) => {
      const { data, error } = await supabase
        .from('bank_acounts')
        .select('id, bank, agency, count, type, current_balance, tenant_id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    { enabled: !!currentTenant?.id }
  );

  useEffect(() => {
    if (currentTenant?.id) {
      console.log(`[AUDIT] Acessando Contas Bancárias - Tenant: ${currentTenant.id}`);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    type DbBankAccountRow = { id: string; bank: string | null; agency: string | null; count: string | null; type: 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRAS' | null; current_balance: string | number | null; tenant_id: string | null };
    const rows: DbBankAccountRow[] = (listQuery.data as DbBankAccountRow[]) || [];
    const violations = rows.filter(r => currentTenant?.id && r.tenant_id && r.tenant_id !== currentTenant.id).length;
    if (violations > 0) {
      toast({ title: 'Violação de segurança', description: 'Foram detectados registros fora do tenant atual.' });
    }
    const mapped = rows.map((a) => ({
      id: a.id,
      bank: String(a.bank ?? ''),
      agency: String(a.agency ?? ''),
      account: String(a.count ?? ''),
      type: ((a.type === 'OUTRAS' ? 'OUTRA' : a.type) || 'OUTRA') as 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA',
      balance: typeof a.current_balance === 'number' ? a.current_balance : Number(a.current_balance ?? 0),
      active: true,
    }));
    setBankAccounts(mapped);
  }, [listQuery.data]);

  const createMutation = useSecureTenantMutation(
    async (supabase, tenantId, payload: { bank: string; agencia: string; conta: string; tipo: 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA' }) => {
      const tipoDb = payload.tipo === 'OUTRA' ? 'OUTRAS' : payload.tipo;
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        throw new Error('Usuário não autenticado para registrar auditoria');
      }
      const { data, error } = await supabase
        .from('bank_acounts')
        .insert({
          tenant_id: tenantId,
          bank: payload.bank,
          agency: payload.agencia,
          count: payload.conta,
          type: tipoDb,
          created_by: userId,
          updated_by: userId,
        })
        .select('id, bank, agency, count, type, created_by, updated_by')
        .single();
      if (error) throw error;
      return data;
    },
    {
      invalidateQueries: ['bank-acounts'],
      onSuccess: () => {
        toast({ title: 'Conta criada', description: 'A conta bancária foi salva com sucesso.' });
      }
    }
  );

  const updateMutation = useSecureTenantMutation(
    async (
      supabase,
      tenantId,
      payload: { id: string; bank: string; agencia: string; conta: string; tipo: 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA' }
    ) => {
      const tipoDb = payload.tipo === 'OUTRA' ? 'OUTRAS' : payload.tipo;
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        throw new Error('Usuário não autenticado para registrar auditoria');
      }
      const { data, error } = await supabase
        .from('bank_acounts')
        .update({
          bank: payload.bank,
          agency: payload.agencia,
          count: payload.conta,
          type: tipoDb,
          updated_by: userId,
        })
        .eq('id', payload.id)
        .eq('tenant_id', tenantId)
        .select('id, bank, agency, count, type, updated_by')
        .single();
      if (error) throw error;
      return data;
    },
    {
      invalidateQueries: ['bank-acounts'],
      onSuccess: () => {
        toast({ title: 'Alterações salvas', description: 'A conta bancária foi atualizada com sucesso.' });
      },
    }
  );

  const deleteMutation = useSecureTenantMutation(
    async (supabase, tenantId, payload: { id: string }) => {
      const { error } = await supabase
        .from('bank_acounts')
        .delete()
        .eq('id', payload.id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return { id: payload.id };
    },
    {
      invalidateQueries: ['bank-acounts'],
      onSuccess: () => {
        toast({ title: 'Conta excluída', description: 'A conta bancária foi removida com sucesso.' });
      }
    }
  );

  const validateBankStep = (step: BankStep): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 'bank') {
      if (!bankName.trim()) newErrors.bank = 'Banco é obrigatório';
    }
    if (step === 'pix') {
      if (!bankAgency.trim()) newErrors.agency = 'Agência é obrigatória';
      if (!bankAccount.trim()) newErrors.account = 'Conta é obrigatória';
    }
    if (step === 'preferences') {
      if (!bankType) newErrors.type = 'Tipo é obrigatório';
    }
    setBankErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBankNext = () => {
    if (!validateBankStep(currentBankStep)) return;
    const steps: BankStep[] = ['bank', 'pix', 'preferences', 'review'];
    const idx = steps.indexOf(currentBankStep);
    if (idx < steps.length - 1) setCurrentBankStep(steps[idx + 1]);
  };

  const handleBankPrevious = () => {
    const steps: BankStep[] = ['bank', 'pix', 'preferences', 'review'];
    const idx = steps.indexOf(currentBankStep);
    if (idx > 0) setCurrentBankStep(steps[idx - 1]);
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contas Bancárias</CardTitle>
          <CardDescription>{accessError || 'Acesso negado'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Landmark className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Contas Bancárias</CardTitle>
                <CardDescription>Gerencie as contas bancárias utilizadas nas operações financeiras</CardDescription>
              </div>
            </div>
            <Dialog open={showBankModal} onOpenChange={(open) => { setShowBankModal(open); if (!open) { setEditBankId(null); setBankName(''); setBankAgency(''); setBankAccount(''); setBankType(''); setBankPix(''); setBankActive(true); setCurrentBankStep('bank'); setBankErrors({}); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Conta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <DialogTitle className="text-xl font-semibold">
                    {editBankId ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
                  </DialogTitle>
                </div>

                <div className="px-6 py-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    {[
                      { key: 'bank', label: 'Banco', icon: <Landmark className="h-4 w-4" /> },
                      { key: 'pix', label: 'Agência', icon: <QrCode className="h-4 w-4" /> },
                      { key: 'preferences', label: 'Preferências', icon: <Settings className="h-4 w-4" /> },
                      { key: 'review', label: 'Revisão', icon: <CheckCircle className="h-4 w-4" /> },
                    ].map((step, index, arr) => {
                      const isActive = currentBankStep === (step.key as BankStep);
                      const completedIndex = ['bank','pix','preferences'].indexOf(currentBankStep);
                      const isCompleted = completedIndex > index;
                      return (
                        <div key={String(step.key)} className="flex items-center flex-1">
                          <div className="flex items-center">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' : ''} ${isCompleted ? 'border-green-600 bg-green-50 text-green-600' : ''} ${!isActive && !isCompleted ? 'border-gray-300 bg-white text-gray-400' : ''}`}>
                              {isCompleted ? <CheckCircle className="h-5 w-5" /> : step.icon}
                            </div>
                            <span className={`ml-2 text-sm font-medium ${isActive ? 'text-blue-600' : ''} ${isCompleted ? 'text-green-600' : ''} ${!isActive && !isCompleted ? 'text-gray-400' : ''}`}>
                              {step.label}
                            </span>
                          </div>
                          {index < arr.length - 1 && (
                            <div className={`${isCompleted ? 'bg-green-600' : 'bg-gray-300'} flex-1 h-0.5 mx-4`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <AnimatePresence mode="wait">
                    {currentBankStep === 'bank' && (
                      <motion.div key="bank" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 gap-4">
                        <div>
                          <Label>Banco *</Label>
                          <div className="relative">
                            <Input
                              className="mt-2 cursor-pointer"
                              value={bankName}
                              readOnly
                              placeholder="Selecione um banco"
                              onClick={() => setShowBankSearch(true)}
                            />
                            {bankErrors.bank && <p className="text-sm text-red-500">{bankErrors.bank}</p>}
                          </div>
                          <Dialog open={showBankSearch} onOpenChange={(open) => setShowBankSearch(open)}>
                            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Landmark className="h-5 w-5" />
                                  Selecionar Banco
                                </DialogTitle>
                              </DialogHeader>
                              <BankSearchContent
                                banks={bankOptions}
                                onSelect={(b) => { setBankName(b.shortName); setShowBankSearch(false); }}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </motion.div>
                    )}

                    {currentBankStep === 'pix' && (
                      <motion.div key="pix" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Agência *</Label>
                          <Input className="mt-2" value={bankAgency} onChange={(e) => setBankAgency(e.target.value)} placeholder="Ex.: 0001" />
                          {bankErrors.agency && <p className="text-sm text-red-500">{bankErrors.agency}</p>}
                        </div>
                        <div>
                          <Label>Conta *</Label>
                          <Input
                            className="mt-2"
                            value={bankAccount}
                            inputMode="numeric"
                            maxLength={8}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 7);
                              const formatted = digits.length <= 6
                                ? digits
                                : `${digits.slice(0, 6)}-${digits.slice(6)}`;
                              setBankAccount(formatted);
                            }}
                            placeholder="Ex.: 123456-7"
                          />
                          {bankErrors.account && <p className="text-sm text-red-500">{bankErrors.account}</p>}
                        </div>
                      </motion.div>
                    )}

                    {currentBankStep === 'preferences' && (
                      <motion.div key="preferences" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 gap-4">
                        <div>
                          <Label>Tipo *</Label>
                          <Select value={bankType || ''} onValueChange={(v) => setBankType(v as 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA')}>
                            <SelectTrigger className="mt-2"><SelectValue placeholder="(selecione)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CORRENTE">Corrente</SelectItem>
                              <SelectItem value="POUPANCA">Poupança</SelectItem>
                              <SelectItem value="SALARIO">Salário</SelectItem>
                              <SelectItem value="OUTRA">Outra</SelectItem>
                            </SelectContent>
                          </Select>
                          {bankErrors.type && <p className="text-sm text-red-500">{bankErrors.type}</p>}
                        </div>
                      </motion.div>
                    )}

                    {currentBankStep === 'review' && (
                      <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-medium mb-2">Banco</h3>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Instituição:</span> {bankName}</p>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-medium mb-2">Agência</h3>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Agência:</span> {bankAgency}</p>
                            <p><span className="font-medium">Conta:</span> {bankAccount}</p>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-medium mb-2">Preferências</h3>
                          <p className="text-sm"><span className="font-medium">Tipo:</span> {bankType || '-'}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                  <Button type="button" variant="outline" onClick={currentBankStep === 'bank' ? () => setShowBankModal(false) : handleBankPrevious}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {currentBankStep === 'bank' ? 'Cancelar' : 'Anterior'}
                  </Button>

                  <div className="flex gap-2">
                    {currentBankStep !== 'review' ? (
                      <Button type="button" onClick={handleBankNext}>
                        Próximo
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button type="button" onClick={async () => {
                        const name = bankName.trim();
                        const agency = bankAgency.trim();
                        const acct = bankAccount.trim();
                        if (!name || !agency || !acct || !bankType) return;
                        if (editBankId) {
                          await updateMutation.mutateAsync({ id: editBankId, bank: name, agencia: agency, conta: acct, tipo: bankType as 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA' });
                        } else {
                          await createMutation.mutateAsync({ bank: name, agencia: agency, conta: acct, tipo: bankType as 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA' });
                        }
                        setEditBankId(null);
                        setBankName('');
                        setBankAgency('');
                        setBankAccount('');
                        setBankType('');
                        setBankPix('');
                        setBankActive(true);
                        setCurrentBankStep('bank');
                        setBankErrors({});
                        setShowBankModal(false);
                      }}>
                        {editBankId ? 'Salvar Edições' : 'Criar Conta'}
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas Cadastradas</CardTitle>
          <CardDescription>Lista de todas as contas bancárias</CardDescription>
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Landmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conta cadastrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Saldo Atual</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.bank}</TableCell>
                    <TableCell>{b.agency}</TableCell>
                    <TableCell>{b.account}</TableCell>
                    <TableCell>{b.type}</TableCell>
                    <TableCell>{formatCurrency(b.balance || 0)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => {
                            setEditBankId(b.id);
                            setBankName(b.bank);
                            setBankAgency(b.agency);
                            setBankAccount(b.account);
                            setBankType(b.type);
                            setBankPix('');
                            setBankActive(!!b.active);
                            setShowBankModal(true);
                          }} className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            toast({ title: 'Extrato', description: `Abrindo extrato da conta ${b.account}` });
                          }} className="gap-2">
                            <FileText className="h-4 w-4" />
                            Extrato
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => { await deleteMutation.mutateAsync({ id: b.id }); }} className="gap-2 text-red-600 focus:bg-red-50 focus:text-red-600">
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
/**
 * Conteúdo do modal de seleção de bancos
 * Lista bancos com busca e seleção, baseado em bancos-brasileiros
 */
function BankSearchContent({ banks, onSelect }: { banks: { shortName: string; longName: string; compe: string; ispb: string }[]; onSelect: (b: { shortName: string; longName: string; compe: string; ispb: string }) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return banks;
    return banks.filter(b =>
      b.shortName.toLowerCase().includes(term) ||
      b.longName.toLowerCase().includes(term) ||
      b.compe.toLowerCase().includes(term) ||
      b.ispb.toLowerCase().includes(term)
    );
  }, [searchTerm, banks]);
  const totalPages = Math.ceil(filtered.length / limit) || 1;
  const start = (page - 1) * limit;
  const slice = filtered.slice(start, start + limit);

  useEffect(() => { setPage(1); }, [searchTerm]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome, COMPE ou ISPB" className="pl-10" />
        </div>
      </div>
      <Separator className="my-3" />
      <div className="flex-1 overflow-y-auto">
        {slice.map((b) => (
          <div key={`${b.ispb}-${b.compe}`} onClick={() => onSelect(b)} className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{b.shortName}</div>
                <div className="text-xs text-muted-foreground truncate">{b.longName}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="mr-3">COMPE: {b.compe || '-'}</span>
                <span>ISPB: {b.ispb || '-'}</span>
              </div>
            </div>
          </div>
        ))}
        {slice.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">Nenhum banco encontrado</div>
        )}
      </div>
      <Separator className="my-3" />
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Mostrando {filtered.length === 0 ? 0 : start + 1} a {Math.min(start + limit, filtered.length)} de {filtered.length}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1">
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


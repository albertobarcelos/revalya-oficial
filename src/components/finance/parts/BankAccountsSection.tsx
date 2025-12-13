import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react';
import { useSecureTenantMutation, useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { toast } from '@/components/ui/use-toast';
import banksData from 'bancos-brasileiros';
import { formatCurrency } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText } from 'lucide-react';
import { BankAccountModal } from './bank/BankAccountModal';


/**
 * Componente de Contas Bancárias
 * Responsabilidade: Gerenciar criação e listagem de contas bancárias
 * Persistência: Salva em `public.bank_acounts` via Supabase com RLS e contexto de tenant
 */
export function BankAccountsSection() {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; bank: string; agency: string; account: string; type: 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA'; balance: number; active: boolean }>>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankInitial, setBankInitial] = useState<{ id?: string | null; bank?: string; agency?: string; accountNumber?: string; accountDigit?: string; type?: 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA' | ''; balance?: number } | null>(null);

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
    async (supabase, tenantId, payload: { bank: string; agencia: string; conta: string; tipo: 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA'; saldo?: number }) => {
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
          current_balance: payload.saldo ?? 0,
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
      payload: { id: string; bank: string; agencia: string; conta: string; tipo: 'CORRENTE' | 'POUPANCA' | 'SALARIO' | 'OUTRA'; saldo?: number }
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
          current_balance: payload.saldo ?? undefined,
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

  // Removido fluxo de etapas em favor de modal único e simples

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
            <Button className="gap-2" onClick={() => { setBankInitial(null); setShowBankModal(true); }}>
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
            <BankAccountModal
              open={showBankModal}
              onOpenChange={(open) => { setShowBankModal(open); if (!open) setBankInitial(null); }}
              initial={bankInitial}
              banks={bankOptions}
              onSave={async (values) => {
                const acct = `${values.accountNumber}${values.accountDigit ? `-${values.accountDigit}` : ''}`;
                if (values.id) {
                  await updateMutation.mutateAsync({ id: values.id, bank: values.bank, agencia: values.agency, conta: acct, tipo: values.type, saldo: values.balance });
                } else {
                  await createMutation.mutateAsync({ bank: values.bank, agencia: values.agency, conta: acct, tipo: values.type, saldo: values.balance });
                }
                setBankInitial(null);
                setShowBankModal(false);
              }}
            />
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
                            const parts = String(b.account || '').split('-');
                            setBankInitial({
                              id: b.id,
                              bank: b.bank,
                              agency: b.agency,
                              accountNumber: parts[0] || '',
                              accountDigit: (parts[1]?.slice(0, 1) || ''),
                              type: b.type,
                              balance: b.balance ?? 0,
                            });
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


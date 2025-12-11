import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Loader2, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import { useSecureTenantMutation, useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { listFinancialLaunchs, createFinancialLaunch, updateFinancialLaunch, deleteFinancialLaunch, type FinancialOperationType } from '@/services/financialLaunchsService';
import LaunchEditDialog, { type LaunchEditable } from '@/components/finance/LaunchEditDialog';

type Props = { tenantId?: string | null };

export function LaunchTypesSection({ tenantId }: Props) {
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryName, setEntryName] = useState('');
  const [entryActive, setEntryActive] = useState(true);
  const [entryOperation, setEntryOperation] = useState('');
  const [generateBankMovement, setGenerateBankMovement] = useState(false);
  const [considerSettlementMovement, setConsiderSettlementMovement] = useState(false);
  const [editLaunch, setEditLaunch] = useState<LaunchEditable | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const query = useSecureTenantQuery(
    ['financial-launchs', tenantId],
    async (supabase, tId) => {
      const data = await listFinancialLaunchs(tId, supabase);
      const invalid = data.filter(item => item.tenant_id !== tId);
      if (invalid.length) throw new Error('VIOLAÇÃO DE SEGURANÇA: registros de outro tenant');
      return data;
    },
    { enabled: !!tenantId }
  );

  const createMutation = useSecureTenantMutation(
    async (supabase, tId, payload: { name: string; is_active: boolean; operation_type: FinancialOperationType | null; generate_bank_movement: boolean; consider_settlement_movement: boolean }) => {
      const targetTenantId = tenantId || tId;
      return await createFinancialLaunch({
        tenant_id: targetTenantId!,
        name: payload.name,
        is_active: payload.is_active,
        operation_type: payload.operation_type,
        generate_bank_movement: payload.generate_bank_movement,
        consider_settlement_movement: payload.consider_settlement_movement,
      }, supabase);
    },
    {
      invalidateQueries: ['financial-launchs'],
      onSuccess: () => {
        setEntryName('');
        setEntryOperation('');
        setGenerateBankMovement(false);
        setConsiderSettlementMovement(false);
        setEntryActive(true);
        setShowEntryModal(false);
        setEditLaunch(null);
      }
    }
  );

  const updateMutation = useSecureTenantMutation(
    async (supabase, _tId, payload: { id: string; patch: Partial<{ name: string; is_active: boolean; operation_type: FinancialOperationType | null; generate_bank_movement: boolean; consider_settlement_movement: boolean }> }) => {
      return await updateFinancialLaunch(payload.id, payload.patch, supabase);
    },
    {
      invalidateQueries: ['financial-launchs'],
      onSuccess: () => {
        setEntryName('');
        setEntryOperation('');
        setGenerateBankMovement(false);
        setConsiderSettlementMovement(false);
        setEntryActive(true);
        setShowEntryModal(false);
        setEditLaunch(null);
      }
    }
  );

  const deleteMutation = useSecureTenantMutation(async (supabase, _tId, payload: { id: string }) => {
    return await deleteFinancialLaunch(payload.id, supabase);
  }, { invalidateQueries: ['financial-launchs'] });

  const ENTRY_OPERATION_OPTIONS = [
    { value: 'DEBIT', label: 'Débito' },
    { value: 'CREDIT', label: 'Crédito' },
  ];

  const handleSave = () => {
    const name = entryName.trim();
    if (!name) return;
    if (!editLaunch) {
      createMutation.mutate({
        name,
        is_active: entryActive,
        operation_type: (entryOperation || null) as FinancialOperationType | null,
        generate_bank_movement: generateBankMovement,
        consider_settlement_movement: considerSettlementMovement,
      });
    } else {
      updateMutation.mutate({
        id: editLaunch.id,
        patch: {
          name,
          is_active: entryActive,
          operation_type: (entryOperation || null) as FinancialOperationType | null,
          generate_bank_movement: generateBankMovement,
          consider_settlement_movement: considerSettlementMovement,
        }
      });
    }
  };

  const openEditLaunch = (c: any) => {
    setEditLaunch({
      id: c.id,
      name: c.name,
      is_active: !!c.is_active,
      operation_type: c.operation_type ?? null,
      generate_bank_movement: !!c.generate_bank_movement,
      consider_settlement_movement: !!c.consider_settlement_movement,
    });
    setShowEditDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Tipos de Lançamento</CardTitle>
                <CardDescription>Gerencie os tipos de lançamentos financeiros</CardDescription>
              </div>
            </div>
            <Dialog open={showEntryModal} onOpenChange={setShowEntryModal}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo tipo de lançamento financeiro</DialogTitle>
                  <DialogDescription>Preencha os dados e salve.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome</Label>
                    <Input className="mt-2" value={entryName} onChange={(e) => setEntryName(e.target.value)} placeholder="Ex.: Saída, Entrada, Transferência" />
                  </div>
                  <div className="flex flex-col gap-2 mt-2 md:mt-0">
                    <Label>Situação</Label>
                    <div className="flex items-center gap-3 md:mt-[30px]">
                      <span className={`${entryActive ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'} px-3 py-1 rounded-md text-xs font-medium`}>{entryActive ? 'Ativo' : 'Inativo'}</span>
                      <Switch checked={entryActive} onCheckedChange={setEntryActive} />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Tipo de operação</Label>
                    <Select value={entryOperation} onValueChange={setEntryOperation}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="(selecione)" /></SelectTrigger>
                      <SelectContent>
                        {ENTRY_OPERATION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-3 mt-2">
                    <label className="flex items-center gap-2">
                      <Checkbox checked={generateBankMovement} onCheckedChange={(v) => setGenerateBankMovement(!!v)} />
                      Gerar movimento bancário
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox checked={considerSettlementMovement} onCheckedChange={(v) => setConsiderSettlementMovement(!!v)} />
                      Considerar movimentação de quitação
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSave} disabled={!entryName.trim()}>Salvar</Button>
                  <Button variant="outline" onClick={() => setShowEntryModal(false)}>Cancelar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos Cadastrados</CardTitle>
          <CardDescription>Lista de todos os tipos de lançamentos</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando tipos...</span>
            </div>
          ) : (query.data?.length || 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum tipo cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de lançamento</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>
                      {c.operation_type === 'DEBIT' ? 'Débito' : c.operation_type === 'CREDIT' ? 'Crédito' : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`${c.is_active ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'} px-3 py-1 rounded-md text-xs font-medium`}>
                        {c.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditLaunch(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: c.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LaunchEditDialog
        open={showEditDialog}
        onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditLaunch(null); }}
        initial={editLaunch}
        onSave={(values) => {
          if (!editLaunch) return;
          updateMutation.mutate({ id: editLaunch.id, patch: values });
        }}
      />
    </>
  );
}

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import BillingDialogContent from '@/components/billing/kanban/BillingDialogContent';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSecureTenantMutation, useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { listFinancialDocuments, createFinancialDocument, deleteFinancialDocument, updateFinancialDocument, type CreditTitleType } from '@/services/financialDocumentsService';
import { listFinancialLaunchs } from '@/services/financialLaunchsService';

type Props = { tenantId?: string | null };

export function DocumentTypesSection({ tenantId }: Props) {
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentTypeInput, setDocumentTypeInput] = useState('');
  const [creditTitle, setCreditTitle] = useState('');
  const [launchOpen, setLaunchOpen] = useState('');
  const [launchSettle, setLaunchSettle] = useState('');
  const [launchAddition, setLaunchAddition] = useState('');
  const [documentActive, setDocumentActive] = useState(true);
  const [editDocumentId, setEditDocumentId] = useState<string | null>(null);

  const documentsQuery = useSecureTenantQuery(
    ['financial-documents', tenantId],
    async (supabase, tId) => {
      const data = await listFinancialDocuments(tId, supabase);
      const invalid = data.filter(item => item.tenant_id !== tId);
      if (invalid.length) throw new Error('VIOLAÇÃO DE SEGURANÇA: registros de outro tenant');
      return data;
    },
    { enabled: !!tenantId }
  );

  const launchsQuery = useSecureTenantQuery(
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
    async (supabase, tId, payload: { name: string; credit_title_type: CreditTitleType; open_id?: string | null; settle_id?: string | null; addition_id?: string | null }) => {
      const targetTenantId = tenantId || tId;
      return await createFinancialDocument({
        tenant_id: targetTenantId!,
        name: payload.name,
        credit_title_type: payload.credit_title_type,
        open_id: payload.open_id ?? null,
        settle_id: payload.settle_id ?? null,
        addition_id: payload.addition_id ?? null,
        is_active: documentActive,
      }, supabase);
    },
    {
      invalidateQueries: ['financial-documents'],
      onSuccess: () => {
        setDocumentTypeInput('');
        setCreditTitle('');
        setLaunchOpen('');
        setLaunchSettle('');
        setLaunchAddition('');
        setDocumentActive(true);
        setEditDocumentId(null);
        setShowDocumentModal(false);
      }
    }
  );

  const deleteMutation = useSecureTenantMutation(async (supabase, _tId, payload: { id: string }) => {
    return await deleteFinancialDocument(payload.id, supabase);
  }, { invalidateQueries: ['financial-documents'] });

  const updateMutation = useSecureTenantMutation(
    async (supabase, _tId, payload: { id: string; patch: { name?: string; credit_title_type?: CreditTitleType; open_id?: string | null; settle_id?: string | null; addition_id?: string | null; is_active?: boolean } }) => {
      return await updateFinancialDocument(payload.id, payload.patch, supabase);
    },
    {
      invalidateQueries: ['financial-documents'],
      onSuccess: () => {
        setDocumentTypeInput('');
        setCreditTitle('');
        setLaunchOpen('');
        setLaunchSettle('');
        setLaunchAddition('');
        setDocumentActive(true);
        setEditDocumentId(null);
        setShowDocumentModal(false);
      }
    }
  );

  const handleSave = () => {
    const name = documentTypeInput.trim();
    if (!name || !creditTitle) return;
    if (!editDocumentId) {
      createMutation.mutate({
        name,
        credit_title_type: creditTitle as CreditTitleType,
        open_id: launchOpen || null,
        settle_id: launchSettle || null,
        addition_id: launchAddition || null,
      });
    } else {
      updateMutation.mutate({
        id: editDocumentId,
        patch: {
          name,
          credit_title_type: creditTitle as CreditTitleType,
          open_id: launchOpen || null,
          settle_id: launchSettle || null,
          addition_id: launchAddition || null,
          is_active: documentActive,
        }
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Tipos de Documentos</CardTitle>
                <CardDescription>Gerencie os tipos de documentos financeiros</CardDescription>
              </div>
            </div>
            <Dialog open={showDocumentModal} onOpenChange={(open) => { setShowDocumentModal(open); if (!open) { setEditDocumentId(null); setDocumentActive(true); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Tipo
                </Button>
              </DialogTrigger>
              <BillingDialogContent className="p-0 m-0 border-0">
                <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/85 to-primary/60 border-b border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-white/8 animate-pulse" />
                  <div className="relative flex items-center justify-between px-6 py-4 z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <DialogTitle className="text-xl font-semibold text-white">{editDocumentId ? 'Editar Tipo de Documento' : 'Novo Tipo de Documento'}</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-white/70">Preencha os dados abaixo e salve.</DialogDescription>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Nome</Label>
                    <Input className="mt-2" value={documentTypeInput} onChange={(e) => setDocumentTypeInput(e.target.value)} placeholder="Ex.: Recibo, Duplicata, Cheque" />
                  </div>
                  <div className="flex flex-col gap-2 mt-2 md:mt-0">
                    <Label>Situação</Label>
                    <div className="flex items-center gap-3 md:mt-5">
                      <span className={`${documentActive ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'} px-3 py-1 rounded-md text-xs font-medium`}>{documentActive ? 'Ativo' : 'Inativo'}</span>
                      <Switch checked={documentActive} onCheckedChange={setDocumentActive} />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Tipo de título de crédito</Label>
                    <Select value={creditTitle} onValueChange={setCreditTitle}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="(selecione)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OUTROS">Outros</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="DUPLICATA">Duplicata</SelectItem>
                        <SelectItem value="PROMISSORIA">Promissória</SelectItem>
                        <SelectItem value="RECIBO">Recibo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Abertura</Label>
                    <Select value={launchOpen} onValueChange={setLaunchOpen}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="(selecione)" /></SelectTrigger>
                      <SelectContent>
                        {launchsQuery.data?.filter(opt => opt.operation_type === 'DEBIT').map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quitação</Label>
                    <Select value={launchSettle} onValueChange={setLaunchSettle}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="(selecione)" /></SelectTrigger>
                      <SelectContent>
                        {launchsQuery.data?.filter(opt => opt.operation_type === 'DEBIT').map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Acréscimo</Label>
                    <Select value={launchAddition} onValueChange={setLaunchAddition}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="(selecione)" /></SelectTrigger>
                      <SelectContent>
                        {launchsQuery.data?.filter(opt => opt.operation_type === 'CREDIT').map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                  <Button onClick={handleSave} disabled={!documentTypeInput.trim()}>Salvar</Button>
                  <Button variant="outline" onClick={() => setShowDocumentModal(false)}>Cancelar</Button>
                </div>
              </BillingDialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos Cadastrados</CardTitle>
          <CardDescription>Lista de todos os tipos de documentos</CardDescription>
        </CardHeader>
        <CardContent>
          {documentsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando tipos...</span>
            </div>
          ) : (documentsQuery.data?.length || 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum tipo cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de documento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentsQuery.data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>
                      <span className={`${c.is_active ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'} px-3 py-1 rounded-md text-xs font-medium`}>
                        {c.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditDocumentId(c.id);
                        setDocumentTypeInput(c.name);
                        setCreditTitle(c.credit_title_type);
                        setLaunchOpen(c.open_id || '');
                        setLaunchSettle(c.settle_id || '');
                        setLaunchAddition(c.addition_id || '');
                        setDocumentActive(!!c.is_active);
                        setShowDocumentModal(true);
                      }}>
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
    </>
  );
}


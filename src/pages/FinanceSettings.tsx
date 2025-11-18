import React, { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, Banknote, FileText, Settings } from 'lucide-react';
import { useTenantAccessGuard, useSecureTenantMutation, useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { listFinancialSettings, createFinancialSetting, deleteFinancialSetting, type FinancialSettingType } from '@/services/financialSettingsService';
import { listFinancialDocuments, createFinancialDocument, deleteFinancialDocument, updateFinancialDocument, type CreditTitleType } from '@/services/financialDocumentsService';
import { listFinancialLaunchs, createFinancialLaunch, deleteFinancialLaunch, updateFinancialLaunch, type FinancialOperationType } from '@/services/financialLaunchsService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import LaunchEditDialog, { type LaunchEditable } from '@/components/finance/LaunchEditDialog';

/**
 * Página de Configurações Financeiras com três abas:
 * 1) Categoria de Despesas, 2) Tipo de Documentos, 3) Tipo de Lançamento.
 * Comentário de nível de função: estrutura inicial apenas em memória;
 * integração com Supabase pode ser adicionada depois mantendo o mesmo layout.
 */
type FinanceSettingsProps = { tenantId?: string };

// Hook estável: consulta itens de configuração financeira por tipo
function useFinancialSettingsQuery(tenantId: string | undefined, type: 'EXPENSE_CATEGORY' | 'DOCUMENT_TYPE') {
  const enabled = !!tenantId;
  return useSecureTenantQuery(
    ['financial-settings', tenantId, type],
    async (supabase, tId) => {
      const data = await listFinancialSettings(tId, type, undefined, supabase);
      const invalid = data.filter(item => item.tenant_id !== tId);
      if (invalid.length) throw new Error('VIOLAÇÃO DE SEGURANÇA: registros de outro tenant');
      return data;
    },
    { enabled }
  );
}

// Hook estável: consulta tipos de lançamentos (financial_launchs)
function useFinancialLaunchsQuery(tenantId: string | undefined) {
  const enabled = !!tenantId;
  return useSecureTenantQuery(
    ['financial-launchs', tenantId],
    async (supabase, tId) => {
      const data = await listFinancialLaunchs(tId, supabase);
      const invalid = data.filter(item => item.tenant_id !== tId);
      if (invalid.length) throw new Error('VIOLAÇÃO DE SEGURANÇA: registros de outro tenant');
      return data;
    },
    { enabled }
  );
}

function FinanceSettingsContent(props?: FinanceSettingsProps) {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const effectiveTenantId = props?.tenantId || currentTenant?.id;
  const effectiveHasAccess = props?.tenantId ? true : hasAccess;
  // Estado em memória para cada aba
  const [expenseCategoryInput, setExpenseCategoryInput] = useState('');
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [expenseDre, setExpenseDre] = useState<'NONE'|'DEFAULT'|'SALES'|'ADMIN'|'FINANCIAL'|'MARKETING'|'PERSONAL'|'SOCIAL_CHARGES'|'OTHER'>('DEFAULT');

  const [documentTypeInput, setDocumentTypeInput] = useState('');
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [creditTitle, setCreditTitle] = useState('');
  const [launchOpen, setLaunchOpen] = useState('');
  const [launchSettle, setLaunchSettle] = useState('');
  const [launchAddition, setLaunchAddition] = useState('');
  const [documentActive, setDocumentActive] = useState(true);
  const [editDocumentId, setEditDocumentId] = useState<string | null>(null);

  const LAUNCH_OPTIONS = [
    { value: 'AJUSTE_VALOR_MAIS', label: '(+) Ajuste de valor para mais' },
    { value: 'MOVIMENTO_ABERTURA', label: '(+) Movimento de abertura' },
    { value: 'ACRESCIMO', label: '(+) Acréscimo' },
    { value: 'JUROS', label: '(+) Juros' },
  ];

  const SETTLE_OPTIONS = [
    { value: 'DESCONTO_CONCEDIDO', label: '(-) Desconto concedido' },
    { value: 'QUITACAO', label: '(-) Quitação' },
    { value: 'AJUSTE_VALOR_MENOS', label: '(-) Ajuste de valor para menos' },
  ];

  const [entryTypeInput, setEntryTypeInput] = useState('');
  const [entryTypes, setEntryTypes] = useState<any[]>([]);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryName, setEntryName] = useState('');
  const [entryActive, setEntryActive] = useState(true);
  const [entryOperation, setEntryOperation] = useState('');
  const [generateBankMovement, setGenerateBankMovement] = useState(false);
  const [considerSettlementMovement, setConsiderSettlementMovement] = useState(false);
  const [editLaunch, setEditLaunch] = useState<LaunchEditable | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  /** Adiciona um item na lista alvo garantindo unicidade e normalização */
  const addItem = (listSetter: React.Dispatch<React.SetStateAction<any[]>>, value: string) => {
    const v = value.trim();
    if (!v) return;
    listSetter(prev => prev);
  };

  /** Remove um item pelo índice */
  const removeItem = (listSetter: React.Dispatch<React.SetStateAction<any[]>>, index: number) => {
    listSetter(prev => prev.filter((_, i) => i !== index));
  };

  /** Cabeçalho genérico do bloco com título e descrição */
  const SectionHeader = ({ title, description }: { title: string; description: string }) => (
    <div className="mb-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );

  const tabs = useMemo(() => ([
    { key: 'categorias', label: 'Categoria de Despesas' },
    { key: 'documentos', label: 'Tipo de Documentos' },
    { key: 'lancamentos', label: 'Tipo de Lançamento' },
  ]), []);
  const [activeTab, setActiveTab] = useState<string>(tabs[0].key);

  // Consultas estáveis no topo
  const expenseQuery = useFinancialSettingsQuery(effectiveTenantId, 'EXPENSE_CATEGORY');
  const documentQuery = useSecureTenantQuery(
    ['financial-documents', effectiveTenantId],
    async (supabase, tId) => {
      const data = await listFinancialDocuments(tId, supabase);
      const invalid = data.filter(item => item.tenant_id !== tId);
      if (invalid.length) throw new Error('VIOLAÇÃO DE SEGURANÇA: registros de outro tenant');
      return data;
    },
    { enabled: !!effectiveTenantId }
  );
  const launchsQuery = useFinancialLaunchsQuery(effectiveTenantId);

  // Mutação segura de criação
  const createMutation = useSecureTenantMutation(
    async (supabase, tenantId, payload: { type: FinancialSettingType; name: string; dre?: string; metadata?: any; is_active?: boolean }) => {
      const targetTenantId = effectiveTenantId || tenantId;
      return await createFinancialSetting({ tenant_id: targetTenantId!, type: payload.type, name: payload.name, dre_category: payload.dre as any, metadata: payload.metadata, is_active: payload.is_active }, supabase);
    },
    {
      invalidateQueries: ['financial-settings'],
      onSuccess: () => {
        setExpenseCategoryInput('');
        setShowCategoryForm(false);
        setExpenseDre('DEFAULT');
        setDocumentTypeInput('');
        setCreditTitle('');
        setLaunchOpen('');
        setLaunchSettle('');
        setLaunchAddition('');
        setShowDocumentModal(false);
        setEntryName('');
        setEntryOperation('');
        setGenerateBankMovement(false);
        setConsiderSettlementMovement(false);
        setEntryActive(true);
        setShowEntryModal(false);
      },
    }
  );

  // Mutação segura de remoção
  const deleteMutation = useSecureTenantMutation(async (supabase, _tenantId, payload: { id: string }) => {
    return await deleteFinancialSetting(payload.id, supabase);
  }, { invalidateQueries: ['financial-settings'] });

  // Handlers
  const handleAdd = (type: FinancialSettingType, value: string) => {
    const v = value.trim();
    if (!v || !currentTenant?.id) return;
    const payload = type === 'EXPENSE_CATEGORY' ? { type, name: v, dre: expenseDre } : { type, name: v };
    createMutation.mutate(payload as any);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const documentCreateMutation = useSecureTenantMutation(
    async (supabase, tenantId, payload: { name: string; credit_title_type: CreditTitleType; open_id?: string | null; settle_id?: string | null; addition_id?: string | null }) => {
      const targetTenantId = effectiveTenantId || tenantId;
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

  const documentDeleteMutation = useSecureTenantMutation(async (supabase, _tenantId, payload: { id: string }) => {
    return await deleteFinancialDocument(payload.id, supabase);
  }, { invalidateQueries: ['financial-documents'] });

  const documentUpdateMutation = useSecureTenantMutation(
    async (supabase, _tenantId, payload: { id: string; patch: { name?: string; credit_title_type?: CreditTitleType; open_id?: string | null; settle_id?: string | null; addition_id?: string | null; is_active?: boolean } }) => {
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

  const handleAddDocument = () => {
    const name = documentTypeInput.trim();
    if (!name) return;
    if (!creditTitle) return;
    if (!editDocumentId) {
      documentCreateMutation.mutate({
        name,
        credit_title_type: creditTitle as CreditTitleType,
        open_id: launchOpen || null,
        settle_id: launchSettle || null,
        addition_id: launchAddition || null,
      });
    } else {
      documentUpdateMutation.mutate({
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

  const ENTRY_OPERATION_OPTIONS = [
    { value: 'DEBIT', label: 'Débito' },
    { value: 'CREDIT', label: 'Crédito' },
  ];

  const handleAddEntryType = () => {
    const name = entryName.trim();
    if (!name) return;
    if (!editLaunch) {
      entryCreateMutation.mutate({
        name,
        is_active: entryActive,
        operation_type: (entryOperation || null) as FinancialOperationType | null,
        generate_bank_movement: generateBankMovement,
        consider_settlement_movement: considerSettlementMovement,
      });
    } else {
      entryUpdateMutation.mutate({
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

  const entryCreateMutation = useSecureTenantMutation(
    async (supabase, tenantId, payload: { name: string; is_active: boolean; operation_type: FinancialOperationType | null; generate_bank_movement: boolean; consider_settlement_movement: boolean }) => {
      const targetTenantId = effectiveTenantId || tenantId;
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
  const entryUpdateMutation = useSecureTenantMutation(
    async (supabase, _tenantId, payload: { id: string; patch: Partial<{ name: string; is_active: boolean; operation_type: FinancialOperationType | null; generate_bank_movement: boolean; consider_settlement_movement: boolean }> }) => {
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
        setEditLaunchId(null);
      }
    }
  );

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
  // Mutação segura para remover tipos de lançamento
  const deleteLaunchMutation = useSecureTenantMutation(async (supabase, _tenantId, payload: { id: string }) => {
    return await deleteFinancialLaunch(payload.id, supabase);
  }, { invalidateQueries: ['financial-launchs'] });

  const handleDeleteLaunch = (id: string) => {
    deleteLaunchMutation.mutate({ id });
  };

  // Guard de acesso
  if (!effectiveHasAccess) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-destructive mb-4">Acesso Negado</h1>
            <p className="text-muted-foreground">{accessError}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const embedded = !!props?.tenantId;
  const wrapperClass = embedded ? "space-y-4 mt-2 h-[calc(100vh-240px)] overflow-auto pr-2" : "container mx-auto p-6 space-y-6";
  return (
      <div className={wrapperClass}>
        

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="justify-start">
            <TabsTrigger value="categorias" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Categoria de Despesas
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tipo de Documentos
            </TabsTrigger>
            <TabsTrigger value="lancamentos" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Tipo de Lançamento
            </TabsTrigger>
          </TabsList>

              {/* Categoria de Despesas (modelo igual ao Local de Estoque) */}
              <TabsContent value="categorias" className="space-y-4 mt-2">
                {/* Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Banknote className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle>Categoria de Despesas</CardTitle>
                          <CardDescription>Gerencie as categorias de despesas para seu DRE</CardDescription>
                        </div>
                      </div>
                      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
                        <DialogTrigger asChild>
                          <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nova Categoria
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Criar Categoria de Despesa</DialogTitle>
                            <DialogDescription>Defina a descrição e a categoria de agrupamento</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Descrição</Label>
                              <Input className="mt-2" value={expenseCategoryInput} onChange={(e) => setExpenseCategoryInput(e.target.value)} placeholder="Ex.: Aluguel, Água, Energia" />
                            </div>
                            <div className="space-y-2">
                              <Label>Categoria para agrupar no DRE</Label>
                              <Select value={expenseDre} onValueChange={(v) => setExpenseDre(v as any)}>
                                <SelectTrigger className="mt-2"><SelectValue placeholder="(selecione)" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">Não exibir</SelectItem>
                                  <SelectItem value="DEFAULT">Despesas padrão</SelectItem>
                                  <SelectItem value="SALES">Despesas de vendas</SelectItem>
                                  <SelectItem value="ADMIN">Despesas administrativas</SelectItem>
                                  <SelectItem value="FINANCIAL">Despesas financeiras</SelectItem>
                                  <SelectItem value="MARKETING">Despesas com marketing</SelectItem>
                                  <SelectItem value="PERSONAL">Despesas pessoais</SelectItem>
                                  <SelectItem value="SOCIAL_CHARGES">Encargos sociais</SelectItem>
                                  <SelectItem value="OTHER">Outras despesas</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCategoryForm(false)}>Cancelar</Button>
                            <Button disabled={!expenseCategoryInput.trim()} onClick={() => { handleAdd('EXPENSE_CATEGORY', expenseCategoryInput); }}>
                              Salvar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                </Card>

                {/* Lista de Categorias */}
                <Card>
                  <CardHeader>
                    <CardTitle>Categorias Cadastradas</CardTitle>
                    <CardDescription>Lista de todas as categorias de despesas cadastradas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {expenseQuery.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Carregando categorias...</span>
                      </div>
                    ) : (expenseQuery.data?.length || 0) === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma categoria cadastrada</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenseQuery.data?.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell>{c.name}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
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
              </TabsContent>

              {/* Tipo de Documentos (modelo igual ao Local de Estoque) */}
              <TabsContent value="documentos" className="space-y-4 mt-2">
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
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editDocumentId ? 'Editar Tipo de Documento' : 'Novo Tipo de Documento'}</DialogTitle>
                            <DialogDescription>Preencha os dados abaixo e salve.</DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <Label>Nome</Label>
                              <Input className="mt-2" value={documentTypeInput} onChange={(e) => setDocumentTypeInput(e.target.value)} placeholder="Ex.: Recibo, Duplicata, Cheque" />
                            </div>
                            <div className="flex flex-col gap-2 mt-2 md:mt-0">
                              <Label>Situação</Label>
                              <div className="flex items-center gap-3 md:mt-[30px]">
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
                          <DialogFooter>
                            <Button onClick={handleAddDocument} disabled={!documentTypeInput.trim()}>Salvar</Button>
                            <Button variant="outline" onClick={() => setShowDocumentModal(false)}>Cancelar</Button>
                          </DialogFooter>
                        </DialogContent>
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
                    {documentQuery.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Carregando tipos...</span>
                      </div>
                    ) : (documentQuery.data?.length || 0) === 0 ? (
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
                          {documentQuery.data?.map((c) => (
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
                                <Button variant="ghost" size="sm" onClick={() => documentDeleteMutation.mutate({ id: c.id })}>
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
              </TabsContent>

              {/* Tipo de Lançamento (modelo igual ao Local de Estoque) */}
              <TabsContent value="lancamentos" className="space-y-4 mt-2">
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
                            <Button onClick={handleAddEntryType} disabled={!entryName.trim()}>Salvar</Button>
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
                    {launchsQuery.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Carregando tipos...</span>
                      </div>
                    ) : (launchsQuery.data?.length || 0) === 0 ? (
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
                          {launchsQuery.data?.map((c) => (
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
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteLaunch(c.id)}>
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
              </TabsContent>

              {/* Modal de edição de lançamento */}
              <LaunchEditDialog
                open={showEditDialog}
                onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditLaunch(null); }}
                initial={editLaunch}
                onSave={(values) => {
                  if (!editLaunch) return;
                  entryUpdateMutation.mutate({ id: editLaunch.id, patch: values });
                }}
              />

        </Tabs>
      </div>
  );
}

export default function FinanceSettings() {
  return (
    <Layout>
      <FinanceSettingsContent />
    </Layout>
  );
}

export function FinanceSettingsEmbedded({ tenantId }: { tenantId: string }) {
  return <FinanceSettingsContent tenantId={tenantId} />;
}

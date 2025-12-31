import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import BillingDialogContent from '@/components/billing/kanban/BillingDialogContent';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Banknote, Loader2, Plus, Trash2 } from 'lucide-react';
import { useSecureTenantMutation, useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { createFinancialSetting, deleteFinancialSetting, listFinancialSettings, type FinancialSettingType } from '@/services/financialSettingsService';

type Props = { tenantId?: string | null };

export function RevenueCategoriesSection({ tenantId }: Props) {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [revenueCategoryInput, setRevenueCategoryInput] = useState('');
  const [revenueDre, setRevenueDre] = useState<'NONE'|'DEFAULT'|'SALES'|'ADMIN'|'FINANCIAL'|'MARKETING'|'PERSONAL'|'SOCIAL_CHARGES'|'OTHER'>('DEFAULT');

  const query = useSecureTenantQuery(
    ['financial-settings', tenantId, 'RECEIVABLE_CATEGORY'],
    async (supabase, tId) => {
      const data = await listFinancialSettings(tId, 'RECEIVABLE_CATEGORY', undefined, supabase);
      const invalid = data.filter(item => item.tenant_id !== tId);
      if (invalid.length) throw new Error('VIOLAÇÃO DE SEGURANÇA: registros de outro tenant');
      return data;
    },
    { enabled: !!tenantId }
  );

  const createMutation = useSecureTenantMutation(
    async (supabase, tId, payload: { name: string; dre?: string }) => {
      const targetTenantId = tenantId || tId;
      return await createFinancialSetting({ tenant_id: targetTenantId!, type: 'RECEIVABLE_CATEGORY', name: payload.name, dre_category: payload.dre as any }, supabase);
    },
    {
      invalidateQueries: ['financial-settings'],
      onSuccess: () => {
        setRevenueCategoryInput('');
        setRevenueDre('DEFAULT');
        setShowCategoryForm(false);
      },
    }
  );

  const deleteMutation = useSecureTenantMutation(async (supabase, _tId, payload: { id: string }) => {
    return await deleteFinancialSetting(payload.id, supabase);
  }, { invalidateQueries: ['financial-settings'] });

  const handleAdd = (type: FinancialSettingType, value: string) => {
    const v = value.trim();
    if (!v || type !== 'RECEIVABLE_CATEGORY') return;
    createMutation.mutate({ name: v, dre: revenueDre } as any);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Banknote className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Categoria de Receitas</CardTitle>
                <CardDescription>Gerencie as categorias de receitas para seu DRE</CardDescription>
              </div>
            </div>
            <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <BillingDialogContent className="p-0 m-0 border-0">
                <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/85 to-primary/60 border-b border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-white/8 animate-pulse" />
                  <div className="relative flex items-center justify-between px-6 py-4 z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Banknote className="h-5 w-5 text-white" />
                      </div>
                      <DialogTitle className="text-xl font-semibold text-white">Criar Categoria de Receita</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-white/70">Defina a descrição e a categoria de agrupamento</DialogDescription>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input
                        className="mt-2"
                        value={revenueCategoryInput}
                        onChange={(e) => setRevenueCategoryInput(e.target.value)}
                        placeholder="Ex.: Vendas, Serviços, Rendimentos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria para agrupar no DRE</Label>
                      <Select value={revenueDre} onValueChange={(v) => setRevenueDre(v as any)}>
                        <SelectTrigger className="mt-2"><SelectValue placeholder="(selecione)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Não exibir</SelectItem>
                          <SelectItem value="DEFAULT">Receitas padrão</SelectItem>
                          <SelectItem value="SALES">Receitas de Vendas/Serviços</SelectItem>
                          <SelectItem value="FINANCIAL">Receitas Financeiras</SelectItem>
                          <SelectItem value="OTHER">Outras Receitas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                  <Button variant="outline" onClick={() => setShowCategoryForm(false)}>Cancelar</Button>
                  <Button disabled={!revenueCategoryInput.trim()} onClick={() => { handleAdd('RECEIVABLE_CATEGORY', revenueCategoryInput); }}>Salvar</Button>
                </div>
              </BillingDialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias Cadastradas</CardTitle>
          <CardDescription>Lista de todas as categorias de receitas cadastradas</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando categorias...</span>
            </div>
          ) : (query.data?.length || 0) === 0 ? (
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
                {query.data?.map((c) => (
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
    </>
  );
}

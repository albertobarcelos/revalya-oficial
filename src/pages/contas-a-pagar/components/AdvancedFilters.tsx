import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { User } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { PayablesFilters } from '../types/filters';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { listFinancialSettings } from '@/services/financialSettingsService';
import { listFinancialDocuments } from '@/services/financialDocumentsService';

export function AdvancedFilters({
  filters: parentFilters,
  setFilters: setParentFilters,
  onApply,
  onReset,
}: {
  filters: PayablesFilters;
  setFilters: (updater: (prev: PayablesFilters) => PayablesFilters) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const [localFilters, setLocalFilters] = useState<PayablesFilters>(parentFilters);

  useEffect(() => {
    setLocalFilters(parentFilters);
  }, [parentFilters]);

  const { currentTenant } = useTenantAccessGuard();

  const categoriesQuery = useSecureTenantQuery(
    ['payables-filters-categories', currentTenant?.id],
    async (supabase, tId) => {
      const data = await listFinancialSettings(tId, 'EXPENSE_CATEGORY', { active: true }, supabase);
      return data;
    },
    { enabled: !!currentTenant?.id }
  );

  const documentsQuery = useSecureTenantQuery(
    ['payables-filters-documents', currentTenant?.id],
    async (supabase, tId) => {
      const data = await listFinancialDocuments(tId, supabase);
      return data;
    },
    { enabled: !!currentTenant?.id }
  );

  const bankAccountsQuery = useSecureTenantQuery(
    ['payables-filters-bank-accounts', currentTenant?.id],
    async (supabase, tId) => {
      const { data, error } = await supabase
        .from('bank_acounts')
        .select('id, bank, agency, count')
        .eq('tenant_id', tId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    { enabled: !!currentTenant?.id }
  );

  const suppliersQuery = useSecureTenantQuery(
    ['payables-filters-suppliers', currentTenant?.id],
    async (supabase, tId) => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, company')
        .eq('tenant_id', tId)
        .or('is_supplier.eq.true,is_carrier.eq.true')
        .order('name');
      if (error) throw error;
      return data;
    },
    { enabled: !!currentTenant?.id }
  );
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Loja</Label>
          <Select value={localFilters.storeId || ''} onValueChange={(v) => setLocalFilters((p) => ({ ...p, storeId: v }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={currentTenant?.id || ''}>{currentTenant?.name || 'Atual'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Situação</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'PENDING', label: 'Abertas' },
              { key: 'OVERDUE', label: 'Vencidas' },
              { key: 'PAID', label: 'Quitadas' },
              { key: 'CANCELLED', label: 'Estornadas' },
            ].map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  checked={localFilters.status.includes(s.key)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setLocalFilters((p) => ({
                      ...p,
                      status: checked ? [...p.status, s.key] : p.status.filter((x) => x !== s.key),
                    }));
                  }}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={localFilters.category || ''} onValueChange={(v) => setLocalFilters((p) => ({ ...p, category: v }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione ou digite para pesquisar" /></SelectTrigger>
            <SelectContent>
              {categoriesQuery.data?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <div className="space-y-2">
          <Label>Data de vencimento</Label>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={localFilters.dateFrom} onChange={(e) => setLocalFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
            <span className="text-center text-sm text-muted-foreground">até</span>
            <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={localFilters.dateTo} onChange={(e) => setLocalFilters((p) => ({ ...p, dateTo: e.target.value }))} />
          </div>
        </div>


        <div className="space-y-2">
          <Label>Tipo de documento</Label>
          <Select value={localFilters.documentId || ''} onValueChange={(v) => setLocalFilters((p) => ({ ...p, documentId: v }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {documentsQuery.data?.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <div className="space-y-2">
          <Label>Data de quitação</Label>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={localFilters.paymentFrom || ''} onChange={(e) => setLocalFilters((p) => ({ ...p, paymentFrom: e.target.value }))} />
            <span className="text-center text-sm text-muted-foreground">até</span>
            <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={localFilters.paymentTo || ''} onChange={(e) => setLocalFilters((p) => ({ ...p, paymentTo: e.target.value }))} />
          </div>
        </div>


        <div className="space-y-2">
          <Label>Valor</Label>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input className="h-9 pl-9" placeholder="0,00" value={localFilters.minAmount || ''} onChange={(e) => setLocalFilters((p) => ({ ...p, minAmount: e.target.value }))} />
            </div>
            <span className="text-center text-sm text-muted-foreground">até</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input className="h-9 pl-9" placeholder="0,00" value={localFilters.maxAmount || ''} onChange={(e) => setLocalFilters((p) => ({ ...p, maxAmount: e.target.value }))} />
            </div>
          </div>
        </div>


        <div className="space-y-2">
          <Label>Conta bancária</Label>
          <Select value={localFilters.bankAccountId || ''} onValueChange={(v) => setLocalFilters((p) => ({ ...p, bankAccountId: v }))}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {bankAccountsQuery.data?.map((acc: any) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.bank} - {acc.agency}/{acc.count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <div className="space-y-2">
          <Label>Data de estorno</Label>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={localFilters.reversalFrom || ''} onChange={(e) => setLocalFilters((p) => ({ ...p, reversalFrom: e.target.value }))} />
            <span className="text-center text-sm text-muted-foreground">até</span>
            <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={localFilters.reversalTo || ''} onChange={(e) => setLocalFilters((p) => ({ ...p, reversalTo: e.target.value }))} />
          </div>
        </div>

        <div className="md:col-span-2 space-y-2 flex flex-col">
          <Label>Fornecedor ou transportadora</Label>
          <Select 
            value={localFilters.supplier || ''} 
            onValueChange={(v) => setLocalFilters((p) => ({ ...p, supplier: v }))}
          >
            <SelectTrigger className="w-full h-9 pl-9 relative font-normal bg-white">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Selecione um fornecedor..." />
            </SelectTrigger>
            <SelectContent className="w-[380px] max-h-[320px] overflow-y-auto overflow-x-hidden">
              {suppliersQuery.data?.map((supplier: any) => (
                <SelectItem
                  key={supplier.id}
                  value={supplier.id}
                  className="whitespace-normal break-words py-2.5 pl-8 pr-3 text-sm leading-5 min-h-[36px]"
                >
                  {supplier.name || supplier.company || "Sem nome"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data de emissão</Label>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={localFilters.issueFrom || ''} onChange={(e) => setLocalFilters((p) => ({ ...p, issueFrom: e.target.value }))} />
            <span className="text-center text-sm text-muted-foreground">até</span>
            <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={localFilters.issueTo || ''} onChange={(e) => setLocalFilters((p) => ({ ...p, issueTo: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onReset}>Limpar filtros</Button>
        <Button onClick={() => { setParentFilters((prev) => ({ ...prev, ...localFilters })); onApply(); }}>Aplicar filtros</Button>
      </div>
    </div>
  );
}

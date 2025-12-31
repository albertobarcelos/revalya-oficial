import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { listFinancialSettings } from '@/services/financialSettingsService';
import { listFinancialDocuments } from '@/services/financialDocumentsService';
import type { RecebimentosFilters } from './types';

export function RecebimentosAdvancedFilters({
  filters: parentFilters,
  onApplyFilters,
  onReset,
}: {
  filters: RecebimentosFilters;
  onApplyFilters: (filters: RecebimentosFilters) => void;
  onReset: () => void;
}) {
  const [localFilters, setLocalFilters] = useState<RecebimentosFilters>(parentFilters);

  useEffect(() => {
    setLocalFilters(parentFilters);
  }, [parentFilters]);

  const { currentTenant } = useTenantAccessGuard();

  const categoriesQuery = useSecureTenantQuery(
    ['recebimentos-filters-categories', currentTenant?.id],
    async (supabase, tId) => {
      // Changed to RECEIVABLE_CATEGORY
      const data = await listFinancialSettings(tId, 'RECEIVABLE_CATEGORY', { active: true }, supabase);
      return data;
    },
    { enabled: !!currentTenant?.id }
  );

  const documentsQuery = useSecureTenantQuery(
    ['recebimentos-filters-documents', currentTenant?.id],
    async (supabase, tId) => {
      const data = await listFinancialDocuments(tId, supabase);
      return data;
    },
    { enabled: !!currentTenant?.id }
  );

  const bankAccountsQuery = useSecureTenantQuery(
    ['recebimentos-filters-bank-accounts', currentTenant?.id],
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

  const customersQuery = useSecureTenantQuery(
    ['recebimentos-filters-customers', currentTenant?.id],
    async (supabase, tId) => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, company')
        .eq('tenant_id', tId)
        .order('name');
      if (error) throw error;
      return data;
    },
    { enabled: !!currentTenant?.id }
  );

  // Helper to update filter
  const updateFilter = (key: keyof RecebimentosFilters, value: any) => {
     setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
  };


  return (
    <div className="w-full pt-4 border-t mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Categoria */}
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={localFilters.category || ''} onValueChange={(v) => updateFilter('category', v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categoriesQuery.data?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Data de Vencimento */}
        <div className="space-y-2">
          <Label>Data de vencimento</Label>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            <Input className="h-9" type="date" value={localFilters.dateFrom} onChange={(e) => updateFilter('dateFrom', e.target.value)} />
            <span className="text-center text-sm text-muted-foreground">até</span>
            <Input className="h-9" type="date" value={localFilters.dateTo} onChange={(e) => updateFilter('dateTo', e.target.value)} />
          </div>
        </div>

        {/* Cliente */}
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={localFilters.customerId || ''} onValueChange={(v) => updateFilter('customerId', v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {customersQuery.data?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name || c.company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Data de Recebimento */}
        <div className="space-y-2">
          <Label>Data de recebimento</Label>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            <Input className="h-9" type="date" value={localFilters.paymentFrom || ''} onChange={(e) => updateFilter('paymentFrom', e.target.value)} />
            <span className="text-center text-sm text-muted-foreground">até</span>
            <Input className="h-9" type="date" value={localFilters.paymentTo || ''} onChange={(e) => updateFilter('paymentTo', e.target.value)} />
          </div>
        </div>

        {/* Valor */}
        <div className="space-y-2">
          <Label>Valor</Label>
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input className="h-9 pl-9" placeholder="0,00" value={localFilters.minAmount || ''} onChange={(e) => updateFilter('minAmount', e.target.value)} />
            </div>
            <span className="text-center text-sm text-muted-foreground">até</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input className="h-9 pl-9" placeholder="0,00" value={localFilters.maxAmount || ''} onChange={(e) => updateFilter('maxAmount', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Conta Bancária */}
        <div className="space-y-2">
          <Label>Conta bancária</Label>
          <Select value={localFilters.bankAccountId || ''} onValueChange={(v) => updateFilter('bankAccountId', v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {bankAccountsQuery.data?.map((acc: any) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.bank} - {acc.agency}/{acc.count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onReset}>Limpar filtros</Button>
        <Button onClick={handleApply}>Aplicar filtros</Button>
      </div>
    </div>
  );
}

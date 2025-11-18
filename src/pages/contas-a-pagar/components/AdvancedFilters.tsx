import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import type { PayablesFilters } from '../types/filters';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { listFinancialSettings } from '@/services/financialSettingsService';
import { listFinancialDocuments } from '@/services/financialDocumentsService';

export function AdvancedFilters({
  filters,
  setFilters,
  onApply,
  onReset,
}: {
  filters: PayablesFilters;
  setFilters: (updater: (prev: PayablesFilters) => PayablesFilters) => void;
  onApply: () => void;
  onReset: () => void;
}) {
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
  return (
    <Card className="bg-blue-50 border border-blue-400 shadow-none rounded-md">
      <CardHeader>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="px-[15px] text-[13px] leading-[21px] text-[#555]">
            <Label>Loja</Label>
            <Select value={filters.storeId || ''} onValueChange={(v) => setFilters((p) => ({ ...p, storeId: v }))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={currentTenant?.id || ''}>{currentTenant?.name || 'Atual'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Situação</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm px-[15px] text-[13px] leading-[21px] text-[#555]">
              {[
                { key: 'PENDING', label: 'Abertas' },
                { key: 'OVERDUE', label: 'Vencidas' },
                { key: 'PAID', label: 'Quitadas' },
                { key: 'CANCELLED', label: 'Estornadas' },
              ].map((s) => (
                <label key={s.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(s.key)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFilters((p) => ({
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

          <div className="px-[15px] text-[13px] leading-[21px] text-[#555]">
            <Label>Categoria</Label>
            <Select value={filters.category || ''} onValueChange={(v) => setFilters((p) => ({ ...p, category: v }))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Selecione ou digite para pesquisar" /></SelectTrigger>
              <SelectContent>
                {categoriesQuery.data?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div className="px-[15px] text-[13px] leading-[21px] text-[#555]">
            <Label>Data de vencimento</Label>
            <div className="mt-2 grid grid-cols-3 gap-2 items-center">
              <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={filters.dateFrom} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
              <span className="text-center text-sm">até</span>
              <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={filters.dateTo} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))} />
            </div>
          </div>


          <div className="px-[15px] text-[13px] leading-[21px] text-[#555]">
            <Label>Tipo de documento</Label>
            <Select value={filters.documentId || ''} onValueChange={(v) => setFilters((p) => ({ ...p, documentId: v }))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {documentsQuery.data?.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div className="px-[15px] text-[13px] leading-[21px] text-[#555]">
            <Label>Data de quitação</Label>
            <div className="mt-2 grid grid-cols-3 gap-2 items-center">
              <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={filters.paymentFrom || ''} onChange={(e) => setFilters((p) => ({ ...p, paymentFrom: e.target.value }))} />
              <span className="text-center text-sm">até</span>
              <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={filters.paymentTo || ''} onChange={(e) => setFilters((p) => ({ ...p, paymentTo: e.target.value }))} />
            </div>
          </div>


          <div className="px-[15px] text-[13px] leading-[21px] text-[#555]">
            <Label>Valor</Label>
            <div className="mt-2 grid grid-cols-3 gap-2 items-center">
              <div className="flex h-9">
                <span className="inline-flex items-center px-3 border border-[#d9d9d9] bg-white text-[#666] rounded-l">R$</span>
                <Input className="h-9 rounded-l-none" placeholder="0,00" value={filters.minAmount || ''} onChange={(e) => setFilters((p) => ({ ...p, minAmount: e.target.value }))} />
              </div>
              <span className="text-center text-sm">até</span>
              <div className="flex h-9">
                <span className="inline-flex items-center px-3 border border-[#d9d9d9] bg-white text-[#666] rounded-l">R$</span>
                <Input className="h-9 rounded-l-none" placeholder="0,00" value={filters.maxAmount || ''} onChange={(e) => setFilters((p) => ({ ...p, maxAmount: e.target.value }))} />
              </div>
            </div>
          </div>


          <div className="px-[15px] text-[13px] leading-[21px] text-[#555]">
            <Label>Conta bancária</Label>
            <Select value={filters.paymentMethod || ''} onValueChange={(v) => setFilters((p) => ({ ...p, paymentMethod: v }))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="BOLETO">Boleto</SelectItem>
                <SelectItem value="BANK_TRANSFER">Transferência</SelectItem>
                <SelectItem value="CASH">Dinheiro</SelectItem>
                <SelectItem value="CREDIT_CARD">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>


          <div className="px-[15px] text-[13px] leading-[21px] text-[#555]">
            <Label>Data de estorno</Label>
            <div className="mt-2 grid grid-cols-3 gap-2 items-center">
              <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={filters.reversalFrom || ''} onChange={(e) => setFilters((p) => ({ ...p, reversalFrom: e.target.value }))} />
              <span className="text-center text-sm">até</span>
              <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={filters.reversalTo || ''} onChange={(e) => setFilters((p) => ({ ...p, reversalTo: e.target.value }))} />
            </div>
          </div>

          <div className="md:col-span-2 px-[15px] text-[13px] leading-[21px] text-[#555]">
            <Label>Fornecedor ou transportadora</Label>
            <Input className="h-9" placeholder="Selecione ou digite para pesquisar" value={filters.supplier || ''} onChange={(e) => setFilters((p) => ({ ...p, supplier: e.target.value }))} />
          </div>

          <div className="px-[15px] text-[13px] leading-[21px] text-[#555]">
            <Label>Data de emissão</Label>
            <div className="mt-2 grid grid-cols-3 gap-2 items-center">
              <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={filters.issueFrom || ''} onChange={(e) => setFilters((p) => ({ ...p, issueFrom: e.target.value }))} />
              <span className="text-center text-sm">até</span>
              <Input className="h-9" type="date" placeholder="dd/mm/aaaa" value={filters.issueTo || ''} onChange={(e) => setFilters((p) => ({ ...p, issueTo: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onReset}>Limpar filtros</Button>
          <Button onClick={onApply}>Aplicar filtros</Button>
        </div>
      </CardContent>
    </Card>
  );
}

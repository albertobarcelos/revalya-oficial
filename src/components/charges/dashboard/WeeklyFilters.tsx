import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Cobranca } from '@/types/database';

// AIDEV-NOTE: Interface para props do componente WeeklyFilters
interface WeeklyFiltersProps {
  statusFilter: string;
  clientFilter: string;
  minAmount: string;
  maxAmount: string;
  onStatusChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onMinAmountChange: (value: string) => void;
  onMaxAmountChange: (value: string) => void;
  charges: Cobranca[];
  onFilteredChargesChange: (charges: Cobranca[]) => void;
}

// AIDEV-NOTE: Componente de filtros semanais extraído para modularização
export function WeeklyFilters({
  statusFilter,
  clientFilter,
  minAmount,
  maxAmount,
  onStatusChange,
  onClientChange,
  onMinAmountChange,
  onMaxAmountChange,
  charges,
  onFilteredChargesChange
}: WeeklyFiltersProps) {

  // AIDEV-NOTE: Função para aplicar filtros às cobranças
  const applyFilters = (charges: Cobranca[]) => {
    let filtered = [...charges];
    
    // Filtro de status
    if (statusFilter !== "all") {
      filtered = filtered.filter(charge => {
        const status = charge.status?.toLowerCase() || '';
        
        switch (statusFilter) {
          case 'pago':
            return ['received', 'received_in_cash', 'confirmed'].includes(status);
          case 'pendente':
            return !['received', 'received_in_cash', 'confirmed'].includes(status) && !status.includes('overdue');
          case 'atrasado':
            return status.includes('overdue') || status.includes('atraso');
          default:
            return true;
        }
      });
    }
    
    // Filtro de cliente
    if (clientFilter) {
      filtered = filtered.filter(charge => 
        charge.customers?.name?.toLowerCase().includes(clientFilter.toLowerCase())
      );
    }
    
    // Filtro de valor mínimo
    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        filtered = filtered.filter(charge => (charge.valor || 0) >= min);
      }
    }
    
    // Filtro de valor máximo
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        filtered = filtered.filter(charge => (charge.valor || 0) <= max);
      }
    }
    
    onFilteredChargesChange(filtered);
  };

  // AIDEV-NOTE: Aplicar filtros sempre que houver mudança
  useEffect(() => {
    applyFilters(charges);
  }, [statusFilter, clientFilter, minAmount, maxAmount, charges]);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Filtros Avançados</CardTitle>
        <CardDescription>Refine os dados do calendário</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status-filter" className="text-sm font-medium">Status</Label>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="client-filter" className="text-sm font-medium">Cliente</Label>
          <Input
            id="client-filter"
            type="text"
            value={clientFilter}
            onChange={(e) => onClientChange(e.target.value)}
            placeholder="Filtrar por cliente..."
            className="text-sm"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="min-amount" className="text-sm font-medium">Valor Mínimo</Label>
          <Input
            id="min-amount"
            type="number"
            value={minAmount}
            onChange={(e) => onMinAmountChange(e.target.value)}
            placeholder="R$ 0,00"
            className="text-sm"
            min="0"
            step="0.01"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="max-amount" className="text-sm font-medium">Valor Máximo</Label>
          <Input
            id="max-amount"
            type="number"
            value={maxAmount}
            onChange={(e) => onMaxAmountChange(e.target.value)}
            placeholder="R$ 0,00"
            className="text-sm"
            min="0"
            step="0.01"
          />
        </div>
      </CardContent>
    </Card>
  );
}
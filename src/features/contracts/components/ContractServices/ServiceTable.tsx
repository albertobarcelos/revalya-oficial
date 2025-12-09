/**
 * AIDEV-NOTE: Componente de tabela de serviços do contrato
 * Exibe lista de serviços com ações de edição e remoção
 * 
 * @module features/contracts/components/ContractServices/ServiceTable
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Settings, Copy, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { SelectedService } from '../../types';

interface ServiceTableProps {
  /** Lista de serviços */
  services: SelectedService[];
  /** IDs dos serviços selecionados */
  selectedIds: string[];
  /** Callback quando seleciona um serviço */
  onSelectService: (serviceId: string) => void;
  /** Callback quando seleciona todos */
  onSelectAll: () => void;
  /** Callback para editar serviço */
  onEditService: (serviceId: string) => void;
  /** Callback para duplicar serviço */
  onDuplicateService?: (serviceId: string) => void;
  /** Callback para remover serviço */
  onRemoveService: (serviceId: string) => void;
  /** Desabilitar ações */
  disabled?: boolean;
}

/**
 * Tabela de serviços com seleção e menu de ações
 * 
 * @example
 * ```tsx
 * <ServiceTable
 *   services={selectedServices}
 *   selectedIds={selectedServiceIds}
 *   onSelectService={(id) => toggleSelection(id)}
 *   onSelectAll={() => toggleAllSelection()}
 *   onEditService={(id) => openEditModal(id)}
 *   onRemoveService={(id) => removeService(id)}
 * />
 * ```
 */
// AIDEV-NOTE: Mapeamento de unidades para exibição amigável
const UNIT_TYPE_LABELS: Record<string, string> = {
  hour: 'Hora',
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
  monthly: 'Mensal',
  year: 'Ano',
  unit: 'Unidade',
  service: 'Serviço',
  project: 'Projeto',
  '': 'Mensal'
};

export function ServiceTable({ 
  services, 
  selectedIds,
  onSelectService,
  onSelectAll,
  onEditService,
  onDuplicateService,
  onRemoveService,
  disabled = false 
}: ServiceTableProps) {
  const isAllSelected = selectedIds.length === services.length && services.length > 0;
  
  // Formata o tipo de unidade para exibição
  const formatUnitType = (unitType?: string): string => {
    if (!unitType) return UNIT_TYPE_LABELS[''];
    return UNIT_TYPE_LABELS[unitType] || unitType;
  };
  
  // Formata o desconto para exibição
  const formatDiscount = (service: SelectedService): string | null => {
    if (service.discount_amount && service.discount_amount > 0) {
      return formatCurrency(service.discount_amount);
    }
    if (service.discount_percentage && service.discount_percentage > 0) {
      return `${service.discount_percentage}%`;
    }
    return null;
  };

  return (
    <div className="border rounded-xl overflow-hidden bg-card/30 backdrop-blur-sm shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/50">
            <TableHead className="w-[50px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={onSelectAll}
                className="border-border/50"
                disabled={disabled}
              />
            </TableHead>
            <TableHead className="font-medium text-muted-foreground text-xs">
              Serviço
            </TableHead>
            <TableHead className="text-center font-medium text-muted-foreground text-xs w-[60px]">
              Qtd
            </TableHead>
            <TableHead className="text-center font-medium text-muted-foreground text-xs">
              Unidade
            </TableHead>
            <TableHead className="text-right font-medium text-muted-foreground text-xs">
              Valor Unitário
            </TableHead>
            <TableHead className="text-center font-medium text-muted-foreground text-xs">
              Desconto
            </TableHead>
            <TableHead className="text-right font-medium text-muted-foreground text-xs">
              Total
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow 
              key={service.id} 
              className="hover:bg-muted/30 transition-colors"
            >
              {/* Checkbox de seleção */}
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(service.id)}
                  onCheckedChange={() => onSelectService(service.id)}
                  disabled={disabled}
                />
              </TableCell>
              
              {/* Nome do serviço */}
              <TableCell className="font-medium">
                {service.name}
              </TableCell>
              
              {/* Quantidade */}
              <TableCell className="text-center">
                {service.quantity}
              </TableCell>
              
              {/* Unidade */}
              <TableCell className="text-center">
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  {formatUnitType(service.unit_type)}
                </span>
              </TableCell>
              
              {/* Valor unitário */}
              <TableCell className="text-right">
                {formatCurrency(service.unit_price || service.default_price || 0)}
              </TableCell>
              
              {/* Desconto */}
              <TableCell className="text-center">
                {formatDiscount(service) ? (
                  <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                    -{formatDiscount(service)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              
              {/* Total */}
              <TableCell className="text-right font-medium text-primary">
                {formatCurrency(service.total)}
              </TableCell>
              
              {/* Menu de ações */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      disabled={disabled}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48 border-border/50"
                  >
                    {/* Editar */}
                    <DropdownMenuItem 
                      className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer" 
                      onClick={() => onEditService(service.id)}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Mais Configurações</span>
                    </DropdownMenuItem>
                    
                    {/* Duplicar */}
                    {onDuplicateService && (
                      <DropdownMenuItem 
                        className="gap-2 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        onClick={() => onDuplicateService(service.id)}
                      >
                        <Copy className="h-4 w-4" />
                        <span>Duplicar</span>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {/* Remover */}
                    <DropdownMenuItem 
                      className="text-destructive gap-2 focus:text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer" 
                      onClick={() => onRemoveService(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Remover</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default ServiceTable;


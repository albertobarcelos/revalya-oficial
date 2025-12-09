/**
 * AIDEV-NOTE: Componente de tabela de produtos do contrato
 * Exibe lista de produtos com ações de edição e remoção
 * Layout idêntico ao ServiceTable
 * 
 * @module features/contracts/components/ContractProducts/ProductTable
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Settings, Copy, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { SelectedProduct } from '../../types';

interface ProductTableProps {
  /** Lista de produtos */
  products: SelectedProduct[];
  /** IDs dos produtos selecionados */
  selectedIds?: string[];
  /** Callback quando seleciona um produto */
  onSelectProduct?: (productId: string) => void;
  /** Callback quando seleciona todos */
  onSelectAll?: () => void;
  /** Callback para editar produto */
  onEditProduct: (productId: string) => void;
  /** Callback para duplicar produto */
  onDuplicateProduct?: (productId: string) => void;
  /** Callback para remover produto */
  onRemoveProduct: (productId: string) => void;
  /** Desabilitar ações */
  disabled?: boolean;
}

// AIDEV-NOTE: Mapeamento de unidades para exibição amigável
const UNIT_TYPE_LABELS: Record<string, string> = {
  unit: 'Unidade',
  piece: 'Peça',
  box: 'Caixa',
  pack: 'Pacote',
  kg: 'Kg',
  g: 'Grama',
  l: 'Litro',
  ml: 'mL',
  m: 'Metro',
  m2: 'm²',
  m3: 'm³',
  hour: 'Hora',
  day: 'Dia',
  month: 'Mês',
  '': 'Unidade'
};

/**
 * Tabela de produtos com seleção e menu de ações
 * Layout idêntico ao ServiceTable
 */
export function ProductTable({ 
  products, 
  selectedIds = [],
  onSelectProduct,
  onSelectAll,
  onEditProduct,
  onDuplicateProduct,
  onRemoveProduct,
  disabled = false 
}: ProductTableProps) {
  const isAllSelected = selectedIds.length === products.length && products.length > 0;
  // AIDEV-NOTE: Sempre mostrar checkbox para manter layout idêntico ao ServiceTable
  const hasSelectionHandlers = !!onSelectProduct && !!onSelectAll;

  // Formata o tipo de unidade para exibição
  const formatUnitType = (unitType?: string): string => {
    if (!unitType) return UNIT_TYPE_LABELS[''];
    return UNIT_TYPE_LABELS[unitType] || unitType;
  };
  
  // Formata o desconto para exibição
  const formatDiscount = (product: SelectedProduct): string | null => {
    if (product.discount_amount && product.discount_amount > 0) {
      return formatCurrency(product.discount_amount);
    }
    if (product.discount_percentage && product.discount_percentage > 0) {
      return `${product.discount_percentage}%`;
    }
    return null;
  };

  return (
    <div className="border rounded-xl overflow-hidden bg-card/30 backdrop-blur-sm shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/50">
            {/* AIDEV-NOTE: Checkbox sempre visível para layout idêntico ao ServiceTable */}
            <TableHead className="w-[50px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={hasSelectionHandlers ? onSelectAll : undefined}
                className="border-border/50"
                disabled={disabled || !hasSelectionHandlers}
              />
            </TableHead>
            <TableHead className="font-medium text-muted-foreground text-xs">
              Produto
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
          {products.map((product) => (
            <TableRow 
              key={product.id} 
              className="hover:bg-muted/30 transition-colors"
            >
              {/* Checkbox de seleção - sempre visível para layout idêntico */}
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(product.id)}
                  onCheckedChange={hasSelectionHandlers ? () => onSelectProduct?.(product.id) : undefined}
                  disabled={disabled || !hasSelectionHandlers}
                />
              </TableCell>
              
              {/* Nome do produto */}
              <TableCell className="font-medium">
                {product.name}
              </TableCell>
              
              {/* Quantidade */}
              <TableCell className="text-center">
                {product.quantity}
              </TableCell>
              
              {/* Unidade */}
              <TableCell className="text-center">
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  {formatUnitType(product.unit_type)}
                </span>
              </TableCell>
              
              {/* Valor unitário */}
              <TableCell className="text-right">
                {formatCurrency(product.unit_price || product.price || 0)}
              </TableCell>
              
              {/* Desconto */}
              <TableCell className="text-center">
                {formatDiscount(product) ? (
                  <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                    -{formatDiscount(product)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              
              {/* Total */}
              <TableCell className="text-right font-medium text-primary">
                {formatCurrency(product.total_amount)}
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
                      onClick={() => onEditProduct(product.id)}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Mais Configurações</span>
                    </DropdownMenuItem>
                    
                    {/* Duplicar */}
                    {onDuplicateProduct && (
                      <DropdownMenuItem 
                        className="gap-2 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        onClick={() => onDuplicateProduct(product.id)}
                      >
                        <Copy className="h-4 w-4" />
                        <span>Duplicar</span>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {/* Remover */}
                    <DropdownMenuItem 
                      className="text-destructive gap-2 focus:text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer" 
                      onClick={() => onRemoveProduct(product.id)}
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

export default ProductTable;

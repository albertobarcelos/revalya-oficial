/**
 * Componente de tabela de movimentações de estoque
 * 
 * AIDEV-NOTE: Tabela para exibir movimentações de estoque com todas as colunas,
 * ordenação e filtros conforme especificado no plano
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, MoreHorizontal, Trash2, Edit, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import type { StockMovement } from '@/hooks/useStockMovements';
import {
  formatStockQuantity,
  formatCMC,
  formatCurrency,
  formatDate,
  getMovementTypeLabel,
  getMovementReasonLabel
} from '@/utils/stockUtils';

interface StockMovementsTableProps {
  movements: StockMovement[];
  isLoading?: boolean;
  error?: Error | null;
  onEdit?: (movement: StockMovement) => void;
  onDelete?: (movementId: string) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export function StockMovementsTable({
  movements,
  isLoading = false,
  error = null,
  onEdit,
  onDelete,
  sortColumn,
  sortDirection = 'desc',
  onSort
}: StockMovementsTableProps) {
  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  const SortButton = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 hover:bg-transparent"
      onClick={() => handleSort(column)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-3 w-3" />
    </Button>
  );

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-32" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 11 }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-body text-muted-foreground">
            Erro ao carregar movimentações: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <p className="text-body text-muted-foreground">
            Nenhuma movimentação encontrada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[100px]">
              <SortButton column="movement_date">
                Data
              </SortButton>
            </TableHead>
            <TableHead className="w-[150px]">
              <SortButton column="origin">
                &lt;&lt; Origem
              </SortButton>
            </TableHead>
            <TableHead className="w-[120px]">
              <SortButton column="quantity">
                &lt;&lt; Quantidade
              </SortButton>
            </TableHead>
            <TableHead className="w-[120px]">
              <SortButton column="total_value">
                &lt;&lt; Valor
              </SortButton>
            </TableHead>
            <TableHead className="w-[150px]">
              <SortButton column="accumulated_balance">
                &lt;&lt; Saldo Acumulado
              </SortButton>
            </TableHead>
            <TableHead className="w-[120px]">
              <SortButton column="unit_cmc">
                CMC Unitário
              </SortButton>
            </TableHead>
            <TableHead className="w-[120px]">
              <SortButton column="total_cmc">
                CMC Total
              </SortButton>
            </TableHead>
            <TableHead className="w-[100px]">
              &lt;&lt; Opções
            </TableHead>
            <TableHead className="w-[120px]">
              <SortButton column="invoice_number">
                &lt;&lt; Nota Fiscal
              </SortButton>
            </TableHead>
            <TableHead className="w-[120px]">
              <SortButton column="operation">
                &lt;&lt; Operação
              </SortButton>
            </TableHead>
            <TableHead className="w-[200px]">
              <SortButton column="customer_or_supplier">
                &lt;&lt; Cliente ou Fornecedor
              </SortButton>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {movements.map((movement) => {
              const unit = movement.product?.unit_of_measure || 'UN';
              const origin = movement.origin_location?.name || 
                            movement.storage_location?.name || 
                            'Saldo Inicial';
              
              return (
                <motion.tr
                  key={movement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="group hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    {formatDate(movement.movement_date)}
                  </TableCell>
                  <TableCell>
                    <span className="text-table">{origin}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-table font-medium">
                      {formatStockQuantity(movement.quantity, unit)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-table font-medium">
                      {formatCurrency(movement.total_value)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-table font-medium">
                      {formatStockQuantity(movement.accumulated_balance, unit)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-table">
                      {formatCMC(movement.unit_cmc)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-table">
                      {formatCMC(movement.total_cmc)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(movement)}
                          className="h-8 w-8 p-0 hover:bg-blue-100"
                        >
                          <span className="sr-only">Editar movimentação</span>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(movement.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100"
                        >
                          <span className="sr-only">Excluir movimentação</span>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-table">
                      {movement.invoice_number || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[12px]">
                      {movement.operation || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-table">
                      {movement.customer_or_supplier || '-'}
                    </span>
                  </TableCell>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}


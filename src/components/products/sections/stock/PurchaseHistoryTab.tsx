/**
 * Sub-aba: Histórico de Compra
 * 
 * AIDEV-NOTE: Exibe histórico de movimentações de entrada (compras) do produto
 */

import { memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { useStockMovements, type StockMovement } from '@/hooks/useStockMovements';
import { formatCMC } from '@/utils/stockUtils';

interface PurchaseHistoryTabProps {
  productId: string | null;
}

function PurchaseHistoryTabComponent({ productId }: PurchaseHistoryTabProps) {
  
  const {
    movements,
    isLoading,
    error,
  } = useStockMovements({
    product_id: productId || undefined,
    movement_type: 'ENTRADA',
    limit: 100,
  });

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 7 }).map((_, index) => (
                <TableHead key={index}>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 7 }).map((_, cellIndex) => (
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
      <div className="flex items-center justify-center py-12 text-center">
        <div className="space-y-2">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <p className="text-sm text-destructive">
            Erro ao carregar histórico de compra: {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </div>
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div className="space-y-2">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma compra registrada para este produto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Local de Estoque</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Valor Unitário</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement: StockMovement) => (
            <TableRow key={movement.id}>
              <TableCell>
                {format(new Date(movement.movement_date), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                {movement.storage_location?.name || 'Local não encontrado'}
              </TableCell>
              <TableCell className="text-right">
                {movement.quantity.toLocaleString('pt-BR')}
              </TableCell>
              <TableCell className="text-right">
                {formatCMC(movement.unit_value || 0)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCMC(movement.total_value || 0)}
              </TableCell>
              <TableCell>
                {movement.customer_or_supplier || '-'}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {movement.observation || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// AIDEV-NOTE: Memoizar para evitar re-renders ao trocar de abas
export const PurchaseHistoryTab = memo(PurchaseHistoryTabComponent, (prevProps, nextProps) => {
  return prevProps.productId === nextProps.productId;
});


// =====================================================
// AIDEV-NOTE: TableRow Component
// =====================================================
// Componente extraído de ReconciliationTable.tsx para gerenciar
// as linhas da tabela de reconciliação
// Centraliza a renderização de dados e lógica de interação
// =====================================================

import React from 'react';
import { TableCell, TableRow as ShadcnTableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle2, CheckCircle } from 'lucide-react';
import { SelectionCheckbox } from './SelectionCheckbox';
import { StatusBadge } from './StatusBadge';
import { ActionButtons } from './ActionButtons';
import { ValueCell } from './ValueCell';
import ImportedIndicator from './ImportedIndicator';
import { TableRowProps } from '../types/table-parts';
import { ReconciliationSource, ReconciliationAction } from '@/types/reconciliation';
import { formatDate } from '@/lib/utils';

// AIDEV-NOTE: Função para mapear payment_method para nomes amigáveis em português
const getPaymentMethodDisplayName = (paymentMethod: string | null | undefined): string => {
  if (!paymentMethod) return 'N/A';
  
  const paymentMethodMap: Record<string, string> = {
    'CREDIT_CARD': 'CRÉDITO',
    'DEBIT_CARD': 'DÉBITO', 
    'PIX': 'PIX',
    'BOLETO': 'BOLETO',
    'BANK_SLIP': 'BOLETO BANCÁRIO',
    'TRANSFER': 'TRANSFERÊNCIA',
    'DEPOSIT': 'DEPÓSITO',
    'CASH': 'DINHEIRO',
    'CHECK': 'CHEQUE',
    'OUTROS': 'OUTROS'
  };
  
  return paymentMethodMap[paymentMethod.toUpperCase()] || paymentMethod;
};

interface TableRowComponentProps extends TableRowProps {
  isExpanded?: boolean;
  onToggleExpansion?: (id: string) => void;
  onViewAsaasDetails?: (movement: any) => void;
  getSourceBadge?: (source: ReconciliationSource) => React.ReactNode;
}

export function TableRow({ 
  movement, 
  isSelected, 
  hasSelection, 
  onSelect, 
  onAction,
  isExpanded,
  onToggleExpansion,
  onViewAsaasDetails,
  getSourceBadge
}: TableRowExtendedProps) {
  
  // AIDEV-NOTE: Cálculo de diferença para destacar visualmente
  const hasDifference = movement.difference && Math.abs(movement.difference) > 0.01;

  return (
    <ShadcnTableRow 
      className={`
        ${hasDifference ? 'border-l-4 border-l-orange-400' : ''}
        hover:bg-slate-50 transition-colors
      `}
    >
      {/* AIDEV-NOTE: Coluna de seleção - sticky left */}
      <TableCell className="sticky left-0 bg-white z-10 py-1 sm:py-2 text-center">
        {hasSelection && (
          <SelectionCheckbox
            checked={isSelected}
            onChange={(checked) => onSelect(movement.id, checked)}
            type="individual"
            aria-label={`Selecionar movimento ${movement.externalId}`}
          />
        )}
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Origem */}
      <TableCell className="py-1 sm:py-2 text-center">
        {getSourceBadge(movement.source)}
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna ID Externo com botão de expansão */}
      <TableCell className="font-mono text-sm py-1 sm:py-2 text-left">
        <div className="flex items-center gap-2">
          {movement.externalId}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpansion(movement.id)}
            className="h-6 w-6 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Observações - exibe descricao da charge */}
      <TableCell className="font-mono text-sm py-1 sm:py-2 text-left max-w-[200px]">
        {movement.observacao ? (
          <span 
            className="text-slate-700 block truncate" 
            title={movement.observacao}
          >
            {movement.observacao}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Nome do Cliente - exibe para todas as origens */}
      <TableCell className="py-1 sm:py-2 text-left max-w-[180px]">
        {movement.customerName ? (
          <span 
            className="text-slate-700 font-medium block truncate" 
            title={movement.customerName}
          >
            {movement.customerName}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna CNPJ/CPF - exibe para todas as origens */}
      <TableCell className="font-mono text-sm py-1 sm:py-2 text-left">
        {movement.customerDocument ? (
          <span className="text-slate-700">{movement.customerDocument}</span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Tipo de Cobrança - específica para ASAAS */}
      <TableCell className="py-1 sm:py-2 text-center">
        <Badge variant="outline" className="text-xs">
          {getPaymentMethodDisplayName(movement.payment_method)}
        </Badge>
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Valor Cobrança */}
      <TableCell className="py-1 sm:py-2 text-right">
        <ValueCell 
          value={movement.chargeAmount} 
          type="optional"
          className=""
        />
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Valor Pago */}
      <TableCell className="font-semibold py-1 sm:py-2 text-right">
        <ValueCell 
          value={movement.paidAmount} 
          type="semibold"
          className=""
        />
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Diferença */}
      <TableCell className="py-1 sm:py-2 text-right">
        <ValueCell 
          value={movement.difference} 
          type="difference"
          className=""
          showEmptyState={true}
        />
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Status de Vinculação */}
      <TableCell className="py-1 sm:py-2 text-center">
        <StatusBadge status={movement.reconciliationStatus} />
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Processado */}
      <TableCell className="py-1 sm:py-2 text-center">
        <ImportedIndicator 
          chargeId={movement.charge_id}
          importedAt={movement.imported_at}
        />
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Pagamento */}
      <TableCell className="py-1 sm:py-2 text-center">
        <StatusBadge status={movement.reconciliationStatus} paymentStatus={movement.paymentStatus} />
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Contrato */}
      <TableCell className="py-1 sm:py-2 text-center">
        {movement.hasContract ? (
          <div className="flex items-center justify-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-mono">
              {movement.contractNumber}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 text-sm">Sem contrato</span>
        )}
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Vencimento */}
      <TableCell className="py-1 sm:py-2 text-center">
        {movement.dueDate ? formatDate(movement.dueDate) : '-'}
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Data Pagamento */}
      <TableCell className="py-1 sm:py-2 text-center">
        {movement.paymentDate ? formatDate(movement.paymentDate) : '-'}
      </TableCell>
      
      {/* AIDEV-NOTE: Coluna Ações - sticky right */}
      <TableCell className="sticky right-0 bg-white z-20 py-1 sm:py-2 text-center border-l border-slate-200">
        <ActionButtons 
          movement={movement}
          onAction={onAction}
          onViewAsaasDetails={onViewAsaasDetails}
        />
      </TableCell>
    </ShadcnTableRow>
  );
}
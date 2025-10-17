// =====================================================
// AIDEV-NOTE: TableHeader Component
// =====================================================
// Componente extraído de ReconciliationTable.tsx para gerenciar
// o cabeçalho da tabela de reconciliação
// Centraliza a estrutura de colunas e lógica de seleção
// =====================================================

import { TableHead, TableHeader as ShadcnTableHeader, TableRow } from '@/components/ui/table';
import { SelectionCheckbox } from './SelectionCheckbox';
import { TableHeaderProps } from '../types/table-parts';

export function TableHeader({ 
  hasSelection, 
  selectedCount, 
  totalCount, 
  onSelectAll, 
  allSelected,
  partiallySelected 
}: TableHeaderProps) {
  
  // AIDEV-NOTE: Handler para seleção de todos os itens
  const handleSelectAll = (checked: boolean) => {
    onSelectAll(checked);
  };

  return (
    <ShadcnTableHeader>
      <TableRow className="bg-slate-50">
        {/* AIDEV-NOTE: Coluna de seleção - sticky left para manter visível */}
        <TableHead className="w-12 sticky left-0 bg-slate-50 z-10 text-center">
          {hasSelection && (
            <SelectionCheckbox
              checked={allSelected}
              onChange={handleSelectAll}
              type="selectAll"
              aria-label="Selecionar todos os movimentos"
            />
          )}
        </TableHead>
        
        {/* AIDEV-NOTE: Colunas de dados - larguras mínimas para responsividade */}
        <TableHead className="min-w-[80px] text-center">Origem</TableHead>
        <TableHead className="min-w-[120px] text-left">ID Externo</TableHead>
        <TableHead className="min-w-[120px] text-left">Nosso Número</TableHead>
        <TableHead className="min-w-[180px] text-left">Nome do Cliente</TableHead>
        <TableHead className="min-w-[140px] text-left">CNPJ/CPF</TableHead>
        <TableHead className="min-w-[100px] text-center">Tipo Cobrança</TableHead>
        <TableHead className="min-w-[120px] text-right">Valor Cobrança</TableHead>
        <TableHead className="min-w-[120px] text-right">Valor Pago</TableHead>
        <TableHead className="min-w-[100px] text-right">Diferença</TableHead>
        <TableHead className="min-w-[100px] text-center">Status</TableHead>
        <TableHead className="min-w-[100px] text-center">Pagamento</TableHead>
        <TableHead className="min-w-[120px] text-center">Contrato</TableHead>
        <TableHead className="min-w-[100px] text-center">Vencimento</TableHead>
        <TableHead className="min-w-[100px] text-center">Dt. Pagamento</TableHead>
        
        {/* AIDEV-NOTE: Coluna de ações - sticky right para manter visível */}
        <TableHead className="w-32 sticky right-0 bg-slate-50 z-20 text-center border-l border-slate-200">
          Ações
        </TableHead>
      </TableRow>
    </ShadcnTableHeader>
  );
}
// =====================================================
// EXPANDED ROW DETAILS COMPONENT
// Descrição: Detalhes expandidos de uma movimentação
// =====================================================

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { ImportedMovement, ReconciliationSource } from '@/types/reconciliation';
import { formatDate } from '../utils/reconciliationHelpers.tsx';

interface ExpandedRowDetailsProps {
  movement: ImportedMovement;
}

// AIDEV-NOTE: Componente completo para exibir detalhes expandidos da movimentação
export const ExpandedRowDetails: React.FC<ExpandedRowDetailsProps> = ({ movement }) => {
  return (
    <TableRow className="bg-slate-50">
      <TableCell colSpan={13} className="py-2 sm:py-3">
        <div className="p-3 space-y-2">
          {/* AIDEV-NOTE: Grid com informações básicas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="font-medium text-slate-600">Cliente:</span>
              <p>{movement.customerName || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600">Documento:</span>
              <p className="font-mono">{movement.customerDocument || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600">Importado em:</span>
              <p>{formatDate(movement.importedAt)}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600">Conciliado por:</span>
              <p>{movement.reconciledBy || 'N/A'}</p>
            </div>
          </div>
          
          {/* AIDEV-NOTE: Seção de status de importação */}
          {movement.charge_id && movement.imported_at && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Status de Importação
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-slate-600">ID da Cobrança:</span>
                  <p className="font-mono text-green-700">{movement.charge_id}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Data de Importação:</span>
                  <p className="text-green-700">{formatDate(movement.imported_at)}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Status:</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span className="text-green-600 font-medium">Importado com Sucesso</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* AIDEV-NOTE: Seção específica para dados ASAAS */}
          {movement.source === ReconciliationSource.ASAAS && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <img src="/logos/Integrações/asaas.png" alt="Asaas" className="w-4 h-4" />
                Detalhes ASAAS
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Nosso Número:</span>
                  <p className="font-mono">{movement.externalReference || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Linha Digitável:</span>
                  <p className="font-mono text-xs break-all">
                    {movement.description?.includes('linha:') ? 
                      movement.description.split('linha:')[1]?.trim() || 'N/A' : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Tipo de Cobrança:</span>
                  <p>
                    {movement.description?.includes('PIX') ? 'PIX' : 
                     movement.description?.includes('BOLETO') ? 'BOLETO' : 
                     movement.description?.includes('CARTAO') ? 'CARTÃO' : 'OUTROS'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* AIDEV-NOTE: Descrição e observações */}
          {movement.description && (
            <div>
              <span className="font-medium text-slate-600">Descrição:</span>
              <p className="text-sm mt-1">{movement.description}</p>
            </div>
          )}
          
          {movement.observations && (
            <div>
              <span className="font-medium text-slate-600">Observações:</span>
              <p className="text-sm mt-1 bg-yellow-50 p-2 rounded border border-yellow-200">
                {movement.observations}
              </p>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};
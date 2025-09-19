import React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContractReceivables, FinanceEntry } from "@/hooks/useFinanceEntries";

// Tipo de recebimento (mock inicial - mantido para compatibilidade)
export interface Recebimento {
  id: string;
  data: string; // ISO date
  valor: number;
  status: string;
  parcelaAtual: number;
  totalParcelas: number;
  observacao?: string;
}

interface RecebimentosHistoricoProps {
  recebimentos?: Recebimento[]; // Mantido para compatibilidade
  onNovoRecebimento?: () => void;
  contractId?: string; // ID do contrato para buscar recebimentos reais
  showRealData?: boolean; // Flag para mostrar dados reais da finance_entries
}

export const RecebimentosHistorico: React.FC<RecebimentosHistoricoProps> = ({ 
  recebimentos = [], 
  onNovoRecebimento, 
  contractId,
  showRealData = true // Padrão: mostrar dados reais
}) => {
  // Removido: Hook para carregar previsões de faturamento

  // Hook para carregar recebimentos reais da tabela finance_entries
  const { 
    entries: financeEntries, 
    isLoading: isLoadingEntries, 
    error: entriesError,
    formatCurrency: formatEntryCurrency,
    statistics
  } = useContractReceivables(showRealData ? contractId : undefined);

  // Determinar qual conjunto de dados usar e estados de loading/error
  const isLoading = showRealData ? isLoadingEntries : false;
  const error = showRealData ? entriesError : null;
  
  let displayData: any[] = [];
  let dataType: 'real' | 'mock' = 'mock';
  
  if (showRealData && financeEntries.length > 0) {
    displayData = financeEntries;
    dataType = 'real';
  } else {
    displayData = recebimentos;
    dataType = 'mock';
  }

  /**
   * Renderiza o status com badge colorido
   */
  const renderStatus = (status: string) => {
    const statusColors = {
      // Status das previsões
      'Previsão': 'bg-blue-100 text-blue-800 border-blue-200',
      // Status dos recebimentos reais (finance_entries)
      'PAID': 'bg-green-100 text-green-800 border-green-200',
      'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'OVERDUE': 'bg-red-100 text-red-800 border-red-200',
      'PARTIALLY_PAID': 'bg-orange-100 text-orange-800 border-orange-200',
      'CANCELLED': 'bg-gray-100 text-gray-800 border-gray-200',
      'REFUNDED': 'bg-purple-100 text-purple-800 border-purple-200',
      // Status antigos (compatibilidade)
      'Pago': 'bg-green-100 text-green-800 border-green-200',
      'Pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Vencido': 'bg-red-100 text-red-800 border-red-200',
    };

    // Traduzir status em inglês para português
    const statusTranslations = {
      'PAID': 'Pago',
      'PENDING': 'Pendente',
      'OVERDUE': 'Vencido',
      'PARTIALLY_PAID': 'Pago Parcial',
      'CANCELLED': 'Cancelado',
      'REFUNDED': 'Reembolsado'
    };

    const translatedStatus = statusTranslations[status as keyof typeof statusTranslations] || status;

    return (
      <Badge 
        variant="outline" 
        className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}
      >
        {translatedStatus}
      </Badge>
    );
  };

  /**
   * Formata valor monetário
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">
            {dataType === 'real' ? 'Histórico de Recebimentos' : 'Histórico de Recebimentos'}
          </h3>
          {dataType === 'real' && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {financeEntries.length} recebimentos
            </Badge>
          )}

          {dataType === 'real' && statistics.total > 0 && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700">
              Total: {formatEntryCurrency(statistics.total)}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={onNovoRecebimento} variant="outline">
          + Adicionar Recebimento
        </Button>
      </CardHeader>
      
      {error && (
        <div className="px-6 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">
              Erro ao carregar recebimentos: {error.message}
            </p>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {dataType === 'real' ? (
                <>
                  <TableHead className="text-left">Número</TableHead>
                  <TableHead className="text-left">Data Vencimento</TableHead>
                  <TableHead className="text-left">Data Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-left">Categoria</TableHead>
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-left">Cliente</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-left">Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-right">Parcela</TableHead>
                  <TableHead className="text-left">Observação</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Carregando recebimentos...
                </TableCell>
              </TableRow>
            ) : displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {dataType === 'real' 
                    ? 'Nenhum recebimento encontrado para este contrato' 
                    : 'Nenhum recebimento registrado ainda'
                  }
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item) => {
                if (dataType === 'real') {
                  // Renderizar recebimentos reais da finance_entries
                  const entry = item as FinanceEntry;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-left font-medium">{entry.entry_number}</TableCell>
                      <TableCell className="text-left">
                        {new Date(entry.due_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-left">
                        {entry.payment_date 
                          ? new Date(entry.payment_date).toLocaleDateString('pt-BR')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatEntryCurrency(entry.net_amount)}
                      </TableCell>
                      <TableCell className="text-left">{entry.category}</TableCell>
                      <TableCell className="text-left">{renderStatus(entry.status)}</TableCell>
                      <TableCell className="text-left">
                        {entry.contracts?.customers?.name || '-'}
                      </TableCell>
                    </TableRow>
                  );

                } else {
                  // Renderizar recebimentos históricos (formato antigo)
                  const recebimento = item as Recebimento;
                  return (
                    <TableRow key={recebimento.id}>
                      <TableCell className="text-left">{new Date(recebimento.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(recebimento.valor)}</TableCell>
                      <TableCell className="text-left">{renderStatus(recebimento.status)}</TableCell>
                      <TableCell className="text-right">{recebimento.parcelaAtual}/{recebimento.totalParcelas}</TableCell>
                      <TableCell className="text-left">{recebimento.observacao || '-'}</TableCell>
                    </TableRow>
                  );
                }
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

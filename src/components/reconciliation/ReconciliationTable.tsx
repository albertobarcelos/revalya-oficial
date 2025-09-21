// =====================================================
// RECONCILIATION TABLE COMPONENT
// Descrição: Tabela principal para visualização e ações de conciliação
// =====================================================

import React, { useState } from 'react';
import { 
  Link, 
  Plus, 
  RefreshCw, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  MoreHorizontal,
  Eye,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ReconciliationTableProps,
  ImportedMovement,
  ReconciliationAction,
  ReconciliationStatus,
  PaymentStatus,
  ReconciliationSource
} from '@/types/reconciliation';

// Components
import AsaasDetailsModal from './AsaasDetailsModal';

// AIDEV-NOTE: Tabela completa com todas as funcionalidades de conciliação
// Inclui ações por linha, seleção múltipla, paginação e indicadores visuais

const ReconciliationTable: React.FC<ReconciliationTableProps> = ({
  movements,
  loading = false,
  isLoading = false,
  onAction,
  selectedMovements = [],
  onSelectionChange,
  pagination
}) => {
  // =====================================================
  // LOCAL STATE
  // =====================================================

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [asaasDetailsModal, setAsaasDetailsModal] = useState<{
    isOpen: boolean;
    movement: ImportedMovement | null;
  }>({
    isOpen: false,
    movement: null
  });

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: ReconciliationStatus) => {
    const statusConfig = {
      [ReconciliationStatus.PENDING]: {
        label: 'Pendente',
        variant: 'secondary' as const,
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      },
      [ReconciliationStatus.RECONCILED]: {
        label: 'Conciliado',
        variant: 'default' as const,
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 border-green-300'
      },
      [ReconciliationStatus.DIVERGENT]: {
        label: 'Divergente',
        variant: 'destructive' as const,
        icon: AlertTriangle,
        className: 'bg-orange-100 text-orange-800 border-orange-300'
      },
      [ReconciliationStatus.CANCELLED]: {
        label: 'Cancelado',
        variant: 'outline' as const,
        icon: Clock,
        className: 'bg-gray-100 text-gray-800 border-gray-300'
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const statusConfig = {
      [PaymentStatus.PENDING]: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      [PaymentStatus.PAID]: { label: 'Pago', className: 'bg-green-100 text-green-800' },
      [PaymentStatus.CANCELLED]: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
      [PaymentStatus.OVERDUE]: { label: 'Vencido', className: 'bg-orange-100 text-orange-800' }
    };

    const config = statusConfig[status];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getSourceBadge = (source: ReconciliationSource) => {
    const sourceConfig = {
      [ReconciliationSource.ASAAS]: { 
        label: 'Asaas', 
        className: 'border-0 bg-transparent p-0',
        logo: '/logos/Integrações/asaas.png'
      },
      [ReconciliationSource.CORA]: { 
        label: 'Cora', 
        className: 'border-0 bg-transparent p-0',
        logo: '/logos/Integrações/cora.png'
      },
      [ReconciliationSource.ITAU]: { label: 'Itaú', className: 'bg-orange-100 text-orange-800' },
      [ReconciliationSource.STONE]: { label: 'Stone', className: 'bg-green-100 text-green-800' },
      [ReconciliationSource.MANUAL]: { label: 'Manual', className: 'bg-gray-100 text-gray-800' }
    };

    const config = sourceConfig[source];
    
    // Para Asaas e Cora, mostrar apenas a logo
    if (config.logo && (source === ReconciliationSource.ASAAS || source === ReconciliationSource.CORA)) {
      return (
        <div className="flex items-center justify-center">
          <img 
            src={config.logo} 
            alt={`${config.label} logo`}
            className="w-8 h-8 object-cover rounded-full"
            title={config.label}
          />
        </div>
      );
    }
    
    // Para outras fontes, manter o badge tradicional
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange(movements.map(m => m.id));
      } else {
        onSelectionChange([]);
      }
    }
  };

  const handleSelectMovement = (movementId: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedMovements, movementId]);
      } else {
        onSelectionChange(selectedMovements.filter(id => id !== movementId));
      }
    }
  };

  const toggleRowExpansion = (movementId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(movementId)) {
      newExpanded.delete(movementId);
    } else {
      newExpanded.add(movementId);
    }
    setExpandedRows(newExpanded);
  };

  // AIDEV-NOTE: Função para obter ações disponíveis por movimento
  const getAvailableActions = (movement: ImportedMovement) => {
    const actions = [];
    
    if (movement.reconciliationStatus === ReconciliationStatus.PENDING) {
      if (movement.hasContract) {
        actions.push({
          action: ReconciliationAction.LINK_TO_CONTRACT,
          label: 'Vincular ao Contrato',
          icon: Link,
          variant: 'primary' as const
        });
      } else {
        actions.push({
          action: ReconciliationAction.CREATE_STANDALONE_CHARGE,
          label: 'Criar Cobrança Avulsa',
          icon: Plus,
          variant: 'secondary' as const
        });
      }
      
      actions.push({
        action: ReconciliationAction.DELETE_IMPORTED,
        label: 'Excluir Importado',
        icon: Trash2,
        variant: 'danger' as const
      });
    }
    
    return actions;
  };

  // AIDEV-NOTE: Função para abrir modal de detalhes ASAAS
  const handleViewAsaasDetails = (movement: ImportedMovement) => {
    setAsaasDetailsModal({
      isOpen: true,
      movement
    });
  };

  // AIDEV-NOTE: Função para fechar modal de detalhes ASAAS
  const handleCloseAsaasDetails = () => {
    setAsaasDetailsModal({
      isOpen: false,
      movement: null
    });
  };

  const getActionButtons = (movement: ImportedMovement) => {
    const actions = [
      {
        type: ReconciliationAction.LINK_TO_CONTRACT,
        label: 'Vincular a Contrato',
        icon: Link,
        variant: 'default' as const,
        disabled: movement.reconciliationStatus === ReconciliationStatus.RECONCILED
      },
      {
        type: ReconciliationAction.CREATE_STANDALONE,
        label: 'Criar Cobrança Avulsa',
        icon: Plus,
        variant: 'secondary' as const,
        disabled: movement.reconciliationStatus === ReconciliationStatus.RECONCILED
      },
      {
        type: ReconciliationAction.COMPLEMENT_EXISTING,
        label: 'Complementar Existente',
        icon: RefreshCw,
        variant: 'outline' as const,
        disabled: movement.reconciliationStatus === ReconciliationStatus.RECONCILED || !movement.chargeId
      },
      {
        type: ReconciliationAction.DELETE_IMPORTED,
        label: 'Excluir Item',
        icon: Trash2,
        variant: 'destructive' as const,
        disabled: false
      }
    ];

    return actions;
  };

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <div className="flex gap-2 ml-auto">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // =====================================================
  // EMPTY STATE
  // =====================================================

  if (movements.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">
            Nenhuma movimentação encontrada
          </h3>
          <p className="text-slate-500">
            Não há movimentações que correspondam aos filtros selecionados.
          </p>
        </CardContent>
      </Card>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            Movimentações ({movements.length})
          </CardTitle>
          
          {selectedMovements.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedMovements.length} selecionado{selectedMovements.length > 1 ? 's' : ''}
              </Badge>
              <Button variant="outline" size="sm">
                Ações em Lote
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* AIDEV-NOTE: Container com altura fixa e scroll único externo */}
        <div className="relative h-[420px] overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto h-full">
            <Table className="min-w-[1400px] relative">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12 sticky left-0 bg-slate-50 z-10 text-center">
                    {onSelectionChange && (
                      <Checkbox
                        checked={selectedMovements.length === movements.length}
                        onCheckedChange={handleSelectAll}
                      />
                    )}
                  </TableHead>
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
                  <TableHead className="w-32 sticky right-0 bg-slate-50 z-20 text-center border-l border-slate-200">Ações</TableHead>
                </TableRow>
              </TableHeader>
            
              <TableBody>
              {/* AIDEV-NOTE: Renderização das linhas com altura mínima para manter consistência */}
              {movements.map((movement) => {
                const isSelected = selectedMovements.includes(movement.id);
                const isExpanded = expandedRows.has(movement.id);
                const hasDifference = movement.difference && Math.abs(movement.difference) > 0.01;
                
                return (
                  <React.Fragment key={movement.id}>
                    <TableRow 
                      className={`
                        ${isSelected ? 'bg-blue-50' : ''}
                        ${hasDifference ? 'border-l-4 border-l-orange-400' : ''}
                        hover:bg-slate-50 transition-colors
                      `}
                    >
                      <TableCell className="sticky left-0 bg-white z-10 py-1 sm:py-2 text-center">
                        {onSelectionChange && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectMovement(movement.id, checked as boolean)}
                          />
                        )}
                      </TableCell>
                      
                      <TableCell className="py-1 sm:py-2 text-center">
                        {getSourceBadge(movement.source)}
                      </TableCell>
                      
                      <TableCell className="font-mono text-sm py-1 sm:py-2 text-left">
                        <div className="flex items-center gap-2">
                          {movement.externalId}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(movement.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      
                      {/* AIDEV-NOTE: Coluna Nosso Número - específica para ASAAS */}
                      <TableCell className="font-mono text-sm py-1 sm:py-2 text-left">
                        {movement.source === ReconciliationSource.ASAAS && movement.externalReference ? (
                          <span className="text-slate-700">{movement.externalReference}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      
                      {/* AIDEV-NOTE: Coluna Nome do Cliente - específica para ASAAS */}
                      <TableCell className="py-1 sm:py-2 text-left">
                        {movement.source === ReconciliationSource.ASAAS && movement.customerName ? (
                          <span className="text-slate-700 font-medium">{movement.customerName}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      
                      {/* AIDEV-NOTE: Coluna CNPJ/CPF - específica para ASAAS */}
                      <TableCell className="font-mono text-sm py-1 sm:py-2 text-left">
                        {movement.source === ReconciliationSource.ASAAS && movement.customerDocument ? (
                          <span className="text-slate-700">{movement.customerDocument}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      
                      {/* AIDEV-NOTE: Coluna Tipo de Cobrança - específica para ASAAS */}
                      <TableCell className="py-1 sm:py-2 text-center">
                        {movement.source === ReconciliationSource.ASAAS ? (
                          <Badge variant="outline" className="text-xs">
                            {movement.description?.includes('PIX') ? 'PIX' : 
                             movement.description?.includes('BOLETO') ? 'BOLETO' : 
                             movement.description?.includes('CARTAO') ? 'CARTÃO' : 'OUTROS'}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="py-1 sm:py-2 text-right">
                        {movement.chargeAmount ? formatCurrency(movement.chargeAmount) : '-'}
                      </TableCell>
                      
                      <TableCell className="font-semibold py-1 sm:py-2 text-right">
                        {formatCurrency(movement.paidAmount)}
                      </TableCell>
                      
                      <TableCell className="py-1 sm:py-2 text-right">
                        {movement.difference ? (
                          <span className={`font-semibold ${movement.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(movement.difference)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      
                      <TableCell className="py-1 sm:py-2 text-center">
                        {getStatusBadge(movement.reconciliationStatus)}
                      </TableCell>
                      
                      <TableCell className="py-1 sm:py-2 text-center">
                        {getPaymentStatusBadge(movement.paymentStatus)}
                      </TableCell>
                      
                      <TableCell className="py-1 sm:py-2 text-center">
                        {movement.hasContract ? (
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-mono">{movement.contractId}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">Sem contrato</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="py-1 sm:py-2 text-center">
                        {movement.dueDate ? formatDate(movement.dueDate) : '-'}
                      </TableCell>
                      
                      <TableCell className="py-1 sm:py-2 text-center">
                        {movement.paymentDate ? formatDate(movement.paymentDate) : '-'}
                      </TableCell>
                      
                      <TableCell className="sticky right-0 bg-white z-20 py-1 sm:py-2 text-center border-l border-slate-200">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {getActionButtons(movement).map((action, index) => {
                              const Icon = action.icon;
                              return (
                                <DropdownMenuItem
                                  key={action.type}
                                  onClick={() => onAction(action.type, movement)}
                                  disabled={action.disabled}
                                  className={`
                                    ${action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''}
                                  `}
                                >
                                  <Icon className="h-4 w-4 mr-2" />
                                  {action.label}
                                </DropdownMenuItem>
                              );
                            })}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            
                            {/* AIDEV-NOTE: Opção específica para detalhes ASAAS */}
                            {movement.source === ReconciliationSource.ASAAS && (
                              <DropdownMenuItem 
                                onClick={() => handleViewAsaasDetails(movement)}
                                className="flex items-center gap-2 text-blue-600"
                              >
                                <img src="/logos/Integrações/asaas.png" alt="Asaas" className="w-4 h-4" />
                                Detalhes ASAAS
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Row Details */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50">
                        <TableCell colSpan={13} className="py-2 sm:py-3">
                          <div className="p-3 space-y-2">
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
                                    <p>{movement.description?.includes('PIX') ? 'PIX' : 
                                       movement.description?.includes('BOLETO') ? 'BOLETO' : 
                                       movement.description?.includes('CARTAO') ? 'CARTÃO' : 'OUTROS'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
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
                    )}
                  </React.Fragment>
                );
              })}
              
              {/* AIDEV-NOTE: Linhas vazias para manter altura consistente quando há poucos dados - ajustado para 8 linhas */}
              {movements.length < 8 && Array.from({ length: 8 - movements.length }).map((_, index) => (
                <TableRow key={`empty-${index}`} className="h-11">
                  <TableCell colSpan={16} className="py-2">
                    {/* Linha vazia - apenas espaço em branco */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </div>
        
        {/* AIDEV-NOTE: Rodapé com paginação e contador de itens */}
        {pagination && (
          <div className="flex items-center justify-between p-4 border-t bg-slate-50/50 rounded-b-lg">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600 font-medium">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} movimentações
              </div>
              
              {/* Seletor de itens por página */}
              {pagination.onLimitChange && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Itens por página:</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) => pagination.onLimitChange!(Number(e.target.value))}
                    className="text-sm border border-slate-200 rounded px-2 py-1 bg-white"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="h-8"
              >
                Anterior
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.limit)) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={page === pagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => pagination.onPageChange(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                className="h-8"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* AIDEV-NOTE: Modal de detalhes ASAAS */}
      <AsaasDetailsModal
        isOpen={asaasDetailsModal.isOpen}
        onClose={handleCloseAsaasDetails}
        movement={asaasDetailsModal.movement}
      />
    </Card>
  );
};

export default ReconciliationTable;
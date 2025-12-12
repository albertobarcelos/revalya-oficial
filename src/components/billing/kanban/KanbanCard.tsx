// AIDEV-NOTE: Card de contrato dentro do Kanban de Faturamento
// Design clean: fundo branco, bordas discretas, menos sombra e sem gradientes
// Cada card representa uma "Ordem de Faturamento" (período de faturamento)

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DollarSign,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Inbox,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColumnAccentClasses, CARD_STYLES } from '@/utils/billing/kanbanColumnConfig';
import type { KanbanCardProps } from '@/types/billing/kanban.types';

// AIDEV-NOTE: Regex para validação de UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valida se uma string é um UUID válido
 * @param id - String a ser validada
 * @returns true se for um UUID válido
 */
const isValidUUID = (id: string | undefined | null): boolean => {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id);
};

/**
 * KanbanCard
 * Card de contrato dentro do Kanban.
 * Ajustado para um design clean: fundo branco, bordas discretas, menos sombra e sem gradientes.
 */
export function KanbanCard({
  contract,
  columnId,
  onViewDetails,
  isSelected = false,
  onSelectionChange,
  showCheckbox = false,
}: KanbanCardProps) {
  const [isClicking, setIsClicking] = useState(false);
  const isPending = contract.status === 'Faturamento Pendente';
  const isFaturarHoje = columnId === 'faturar-hoje';
  const isFaturados = columnId === 'faturados';
  const isRenovar = columnId === 'renovar';

  const accents = getColumnAccentClasses(columnId);

  // AIDEV-NOTE: Usar period_id (alias) ou id - ambos representam o ID do período de faturamento
  const periodId = contract.period_id || contract.id;

  // AIDEV-NOTE: Validação do periodId usando useMemo para evitar recálculos
  const isValidPeriodId = useMemo(() => isValidUUID(periodId), [periodId]);

  // AIDEV-NOTE: Label acessível para o botão
  const buttonAriaLabel = useMemo(() => {
    const customerName = contract.customer_name || 'Cliente';
    const orderType = contract.is_standalone ? 'faturamento avulso' : 'ordem de faturamento';
    return `Ver detalhes da ${orderType} de ${customerName}`;
  }, [contract.customer_name, contract.is_standalone]);

  // AIDEV-NOTE: Função para abrir modal de detalhes da ordem de faturamento
  // Usa period_id que é o ID do contract_billing_periods ou standalone_billing_periods
  const handleViewDetails = useCallback(async () => {
    // Previne múltiplos cliques
    if (isClicking) return;

    // AIDEV-NOTE: Validação CAMADA 1 - Verificar se periodId existe
    if (!periodId) {
      console.error('❌ [KANBAN CARD] periodId está vazio ou undefined');
      return;
    }

    // AIDEV-NOTE: Validação CAMADA 2 - Verificar formato UUID válido
    if (!isValidPeriodId) {
      console.error('❌ [KANBAN CARD] periodId não é um UUID válido:', periodId);
      return;
    }

    // AIDEV-NOTE: Log para debugging com nomenclatura clara
    console.log('🔍 [KANBAN CARD] Abrindo detalhes:', {
      periodId,
      contractId: contract.contract_id,
      isStandalone: contract.is_standalone,
      customerName: contract.customer_name,
    });

    setIsClicking(true);
    try {
      // AIDEV-NOTE: Passar isStandalone para evitar busca desnecessária em ambas as tabelas
      onViewDetails(periodId, contract.is_standalone);
    } finally {
      // Reset após um pequeno delay para evitar cliques duplicados
      setTimeout(() => setIsClicking(false), 500);
    }
  }, [isClicking, onViewDetails, periodId, isValidPeriodId, contract.contract_id, contract.is_standalone, contract.customer_name]);

  // AIDEV-NOTE: Função para lidar com mudança de seleção do checkbox
  const handleSelectionChange = useCallback(
    (checked: boolean) => {
      if (onSelectionChange && periodId) {
        onSelectionChange(periodId, checked);
      }
    },
    [onSelectionChange, periodId]
  );

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-150',
        'bg-white border-gray-100',
        'hover:border-gray-200',
        isSelected && 'ring-1 ring-primary/50 border-primary/50'
      )}
    >
      {/* Barra sutil de acento de cor indicando a coluna (2px) */}
      <div className={cn('absolute left-0 top-0 h-full w-[2px]', accents.bar)} aria-hidden="true" />
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header com checkbox integrado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* AIDEV-NOTE: Checkbox fixo para seleção (apenas coluna faturar-hoje) */}
              {showCheckbox && (
                <Checkbox
                  id={`select-${periodId}`}
                  checked={isSelected}
                  onCheckedChange={handleSelectionChange}
                  onClick={(e) => e.stopPropagation()}
                  className="h-3.5 w-3.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              )}
              {/* AIDEV-NOTE: Indicador de avulso minimalista */}
              {!contract.contract_id && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  Avulso
                </span>
              )}
              <span className={cn('font-semibold text-xs', CARD_STYLES.textPrimary)}>
                {contract.order_number
                  ? `OS ${contract.order_number}`
                  : contract.contract_id
                    ? `#${contract.contract_id.slice(-8)}`
                    : contract.contract_number || ''}
              </span>
            </div>
            {/* Badge de status — discreto, somente ícone com tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn('p-1 rounded-full', accents.badge)}
                    title={contract.status}
                    aria-label={`Status: ${contract.status}`}
                  >
                    {isFaturarHoje && <Clock className="w-3 h-3" />}
                    {isPending && <AlertCircle className="w-3 h-3" />}
                    {isFaturados && <CheckCircle2 className="w-3 h-3" />}
                    {isRenovar && <RotateCcw className="w-3 h-3" />}
                    {!isFaturarHoje && !isPending && !isFaturados && !isRenovar && (
                      <Inbox className="w-3 h-3" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {contract.status}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Cliente e Valor em layout compacto */}
          <div className="flex items-center justify-between">
            <p className={cn('text-sm font-medium leading-tight truncate max-w-[140px]', CARD_STYLES.textSecondary)}>
              {contract.customer_name}
            </p>
            <span className={cn('text-sm font-semibold tabular-nums', CARD_STYLES.textPrimary)}>
              R$ {(contract.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* AIDEV-NOTE: Botão de ação minimalista */}
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              'w-full mt-2 h-8 text-xs font-medium transition-colors',
              'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              'focus-visible:ring-1 focus-visible:ring-primary',
              !isValidPeriodId && 'opacity-50 cursor-not-allowed'
            )}
            disabled={isClicking || !isValidPeriodId}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleViewDetails();
            }}
            aria-label={buttonAriaLabel}
            aria-busy={isClicking}
            aria-disabled={!isValidPeriodId}
          >
            {isClicking ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1.5" aria-hidden="true" />
                Ver Detalhes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default KanbanCard;

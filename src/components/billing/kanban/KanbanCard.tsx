// AIDEV-NOTE: Card de contrato dentro do Kanban de Faturamento
// Design clean: fundo branco, bordas discretas, menos sombra e sem gradientes

import { useState, useCallback } from 'react';
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
  Sparkles,
  Clock,
  CheckCircle2,
  Inbox,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColumnAccentClasses, CARD_STYLES } from '@/utils/billing/kanbanColumnConfig';
import type { KanbanCardProps } from '@/types/billing/kanban.types';

/**
 * KanbanCard
 * Card de contrato dentro do Kanban.
 * Ajustado para um design clean: fundo branco, bordas discretas, menos sombra e sem gradientes.
 */
export function KanbanCard({
  contract,
  isDragging,
  columnId,
  onViewDetails,
  dragHandleProps,
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

  // AIDEV-NOTE: Função para abrir modal de detalhes da ordem de faturamento
  // Agora passa period_id (contract.id) ao invés de contract_id
  const handleViewDetails = useCallback(async () => {
    if (isClicking) return;

    // AIDEV-NOTE: Validação para garantir que contract.id existe
    if (!contract.id) {
      console.error('❌ [KANBAN CARD] contract.id está vazio ou undefined');
      return;
    }

    // AIDEV-NOTE: contract.id é o period_id (id do contract_billing_periods)
    setIsClicking(true);
    try {
      onViewDetails(contract.id);
    } finally {
      // Reset após um pequeno delay
      setTimeout(() => setIsClicking(false), 500);
    }
  }, [isClicking, onViewDetails, contract.id]);

  // AIDEV-NOTE: Função para lidar com mudança de seleção do checkbox
  const handleSelectionChange = useCallback(
    (checked: boolean) => {
      if (onSelectionChange) {
        onSelectionChange(contract.id, checked);
      }
    },
    [onSelectionChange, contract.id]
  );

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200 ease-out',
        'hover:shadow-sm',
        'bg-white',
        CARD_STYLES.border,
        isDragging && 'opacity-60',
        isSelected && 'ring-1 ring-primary ring-offset-1 border-primary'
      )}
    >
      {/* Barra sutil de acento de cor indicando a coluna (2px) */}
      <div className={cn('absolute left-0 top-0 h-full w-[2px]', accents.bar)} aria-hidden="true" />
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Checkbox de seleção */}
          {showCheckbox && (
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
              <Checkbox
                id={`select-${contract.contract_id}`}
                checked={isSelected}
                onCheckedChange={handleSelectionChange}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor={`select-${contract.contract_id}`}
                className="text-xs text-gray-600 cursor-pointer font-medium"
              >
                Faturar
              </label>
            </div>
          )}

          {/* AIDEV-NOTE: Badge para faturamentos avulsos */}
          {!contract.contract_id && (
            <div className="mb-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">
                Avulso
              </Badge>
            </div>
          )}

          {/* Header com drag handle */}
          <div
            className={cn(
              'flex items-center justify-between cursor-grab active:cursor-grabbing',
              'group-hover:cursor-grab',
              dragHandleProps && 'select-none'
            )}
            {...(dragHandleProps || {})}
          >
            <div className="flex items-center space-x-2">
              <span className={cn('font-semibold text-xs', CARD_STYLES.textPrimary)}>
                {contract.contract_id
                  ? `#${contract.contract_id.slice(-8)}`
                  : contract.contract_number || 'Avulso'}
              </span>
            </div>
            {/* Badge de status — agora discreto, somente ícone com tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className={cn('p-1.5 rounded-full border', accents.badge)}
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
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {contract.status}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Cliente */}
          <div className="space-y-1">
            <p className={cn('text-sm font-medium leading-tight', CARD_STYLES.textSecondary)}>
              {contract.customer_name}
            </p>
          </div>

          {/* Valor */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-1">
              <DollarSign className={cn('w-4 h-4', CARD_STYLES.textPrimary)} />
              <span className={cn('text-base font-semibold', CARD_STYLES.textPrimary)}>
                R$ {(contract.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Botão de ação */}
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              'w-full mt-3 font-medium transition-all duration-200',
              'hover:bg-gray-50',
              CARD_STYLES.textPrimary
            )}
            disabled={isClicking}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleViewDetails();
            }}
          >
            {isClicking ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-2" />
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

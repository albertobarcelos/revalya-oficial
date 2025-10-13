// AIDEV-NOTE: Componente ActionButtons - Centraliza a lógica dos botões de ação da tabela de reconciliação
// Responsabilidades:
// 1. Renderizar dropdown menu com ações disponíveis
// 2. Gerenciar estado de habilitação/desabilitação das ações
// 3. Fornecer ações específicas por fonte (ASAAS)
// 4. Manter consistência visual e de UX

import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Eye, 
  MoreHorizontal, 
  CheckCircle2, 
  CheckCircle, 
  ExternalLink,
  Link,
  Plus,
  RefreshCw,
  UserPlus,
  Trash2
} from 'lucide-react';

import { ActionButtonsProps } from '../types/table-parts';
import { ReconciliationSource, ReconciliationAction } from '@/types/reconciliation';
import { ReconciliationStatus } from '@/types/reconciliation';

interface ActionButton {
  type: ReconciliationAction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  disabled: boolean;
}

interface ActionButtonsExtendedProps extends ActionButtonsProps {
  onViewAsaasDetails?: (movement: any) => void;
}

export function ActionButtons({ 
  movement, 
  onAction, 
  onViewAsaasDetails 
}: ActionButtonsExtendedProps) {
  
  // AIDEV-NOTE: Função para gerar botões de ação baseado no movimento
  const getActionButtons = (movement: any): ActionButton[] => {
    const actions: ActionButton[] = [
      {
        type: ReconciliationAction.IMPORT_TO_CHARGE,
        label: 'Importar para Cobranças',
        icon: CheckCircle2,
        variant: 'default',
        disabled: movement.reconciliationStatus === ReconciliationStatus.RECONCILED
      },
      {
        type: ReconciliationAction.LINK_TO_CONTRACT,
        label: 'Vincular a Contrato',
        icon: Link,
        variant: 'secondary',
        disabled: movement.reconciliationStatus === ReconciliationStatus.RECONCILED
      },
      {
        type: ReconciliationAction.CREATE_STANDALONE,
        label: 'Criar Cobrança Avulsa',
        icon: Plus,
        variant: 'outline',
        disabled: movement.reconciliationStatus === ReconciliationStatus.RECONCILED
      },
      {
        type: ReconciliationAction.COMPLEMENT_EXISTING,
        label: 'Complementar Existente',
        icon: RefreshCw,
        variant: 'outline',
        disabled: movement.reconciliationStatus === ReconciliationStatus.RECONCILED || !movement.chargeId
      },
      {
        type: ReconciliationAction.REGISTER_CUSTOMER,
        label: 'Cadastrar Cliente',
        icon: UserPlus,
        variant: 'outline',
        disabled: movement.reconciliationStatus === ReconciliationStatus.RECONCILED
      },
      {
        type: ReconciliationAction.DELETE_IMPORTED,
        label: 'Excluir Item',
        icon: Trash2,
        variant: 'destructive',
        disabled: false
      }
    ];

    return actions;
  };

  const actionButtons = getActionButtons(movement);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {actionButtons.map((action, index) => {
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
        {movement.source === ReconciliationSource.ASAAS && onViewAsaasDetails && (
          <DropdownMenuItem 
            onClick={() => onViewAsaasDetails(movement)}
            className="flex items-center gap-2 text-blue-600"
          >
            <img src="/logos/Integrações/asaas.png" alt="Asaas" className="w-4 h-4" />
            Detalhes ASAAS
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ActionButtons;
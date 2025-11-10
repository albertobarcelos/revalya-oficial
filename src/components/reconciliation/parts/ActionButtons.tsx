// AIDEV-NOTE: Componente ActionButtons - Centraliza a lógica dos botões de ação da tabela de reconciliação
// Responsabilidades:
// 1. Renderizar dropdown menu com ações disponíveis
// 2. Gerenciar estado de habilitação/desabilitação das ações
// 3. Fornecer ações específicas por fonte (ASAAS)
// 4. Manter consistência visual e de UX

import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
    // AIDEV-NOTE: Verificar se já tem contrato vinculado
    // Prioridade: contrato_id (campo direto) > hasContract (campo computado) > contractId (alias)
    const hasContractLinked = !!(
      movement.contrato_id || 
      movement.contractId || 
      movement.hasContract ||
      (movement.contracts && movement.contracts.id)
    );
    
    // AIDEV-NOTE: Debug log para verificar valores (sempre logar para debug)
    console.log('🔍 [ACTION_BUTTONS] Verificando movimento:', {
      movementId: movement.id,
      contrato_id: movement.contrato_id,
      contractId: movement.contractId,
      hasContract: movement.hasContract,
      contracts: movement.contracts,
      reconciliationStatus: movement.reconciliationStatus,
      hasContractLinked
    });
    
    const actions: ActionButton[] = [
      {
        type: ReconciliationAction.IMPORT_TO_CHARGE,
        label: 'Importar para Cobranças',
        icon: CheckCircle2,
        variant: 'default',
        // AIDEV-NOTE: Bloquear apenas se já foi importado (chargeId) - NÃO bloquear por status RECONCILED
        disabled: !!movement.chargeId
      },
      {
        type: ReconciliationAction.LINK_TO_CONTRACT,
        label: 'Vincular a Contrato',
        icon: Link,
        variant: 'secondary',
        // AIDEV-NOTE: Bloquear APENAS quando já tem contrato vinculado (independente do status)
        disabled: hasContractLinked
      },
      {
        type: ReconciliationAction.CREATE_STANDALONE,
        label: 'Criar Cobrança Avulsa',
        icon: Plus,
        variant: 'outline',
        // AIDEV-NOTE: Não bloquear por contrato vinculado ou status RECONCILED
        disabled: false
      },
      {
        type: ReconciliationAction.COMPLEMENT_EXISTING,
        label: 'Complementar Existente',
        icon: RefreshCw,
        variant: 'outline',
        // AIDEV-NOTE: Bloquear apenas se não tiver chargeId - NÃO bloquear por status RECONCILED
        disabled: !movement.chargeId
      },
      {
        type: ReconciliationAction.REGISTER_CUSTOMER,
        label: 'Cadastrar Cliente',
        icon: UserPlus,
        variant: 'outline',
        // AIDEV-NOTE: Não bloquear por contrato vinculado ou status RECONCILED
        disabled: false
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
            action.type === ReconciliationAction.IMPORT_TO_CHARGE ? (
              <TooltipProvider key={action.type}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={() => onAction(movement, action.type)}
                      disabled={action.disabled}
                      className={`
                        ${action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''}
                      `}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    {action.disabled ? 
                      "Esta movimentação já foi importada para cobrança" : 
                      "Importar esta movimentação para cobranças"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <DropdownMenuItem
                key={action.type}
                onClick={() => onAction(movement, action.type)}
                disabled={action.disabled}
                className={`
                  ${action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''}
                `}
              >
                <Icon className="h-4 w-4 mr-2" />
                {action.label}
              </DropdownMenuItem>
            )
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
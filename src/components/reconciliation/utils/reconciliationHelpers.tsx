// =====================================================
// RECONCILIATION HELPERS
// Descrição: Funções auxiliares para a tabela de conciliação
// =====================================================

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Link, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { 
  ImportedMovement, 
  ReconciliationAction, 
  ReconciliationStatus, 
  ReconciliationSource 
} from '@/types/reconciliation';

// AIDEV-NOTE: Formatação de data padrão brasileiro
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

// AIDEV-NOTE: Configuração de badges por fonte de dados
export const getSourceBadge = (source: ReconciliationSource) => {
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
  
  // AIDEV-NOTE: Verificação de segurança para evitar erro quando source não está mapeado
  if (!config) {
    console.warn(`ReconciliationSource não mapeado: ${source}`);
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-800">
        {source || 'Desconhecido'}
      </Badge>
    );
  }
  
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

// AIDEV-NOTE: Função para obter ações disponíveis por movimento
export const getAvailableActions = (movement: ImportedMovement) => {
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

// AIDEV-NOTE: Configuração completa de botões de ação
export const getActionButtons = (movement: ImportedMovement) => {
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
      type: ReconciliationAction.REGISTER_CUSTOMER,
      label: 'Cadastrar Cliente',
      icon: UserPlus,
      variant: 'outline' as const,
      disabled: movement.reconciliationStatus === ReconciliationStatus.RECONCILED
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

// AIDEV-NOTE: Handlers para seleção de movimentos
export const createSelectionHandlers = (
  movements: ImportedMovement[],
  selectedMovements: string[],
  onSelectionChange?: (selected: string[]) => void
) => {
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

  return { handleSelectAll, handleSelectMovement };
};
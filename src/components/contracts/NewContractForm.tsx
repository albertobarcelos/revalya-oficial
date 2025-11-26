import { useMemo } from "react";
import { ContractForm } from "./ContractForm";
import { ContractFormConfig } from "./types/ContractFormConfig";

/**
 * AIDEV-NOTE: Interface de props do NewContractForm (compatibilidade com código existente)
 * Este componente é um wrapper de compatibilidade que mapeia as props antigas
 * para a nova configuração do ContractForm
 */
interface NewContractFormProps {
  mode?: "create" | "edit" | "view";
  contractId?: string;
  onSuccess: (contractId: string) => void;
  onCancel: () => void;
  onFormChange?: (hasChanges: boolean) => void;
  onEditRequest?: (contractId: string) => void;
  forceRefreshContracts?: () => Promise<void>;
  isModal?: boolean; // AIDEV-NOTE: Controla se está sendo usado em modal ou tela cheia
  fromBilling?: boolean; // AIDEV-NOTE: Indica se o modal foi aberto a partir do kanban de faturamento
}

/**
 * AIDEV-NOTE: NewContractForm - Wrapper de Compatibilidade
 * 
 * Este componente mantém 100% de compatibilidade com o código existente,
 * mapeando as props antigas para a nova configuração do ContractForm.
 * 
 * @deprecated Em favor de usar ContractForm diretamente com configuração
 * Este componente será mantido para compatibilidade, mas novos usos devem
 * preferir ContractForm ou os componentes de contexto específico.
 */
export function NewContractForm({ 
  mode = "create", 
  contractId, 
  onSuccess, 
  onCancel, 
  onFormChange, 
  onEditRequest, 
  forceRefreshContracts, 
  isModal = false, 
  fromBilling = false 
}: NewContractFormProps) {
  // AIDEV-NOTE: Mapear props antigas para nova configuração
  const config: ContractFormConfig = useMemo(() => {
    // Determinar contexto baseado nas props
    const context = fromBilling ? 'billing' : 'contracts';
    
    const callbacks: ContractFormConfig['callbacks'] = {
      onSuccess,
      onCancel,
    };

    // AIDEV-NOTE: Adicionar callbacks opcionais apenas se estiverem definidos
    if (onFormChange) {
      callbacks.onFormChange = onFormChange;
    }
    if (onEditRequest) {
      callbacks.onEditRequest = onEditRequest;
    }

    const baseConfig: ContractFormConfig = {
      mode,
      context,
      enabledTabs: {
        // Por padrão, todas as abas estão habilitadas
        // O contexto 'billing' pode ter algumas desabilitadas via defaultBillingConfig
        servico: true,
        produtos: true,
        descontos: true,
        departamentos: true,
        observacoes: true,
        impostos: true,
        recebimentos: true,
      },
      callbacks,
      layout: {
        isModal,
        fullScreen: !isModal,
        showSidebar: true,
        showHeader: true,
      },
      fromBilling,
    };

    // AIDEV-NOTE: Adicionar contractId apenas se estiver definido
    if (contractId) {
      baseConfig.contractId = contractId;
    }

    // AIDEV-NOTE: Adicionar forceRefreshContracts apenas se estiver definido
    if (forceRefreshContracts) {
      baseConfig.forceRefreshContracts = forceRefreshContracts;
    }

    return baseConfig;
  }, [
    mode,
    contractId,
    onSuccess,
    onCancel,
    onFormChange,
    onEditRequest,
    forceRefreshContracts,
    isModal,
    fromBilling,
  ]);

  return <ContractForm config={config} />;
}

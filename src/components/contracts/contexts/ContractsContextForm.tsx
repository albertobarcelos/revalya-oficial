import React, { useMemo } from 'react';
import { ContractForm } from '../ContractForm';
import { ContractFormConfig, defaultContractsConfig, mergeConfig } from '../types/ContractFormConfig';

/**
 * AIDEV-NOTE: Props do formulário de contrato para contexto de contratos
 */
interface ContractsContextFormProps {
  mode?: 'create' | 'edit' | 'view';
  contractId?: string;
  onSuccess?: (contractId: string) => void;
  onCancel?: () => void;
  onFormChange?: (hasChanges: boolean) => void;
  onEditRequest?: (contractId: string) => void;
  forceRefreshContracts?: () => Promise<void>;
  isModal?: boolean;
  enabledTabs?: ContractFormConfig['enabledTabs'];
  labels?: ContractFormConfig['labels'];
}

/**
 * AIDEV-NOTE: Formulário de contrato específico para o contexto de contratos
 * 
 * Este componente pré-configura o ContractForm com as opções padrão
 * para uso na tela de contratos, mas permite customização via props.
 * 
 * @example
 * ```tsx
 * <ContractsContextForm
 *   mode="create"
 *   onSuccess={handleSuccess}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function ContractsContextForm({
  mode = 'create',
  contractId,
  onSuccess,
  onCancel,
  onFormChange,
  onEditRequest,
  forceRefreshContracts,
  isModal = false,
  enabledTabs,
  labels,
}: ContractsContextFormProps) {
  const config: ContractFormConfig = useMemo(() => {
    const customConfig: ContractFormConfig = {
      mode,
      context: 'contracts',
      contractId,
      enabledTabs,
      labels,
      callbacks: {
        onSuccess,
        onCancel,
        onFormChange,
        onEditRequest,
      },
      layout: {
        isModal,
        fullScreen: !isModal,
        showSidebar: true,
        showHeader: true,
      },
      forceRefreshContracts,
    };

    return mergeConfig(customConfig, defaultContractsConfig);
  }, [
    mode,
    contractId,
    onSuccess,
    onCancel,
    onFormChange,
    onEditRequest,
    forceRefreshContracts,
    isModal,
    enabledTabs,
    labels,
  ]);

  return <ContractForm config={config} />;
}


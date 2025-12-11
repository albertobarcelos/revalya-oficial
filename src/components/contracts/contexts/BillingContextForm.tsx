import React, { useMemo } from 'react';
import { ContractForm } from '../ContractForm';
import { ContractFormConfig, defaultBillingConfig, mergeConfig } from '../types/ContractFormConfig';

/**
 * AIDEV-NOTE: Props do formulário de contrato para contexto de faturamento
 */
interface BillingContextFormProps {
  mode?: 'create' | 'edit' | 'view';
  contractId?: string;
  onSuccess?: (contractId: string) => void;
  onCancel?: () => void;
  onFormChange?: (hasChanges: boolean) => void;
  onEditRequest?: (contractId: string) => void;
  forceRefreshContracts?: () => Promise<void>;
  enabledTabs?: ContractFormConfig['enabledTabs'];
  labels?: ContractFormConfig['labels'];
}

/**
 * AIDEV-NOTE: Formulário de contrato específico para o contexto de faturamento
 * 
 * Este componente pré-configura o ContractForm com as opções padrão
 * para uso no kanban de faturamento, otimizado para criação rápida de contratos.
 * 
 * Por padrão, algumas abas são desabilitadas (departamentos, impostos, recebimentos)
 * para simplificar o fluxo de criação no contexto de faturamento.
 * 
 * @example
 * ```tsx
 * <BillingContextForm
 *   mode="create"
 *   onSuccess={handleSuccess}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function BillingContextForm({
  mode = 'create',
  contractId,
  onSuccess,
  onCancel,
  onFormChange,
  onEditRequest,
  forceRefreshContracts,
  enabledTabs,
  labels,
}: BillingContextFormProps) {
  const config: ContractFormConfig = useMemo(() => {
    const customConfig: ContractFormConfig = {
      mode,
      context: 'billing',
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
        isModal: true, // Sempre modal no contexto de faturamento
        fullScreen: false,
        showSidebar: true,
        showHeader: true,
      },
      fromBilling: true,
      forceRefreshContracts,
    };

    return mergeConfig(customConfig, defaultBillingConfig);
  }, [
    mode,
    contractId,
    onSuccess,
    onCancel,
    onFormChange,
    onEditRequest,
    forceRefreshContracts,
    enabledTabs,
    labels,
  ]);

  return <ContractForm config={config} />;
}


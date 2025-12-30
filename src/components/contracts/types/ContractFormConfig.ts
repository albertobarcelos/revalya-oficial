import { z } from 'zod';
import { ContractFormValues, contractFormSchema } from '../schema/ContractFormSchema';

/**
 * AIDEV-NOTE: Configuração de abas/seções do formulário de contrato
 * Permite habilitar ou desabilitar seções específicas do formulário
 */
export interface EnabledTabsConfig {
  /** Aba de serviços */
  servico?: boolean;
  /** Aba de produtos */
  produtos?: boolean;
  /** Aba de descontos */
  descontos?: boolean;
  /** Aba de departamentos */
  departamentos?: boolean;
  /** Aba de observações */
  observacoes?: boolean;
  /** Aba de impostos */
  impostos?: boolean;
  /** Aba de recebimentos/histórico */
  recebimentos?: boolean;
  /** Aba de configurações fiscais */
  fiscal?: boolean;
}

/**
 * AIDEV-NOTE: Configuração de labels customizáveis
 * Permite personalizar textos exibidos no formulário
 */
export interface LabelsConfig {
  /** Título do formulário */
  title?: string;
  /** Subtítulo do formulário (exibido abaixo do título no header) */
  subtitle?: string;
  /** Texto do botão de submit */
  submitButton?: string;
  /** Texto do botão de cancelar */
  cancelButton?: string;
  /** Labels customizados para as abas */
  tabs?: Record<string, string>;
  /** Labels customizados para campos específicos */
  fields?: {
    /** Label customizado para o campo "Nº do Contrato" */
    contractNumber?: string;
    /** Label customizado para o campo "Dia de Faturamento" */
    billingDay?: string;
  };
  /** Se deve usar calendário para "Previsão de Faturamento" em vez de campo numérico */
  useBillingDatePicker?: boolean;
}

/**
 * AIDEV-NOTE: Callbacks customizáveis do formulário
 * Permite definir ações específicas para cada contexto
 */
export interface CallbacksConfig {
  /** Callback chamado quando o contrato é salvo com sucesso */
  onSuccess?: (contractId: string) => void;
  /** Callback chamado quando o formulário é cancelado */
  onCancel?: () => void;
  /** Callback chamado quando é solicitada edição (modo view) */
  onEditRequest?: (contractId: string) => void;
  /** Callback chamado quando há mudanças no formulário */
  onFormChange?: (hasChanges: boolean) => void;
}

/**
 * AIDEV-NOTE: Configuração de layout do formulário
 * Controla como o formulário é exibido (modal, tela cheia, etc.)
 */
export interface LayoutConfig {
  /** Se o formulário está sendo usado em um modal */
  isModal?: boolean;
  /** Se o formulário deve ocupar tela cheia */
  fullScreen?: boolean;
  /** Se deve exibir a sidebar de navegação */
  showSidebar?: boolean;
  /** Se deve exibir o header do formulário */
  showHeader?: boolean;
  /** Se deve ocultar os campos de vigência (Vigência Inicial e Vigência Final) */
  hideVigenceFields?: boolean;
}

/**
 * AIDEV-NOTE: Configuração principal do formulário de contrato
 * Define como o formulário deve se comportar e ser exibido
 */
export interface ContractFormConfig {
  /** Modo de operação do formulário */
  mode: 'create' | 'edit' | 'view';
  
  /** Contexto de uso do formulário */
  context?: 'contracts' | 'billing' | 'custom';
  
  /** ID do contrato (obrigatório para modo edit/view) */
  contractId?: string;
  
  /** Abas/seções habilitadas */
  enabledTabs?: EnabledTabsConfig;
  
  /** Customização de labels */
  labels?: LabelsConfig;
  
  /** Callbacks customizáveis */
  callbacks?: CallbacksConfig;
  
  /** Configuração de layout */
  layout?: LayoutConfig;
  
  /** Dados pré-carregados (opcional) */
  initialData?: Partial<ContractFormValues>;
  
  /** Schema de validação customizado (opcional) */
  validationSchema?: z.ZodSchema;
  
  /** Se o formulário foi aberto a partir do kanban de faturamento */
  fromBilling?: boolean;
  
  /** Função para verificar se um campo está carregando */
  isFieldLoading?: (fieldName: string) => boolean;
  
  /** Função para forçar refresh da lista de contratos */
  forceRefreshContracts?: () => Promise<void>;
}

/**
 * AIDEV-NOTE: Configuração padrão para o contexto de contratos
 */
export const defaultContractsConfig: Partial<ContractFormConfig> = {
  context: 'contracts',
  enabledTabs: {
    servico: true,
    produtos: true,
    descontos: true,
    departamentos: true,
    observacoes: true,
    impostos: true,
    recebimentos: true,
  },
  layout: {
    isModal: false,
    fullScreen: true,
    showSidebar: true,
    showHeader: true,
  },
  labels: {
    title: 'Novo Contrato',
    submitButton: 'Salvar',
    cancelButton: 'Cancelar',
  },
};

/**
 * AIDEV-NOTE: Configuração padrão para o contexto de faturamento
 */
export const defaultBillingConfig: Partial<ContractFormConfig> = {
  context: 'billing',
  enabledTabs: {
    servico: true,
    produtos: true,
    descontos: true,
    departamentos: false,
    observacoes: true,
    impostos: false,
    recebimentos: false,
  },
  layout: {
    isModal: true,
    fullScreen: false,
    showSidebar: true,
    showHeader: true,
  },
  labels: {
    title: 'Criar Contrato',
    submitButton: 'Criar',
    cancelButton: 'Cancelar',
  },
  fromBilling: true,
};

/**
 * AIDEV-NOTE: Merge de configurações com valores padrão
 * Combina configuração customizada com valores padrão do contexto
 */
export function mergeConfig(
  customConfig: ContractFormConfig,
  defaultConfig?: Partial<ContractFormConfig>
): ContractFormConfig {
  const merged: ContractFormConfig = {
    ...defaultConfig,
    ...customConfig,
    enabledTabs: {
      ...defaultConfig?.enabledTabs,
      ...customConfig.enabledTabs,
    },
    labels: {
      ...defaultConfig?.labels,
      ...customConfig.labels,
    },
    callbacks: {
      ...defaultConfig?.callbacks,
      ...customConfig.callbacks,
    },
    layout: {
      ...defaultConfig?.layout,
      ...customConfig.layout,
    },
  };
  
  return merged;
}


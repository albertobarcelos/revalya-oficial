import { useState, useCallback, useMemo, useEffect } from 'react';
import { ContractFormConfig, EnabledTabsConfig } from '../types/ContractFormConfig';

/**
 * AIDEV-NOTE: Hook para gerenciar lógica de negócio do formulário de contrato
 * Extrai toda a lógica de gerenciamento de abas, validações e estados internos
 */
export function useContractFormLogic(config: ContractFormConfig) {
  // AIDEV-NOTE: Estado da aba ativa - inicializa com a primeira aba habilitada
  const getInitialTab = useCallback(() => {
    const enabledTabs = config.enabledTabs || {};
    
    // AIDEV-NOTE: Ordem de prioridade para seleção da aba inicial
    // Abas "descontos" e "impostos" removidas
    const tabPriority = [
      'servico',
      'produtos',
      'departamentos',
      'observacoes',
      'recebimentos'
    ];
    
    // Retorna a primeira aba habilitada na ordem de prioridade
    for (const tab of tabPriority) {
      if (enabledTabs[tab as keyof EnabledTabsConfig] !== false) {
        return tab;
      }
    }
    
    // Fallback: retorna 'servico' se nenhuma aba estiver explicitamente desabilitada
    return 'servico';
  }, [config.enabledTabs]);

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  // AIDEV-NOTE: Atualizar aba ativa quando a configuração mudar
  useEffect(() => {
    const initialTab = getInitialTab();
    setActiveTab(initialTab);
  }, [getInitialTab]);

  /**
   * AIDEV-NOTE: Verifica se uma aba está habilitada
   */
  const isTabEnabled = useCallback((tabName: string): boolean => {
    const enabledTabs = config.enabledTabs || {};
    const tabKey = tabName as keyof EnabledTabsConfig;
    
    // Se não há configuração específica, assume que está habilitada
    if (enabledTabs[tabKey] === undefined) {
      return true;
    }
    
    return enabledTabs[tabKey] === true;
  }, [config.enabledTabs]);

  /**
   * AIDEV-NOTE: Lista de abas habilitadas
   * Abas "descontos" e "impostos" removidas
   */
  const enabledTabsList = useMemo(() => {
    const tabs = [
      { id: 'servico', label: 'Serviço' },
      { id: 'produtos', label: 'Produtos' },
      { id: 'departamentos', label: 'Depto' },
      { id: 'observacoes', label: 'Notas' },
      { id: 'recebimentos', label: 'Historico' }
    ];
    
    return tabs.filter(tab => isTabEnabled(tab.id));
  }, [isTabEnabled]);

  /**
   * AIDEV-NOTE: Navega para uma aba específica (com validação)
   */
  const navigateToTab = useCallback((tabName: string) => {
    if (isTabEnabled(tabName)) {
      setActiveTab(tabName);
    } else {
      console.warn(`[ContractFormLogic] Tentativa de navegar para aba desabilitada: ${tabName}`);
    }
  }, [isTabEnabled]);

  /**
   * AIDEV-NOTE: Navega para a próxima aba habilitada
   */
  const navigateToNextTab = useCallback(() => {
    const currentIndex = enabledTabsList.findIndex(tab => tab.id === activeTab);
    if (currentIndex < enabledTabsList.length - 1) {
      setActiveTab(enabledTabsList[currentIndex + 1].id);
    }
  }, [activeTab, enabledTabsList]);

  /**
   * AIDEV-NOTE: Navega para a aba anterior habilitada
   */
  const navigateToPreviousTab = useCallback(() => {
    const currentIndex = enabledTabsList.findIndex(tab => tab.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(enabledTabsList[currentIndex - 1].id);
    }
  }, [activeTab, enabledTabsList]);

  /**
   * AIDEV-NOTE: Obtém o label customizado de uma aba ou retorna o padrão
   */
  const getTabLabel = useCallback((tabId: string): string => {
    const customLabel = config.labels?.tabs?.[tabId];
    if (customLabel) {
      return customLabel;
    }
    
    // Labels padrão
    const defaultLabels: Record<string, string> = {
      servico: 'Serviço',
      produtos: 'Produtos',
      departamentos: 'Depto',
      observacoes: 'Notas',
      recebimentos: 'Historico'
    };
    
    return defaultLabels[tabId] || tabId;
  }, [config.labels]);

  /**
   * AIDEV-NOTE: Verifica se o formulário está em modo de visualização
   */
  const isViewMode = useMemo(() => config.mode === 'view', [config.mode]);

  /**
   * AIDEV-NOTE: Verifica se o formulário está em modo de edição
   */
  const isEditMode = useMemo(() => config.mode === 'edit', [config.mode]);

  /**
   * AIDEV-NOTE: Verifica se o formulário está em modo de criação
   */
  const isCreateMode = useMemo(() => config.mode === 'create', [config.mode]);

  /**
   * AIDEV-NOTE: Verifica se está sendo usado em modal
   */
  const isModal = useMemo(() => config.layout?.isModal === true, [config.layout?.isModal]);

  /**
   * AIDEV-NOTE: Verifica se deve exibir a sidebar
   */
  const showSidebar = useMemo(() => config.layout?.showSidebar !== false, [config.layout?.showSidebar]);

  /**
   * AIDEV-NOTE: Verifica se deve exibir o header
   */
  const showHeader = useMemo(() => config.layout?.showHeader !== false, [config.layout?.showHeader]);

  return {
    // Estado da aba
    activeTab,
    setActiveTab: navigateToTab,
    
    // Navegação
    navigateToTab,
    navigateToNextTab,
    navigateToPreviousTab,
    
    // Informações sobre abas
    enabledTabsList,
    isTabEnabled,
    getTabLabel,
    
    // Modos
    isViewMode,
    isEditMode,
    isCreateMode,
    
    // Layout
    isModal,
    showSidebar,
    showHeader,
    
    // Configuração completa (para acesso direto se necessário)
    config
  };
}


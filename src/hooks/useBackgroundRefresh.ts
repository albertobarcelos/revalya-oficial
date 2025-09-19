import { useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook para gerenciar recarregamento automático em background
 * Permite atualizar dados sem que o usuário perceba, com feedback discreto
 */
export function useBackgroundRefresh() {
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  /**
   * Executa um recarregamento em background com feedback discreto
   * @param refreshFunction - Função que executa o recarregamento dos dados
   * @param options - Opções de configuração
   */
  const executeBackgroundRefresh = useCallback(async (
    refreshFunction: () => Promise<void>,
    options: {
      delay?: number; // Delay antes de executar o refresh (padrão: 1000ms)
      showToast?: boolean; // Se deve mostrar toast de sucesso (padrão: true)
      toastMessage?: string; // Mensagem personalizada do toast
      silent?: boolean; // Se deve ser completamente silencioso (padrão: false)
    } = {}
  ) => {
    const {
      delay = 1000,
      showToast = true,
      toastMessage = 'Dados atualizados automaticamente',
      silent = false
    } = options;

    // Limpar timeout anterior se existir
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Evitar múltiplos refreshes simultâneos
    if (isRefreshingRef.current) {
      return;
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        isRefreshingRef.current = true;
        
        // Executar o refresh em background
        await refreshFunction();
        
        // Mostrar feedback discreto se não for silencioso
        if (!silent && showToast) {
          toast({
            title: '✓ Atualizado',
            description: toastMessage,
            duration: 2000,
            className: 'bg-green-50 border-green-200 text-green-800'
          });
        }
        
      } catch (error) {
        console.error('Erro no recarregamento em background:', error);
        
        // Em caso de erro, mostrar toast discreto apenas se não for silencioso
        if (!silent) {
          toast({
            title: 'Aviso',
            description: 'Alguns dados podem estar desatualizados. Recarregue a página se necessário.',
            duration: 3000,
            variant: 'default'
          });
        }
      } finally {
        isRefreshingRef.current = false;
      }
    }, delay);
  }, []);

  /**
   * Executa um refresh imediato e silencioso
   * Útil para atualizações que devem ser imperceptíveis ao usuário
   */
  const executeSilentRefresh = useCallback(async (
    refreshFunction: () => Promise<void>
  ) => {
    await executeBackgroundRefresh(refreshFunction, {
      delay: 500,
      silent: true
    });
  }, [executeBackgroundRefresh]);

  /**
   * Executa um refresh com feedback visual discreto
   * Útil para operações onde o usuário deve saber que algo foi atualizado
   */
  const executeVisibleRefresh = useCallback(async (
    refreshFunction: () => Promise<void>,
    message?: string
  ) => {
    await executeBackgroundRefresh(refreshFunction, {
      delay: 800,
      showToast: true,
      toastMessage: message || 'Lista atualizada com sucesso'
    });
  }, [executeBackgroundRefresh]);

  /**
   * Cancela qualquer refresh pendente
   */
  const cancelPendingRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  /**
   * Verifica se há um refresh em andamento
   */
  const isRefreshing = useCallback(() => {
    return isRefreshingRef.current;
  }, []);

  return {
    executeBackgroundRefresh,
    executeSilentRefresh,
    executeVisibleRefresh,
    cancelPendingRefresh,
    isRefreshing
  };
}

/**
 * Hook específico para recarregamento de contratos
 * Integra com o hook useContracts para fornecer funcionalidade específica
 */
export function useContractsBackgroundRefresh(forceRefreshContracts: () => Promise<void>) {
  const { executeVisibleRefresh, executeSilentRefresh } = useBackgroundRefresh();

  /**
   * Recarrega a lista de contratos após salvar um contrato
   * Mostra feedback discreto ao usuário
   */
  const refreshAfterSave = useCallback(async (isCreate: boolean = false) => {
    const message = isCreate 
      ? 'Novo contrato adicionado à lista' 
      : 'Contrato atualizado na lista';
    
    await executeVisibleRefresh(forceRefreshContracts, message);
  }, [executeVisibleRefresh, forceRefreshContracts]);

  /**
   * Recarrega a lista de contratos silenciosamente
   * Útil para atualizações que não devem interromper o usuário
   */
  const refreshSilently = useCallback(async () => {
    await executeSilentRefresh(forceRefreshContracts);
  }, [executeSilentRefresh, forceRefreshContracts]);

  return {
    refreshAfterSave,
    refreshSilently
  };
}

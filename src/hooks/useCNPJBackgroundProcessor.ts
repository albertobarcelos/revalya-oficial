import { useEffect, useRef, useCallback } from 'react';
import { 
  iniciarProcessamentoAutomatico, 
  verificarStatusConsulta,
  reprocessarConsultasFalhadas
} from '@/services/cnpjBackgroundService';

// AIDEV-NOTE: Hook para gerenciar processamento automático de CNPJ em background
// Inicia automaticamente quando o componente é montado

interface UseCNPJBackgroundProcessorOptions {
  autoStart?: boolean;
  reprocessFailedInterval?: number; // em minutos
}

export function useCNPJBackgroundProcessor(options: UseCNPJBackgroundProcessorOptions = {}) {
  const {
    autoStart = true,
    reprocessFailedInterval = 60 // 1 hora por padrão
  } = options;

  const stopProcessingRef = useRef<(() => void) | null>(null);
  const reprocessIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AIDEV-NOTE: Inicia o processamento automático
  const startProcessing = useCallback(() => {
    if (stopProcessingRef.current) {
      console.log('Processamento CNPJ já está ativo');
      return;
    }

    console.log('Iniciando processamento automático de CNPJ');
    stopProcessingRef.current = iniciarProcessamentoAutomatico();

    // Configura reprocessamento de consultas falhadas
    if (reprocessFailedInterval > 0) {
      reprocessIntervalRef.current = setInterval(
        reprocessarConsultasFalhadas,
        reprocessFailedInterval * 60 * 1000
      );
    }
  }, [reprocessFailedInterval]);

  // AIDEV-NOTE: Para o processamento automático
  const stopProcessing = useCallback(() => {
    if (stopProcessingRef.current) {
      console.log('Parando processamento automático de CNPJ');
      stopProcessingRef.current();
      stopProcessingRef.current = null;
    }

    if (reprocessIntervalRef.current) {
      clearInterval(reprocessIntervalRef.current);
      reprocessIntervalRef.current = null;
    }
  }, []);

  // AIDEV-NOTE: Verifica status de uma consulta específica
  const checkConsultaStatus = useCallback(async (customerId: string) => {
    return await verificarStatusConsulta(customerId);
  }, []);

  // AIDEV-NOTE: Força reprocessamento de consultas falhadas
  const forceReprocessFailed = useCallback(async () => {
    console.log('Forçando reprocessamento de consultas falhadas');
    await reprocessarConsultasFalhadas();
  }, []);

  // AIDEV-NOTE: Inicia automaticamente se autoStart estiver habilitado
  useEffect(() => {
    if (autoStart) {
      startProcessing();
    }

    // Cleanup ao desmontar o componente
    return () => {
      stopProcessing();
    };
  }, [autoStart, startProcessing, stopProcessing]);

  // AIDEV-NOTE: Verifica se o processamento está ativo
  const isProcessing = stopProcessingRef.current !== null;

  return {
    isProcessing,
    startProcessing,
    stopProcessing,
    checkConsultaStatus,
    forceReprocessFailed
  };
}

// AIDEV-NOTE: Hook simplificado para apenas verificar status de consultas
export function useCNPJStatusChecker() {
  const checkStatus = useCallback(async (customerId: string) => {
    return await verificarStatusConsulta(customerId);
  }, []);

  return { checkStatus };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { importApiService } from '@/services/importApiService';

// AIDEV-NOTE: Interface para status de importação
interface ImportStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  processedRecords: number;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: any[];
  estimatedTimeRemaining?: number;
  startedAt?: string;
  completedAt?: string;
}

// AIDEV-NOTE: Interface para configurações do hook
interface UseImportStatusOptions {
  jobId?: string;
  pollingInterval?: number; // em ms, padrão 2000ms
  autoStart?: boolean;
  onStatusChange?: (status: ImportStatus) => void;
  onComplete?: (status: ImportStatus) => void;
  onError?: (error: string) => void;
}

// AIDEV-NOTE: Hook para tracking de status de importação
export function useImportStatus(options: UseImportStatusOptions = {}) {
  const {
    jobId,
    pollingInterval = 2000,
    autoStart = true,
    onStatusChange,
    onComplete,
    onError
  } = options;

  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  // AIDEV-NOTE: Função para buscar status atual
  const fetchStatus = useCallback(async (currentJobId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await importApiService.getJobStatus(currentJobId);
      
      if (response.success && response.job) {
        const newStatus: ImportStatus = {
          jobId: response.job.id,
          status: response.job.status,
          progress: response.job.progress,
          processedRecords: response.job.processed_records,
          totalRecords: response.job.total_records,
          successCount: response.job.success_count,
          errorCount: response.job.error_count,
          errors: response.job.errors || [],
          startedAt: response.job.created_at,
          completedAt: response.job.status === 'completed' ? response.job.updated_at : undefined,
        };

        // AIDEV-NOTE: Calcular tempo estimado restante
        if (newStatus.status === 'processing' && newStatus.progress > 0) {
          const elapsed = new Date().getTime() - new Date(newStatus.startedAt!).getTime();
          const estimatedTotal = (elapsed / newStatus.progress) * 100;
          newStatus.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
        }

        setStatus(newStatus);

        // AIDEV-NOTE: Chamar callback se status mudou
        if (lastStatusRef.current !== newStatus.status) {
          onStatusChange?.(newStatus);
          lastStatusRef.current = newStatus.status;
        }

        // AIDEV-NOTE: Parar polling se job completou ou falhou
        if (newStatus.status === 'completed' || newStatus.status === 'failed') {
          stopPolling();
          onComplete?.(newStatus);
        }

      } else {
        throw new Error(response.error || 'Erro ao buscar status');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('❌ Erro ao buscar status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange, onComplete, onError]);

  // AIDEV-NOTE: Iniciar polling
  const startPolling = useCallback((targetJobId?: string) => {
    const currentJobId = targetJobId || jobId;
    
    if (!currentJobId) {
      console.warn('⚠️ JobId não fornecido para polling');
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsPolling(true);
    
    // AIDEV-NOTE: Buscar status imediatamente
    fetchStatus(currentJobId);

    // AIDEV-NOTE: Configurar polling interval
    intervalRef.current = setInterval(() => {
      fetchStatus(currentJobId);
    }, pollingInterval);

  }, [jobId, pollingInterval, fetchStatus]);

  // AIDEV-NOTE: Parar polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // AIDEV-NOTE: Reiniciar polling
  const restartPolling = useCallback(() => {
    stopPolling();
    if (jobId) {
      startPolling(jobId);
    }
  }, [jobId, startPolling, stopPolling]);

  // AIDEV-NOTE: Buscar status uma única vez
  const refreshStatus = useCallback(() => {
    if (jobId) {
      fetchStatus(jobId);
    }
  }, [jobId, fetchStatus]);

  // AIDEV-NOTE: Limpar status
  const clearStatus = useCallback(() => {
    setStatus(null);
    setError(null);
    lastStatusRef.current = null;
  }, []);

  // AIDEV-NOTE: Efeito para auto-iniciar polling
  useEffect(() => {
    if (autoStart && jobId) {
      startPolling(jobId);
    }

    return () => {
      stopPolling();
    };
  }, [jobId, autoStart, startPolling, stopPolling]);

  // AIDEV-NOTE: Cleanup no unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // Estado
    status,
    isPolling,
    isLoading,
    error,
    
    // Ações
    startPolling,
    stopPolling,
    restartPolling,
    refreshStatus,
    clearStatus,
    
    // Utilitários
    isCompleted: status?.status === 'completed',
    isFailed: status?.status === 'failed',
    isProcessing: status?.status === 'processing',
    isPending: status?.status === 'pending',
    progressPercentage: status?.progress || 0,
    hasErrors: (status?.errorCount || 0) > 0,
    
    // Formatadores
    formatTimeRemaining: (ms?: number) => {
      if (!ms) return null;
      const seconds = Math.ceil(ms / 1000);
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.ceil(seconds / 60);
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.ceil(minutes / 60);
      return `${hours}h`;
    }
  };
}
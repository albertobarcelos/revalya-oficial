import { useState, useCallback } from 'react';
import { BulkInsertService } from '@/services/bulkInsertService';
import { toast } from 'sonner';

// AIDEV-NOTE: Hook para inserção em lote com estado e feedback visual
// Facilita integração com componentes React

interface UseBulkInsertState {
  isLoading: boolean;
  progress: {
    processed: number;
    total: number;
    percentage: number;
  } | null;
  error: string | null;
  result: {
    success: boolean;
    totalRecords: number;
    processedRecords: number;
    errors: string[];
    duration: number;
  } | null;
}

interface UseBulkInsertOptions {
  showToasts?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void;
}

export function useBulkInsert(options: UseBulkInsertOptions = {}) {
  const { showToasts = true, onSuccess, onError, onProgress } = options;

  const [state, setState] = useState<UseBulkInsertState>({
    isLoading: false,
    progress: null,
    error: null,
    result: null,
  });

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      progress: null,
      error: null,
      result: null,
    });
  }, []);

  const insertBulk = useCallback(async (
    table: string,
    data: Record<string, any>[],
    insertOptions?: {
      batchSize?: number;
      upsert?: boolean;
      onConflict?: string;
    }
  ) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        result: null,
        progress: { processed: 0, total: data.length, percentage: 0 }
      }));

      if (showToasts) {
        toast.loading(`Inserindo ${data.length} registros...`, {
          id: 'bulk-insert'
        });
      }

      const result = await BulkInsertService.insertWithProgress(
        {
          table,
          data,
          batchSize: insertOptions?.batchSize,
          upsert: insertOptions?.upsert,
          onConflict: insertOptions?.onConflict,
        },
        (progress) => {
          setState(prev => ({ ...prev, progress }));
          onProgress?.(progress);
        }
      );

      setState(prev => ({
        ...prev,
        isLoading: false,
        result,
        progress: {
          processed: result.processedRecords,
          total: result.totalRecords,
          percentage: 100
        }
      }));

      if (showToasts) {
        toast.dismiss('bulk-insert');
        
        if (result.success) {
          toast.success(
            `✅ ${result.processedRecords} registros inseridos com sucesso!`,
            { duration: 5000 }
          );
        } else {
          toast.warning(
            `⚠️ ${result.processedRecords}/${result.totalRecords} registros inseridos. ${result.errors.length} erros.`,
            { duration: 8000 }
          );
        }
      }

      onSuccess?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      if (showToasts) {
        toast.dismiss('bulk-insert');
        toast.error(`❌ Erro na inserção: ${errorMessage}`, {
          duration: 8000
        });
      }

      onError?.(errorMessage);
      throw error;
    }
  }, [showToasts, onSuccess, onError, onProgress]);

  const insertCustomers = useCallback(async (
    customers: Record<string, any>[],
    insertOptions?: { batchSize?: number; upsert?: boolean }
  ) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        result: null,
        progress: { processed: 0, total: customers.length, percentage: 0 }
      }));

      if (showToasts) {
        toast.loading(`Inserindo ${customers.length} clientes...`, {
          id: 'bulk-insert-customers'
        });
      }

      const result = await BulkInsertService.insertCustomers(
        customers,
        insertOptions
      );

      setState(prev => ({
        ...prev,
        isLoading: false,
        result,
        progress: {
          processed: result.processedRecords,
          total: result.totalRecords,
          percentage: 100
        }
      }));

      if (showToasts) {
        toast.dismiss('bulk-insert-customers');
        
        if (result.success) {
          toast.success(
            `✅ ${result.processedRecords} clientes inseridos com sucesso!`,
            { duration: 5000 }
          );
        } else {
          toast.warning(
            `⚠️ ${result.processedRecords}/${result.totalRecords} clientes inseridos. ${result.errors.length} erros.`,
            { duration: 8000 }
          );
        }
      }

      onSuccess?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      if (showToasts) {
        toast.dismiss('bulk-insert-customers');
        toast.error(`❌ Erro na inserção de clientes: ${errorMessage}`, {
          duration: 8000
        });
      }

      onError?.(errorMessage);
      throw error;
    }
  }, [showToasts, onSuccess, onError]);

  return {
    // Estado
    isLoading: state.isLoading,
    progress: state.progress,
    error: state.error,
    result: state.result,
    
    // Ações
    insertBulk,
    insertCustomers,
    resetState,
    
    // Helpers
    isSuccess: state.result?.success === true,
    hasErrors: state.result && state.result.errors.length > 0,
    progressPercentage: state.progress?.percentage || 0,
  };
}

export default useBulkInsert;
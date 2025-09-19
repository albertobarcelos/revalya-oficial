import { useState, useCallback } from 'react';
import { chargeIntegrationService } from '@/services/chargeIntegrationService';
import type {
  ChargeIntegrationResult,
  SyncStatusResult,
  CancellationResult
} from '@/services/chargeIntegrationService';
import { toast } from 'sonner';

export interface UseChargeIntegrationReturn {
  // Estados de loading
  isCreating: boolean;
  isSyncing: boolean;
  isCancelling: boolean;
  isUpdatingOverdue: boolean;
  
  // Funções principais
  createExternalCharge: (billingId: string, gatewayCode: string, forceRecreate?: boolean) => Promise<ChargeIntegrationResult>;
  syncChargeStatuses: (tenantId: string, limit?: number) => Promise<SyncStatusResult>;
  processPendingCancellations: (tenantId: string) => Promise<CancellationResult>;
  updateOverdueCharges: (tenantId: string) => Promise<{ updated_count: number }>;
  processPaymentWebhook: (provider: string, payload: any, signature?: string) => Promise<{ success: boolean; error?: string }>;
  getIntegrationStats: (tenantId: string) => Promise<{
    total_billings: number;
    with_external_id: number;
    pending_sync: number;
    pending_cancellations: number;
    sync_success_rate: number;
  }>;
  
  // Estados de resultado
  lastResult: ChargeIntegrationResult | SyncStatusResult | CancellationResult | null;
  error: string | null;
}

/**
 * Hook personalizado para gerenciar integração de cobranças com gateways de pagamento
 * 
 * @example
 * ```tsx
 * const {
 *   createExternalCharge,
 *   syncChargeStatuses,
 *   isCreating,
 *   isSyncing,
 *   error
 * } = useChargeIntegration();
 * 
 * const handleCreateCharge = async () => {
 *   const result = await createExternalCharge('billing-id', 'asaas');
 *   if (result.success) {
 *     console.log('Cobrança criada:', result.external_id);
 *   }
 * };
 * ```
 */
export function useChargeIntegration(): UseChargeIntegrationReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUpdatingOverdue, setIsUpdatingOverdue] = useState(false);
  const [lastResult, setLastResult] = useState<ChargeIntegrationResult | SyncStatusResult | CancellationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cria uma cobrança externa no gateway de pagamento
   */
  const createExternalCharge = useCallback(async (
    billingId: string,
    gatewayCode: string,
    forceRecreate: boolean = false
  ): Promise<ChargeIntegrationResult> => {
    setIsCreating(true);
    setError(null);
    
    try {
      const result = await chargeIntegrationService.createExternalCharge(
        billingId,
        gatewayCode,
        forceRecreate
      );
      
      setLastResult(result);
      
      if (result.success) {
        toast.success('Cobrança criada com sucesso no gateway de pagamento');
      } else {
        setError(result.error || 'Erro ao criar cobrança');
        toast.error(result.error || 'Erro ao criar cobrança');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsCreating(false);
    }
  }, []);

  /**
   * Sincroniza status de cobranças pendentes com os gateways
   */
  const syncChargeStatuses = useCallback(async (
    tenantId: string,
    limit: number = 50
  ): Promise<SyncStatusResult> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const result = await chargeIntegrationService.syncChargeStatuses(tenantId, limit);
      setLastResult(result);
      
      if (result.success) {
        if (result.updated_count > 0) {
          toast.success(`${result.updated_count} cobranças sincronizadas com sucesso`);
        } else {
          toast.info('Nenhuma cobrança precisava ser sincronizada');
        }
        
        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} cobranças tiveram erro na sincronização`);
        }
      } else {
        const errorMessage = result.errors[0]?.error || 'Erro na sincronização';
        setError(errorMessage);
        toast.error(errorMessage);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(errorMessage);
      
      return {
        success: false,
        updated_count: 0,
        errors: [{ billing_id: 'unknown', error: errorMessage }]
      };
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Processa cancelamentos pendentes nos gateways
   */
  const processPendingCancellations = useCallback(async (
    tenantId: string
  ): Promise<CancellationResult> => {
    setIsCancelling(true);
    setError(null);
    
    try {
      const result = await chargeIntegrationService.processPendingCancellations(tenantId);
      setLastResult(result);
      
      if (result.success) {
        if (result.cancelled_count > 0) {
          toast.success(`${result.cancelled_count} cobranças canceladas com sucesso`);
        } else {
          toast.info('Nenhuma cobrança precisava ser cancelada');
        }
        
        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} cancelamentos falharam`);
        }
      } else {
        const errorMessage = result.errors[0]?.error || 'Erro no processamento de cancelamentos';
        setError(errorMessage);
        toast.error(errorMessage);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(errorMessage);
      
      return {
        success: false,
        cancelled_count: 0,
        errors: [{ external_id: 'unknown', error: errorMessage }]
      };
    } finally {
      setIsCancelling(false);
    }
  }, []);

  /**
   * Atualiza cobranças vencidas
   */
  const updateOverdueCharges = useCallback(async (
    tenantId: string
  ): Promise<{ updated_count: number }> => {
    setIsUpdatingOverdue(true);
    setError(null);
    
    try {
      const result = await chargeIntegrationService.updateOverdueCharges(tenantId);
      
      if (result.updated_count > 0) {
        toast.success(`${result.updated_count} cobranças marcadas como vencidas`);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(errorMessage);
      
      return { updated_count: 0 };
    } finally {
      setIsUpdatingOverdue(false);
    }
  }, []);

  /**
   * Processa webhook de pagamento
   */
  const processPaymentWebhook = useCallback(async (
    provider: string,
    payload: any,
    signature?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await chargeIntegrationService.processPaymentWebhook(
        provider,
        payload,
        signature
      );
      
      if (result.success) {
        toast.success('Webhook processado com sucesso');
      } else {
        setError(result.error || 'Erro ao processar webhook');
        toast.error(result.error || 'Erro ao processar webhook');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  /**
   * Obtém estatísticas de integração
   */
  const getIntegrationStats = useCallback(async (
    tenantId: string
  ) => {
    try {
      return await chargeIntegrationService.getIntegrationStats(tenantId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      return {
        total_billings: 0,
        with_external_id: 0,
        pending_sync: 0,
        pending_cancellations: 0,
        sync_success_rate: 0
      };
    }
  }, []);

  return {
    // Estados de loading
    isCreating,
    isSyncing,
    isCancelling,
    isUpdatingOverdue,
    
    // Funções principais
    createExternalCharge,
    syncChargeStatuses,
    processPendingCancellations,
    updateOverdueCharges,
    processPaymentWebhook,
    getIntegrationStats,
    
    // Estados de resultado
    lastResult,
    error
  };
}

export default useChargeIntegration;

/**
 * Hook para operações fiscais
 * 
 * AIDEV-NOTE: Hooks React Query para emissão de notas fiscais
 * Integra com FiscalEngine e aplica validações multi-tenant
 * 
 * @module useFiscal
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard } from './useTenantAccessGuard';
import { fiscalEngine } from '@/services/fiscal/FiscalEngine';
import type {
  CanEmitProductInvoiceResponse,
  CanEmitServiceInvoiceResponse,
  EmitInvoiceResponse
} from '@/types/fiscal';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook para verificar se pode emitir NF-e
 */
export function useCanEmitProductInvoice(billingPeriodId?: string) {
  const { currentTenant, hasAccess } = useTenantAccessGuard();

  return useQuery({
    queryKey: ['fiscal', 'can-emit-nfe', currentTenant?.id, billingPeriodId],
    queryFn: async (): Promise<CanEmitProductInvoiceResponse> => {
      if (!hasAccess || !currentTenant?.id || !billingPeriodId) {
        return { canEmit: false, reason: 'Parâmetros inválidos' };
      }

      return await fiscalEngine.canEmitProductInvoice(billingPeriodId, currentTenant.id);
    },
    enabled: hasAccess && !!currentTenant?.id && !!billingPeriodId,
    staleTime: 30 * 1000 // 30 segundos
  });
}

/**
 * Hook para emitir NF-e
 */
export function useEmitProductInvoice() {
  const { currentTenant, hasAccess } = useTenantAccessGuard();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billingPeriodId: string): Promise<EmitInvoiceResponse> => {
      if (!hasAccess || !currentTenant?.id) {
        throw new Error('Acesso negado ou tenant não encontrado');
      }

      return await fiscalEngine.emitProductInvoice(billingPeriodId, currentTenant.id);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'NF-e emitida com sucesso',
          description: 'A nota fiscal foi gerada e está sendo processada.'
        });
      } else {
        toast({
          title: 'Erro ao emitir NF-e',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive'
        });
      }

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['fiscal'] });
      queryClient.invalidateQueries({ queryKey: ['billing_periods'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal_invoices'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao emitir NF-e',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
}

/**
 * Hook para verificar se pode emitir NFS-e
 */
export function useCanEmitServiceInvoice(chargeId?: string) {
  const { currentTenant, hasAccess } = useTenantAccessGuard();

  return useQuery({
    queryKey: ['fiscal', 'can-emit-nfse', currentTenant?.id, chargeId],
    queryFn: async (): Promise<CanEmitServiceInvoiceResponse> => {
      if (!hasAccess || !currentTenant?.id || !chargeId) {
        return { canEmit: false, reason: 'Parâmetros inválidos' };
      }

      return await fiscalEngine.canEmitServiceInvoice(chargeId, currentTenant.id);
    },
    enabled: hasAccess && !!currentTenant?.id && !!chargeId,
    staleTime: 30 * 1000 // 30 segundos
  });
}

/**
 * Hook para emitir NFS-e
 */
export function useEmitServiceInvoice() {
  const { currentTenant, hasAccess } = useTenantAccessGuard();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chargeId: string): Promise<EmitInvoiceResponse> => {
      if (!hasAccess || !currentTenant?.id) {
        throw new Error('Acesso negado ou tenant não encontrado');
      }

      return await fiscalEngine.emitServiceInvoice(chargeId, currentTenant.id);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'NFS-e emitida com sucesso',
          description: 'A nota fiscal foi gerada e está sendo processada.'
        });
      } else {
        toast({
          title: 'Erro ao emitir NFS-e',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive'
        });
      }

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['fiscal'] });
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal_invoices'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao emitir NFS-e',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
}

/**
 * Hook principal - exporta todas as funcionalidades
 */
export function useFiscal() {
  const emitProductInvoice = useEmitProductInvoice();
  const emitServiceInvoice = useEmitServiceInvoice();

  return {
    // Emissão
    emitProductInvoice,
    emitServiceInvoice,
    
    // Helpers
    isEmitting: emitProductInvoice.isPending || emitServiceInvoice.isPending
  };
}


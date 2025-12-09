import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { standaloneBillingService } from '@/services/standaloneBillingService';

/**
 * AIDEV-NOTE: Hook dedicado para buscar um período standalone específico por ID
 * Criado para evitar problemas de ordem de hooks quando usado com useBillingOrder
 * 
 * Este hook é independente e pode ser chamado incondicionalmente em componentes
 */
export function useStandalonePeriod(periodId: string | null) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();

  return useSecureTenantQuery(
    ['standalone_billing_period', currentTenant?.id, periodId],
    async (supabaseClient, tenantId) => {
      if (!periodId) return null;

      return await standaloneBillingService.getStandaloneBillingPeriod(
        supabaseClient,
        tenantId,
        periodId
      );
    },
    {
      enabled: hasAccess && !!currentTenant?.id && !!periodId,
      staleTime: 30 * 1000 // 30 segundos de cache
    }
  );
}

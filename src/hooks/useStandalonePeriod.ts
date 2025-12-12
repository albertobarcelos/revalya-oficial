import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { standaloneBillingService } from '@/services/standaloneBillingService';

/**
 * AIDEV-NOTE: Hook dedicado para buscar um período standalone específico por ID
 * Criado para evitar problemas de ordem de hooks quando usado com useBillingOrder
 * 
 * Este hook é independente e pode ser chamado incondicionalmente em componentes
 * 
 * AIDEV-NOTE: Com a unificação das tabelas, agora busca em contract_billing_periods
 * com filtro is_standalone=true
 */
export function useStandalonePeriod(periodId: string | null) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();

  return useSecureTenantQuery(
    ['standalone_billing_period', currentTenant?.id, periodId],
    async (supabaseClient, tenantId) => {
      if (!periodId) return null;

      // AIDEV-NOTE: Usa o serviço atualizado que busca em contract_billing_periods com is_standalone=true
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

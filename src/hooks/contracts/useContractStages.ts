import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'
import { useQueryClient } from '@tanstack/react-query'
import { throttledAudit } from '@/utils/logThrottle'
import { getCurrentUser } from '@/utils/supabaseAuthManager'
import { ContractStage } from './types'

// 🏷️ HOOK SEGURO PARA STAGES DE CONTRATOS
export function useContractStages() {
  const { hasAccess, currentTenant } = useTenantAccessGuard()
  const queryClient = useQueryClient()

  const query = useSecureTenantQuery(
    ['contract-stages'],
    async (supabase, tenantId) => {
      throttledAudit(`🏷️ Buscando stages para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('contract_stages')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (error) throw error
      return data as unknown as ContractStage[]
    }
  )

  const createStage = useSecureTenantMutation(
    async (supabase, tenantId, stageData: Partial<ContractStage>) => {
      throttledAudit(`✏️ Criando stage para tenant: ${tenantId}`);

      const { data: lastStage } = await supabase
        .from('contract_stages')
        .select('order_index')
        .eq('tenant_id', tenantId)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrderIndex = ((lastStage?.order_index as number | undefined) ?? 0) + 1;

      const { data, error } = await supabase
        .from('contract_stages')
        .insert({
          ...stageData,
          tenant_id: tenantId,
          order_index: nextOrderIndex,
          is_active: stageData?.is_active ?? true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      invalidateQueries: ['contract-stages']
    }
  )

  const updateStage = useSecureTenantMutation(
    async (supabase, tenantId, { id, ...updates }: Partial<ContractStage> & { id: string }) => {
      throttledAudit(`✏️ Atualizando stage ${id} para tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Configurar contexto do usuário para auditoria
      const currentUser = await getCurrentUser();
      if (currentUser) {
        await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: tenantId,
          p_user_id: currentUser.id
        });
      }
      
      const { data, error } = await supabase
        .from('contract_stages')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO DUPLO DE SEGURANÇA
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      invalidateQueries: ['contract-stages']
    }
  )

  return {
    stages: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createStage: createStage.mutate,
    updateStage: updateStage.mutate,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['contract-stages', currentTenant?.id] })
  }
}

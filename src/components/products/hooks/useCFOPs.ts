/**
 * Hook para buscar CFOPs válidos baseado no regime tributário
 * 
 * AIDEV-NOTE: Lógica isolada para busca de CFOPs
 * 🔐 Segurança Multi-Tenant: Implementa padrão obrigatório usando useSecureTenantQuery
 */

import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ValidCFOP } from '../types/product-form.types';

interface UseCFOPsProps {
  enabled?: boolean;
  category?: 'entrada' | 'saida' | null;
}

export function useCFOPs({ enabled = true, category = 'saida' }: UseCFOPsProps = {}) {
  // 🔐 VALIDAÇÃO DE ACESSO OBRIGATÓRIA (Padrão Multi-Tenant)
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  
  // 📊 Query function segura para buscar CFOPs
  const fetchCFOPsQuery = async (supabase: SupabaseClient, tenantId: string): Promise<ValidCFOP[]> => {
    console.log(`[AUDIT] Buscando CFOPs para tenant: ${tenantId}`);
    
    // AIDEV-NOTE: Configurar contexto de tenant antes da query
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });
    
    // Buscar regime tributário do tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('company_data')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.error('[ERROR] Erro ao buscar dados do tenant:', tenantError);
      throw new Error(`Erro ao buscar dados do tenant: ${tenantError.message}`);
    }

    const regimeTributario = tenantData?.company_data?.fiscal?.regime_tributario || 'simples_nacional';
    
    // Buscar CFOPs válidos para o regime
    const { data, error: cfopError } = await supabase.rpc('get_valid_cfops_by_regime', {
      p_regime_tributario: regimeTributario,
      p_category: category,
    });

    if (cfopError) {
      console.error('[ERROR] Erro ao buscar CFOPs:', cfopError);
      throw new Error(`Erro ao buscar CFOPs: ${cfopError.message}`);
    }

    console.log(`[SUCCESS] ${data?.length || 0} CFOPs encontrados para regime: ${regimeTributario}`);
    
    // AIDEV-NOTE: Mapear dados retornados para o formato ValidCFOP
    // A função RPC retorna category, mas ValidCFOP não precisa desse campo
    const mappedData: ValidCFOP[] = (data || []).map((item: any) => ({
      id: item.id,
      code: item.code,
      description: item.description,
      is_default: item.is_default || false,
    }));
    
    return mappedData;
  };
  
  // 🔍 Query segura usando o template
  const {
    data: validCFOPs,
    isLoading,
    error
  } = useSecureTenantQuery<ValidCFOP[]>(
    ['cfops', currentTenant?.id, category],
    fetchCFOPsQuery,
    {
      enabled: hasAccess && enabled && !!currentTenant?.id,
      staleTime: 60 * 60 * 1000, // 1 hora (CFOPs mudam muito raramente)
      gcTime: 2 * 60 * 60 * 1000, // 2 horas em cache
      refetchOnWindowFocus: false, // AIDEV-NOTE: Não recarregar ao mudar de aba do navegador
      refetchOnMount: false, // AIDEV-NOTE: Não recarregar ao remontar se já tiver dados em cache
      refetchOnReconnect: false, // AIDEV-NOTE: Não recarregar ao reconectar
    }
  );

  // AIDEV-NOTE: Garantir que sempre retornamos um array válido
  const safeValidCFOPs: ValidCFOP[] = Array.isArray(validCFOPs) ? validCFOPs : [];

  return {
    validCFOPs: safeValidCFOPs,
    isLoading,
    error: error || undefined,
  };
}


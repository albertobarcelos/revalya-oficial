/**
 * Hook para buscar referências de CST (Código de Situação Tributária)
 * 
 * AIDEV-NOTE: Busca CSTs ativos para ICMS, IPI e PIS/COFINS
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CSTReference {
  id: string;
  code: string; // Ex: "00", "10", "20"
  description: string;
  is_active: boolean;
  applies_to?: 'pis' | 'cofins' | 'both'; // Apenas para PIS/COFINS
}

interface UseCSTReferenceParams {
  type: 'icms' | 'ipi' | 'pis_cofins';
  enabled?: boolean;
}

export function useCSTReference({ type, enabled = true }: UseCSTReferenceParams) {
  const tableName = 
    type === 'icms' ? 'cst_icms_reference' :
    type === 'ipi' ? 'cst_ipi_reference' :
    'cst_pis_cofins_reference';

  // AIDEV-NOTE: Query direta sem contexto de tenant (tabela pública)
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [`${tableName}`, 'active'],
    queryFn: async () => {
      // AIDEV-NOTE: CST é tabela de referência pública, não precisa de tenant_id ou contexto
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: true });

      if (error) {
        console.error(`[ERROR] Erro ao buscar CSTs ${type}:`, error);
        throw error;
      }

      return (data || []) as CSTReference[];
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hora (CSTs mudam muito pouco)
    gcTime: 2 * 60 * 60 * 1000, // 2 horas em cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return {
    csts: data || [],
    isLoading,
    error,
    refetch,
  };
}


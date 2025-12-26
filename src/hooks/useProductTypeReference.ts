/**
 * Hook para buscar referências de tipos de produto
 * 
 * AIDEV-NOTE: Busca tipos de produto ativos (Mercadoria para revenda, etc.)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ProductTypeReference {
  id: string;
  code: string; // Ex: "00", "01"
  description: string; // Ex: "Mercadoria para revenda"
  is_active: boolean;
}

interface UseProductTypeReferenceParams {
  enabled?: boolean;
}

export function useProductTypeReference({ enabled = true }: UseProductTypeReferenceParams = {}) {
  // AIDEV-NOTE: Query direta sem contexto de tenant (tabela pública)
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['product_type_reference', 'active'],
    queryFn: async () => {
      // AIDEV-NOTE: Tipo de produto é tabela de referência pública, não precisa de tenant_id ou contexto
      const { data, error } = await supabase
        .from('product_type_reference')
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: true });

      if (error) {
        console.error('[ERROR] Erro ao buscar tipos de produto:', error);
        throw error;
      }

      return (data || []) as ProductTypeReference[];
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hora (tipos mudam muito pouco)
    gcTime: 2 * 60 * 60 * 1000, // 2 horas em cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return {
    productTypes: data || [],
    isLoading,
    error,
    refetch,
  };
}


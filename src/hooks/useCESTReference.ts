/**
 * Hook para buscar referências de CEST (Código Especificador da Substituição Tributária)
 * 
 * AIDEV-NOTE: Busca apenas CESTs ativos e validados conforme CONFAZ
 * Permite criar CEST automaticamente se não existir (validação de formato)
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CESTReference {
  id: string;
  code: string; // Ex: "0302101"
  description: string;
  ncm_code?: string;
  is_active: boolean;
  effective_date?: string;
  expiration_date?: string;
}

interface UseCESTReferenceParams {
  enabled?: boolean;
  searchTerm?: string;
  ncmCode?: string; // AIDEV-NOTE: Filtrar CESTs por NCM relacionado
}

export function useCESTReference({ enabled = true, searchTerm, ncmCode }: UseCESTReferenceParams = {}) {
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Query direta sem contexto de tenant (tabela pública)
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['cest_reference', searchTerm || 'all', ncmCode || 'all'],
    queryFn: async () => {
      // AIDEV-NOTE: CEST é tabela de referência pública, não precisa de tenant_id ou contexto
      let query = supabase
        .from('cest_reference')
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: true })
        .limit(100); // AIDEV-NOTE: Limitar para performance

      // AIDEV-NOTE: Filtrar por NCM se fornecido
      if (ncmCode) {
        query = query.eq('ncm_code', ncmCode);
      }

      // AIDEV-NOTE: Buscar por código ou descrição se searchTerm fornecido
      if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ERROR] Erro ao buscar CESTs:', error);
        throw error;
      }

      return (data || []) as CESTReference[];
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hora (CESTs mudam muito pouco)
    gcTime: 2 * 60 * 60 * 1000, // 2 horas em cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // AIDEV-NOTE: Mutation para criar CEST automaticamente (sem contexto de tenant)
  const createCESTMutation = useMutation({
    mutationFn: async (cestData: { code: string; description?: string; ncm_code?: string }) => {
      // AIDEV-NOTE: Validar formato do código CEST (7 dígitos)
      const cestRegex = /^\d{7}$/;
      if (!cestRegex.test(cestData.code)) {
        throw new Error('Formato de CEST inválido. Use 7 dígitos (ex: 0302101)');
      }

      // AIDEV-NOTE: Verificar se já existe
      const { data: existing } = await supabase
        .from('cest_reference')
        .select('id')
        .eq('code', cestData.code)
        .single();

      if (existing) {
        // AIDEV-NOTE: Se já existe, retornar o existente
        const { data: fullData } = await supabase
          .from('cest_reference')
          .select('*')
          .eq('id', existing.id)
          .single();
        return fullData as CESTReference;
      }

      // AIDEV-NOTE: Criar novo CEST
      const { data: newCEST, error } = await supabase
        .from('cest_reference')
        .insert({
          code: cestData.code,
          description: cestData.description || `CEST ${cestData.code}`,
          ncm_code: cestData.ncm_code,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('[ERROR] Erro ao criar CEST:', error);
        throw error;
      }

      return newCEST as CESTReference;
    },
    onSuccess: () => {
      // AIDEV-NOTE: Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['cest_reference'] });
    }
  });

  return {
    cests: data || [],
    isLoading,
    error,
    refetch,
    createCEST: createCESTMutation.mutateAsync,
    isCreatingCEST: createCESTMutation.isPending,
  };
}

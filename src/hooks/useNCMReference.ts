/**
 * Hook para buscar referências de NCM (Nomenclatura Comum do Mercosul)
 * 
 * AIDEV-NOTE: Busca apenas NCMs ativos e validados conforme Receita Federal
 * Permite criar NCM automaticamente se não existir (validação de formato)
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface NCMReference {
  id: string;
  code: string; // Ex: "2203.00.00"
  description: string;
  is_active: boolean;
  effective_date?: string;
  expiration_date?: string;
}

interface UseNCMReferenceParams {
  enabled?: boolean;
  searchTerm?: string;
}

export function useNCMReference({ enabled = true, searchTerm }: UseNCMReferenceParams = {}) {
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Query direta sem contexto de tenant (tabela pública)
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['ncm_reference', searchTerm || 'all'],
    queryFn: async () => {
      // AIDEV-NOTE: NCM é tabela de referência pública, não precisa de tenant_id ou contexto
      let query = supabase
        .from('ncm_reference')
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: true })
        .limit(100); // AIDEV-NOTE: Limitar para performance

      // AIDEV-NOTE: Buscar por código ou descrição se searchTerm fornecido
      if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ERROR] Erro ao buscar NCMs:', error);
        throw error;
      }

      return (data || []) as NCMReference[];
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hora (NCMs mudam muito pouco)
    gcTime: 2 * 60 * 60 * 1000, // 2 horas em cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // AIDEV-NOTE: Mutation para criar NCM automaticamente (sem contexto de tenant)
  const createNCMMutation = useMutation({
    mutationFn: async (ncmData: { code: string; description?: string }) => {
      // AIDEV-NOTE: Validar formato do código NCM (8 dígitos: XXXX.XX.XX)
      const ncmRegex = /^\d{4}\.\d{2}\.\d{2}$/;
      if (!ncmRegex.test(ncmData.code)) {
        throw new Error('Formato de NCM inválido. Use o formato: XXXX.XX.XX (ex: 2203.00.00)');
      }

      // AIDEV-NOTE: Verificar se já existe
      const { data: existing } = await supabase
        .from('ncm_reference')
        .select('id')
        .eq('code', ncmData.code)
        .single();

      if (existing) {
        // AIDEV-NOTE: Se já existe, retornar o existente
        const { data: fullData } = await supabase
          .from('ncm_reference')
          .select('*')
          .eq('id', existing.id)
          .single();
        return fullData as NCMReference;
      }

      // AIDEV-NOTE: Criar novo NCM
      const { data: newNCM, error } = await supabase
        .from('ncm_reference')
        .insert({
          code: ncmData.code,
          description: ncmData.description || `NCM ${ncmData.code}`,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('[ERROR] Erro ao criar NCM:', error);
        throw error;
      }

      // AIDEV-NOTE: Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['ncm_reference'] });

      return newNCM as NCMReference;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ncm_reference'] });
    }
  });

  return {
    ncms: data || [],
    isLoading,
    error,
    refetch,
    createNCM: createNCMMutation.mutateAsync,
    isCreatingNCM: createNCMMutation.isPending,
  };
}

/**
 * Hook para buscar um NCM específico por código
 */
export function useNCMByCode(code: string, enabled: boolean = true) {
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['ncm_reference', 'by_code', code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ncm_reference')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // NCM não encontrado
          return null;
        }
        throw error;
      }

      return data as NCMReference | null;
    },
    enabled: enabled && !!code,
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 2 * 60 * 60 * 1000, // 2 horas
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return {
    ncm: data || null,
    isLoading,
    error,
  };
}

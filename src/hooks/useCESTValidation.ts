/**
 * Hook para validação de CEST via API (se disponível)
 * 
 * AIDEV-NOTE: CEST não possui API pública confiável como NCM
 * Por enquanto, apenas valida formato (7 dígitos)
 * 
 * Nota: Não há API pública confiável para validação de CEST
 * O campo será apenas formatado, sem validação de existência
 */

import { useQuery } from '@tanstack/react-query';

export interface CESTValidationResult {
  code: string;
  description: string;
  isValid: boolean;
}

/**
 * Valida formato do CEST (7 dígitos)
 * 
 * AIDEV-NOTE: Apenas valida formato, não consulta API
 * Não há API pública confiável para validação de CEST
 */
export function useCESTValidation(cestCode: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['cest_validation', cestCode],
    queryFn: async (): Promise<CESTValidationResult | null> => {
      if (!cestCode || cestCode.length === 0) {
        return null;
      }

      // AIDEV-NOTE: Remover caracteres não numéricos
      const cleanCode = cestCode.replace(/\D/g, '');

      // AIDEV-NOTE: Validar formato (7 dígitos)
      if (cleanCode.length === 7) {
        return {
          code: cleanCode,
          description: `CEST ${cleanCode}`,
          isValid: true,
        };
      }

      return {
        code: cleanCode,
        description: '',
        isValid: false,
      };
    },
    enabled: enabled && !!cestCode && cestCode.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}


/**
 * Hook para validação de NCM via API FocusNFe
 * 
 * AIDEV-NOTE: Valida NCM consultando diretamente a API FocusNFe através de Edge Function
 * Sem cache local - sempre consulta a API para garantir dados atualizados
 * 
 * Documentação: https://focusnfe.com.br/doc/#consulta-de-ncm
 */

import { useQuery } from '@tanstack/react-query';

export interface NCMValidationResult {
  code: string;
  description: string;
  isValid: boolean;
  details?: {
    ex?: string; // Exceção tarifária
    tipo?: string;
    unidade?: string;
  };
}

interface NCMValidationResponse {
  code: string;
  description: string;
  valid: boolean;
  details?: {
    ex?: string;
    tipo?: string;
    unidade?: string;
  };
}

/**
 * Valida NCM usando API FocusNFe diretamente
 */
export function useNCMValidation(ncmCode: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['ncm_validation', ncmCode],
    queryFn: async (): Promise<NCMValidationResult | null> => {
      if (!ncmCode || ncmCode.length !== 10) {
        return null;
      }

      // AIDEV-NOTE: Consultar API FocusNFe diretamente
      try {
        const apiResult = await validateNCMViaAPI(ncmCode);
        
        if (apiResult && apiResult.valid) {
          return {
            code: apiResult.code,
            description: apiResult.description,
            isValid: true,
            details: apiResult.details,
          };
        }

        return {
          code: ncmCode,
          description: '',
          isValid: false,
        };
      } catch (error) {
        console.error('[ERROR] Erro ao validar NCM via API:', error);
        // AIDEV-NOTE: Em caso de erro na API, retornar null (não válido)
        return null;
      }
    },
    enabled: enabled && !!ncmCode && ncmCode.length === 10,
    staleTime: 5 * 60 * 1000, // 5 minutos (cache do React Query apenas)
    gcTime: 30 * 60 * 1000, // 30 minutos em cache do React Query
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

/**
 * Valida NCM usando API FocusNFe via Edge Function
 * 
 * AIDEV-NOTE: Consulta NCM na API da FocusNFe através de Edge Function
 * Documentação: https://focusnfe.com.br/doc/#consulta-de-ncm
 * Endpoint: GET https://api.focusnfe.com.br/v2/ncms/{codigo}
 */
async function validateNCMViaAPI(ncmCode: string): Promise<NCMValidationResponse | null> {
  try {
    // AIDEV-NOTE: Chamar Edge Function que consulta API FocusNFe
    // Isso mantém o token da API segura no servidor
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/validate-ncm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: ncmCode }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // AIDEV-NOTE: Debug temporário para verificar resposta da API
    console.log('[DEBUG] Resposta da API validate-ncm:', data);
    
    // AIDEV-NOTE: Se a API retornar erro, considerar como inválido
    if (data.error || !data.valid) {
      return {
        code: ncmCode,
        description: '',
        valid: false,
      };
    }

    return {
      code: data.code || ncmCode,
      description: data.description || '',
      valid: data.valid || false,
      details: data.details,
    };
  } catch (error) {
    console.error('[ERROR] Erro ao validar NCM via API FocusNFe:', error);
    
    // AIDEV-NOTE: Em caso de erro, retornar null (não válido)
    // Não fazer fallback para validação de formato, pois precisamos da descrição real
    return null;
  }
}


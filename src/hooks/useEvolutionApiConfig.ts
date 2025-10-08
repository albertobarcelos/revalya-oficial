// =====================================================
// EVOLUTION API CONFIG HOOK
// Descrição: Hook para validar configurações da Evolution API
// Segurança: Validação de variáveis de ambiente
// =====================================================

import { useMemo } from 'react';

interface EvolutionApiConfig {
  isConfigured: boolean;
  apiUrl: string | null;
  apiKey: string | null;
  errors: string[];
}

/**
 * AIDEV-NOTE: Hook para validar configurações da Evolution API
 * Verifica se as variáveis de ambiente necessárias estão definidas
 */
export const useEvolutionApiConfig = (): EvolutionApiConfig => {
  return useMemo(() => {
    const apiUrl = import.meta.env.VITE_EVOLUTION_API_URL;
    const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY;
    const errors: string[] = [];

    // AIDEV-NOTE: Validar URL da API
    if (!apiUrl) {
      errors.push('VITE_EVOLUTION_API_URL não está configurada');
    } else if (!apiUrl.startsWith('http')) {
      errors.push('VITE_EVOLUTION_API_URL deve começar com http ou https');
    }

    // AIDEV-NOTE: Validar chave da API
    if (!apiKey) {
      errors.push('VITE_EVOLUTION_API_KEY não está configurada');
    } else if (apiKey.length < 10) {
      errors.push('VITE_EVOLUTION_API_KEY parece ser inválida (muito curta)');
    }

    const isConfigured = errors.length === 0;

    console.log('🔧 [EVOLUTION CONFIG] Validação:', {
      isConfigured,
      hasUrl: !!apiUrl,
      hasKey: !!apiKey,
      errors: errors.length > 0 ? errors : 'Nenhum erro'
    });

    return {
      isConfigured,
      apiUrl: apiUrl || null,
      apiKey: apiKey || null,
      errors,
    };
  }, []);
};
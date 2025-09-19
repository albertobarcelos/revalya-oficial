import { useState, useCallback } from 'react';
import { consultarCNPJ, mapearCNPJParaCliente, validarCNPJ, isCNPJ } from '@/services/cnpjService';
import type { CreateCustomerDTO } from '@/types/asaas';
import { toast } from '@/components/ui/use-toast';

// AIDEV-NOTE: Hook para gerenciar consulta automática de CNPJ
// Fornece funcionalidades de validação, consulta e preenchimento automático
export function useCNPJLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchedCNPJ, setLastSearchedCNPJ] = useState<string>('');

  // AIDEV-NOTE: Função para consultar CNPJ e retornar dados formatados
  const consultarEPreencherDados = useCallback(async (
    cnpj: string,
    onDataFound: (data: Partial<CreateCustomerDTO>) => void
  ) => {
    // Evita consultas duplicadas
    if (cnpj === lastSearchedCNPJ) {
      return;
    }

    // Valida se é um CNPJ
    if (!isCNPJ(cnpj)) {
      return; // Não é CNPJ, não faz consulta
    }

    // Valida CNPJ
    if (!validarCNPJ(cnpj)) {
      toast({
        title: 'CNPJ inválido',
        description: 'O CNPJ informado não é válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setLastSearchedCNPJ(cnpj);

    try {
      const cnpjData = await consultarCNPJ(cnpj);
      
      if (cnpjData) {
        const dadosFormatados = mapearCNPJParaCliente(cnpjData);
        
        toast({
          title: 'Dados encontrados!',
          description: `Empresa: ${dadosFormatados.company}`,
        });
        
        onDataFound(dadosFormatados);
      }
    } catch (error) {
      console.error('Erro na consulta CNPJ:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lastSearchedCNPJ]);

  // AIDEV-NOTE: Função para resetar o estado da consulta
  const resetSearch = useCallback(() => {
    setLastSearchedCNPJ('');
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    consultarEPreencherDados,
    resetSearch,
    lastSearchedCNPJ
  };
}

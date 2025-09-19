import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { Contract } from "@/types/models/contract";
import { cacheContract, getCachedContract, prefetchFrequentContracts } from "@/utils/contractCache";
import { useTenantContext } from '@/hooks/useTenantContext';

// Hook especializado para gerenciar um contrato específico com segurança multi-tenant
export function useContract(id?: string) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'idle' | 'cache' | 'server'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [isPartialData, setIsPartialData] = useState(false);
  const [loadingFields, setLoadingFields] = useState<Set<string>>(new Set());
  const { tenant } = useTenantContext();

  // Iniciar prefetch de contratos frequentes
  useEffect(() => {
    prefetchFrequentContracts();
  }, []);

  useEffect(() => {
    if (!id || !tenant?.id) {
      setContract(null);
      setIsPartialData(false);
      setLoadingPhase('idle');
      return;
    }

    let isMounted = true;
    let loadedFromCache = false;

    const fetchContract = async () => {
      try {
        setIsLoading(true);
        
        // Simular carregamento específico de campos
        setLoadingFields(new Set(['name', 'customer_id', 'value', 'status']));
        
        // 1. Tentar carregar do cache primeiro (rápido)
        setLoadingPhase('cache');
        const cachedContract = await getCachedContract(id);
        
        if (cachedContract && isMounted) {
          // Exibir dados do cache imediatamente
          setContract(cachedContract);
          setIsPartialData(true);
          loadedFromCache = true;
          setLoadingFields(new Set(['contact_name', 'address', 'additional_info']));
        }

        // 2. Buscar dados atualizados do servidor com filtro de tenant
        setLoadingPhase('server');
        const { data, error } = await supabase
          .from("contracts")
          .select(`
            *,
            customers!inner(
              id,
              name,
              company,
              email,
              phone,
              cpf_cnpj
            )
          `)
          .eq("id", id)
          .eq("tenant_id", tenant.id)
          .single();

        if (error) throw error;
        
        if (isMounted) {
          // Atualizar dados completos do contrato
          setContract(data);
          setIsPartialData(false);
          // Atualizar o cache com dados frescos
          cacheContract(data);
          setLoadingFields(new Set());
        }
      } catch (err) {
        console.error("Erro ao buscar contrato:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          // Se temos dados do cache, mantemos mesmo com erro
          if (!loadedFromCache) {
            setContract(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setLoadingPhase('idle');
          setLoadingFields(new Set());
        }
      }
    };

    fetchContract();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [id, tenant?.id]);

  // Função para buscar serviços do contrato sob demanda
  const fetchContractServices = async () => {
    if (!id || !tenant?.id) return [];
    
    try {
      const { data, error } = await supabase
        .from('contract_services')
        .select('*, service:services(*)')
        .eq('contract_id', id)
        .eq('tenant_id', tenant.id);
        
      if (error) throw error;
      
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar serviços do contrato:', err);
      return [];
    }
  };

  // Função para verificar se um campo específico está carregando
  const isFieldLoading = (fieldName: string) => {
    return isLoading && loadingFields.has(fieldName);
  };

  return { 
    contract, 
    isLoading, 
    loadingPhase,
    error, 
    isPartialData,
    isFieldLoading,
    fetchContractServices 
  };
}

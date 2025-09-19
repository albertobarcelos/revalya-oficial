import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { ContractBilling } from "@/types/models/contract";
import { toast } from "sonner";
import { useTenantAccessGuard } from '@/hooks/templates/useTenantAccessGuard';

// Hook especializado para gerenciar faturas com segurança multi-tenant
export const useBillings = (contractId: string) => {
  // AIDEV-NOTE: Usando nova arquitetura multi-tenant segura
  const { currentTenant } = useTenantAccessGuard();
  
  const [billings, setBillings] = useState<ContractBilling[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [initialFetchAttempted, setInitialFetchAttempted] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Referência para controlar se o componente está montado
  const isMountedRef = useRef(true);
  
  // Efeito para limpar a referência quando o componente for desmontado
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // AIDEV-NOTE: Função removida - agora usando useTenantAccessGuard para contexto seguro
  // A nova arquitetura garante que o tenant está sempre disponível via currentTenant.id

  // Função para buscar faturas com segurança
  const fetchBillings = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('Iniciando busca de faturas...');
      setIsLoading(true);
      
      // AIDEV-NOTE: Usando nova arquitetura - tenant já disponível via hook
      if (!currentTenant?.id) {
        throw new Error('Contexto do tenant não disponível.');
      }
      
      // Verificar se o usuário está autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado. Acesso negado.');
      }
      
      // Verificar se o usuário tem acesso ao tenant
      const { data: accessVerification, error: accessError } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (accessError || !accessVerification) {
        if (!user.app_metadata?.user_role || user.app_metadata.user_role !== 'ADMIN') {
          throw new Error('Acesso negado. Você não tem permissão para acessar faturas deste tenant.');
        }
      }
      
      // Verificar se o contrato pertence ao tenant
      const { data: contractVerification, error: contractError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contractId)
        .eq('tenant_id', currentTenant.id)
        .single();
        
      if (contractError || !contractVerification) {
        throw new Error('Contrato não encontrado ou você não tem permissão para acessá-lo.');
      }
      
      // Buscar as faturas
      const { data, error } = await supabase
        .from('contract_billings')
        .select(`
          *,
          contract:contracts(*),
          items:contract_billing_items(*, service:services(*))
        `)
        .eq('contract_id', contractId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      
      if (isMountedRef.current) {
        setBillings(data || []);
        setError(null);
      }
      
    } catch (error: any) {
      console.error('Erro ao buscar faturas:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error : new Error(error?.message || 'Erro desconhecido'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setInitialFetchAttempted(true);
      }
    }
  }, [contractId, initializationComplete, ensureTenantContext]);
  
  // Efeito para buscar as faturas quando o componente for montado
  useEffect(() => {
    if (!initialFetchAttempted) {
      fetchBillings();
    }
  }, [fetchBillings, initialFetchAttempted]);
  
  // Função para recarregar as faturas
  const refetch = useCallback(() => {
    return fetchBillings();
  }, [fetchBillings]);
  
  // Função para cancelar uma fatura
  const cancelBilling = useCallback(async (billingId: string) => {
    if (!isMountedRef.current) return false;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('contract_billings')
        .update({ status: 'CANCELED', updated_at: new Date().toISOString() })
        .eq('id', billingId);
      
      if (error) throw error;
      
      // Atualizar o cache local
      setBillings(prev => 
        prev.map(b => 
          b.id === billingId 
            ? { ...b, status: 'CANCELED', updated_at: new Date().toISOString() } 
            : b
        )
      );
      
      toast.success('Fatura cancelada com sucesso!');
      return true;
      
    } catch (error) {
      console.error('Erro ao cancelar fatura:', error);
      toast.error('Erro ao cancelar fatura. Tente novamente.');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);
  
  // Função para gerar faturas
  const generateBillings = useCallback(async () => {
    if (!isMountedRef.current) return false;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase.rpc('generate_contract_billings', {
        p_contract_id: contractId
      });
      
      if (error) throw error;
      
      // Recarregar as faturas após a geração
      await fetchBillings();
      
      toast.success('Faturas geradas com sucesso!');
      return true;
      
    } catch (error) {
      console.error('Erro ao gerar faturas:', error);
      toast.error('Erro ao gerar faturas. Verifique os dados e tente novamente.');
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [contractId, fetchBillings]);
  
  return {
    billings,
    isLoading,
    error,
    refetch,
    cancelBilling,
    generateBillings,
    regenerateBillingsMutation: {
      mutateAsync: generateBillings,
      isPending: isLoading
    }
  };
};

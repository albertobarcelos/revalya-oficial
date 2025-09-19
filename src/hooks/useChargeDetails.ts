import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useZustandTenant } from './useZustandTenant';
import { Cobranca } from '@/types';

export function useChargeDetails(chargeId: string | null) {
  const { toast } = useToast();
  const { tenantId } = useZustandTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [chargeDetails, setChargeDetails] = useState<Cobranca | null>(null);

  useEffect(() => {
    if (chargeId) {
      fetchChargeDetails();
    } else {
      setChargeDetails(null);
    }
  }, [chargeId]);

  const fetchChargeDetails = async () => {
    if (!chargeId || !tenantId) {
      console.log('🔍 [DEBUG] useChargeDetails - Parâmetros inválidos:', { chargeId, tenantId });
      return;
    }
    
    console.log('🔍 [DEBUG] useChargeDetails - Iniciando busca:', { chargeId, tenantId });
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('charges')
        .select(`
          *,
          customers(*)
        `)
        .eq('tenant_id', tenantId)
        .eq('id', chargeId)
        .single();

      console.log('🔍 [DEBUG] useChargeDetails - Resposta do banco:', { data, error });
      
      if (error) throw error;
      
      // AIDEV-NOTE: Log detalhado dos dados para debug do problema
      console.log('🔍 [DEBUG] useChargeDetails - Dados COMPLETOS carregados:', {
        id: data?.id,
        status: data?.status,
        valor: data?.valor,
        amount: data?.amount,
        data_vencimento: data?.data_vencimento,
        due_date: data?.due_date,
        customer_id: data?.customer_id,
        customer: {
          id: data?.customer?.id,
          name: data?.customer?.name,
          company: data?.customer?.company,
          email: data?.customer?.email,
          phone: data?.customer?.phone
        },
        tenant_id: data?.tenant_id,
        created_at: data?.created_at,
        updated_at: data?.updated_at,
        fullData: data
      });
      
      setChargeDetails(data);
    } catch (error) {
      console.error("🚨 [ERROR] useChargeDetails - Erro ao carregar:", error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível carregar os detalhes da cobrança.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    chargeDetails,
    isLoading,
    refreshChargeDetails: fetchChargeDetails
  };
}
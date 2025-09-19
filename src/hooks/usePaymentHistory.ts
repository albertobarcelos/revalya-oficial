import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export interface PaymentHistory {
  id: string;
  paid_at: string;
  payment_method: string;
  amount: number;
  transaction_id: string;
}

export function usePaymentHistory(chargeId: string | null) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);

  useEffect(() => {
    if (chargeId) {
      fetchPaymentHistory();
    } else {
      setPaymentHistory([]);
    }
  }, [chargeId]);

  const fetchPaymentHistory = async () => {
    if (!chargeId) return;
    
    setIsLoading(true);
    try {
      // Verifica se a tabela payment_history existe
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'payment_history');
      
      if (tableError || !tables || tables.length === 0) {
        console.log('Tabela payment_history não existe. Usando dados vazios.');
        setPaymentHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from('payment_history')
        .select('id, paid_at, payment_method, amount, transaction_id')
        .eq('charge_id', chargeId)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico de pagamentos:", error);
      // Retorna array vazio em caso de erro para não quebrar a interface
      setPaymentHistory([]);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de pagamentos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    paymentHistory,
    isLoading,
    refreshPaymentHistory: fetchPaymentHistory
  };
}
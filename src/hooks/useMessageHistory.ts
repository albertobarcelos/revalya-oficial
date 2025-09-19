import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useZustandTenant } from './useZustandTenant';

export interface MessageHistory {
  id: string;
  sent_at: string;
  template_name: string;
  status: 'delivered' | 'read' | 'sent';
  message: string;
}

export function useMessageHistory(chargeId: string | null) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);

  useEffect(() => {
    if (chargeId) {
      fetchMessageHistory();
    } else {
      setMessageHistory([]);
    }
  }, [chargeId]);

  const fetchMessageHistory = async () => {
    if (!chargeId) return;
    
    setIsLoading(true);
    try {
      // Verifica se a tabela message_history existe
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'message_history');
      
      if (tableError || !tables || tables.length === 0) {
        console.log('Tabela message_history não existe. Usando dados vazios.');
        setMessageHistory([]);
        return;
      }

      // Verifica se a coluna sent_at existe na tabela
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'message_history')
        .eq('column_name', 'sent_at');
      
      const hasSentAtColumn = columns && columns.length > 0;
      
      // Ajusta a consulta baseado nas colunas disponíveis
      let selectFields = 'id, template_name, status, message';
      let orderField = 'id';
      
      if (hasSentAtColumn) {
        selectFields = 'id, sent_at, template_name, status, message';
        orderField = 'sent_at';
      }

      const { data, error } = await supabase
        .from('message_history')
        .select(selectFields)
        .eq('charge_id', chargeId)
        .order(orderField, { ascending: false });

      if (error) throw error;
      
      // Se não tem a coluna sent_at, adiciona um valor padrão
      const processedData = data?.map(item => ({
        ...item,
        sent_at: item.sent_at || new Date().toISOString()
      })) || [];
      
      setMessageHistory(processedData);
    } catch (error) {
      console.error("Erro ao carregar histórico de mensagens:", error);
      // Retorna array vazio em caso de erro para não quebrar a interface
      setMessageHistory([]);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de mensagens.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messageHistory,
    isLoading,
    refreshMessageHistory: fetchMessageHistory
  };
}
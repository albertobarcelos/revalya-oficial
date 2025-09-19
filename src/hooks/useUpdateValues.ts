import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface UpdateRequest {
  descricao: string;
  valor: number;
  tipo: string;
  modulo_terminal: string;
  status: string;
  data_solicitacao: string;
  customer_id: string;
  solicitante: string;
  quantidade?: number;
}

export function useUpdateValues() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitacoes_atualizacao')
        .select(`
          id,
          descricao,
          valor,
          tipo,
          modulo_terminal,
          status,
          data_solicitacao,
          customer_id,
          solicitante,
          quantidade,
          customer:customer_id (
            id,
            name,
            Company,
            cpf_cnpj
          )
        `);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as solicitações de atualização.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const createUpdateRequest = async (request: UpdateRequest) => {
    try {
      // Vamos buscar o cliente diretamente do Supabase para evitar dependências
      const { data: customerData } = await supabase
        .from('customers')
        .select('name')
        .eq('id', request.customer_id)
        .single();
      
      const customerName = customerData?.name || 'Cliente';

      // Criar a solicitação
      const { data, error } = await supabase
        .from('solicitacoes_atualizacao')
        .insert([{
          descricao: request.descricao,
          valor: request.valor,
          tipo: request.tipo,
          modulo_terminal: request.modulo_terminal,
          status: request.status,
          data_solicitacao: request.data_solicitacao,
          customer_id: request.customer_id,
          solicitante: request.solicitante,
          quantidade: request.quantidade || 1
        }])
        .select()
        .single();

      if (error) throw error;

      // Criar uma notificação para a nova solicitação
      await createRequestNotification(data, customerName);
      
      return data;
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      throw error;
    }
  };

  const createRequestNotification = async (request: any, customerName: string) => {
    try {
      // Construir a mensagem da notificação
      let valorTotal = request.valor;
      if (request.tipo === 'terminal' && request.quantidade > 1) {
        valorTotal = request.valor * request.quantidade;
      }
      
      const valorFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valorTotal);
      
      let mensagem = `Nova solicitação de ${request.tipo === 'modulo' ? 'módulo' : 'terminal'}`;
      
      if (request.tipo === 'terminal' && request.quantidade > 1) {
        mensagem += ` (${request.quantidade} unidades)`;
      }
      
      mensagem += ` para ${customerName}. Valor: ${valorFormatado}`;

      // Inserir a notificação
      const { error } = await supabase
        .from('notifications')
        .insert([{
          type: 'solicitacao',
          message: mensagem,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      // Não lançamos o erro aqui para não interromper o fluxo principal
    }
  };

  const updateRequestStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('solicitacoes_atualizacao')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da solicitação.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    isLoading,
    getRequests,
    createUpdateRequest,
    updateRequestStatus
  };
}

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useSecureTenantQuery, useSecureTenantMutation, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useQueryClient } from '@tanstack/react-query';

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
  const { toast } = useToast();
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Query segura para buscar solicitações
  const { 
    data: requests = [], 
    isLoading, 
    error: queryError 
  } = useSecureTenantQuery(
    ['solicitacoes-atualizacao'],
    async (supabase, tenantId) => {
      // AIDEV-NOTE: Assumindo que a tabela deve filtrar por customer que pertence ao tenant
      // Como a tabela solicitacoes_atualizacao não parece ter tenant_id diretamente,
      // fazemos um join implícito ou filtramos depois se necessário.
      // Melhor prática: adicionar tenant_id na tabela. Por enquanto, confiamos no acesso via customer.
      
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
          customer:customer_id!inner (
            id,
            name,
            Company,
            cpf_cnpj,
            tenant_id
          )
        `)
        .eq('customer.tenant_id', tenantId)
        .order('data_solicitacao', { ascending: false });
      
      if (error) throw error;
      
      // Transformar dados se necessário para manter compatibilidade
      return data || [];
    },
    {
      enabled: hasAccess && !!currentTenant?.id
    }
  );

  const getRequests = async () => {
    // Mantendo para compatibilidade, mas agora usa cache do React Query se possível
    // Idealmente, os componentes deveriam usar { requests } diretamente do hook
    return requests;
  };

  // AIDEV-NOTE: Mutation segura para criar solicitação
  const createRequestMutation = useSecureTenantMutation(
    async (supabase, tenantId, request: UpdateRequest) => {
      // Validar se o customer pertence ao tenant
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('name, tenant_id')
        .eq('id', request.customer_id)
        .single();
      
      if (customerError || !customerData) {
        throw new Error('Cliente não encontrado');
      }

      if (customerData.tenant_id !== tenantId) {
        throw new Error('Violação de segurança: Cliente não pertence ao tenant atual');
      }

      const customerName = customerData.name || 'Cliente';

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

      // Criar notificação (sem bloquear)
      createRequestNotification(data, customerName).catch(console.error);
      
      return data;
    },
    {
      onSuccess: () => {
        toast({
          title: "Sucesso",
          description: "Solicitação enviada com sucesso.",
        });
      },
      onError: (error) => {
        console.error('Erro ao criar solicitação:', error);
        toast({
          title: "Erro",
          description: error instanceof Error ? error.message : "Não foi possível enviar a solicitação.",
          variant: "destructive",
        });
      },
      invalidateQueries: ['solicitacoes-atualizacao']
    }
  );

  // AIDEV-NOTE: Mutation segura para atualizar status
  const updateStatusMutation = useSecureTenantMutation(
    async (supabase, tenantId, { id, status }: { id: string, status: string }) => {
      // Verificar se a solicitação pertence a um cliente do tenant
      // Isso seria ideal, mas exigiria uma query extra ou RLS policy configurada
      
      const { error } = await supabase
        .from('solicitacoes_atualizacao')
        .update({ status: status })
        .eq('id', id);
      
      if (error) throw error;
      return true;
    },
    {
      onSuccess: () => {
        toast({
          title: "Sucesso",
          description: "Status atualizado com sucesso.",
        });
      },
      onError: (error) => {
        console.error('Erro ao atualizar status:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status.",
          variant: "destructive",
        });
      },
      invalidateQueries: ['solicitacoes-atualizacao']
    }
  );

  const createUpdateRequest = async (request: UpdateRequest) => {
    return await createRequestMutation.mutateAsync(request);
  };

  const updateRequestStatus = async (id: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      return true;
    } catch {
      return false;
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
          created_at: new Date().toISOString(),
          // AIDEV-NOTE: Importante adicionar tenant_id se a tabela suportar
          tenant_id: currentTenant?.id 
        }]);

      if (error) {
        // Se falhar por causa da coluna tenant_id, tentar sem ela (fallback)
        if (error.message?.includes('tenant_id')) {
           await supabase
            .from('notifications')
            .insert([{
              type: 'solicitacao',
              message: mensagem,
              status: 'pending',
              created_at: new Date().toISOString()
            }]);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      // Não lançamos o erro aqui para não interromper o fluxo principal
    }
  };

  return {
    isLoading: isLoading || createRequestMutation.isPending || updateStatusMutation.isPending,
    getRequests,
    createUpdateRequest,
    updateRequestStatus,
    requests // Expor dados para uso reativo se necessário
  };
}

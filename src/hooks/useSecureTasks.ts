/**
 * 🔐 Hook Seguro para Gerenciamento de Tarefas
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard, useSecureTenantQuery, useSecureTenantMutation } from './templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import type { SupabaseClient } from '@supabase/supabase-js';

// AIDEV-NOTE: Interface para tarefa segura com tenant_id obrigatório
// Atualizada para corresponder à estrutura real da tabela tasks
export interface SecureTask {
  id: string;
  tenant_id: string; // 🛡️ OBRIGATÓRIO para segurança multi-tenant
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  // Campos relacionados ao cliente e responsável
  assigned_to?: string; // opcional; responsável (auth.users.id)
  customer_id?: string; // antigo (mapeado para client_id)
  client_id?: string;   // novo na tabela
  client_name?: string; // novo na tabela
  charge_id?: string;
  created_at: string;
  updated_at: string;
}

// AIDEV-NOTE: Parâmetros para criação/atualização de tarefa
// Atualizada para refletir campos obrigatórios da tabela tasks
interface TaskData {
  title?: string;                   // 🔄 Opcional para updates; obrigatório para criação
  description?: string;             // ✅ Opcional na tabela
  status?: 'pending' | 'in_progress' | 'completed'; // ✅ Opcional (default: pending na criação)
  priority?: 'low' | 'medium' | 'high';             // ✅ Opcional (default: medium na criação)
  due_date?: string;                // ✅ Opcional na tabela
  // Compatibilidade antiga: customer_id/assigned_to não existem na tabela atual
  assigned_to?: string;             // ✅ Opcional na tabela (FK auth.users.id)
  customer_id?: string;             // ✅ Opcional (será mapeado para client_id)
  client_id?: string;               // ✅ Opcional na tabela real
  client_name?: string;             // ✅ Opcional na tabela real
  charge_id?: string;               // ✅ Opcional na tabela
}

// AIDEV-NOTE: Parâmetros para filtros seguros
interface SecureTaskFilters {
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  assigned_to?: string;
  customer_id?: string;
  client_id?: string;
  charge_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// AIDEV-NOTE: Função para sanitizar dados da tarefa, evitando referências circulares
// Remove propriedades extras que não pertencem à tabela tasks
// Inclui validação robusta para campos obrigatórios
/**
 * Função de sanitização para CRIAÇÃO de tarefa.
 * - Garante que o título esteja presente e válido.
 * - Aplica defaults de status e prioridade.
 */
function sanitizeNewTaskData(taskData: TaskData): Required<TaskData> {
  // 🔍 DEBUG LOG - Verificar dados recebidos (criação)
  console.log('🔍 [DEBUG] sanitizeNewTaskData - Dados recebidos:', {
    taskData,
    title: taskData?.title,
    titleType: typeof taskData?.title,
    titleLength: taskData?.title?.length,
    trimmedTitle: taskData?.title?.trim(),
    trimmedLength: taskData?.title?.trim()?.length
  });

  // 🛡️ VALIDAÇÃO DE CAMPO OBRIGATÓRIO
  if (!taskData.title || taskData.title.trim() === '') {
    console.error('🚨 [DEBUG] Campo title inválido (criação):', {
      title: taskData.title,
      titleType: typeof taskData.title,
      trimmed: taskData.title?.trim(),
      fullData: taskData
    });
    throw new Error('Campo "title" é obrigatório e não pode estar vazio');
  }

  const sanitizedData: Required<TaskData> = {
    title: taskData.title.trim(),
    description: taskData.description?.trim() || null,
    status: taskData.status || 'pending',
    priority: taskData.priority || 'medium',
    due_date: taskData.due_date || null,
    assigned_to: taskData.assigned_to || null,
    customer_id: taskData.customer_id || null,
    client_id: taskData.client_id || taskData.customer_id || null,
    client_name: taskData.client_name?.trim() || null,
    charge_id: taskData.charge_id || null
  };

  // 🔍 DEBUG LOG - Verificar dados sanitizados (criação)
  console.log('✅ [DEBUG] sanitizeNewTaskData - Dados sanitizados:', sanitizedData);

  return sanitizedData;
}

/**
 * Função de sanitização para ATUALIZAÇÃO parcial de tarefa.
 * - Não exige título; só normaliza campos presentes.
 * - Não aplica defaults (evita sobrescrever sem intenção).
 */
function sanitizeUpdateTaskData(taskData: TaskData): TaskData {
  console.log('🔍 [DEBUG] sanitizeUpdateTaskData - Dados recebidos:', taskData);

  const sanitizedData: TaskData = {
    title: typeof taskData.title === 'string' ? taskData.title.trim() : undefined,
    description: typeof taskData.description === 'string' ? taskData.description.trim() : undefined,
    status: taskData.status,
    priority: taskData.priority,
    due_date: taskData.due_date ?? undefined,
    assigned_to: taskData.assigned_to,
    customer_id: taskData.customer_id,
    client_id: taskData.client_id ?? taskData.customer_id,
    client_name: typeof taskData.client_name === 'string' ? taskData.client_name.trim() : undefined,
    charge_id: taskData.charge_id
  };

  console.log('✅ [DEBUG] sanitizeUpdateTaskData - Dados sanitizados:', sanitizedData);
  return sanitizedData;
}

/**
 * 🔐 Hook Seguro para Gerenciamento de Tarefas
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 */
export function useSecureTasks(filters: SecureTaskFilters = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  const {
    status,
    priority,
    assigned_to,
    customer_id,
    client_id,
    charge_id,
    search,
    limit = 50,
    offset = 0
  } = filters;

  // 🔍 QUERY SEGURA PARA LISTAR TAREFAS
  const {
    data: tasksData,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['tasks', currentTenant?.id, {
      status,
      priority,
      assigned_to,
      customer_id,
      client_id,
      charge_id,
      search,
      limit,
      offset
    }],
    async (supabase, tenantId) => {
      // 🛡️ CONFIGURAR CONTEXTO DE TENANT ANTES DA CONSULTA
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId 
      });

      // 🛡️ CONSULTA COM FILTRO OBRIGATÓRIO DE TENANT_ID
      let query = supabase
        .from('tasks')
        .select(`
          *,
          client:customers(
            id,
            name,
            cpf_cnpj,
            email
          ),
          charge:charges(
            id,
            descricao,
            valor,
            status
          )
        `)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO CRÍTICO
        .order('created_at', { ascending: false });

      // Aplicar filtros opcionais
      if (status) {
        query = query.eq('status', status);
      }
      
      if (priority) {
        query = query.eq('priority', priority);
      }

      if (assigned_to) {
        query = query.eq('assigned_to', assigned_to);
      }

      if (customer_id) {
        // Compatibilidade: mapear customer_id antigo para client_id da tabela
        query = query.eq('client_id', customer_id);
      }

      if (client_id) {
        query = query.eq('client_id', client_id);
      }

      if (charge_id) {
        query = query.eq('charge_id', charge_id);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [AUDIT] Erro ao buscar tarefas:', error);
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA: Verificar se todos os dados pertencem ao tenant correto
      const invalidData = data?.filter(task => task.tenant_id !== tenantId);
      if (invalidData && invalidData.length > 0) {
        console.error('🚨 [SECURITY VIOLATION] Tarefas de outro tenant detectadas:', invalidData);
        throw new Error('Violação de segurança: dados de outro tenant detectados');
      }

      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`✅ [AUDIT] Tarefas carregadas - Tenant: ${currentTenant?.name}, Count: ${data?.length || 0}`);

      return data || [];
    },
    {
      enabled: hasAccess && !!currentTenant?.id
    }
  );

  // 🔐 MUTATION SEGURA PARA CRIAR TAREFA - SEMPRE INICIALIZADA
  const createTaskMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, taskData: TaskData) => {
      // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA
      if (!hasAccess || !tenantId) {
        throw new Error('Tenant não definido ou acesso negado');
      }

      // 🔧 SANITIZAR DADOS PARA EVITAR REFERÊNCIAS CIRCULARES
      const sanitizedData = sanitizeNewTaskData(taskData);

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: sanitizedData.title,
          description: sanitizedData.description,
          status: sanitizedData.status,
          priority: sanitizedData.priority,
          due_date: sanitizedData.due_date,
          // Mapeamento para a tabela real
          client_id: sanitizedData.client_id,
          client_name: sanitizedData.client_name,
          charge_id: sanitizedData.charge_id,
          assigned_to: sanitizedData.assigned_to,
          tenant_id: tenantId, // 🛡️ INSERIR TENANT_ID OBRIGATÓRIO
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [AUDIT] Erro ao criar tarefa:', error);
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA: Verificar se a tarefa criada pertence ao tenant correto
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY VIOLATION] Tarefa criada com tenant_id incorreto');
        throw new Error('Erro de segurança na criação da tarefa');
      }

      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`✅ [AUDIT] Tarefa criada - Tenant: ${currentTenant?.name}, Tarefa: ${data.title}`);

      return data;
    },
    {
      onSuccess: () => {
        // Invalidar cache de tarefas
        queryClient.invalidateQueries({
          queryKey: ['tasks', currentTenant?.id]
        });
        
        toast({
          title: "Tarefa criada",
          description: "Tarefa criada com sucesso.",
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao criar tarefa",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  );

  // 🔐 MUTATION SEGURA PARA ATUALIZAR TAREFA - SEMPRE INICIALIZADA
  const updateTaskMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, { id, ...taskData }: TaskData & { id: string }) => {
      // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA
      if (!hasAccess || !tenantId) {
        throw new Error('Tenant não definido ou acesso negado');
      }

      // 🔧 SANITIZAR DADOS PARA EVITAR REFERÊNCIAS CIRCULARES
      const sanitizedData = sanitizeUpdateTaskData(taskData);

      // Montar objeto de update apenas com campos presentes para evitar sobrescrever indevidamente
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      if (sanitizedData.title !== undefined) updatePayload.title = sanitizedData.title;
      if (sanitizedData.description !== undefined) updatePayload.description = sanitizedData.description ?? null;
      if (sanitizedData.status !== undefined) updatePayload.status = sanitizedData.status;
      if (sanitizedData.priority !== undefined) updatePayload.priority = sanitizedData.priority;
      if (sanitizedData.due_date !== undefined) updatePayload.due_date = sanitizedData.due_date ?? null;
      if (sanitizedData.client_id !== undefined) updatePayload.client_id = sanitizedData.client_id ?? null;
      if (sanitizedData.client_name !== undefined) updatePayload.client_name = sanitizedData.client_name ?? null;
      if (sanitizedData.charge_id !== undefined) updatePayload.charge_id = sanitizedData.charge_id ?? null;
      if (sanitizedData.assigned_to !== undefined) updatePayload.assigned_to = sanitizedData.assigned_to ?? null;

      const { data, error } = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', id)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO DUPLO DE SEGURANÇA
        .select()
        .single();

      if (error) {
        console.error('❌ [AUDIT] Erro ao atualizar tarefa:', error);
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY VIOLATION] Tarefa atualizada com tenant_id incorreto');
        throw new Error('Erro de segurança na atualização da tarefa');
      }

      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`✅ [AUDIT] Tarefa atualizada - Tenant: ${currentTenant?.name}, Tarefa: ${data.title}`);

      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['tasks', currentTenant?.id]
        });
        
        toast({
          title: "Tarefa atualizada",
          description: "Tarefa atualizada com sucesso.",
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao atualizar tarefa",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  );

  // 🔐 MUTATION SEGURA PARA DELETAR TAREFA - SEMPRE INICIALIZADA
  const deleteTaskMutation = useSecureTenantMutation(
    async (supabase: SupabaseClient, tenantId: string, taskId: string) => {
      // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA
      if (!hasAccess || !tenantId) {
        throw new Error('Tenant não definido ou acesso negado');
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('tenant_id', tenantId); // 🛡️ FILTRO DUPLO DE SEGURANÇA

      if (error) {
        console.error('❌ [AUDIT] Erro ao deletar tarefa:', error);
        throw error;
      }

      // 🔍 AUDIT LOG OBRIGATÓRIO
      console.log(`✅ [AUDIT] Tarefa deletada - Tenant: ${currentTenant?.name}, ID: ${taskId}`);

      return taskId;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['tasks', currentTenant?.id]
        });
        
        toast({
          title: "Tarefa deletada",
          description: "Tarefa deletada com sucesso.",
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao deletar tarefa",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  );

  // 🔐 FUNÇÃO SEGURA PARA BUSCAR TAREFA POR ID - APENAS SE TIVER ACESSO
  const getTask = useCallback(async (taskId: string): Promise<SecureTask | null> => {
    // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA
    if (!hasAccess || !currentTenant?.id) {
      throw new Error('Tenant não definido ou acesso negado');
    }

    // 🛡️ CONFIGURAR CONTEXTO DE TENANT
    await supabase.rpc('set_tenant_context_simple', { 
      p_tenant_id: currentTenant.id 
    });

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('tenant_id', currentTenant.id) // 🛡️ FILTRO CRÍTICO
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Tarefa não encontrada
      }
      console.error('❌ [AUDIT] Erro ao buscar tarefa:', error);
      throw error;
    }

    // 🛡️ VALIDAÇÃO DUPLA
    if (data.tenant_id !== currentTenant.id) {
      console.error('🚨 [SECURITY VIOLATION] Tarefa de outro tenant acessada');
      throw new Error('Violação de segurança: tarefa de outro tenant');
    }

    // 🔍 AUDIT LOG OBRIGATÓRIO
    console.log(`✅ [AUDIT] Tarefa acessada - Tenant: ${currentTenant.name}, Tarefa: ${data.title}`);

    return data;
  }, [hasAccess, currentTenant?.id, currentTenant?.name]);

  // 🛡️ GUARD CLAUSE OBRIGATÓRIO
  if (!hasAccess) {
    return {
      tasks: [],
      isLoading: false,
      error: new Error(accessError || 'Acesso negado'),
      refetch: () => Promise.resolve(),
      createTask: () => Promise.reject(new Error('Acesso negado')),
      updateTask: () => Promise.reject(new Error('Acesso negado')),
      deleteTask: () => Promise.reject(new Error('Acesso negado')),
      getTask: () => Promise.reject(new Error('Acesso negado')),
      isCreating: false,
      isUpdating: false,
      isDeleting: false
    };
  }

  return {
    // Dados
    tasks: tasksData || [],
    isLoading,
    error,
    
    // Ações
    refetch,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    getTask,
    
    // Estados das mutations
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending
  };
}
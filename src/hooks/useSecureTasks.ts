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
  assigned_to?: string;
  customer_id?: string;
  charge_id?: string;
  created_at: string;
  updated_at: string;
}

// AIDEV-NOTE: Parâmetros para criação/atualização de tarefa
// Atualizada para refletir campos obrigatórios da tabela tasks
interface TaskData {
  title: string;                    // 🛡️ OBRIGATÓRIO na tabela
  description?: string;             // ✅ Opcional na tabela
  status?: 'pending' | 'in_progress' | 'completed'; // ✅ Opcional (default: pending)
  priority?: 'low' | 'medium' | 'high';             // ✅ Opcional (default: medium)
  due_date?: string;                // ✅ Opcional na tabela
  assigned_to?: string;             // ✅ Opcional na tabela
  customer_id?: string;             // ✅ Opcional na tabela
  charge_id?: string;               // ✅ Opcional na tabela
}

// AIDEV-NOTE: Parâmetros para filtros seguros
interface SecureTaskFilters {
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  assigned_to?: string;
  customer_id?: string;
  charge_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// AIDEV-NOTE: Função para sanitizar dados da tarefa, evitando referências circulares
// Remove propriedades extras que não pertencem à tabela tasks
// Inclui validação robusta para campos obrigatórios
function sanitizeTaskData(taskData: TaskData): TaskData {
  // 🔍 DEBUG LOG - Verificar dados recebidos
  console.log('🔍 [DEBUG] sanitizeTaskData - Dados recebidos:', {
    taskData,
    title: taskData?.title,
    titleType: typeof taskData?.title,
    titleLength: taskData?.title?.length,
    trimmedTitle: taskData?.title?.trim(),
    trimmedLength: taskData?.title?.trim()?.length
  });

  // 🛡️ VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
  if (!taskData.title || taskData.title.trim() === '') {
    console.error('🚨 [DEBUG] Campo title inválido:', {
      title: taskData.title,
      titleType: typeof taskData.title,
      trimmed: taskData.title?.trim(),
      fullData: taskData
    });
    throw new Error('Campo "title" é obrigatório e não pode estar vazio');
  }

  const sanitizedData = {
    title: taskData.title.trim(),
    description: taskData.description?.trim() || null,
    status: taskData.status || 'pending',
    priority: taskData.priority || 'medium',
    due_date: taskData.due_date || null,
    assigned_to: taskData.assigned_to?.trim() || null,
    customer_id: taskData.customer_id || null,
    charge_id: taskData.charge_id || null
  };

  // 🔍 DEBUG LOG - Verificar dados sanitizados
  console.log('✅ [DEBUG] sanitizeTaskData - Dados sanitizados:', sanitizedData);

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
          customer:customers(
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
        query = query.eq('customer_id', customer_id);
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
      const sanitizedData = sanitizeTaskData(taskData);

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: sanitizedData.title,
          description: sanitizedData.description,
          status: sanitizedData.status,
          priority: sanitizedData.priority,
          due_date: sanitizedData.due_date,
          assigned_to: sanitizedData.assigned_to,
          customer_id: sanitizedData.customer_id,
          charge_id: sanitizedData.charge_id,
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
      const sanitizedData = sanitizeTaskData(taskData);

      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: sanitizedData.title,
          description: sanitizedData.description,
          status: sanitizedData.status,
          priority: sanitizedData.priority,
          due_date: sanitizedData.due_date,
          assigned_to: sanitizedData.assigned_to,
          customer_id: sanitizedData.customer_id,
          charge_id: sanitizedData.charge_id,
          updated_at: new Date().toISOString()
        })
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

/**
 * AIDEV-NOTE: Função para verificar e garantir que a sessão está ativa
 * Resolve o problema de auth.uid() retornando null apesar do frontend estar autenticado
 */
async function ensureActiveSession(): Promise<boolean> {
  try {
    // Verificar sessão atual
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[useSecureTasks] Erro ao verificar sessão:', error);
      return false;
    }
    
    if (!session) {
      console.warn('[useSecureTasks] Nenhuma sessão ativa encontrada');
      return false;
    }
    
    // Verificar se o token está válido fazendo uma consulta simples
    const { data: authTest, error: authError } = await supabase
      .from('tenant_users')
      .select('user_id')
      .eq('user_id', session.user.id)
      .limit(1);
    
    if (authError) {
      console.error('[useSecureTasks] Erro na verificação de autenticação:', authError);
      
      // Se o erro for de autenticação, tentar refresh do token
      if (authError.code === 'PGRST301' || authError.message?.includes('JWT')) {
        console.log('[useSecureTasks] Tentando refresh do token...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[useSecureTasks] Erro no refresh do token:', refreshError);
          return false;
        }
        
        console.log('[useSecureTasks] Token refreshed com sucesso');
        return refreshData.session !== null;
      }
      
      return false;
    }
    
    console.log('[useSecureTasks] Sessão verificada e ativa');
    return true;
  } catch (error) {
    console.error('[useSecureTasks] Erro inesperado na verificação de sessão:', error);
    return false;
  }
}

  // Mutation para criar nova tarefa
  const createTaskMutation = useSecureTenantMutation({
    mutationFn: async (newTask: Omit<TaskData, 'id' | 'created_at' | 'updated_at'>) => {
      // AIDEV-NOTE: Verificação obrigatória de acesso antes de qualquer operação
      if (!hasAccess) {
        throw new Error('Acesso negado: usuário não tem permissão para criar tarefas');
      }

      // AIDEV-NOTE: Verificar e garantir sessão ativa antes da operação crítica
      const sessionActive = await ensureActiveSession();
      if (!sessionActive) {
        throw new Error('Sessão inválida ou expirada. Faça login novamente.');
      }

      // AIDEV-NOTE: Sanitizar dados antes da inserção
      const sanitizedTask = sanitizeTaskData(newTask);
      
      // AIDEV-NOTE: Inserir tenant_id obrigatoriamente
      const taskWithTenant = {
        ...sanitizedTask,
        tenant_id: tenantId,
      };

      // AIDEV-NOTE: Configurar contexto de tenant antes da operação
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId 
      });

      // AIDEV-NOTE: Log de debug para rastrear o estado da sessão
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[useSecureTasks] Estado da sessão antes da inserção:', {
        hasSession: !!session,
        userId: session?.user?.id,
        tenantId,
        timestamp: new Date().toISOString()
      });

      // Inserir nova tarefa
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskWithTenant)
        .select()
        .single();

      if (error) {
        console.error('[useSecureTasks] Erro ao criar tarefa:', error);
        throw error;
      }

      // AIDEV-NOTE: Validação dupla - garantir que a tarefa criada pertence ao tenant correto
      if (data.tenant_id !== tenantId) {
        console.error('[useSecureTasks] ERRO DE SEGURANÇA: Tarefa criada com tenant_id incorreto', {
          expected: tenantId,
          actual: data.tenant_id
        });
        throw new Error('Erro de segurança: tenant_id incorreto');
      }

      // AIDEV-NOTE: Log de auditoria obrigatório
      console.log('[useSecureTasks] Tarefa criada com sucesso:', {
        taskId: data.id,
        tenantId: data.tenant_id,
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      });

      return data;
    },
    onSuccess: (data) => {
      toast.success('Tarefa criada com sucesso!');
      console.log('[useSecureTasks] Tarefa criada:', data);
    },
    onError: (error) => {
      console.error('[useSecureTasks] Erro ao criar tarefa:', error);
      
      // AIDEV-NOTE: Tratamento específico para erro de RLS
      if (error.code === '42501') {
        toast.error('Erro de permissão: Verifique se você está logado e tem acesso ao tenant correto.');
      } else if (error.message?.includes('Sessão inválida')) {
        toast.error('Sessão expirada. Redirecionando para login...');
        // Aqui você pode adicionar lógica para redirecionar para login
      } else {
        toast.error('Erro ao criar tarefa. Tente novamente.');
      }
    },
  });
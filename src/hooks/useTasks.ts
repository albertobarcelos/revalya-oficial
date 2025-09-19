// AIDEV-NOTE: Hook multi-tenant para gerenciamento de tarefas
// Implementa isolamento por tenant_id em todas as operações CRUD
// Utiliza useTenantQuery para garantir filtros automáticos por tenant
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTenantQuery } from '@/features/tenant/hooks/useTenantQuery'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

// AIDEV-NOTE: Hook migrado para arquitetura multi-tenant por abas
// Todas as queries agora incluem filtro automático por tenant_id
// seguindo o padrão estabelecido no manual multi-tenant

// AIDEV-NOTE: Interface Task com tenant_id obrigatório para isolamento multi-tenant
// Inclui foreign keys para customers (customer_id) e charges (charge_id)
export interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  assigned_to?: string
  customer_id?: string
  charge_id?: string
  tenant_id: string // AIDEV-NOTE: Campo obrigatório para isolamento por tenant
  created_at: string
  updated_at: string
}

export interface CreateTaskData {
  title: string
  description?: string
  status?: 'pending' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
  due_date?: string
  assigned_to?: string
  customer_id?: string
  charge_id?: string
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  id: string
}

/**
 * Hook para gerenciar tarefas com contexto multi-tenant
 * Segue o padrão estabelecido no manual multi-tenant da Revalya
 */
export function useTasks() {
  const { tenantId, createTenantQuery, isLoading: tenantLoading, error: tenantError } = useTenantQuery()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // AIDEV-NOTE: Query multi-tenant com filtro automático por tenant_id
  // createTenantQuery garante que apenas tarefas do tenant atual sejam retornadas
  const tasksQuery = useQuery({
    queryKey: ['tasks', tenantId],
    queryFn: async (): Promise<Task[]> => {
      if (!tenantId) {
        throw new Error('Contexto de tenant não inicializado')
      }

      const { data, error } = await createTenantQuery('tasks', `
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
      .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar tarefas:', error)
        throw new Error(`Erro ao carregar tarefas: ${error.message}`)
      }

      return data || []
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  // AIDEV-NOTE: Mutação para criar tarefa com tenant_id automático
  // tenant_id é injetado automaticamente para garantir isolamento por tenant
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: CreateTaskData): Promise<Task> => {
      if (!tenantId) {
        throw new Error('Contexto de tenant não inicializado')
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          tenant_id: tenantId, // AIDEV-NOTE: tenant_id injetado automaticamente
          status: taskData.status || 'pending',
          priority: taskData.priority || 'medium'
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar tarefa:', error)
        throw new Error(`Erro ao criar tarefa: ${error.message}`)
      }

      return data
    },
    onSuccess: (newTask) => {
      // Invalidar cache para recarregar a lista
      queryClient.invalidateQueries({ queryKey: ['tasks', tenantId] })
      
      toast({
        title: 'Sucesso',
        description: 'Tarefa criada com sucesso!',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  // AIDEV-NOTE: Mutação para atualizar tarefa (mantém tenant_id)
  const updateTaskMutation = useMutation({
    mutationFn: async (taskData: UpdateTaskData): Promise<Task> => {
      if (!tenantId) {
        throw new Error('Contexto de tenant não inicializado')
      }

      const { id, ...updateData } = taskData

      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updateData,
          updated_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        })
        .eq('id', id)
        .eq('tenant_id', tenantId) // Segurança: só atualiza se for do mesmo tenant
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar tarefa:', error)
        throw new Error(`Erro ao atualizar tarefa: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', tenantId] })
      
      toast({
        title: 'Sucesso',
        description: 'Tarefa atualizada com sucesso!',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  // AIDEV-NOTE: Mutação para deletar tarefa (com verificação de tenant)
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      if (!tenantId) {
        throw new Error('Contexto de tenant não inicializado')
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('tenant_id', tenantId) // Segurança: só deleta se for do mesmo tenant

      if (error) {
        console.error('Erro ao deletar tarefa:', error)
        throw new Error(`Erro ao deletar tarefa: ${error.message}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', tenantId] })
      
      toast({
        title: 'Sucesso',
        description: 'Tarefa deletada com sucesso!',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  return {
    // Dados
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading || tenantLoading,
    error: tasksQuery.error || tenantError,
    
    // Mutações
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    
    // Estados das mutações
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    
    // Contexto
    tenantId,
    
    // Funções auxiliares
    refetch: tasksQuery.refetch
  }
}

export default useTasks
// AIDEV-NOTE: Página de tarefas adaptada para sistema multi-tenant
// Migrada para usar hook useTasks que implementa filtros automáticos por tenant_id
// Garante isolamento completo de dados entre diferentes tenants
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, isBefore, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Layout } from '@/components/layout/Layout';
import { Bell, CheckSquare, Eye, PlusIcon } from 'lucide-react';
import { useCharges } from '@/hooks/useCharges';
import { ChargeDetailDrawer } from '@/components/charges/ChargeDetailDrawer';
import type { Cobranca } from '@/types/database';
import { SearchableSelect } from "@/components/ui/searchable-select";
import { clientsService } from "@/services/clientsService";
import { useTasks, type Task, type CreateTaskData, type UpdateTaskData } from '@/hooks/useTasks'; // AIDEV-NOTE: Hook multi-tenant
import { useTenantAccessGuard, useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';

// AIDEV-NOTE: Tipo Task movido para hook useTasks para consistência multi-tenant
// Hook useTasks implementa filtros automáticos por tenant_id em todas as operações

// AIDEV-NOTE: Componente principal da página de tarefas multi-tenant
// Migrado para usar hook useTasks que garante isolamento por tenant_id
export default function Tasks() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  
  // 1. VALIDAÇÃO DE ACESSO (OBRIGATÓRIO)
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const queryClient = useQueryClient();
  
  // 2. HOOK SEGURO PARA DADOS (OBRIGATÓRIO)
  const { data: tasksData, isLoading: isTasksLoading } = useSecureTenantQuery(
    ['tasks'],
    async (supabase, tenantId) => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // VALIDAÇÃO DUPLA: verificar se todos os dados pertencem ao tenant correto
      const invalidData = data?.filter(item => item.tenant_id !== tenantId);
      if (invalidData?.length > 0) {
        console.error('[SECURITY] Violação de segurança detectada - dados de outro tenant:', invalidData);
        throw new Error('Violação de segurança: dados de outro tenant detectados');
      }
      
      return data || [];
    }
  );
  
  // Usar dados seguros
  const tasks = tasksData || [];
  
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [selectedCharge, setSelectedCharge] = useState<Cobranca | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskClient, setNewTaskClient] = useState('');
  const [newTaskClientId, setNewTaskClientId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskId: string | null;
    taskTitle: string;
  }>({ isOpen: false, taskId: null, taskTitle: '' });
  
  // 🚨 FORÇA LIMPEZA COMPLETA DO CACHE AO TROCAR TENANT
  React.useEffect(() => {
    if (currentTenant?.id) {
      console.log(`🧹 [CACHE] Limpando cache para tenant: ${currentTenant.name} (${currentTenant.id})`);
      // Invalidar TODAS as queries de tarefas
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Remover dados em cache que possam estar contaminados
      queryClient.removeQueries({ queryKey: ['tasks'] });
    }
  }, [currentTenant?.id, queryClient]);
  // Novos estados para controlar a edição de tarefas
  const [isEditMode, setIsEditMode] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<string | null>(null);
  const { charges: chargesData } = useCharges({
    page: 1,
    limit: 1000,
    dateRange: undefined,
    onlyOverdue: false,
    status: "all"
  });

  // AIDEV-NOTE: Removido useEffect para loadTasks - agora gerenciado pelo hook useTasks
  // Hook useTasks gerencia automaticamente o carregamento com filtro por tenant_id

  useEffect(() => {
    // Forçar overflow hidden no body
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      // Restaurar quando o componente for desmontado
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // AIDEV-NOTE: Função loadTasks removida - agora usa hook useTasks que gerencia
  // automaticamente as queries com filtro por tenant_id e cache por tenant

  // 🔍 DEBUG: Log do estado do tenant na página
  console.log(`🔍 [DEBUG] Tasks Page - Tenant:`, {
    hasAccess,
    accessError,
    currentTenant,
    tenantId: currentTenant?.id,
    tenantName: currentTenant?.name,
    tenantSlug: currentTenant?.slug,
    urlSlug: slug,
    slugMatch: currentTenant?.slug === slug
  });
  
  // 🚨 VALIDAÇÃO CRÍTICA: Verificar se o tenant corresponde ao slug da URL
  if (currentTenant && currentTenant.slug !== slug) {
    console.error(`🚨 [SECURITY BREACH] Tenant slug não corresponde à URL!`, {
      currentTenantSlug: currentTenant.slug,
      urlSlug: slug,
      currentTenantName: currentTenant.name,
      currentTenantId: currentTenant.id
    });
    
    // Forçar redirecionamento para o portal
    console.log(`🔄 [REDIRECT] Redirecionando para portal devido a incompatibilidade de tenant`);
    window.location.href = `/meus-aplicativos`;
    return null;
  }

  // 3. GUARD CLAUSE (OBRIGATÓRIO)
  if (!hasAccess) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">{accessError}</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  // 4. AUDIT LOG (OBRIGATÓRIO)
  useEffect(() => {
    if (currentTenant) {
      console.log(`[AUDIT] Acessando página de tarefas - Tenant: ${currentTenant.name} (${currentTenant.id})`);
      console.log(`[SECURITY] Validação de acesso aprovada para tenant: ${currentTenant.slug}`);
    }
  }, [currentTenant]);
  
  // 🔍 AUDIT LOG: Página renderizada com sucesso
  console.log(`✅ [AUDIT] Página Tarefas renderizada para tenant: ${currentTenant?.name} (${currentTenant?.id})`);

  const addTask = async () => {
    if (!taskInput.trim()) return;
    
    // VALIDAÇÃO DE SEGURANÇA
    if (!currentTenant?.id) {
      toast({
        title: 'Erro de segurança',
        description: 'Tenant não definido. Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // AUDIT LOG
      console.log(`[AUDIT] Criando tarefa rápida - Tenant: ${currentTenant.name}`);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: taskInput,
          status: 'pending',
          priority: 'medium',
          tenant_id: currentTenant.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // VALIDAÇÃO DUPLA
      if (data.tenant_id !== currentTenant.id) {
        throw new Error('Violação de segurança: tarefa criada para tenant incorreto');
      }
      
      setTaskInput('');
      
      // Recarregar dados
      window.location.reload();
      
      toast({
        title: 'Tarefa adicionada',
        description: 'A tarefa foi criada com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a tarefa.',
        variant: 'destructive',
      });
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: 'pending' | 'completed') => {
    // VALIDAÇÃO DE SEGURANÇA
    if (!currentTenant?.id) {
      toast({
        title: 'Erro de segurança',
        description: 'Tenant não definido. Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }
      
      // AUDIT LOG
      console.log(`[AUDIT] Alterando status da tarefa ${taskId} para ${newStatus} - Tenant: ${currentTenant.name}`);
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('tenant_id', currentTenant.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // VALIDAÇÃO DUPLA
      if (data.tenant_id !== currentTenant.id) {
        throw new Error('Violação de segurança: tentativa de alterar tarefa de outro tenant');
      }
      
      // Recarregar dados
      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status da tarefa.',
        variant: 'destructive',
      });
    }
  };

  const confirmDeleteTask = (taskId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setTaskToDelete(taskId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!taskToDelete) return;
    
    // VALIDAÇÃO DE SEGURANÇA
    if (!currentTenant?.id) {
      toast({
        title: 'Erro de segurança',
        description: 'Tenant não definido. Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // AUDIT LOG
      console.log(`[AUDIT] Excluindo tarefa ${taskToDelete} - Tenant: ${currentTenant.name}`);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
      
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
      
      // Recarregar dados
      window.location.reload();
      
      toast({
        title: 'Tarefa excluída',
        description: 'A tarefa foi removida com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a tarefa.',
        variant: 'destructive',
      });
    }
  };

  const createTaskFromCharge = async (charge: Cobranca) => {
    // VALIDAÇÃO DE SEGURANÇA
    if (!currentTenant?.id) {
      toast({
        title: 'Erro de segurança',
        description: 'Tenant não definido. Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const dueDate = charge.data_vencimento;
      const today = new Date().toISOString().split('T')[0];
      
      // Definir prioridade com base na data de vencimento
      let priority: 'low' | 'medium' | 'high' = 'medium';
      let title = '';
      
      if (dueDate < today) {
        priority = 'high';
        title = `Cobrar pagamento atrasado`;
      } else if (dueDate === today) {
        priority = 'high';
        title = `Verificar pagamento do dia`;
      } else {
        const daysToVencimento = differenceInDays(new Date(dueDate), new Date(today));
        
        if (daysToVencimento <= 2) {
          priority = 'medium';
          title = `Enviar lembrete de pagamento`;
        } else {
          priority = 'low';
          title = `Confirmar dados para pagamento`;
        }
      }
      
      // AUDIT LOG
      console.log(`[AUDIT] Criando tarefa a partir de cobrança ${charge.id} - Tenant: ${currentTenant.name}`);
      
      const newTask = {
        title,
        client_name: charge.customer?.name || 'Cliente',
        client_id: charge.customer?.id,
        charge_id: charge.id,
        due_date: dueDate,
        priority,
        status: 'pending',
        created_at: new Date().toISOString(),
        tenant_id: currentTenant.id
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(newTask)
        .select('id')
        .single();
      
      if (error) {
        console.error("Erro ao criar tarefa a partir da cobrança:", error);
        throw error;
      }
      
      // VALIDAÇÃO DUPLA
      if (data.tenant_id !== currentTenant.id) {
        throw new Error('Violação de segurança: tarefa criada para tenant incorreto');
      }
      
      // Recarregar dados
      window.location.reload();
      
      toast({
        title: "Tarefa criada",
        description: `Tarefa "${title}" para ${charge.customer?.name} criada com sucesso.`,
      });
      
      return data;
    } catch (error) {
      console.error("Erro ao criar tarefa a partir da cobrança:", error);
      toast({
        title: "Erro ao criar tarefa",
        description: "Não foi possível criar uma tarefa para esta cobrança.",
        variant: "destructive",
      });
      return null;
    }
  };

  const checkTaskExistsForCharge = async (chargeId: string): Promise<boolean> => {
    // VALIDAÇÃO DE SEGURANÇA
    if (!currentTenant?.id) {
      console.error('[SECURITY] Tentativa de verificar tarefa sem tenant definido');
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .eq('charge_id', chargeId)
        .eq('tenant_id', currentTenant.id)
        .limit(1);
      
      if (error) {
        console.error('Erro ao verificar tarefa existente:', error);
        return false;
      }
      
      return !!data && data.length > 0;
    } catch (error) {
      console.error('Erro ao verificar tarefa existente:', error);
      return false;
    }
  };

  const generateTasksFromUpcomingCharges = async (daysAhead: number = 5) => {
    // VALIDAÇÃO DE SEGURANÇA
    if (!currentTenant?.id) {
      toast({
        title: 'Erro de segurança',
        description: 'Tenant não definido. Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!chargesData?.data) return;
    
    setIsGeneratingTasks(true);
    const today = new Date();
    let tasksCreated = 0;
    let tasksSkipped = 0;
    
    // AUDIT LOG
    console.log(`[AUDIT] Gerando tarefas automáticas para próximos ${daysAhead} dias - Tenant: ${currentTenant.name}`);
    
    try {
      // Filtrar cobranças pendentes com vencimento nos próximos N dias
      const upcomingCharges = chargesData.data.filter(charge => {
        if (charge.status !== 'PENDING') return false;
        
        if (!charge.data_vencimento) return false;
        
        const dueDate = new Date(charge.data_vencimento);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays >= 0 && diffDays <= daysAhead;
      });
      
      // Para cada cobrança, verificar se já existe tarefa e criar se necessário
      for (const charge of upcomingCharges) {
        const taskExists = await checkTaskExistsForCharge(charge.id);
        
        if (!taskExists) {
          // Determinar prioridade baseada na proximidade do vencimento
          const dueDate = new Date(charge.data_vencimento);
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let priority: 'low' | 'medium' | 'high' = 'medium';
          if (diffDays <= 1) {
            priority = 'high';
          } else if (diffDays <= 3) {
            priority = 'medium';
          } else {
            priority = 'low';
          }
          
          // Criar a tarefa
          const task = {
            title: `Cobrança de ${charge.customer?.name || 'Cliente'} - R$ ${Number(charge.valor).toFixed(2)}`,
            description: `Vencimento em ${format(dueDate, 'dd/MM/yyyy')}. ${charge.descricao || ''}`,
            client_name: charge.customer?.name,
            client_id: charge.customer?.id,
            charge_id: charge.id,
            due_date: charge.data_vencimento,
            priority,
            status: 'pending',
            tenant_id: currentTenant.id
          };
          
          const { data, error } = await supabase
            .from('tasks')
            .insert(task)
            .select()
            .single();
          
          if (!error && data) {
            // VALIDAÇÃO DUPLA
            if (data.tenant_id !== currentTenant.id) {
              console.error('[SECURITY] Violação detectada: tarefa criada para tenant incorreto');
              tasksSkipped++;
            } else {
              tasksCreated++;
            }
          } else {
            console.error('Erro ao criar tarefa automática:', error);
            tasksSkipped++;
          }
        } else {
          tasksSkipped++;
        }
      }
      
      // Recarregar dados
      window.location.reload();
      
      // Exibir toast de sucesso
      toast({
        title: 'Tarefas geradas com sucesso',
        description: `${tasksCreated} tarefas criadas, ${tasksSkipped} ignoradas (já existentes ou com erro)`,
        variant: tasksCreated > 0 ? 'default' : 'destructive',
      });
      
    } catch (error) {
      console.error('Erro ao gerar tarefas automáticas:', error);
      toast({
        title: 'Erro ao gerar tarefas',
        description: 'Ocorreu um erro ao tentar gerar tarefas automáticas',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const sendManualReminder = async (chargeId: string) => {
    try {
      const { data, error } = await supabase.rpc('send_charge_reminder', {
        charge_id: chargeId
      });
      
      if (error) throw error;
      
      toast({
        title: 'Lembrete enviado',
        description: 'O lembrete foi enviado com sucesso para o operador financeiro',
      });
      
      return data;
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      toast({
        title: 'Erro ao enviar lembrete',
        description: 'Não foi possível enviar o lembrete. Tente novamente.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleViewCharge = (charge: Cobranca) => {
    setSelectedCharge(charge);
    setIsDetailDrawerOpen(true);
  };

  const resetNewTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskClient('');
    setNewTaskClientId('');
    setNewTaskPriority('medium');
    setNewTaskDueDate('');
    setNewTaskDescription('');
    setIsNewTaskDialogOpen(false);
    setIsEditMode(false);
    setTaskToEdit(null);
  };

  const startTaskEditing = (task: Task) => {
    // Preencher o formulário com os dados da tarefa
    setNewTaskTitle(task.title);
    setNewTaskClient(task.clientName || '');
    setNewTaskClientId(task.clientId || '');
    setNewTaskPriority(task.priority);
    setNewTaskDueDate(task.dueDate || '');
    setNewTaskDescription(task.description || '');
    
    // Configurar o modo de edição
    setIsEditMode(true);
    setTaskToEdit(task.id);
    
    // Abrir o diálogo
    setIsNewTaskDialogOpen(true);
  };

  // AIDEV-NOTE: Função migrada para usar hook multi-tenant
  // createTask e updateTask do hook garantem isolamento automático por tenant_id
  const createNewTaskFromForm = async () => {
    // VALIDAÇÃO DE SEGURANÇA
    if (!currentTenant?.id) {
      toast({
        title: 'Erro de segurança',
        description: 'Tenant não definido. Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!newTaskTitle.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, insira um título para a tarefa.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAddingTask(true);
    
    try {
      const taskData = {
        title: newTaskTitle,
        client_name: newTaskClient,
        client_id: newTaskClientId || undefined,
        description: newTaskDescription || undefined,
        priority: newTaskPriority,
        due_date: newTaskDueDate || undefined,
        status: 'pending' as const,
        tenant_id: currentTenant.id
      };
      
      if (isEditMode && taskToEdit) {
        // AUDIT LOG
        console.log(`[AUDIT] Atualizando tarefa ${taskToEdit} - Tenant: ${currentTenant.name}`);
        
        // Atualizar tarefa existente
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', taskToEdit)
          .eq('tenant_id', currentTenant.id)
          .select()
          .single();
        
        if (error) throw error;
        
        // VALIDAÇÃO DUPLA
        if (data.tenant_id !== currentTenant.id) {
          throw new Error('Violação de segurança: tentativa de alterar tarefa de outro tenant');
        }
      } else {
        // AUDIT LOG
        console.log(`[AUDIT] Criando nova tarefa - Tenant: ${currentTenant.name}`);
        
        // Criar nova tarefa
        const { data, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();
        
        if (error) throw error;
        
        // VALIDAÇÃO DUPLA
        if (data.tenant_id !== currentTenant.id) {
          throw new Error('Violação de segurança: tarefa criada para tenant incorreto');
        }
      }
      
      resetNewTaskForm();
      
      // Recarregar dados
      window.location.reload();
      
      toast({
        title: isEditMode ? 'Tarefa atualizada' : 'Tarefa criada',
        description: `A tarefa foi ${isEditMode ? 'atualizada' : 'criada'} com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao " + (isEditMode ? "atualizar" : "criar") + " tarefa:", error);
      toast({
        title: 'Erro',
        description: `Não foi possível ${isEditMode ? 'atualizar' : 'criar'} a tarefa.`,
        variant: 'destructive',
      });
    } finally {
      setIsAddingTask(false);
    }
  };

  return (
    <Layout>
      <div className="h-full w-full overflow-hidden flex flex-col p-6">
        <h1 className="text-2xl font-bold mb-6">Gerenciamento de Tarefas - {currentTenant?.name}</h1>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => generateTasksFromUpcomingCharges()} 
              disabled={isGeneratingTasks || isTasksLoading}
            >
              {isGeneratingTasks ? 'Gerando...' : 'Gerar tarefas automáticas'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              disabled={isTasksLoading}
            >
              {isTasksLoading ? 'Carregando...' : 'Atualizar tarefas'}
            </Button>
          </div>
          
          <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <PlusIcon className="h-3.5 w-3.5 mr-1" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Editar Tarefa" : "Adicionar Nova Tarefa"}</DialogTitle>
                <DialogDescription>
                  {isEditMode 
                    ? "Edite os detalhes da tarefa selecionada."
                    : "Crie uma nova tarefa para acompanhar suas atividades financeiras."}
                  <span className="mt-1 block text-xs">
                    Busque e selecione um cliente para associar à tarefa
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Tarefa</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Verificar pagamento de boleto"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente/Empresa</Label>
                  <SearchableSelect
                    value={newTaskClientId}
                    onChange={(value) => {
                      setNewTaskClientId(value);
                      // Buscar o nome do cliente do cache ou fazer uma consulta específica
                      // AIDEV-NOTE: Incluir tenant_id para isolamento de dados multi-tenant
                      clientsService.getClientById(value, currentTenant?.id).then(client => {
                        if (client) {
                          setNewTaskClient(client.name);
                        }
                      });
                    }}
                    placeholder="Selecione um cliente"
                    inModal={true}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Detalhes</Label>
                  <textarea
                    id="description"
                    placeholder="Detalhes sobre esta tarefa"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select value={newTaskPriority} onValueChange={(value: any) => setNewTaskPriority(value)}>
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Data Limite</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetNewTaskForm}>Cancelar</Button>
                <Button onClick={createNewTaskFromForm} disabled={isAddingTask}>
                  {isAddingTask 
                    ? (isEditMode ? 'Salvando...' : 'Adicionando...') 
                    : (isEditMode ? 'Salvar Alterações' : 'Adicionar Tarefa')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="mb-6">
          <div className="flex w-full max-w-2xl items-center space-x-2">
            <Input
              placeholder="Adicionar nova tarefa (ex: Cobrar cliente XYZ)"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              className="flex-grow"
            />
            <Button 
              onClick={addTask} 
              disabled={!taskInput.trim()} 
              className="flex-shrink-0"
            >
              Adicionar Tarefa
            </Button>
          </div>
        </div>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-hidden">
          <div className="h-full flex flex-col overflow-hidden">
            <div className="bg-background border rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex-none p-4 border-b">
                <h3 className="font-medium flex items-center">
                  <div className="w-3 h-3 rounded-full bg-warning mr-2"></div>
                  Tarefas Pendentes ({tasks.filter(task => task.status === 'pending').length})
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {isTasksLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-muted rounded"></div>
                    ))}
                  </div>
                ) : tasks.filter(task => task.status === 'pending').length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    Não há tarefas pendentes
                  </div>
                ) : (
                  <div className="space-y-3 w-full max-w-full">
                    {tasks
                      .filter(task => task.status === 'pending')
                      .sort((a, b) => {
                        // Ordenar por prioridade (high -> medium -> low)
                        const priorityOrder = { high: 0, medium: 1, low: 2 };
                        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                        if (priorityDiff !== 0) return priorityDiff;
                        
                        // Se mesma prioridade, ordenar por data de vencimento (mais próximo primeiro)
                        if (a.dueDate && b.dueDate) {
                          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                        }
                        
                        // Se não tiver data de vencimento, ordenar por data de criação (mais recente primeiro)
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                      })
                      .map(task => (
                        <div
                          key={task.id}
                          className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow
                            ${task.priority === 'high' ? 'border-l-4 border-l-red-500' : 
                              task.priority === 'medium' ? 'border-l-4 border-l-amber-500' : 
                              'border-l-4 border-l-blue-500'}
                            w-full max-w-full overflow-hidden"
                        >
                          <div className="flex items-start gap-3 w-full">
                            <Checkbox
                              checked={task.status === 'completed'}
                              onCheckedChange={(checked) => 
                                toggleTaskStatus(task.id, task.status)
                              }
                              className="flex-shrink-0 mt-1"
                            />
                            <div className="flex-grow min-w-0 overflow-hidden">
                              <div className="flex items-start justify-between w-full">
                                <h4 className="font-medium truncate max-w-[70%]">{task.title}</h4>
                                <div className="flex items-center flex-wrap gap-1 mt-1">
                                  {task.chargeId && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (task.chargeId && chargesData?.data) {
                                            const charge = chargesData.data.find(c => c.id === task.chargeId);
                                            if (charge) {
                                              handleViewCharge(charge);
                                            }
                                          }
                                        }}
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Ver cobrança
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          sendManualReminder(task.chargeId!);
                                        }}
                                      >
                                        <Bell className="h-3 w-3 mr-1" />
                                        Lembrete
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startTaskEditing(task);
                                    }}
                                  >
                                    <span className="sr-only">Editar</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                    </svg>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirmDeleteTask(task.id, e);
                                    }}
                                  >
                                    <span className="sr-only">Excluir</span>
                                    ×
                                  </Button>
                                </div>
                              </div>
                              
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 break-words">
                                  {task.description}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                {task.clientName && (
                                  <span className="text-xs text-muted-foreground flex items-center">
                                    <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full mr-1"></span>
                                    {task.clientName}
                                  </span>
                                )}
                                
                                {task.dueDate && (
                                  <span className={`text-xs flex items-center ${
                                    isBefore(parseISO(task.dueDate), new Date()) 
                                      ? 'text-danger' 
                                      : 'text-muted-foreground'
                                  }`}>
                                    <span className="inline-block w-2 h-2 bg-gray-300 rounded-full mr-1"></span>
                                    Vencimento: {format(parseISO(task.dueDate), 'dd/MM/yyyy')}
                                  </span>
                                )}
                                
                                <span className={`text-xs flex items-center ${
                                  task.priority === 'high' 
                                    ? 'text-danger' 
                                    : task.priority === 'medium'
                                      ? 'text-warning'
                                      : 'text-primary'
                                }`}>
                                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                    task.priority === 'high' 
                                      ? 'bg-danger' 
                                      : task.priority === 'medium'
                                        ? 'bg-warning'
                                        : 'bg-primary'
                                  }`}></span>
                                  Prioridade {task.priority === 'high' 
                                    ? 'alta' 
                                    : task.priority === 'medium'
                                      ? 'média'
                                      : 'baixa'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="h-full flex flex-col overflow-hidden">
            <div className="bg-background border rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b shrink-0">
                <h3 className="font-medium flex items-center">
                  <div className="w-3 h-3 rounded-full bg-success mr-2"></div>
                  Tarefas Concluídas ({tasks.filter(task => task.status === 'completed').length})
                </h3>
                {tasks.filter(task => task.status === 'completed').length > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-xs h-6 px-2"
                    onClick={async () => {
                      const completedTaskIds = tasks
                        .filter(task => task.status === 'completed')
                        .map(task => task.id);
                        
                      if (completedTaskIds.length === 0) return;
                      
                      try {
                        // AUDIT LOG
                        console.log(`[AUDIT] Limpando ${completedTaskIds.length} tarefas concluídas - Tenant: ${currentTenant.name}`);
                        
                        // Excluir tarefas de forma segura com filtro de tenant
                        const { error } = await supabase
                          .from('tasks')
                          .delete()
                          .in('id', completedTaskIds)
                          .eq('tenant_id', currentTenant.id);
                        
                        const data = !error;
                        
                        if (error) {
                          console.error('Erro ao limpar tarefas concluídas:', error);
                          toast({
                            title: 'Erro',
                            description: 'Ocorreu um erro ao limpar as tarefas concluídas: ' + error.message,
                            variant: 'destructive',
                          });
                        } else if (!data) {
                          console.error('Falha ao limpar tarefas concluídas: a função retornou false');
                          toast({
                            title: 'Erro',
                            description: 'Ocorreu um erro interno ao limpar as tarefas concluídas',
                            variant: 'destructive',
                          });
                        } else {
                          toast({
                            title: 'Tarefas removidas',
                            description: `${completedTaskIds.length} tarefas concluídas foram removidas`,
                          });
                        }
                        
                        // Recarregar dados
                        window.location.reload();
                      } catch (error) {
                        console.error('Erro ao limpar tarefas concluídas:', error);
                        toast({
                          title: 'Erro',
                          description: 'Ocorreu um erro ao limpar as tarefas concluídas',
                          variant: 'destructive',
                        });
                        // Recarregar dados em caso de erro
                        window.location.reload();
                      }
                    }}
                  >
                    Limpar tudo
                  </Button>
                )}
              </div>
              
              <div className="p-4 overflow-y-auto flex-grow">
                {isTasksLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-20 bg-muted rounded"></div>
                    ))}
                  </div>
                ) : tasks.filter(task => task.status === 'completed').length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    Não há tarefas concluídas
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks
                      .filter(task => task.status === 'completed')
                      .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())
                      .map(task => (
                        <div
                          key={task.id}
                          className="bg-background border border-muted rounded-lg p-3 shadow-sm opacity-75"
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={true}
                              onCheckedChange={() => 
                                toggleTaskStatus(task.id, task.status)
                              }
                            />
                            <div className="flex-grow">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium line-through text-muted-foreground">{task.title}</h4>
                                <div className="flex items-center flex-wrap gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startTaskEditing(task);
                                    }}
                                  >
                                    <span className="sr-only">Editar</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                    </svg>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirmDeleteTask(task.id, e);
                                    }}
                                  >
                                    <span className="sr-only">Excluir</span>
                                    ×
                                  </Button>
                                </div>
                              </div>
                              
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-through">{task.description}</p>
                              )}
                              
                              {task.completed_at && (
                                <div className="mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    Concluída em {format(new Date(task.completed_at), 'dd/MM/yyyy HH:mm')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ChargeDetailDrawer
          isOpen={isDetailDrawerOpen}
          onClose={() => setIsDetailDrawerOpen(false)}
          charge={selectedCharge}
          onRefresh={() => {}}
        />

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirmed}>
                Excluir tarefa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

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
import { UserSelect } from "@/components/users/UserSelect";
import AssignedUserTag from "@/components/tasks/AssignedUserTag";
import { clientsService } from "@/services/clientsService";
import { useSecureTasks, type SecureTask } from '@/hooks/useSecureTasks'; // AIDEV-NOTE: Hook seguro multi-tenant
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'; // AIDEV-NOTE: Hook de validação de acesso multi-tenant
import { supabase } from '@/lib/supabase'; // AIDEV-NOTE: Apenas para RPC functions específicas
import TaskAttachments from '@/components/tasks/TaskAttachments'

// AIDEV-NOTE: Tipo Task movido para hook useTasks para consistência multi-tenant
// Hook useTasks implementa filtros automáticos por tenant_id em todas as operações

// AIDEV-NOTE: Componente principal da página de tarefas multi-tenant
// Migrado para usar hook useTasks que garante isolamento por tenant_id
export default function Tasks() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  
  // 🛡️ VALIDAÇÃO DE ACESSO E HOOK SEGURO (OBRIGATÓRIO)
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const queryClient = useQueryClient();
  
  // 🔐 HOOK SEGURO PARA TAREFAS COM 5 CAMADAS DE SEGURANÇA
  const {
    tasks,
    isLoading: isTasksLoading,
    createTask,
    updateTask,
    deleteTask,
    isCreating,
    isUpdating,
    isDeleting,
    refetch: refetchTasks
  } = useSecureTasks();
  
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
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState<string>('');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskId: string | null;
    taskTitle: string;
  }>({ isOpen: false, taskId: null, taskTitle: '' });
  
  // 🚨 FORÇA LIMPEZA COMPLETA DO CACHE AO TROCAR TENANT
  // AIDEV-NOTE: Otimizado para evitar re-renders excessivos - removido currentTenant?.name e queryClient das dependências
  React.useEffect(() => {
    if (currentTenant?.id) {
      console.log(`🧹 [CACHE] Limpando cache para tenant: ${currentTenant.name} (${currentTenant.id})`);
      // Invalidar TODAS as queries de tarefas
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Remover dados em cache que possam estar contaminados
      queryClient.removeQueries({ queryKey: ['tasks'] });
    }
  }, [currentTenant?.id]); // AIDEV-NOTE: Removido currentTenant?.name e queryClient para evitar re-renders desnecessários
  
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

  // 3. AUDIT LOG (OBRIGATÓRIO) - Antes de qualquer early return
  useEffect(() => {
    if (currentTenant) {
      console.log(`[AUDIT] Acessando página de tarefas - Tenant: ${currentTenant.name} (${currentTenant.id})`);
      console.log(`[SECURITY] Validação de acesso aprovada para tenant: ${currentTenant.slug}`);
    }
  }, [currentTenant]);

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
  // AIDEV-NOTE: Removido early return para evitar violação das Rules of Hooks
  // A validação agora é feita no useEffect para redirecionamento
  useEffect(() => {
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
    }
  }, [currentTenant, slug]);

  // 4. EARLY RETURNS PARA GUARDS
  if (!hasAccess) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Acesso Negado</h2>
            <p className="text-muted-foreground">{accessError}</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  // 🔍 AUDIT LOG: Página renderizada com sucesso
  console.log(`✅ [AUDIT] Página Tarefas renderizada para tenant: ${currentTenant?.name} (${currentTenant?.id})`);

  const addTask = async () => {
    if (!taskInput.trim()) return;
    
    try {
      // 🔐 USAR HOOK SEGURO PARA CRIAR TAREFA
      await createTask({
        title: taskInput.trim(),
        status: 'pending',
        priority: 'medium'
      });
      
      setTaskInput('');
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      // Toast já é exibido pelo hook seguro
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: 'pending' | 'completed') => {
    try {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      
      // 🔐 USAR HOOK SEGURO PARA ATUALIZAR TAREFA
      await updateTask({
        id: taskId,
        status: newStatus
      });
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
      // Toast já é exibido pelo hook seguro
    }
  };

  const openDeleteDialog = (taskId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setTaskToDelete(taskId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      // 🔐 USAR HOOK SEGURO PARA EXCLUIR TAREFA
      await deleteTask(taskToDelete);
      
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      // Toast já é exibido pelo hook seguro
    }
  };

  const createTaskFromCharge = async (charge: Cobranca) => {
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
      
      // 🔐 USAR HOOK SEGURO PARA CRIAR TAREFA
      const data = await createTask({
        title,
        client_name: charge.customer?.name || 'Cliente',
        client_id: charge.customer?.id,
        charge_id: charge.id,
        due_date: dueDate,
        priority,
        status: 'pending'
      });
      
      return data;
    } catch (error) {
      console.error("Erro ao criar tarefa a partir da cobrança:", error);
      // Toast já é exibido pelo hook seguro
      return null;
    }
  };

  const checkTaskExistsForCharge = async (chargeId: string): Promise<boolean> => {
    try {
      // 🔐 USAR DADOS SEGUROS DO HOOK
      if (!tasks || !hasAccess) return false;
      
      // Verificar se existe tarefa para esta cobrança nos dados já carregados
      return tasks.some(task => task.charge_id === chargeId);
    } catch (error) {
      console.error('Erro ao verificar tarefa existente:', error);
      return false;
    }
  };

  const generateTasksFromUpcomingCharges = async (daysAhead: number = 5) => {
    if (!chargesData?.data || !hasAccess) return;
    
    setIsGeneratingTasks(true);
    const today = new Date();
    let tasksCreated = 0;
    let tasksSkipped = 0;
    
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
          
          try {
            // 🔐 USAR HOOK SEGURO PARA CRIAR TAREFA
            await createTask({
              title: `Cobrança de ${charge.customer?.name || 'Cliente'} - R$ ${Number(charge.valor).toFixed(2)}`,
              description: `Vencimento em ${format(dueDate, 'dd/MM/yyyy')}. ${charge.descricao || ''}`,
              client_name: charge.customer?.name,
              client_id: charge.customer?.id,
              charge_id: charge.id,
              due_date: charge.data_vencimento,
              priority,
              status: 'pending'
            });
            
            tasksCreated++;
          } catch (error) {
            console.error('Erro ao criar tarefa automática:', error);
            tasksSkipped++;
          }
        } else {
          tasksSkipped++;
        }
      }
      
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

  // AIDEV-NOTE: ✅ FUNÇÃO CORRIGIDA - Inclui contexto de tenant para RPC segura
  const sendManualReminder = async (chargeId: string) => {
    try {
      // 🛡️ CONFIGURAR CONTEXTO DE TENANT (OBRIGATÓRIO PARA RPC)
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant?.id 
      });
      
      const { data, error } = await supabase.rpc('send_charge_reminder', {
        charge_id: chargeId
      });
      
      if (error) throw error;
      
      // 🔍 AUDIT LOG
      console.log(`✅ [AUDIT] Lembrete enviado - Tenant: ${currentTenant?.name}, Charge: ${chargeId}`);
      
      toast({
        title: 'Lembrete enviado',
        description: 'O lembrete foi enviado com sucesso para o operador financeiro',
      });
      
      return data;
    } catch (error) {
      console.error(`❌ [AUDIT] Erro ao enviar lembrete - Tenant: ${currentTenant?.name}:`, error);
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

  /**
   * Inicia edição de uma tarefa existente, populando o formulário
   * com os valores atuais, incluindo o responsável (assigned_to).
   */
  const startTaskEditing = (task: SecureTask) => {
    // Preencher o formulário com os dados da tarefa
    setNewTaskTitle(task.title);
    setNewTaskClient(task.client_name || '');
    setNewTaskClientId(task.client_id || '');
    setNewTaskPriority(task.priority);
    setNewTaskDueDate(task.due_date || '');
    setNewTaskDescription(task.description || '');
    setNewTaskAssignedTo(task.assigned_to || '');
    
    // Configurar o modo de edição
    setIsEditMode(true);
    setTaskToEdit(task.id);
    
    // Abrir o diálogo
    setIsNewTaskDialogOpen(true);
  };

  useEffect(() => {
    if (isEditMode && newTaskClientId && !newTaskClient && currentTenant?.id) {
      clientsService.getClientById(newTaskClientId, currentTenant.id).then(client => {
        if (client) {
          setNewTaskClient(client.name || '');
        }
      });
    }
  }, [isEditMode, newTaskClientId, newTaskClient, currentTenant?.id]);

  // AIDEV-NOTE: ✅ FUNÇÃO CORRIGIDA - Usa apenas hooks seguros multi-tenant
  // createTask e updateTask do hook garantem isolamento automático por tenant_id
  const createNewTaskFromForm = async () => {
    // 🛡️ VALIDAÇÃO DE SEGURANÇA
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
        assigned_to: newTaskAssignedTo || undefined,
        status: 'pending' as const
      };
      
      if (isEditMode && taskToEdit) {
        // ✅ USAR HOOK SEGURO - Todas as 5 camadas de segurança aplicadas automaticamente
        await updateTask({ id: taskToEdit, ...taskData });
        
        console.log(`✅ [AUDIT] Tarefa ${taskToEdit} atualizada via hook seguro - Tenant: ${currentTenant.name}`);
      } else {
        // ✅ USAR HOOK SEGURO - Todas as 5 camadas de segurança aplicadas automaticamente
        await createTask(taskData);
        
        console.log(`✅ [AUDIT] Nova tarefa criada via hook seguro - Tenant: ${currentTenant.name}`);
      }
      
      resetNewTaskForm();
      
      // ✅ INVALIDAÇÃO AUTOMÁTICA - O hook já invalida o cache automaticamente
      // Não é necessário window.location.reload()
      
      toast({
        title: isEditMode ? 'Tarefa atualizada' : 'Tarefa criada',
        description: `A tarefa foi ${isEditMode ? 'atualizada' : 'criada'} com sucesso.`,
      });
    } catch (error) {
      console.error(`❌ [AUDIT] Erro ao ${isEditMode ? 'atualizar' : 'criar'} tarefa:`, error);
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
        <h1 className="text-2xl font-bold mb-6">Gerenciamento de Tarefas</h1>
        
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
            <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
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
                    initialOptions={newTaskClientId ? [{ value: newTaskClientId, label: newTaskClient || 'Cliente sem nome' }] : []}
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
              {/* Campo: Responsável */}
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Responsável</Label>
                <UserSelect
                  value={newTaskAssignedTo}
                  onChange={(value) => setNewTaskAssignedTo(value)}
                  placeholder="Selecione um responsável"
                  inModal={true}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select value={newTaskPriority} onValueChange={(value: string) => setNewTaskPriority(value)}>
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
                {isEditMode && taskToEdit && (
                  <div className="space-y-2">
                    <TaskAttachments taskId={taskToEdit} />
                  </div>
                )}
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
                        if (a.due_date && b.due_date) {
                          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
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
                                  {task.charge_id && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-xs flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (task.charge_id && chargesData?.data) {
                                            const charge = chargesData.data.find(c => c.id === task.charge_id);
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
                                          sendManualReminder(task.charge_id!);
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
                                      openDeleteDialog(task.id, e);
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
                                {task.client_name && (
                                  <span className="text-xs text-muted-foreground flex items-center">
                                    <span className="inline-block w-2 h-2 bg-muted-foreground/50 rounded-full mr-1"></span>
                                    {task.client_name}
                                  </span>
                                )}
                                
                                {task.due_date && (
                                  <span className={`text-xs flex items-center ${
                                    isBefore(parseISO(task.due_date), new Date()) 
                                      ? 'text-danger' 
                                      : 'text-muted-foreground'
                                  }`}>
                                    <span className="inline-block w-2 h-2 bg-gray-300 rounded-full mr-1"></span>
                                    Vencimento: {format(parseISO(task.due_date), 'dd/MM/yyyy')}
                                  </span>
                                )}
                                {/* Responsável pela tarefa (multi-tenant) */}
                                <AssignedUserTag userId={task.assigned_to} />
                                
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
                                      openDeleteDialog(task.id, e);
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
              <Button variant="destructive" onClick={confirmDeleteTask}>
                Excluir tarefa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  financialNotificationService,
  FinancialNotification,
  NotificationTemplate,
  NotificationRule,
  UserNotificationSettings,
  NotificationStats,
  NotificationSearchFilters,
  NotificationType,
  NotificationPriority,
  DeliveryChannel,
  NotificationStatus
} from '../services/financialNotificationService';

interface UseFinancialNotificationReturn {
  // Estados
  loading: boolean;
  notifications: FinancialNotification[];
  templates: NotificationTemplate[];
  rules: NotificationRule[];
  userSettings: UserNotificationSettings | null;
  stats: NotificationStats | null;
  searchResults: {
    notifications: FinancialNotification[];
    total: number;
  };

  // Funções de notificação
  createNotification: (notification: Omit<FinancialNotification, 'id' | 'created_at' | 'updated_at'>, userId: string) => Promise<FinancialNotification | null>;
  sendNotification: (notificationId: string, userId: string) => Promise<boolean>;
  getNotification: (notificationId: string) => Promise<FinancialNotification | null>;
  searchNotifications: (filters: NotificationSearchFilters) => Promise<void>;
  cancelNotification: (notificationId: string, userId: string) => Promise<boolean>;
  retryNotification: (notificationId: string, userId: string) => Promise<boolean>;

  // Funções de template
  createNotificationTemplate: (template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>, userId: string) => Promise<NotificationTemplate | null>;
  getNotificationTemplates: (tenantId: string, type?: NotificationType) => Promise<void>;
  createNotificationFromTemplate: (templateId: string, variables: Record<string, any>, overrides: Partial<FinancialNotification>, userId: string) => Promise<FinancialNotification | null>;

  // Funções de regras
  createNotificationRule: (rule: Omit<NotificationRule, 'id' | 'created_at' | 'updated_at'>, userId: string) => Promise<NotificationRule | null>;
  processAutomaticRules: (tenantId: string) => Promise<number>;

  // Funções de configurações
  getUserNotificationSettings: (userId: string, tenantId: string) => Promise<void>;
  updateUserNotificationSettings: (settings: UserNotificationSettings, userId: string) => Promise<boolean>;

  // Funções de processamento
  processScheduledNotifications: () => Promise<number>;
  generateNotificationStats: (tenantId: string, periodStart: Date, periodEnd: Date) => Promise<void>;

  // Funções utilitárias
  clearResults: () => void;
  formatNotificationData: (notification: FinancialNotification) => FormattedNotificationData;
  validateNotificationData: (notification: Partial<FinancialNotification>) => ValidationResult;
  exportNotificationData: (notifications: FinancialNotification[], format: 'csv' | 'json') => void;
}

interface FormattedNotificationData {
  id: string;
  type: string;
  typeLabel: string;
  priority: string;
  priorityLabel: string;
  priorityColor: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  title: string;
  message: string;
  channels: string[];
  channelLabels: string[];
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  scheduledFor?: string;
  errorMessage?: string;
  retryCount: number;
  canRetry: boolean;
  canCancel: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useFinancialNotification = (): UseFinancialNotificationReturn => {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<FinancialNotification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [userSettings, setUserSettings] = useState<UserNotificationSettings | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [searchResults, setSearchResults] = useState<{
    notifications: FinancialNotification[];
    total: number;
  }>({ notifications: [], total: 0 });

  // Criar notificação
  const createNotification = useCallback(async (
    notification: Omit<FinancialNotification, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<FinancialNotification | null> => {
    setLoading(true);
    try {
      const result = await financialNotificationService.createNotification(notification, userId);
      if (result) {
        toast.success('Notificação criada com sucesso!');
        setNotifications(prev => [result, ...prev]);
      } else {
        toast.error('Erro ao criar notificação');
      }
      return result;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      toast.error('Erro ao criar notificação');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Enviar notificação
  const sendNotification = useCallback(async (
    notificationId: string,
    userId: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await financialNotificationService.sendNotification(notificationId, userId);
      if (success) {
        toast.success('Notificação enviada com sucesso!');
        // Atualizar lista de notificações
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, status: 'SENT' as NotificationStatus, sent_at: new Date() }
              : n
          )
        );
      } else {
        toast.error('Erro ao enviar notificação');
      }
      return success;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      toast.error('Erro ao enviar notificação');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar notificação
  const getNotification = useCallback(async (
    notificationId: string
  ): Promise<FinancialNotification | null> => {
    setLoading(true);
    try {
      const result = await financialNotificationService.getNotification(notificationId);
      return result;
    } catch (error) {
      console.error('Erro ao buscar notificação:', error);
      toast.error('Erro ao buscar notificação');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar notificações
  const searchNotifications = useCallback(async (
    filters: NotificationSearchFilters
  ): Promise<void> => {
    setLoading(true);
    try {
      const result = await financialNotificationService.searchNotifications(filters);
      setSearchResults(result);
      if (filters.offset === 0) {
        setNotifications(result.notifications);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      toast.error('Erro ao buscar notificações');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancelar notificação
  const cancelNotification = useCallback(async (
    notificationId: string,
    userId: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await financialNotificationService.cancelNotification(notificationId, userId);
      if (success) {
        toast.success('Notificação cancelada com sucesso!');
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, status: 'CANCELLED' as NotificationStatus }
              : n
          )
        );
      } else {
        toast.error('Erro ao cancelar notificação');
      }
      return success;
    } catch (error) {
      console.error('Erro ao cancelar notificação:', error);
      toast.error('Erro ao cancelar notificação');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reenviar notificação
  const retryNotification = useCallback(async (
    notificationId: string,
    userId: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await financialNotificationService.retryNotification(notificationId, userId);
      if (success) {
        toast.success('Notificação reenviada com sucesso!');
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, status: 'SENT' as NotificationStatus, retry_count: (n.retry_count || 0) + 1 }
              : n
          )
        );
      } else {
        toast.error('Erro ao reenviar notificação');
      }
      return success;
    } catch (error) {
      console.error('Erro ao reenviar notificação:', error);
      toast.error('Erro ao reenviar notificação');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar template
  const createNotificationTemplate = useCallback(async (
    template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<NotificationTemplate | null> => {
    setLoading(true);
    try {
      const result = await financialNotificationService.createNotificationTemplate(template, userId);
      if (result) {
        toast.success('Template criado com sucesso!');
        setTemplates(prev => [result, ...prev]);
      } else {
        toast.error('Erro ao criar template');
      }
      return result;
    } catch (error) {
      console.error('Erro ao criar template:', error);
      toast.error('Erro ao criar template');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar templates
  const getNotificationTemplates = useCallback(async (
    tenantId: string,
    type?: NotificationType
  ): Promise<void> => {
    setLoading(true);
    try {
      const result = await financialNotificationService.getNotificationTemplates(tenantId, type);
      setTemplates(result);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
      toast.error('Erro ao buscar templates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar notificação a partir de template
  const createNotificationFromTemplate = useCallback(async (
    templateId: string,
    variables: Record<string, any>,
    overrides: Partial<FinancialNotification>,
    userId: string
  ): Promise<FinancialNotification | null> => {
    setLoading(true);
    try {
      const result = await financialNotificationService.createNotificationFromTemplate(
        templateId,
        variables,
        overrides,
        userId
      );
      if (result) {
        toast.success('Notificação criada a partir do template!');
        setNotifications(prev => [result, ...prev]);
      } else {
        toast.error('Erro ao criar notificação a partir do template');
      }
      return result;
    } catch (error) {
      console.error('Erro ao criar notificação a partir do template:', error);
      toast.error('Erro ao criar notificação a partir do template');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar regra
  const createNotificationRule = useCallback(async (
    rule: Omit<NotificationRule, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<NotificationRule | null> => {
    setLoading(true);
    try {
      const result = await financialNotificationService.createNotificationRule(rule, userId);
      if (result) {
        toast.success('Regra de notificação criada com sucesso!');
        setRules(prev => [result, ...prev]);
      } else {
        toast.error('Erro ao criar regra de notificação');
      }
      return result;
    } catch (error) {
      console.error('Erro ao criar regra:', error);
      toast.error('Erro ao criar regra de notificação');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Processar regras automáticas
  const processAutomaticRules = useCallback(async (
    tenantId: string
  ): Promise<number> => {
    setLoading(true);
    try {
      const processedCount = await financialNotificationService.processAutomaticRules(tenantId);
      if (processedCount > 0) {
        toast.success(`${processedCount} regras processadas com sucesso!`);
      } else {
        toast.info('Nenhuma regra foi disparada');
      }
      return processedCount;
    } catch (error) {
      console.error('Erro ao processar regras automáticas:', error);
      toast.error('Erro ao processar regras automáticas');
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar configurações do usuário
  const getUserNotificationSettings = useCallback(async (
    userId: string,
    tenantId: string
  ): Promise<void> => {
    setLoading(true);
    try {
      const result = await financialNotificationService.getUserNotificationSettings(userId, tenantId);
      setUserSettings(result);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Erro ao buscar configurações de notificação');
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar configurações do usuário
  const updateUserNotificationSettings = useCallback(async (
    settings: UserNotificationSettings,
    userId: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await financialNotificationService.updateUserNotificationSettings(settings, userId);
      if (success) {
        toast.success('Configurações atualizadas com sucesso!');
        setUserSettings(settings);
      } else {
        toast.error('Erro ao atualizar configurações');
      }
      return success;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao atualizar configurações');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Processar notificações agendadas
  const processScheduledNotifications = useCallback(async (): Promise<number> => {
    setLoading(true);
    try {
      const processedCount = await financialNotificationService.processScheduledNotifications();
      if (processedCount > 0) {
        toast.success(`${processedCount} notificações agendadas processadas!`);
      }
      return processedCount;
    } catch (error) {
      console.error('Erro ao processar notificações agendadas:', error);
      toast.error('Erro ao processar notificações agendadas');
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  // Gerar estatísticas
  const generateNotificationStats = useCallback(async (
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> => {
    setLoading(true);
    try {
      const result = await financialNotificationService.generateNotificationStats(
        tenantId,
        periodStart,
        periodEnd
      );
      setStats(result);
      toast.success('Estatísticas geradas com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar estatísticas:', error);
      toast.error('Erro ao gerar estatísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Limpar resultados
  const clearResults = useCallback(() => {
    setNotifications([]);
    setTemplates([]);
    setRules([]);
    setUserSettings(null);
    setStats(null);
    setSearchResults({ notifications: [], total: 0 });
  }, []);

  // Formatar dados da notificação
  const formatNotificationData = useCallback((
    notification: FinancialNotification
  ): FormattedNotificationData => {
    const typeLabels: Record<NotificationType, string> = {
      'PAYMENT_DUE': 'Pagamento Vencendo',
      'PAYMENT_OVERDUE': 'Pagamento em Atraso',
      'PAYMENT_RECEIVED': 'Pagamento Recebido',
      'CONTRACT_EXPIRING': 'Contrato Vencendo',
      'CONTRACT_RENEWED': 'Contrato Renovado',
      'INVOICE_GENERATED': 'Fatura Gerada',
      'BUDGET_EXCEEDED': 'Orçamento Excedido',
      'CASH_FLOW_LOW': 'Fluxo de Caixa Baixo',
      'COMPLIANCE_ALERT': 'Alerta de Compliance',
      'AUDIT_REQUIRED': 'Auditoria Necessária',
      'SYSTEM_ALERT': 'Alerta do Sistema',
      'CUSTOM': 'Personalizada'
    };

    const priorityLabels: Record<NotificationPriority, string> = {
      'LOW': 'Baixa',
      'MEDIUM': 'Média',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica'
    };

    const priorityColors: Record<NotificationPriority, string> = {
      'LOW': 'text-gray-600 bg-gray-100',
      'MEDIUM': 'text-blue-600 bg-blue-100',
      'HIGH': 'text-orange-600 bg-orange-100',
      'CRITICAL': 'text-red-600 bg-red-100'
    };

    const statusLabels: Record<NotificationStatus, string> = {
      'PENDING': 'Pendente',
      'SENT': 'Enviada',
      'DELIVERED': 'Entregue',
      'FAILED': 'Falhou',
      'CANCELLED': 'Cancelada'
    };

    const statusColors: Record<NotificationStatus, string> = {
      'PENDING': 'text-yellow-600 bg-yellow-100',
      'SENT': 'text-blue-600 bg-blue-100',
      'DELIVERED': 'text-green-600 bg-green-100',
      'FAILED': 'text-red-600 bg-red-100',
      'CANCELLED': 'text-gray-600 bg-gray-100'
    };

    const channelLabels: Record<DeliveryChannel, string> = {
      'EMAIL': 'E-mail',
      'SMS': 'SMS',
      'PUSH': 'Push',
      'IN_APP': 'In-App',
      'WEBHOOK': 'Webhook'
    };

    return {
      id: notification.id || '',
      type: notification.type,
      typeLabel: typeLabels[notification.type],
      priority: notification.priority,
      priorityLabel: priorityLabels[notification.priority],
      priorityColor: priorityColors[notification.priority],
      status: notification.status,
      statusLabel: statusLabels[notification.status],
      statusColor: statusColors[notification.status],
      title: notification.title,
      message: notification.message,
      channels: notification.channels,
      channelLabels: notification.channels.map(channel => channelLabels[channel]),
      createdAt: notification.created_at ? new Date(notification.created_at).toLocaleString('pt-BR') : '',
      sentAt: notification.sent_at ? new Date(notification.sent_at).toLocaleString('pt-BR') : undefined,
      deliveredAt: notification.delivered_at ? new Date(notification.delivered_at).toLocaleString('pt-BR') : undefined,
      scheduledFor: notification.scheduled_for ? new Date(notification.scheduled_for).toLocaleString('pt-BR') : undefined,
      errorMessage: notification.error_message,
      retryCount: notification.retry_count || 0,
      canRetry: notification.status === 'FAILED' && (notification.retry_count || 0) < (notification.max_retries || 3),
      canCancel: notification.status === 'PENDING'
    };
  }, []);

  // Validar dados da notificação
  const validateNotificationData = useCallback((
    notification: Partial<FinancialNotification>
  ): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validações obrigatórias
    if (!notification.tenant_id) {
      errors.push('ID do tenant é obrigatório');
    }

    if (!notification.type) {
      errors.push('Tipo de notificação é obrigatório');
    }

    if (!notification.priority) {
      errors.push('Prioridade é obrigatória');
    }

    if (!notification.title || notification.title.trim().length === 0) {
      errors.push('Título é obrigatório');
    }

    if (!notification.message || notification.message.trim().length === 0) {
      errors.push('Mensagem é obrigatória');
    }

    if (!notification.channels || notification.channels.length === 0) {
      errors.push('Pelo menos um canal de entrega deve ser selecionado');
    }

    // Validações de formato
    if (notification.title && notification.title.length > 200) {
      errors.push('Título não pode ter mais de 200 caracteres');
    }

    if (notification.message && notification.message.length > 1000) {
      errors.push('Mensagem não pode ter mais de 1000 caracteres');
    }

    // Avisos
    if (notification.scheduled_for && new Date(notification.scheduled_for) <= new Date()) {
      warnings.push('Data de agendamento está no passado');
    }

    if (notification.expires_at && new Date(notification.expires_at) <= new Date()) {
      warnings.push('Data de expiração está no passado');
    }

    if (notification.priority === 'CRITICAL' && !notification.channels?.includes('SMS')) {
      warnings.push('Notificações críticas devem incluir SMS para maior efetividade');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  // Exportar dados
  const exportNotificationData = useCallback((
    notifications: FinancialNotification[],
    format: 'csv' | 'json'
  ): void => {
    try {
      if (format === 'csv') {
        const headers = [
          'ID',
          'Tipo',
          'Prioridade',
          'Status',
          'Título',
          'Mensagem',
          'Canais',
          'Criado em',
          'Enviado em',
          'Entregue em',
          'Agendado para',
          'Erro'
        ];

        const rows = notifications.map(notification => [
          notification.id || '',
          notification.type,
          notification.priority,
          notification.status,
          notification.title,
          notification.message.replace(/,/g, ';'), // Escapar vírgulas
          notification.channels.join(';'),
          notification.created_at ? new Date(notification.created_at).toLocaleString('pt-BR') : '',
          notification.sent_at ? new Date(notification.sent_at).toLocaleString('pt-BR') : '',
          notification.delivered_at ? new Date(notification.delivered_at).toLocaleString('pt-BR') : '',
          notification.scheduled_for ? new Date(notification.scheduled_for).toLocaleString('pt-BR') : '',
          notification.error_message || ''
        ]);

        const csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `notificacoes_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
      } else {
        const jsonContent = JSON.stringify(notifications, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `notificacoes_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
      }

      toast.success(`Dados exportados em formato ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error('Erro ao exportar dados');
    }
  }, []);

  return {
    // Estados
    loading,
    notifications,
    templates,
    rules,
    userSettings,
    stats,
    searchResults,

    // Funções de notificação
    createNotification,
    sendNotification,
    getNotification,
    searchNotifications,
    cancelNotification,
    retryNotification,

    // Funções de template
    createNotificationTemplate,
    getNotificationTemplates,
    createNotificationFromTemplate,

    // Funções de regras
    createNotificationRule,
    processAutomaticRules,

    // Funções de configurações
    getUserNotificationSettings,
    updateUserNotificationSettings,

    // Funções de processamento
    processScheduledNotifications,
    generateNotificationStats,

    // Funções utilitárias
    clearResults,
    formatNotificationData,
    validateNotificationData,
    exportNotificationData
  };
};

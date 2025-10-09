// =====================================================
// FINANCIAL NOTIFICATIONS HOOK
// Descrição: Hook para gerenciar notificações financeiras
// =====================================================

import { useState, useCallback, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import {
  FinancialNotification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationRecipient,
  NotificationTemplate,
  NotificationSchedule,
  SendNotificationRequest,
  NotificationResponse,
  PaginationParams,
  PaginatedResponse,
} from '../types/models/financial';

interface UseFinancialNotificationsReturn {
  // State
  notifications: FinancialNotification[];
  templates: NotificationTemplate[];
  loading: boolean;
  error: string | null;
  
  // Notification management
  sendNotification: (request: SendNotificationRequest) => Promise<NotificationResponse | null>;
  sendBulkNotifications: (requests: SendNotificationRequest[]) => Promise<NotificationResponse[] | null>;
  scheduleNotification: (request: SendNotificationRequest, schedule: NotificationSchedule) => Promise<boolean>;
  
  // Notification queries
  getNotifications: (params?: PaginationParams & { status?: NotificationStatus; type?: NotificationType }) => Promise<PaginatedResponse<FinancialNotification> | null>;
  getNotification: (id: string) => Promise<FinancialNotification | null>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;
  
  // Template management
  getTemplates: () => Promise<NotificationTemplate[]>;
  createTemplate: (template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<NotificationTemplate | null>;
  updateTemplate: (id: string, template: Partial<NotificationTemplate>) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
  
  // Notification settings
  getUserPreferences: () => Promise<NotificationPreferences | null>;
  updateUserPreferences: (preferences: NotificationPreferences) => Promise<boolean>;
  
  // Real-time notifications
  subscribeToNotifications: (callback: (notification: FinancialNotification) => void) => () => void;
  
  // Analytics
  getNotificationStats: (dateRange?: { startDate: string; endDate: string }) => Promise<NotificationStats | null>;
  
  // Utilities
  validateNotificationRequest: (request: SendNotificationRequest) => { isValid: boolean; errors: string[] };
  previewNotification: (request: SendNotificationRequest) => Promise<NotificationPreview | null>;
  
  // State management
  clearError: () => void;
  refresh: () => Promise<void>;
}

interface NotificationPreferences {
  email: {
    enabled: boolean;
    types: NotificationType[];
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  sms: {
    enabled: boolean;
    types: NotificationType[];
    phoneNumber?: string;
  };
  push: {
    enabled: boolean;
    types: NotificationType[];
    deviceTokens: string[];
  };
  inApp: {
    enabled: boolean;
    types: NotificationType[];
  };
}

interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
    rate: number;
  }>;
  byType: Record<NotificationType, {
    sent: number;
    delivered: number;
    failed: number;
    rate: number;
  }>;
  trends: {
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }[];
}

interface NotificationPreview {
  subject: string;
  content: string;
  channels: NotificationChannel[];
  recipients: NotificationRecipient[];
  estimatedCost: number;
  estimatedDeliveryTime: string;
}

// AIDEV-NOTE: Função para sanitizar dados do NotificationTemplate, evitando referências circulares
// Remove propriedades extras que não pertencem à tabela financial_notification_templates
function sanitizeNotificationTemplate(template: Partial<NotificationTemplate>): Partial<NotificationTemplate> {
  return {
    name: template.name,
    type: template.type,
    channels: template.channels,
    subject: template.subject,
    emailTemplate: template.emailTemplate,
    smsTemplate: template.smsTemplate,
    pushTemplate: template.pushTemplate,
    variables: template.variables,
    isActive: template.isActive,
    metadata: template.metadata
  };
}

export const useFinancialNotifications = (): UseFinancialNotificationsReturn => {
  const { supabase, user } = useSupabase();
  const [notifications, setNotifications] = useState<FinancialNotification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: any, context: string) => {
    console.error(`[useFinancialNotifications] ${context}:`, error);
    setError(error.message || `Erro ao ${context}`);
    setLoading(false);
  }, []);

  // Notification management methods
  const sendNotification = useCallback(async (
    request: SendNotificationRequest
  ): Promise<NotificationResponse | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-notifications', {
        body: {
          action: 'send',
          ...request,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao enviar notificação');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao enviar notificação');
      }

      const notificationResponse = data.data as NotificationResponse;
      
      // Add to local state if it's a new notification
      if (notificationResponse.notification) {
        setNotifications(prev => [notificationResponse.notification!, ...prev]);
      }
      
      setLoading(false);
      return notificationResponse;
    } catch (err) {
      handleError(err, 'enviar notificação');
      return null;
    }
  }, [supabase, user, handleError]);

  const sendBulkNotifications = useCallback(async (
    requests: SendNotificationRequest[]
  ): Promise<NotificationResponse[] | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-notifications', {
        body: {
          action: 'send_bulk',
          requests,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao enviar notificações em lote');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao enviar notificações');
      }

      const responses = data.data as NotificationResponse[];
      
      // Add successful notifications to local state
      const newNotifications = responses
        .filter(r => r.notification)
        .map(r => r.notification!);
      
      setNotifications(prev => [...newNotifications, ...prev]);
      
      setLoading(false);
      return responses;
    } catch (err) {
      handleError(err, 'enviar notificações em lote');
      return null;
    }
  }, [supabase, user, handleError]);

  const scheduleNotification = useCallback(async (
    request: SendNotificationRequest,
    schedule: NotificationSchedule
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-notifications', {
        body: {
          action: 'schedule',
          request,
          schedule,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao agendar notificação');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao agendar notificação');
      }

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'agendar notificação');
      return false;
    }
  }, [supabase, user, handleError]);

  // Notification queries
  const getNotifications = useCallback(async (
    params: PaginationParams & { status?: NotificationStatus; type?: NotificationType } = {}
  ): Promise<PaginatedResponse<FinancialNotification> | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('financial_notifications')
        .select('*', { count: 'exact' })
        .eq('tenant_id', user.user_metadata?.tenant_id)
        .order('created_at', { ascending: false });

      if (params.status) {
        query = query.eq('status', params.status);
      }

      if (params.type) {
        query = query.eq('type', params.type);
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message || 'Erro ao buscar notificações');
      }

      const result: PaginatedResponse<FinancialNotification> = {
        data: data || [],
        total: count || 0,
        page: Math.floor((params.offset || 0) / (params.limit || 10)) + 1,
        limit: params.limit || 10,
        totalPages: Math.ceil((count || 0) / (params.limit || 10)),
      };

      setNotifications(result.data);
      setLoading(false);
      return result;
    } catch (err) {
      handleError(err, 'buscar notificações');
      return null;
    }
  }, [supabase, user, handleError]);

  const getNotification = useCallback(async (id: string): Promise<FinancialNotification | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('financial_notifications')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', user.user_metadata?.tenant_id)
        .single();

      if (error) {
        throw new Error(error.message || 'Erro ao buscar notificação');
      }

      setLoading(false);
      return data as FinancialNotification;
    } catch (err) {
      handleError(err, 'buscar notificação');
      return null;
    }
  }, [supabase, user, handleError]);

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('financial_notifications')
        .update({ 
          status: 'DELIVERED',
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', user.user_metadata?.tenant_id);

      if (error) {
        throw new Error(error.message || 'Erro ao marcar notificação como lida');
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { 
                ...notification, 
                status: 'DELIVERED' as NotificationStatus,
                readAt: new Date().toISOString(),
              } 
            : notification
        )
      );

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'marcar notificação como lida');
      return false;
    }
  }, [supabase, user, handleError]);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('financial_notifications')
        .update({ 
          status: 'DELIVERED',
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', user.user_metadata?.tenant_id)
        .neq('status', 'DELIVERED');

      if (error) {
        throw new Error(error.message || 'Erro ao marcar todas as notificações como lidas');
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          status: 'DELIVERED' as NotificationStatus,
          readAt: new Date().toISOString(),
        }))
      );

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'marcar todas as notificações como lidas');
      return false;
    }
  }, [supabase, user, handleError]);

  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('financial_notifications')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.user_metadata?.tenant_id);

      if (error) {
        throw new Error(error.message || 'Erro ao deletar notificação');
      }

      // Remove from local state
      setNotifications(prev => prev.filter(notification => notification.id !== id));

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'deletar notificação');
      return false;
    }
  }, [supabase, user, handleError]);

  // Template management
  const getTemplates = useCallback(async (): Promise<NotificationTemplate[]> => {
    if (!user) {
      setError('Usuário não autenticado');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('financial_notification_templates')
        .select('*')
        .eq('tenant_id', user.user_metadata?.tenant_id)
        .order('name');

      if (error) {
        throw new Error(error.message || 'Erro ao buscar templates');
      }

      const templateData = data as NotificationTemplate[];
      setTemplates(templateData);
      setLoading(false);
      return templateData;
    } catch (err) {
      handleError(err, 'buscar templates');
      return [];
    }
  }, [supabase, user, handleError]);

  const createTemplate = useCallback(async (
    template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<NotificationTemplate | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // 🔧 SANITIZAR DADOS PARA EVITAR REFERÊNCIAS CIRCULARES
      const sanitizedTemplate = sanitizeNotificationTemplate(template);

      const { data, error } = await supabase
        .from('financial_notification_templates')
        .insert({
          name: sanitizedTemplate.name,
          type: sanitizedTemplate.type,
          channels: sanitizedTemplate.channels,
          subject: sanitizedTemplate.subject,
          emailTemplate: sanitizedTemplate.emailTemplate,
          smsTemplate: sanitizedTemplate.smsTemplate,
          pushTemplate: sanitizedTemplate.pushTemplate,
          variables: sanitizedTemplate.variables,
          isActive: sanitizedTemplate.isActive,
          metadata: sanitizedTemplate.metadata,
          tenant_id: user.user_metadata?.tenant_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Erro ao criar template');
      }

      const newTemplate = data as NotificationTemplate;
      setTemplates(prev => [...prev, newTemplate]);
      
      setLoading(false);
      return newTemplate;
    } catch (err) {
      handleError(err, 'criar template');
      return null;
    }
  }, [supabase, user, handleError]);

  const updateTemplate = useCallback(async (
    id: string,
    template: Partial<NotificationTemplate>
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 🔧 SANITIZAR DADOS PARA EVITAR REFERÊNCIAS CIRCULARES
      const sanitizedTemplate = sanitizeNotificationTemplate(template);

      const { error } = await supabase
        .from('financial_notification_templates')
        .update({
          name: sanitizedTemplate.name,
          type: sanitizedTemplate.type,
          channels: sanitizedTemplate.channels,
          subject: sanitizedTemplate.subject,
          emailTemplate: sanitizedTemplate.emailTemplate,
          smsTemplate: sanitizedTemplate.smsTemplate,
          pushTemplate: sanitizedTemplate.pushTemplate,
          variables: sanitizedTemplate.variables,
          isActive: sanitizedTemplate.isActive,
          metadata: sanitizedTemplate.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', user.user_metadata?.tenant_id);

      if (error) {
        throw new Error(error.message || 'Erro ao atualizar template');
      }

      // Update local state
      setTemplates(prev => 
        prev.map(t => 
          t.id === id ? { ...t, ...sanitizedTemplate, updatedAt: new Date().toISOString() } : t
        )
      );

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'atualizar template');
      return false;
    }
  }, [supabase, user, handleError]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('financial_notification_templates')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.user_metadata?.tenant_id);

      if (error) {
        throw new Error(error.message || 'Erro ao deletar template');
      }

      // Remove from local state
      setTemplates(prev => prev.filter(t => t.id !== id));

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'deletar template');
      return false;
    }
  }, [supabase, user, handleError]);

  // Notification settings
  const getUserPreferences = useCallback(async (): Promise<NotificationPreferences | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', user.user_metadata?.tenant_id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw new Error(error.message || 'Erro ao buscar preferências');
      }

      // Return default preferences if none found
      const defaultPreferences: NotificationPreferences = {
        email: {
          enabled: true,
          types: ['PAYMENT_DUE', 'CONTRACT_EXPIRING', 'REPORT_READY'],
          frequency: 'immediate',
        },
        sms: {
          enabled: false,
          types: ['PAYMENT_OVERDUE', 'CONTRACT_SIGNED'],
        },
        push: {
          enabled: true,
          types: ['PAYMENT_DUE', 'CONTRACT_EXPIRING', 'REPORT_READY'],
          deviceTokens: [],
        },
        inApp: {
          enabled: true,
          types: ['PAYMENT_DUE', 'CONTRACT_EXPIRING', 'REPORT_READY', 'PAYMENT_OVERDUE', 'CONTRACT_SIGNED'],
        },
      };

      setLoading(false);
      return data?.preferences || defaultPreferences;
    } catch (err) {
      handleError(err, 'buscar preferências');
      return null;
    }
  }, [supabase, user, handleError]);

  const updateUserPreferences = useCallback(async (
    preferences: NotificationPreferences
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          tenant_id: user.user_metadata?.tenant_id,
          preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw new Error(error.message || 'Erro ao atualizar preferências');
      }

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'atualizar preferências');
      return false;
    }
  }, [supabase, user, handleError]);

  // Real-time notifications
  const subscribeToNotifications = useCallback((
    callback: (notification: FinancialNotification) => void
  ): (() => void) => {
    if (!user) {
      return () => {};
    }

    const channel = supabase
      .channel('financial_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'financial_notifications',
          filter: `tenant_id=eq.${user.user_metadata?.tenant_id}`,
        },
        (payload) => {
          const notification = payload.new as FinancialNotification;
          callback(notification);
          
          // Add to local state
          setNotifications(prev => [notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  // Analytics
  const getNotificationStats = useCallback(async (
    dateRange?: { startDate: string; endDate: string }
  ): Promise<NotificationStats | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_notification_statistics', {
        p_tenant_id: user.user_metadata?.tenant_id,
        p_start_date: dateRange?.startDate,
        p_end_date: dateRange?.endDate,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar estatísticas');
      }

      setLoading(false);
      return data as NotificationStats;
    } catch (err) {
      handleError(err, 'buscar estatísticas');
      return null;
    }
  }, [supabase, user, handleError]);

  // Utilities
  const validateNotificationRequest = useCallback((
    request: SendNotificationRequest
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!request.type) {
      errors.push('Tipo de notificação é obrigatório');
    }

    if (!request.channels || request.channels.length === 0) {
      errors.push('Pelo menos um canal de notificação deve ser selecionado');
    }

    if (!request.recipients || request.recipients.length === 0) {
      errors.push('Pelo menos um destinatário deve ser especificado');
    }

    if (request.recipients) {
      request.recipients.forEach((recipient, index) => {
        if (!recipient.type) {
          errors.push(`Tipo do destinatário ${index + 1} é obrigatório`);
        }
        
        if (recipient.type === 'EMAIL' && !recipient.email) {
          errors.push(`E-mail do destinatário ${index + 1} é obrigatório`);
        }
        
        if (recipient.type === 'PHONE' && !recipient.phone) {
          errors.push(`Telefone do destinatário ${index + 1} é obrigatório`);
        }
        
        if (recipient.type === 'USER_ID' && !recipient.userId) {
          errors.push(`ID do usuário destinatário ${index + 1} é obrigatório`);
        }
      });
    }

    if (!request.subject || request.subject.trim().length === 0) {
      errors.push('Assunto é obrigatório');
    }

    if (!request.content || request.content.trim().length === 0) {
      errors.push('Conteúdo é obrigatório');
    }

    if (request.scheduledFor) {
      const scheduledDate = new Date(request.scheduledFor);
      if (scheduledDate <= new Date()) {
        errors.push('Data de agendamento deve ser futura');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  const previewNotification = useCallback(async (
    request: SendNotificationRequest
  ): Promise<NotificationPreview | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('financial-notifications', {
        body: {
          action: 'preview',
          ...request,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao visualizar notificação');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao visualizar notificação');
      }

      setLoading(false);
      return data.data as NotificationPreview;
    } catch (err) {
      handleError(err, 'visualizar notificação');
      return null;
    }
  }, [supabase, user, handleError]);

  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([
      getNotifications(),
      getTemplates(),
    ]);
  }, [getNotifications, getTemplates]);

  // Auto-load data when user changes
  useEffect(() => {
    if (user) {
      refresh();
    }
  }, [user, refresh]);

  return {
    // State
    notifications,
    templates,
    loading,
    error,
    
    // Notification management
    sendNotification,
    sendBulkNotifications,
    scheduleNotification,
    
    // Notification queries
    getNotifications,
    getNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    
    // Template management
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    
    // Notification settings
    getUserPreferences,
    updateUserPreferences,
    
    // Real-time notifications
    subscribeToNotifications,
    
    // Analytics
    getNotificationStats,
    
    // Utilities
    validateNotificationRequest,
    previewNotification,
    
    // State management
    clearError,
    refresh,
  };
};

// =====================================================
// NOTIFICATION UTILITIES HOOK
// =====================================================

interface UseNotificationUtilitiesReturn {
  getNotificationTypeLabel: (type: NotificationType) => string;
  getNotificationStatusLabel: (status: NotificationStatus) => string;
  getNotificationStatusColor: (status: NotificationStatus) => string;
  getChannelLabel: (channel: NotificationChannel) => string;
  getChannelIcon: (channel: NotificationChannel) => string;
  formatNotificationDate: (date: string) => string;
  getNotificationPriority: (type: NotificationType) => 'low' | 'medium' | 'high' | 'urgent';
  getEstimatedDeliveryTime: (channel: NotificationChannel) => string;
  getChannelCost: (channel: NotificationChannel, recipientCount: number) => number;
}

export const useNotificationUtilities = (): UseNotificationUtilitiesReturn => {
  const getNotificationTypeLabel = useCallback((type: NotificationType): string => {
    const labels: Record<NotificationType, string> = {
      PAYMENT_DUE: 'Pagamento Vencendo',
      PAYMENT_OVERDUE: 'Pagamento Atrasado',
      CONTRACT_EXPIRING: 'Contrato Expirando',
      CONTRACT_SIGNED: 'Contrato Assinado',
      REPORT_READY: 'Relatório Pronto',
      CALCULATION_COMPLETED: 'Cálculo Concluído',
      SYSTEM_ALERT: 'Alerta do Sistema',
      SECURITY_ALERT: 'Alerta de Segurança',
      MAINTENANCE: 'Manutenção',
      CUSTOM: 'Personalizada',
    };
    return labels[type] || type;
  }, []);

  const getNotificationStatusLabel = useCallback((status: NotificationStatus): string => {
    const labels: Record<NotificationStatus, string> = {
      PENDING: 'Pendente',
      PROCESSING: 'Processando',
      SENT: 'Enviada',
      DELIVERED: 'Entregue',
      FAILED: 'Falhou',
      CANCELLED: 'Cancelada',
    };
    return labels[status] || status;
  }, []);

  const getNotificationStatusColor = useCallback((status: NotificationStatus): string => {
    const colors: Record<NotificationStatus, string> = {
      PENDING: 'yellow',
      PROCESSING: 'blue',
      SENT: 'cyan',
      DELIVERED: 'green',
      FAILED: 'red',
      CANCELLED: 'gray',
    };
    return colors[status] || 'gray';
  }, []);

  const getChannelLabel = useCallback((channel: NotificationChannel): string => {
    const labels: Record<NotificationChannel, string> = {
      EMAIL: 'E-mail',
      SMS: 'SMS',
      PUSH: 'Push',
      IN_APP: 'In-App',
      WEBHOOK: 'Webhook',
    };
    return labels[channel] || channel;
  }, []);

  const getChannelIcon = useCallback((channel: NotificationChannel): string => {
    const icons: Record<NotificationChannel, string> = {
      EMAIL: '📧',
      SMS: '📱',
      PUSH: '🔔',
      IN_APP: '💬',
      WEBHOOK: '🔗',
    };
    return icons[channel] || '📢';
  }, []);

  const formatNotificationDate = useCallback((date: string): string => {
    const notificationDate = new Date(date);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Agora mesmo';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min atrás`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h atrás`;
    } else {
      return notificationDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }, []);

  const getNotificationPriority = useCallback((
    type: NotificationType
  ): 'low' | 'medium' | 'high' | 'urgent' => {
    const priorities: Record<NotificationType, 'low' | 'medium' | 'high' | 'urgent'> = {
      PAYMENT_DUE: 'high',
      PAYMENT_OVERDUE: 'urgent',
      CONTRACT_EXPIRING: 'high',
      CONTRACT_SIGNED: 'medium',
      REPORT_READY: 'medium',
      CALCULATION_COMPLETED: 'low',
      SYSTEM_ALERT: 'high',
      SECURITY_ALERT: 'urgent',
      MAINTENANCE: 'medium',
      CUSTOM: 'medium',
    };
    return priorities[type] || 'medium';
  }, []);

  const getEstimatedDeliveryTime = useCallback((channel: NotificationChannel): string => {
    const times: Record<NotificationChannel, string> = {
      EMAIL: '1-2 minutos',
      SMS: '30-60 segundos',
      PUSH: 'Instantâneo',
      IN_APP: 'Instantâneo',
      WEBHOOK: '5-10 segundos',
    };
    return times[channel] || 'Desconhecido';
  }, []);

  const getChannelCost = useCallback((
    channel: NotificationChannel,
    recipientCount: number
  ): number => {
    // Costs in BRL (example values)
    const costs: Record<NotificationChannel, number> = {
      EMAIL: 0.01, // R$ 0.01 per email
      SMS: 0.15,   // R$ 0.15 per SMS
      PUSH: 0.005, // R$ 0.005 per push
      IN_APP: 0,   // Free
      WEBHOOK: 0.02, // R$ 0.02 per webhook
    };
    
    return (costs[channel] || 0) * recipientCount;
  }, []);

  return {
    getNotificationTypeLabel,
    getNotificationStatusLabel,
    getNotificationStatusColor,
    getChannelLabel,
    getChannelIcon,
    formatNotificationDate,
    getNotificationPriority,
    getEstimatedDeliveryTime,
    getChannelCost,
  };
};

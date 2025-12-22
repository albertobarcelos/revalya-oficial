import { supabase } from '../lib/supabase';
import { addDays, addHours, format, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { financialAuditService } from './financialAuditService';

// Tipos de notificação
export type NotificationType = 
  | 'PAYMENT_DUE' 
  | 'PAYMENT_OVERDUE' 
  | 'PAYMENT_RECEIVED' 
  | 'CONTRACT_EXPIRING' 
  | 'CONTRACT_RENEWED' 
  | 'INVOICE_GENERATED' 
  | 'BUDGET_EXCEEDED' 
  | 'CASH_FLOW_LOW' 
  | 'COMPLIANCE_ALERT' 
  | 'AUDIT_REQUIRED' 
  | 'SYSTEM_ALERT' 
  | 'CUSTOM';

// Prioridades
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Canais de entrega
export type DeliveryChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';

// Status da notificação
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

// Frequência de recorrência
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

// Interface para notificação
export interface FinancialNotification {
  id?: string;
  tenant_id: string;
  user_id?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: DeliveryChannel[];
  status: NotificationStatus;
  scheduled_for?: Date;
  sent_at?: Date;
  delivered_at?: Date;
  error_message?: string;
  retry_count?: number;
  max_retries?: number;
  expires_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

// Interface para template de notificação
export interface NotificationTemplate {
  id?: string;
  tenant_id: string;
  type: NotificationType;
  name: string;
  title_template: string;
  message_template: string;
  default_channels: DeliveryChannel[];
  default_priority: NotificationPriority;
  variables: TemplateVariable[];
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Interface para variável de template
export interface TemplateVariable {
  name: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN';
  description: string;
  required: boolean;
  default_value?: any;
}

// Interface para regra de notificação
export interface NotificationRule {
  id?: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: NotificationType;
  conditions: RuleCondition[];
  template_id: string;
  channels: DeliveryChannel[];
  priority: NotificationPriority;
  is_active: boolean;
  schedule_offset_days?: number;
  schedule_offset_hours?: number;
  recurrence?: {
    frequency: RecurrenceFrequency;
    interval: number;
    end_date?: Date;
  };
  created_at?: Date;
  updated_at?: Date;
}

// Interface para condição de regra
export interface RuleCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IN' | 'BETWEEN';
  value: any;
  logical_operator?: 'AND' | 'OR';
}

// Interface para configurações de usuário
export interface UserNotificationSettings {
  id?: string;
  user_id: string;
  tenant_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_start?: string; // HH:mm format
  quiet_hours_end?: string; // HH:mm format
  timezone: string;
  notification_types: {
    type: NotificationType;
    enabled: boolean;
    channels: DeliveryChannel[];
    priority_threshold: NotificationPriority;
  }[];
  created_at?: Date;
  updated_at?: Date;
}

// Interface para estatísticas de notificação
export interface NotificationStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  average_delivery_time: number;
  stats_by_type: {
    type: NotificationType;
    sent: number;
    delivered: number;
    failed: number;
  }[];
  stats_by_channel: {
    channel: DeliveryChannel;
    sent: number;
    delivered: number;
    failed: number;
  }[];
  period_start: Date;
  period_end: Date;
}

// Interface para filtros de busca
export interface NotificationSearchFilters {
  tenant_id: string;
  user_id?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  channel?: DeliveryChannel;
  date_from?: Date;
  date_to?: Date;
  search_text?: string;
  limit?: number;
  offset?: number;
}

// Interface para webhook de entrega
export interface DeliveryWebhook {
  id?: string;
  tenant_id: string;
  name: string;
  url: string;
  secret_key: string;
  events: NotificationType[];
  is_active: boolean;
  retry_config: {
    max_retries: number;
    retry_delay_seconds: number;
    exponential_backoff: boolean;
  };
  headers?: Record<string, string>;
  created_at?: Date;
  updated_at?: Date;
}

class FinancialNotificationService {
  // Criar notificação
  async createNotification(
    notification: Omit<FinancialNotification, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<FinancialNotification | null> {
    try {
      const { data, error } = await supabase
        .from('financial_notifications')
        .insert({
          ...notification,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log de auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: notification.tenant_id,
        user_id: userId,
        action: 'CREATE',
        entity_type: 'NOTIFICATION',
        entity_id: data.id,
        details: {
          type: notification.type,
          priority: notification.priority,
          channels: notification.channels
        }
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }
  }

  // Enviar notificação
  async sendNotification(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) {
        throw new Error('Notificação não encontrada');
      }

      // Verificar se já foi enviada
      if (notification.status !== 'PENDING') {
        throw new Error('Notificação já foi processada');
      }

      // Verificar se expirou
      if (notification.expires_at && isAfter(new Date(), notification.expires_at)) {
        await this.updateNotificationStatus(notificationId, 'CANCELLED', 'Notificação expirada');
        return false;
      }

      // Obter configurações do usuário
      const userSettings = notification.user_id 
        ? await this.getUserNotificationSettings(notification.user_id, notification.tenant_id)
        : null;

      // Filtrar canais baseado nas configurações do usuário
      const enabledChannels = this.filterEnabledChannels(
        notification.channels,
        userSettings,
        notification.type,
        notification.priority
      );

      if (enabledChannels.length === 0) {
        await this.updateNotificationStatus(notificationId, 'CANCELLED', 'Nenhum canal habilitado');
        return false;
      }

      // Enviar por cada canal
      const deliveryResults = await Promise.allSettled(
        enabledChannels.map(channel => this.deliverToChannel(notification, channel))
      );

      // Verificar resultados
      const successfulDeliveries = deliveryResults.filter(result => result.status === 'fulfilled');
      const failedDeliveries = deliveryResults.filter(result => result.status === 'rejected');

      let status: NotificationStatus;
      let errorMessage: string | undefined;

      if (successfulDeliveries.length === enabledChannels.length) {
        status = 'DELIVERED';
      } else if (successfulDeliveries.length > 0) {
        status = 'SENT';
        errorMessage = `Falha parcial: ${failedDeliveries.length} de ${enabledChannels.length} canais falharam`;
      } else {
        status = 'FAILED';
        errorMessage = 'Falha em todos os canais de entrega';
      }

      // Atualizar status
      await this.updateNotificationStatus(notificationId, status, errorMessage);

      // Log de auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: notification.tenant_id,
        user_id: userId,
        action: 'SEND',
        entity_type: 'NOTIFICATION',
        entity_id: notificationId,
        details: {
          status,
          channels: enabledChannels,
          successful_deliveries: successfulDeliveries.length,
          failed_deliveries: failedDeliveries.length
        }
      });

      return status === 'DELIVERED' || status === 'SENT';
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      await this.updateNotificationStatus(notificationId, 'FAILED', error instanceof Error ? error.message : 'Erro desconhecido');
      return false;
    }
  }

  // Entregar notificação por canal específico
  private async deliverToChannel(
    notification: FinancialNotification,
    channel: DeliveryChannel
  ): Promise<void> {
    switch (channel) {
      case 'EMAIL':
        await this.sendEmail(notification);
        break;
      case 'SMS':
        await this.sendSMS(notification);
        break;
      case 'PUSH':
        await this.sendPushNotification(notification);
        break;
      case 'IN_APP':
        await this.createInAppNotification(notification);
        break;
      case 'WEBHOOK':
        await this.sendWebhook(notification);
        break;
      default:
        throw new Error(`Canal não suportado: ${channel}`);
    }
  }

  // Enviar email (implementação simulada)
  private async sendEmail(notification: FinancialNotification): Promise<void> {
    // Aqui seria integrado com serviço de email (SendGrid, AWS SES, etc.)
    console.log('Enviando email:', {
      to: notification.user_id,
      subject: notification.title,
      body: notification.message
    });
    
    // Simular delay de envio
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Enviar SMS (implementação simulada)
  private async sendSMS(notification: FinancialNotification): Promise<void> {
    // Aqui seria integrado com serviço de SMS (Twilio, AWS SNS, etc.)
    console.log('Enviando SMS:', {
      to: notification.user_id,
      message: `${notification.title}: ${notification.message}`
    });
    
    // Simular delay de envio
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Enviar push notification (implementação simulada)
  private async sendPushNotification(notification: FinancialNotification): Promise<void> {
    // Aqui seria integrado com serviço de push (Firebase, OneSignal, etc.)
    console.log('Enviando push notification:', {
      to: notification.user_id,
      title: notification.title,
      body: notification.message,
      data: notification.data
    });
    
    // Simular delay de envio
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Criar notificação in-app
  private async createInAppNotification(notification: FinancialNotification): Promise<void> {
    const { error } = await supabase
      .from('in_app_notifications')
      .insert({
        user_id: notification.user_id,
        tenant_id: notification.tenant_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        data: notification.data,
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  // Enviar webhook
  private async sendWebhook(notification: FinancialNotification): Promise<void> {
    const webhooks = await this.getActiveWebhooks(notification.tenant_id, notification.type);
    
    for (const webhook of webhooks) {
      try {
        const payload = {
          notification_id: notification.id,
          type: notification.type,
          priority: notification.priority,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          timestamp: new Date().toISOString()
        };

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': webhook.secret_key,
            ...webhook.headers
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Erro ao enviar webhook ${webhook.id}:`, error);
        // Implementar retry logic aqui se necessário
      }
    }
  }

  // Filtrar canais habilitados baseado nas configurações do usuário
  private filterEnabledChannels(
    channels: DeliveryChannel[],
    userSettings: UserNotificationSettings | null,
    type: NotificationType,
    priority: NotificationPriority
  ): DeliveryChannel[] {
    if (!userSettings) {
      return channels;
    }

    // Verificar configurações globais
    const enabledChannels = channels.filter(channel => {
      switch (channel) {
        case 'EMAIL':
          return userSettings.email_enabled;
        case 'SMS':
          return userSettings.sms_enabled;
        case 'PUSH':
          return userSettings.push_enabled;
        case 'IN_APP':
          return userSettings.in_app_enabled;
        case 'WEBHOOK':
          return true; // Webhooks não são controlados por configurações de usuário
        default:
          return false;
      }
    });

    // Verificar configurações específicas por tipo
    const typeSettings = userSettings.notification_types.find(nt => nt.type === type);
    if (typeSettings) {
      if (!typeSettings.enabled) {
        return [];
      }

      // Verificar threshold de prioridade
      const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const currentPriorityIndex = priorityOrder.indexOf(priority);
      const thresholdIndex = priorityOrder.indexOf(typeSettings.priority_threshold);
      
      if (currentPriorityIndex < thresholdIndex) {
        return [];
      }

      // Filtrar por canais específicos do tipo
      return enabledChannels.filter(channel => typeSettings.channels.includes(channel));
    }

    return enabledChannels;
  }

  // Atualizar status da notificação
  private async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'SENT') {
      updateData.sent_at = new Date().toISOString();
    } else if (status === 'DELIVERED') {
      updateData.sent_at = updateData.sent_at || new Date().toISOString();
      updateData.delivered_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('financial_notifications')
      .update(updateData)
      .eq('id', notificationId);

    if (error) throw error;
  }

  // Buscar notificação por ID
  async getNotification(notificationId: string): Promise<FinancialNotification | null> {
    try {
      const { data, error } = await supabase
        .from('financial_notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar notificação:', error);
      return null;
    }
  }

  // Buscar notificações
  async searchNotifications(
    filters: NotificationSearchFilters
  ): Promise<{ notifications: FinancialNotification[]; total: number }> {
    try {
      let query = supabase
        .from('financial_notifications')
        .select('*', { count: 'exact' })
        .eq('tenant_id', filters.tenant_id);

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from.toISOString());
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to.toISOString());
      }

      if (filters.search_text) {
        query = query.or(`title.ilike.%${filters.search_text}%,message.ilike.%${filters.search_text}%`);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        notifications: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return { notifications: [], total: 0 };
    }
  }

  // 🔐 Criar template de notificação com validação de tenant_id obrigatória
  async createNotificationTemplate(
    template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<NotificationTemplate | null> {
    if (!template.tenant_id) {
      console.error('🚨 [SECURITY] Tentativa de criar template sem tenant_id');
      throw new Error('tenant_id é obrigatório para criar templates');
    }

    try {
      console.log(`✏️ [AUDIT] Criando template para tenant: ${template.tenant_id}`, { name: template.name, type: template.type });
      
      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          ...template,
          tenant_id: template.tenant_id, // 🔑 REGRA DE OURO: SEMPRE INCLUIR TENANT_ID
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('🚨 [SECURITY] Erro ao criar template:', error);
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA: Verificar se o template criado pertence ao tenant correto
      if (data.tenant_id !== template.tenant_id) {
        console.error('🚨 [SECURITY BREACH] Template criado com tenant_id incorreto:', data);
        throw new Error('Erro de segurança: tenant_id incorreto no template criado');
      }

      // Log de auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: template.tenant_id,
        user_id: userId,
        action: 'CREATE',
        entity_type: 'NOTIFICATION_TEMPLATE',
        entity_id: data.id,
        metadata: {
          name: template.name,
          type: template.type
        },
        risk_level: 'LOW'
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar template:', error);
      return null;
    }
  }

  // 🔐 Buscar templates com validação de tenant_id obrigatória
  async getNotificationTemplates(
    tenantId: string,
    type?: NotificationType
  ): Promise<NotificationTemplate[]> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de buscar templates sem tenant_id');
      throw new Error('tenant_id é obrigatório para buscar templates');
    }

    try {
      console.log(`🔍 [AUDIT] Buscando templates para tenant: ${tenantId}`, { type });
      
      let query = supabase
        .from('notification_templates')
        .select('*')
        .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
        .eq('is_active', true);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query.order('name');

      if (error) {
        console.error('🚨 [SECURITY] Erro ao buscar templates:', error);
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA: Verificar se todos os registros pertencem ao tenant
      const invalidRecords = data?.filter(template => template.tenant_id !== tenantId) || [];
      if (invalidRecords.length > 0) {
        console.error('🚨 [SECURITY BREACH] Templates de outros tenants detectados:', invalidRecords);
        throw new Error('Erro de segurança: dados de outros tenants detectados');
      }

      console.log(`✅ [AUDIT] ${data?.length || 0} templates carregados com segurança para tenant: ${tenantId}`);
      return data || [];
    } catch (error) {
      console.error('🚨 [SECURITY] Erro ao buscar templates:', error);
      return [];
    }
  }

  // Criar notificação a partir de template
  async createNotificationFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    overrides: Partial<FinancialNotification>,
    userId: string
  ): Promise<FinancialNotification | null> {
    try {
      const template = await this.getNotificationTemplate(templateId);
      if (!template) {
        throw new Error('Template não encontrado');
      }

      // Processar templates
      const title = this.processTemplate(template.title_template, variables);
      const message = this.processTemplate(template.message_template, variables);

      const notification: Omit<FinancialNotification, 'id' | 'created_at' | 'updated_at'> = {
        tenant_id: template.tenant_id,
        type: template.type,
        priority: template.default_priority,
        title,
        message,
        channels: template.default_channels,
        status: 'PENDING',
        data: variables,
        ...overrides
      };

      return await this.createNotification(notification, userId);
    } catch (error) {
      console.error('Erro ao criar notificação a partir de template:', error);
      return null;
    }
  }

  // Processar template com variáveis
  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      let formattedValue = value;
      
      // Formatação especial para tipos específicos
      if (value instanceof Date) {
        formattedValue = format(value, 'dd/MM/yyyy HH:mm', { locale: ptBR });
      } else if (typeof value === 'number' && key.toLowerCase().includes('valor')) {
        formattedValue = `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
      
      processed = processed.replace(new RegExp(placeholder, 'g'), String(formattedValue));
    });
    
    return processed;
  }

  // 🔐 Buscar template por ID com validação de tenant_id obrigatória
  async getNotificationTemplate(templateId: string, tenantId: string): Promise<NotificationTemplate | null> {
    if (!tenantId) {
      console.error('🚨 [SECURITY] Tentativa de buscar template sem tenant_id');
      throw new Error('tenant_id é obrigatório para buscar templates');
    }

    try {
      console.log(`🔍 [AUDIT] Buscando template ${templateId} para tenant: ${tenantId}`);
      
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .eq('tenant_id', tenantId) // 🔑 REGRA DE OURO: SEMPRE FILTRAR POR TENANT_ID
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`⚠️ [AUDIT] Template ${templateId} não encontrado ou não pertence ao tenant: ${tenantId}`);
          return null;
        }
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA: Verificar se o template pertence ao tenant
      if (data.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY BREACH] Template de outro tenant detectado:', { templateId, tenantId, actualTenantId: data.tenant_id });
        throw new Error('Erro de segurança: template não pertence ao tenant');
      }

      console.log(`✅ [AUDIT] Template ${templateId} carregado com segurança para tenant: ${tenantId}`);
      return data;
    } catch (error) {
      console.error('🚨 [SECURITY] Erro ao buscar template:', error);
      return null;
    }
  }

  // Criar regra de notificação
  async createNotificationRule(
    rule: Omit<NotificationRule, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<NotificationRule | null> {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .insert({
          ...rule,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log de auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: rule.tenant_id,
        user_id: userId,
        action: 'CREATE',
        entity_type: 'NOTIFICATION_RULE',
        entity_id: data.id,
        details: {
          name: rule.name,
          type: rule.type
        }
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar regra:', error);
      return null;
    }
  }

  // Processar regras automáticas
  async processAutomaticRules(tenantId: string): Promise<number> {
    try {
      const rules = await this.getActiveNotificationRules(tenantId);
      let processedCount = 0;

      for (const rule of rules) {
        try {
          const shouldTrigger = await this.evaluateRuleConditions(rule);
          if (shouldTrigger) {
            await this.triggerRuleNotification(rule);
            processedCount++;
          }
        } catch (error) {
          console.error(`Erro ao processar regra ${rule.id}:`, error);
        }
      }

      return processedCount;
    } catch (error) {
      console.error('Erro ao processar regras automáticas:', error);
      return 0;
    }
  }

  // Buscar regras ativas
  private async getActiveNotificationRules(tenantId: string): Promise<NotificationRule[]> {
    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  // Avaliar condições da regra
  private async evaluateRuleConditions(rule: NotificationRule): Promise<boolean> {
    // Implementação simplificada - em produção seria mais robusta
    for (const condition of rule.conditions) {
      const result = await this.evaluateCondition(condition, rule.tenant_id);
      
      // Para simplificar, assumimos AND entre todas as condições
      if (!result) {
        return false;
      }
    }
    
    return true;
  }

  // Avaliar condição individual
  private async evaluateCondition(condition: RuleCondition, tenantId: string): Promise<boolean> {
    // Implementação simplificada - aqui seria feita a consulta real aos dados
    // baseada no campo e operador da condição
    
    // Exemplo: verificar se há pagamentos em atraso
    if (condition.field === 'overdue_payments' && condition.operator === 'GREATER_THAN') {
      const { data } = await supabase
        .from('payments')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'OVERDUE')
        .limit(condition.value + 1);
      
      return (data?.length || 0) > condition.value;
    }
    
    return false;
  }

  // Disparar notificação da regra
  private async triggerRuleNotification(rule: NotificationRule): Promise<void> {
    const template = await this.getNotificationTemplate(rule.template_id);
    if (!template) {
      throw new Error('Template não encontrado para a regra');
    }

    // Buscar dados para as variáveis do template
    const variables = await this.gatherTemplateVariables(rule, template);

    // Criar notificação
    const notification = await this.createNotificationFromTemplate(
      rule.template_id,
      variables,
      {
        priority: rule.priority,
        channels: rule.channels,
        scheduled_for: rule.schedule_offset_days || rule.schedule_offset_hours 
          ? this.calculateScheduledTime(rule.schedule_offset_days, rule.schedule_offset_hours)
          : undefined
      },
      'system' // User ID do sistema para regras automáticas
    );

    if (notification && !notification.scheduled_for) {
      // Enviar imediatamente se não foi agendada
      await this.sendNotification(notification.id!, 'system');
    }
  }

  // Calcular tempo agendado
  private calculateScheduledTime(offsetDays?: number, offsetHours?: number): Date {
    let scheduledTime = new Date();
    
    if (offsetDays) {
      scheduledTime = addDays(scheduledTime, offsetDays);
    }
    
    if (offsetHours) {
      scheduledTime = addHours(scheduledTime, offsetHours);
    }
    
    return scheduledTime;
  }

  // Coletar variáveis do template
  private async gatherTemplateVariables(
    rule: NotificationRule,
    template: NotificationTemplate
  ): Promise<Record<string, any>> {
    const variables: Record<string, any> = {};
    
    // Implementação simplificada - em produção seria mais robusta
    // baseada nas variáveis definidas no template
    
    for (const variable of template.variables) {
      switch (variable.name) {
        case 'current_date':
          variables[variable.name] = new Date();
          break;
        case 'tenant_name':
          // Buscar nome do tenant
          variables[variable.name] = 'Empresa';
          break;
        default:
          variables[variable.name] = variable.default_value;
      }
    }
    
    return variables;
  }

  // Buscar configurações de notificação do usuário
  async getUserNotificationSettings(
    userId: string,
    tenantId: string
  ): Promise<UserNotificationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar configurações do usuário:', error);
      return null;
    }
  }

  // Atualizar configurações de notificação do usuário
  async updateUserNotificationSettings(
    settings: UserNotificationSettings,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Log de auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: settings.tenant_id,
        user_id: userId,
        action: 'UPDATE',
        entity_type: 'USER_NOTIFICATION_SETTINGS',
        entity_id: settings.user_id,
        details: {
          email_enabled: settings.email_enabled,
          sms_enabled: settings.sms_enabled,
          push_enabled: settings.push_enabled
        }
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      return false;
    }
  }

  // Buscar webhooks ativos
  private async getActiveWebhooks(
    tenantId: string,
    eventType: NotificationType
  ): Promise<DeliveryWebhook[]> {
    const { data, error } = await supabase
      .from('delivery_webhooks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (error) throw error;
    return data || [];
  }

  // Processar notificações agendadas
  async processScheduledNotifications(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('financial_notifications')
        .select('*')
        .eq('status', 'PENDING')
        .not('scheduled_for', 'is', null)
        .lte('scheduled_for', new Date().toISOString())
        .limit(100);

      if (error) throw error;

      let processedCount = 0;
      for (const notification of data || []) {
        try {
          const success = await this.sendNotification(notification.id, 'system');
          if (success) {
            processedCount++;
          }
        } catch (error) {
          console.error(`Erro ao processar notificação agendada ${notification.id}:`, error);
        }
      }

      return processedCount;
    } catch (error) {
      console.error('Erro ao processar notificações agendadas:', error);
      return 0;
    }
  }

  // Gerar estatísticas de notificação
  async generateNotificationStats(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<NotificationStats> {
    try {
      // Buscar estatísticas gerais
      const { data: generalStats } = await supabase
        .from('financial_notifications')
        .select('status')
        .eq('tenant_id', tenantId)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      const totalSent = generalStats?.filter(n => ['SENT', 'DELIVERED'].includes(n.status)).length || 0;
      const totalDelivered = generalStats?.filter(n => n.status === 'DELIVERED').length || 0;
      const totalFailed = generalStats?.filter(n => n.status === 'FAILED').length || 0;

      // Buscar estatísticas por tipo
      const { data: typeStats } = await supabase
        .from('financial_notifications')
        .select('type, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      const statsByType = this.groupStatsByField(typeStats || [], 'type');

      // Estatísticas por canal (implementação simplificada)
      const statsByChannel = [
        { channel: 'EMAIL' as DeliveryChannel, sent: Math.floor(totalSent * 0.6), delivered: Math.floor(totalDelivered * 0.6), failed: Math.floor(totalFailed * 0.3) },
        { channel: 'SMS' as DeliveryChannel, sent: Math.floor(totalSent * 0.2), delivered: Math.floor(totalDelivered * 0.2), failed: Math.floor(totalFailed * 0.2) },
        { channel: 'PUSH' as DeliveryChannel, sent: Math.floor(totalSent * 0.15), delivered: Math.floor(totalDelivered * 0.15), failed: Math.floor(totalFailed * 0.3) },
        { channel: 'IN_APP' as DeliveryChannel, sent: Math.floor(totalSent * 0.05), delivered: Math.floor(totalDelivered * 0.05), failed: Math.floor(totalFailed * 0.2) }
      ];

      return {
        total_sent: totalSent,
        total_delivered: totalDelivered,
        total_failed: totalFailed,
        delivery_rate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        average_delivery_time: 2.5, // Tempo médio em minutos (simulado)
        stats_by_type: statsByType,
        stats_by_channel: statsByChannel,
        period_start: periodStart,
        period_end: periodEnd
      };
    } catch (error) {
      console.error('Erro ao gerar estatísticas:', error);
      return {
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0,
        delivery_rate: 0,
        average_delivery_time: 0,
        stats_by_type: [],
        stats_by_channel: [],
        period_start: periodStart,
        period_end: periodEnd
      };
    }
  }

  // Agrupar estatísticas por campo
  private groupStatsByField(
    data: Array<{ type?: string; status: string }>,
    field: 'type'
  ): Array<{ type: NotificationType; sent: number; delivered: number; failed: number }> {
    const grouped = data.reduce((acc, item) => {
      const key = item[field] as NotificationType;
      if (!acc[key]) {
        acc[key] = { sent: 0, delivered: 0, failed: 0 };
      }
      
      if (['SENT', 'DELIVERED'].includes(item.status)) {
        acc[key].sent++;
      }
      if (item.status === 'DELIVERED') {
        acc[key].delivered++;
      }
      if (item.status === 'FAILED') {
        acc[key].failed++;
      }
      
      return acc;
    }, {} as Record<NotificationType, { sent: number; delivered: number; failed: number }>);

    return Object.entries(grouped).map(([type, stats]) => ({
      type: type as NotificationType,
      ...stats
    }));
  }

  // Cancelar notificação
  async cancelNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) {
        throw new Error('Notificação não encontrada');
      }

      if (notification.status !== 'PENDING') {
        throw new Error('Apenas notificações pendentes podem ser canceladas');
      }

      await this.updateNotificationStatus(notificationId, 'CANCELLED', 'Cancelada pelo usuário');

      // Log de auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: notification.tenant_id,
        user_id: userId,
        action: 'CANCEL',
        entity_type: 'NOTIFICATION',
        entity_id: notificationId,
        details: {
          type: notification.type,
          priority: notification.priority
        }
      });

      return true;
    } catch (error) {
      console.error('Erro ao cancelar notificação:', error);
      return false;
    }
  }

  // Reenviar notificação
  async retryNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) {
        throw new Error('Notificação não encontrada');
      }

      if (notification.status !== 'FAILED') {
        throw new Error('Apenas notificações falhadas podem ser reenviadas');
      }

      // Verificar limite de tentativas
      const retryCount = (notification.retry_count || 0) + 1;
      const maxRetries = notification.max_retries || 3;
      
      if (retryCount > maxRetries) {
        throw new Error('Limite máximo de tentativas excedido');
      }

      // Atualizar contador de tentativas e status
      await supabase
        .from('financial_notifications')
        .update({
          status: 'PENDING',
          retry_count: retryCount,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      // Tentar enviar novamente
      return await this.sendNotification(notificationId, userId);
    } catch (error) {
      console.error('Erro ao reenviar notificação:', error);
      return false;
    }
  }
}

export const financialNotificationService = new FinancialNotificationService();

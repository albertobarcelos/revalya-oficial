/**
 * Serviço de Notificações de Segurança - Sistema Revalya
 * Gerencia alertas e notificações sobre eventos de segurança
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AuthEventType, getRiskLevel } from '../types/auth';

/**
 * Tipos de notificação de segurança
 */
export type SecurityNotificationType = 
  | 'HIGH_RISK_LOGIN'
  | 'MULTIPLE_FAILED_ATTEMPTS'
  | 'NEW_DEVICE_LOGIN'
  | 'SUSPICIOUS_LOCATION'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_COMPROMISE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ADMIN_ACCESS'
  | 'DATA_BREACH_ATTEMPT'
  | 'SYSTEM_ANOMALY';

/**
 * Interface para notificação de segurança
 */
export interface SecurityNotification {
  id?: string;
  type: SecurityNotificationType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  details: Record<string, any>;
  user_id?: string;
  tenant_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

/**
 * Interface para canal de notificação
 */
export interface NotificationChannel {
  type: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'SLACK' | 'TEAMS' | 'PUSH';
  enabled: boolean;
  config: Record<string, any>;
  conditions: {
    minSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    notificationTypes: SecurityNotificationType[];
    timeWindow?: number; // minutos
    maxNotifications?: number; // máximo por timeWindow
  };
}

/**
 * Interface para configuração de alertas
 */
export interface SecurityAlertConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  rules: {
    failedLoginThreshold: number;
    highRiskScoreThreshold: number;
    newDeviceAlert: boolean;
    adminAccessAlert: boolean;
    rateLimitAlert: boolean;
    suspiciousLocationAlert: boolean;
  };
  escalation: {
    enabled: boolean;
    timeToEscalate: number; // minutos
    escalationChannels: string[];
  };
}

/**
 * Configuração padrão de alertas
 */
const DEFAULT_ALERT_CONFIG: SecurityAlertConfig = {
  enabled: true,
  channels: [
    {
      type: 'EMAIL',
      enabled: true,
      config: {
        recipients: ['admin@revalya.com', 'security@revalya.com']
      },
      conditions: {
        minSeverity: 'MEDIUM',
        notificationTypes: [
          'HIGH_RISK_LOGIN',
          'MULTIPLE_FAILED_ATTEMPTS',
          'ACCOUNT_LOCKED',
          'TOKEN_COMPROMISE',
          'ADMIN_ACCESS'
        ]
      }
    }
  ],
  rules: {
    failedLoginThreshold: 5,
    highRiskScoreThreshold: 70,
    newDeviceAlert: true,
    adminAccessAlert: true,
    rateLimitAlert: true,
    suspiciousLocationAlert: false
  },
  escalation: {
    enabled: true,
    timeToEscalate: 30,
    escalationChannels: ['EMAIL', 'SMS']
  }
};

/**
 * Cache para controle de rate limiting de notificações
 */
const notificationCache = new Map<string, { count: number; resetTime: number }>();

/**
 * Classe principal do serviço de notificações
 */
export class SecurityNotificationService {
  private supabase: SupabaseClient;
  private config: SecurityAlertConfig;
  
  constructor(supabase: SupabaseClient, config?: Partial<SecurityAlertConfig>) {
    this.supabase = supabase;
    this.config = { ...DEFAULT_ALERT_CONFIG, ...config };
  }
  
  /**
   * Processa evento de autenticação e gera notificações se necessário
   */
  async processAuthEvent(
    eventType: AuthEventType,
    details: Record<string, any>,
    riskScore: number,
    userId?: string,
    tenantId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    if (!this.config.enabled) return;
    
    try {
      const notifications = await this.analyzeEvent(
        eventType,
        details,
        riskScore,
        userId,
        tenantId,
        ipAddress,
        userAgent
      );
      
      for (const notification of notifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('Erro ao processar evento de segurança:', error);
    }
  }
  
  /**
   * Analisa evento e determina quais notificações enviar
   */
  private async analyzeEvent(
    eventType: AuthEventType,
    details: Record<string, any>,
    riskScore: number,
    userId?: string,
    tenantId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SecurityNotification[]> {
    const notifications: SecurityNotification[] = [];
    const riskLevel = getRiskLevel(riskScore);
    
    // Analisa login com alto risco
    if (eventType === 'LOGIN_SUCCESS' && riskScore >= this.config.rules.highRiskScoreThreshold) {
      notifications.push({
        type: 'HIGH_RISK_LOGIN',
        severity: riskLevel as any,
        title: 'Login de Alto Risco Detectado',
        message: `Login realizado com score de risco ${riskScore}/100`,
        details: {
          eventType,
          riskScore,
          riskLevel,
          factors: details.riskFactors || {},
          location: details.location,
          device: details.device
        },
        user_id: userId,
        tenant_id: tenantId,
        ip_address: ipAddress,
        user_agent: userAgent
      });
    }
    
    // Analisa múltiplas tentativas falhadas
    if (eventType === 'LOGIN_FAILED') {
      const recentFailures = await this.getRecentFailedAttempts(ipAddress, userId);
      if (recentFailures >= this.config.rules.failedLoginThreshold) {
        notifications.push({
          type: 'MULTIPLE_FAILED_ATTEMPTS',
          severity: 'HIGH',
          title: 'Múltiplas Tentativas de Login Falhadas',
          message: `${recentFailures} tentativas falhadas detectadas`,
          details: {
            failedAttempts: recentFailures,
            threshold: this.config.rules.failedLoginThreshold,
            timeWindow: '15 minutos'
          },
          user_id: userId,
          tenant_id: tenantId,
          ip_address: ipAddress,
          user_agent: userAgent
        });
      }
    }
    
    // Analisa novo dispositivo
    if (eventType === 'LOGIN_SUCCESS' && this.config.rules.newDeviceAlert) {
      const isNewDevice = await this.isNewDevice(userId, userAgent, ipAddress);
      if (isNewDevice) {
        notifications.push({
          type: 'NEW_DEVICE_LOGIN',
          severity: 'MEDIUM',
          title: 'Login de Novo Dispositivo',
          message: 'Login realizado a partir de um dispositivo não reconhecido',
          details: {
            deviceInfo: {
              userAgent,
              ip: ipAddress,
              estimatedLocation: details.location
            }
          },
          user_id: userId,
          tenant_id: tenantId,
          ip_address: ipAddress,
          user_agent: userAgent
        });
      }
    }
    
    // Analisa acesso administrativo
    if (this.config.rules.adminAccessAlert && details.isAdminAccess) {
      notifications.push({
        type: 'ADMIN_ACCESS',
        severity: 'HIGH',
        title: 'Acesso Administrativo Detectado',
        message: 'Usuário acessou área administrativa do sistema',
        details: {
          adminPath: details.path,
          userRole: details.userRole,
          permissions: details.permissions
        },
        user_id: userId,
        tenant_id: tenantId,
        ip_address: ipAddress,
        user_agent: userAgent
      });
    }
    
    // Analisa rate limiting
    if (eventType === 'RATE_LIMIT_EXCEEDED' && this.config.rules.rateLimitAlert) {
      notifications.push({
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'MEDIUM',
        title: 'Limite de Taxa Excedido',
        message: 'IP excedeu o limite de requisições permitidas',
        details: {
          requestCount: details.requestCount,
          timeWindow: details.timeWindow,
          limit: details.limit
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });
    }
    
    return notifications;
  }
  
  /**
   * Envia notificação através dos canais configurados
   */
  private async sendNotification(notification: SecurityNotification): Promise<void> {
    // Salva notificação no banco
    await this.saveNotification(notification);
    
    // Verifica rate limiting para evitar spam
    if (!this.shouldSendNotification(notification)) {
      return;
    }
    
    // Envia através dos canais configurados
    for (const channel of this.config.channels) {
      if (!channel.enabled) continue;
      
      // Verifica se atende às condições do canal
      if (!this.meetsChannelConditions(notification, channel)) {
        continue;
      }
      
      try {
        await this.sendThroughChannel(notification, channel);
      } catch (error) {
        console.error(`Erro ao enviar notificação via ${channel.type}:`, error);
      }
    }
  }
  
  /**
   * Salva notificação no banco de dados
   */
  private async saveNotification(notification: SecurityNotification): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('security_notifications')
        .insert({
          type: notification.type,
          severity: notification.severity,
          title: notification.title,
          message: notification.message,
          details: notification.details,
          user_id: notification.user_id,
          tenant_id: notification.tenant_id,
          ip_address: notification.ip_address,
          user_agent: notification.user_agent,
          acknowledged: false
        });
      
      if (error) {
        console.error('Erro ao salvar notificação:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar notificação:', error);
    }
  }
  
  /**
   * Verifica se deve enviar notificação (rate limiting)
   */
  private shouldSendNotification(notification: SecurityNotification): boolean {
    const key = `${notification.type}:${notification.ip_address || 'global'}`;
    const now = Date.now();
    const windowStart = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000); // Janela de 15 minutos
    
    const cacheKey = `${key}:${windowStart}`;
    const current = notificationCache.get(cacheKey) || { count: 0, resetTime: windowStart + (15 * 60 * 1000) };
    
    current.count++;
    notificationCache.set(cacheKey, current);
    
    // Máximo de 3 notificações do mesmo tipo por IP a cada 15 minutos
    return current.count <= 3;
  }
  
  /**
   * Verifica se notificação atende às condições do canal
   */
  private meetsChannelConditions(
    notification: SecurityNotification,
    channel: NotificationChannel
  ): boolean {
    // Verifica severidade mínima
    const severityLevels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
    if (severityLevels[notification.severity] < severityLevels[channel.conditions.minSeverity]) {
      return false;
    }
    
    // Verifica tipos de notificação
    if (!channel.conditions.notificationTypes.includes(notification.type)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Envia notificação através de um canal específico
   */
  private async sendThroughChannel(
    notification: SecurityNotification,
    channel: NotificationChannel
  ): Promise<void> {
    switch (channel.type) {
      case 'EMAIL':
        await this.sendEmailNotification(notification, channel.config);
        break;
      case 'WEBHOOK':
        await this.sendWebhookNotification(notification, channel.config);
        break;
      case 'SLACK':
        await this.sendSlackNotification(notification, channel.config);
        break;
      default:
        console.warn(`Canal de notificação não implementado: ${channel.type}`);
    }
  }
  
  /**
   * Envia notificação por email
   */
  private async sendEmailNotification(
    notification: SecurityNotification,
    config: Record<string, any>
  ): Promise<void> {
    // Implementar integração com serviço de email (SendGrid, AWS SES, etc.)
    console.log('Enviando email de segurança:', {
      to: config.recipients,
      subject: `[SEGURANÇA] ${notification.title}`,
      body: notification.message,
      details: notification.details
    });
  }
  
  /**
   * Envia notificação via webhook
   */
  private async sendWebhookNotification(
    notification: SecurityNotification,
    config: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': config.authHeader || ''
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          notification
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
    }
  }
  
  /**
   * Envia notificação para Slack
   */
  private async sendSlackNotification(
    notification: SecurityNotification,
    config: Record<string, any>
  ): Promise<void> {
    try {
      const color = {
        'LOW': '#36a64f',
        'MEDIUM': '#ff9500',
        'HIGH': '#ff0000',
        'CRITICAL': '#8b0000'
      }[notification.severity];
      
      const payload = {
        text: `🚨 Alerta de Segurança: ${notification.title}`,
        attachments: [
          {
            color,
            fields: [
              {
                title: 'Severidade',
                value: notification.severity,
                short: true
              },
              {
                title: 'Tipo',
                value: notification.type,
                short: true
              },
              {
                title: 'Mensagem',
                value: notification.message,
                short: false
              }
            ],
            timestamp: Math.floor(Date.now() / 1000)
          }
        ]
      };
      
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Slack notification failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao enviar notificação Slack:', error);
    }
  }
  
  /**
   * Obtém tentativas falhadas recentes
   */
  private async getRecentFailedAttempts(
    ipAddress?: string,
    userId?: string
  ): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      let query = this.supabase
        .from('auth_monitoring')
        .select('id', { count: 'exact' })
        .eq('event_type', 'LOGIN_FAILED')
        .gte('created_at', fifteenMinutesAgo);
      
      if (ipAddress) {
        query = query.eq('ip_address', ipAddress);
      }
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { count, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar tentativas falhadas:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Erro ao buscar tentativas falhadas:', error);
      return 0;
    }
  }
  
  /**
   * Verifica se é um dispositivo novo
   */
  private async isNewDevice(
    userId?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<boolean> {
    if (!userId || !userAgent) return false;
    
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await this.supabase
        .from('auth_monitoring')
        .select('id')
        .eq('user_id', userId)
        .eq('user_agent', userAgent)
        .eq('event_type', 'LOGIN_SUCCESS')
        .gte('created_at', thirtyDaysAgo)
        .limit(1);
      
      if (error) {
        console.error('Erro ao verificar dispositivo:', error);
        return false;
      }
      
      return !data || data.length === 0;
    } catch (error) {
      console.error('Erro ao verificar dispositivo:', error);
      return false;
    }
  }
  
  /**
   * Marca notificação como reconhecida
   */
  async acknowledgeNotification(
    notificationId: string,
    acknowledgedBy: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('security_notifications')
        .update({
          acknowledged: true,
          acknowledged_by: acknowledgedBy,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', notificationId);
      
      if (error) {
        console.error('Erro ao marcar notificação como reconhecida:', error);
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como reconhecida:', error);
    }
  }
  
  /**
   * Obtém notificações não reconhecidas
   */
  async getUnacknowledgedNotifications(
    tenantId?: string,
    limit: number = 50
  ): Promise<SecurityNotification[]> {
    try {
      let query = this.supabase
        .from('security_notifications')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar notificações:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
  }
}

/**
 * Função para criar instância do serviço
 */
export function createSecurityNotificationService(
  supabase: SupabaseClient,
  config?: Partial<SecurityAlertConfig>
): SecurityNotificationService {
  return new SecurityNotificationService(supabase, config);
}

/**
 * Exporta configuração padrão
 */
export { DEFAULT_ALERT_CONFIG };

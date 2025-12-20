// =====================================================
// SHARED: Push Notification Service
// Descrição: Serviço de push notifications para Edge Functions
// =====================================================

export interface PushConfig {
  provider: 'firebase' | 'expo' | 'onesignal' | 'pusher';
  apiKey?: string;
  projectId?: string;
  appId?: string;
  serverKey?: string;
  vapidKey?: string;
  privateKey?: string;
  clientEmail?: string;
}

export interface PushMessage {
  tokens: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  image?: string;
  icon?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
  tag?: string;
  priority?: 'normal' | 'high';
  ttl?: number; // Time to live in seconds
  collapseKey?: string;
  channelId?: string;
  scheduledAt?: string;
  metadata?: Record<string, any>;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
  timestamp: string;
  successCount?: number;
  failureCount?: number;
  failedTokens?: string[];
  canonicalIds?: Record<string, string>;
}

export interface PushTemplate {
  name: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  variables?: Record<string, any>;
}

export interface DeviceToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  userId?: string;
  tenantId?: string;
  isActive: boolean;
  lastUsed: string;
  appVersion?: string;
  deviceInfo?: Record<string, any>;
}

export class PushNotificationService {
  private config: PushConfig;

  constructor(config: PushConfig) {
    this.config = config;
  }

  async sendPushNotification(message: PushMessage): Promise<PushResult> {
    const timestamp = new Date().toISOString();
    
    try {
      // Validate tokens
      const tokens = Array.isArray(message.tokens) ? message.tokens : [message.tokens];
      const validTokens = tokens.filter(token => this.validateToken(token));
      
      if (validTokens.length === 0) {
        throw new Error('No valid device tokens provided');
      }

      // Validate message content
      if (!message.title || !message.body) {
        throw new Error('Title and body are required');
      }

      if (message.title.length > 100 || message.body.length > 500) {
        throw new Error('Title or body too long');
      }

      switch (this.config.provider) {
        case 'firebase':
          return await this.sendWithFirebase(message, timestamp);
        case 'expo':
          return await this.sendWithExpo(message, timestamp);
        case 'onesignal':
          return await this.sendWithOneSignal(message, timestamp);
        case 'pusher':
          return await this.sendWithPusher(message, timestamp);
        default:
          throw new Error(`Unsupported push provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('Push notification sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.config.provider,
        timestamp,
      };
    }
  }

  private async sendWithFirebase(message: PushMessage, timestamp: string): Promise<PushResult> {
    if (!this.config.serverKey && !this.config.privateKey) {
      throw new Error('Firebase credentials not configured');
    }

    const tokens = Array.isArray(message.tokens) ? message.tokens : [message.tokens];
    
    // Use FCM HTTP v1 API if private key is available, otherwise legacy API
    if (this.config.privateKey && this.config.clientEmail && this.config.projectId) {
      return await this.sendWithFirebaseV1(message, tokens, timestamp);
    } else {
      return await this.sendWithFirebaseLegacy(message, tokens, timestamp);
    }
  }

  private async sendWithFirebaseV1(message: PushMessage, tokens: string[], timestamp: string): Promise<PushResult> {
    // Generate JWT token for authentication
    const accessToken = await this.generateFirebaseAccessToken();
    
    const results: PushResult[] = [];
    
    for (const token of tokens) {
      const payload = {
        message: {
          token,
          notification: {
            title: message.title,
            body: message.body,
            image: message.image,
          },
          data: message.data ? Object.fromEntries(
            Object.entries(message.data).map(([k, v]) => [k, String(v)])
          ) : undefined,
          android: {
            priority: message.priority === 'high' ? 'high' : 'normal',
            ttl: message.ttl ? `${message.ttl}s` : undefined,
            notification: {
              icon: message.icon,
              sound: message.sound,
              tag: message.tag,
              click_action: message.clickAction,
              channel_id: message.channelId,
            },
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: message.title,
                  body: message.body,
                },
                badge: message.badge,
                sound: message.sound || 'default',
                'content-available': 1,
              },
            },
          },
          webpush: {
            notification: {
              title: message.title,
              body: message.body,
              icon: message.icon,
              image: message.image,
              badge: message.badge,
              tag: message.tag,
            },
            fcm_options: {
              link: message.clickAction,
            },
          },
        },
      };

      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${this.config.projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('Firebase FCM error:', result);
        results.push({
          success: false,
          error: result.error?.message || 'Firebase FCM error',
          provider: 'firebase',
          timestamp,
        });
      } else {
        results.push({
          success: true,
          messageId: result.name,
          provider: 'firebase',
          timestamp,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return {
      success: successCount > 0,
      provider: 'firebase',
      timestamp,
      successCount,
      failureCount,
      messageId: results.find(r => r.success)?.messageId,
      error: failureCount > 0 ? `${failureCount} messages failed` : undefined,
    };
  }

  private async sendWithFirebaseLegacy(message: PushMessage, tokens: string[], timestamp: string): Promise<PushResult> {
    const payload = {
      registration_ids: tokens,
      notification: {
        title: message.title,
        body: message.body,
        icon: message.icon,
        image: message.image,
        sound: message.sound || 'default',
        badge: message.badge,
        tag: message.tag,
        click_action: message.clickAction,
      },
      data: message.data,
      priority: message.priority === 'high' ? 'high' : 'normal',
      time_to_live: message.ttl,
      collapse_key: message.collapseKey,
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${this.config.serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Firebase FCM error: ${result.error || response.statusText}`);
    }

    const failedTokens: string[] = [];
    const canonicalIds: Record<string, string> = {};
    
    if (result.results) {
      result.results.forEach((res: any, index: number) => {
        if (res.error) {
          failedTokens.push(tokens[index]);
        }
        if (res.registration_id) {
          canonicalIds[tokens[index]] = res.registration_id;
        }
      });
    }

    return {
      success: result.success > 0,
      messageId: result.multicast_id?.toString(),
      provider: 'firebase',
      timestamp,
      successCount: result.success,
      failureCount: result.failure,
      failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
      canonicalIds: Object.keys(canonicalIds).length > 0 ? canonicalIds : undefined,
    };
  }

  private async sendWithExpo(message: PushMessage, timestamp: string): Promise<PushResult> {
    const tokens = Array.isArray(message.tokens) ? message.tokens : [message.tokens];
    
    const payload = tokens.map(token => ({
      to: token,
      title: message.title,
      body: message.body,
      data: message.data,
      sound: message.sound || 'default',
      badge: message.badge,
      priority: message.priority === 'high' ? 'high' : 'normal',
      ttl: message.ttl,
      channelId: message.channelId,
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Expo push error: ${result.error || response.statusText}`);
    }

    const data = result.data || [];
    const successCount = data.filter((r: any) => r.status === 'ok').length;
    const failureCount = data.filter((r: any) => r.status === 'error').length;
    const failedTokens = data
      .map((r: any, index: number) => r.status === 'error' ? tokens[index] : null)
      .filter(Boolean);

    return {
      success: successCount > 0,
      provider: 'expo',
      timestamp,
      successCount,
      failureCount,
      failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
      messageId: data.find((r: any) => r.id)?.id,
    };
  }

  private async sendWithOneSignal(message: PushMessage, timestamp: string): Promise<PushResult> {
    if (!this.config.apiKey || !this.config.appId) {
      throw new Error('OneSignal credentials not configured');
    }

    const tokens = Array.isArray(message.tokens) ? message.tokens : [message.tokens];
    
    const payload = {
      app_id: this.config.appId,
      include_player_ids: tokens,
      headings: { en: message.title },
      contents: { en: message.body },
      data: message.data,
      large_icon: message.icon,
      big_picture: message.image,
      ios_badgeType: 'SetTo',
      ios_badgeCount: message.badge,
      ios_sound: message.sound,
      android_sound: message.sound,
      android_channel_id: message.channelId,
      priority: message.priority === 'high' ? 10 : 5,
      ttl: message.ttl,
      collapse_id: message.collapseKey,
      url: message.clickAction,
      send_after: message.scheduledAt,
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`OneSignal error: ${result.errors?.[0] || response.statusText}`);
    }

    return {
      success: true,
      messageId: result.id,
      provider: 'onesignal',
      timestamp,
      successCount: result.recipients,
    };
  }

  private async sendWithPusher(message: PushMessage, timestamp: string): Promise<PushResult> {
    // Pusher implementation would go here
    throw new Error('Pusher provider not implemented in this example');
  }

  private async generateFirebaseAccessToken(): Promise<string> {
    // This is a simplified JWT generation for Firebase
    // In production, use a proper JWT library
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // Note: This is a placeholder. In production, you'd need to properly sign the JWT
    // with the private key using a crypto library
    throw new Error('JWT signing not implemented. Use Firebase Admin SDK or proper JWT library.');
  }

  validateToken(token: string): boolean {
    // Basic token validation
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Firebase FCM token validation
    if (token.length >= 140 && /^[A-Za-z0-9_-]+$/.test(token)) {
      return true;
    }

    // Expo token validation
    if (token.startsWith('ExponentPushToken[') && token.endsWith(']')) {
      return true;
    }

    // OneSignal token validation
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      return true;
    }

    return false;
  }

  renderTemplate(template: PushTemplate, variables: Record<string, any> = {}): Omit<PushMessage, 'tokens'> {
    const allVariables = { ...template.variables, ...variables };
    
    const renderString = (str: string): string => {
      return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
        return allVariables[key]?.toString() || match;
      });
    };

    return {
      title: renderString(template.title),
      body: renderString(template.body),
      data: template.data ? Object.fromEntries(
        Object.entries(template.data).map(([k, v]) => [
          k,
          typeof v === 'string' ? renderString(v) : v
        ])
      ) : undefined,
    };
  }

  async validateTokens(tokens: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const token of tokens) {
      if (this.validateToken(token)) {
        valid.push(token);
      } else {
        invalid.push(token);
      }
    }

    return { valid, invalid };
  }
}

// Push notification templates
export const pushTemplates: Record<string, PushTemplate> = {
  contractCreated: {
    name: 'contract_created',
    title: 'Novo Contrato Criado',
    body: 'Contrato {{contractNumber}} foi criado e aguarda sua assinatura.',
    data: {
      type: 'contract',
      action: 'view',
      contractId: '{{contractId}}',
    },
  },
  
  contractSigned: {
    name: 'contract_signed',
    title: 'Contrato Assinado',
    body: 'O contrato {{contractNumber}} foi assinado com sucesso!',
    data: {
      type: 'contract',
      action: 'view',
      contractId: '{{contractId}}',
    },
  },
  
  paymentReminder: {
    name: 'payment_reminder',
    title: 'Lembrete de Pagamento',
    body: 'Você tem um pagamento de {{amount}} que vence em {{daysUntilDue}} dias.',
    data: {
      type: 'payment',
      action: 'pay',
      paymentId: '{{paymentId}}',
    },
  },
  
  paymentOverdue: {
    name: 'payment_overdue',
    title: 'Pagamento em Atraso',
    body: 'Seu pagamento de {{amount}} está {{daysOverdue}} dias em atraso.',
    data: {
      type: 'payment',
      action: 'pay',
      paymentId: '{{paymentId}}',
      priority: 'high',
    },
  },
  
  paymentConfirmed: {
    name: 'payment_confirmed',
    title: 'Pagamento Confirmado',
    body: 'Seu pagamento de {{amount}} foi confirmado. Obrigado!',
    data: {
      type: 'payment',
      action: 'view_receipt',
      paymentId: '{{paymentId}}',
    },
  },
  
  reportReady: {
    name: 'report_ready',
    title: 'Relatório Disponível',
    body: 'Seu relatório {{reportType}} está pronto para visualização.',
    data: {
      type: 'report',
      action: 'view',
      reportId: '{{reportId}}',
    },
  },
  
  securityAlert: {
    name: 'security_alert',
    title: 'Alerta de Segurança',
    body: 'Detectamos uma tentativa de acesso suspeita em sua conta.',
    data: {
      type: 'security',
      action: 'review',
      priority: 'high',
    },
  },
  
  systemMaintenance: {
    name: 'system_maintenance',
    title: 'Manutenção do Sistema',
    body: 'O sistema estará em manutenção de {{startTime}} até {{endTime}}.',
    data: {
      type: 'system',
      action: 'info',
    },
  },
};

// Utility function to create push notification service instance
export function createPushNotificationService(): PushNotificationService {
  const provider = (Deno.env.get('PUSH_PROVIDER') || 'firebase') as 'firebase' | 'expo' | 'onesignal' | 'pusher';
  
  const config: PushConfig = {
    provider,
    apiKey: Deno.env.get('PUSH_API_KEY'),
    projectId: Deno.env.get('PUSH_PROJECT_ID'),
    appId: Deno.env.get('PUSH_APP_ID'),
    serverKey: Deno.env.get('PUSH_SERVER_KEY'),
    vapidKey: Deno.env.get('PUSH_VAPID_KEY'),
    privateKey: Deno.env.get('PUSH_PRIVATE_KEY'),
    clientEmail: Deno.env.get('PUSH_CLIENT_EMAIL'),
  };

  return new PushNotificationService(config);
}

// Utility functions for device token management
export function maskDeviceToken(token: string): string {
  if (token.length <= 8) return token;
  return token.slice(0, 4) + '*'.repeat(token.length - 8) + token.slice(-4);
}

export function getTokenPlatform(token: string): 'ios' | 'android' | 'web' | 'unknown' {
  // Firebase tokens are typically 163 characters
  if (token.length >= 140 && /^[A-Za-z0-9_-]+$/.test(token)) {
    return 'unknown'; // Could be any platform
  }
  
  // Expo tokens
  if (token.startsWith('ExponentPushToken[')) {
    return 'unknown'; // Expo supports both iOS and Android
  }
  
  // OneSignal tokens (UUID format)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return 'unknown';
  }
  
  return 'unknown';
}

export function estimatePushCost(messageCount: number, provider: string): number {
  // Estimated costs per 1000 messages (in USD)
  const costs = {
    firebase: 0.00, // Free up to certain limits
    expo: 0.00, // Free
    onesignal: 0.50, // Paid plans
    pusher: 1.00, // Paid service
  };
  
  const costPer1000 = costs[provider as keyof typeof costs] || 0.50;
  return (messageCount / 1000) * costPer1000;
}
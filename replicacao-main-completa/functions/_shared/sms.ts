// =====================================================
// SHARED: SMS Service
// Descrição: Serviço de envio de SMS para Edge Functions
// =====================================================

export interface SMSConfig {
  provider: 'twilio' | 'zenvia' | 'totalvoice' | 'smsdev';
  apiKey?: string;
  apiSecret?: string;
  accountSid?: string;
  fromNumber: string;
  webhook?: string;
}

export interface SMSMessage {
  to: string | string[];
  message: string;
  from?: string;
  scheduledAt?: string;
  validityPeriod?: number; // in minutes
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
  timestamp: string;
  cost?: number;
  status?: 'sent' | 'delivered' | 'failed' | 'pending';
}

export interface SMSTemplate {
  name: string;
  message: string;
  variables?: Record<string, any>;
}

export class SMSService {
  private config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
  }

  async sendSMS(message: SMSMessage): Promise<SMSResult> {
    const timestamp = new Date().toISOString();
    
    try {
      // Validate phone numbers
      const phoneNumbers = Array.isArray(message.to) ? message.to : [message.to];
      const validNumbers = phoneNumbers.filter(phone => this.validatePhoneNumber(phone));
      
      if (validNumbers.length === 0) {
        throw new Error('No valid phone numbers provided');
      }

      // Validate message length
      if (message.message.length > 1600) {
        throw new Error('Message too long. Maximum 1600 characters allowed.');
      }

      switch (this.config.provider) {
        case 'twilio':
          return await this.sendWithTwilio(message, timestamp);
        case 'zenvia':
          return await this.sendWithZenvia(message, timestamp);
        case 'totalvoice':
          return await this.sendWithTotalVoice(message, timestamp);
        case 'smsdev':
          return await this.sendWithSMSDev(message, timestamp);
        default:
          throw new Error(`Unsupported SMS provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.config.provider,
        timestamp,
      };
    }
  }

  private async sendWithTwilio(message: SMSMessage, timestamp: string): Promise<SMSResult> {
    if (!this.config.accountSid || !this.config.apiKey) {
      throw new Error('Twilio credentials not configured');
    }

    const phoneNumbers = Array.isArray(message.to) ? message.to : [message.to];
    const results: SMSResult[] = [];

    for (const phoneNumber of phoneNumbers) {
      const payload = new URLSearchParams({
        To: this.formatPhoneNumber(phoneNumber),
        From: message.from || this.config.fromNumber,
        Body: message.message,
        ...(message.validityPeriod && { ValidityPeriod: message.validityPeriod.toString() }),
        ...(message.scheduledAt && { SendAt: message.scheduledAt }),
      });

      const auth = btoa(`${this.config.accountSid}:${this.config.apiKey}`);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: payload,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`Twilio API error: ${result.message || response.statusText}`);
      }

      results.push({
        success: true,
        messageId: result.sid,
        provider: 'twilio',
        timestamp,
        status: result.status,
        cost: parseFloat(result.price || '0'),
      });
    }

    // Return the first result for single messages, or combined result for multiple
    return results[0] || {
      success: false,
      error: 'No messages sent',
      provider: 'twilio',
      timestamp,
    };
  }

  private async sendWithZenvia(message: SMSMessage, timestamp: string): Promise<SMSResult> {
    if (!this.config.apiKey) {
      throw new Error('Zenvia API key not configured');
    }

    const phoneNumbers = Array.isArray(message.to) ? message.to : [message.to];
    const payload = {
      from: message.from || this.config.fromNumber,
      to: phoneNumbers[0], // Zenvia sends one at a time
      contents: [{
        type: 'text',
        text: message.message,
      }],
      ...(message.scheduledAt && { schedule: message.scheduledAt }),
    };

    const response = await fetch('https://api.zenvia.com/v2/channels/sms/messages', {
      method: 'POST',
      headers: {
        'X-API-TOKEN': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Zenvia API error: ${result.message || response.statusText}`);
    }

    return {
      success: true,
      messageId: result.id,
      provider: 'zenvia',
      timestamp,
      status: 'sent',
    };
  }

  private async sendWithTotalVoice(message: SMSMessage, timestamp: string): Promise<SMSResult> {
    if (!this.config.apiKey) {
      throw new Error('TotalVoice API key not configured');
    }

    const phoneNumbers = Array.isArray(message.to) ? message.to : [message.to];
    const payload = {
      numero_destino: this.formatPhoneNumber(phoneNumbers[0], 'br'),
      mensagem: message.message,
      resposta_usuario: false,
      multi_sms: message.message.length > 160,
      data_criacao: timestamp,
    };

    const response = await fetch('https://api.totalvoice.com.br/sms', {
      method: 'POST',
      headers: {
        'Access-Token': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.status) {
      throw new Error(`TotalVoice API error: ${result.mensagem || response.statusText}`);
    }

    return {
      success: true,
      messageId: result.dados?.id?.toString(),
      provider: 'totalvoice',
      timestamp,
      status: 'sent',
      cost: result.dados?.custo,
    };
  }

  private async sendWithSMSDev(message: SMSMessage, timestamp: string): Promise<SMSResult> {
    if (!this.config.apiKey) {
      throw new Error('SMSDev API key not configured');
    }

    const phoneNumbers = Array.isArray(message.to) ? message.to : [message.to];
    const payload = {
      key: this.config.apiKey,
      type: 9, // SMS type
      number: this.formatPhoneNumber(phoneNumbers[0], 'br'),
      msg: message.message,
    };

    const response = await fetch('https://api.smsdev.com.br/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.situacao !== 'OK') {
      throw new Error(`SMSDev API error: ${result.descricao || response.statusText}`);
    }

    return {
      success: true,
      messageId: result.id?.toString(),
      provider: 'smsdev',
      timestamp,
      status: 'sent',
    };
  }

  validatePhoneNumber(phone: string): boolean {
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Brazilian phone number validation (with country code)
    // Format: +5511999999999 or 5511999999999 or 11999999999
    const brazilianRegex = /^(55)?[1-9]{2}9?[0-9]{8}$/;
    
    // International format validation (basic)
    const internationalRegex = /^[1-9][0-9]{7,14}$/;
    
    return brazilianRegex.test(cleanPhone) || internationalRegex.test(cleanPhone);
  }

  formatPhoneNumber(phone: string, format: 'international' | 'br' = 'international'): string {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (format === 'br') {
      // Brazilian format without country code
      if (cleanPhone.startsWith('55')) {
        return cleanPhone.substring(2);
      }
      return cleanPhone;
    }
    
    // International format with +
    if (cleanPhone.startsWith('55')) {
      return `+${cleanPhone}`;
    }
    
    // Assume Brazilian number if no country code
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      return `+55${cleanPhone}`;
    }
    
    return `+${cleanPhone}`;
  }

  renderTemplate(template: SMSTemplate, variables: Record<string, any> = {}): string {
    const allVariables = { ...template.variables, ...variables };
    
    return template.message.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return allVariables[key]?.toString() || match;
    });
  }

  calculateMessageParts(message: string): { parts: number; encoding: 'GSM' | 'UCS2'; length: number } {
    // GSM 7-bit encoding characters
    const gsmChars = /^[A-Za-z0-9@£$¥èéùìòÇ\n\r\f^{}\\\[~\]|€ÆæßÉ !"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà]*$/;
    
    const isGSM = gsmChars.test(message);
    const encoding = isGSM ? 'GSM' : 'UCS2';
    const maxLength = isGSM ? 160 : 70;
    const maxConcatLength = isGSM ? 153 : 67;
    
    const length = message.length;
    
    if (length <= maxLength) {
      return { parts: 1, encoding, length };
    }
    
    const parts = Math.ceil(length / maxConcatLength);
    return { parts, encoding, length };
  }

  estimateCost(message: string, phoneNumbers: string[], provider: string = this.config.provider): number {
    const { parts } = this.calculateMessageParts(message);
    const totalMessages = phoneNumbers.length * parts;
    
    // Estimated costs per SMS (in BRL)
    const costs = {
      twilio: 0.08,
      zenvia: 0.06,
      totalvoice: 0.05,
      smsdev: 0.04,
    };
    
    return totalMessages * (costs[provider as keyof typeof costs] || 0.06);
  }
}

// SMS templates for common notifications
export const smsTemplates: Record<string, SMSTemplate> = {
  contractCreated: {
    name: 'contract_created',
    message: 'Novo contrato {{contractNumber}} criado. Acesse {{shortUrl}} para assinar. Revalya',
  },
  
  contractSigned: {
    name: 'contract_signed',
    message: 'Contrato {{contractNumber}} assinado com sucesso! Status: {{status}}. Revalya',
  },
  
  paymentReminder: {
    name: 'payment_reminder',
    message: 'Lembrete: Pagamento de {{amount}} vence em {{dueDate}}. Acesse {{paymentUrl}} para pagar. Revalya',
  },
  
  paymentOverdue: {
    name: 'payment_overdue',
    message: 'URGENTE: Pagamento de {{amount}} está em atraso desde {{overdueDate}}. Regularize em {{paymentUrl}}. Revalya',
  },
  
  paymentConfirmed: {
    name: 'payment_confirmed',
    message: 'Pagamento de {{amount}} confirmado! Recibo: {{receiptNumber}}. Obrigado! Revalya',
  },
  
  reportReady: {
    name: 'report_ready',
    message: 'Relatório {{reportType}} disponível. Acesse {{reportUrl}} para visualizar. Revalya',
  },
  
  securityAlert: {
    name: 'security_alert',
    message: 'ALERTA: Tentativa de acesso suspeita detectada em {{timestamp}}. Se não foi você, entre em contato. Revalya',
  },
  
  verificationCode: {
    name: 'verification_code',
    message: 'Seu código de verificação é: {{code}}. Válido por {{expiryMinutes}} minutos. Não compartilhe. Revalya',
  },
};

// Utility function to create SMS service instance
export function createSMSService(): SMSService {
  const provider = (Deno.env.get('SMS_PROVIDER') || 'totalvoice') as 'twilio' | 'zenvia' | 'totalvoice' | 'smsdev';
  
  const config: SMSConfig = {
    provider,
    apiKey: Deno.env.get('SMS_API_KEY'),
    apiSecret: Deno.env.get('SMS_API_SECRET'),
    accountSid: Deno.env.get('SMS_ACCOUNT_SID'),
    fromNumber: Deno.env.get('SMS_FROM_NUMBER') || '+5511999999999',
    webhook: Deno.env.get('SMS_WEBHOOK_URL'),
  };

  return new SMSService(config);
}

// Utility functions for phone number operations
export function maskPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length >= 10) {
    const masked = cleanPhone.slice(0, -4).replace(/\d/g, '*') + cleanPhone.slice(-4);
    return masked;
  }
  
  return phone;
}

export function formatPhoneForDisplay(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Brazilian format: +55 (11) 99999-9999
  if (cleanPhone.startsWith('55') && cleanPhone.length === 13) {
    const ddd = cleanPhone.substring(2, 4);
    const number = cleanPhone.substring(4);
    return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
  }
  
  // Brazilian format without country code: (11) 99999-9999
  if (cleanPhone.length === 11) {
    const ddd = cleanPhone.substring(0, 2);
    const number = cleanPhone.substring(2);
    return `(${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
  }
  
  return phone;
}

export function extractCountryCode(phone: string): { countryCode: string; nationalNumber: string } {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Common country codes
  const countryCodes = ['1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94', '95', '98'];
  
  for (const code of countryCodes.sort((a, b) => b.length - a.length)) {
    if (cleanPhone.startsWith(code)) {
      return {
        countryCode: code,
        nationalNumber: cleanPhone.substring(code.length),
      };
    }
  }
  
  return {
    countryCode: '',
    nationalNumber: cleanPhone,
  };
}
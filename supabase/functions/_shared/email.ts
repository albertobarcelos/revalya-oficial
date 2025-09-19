// =====================================================
// SHARED: Email Service
// Descrição: Serviço de envio de emails para Edge Functions
// =====================================================

export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'smtp';
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
}

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables?: Record<string, any>;
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
  timestamp: string;
}

export class EmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    const timestamp = new Date().toISOString();
    
    try {
      switch (this.config.provider) {
        case 'resend':
          return await this.sendWithResend(message, timestamp);
        case 'sendgrid':
          return await this.sendWithSendGrid(message, timestamp);
        case 'smtp':
          return await this.sendWithSMTP(message, timestamp);
        default:
          throw new Error(`Unsupported email provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.config.provider,
        timestamp,
      };
    }
  }

  private async sendWithResend(message: EmailMessage, timestamp: string): Promise<EmailResult> {
    if (!this.config.apiKey) {
      throw new Error('Resend API key not configured');
    }

    const payload = {
      from: `${this.config.fromName} <${this.config.fromEmail}>`,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
      html: message.htmlBody,
      text: message.textBody,
      cc: message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined,
      bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined,
      reply_to: this.config.replyTo,
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType,
      })),
      tags: message.tags?.map(tag => ({ name: tag, value: tag })),
      headers: message.headers,
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Resend API error: ${result.message || response.statusText}`);
    }

    return {
      success: true,
      messageId: result.id,
      provider: 'resend',
      timestamp,
    };
  }

  private async sendWithSendGrid(message: EmailMessage, timestamp: string): Promise<EmailResult> {
    if (!this.config.apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const payload = {
      personalizations: [{
        to: Array.isArray(message.to) 
          ? message.to.map(email => ({ email })) 
          : [{ email: message.to }],
        cc: message.cc 
          ? (Array.isArray(message.cc) ? message.cc.map(email => ({ email })) : [{ email: message.cc }])
          : undefined,
        bcc: message.bcc 
          ? (Array.isArray(message.bcc) ? message.bcc.map(email => ({ email })) : [{ email: message.bcc }])
          : undefined,
        subject: message.subject,
        custom_args: message.metadata,
      }],
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName,
      },
      reply_to: this.config.replyTo ? { email: this.config.replyTo } : undefined,
      content: [
        ...(message.textBody ? [{ type: 'text/plain', value: message.textBody }] : []),
        ...(message.htmlBody ? [{ type: 'text/html', value: message.htmlBody }] : []),
      ],
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        type: att.contentType,
        disposition: att.disposition || 'attachment',
        content_id: att.contentId,
      })),
      categories: message.tags,
      headers: message.headers,
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    const messageId = response.headers.get('x-message-id');

    return {
      success: true,
      messageId: messageId || undefined,
      provider: 'sendgrid',
      timestamp,
    };
  }

  private async sendWithSMTP(message: EmailMessage, timestamp: string): Promise<EmailResult> {
    // Note: This is a simplified SMTP implementation
    // In a real-world scenario, you'd use a proper SMTP library
    throw new Error('SMTP provider not implemented in this example');
  }

  renderTemplate(template: EmailTemplate, variables: Record<string, any> = {}): { subject: string; htmlBody: string; textBody?: string } {
    const allVariables = { ...template.variables, ...variables };
    
    const renderString = (str: string): string => {
      return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
        return allVariables[key]?.toString() || match;
      });
    };

    return {
      subject: renderString(template.subject),
      htmlBody: renderString(template.htmlBody),
      textBody: template.textBody ? renderString(template.textBody) : undefined,
    };
  }

  validateEmailAddress(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateEmailAddresses(emails: string | string[]): { valid: string[]; invalid: string[] } {
    const emailList = Array.isArray(emails) ? emails : [emails];
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const email of emailList) {
      if (this.validateEmailAddress(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    }

    return { valid, invalid };
  }
}

// Email template helpers
export const emailTemplates = {
  contractCreated: {
    subject: 'Novo Contrato Criado - {{contractNumber}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Novo Contrato Criado</h2>
        <p>Olá {{recipientName}},</p>
        <p>Um novo contrato foi criado e requer sua atenção:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Número do Contrato:</strong> {{contractNumber}}</p>
          <p><strong>Título:</strong> {{contractTitle}}</p>
          <p><strong>Valor:</strong> {{contractValue}}</p>
          <p><strong>Data de Criação:</strong> {{createdAt}}</p>
        </div>
        <p>Para visualizar e assinar o contrato, <a href="{{contractUrl}}" style="color: #2563eb;">clique aqui</a>.</p>
        <p>Atenciosamente,<br>Equipe Revalya</p>
      </div>
    `,
    textBody: `
Novo Contrato Criado

Olá {{recipientName}},

Um novo contrato foi criado e requer sua atenção:

Número do Contrato: {{contractNumber}}
Título: {{contractTitle}}
Valor: {{contractValue}}
Data de Criação: {{createdAt}}

Para visualizar e assinar o contrato, acesse: {{contractUrl}}

Atenciosamente,
Equipe Revalya
    `,
  },
  
  contractSigned: {
    subject: 'Contrato Assinado - {{contractNumber}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Contrato Assinado com Sucesso</h2>
        <p>Olá {{recipientName}},</p>
        <p>O contrato {{contractNumber}} foi assinado com sucesso por {{signerName}}.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Data da Assinatura:</strong> {{signedAt}}</p>
          <p><strong>Status:</strong> {{contractStatus}}</p>
        </div>
        <p>Você pode visualizar o contrato completo <a href="{{contractUrl}}" style="color: #059669;">clicando aqui</a>.</p>
        <p>Atenciosamente,<br>Equipe Revalya</p>
      </div>
    `,
  },
  
  paymentReminder: {
    subject: 'Lembrete de Pagamento - Vencimento {{dueDate}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Lembrete de Pagamento</h2>
        <p>Olá {{recipientName}},</p>
        <p>Este é um lembrete sobre o pagamento que vence em {{dueDate}}:</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Valor:</strong> {{amount}}</p>
          <p><strong>Descrição:</strong> {{description}}</p>
          <p><strong>Data de Vencimento:</strong> {{dueDate}}</p>
        </div>
        <p>Para efetuar o pagamento, <a href="{{paymentUrl}}" style="color: #dc2626;">clique aqui</a>.</p>
        <p>Atenciosamente,<br>Equipe Revalya</p>
      </div>
    `,
  },
  
  reportGenerated: {
    subject: 'Relatório Financeiro Gerado - {{reportType}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Relatório Financeiro Disponível</h2>
        <p>Olá {{recipientName}},</p>
        <p>Seu relatório financeiro foi gerado com sucesso:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Tipo:</strong> {{reportType}}</p>
          <p><strong>Período:</strong> {{reportPeriod}}</p>
          <p><strong>Gerado em:</strong> {{generatedAt}}</p>
        </div>
        <p>Para visualizar o relatório, <a href="{{reportUrl}}" style="color: #2563eb;">clique aqui</a>.</p>
        <p>Atenciosamente,<br>Equipe Revalya</p>
      </div>
    `,
  },
};

// Utility function to create email service instance
export function createEmailService(): EmailService {
  const provider = (Deno.env.get('EMAIL_PROVIDER') || 'resend') as 'resend' | 'sendgrid' | 'smtp';
  
  const config: EmailConfig = {
    provider,
    apiKey: Deno.env.get('EMAIL_API_KEY'),
    fromEmail: Deno.env.get('EMAIL_FROM') || 'noreply@revalya.com',
    fromName: Deno.env.get('EMAIL_FROM_NAME') || 'Revalya',
    replyTo: Deno.env.get('EMAIL_REPLY_TO'),
  };

  if (provider === 'smtp') {
    config.smtpConfig = {
      host: Deno.env.get('SMTP_HOST') || 'localhost',
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      secure: Deno.env.get('SMTP_SECURE') === 'true',
      username: Deno.env.get('SMTP_USERNAME') || '',
      password: Deno.env.get('SMTP_PASSWORD') || '',
    };
  }

  return new EmailService(config);
}
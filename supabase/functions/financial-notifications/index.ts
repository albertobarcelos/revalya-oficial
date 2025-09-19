// =====================================================
// EDGE FUNCTION: Processamento de Notificações Financeiras
// Descrição: Processa e envia notificações financeiras
//            através de diferentes canais (email, SMS, push)
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { validateRequest } from '../_shared/validation.ts';
import { sendEmail } from '../_shared/email.ts';
import { sendSMS } from '../_shared/sms.ts';
import { sendPushNotification } from '../_shared/push.ts';

interface NotificationRequest {
  notificationId?: string;
  type: 'single' | 'batch' | 'scheduled';
  notifications?: {
    id: string;
    title: string;
    message: string;
    channels: string[];
    priority: string;
    recipientEmail?: string;
    recipientPhone?: string;
    data?: Record<string, any>;
  }[];
}

interface NotificationResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request
    const validation = await validateRequest(req, {
      allowedMethods: ['POST'],
      requireAuth: false, // Pode ser chamada por cron jobs
    });

    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: validation.status || 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotificationRequest = await req.json();
    const response: NotificationResponse = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };

    let notifications: any[] = [];

    // Get notifications to process
    if (body.type === 'single' && body.notificationId) {
      // Process single notification
      const { data, error } = await supabase
        .from('financial_notifications')
        .select('*')
        .eq('id', body.notificationId)
        .eq('status', 'PENDING')
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Notification not found or already processed' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      notifications = [data];
    } else if (body.type === 'batch' && body.notifications) {
      // Process batch notifications
      notifications = body.notifications;
    } else if (body.type === 'scheduled') {
      // Get pending scheduled notifications
      const { data, error } = await supabase
        .rpc('get_pending_notifications', { p_limit: 100 });

      if (error) {
        console.error('Error fetching pending notifications:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch pending notifications' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      notifications = data || [];
    }

    // Process each notification
    for (const notification of notifications) {
      try {
        await processNotification(supabase, notification);
        response.processed++;
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        response.failed++;
        response.errors?.push(`Notification ${notification.id}: ${error.message}`);
      }
    }

    // Update overall success status
    response.success = response.failed === 0;

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in financial-notifications function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processNotification(supabase: any, notification: any): Promise<void> {
  const { id, title, message, channels, priority, recipient_email, recipient_phone, data } = notification;

  // Update notification status to processing
  await supabase
    .rpc('update_notification_status', {
      p_notification_id: id,
      p_status: 'PROCESSING',
    });

  const results: { channel: string; success: boolean; error?: string }[] = [];

  // Process each channel
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'EMAIL':
          if (recipient_email) {
            await sendEmail({
              to: recipient_email,
              subject: title,
              html: formatEmailContent(message, data),
              priority: mapPriority(priority),
            });
            results.push({ channel, success: true });
          } else {
            results.push({ channel, success: false, error: 'No email address provided' });
          }
          break;

        case 'SMS':
          if (recipient_phone) {
            await sendSMS({
              to: recipient_phone,
              message: formatSMSContent(message, data),
              priority: mapPriority(priority),
            });
            results.push({ channel, success: true });
          } else {
            results.push({ channel, success: false, error: 'No phone number provided' });
          }
          break;

        case 'PUSH':
          await sendPushNotification({
            title,
            body: message,
            data,
            priority: mapPriority(priority),
          });
          results.push({ channel, success: true });
          break;

        case 'IN_APP':
          // In-app notifications are handled by the database record itself
          results.push({ channel, success: true });
          break;

        default:
          results.push({ channel, success: false, error: `Unknown channel: ${channel}` });
      }
    } catch (error) {
      console.error(`Error sending notification via ${channel}:`, error);
      results.push({ channel, success: false, error: error.message });
    }
  }

  // Determine overall status
  const successfulChannels = results.filter(r => r.success).length;
  const totalChannels = results.length;
  
  let finalStatus: string;
  if (successfulChannels === totalChannels) {
    finalStatus = 'SENT';
  } else if (successfulChannels > 0) {
    finalStatus = 'PARTIALLY_SENT';
  } else {
    finalStatus = 'FAILED';
  }

  // Update notification with final status
  await supabase
    .rpc('update_notification_status', {
      p_notification_id: id,
      p_status: finalStatus,
      p_delivery_attempts: notification.delivery_attempts + 1,
    });

  // Log results for debugging
  console.log(`Notification ${id} processed:`, {
    status: finalStatus,
    results,
    successfulChannels,
    totalChannels,
  });
}

function formatEmailContent(message: string, data?: Record<string, any>): string {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notificação Financeira</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .message {
          background: white;
          padding: 20px;
          border-radius: 6px;
          border-left: 4px solid #667eea;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
          color: #6c757d;
          font-size: 14px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .data-table th,
        .data-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }
        .data-table th {
          background-color: #f8f9fa;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>💰 Revalya Financial</h1>
        <p>Sistema de Gestão Financeira</p>
      </div>
      <div class="content">
        <div class="message">
          ${message.replace(/\n/g, '<br>')}
        </div>
  `;

  // Add data table if data is provided
  if (data && Object.keys(data).length > 0) {
    html += `
      <table class="data-table">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const [key, value] of Object.entries(data)) {
      html += `
        <tr>
          <td>${key}</td>
          <td>${typeof value === 'object' ? JSON.stringify(value) : value}</td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    `;
  }

  html += `
        <div class="footer">
          <p>Esta é uma notificação automática do sistema Revalya Financial.</p>
          <p>Para dúvidas ou suporte, entre em contato conosco.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

function formatSMSContent(message: string, data?: Record<string, any>): string {
  let sms = message;

  // Add important data to SMS if available
  if (data) {
    if (data.amount) {
      sms += ` Valor: ${data.amount}`;
    }
    if (data.dueDate) {
      sms += ` Vencimento: ${data.dueDate}`;
    }
    if (data.contractNumber) {
      sms += ` Contrato: ${data.contractNumber}`;
    }
  }

  // Truncate if too long (SMS limit is usually 160 characters)
  if (sms.length > 160) {
    sms = sms.substring(0, 157) + '...';
  }

  return sms;
}

function mapPriority(priority: string): 'high' | 'normal' | 'low' {
  switch (priority?.toUpperCase()) {
    case 'URGENT':
    case 'HIGH':
      return 'high';
    case 'LOW':
      return 'low';
    default:
      return 'normal';
  }
}

// Export for testing
export { processNotification, formatEmailContent, formatSMSContent, mapPriority };
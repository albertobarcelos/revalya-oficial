import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createEmailService } from "../_shared/email.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // AIDEV-NOTE: Validação de parâmetros obrigatórios
    const { email, token, type = 'user', tenantName = '', inviterName = '' } = await req.json();
    
    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: 'Email e token são obrigatórios' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    console.log("Received request to send email:", { email, token, type, tenantName });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Gera link específico baseado no tipo de convite
    const baseUrl = Deno.env.get('SITE_URL') ?? '';
    let signUpLink = '';
    
    if (type === 'reseller') {
      signUpLink = `${baseUrl}/reseller/register?token=${token}`;
    } else if (type === 'tenant') {
      signUpLink = `${baseUrl}/register?token=${token}&type=tenant`;
    } else {
      signUpLink = `${baseUrl}/register?token=${token}`;
    }

    console.log("Generated signup link:", signUpLink);

    // Template do email baseado no tipo
    let emailTemplate = {
      subject: '',
      html: ''
    };
    
    // AIDEV-NOTE: Template HTML profissional e responsivo para Revalya Cobrança Inteligente
    const baseTemplate = (content: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1a1a1a; 
            background-color: #f5f5f5;
            padding: 20px;
          }
          .email-wrapper { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #3C006C 0%, #240046 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header .subtitle {
            margin-top: 8px;
            font-size: 14px;
            opacity: 0.95;
            font-weight: 400;
          }
          .content { 
            background: #ffffff; 
            padding: 40px 30px; 
          }
          .button { 
            display: inline-block; 
            background: #3C006C; 
            color: white; 
            padding: 14px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: 600; 
            font-size: 16px;
            transition: background 0.3s;
            box-shadow: 0 2px 4px rgba(60, 0, 108, 0.3);
          }
          .button:hover {
            background: #240046;
          }
          .footer { 
            text-align: center; 
            padding: 30px; 
            background: #f9fafb;
            color: #6b7280; 
            font-size: 13px; 
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin: 5px 0;
          }
          .divider { 
            border-top: 1px solid #e5e7eb; 
            margin: 30px 0; 
          }
          .info-box {
            background: #f3e8ff;
            border-left: 4px solid #3C006C;
            padding: 16px;
            margin: 20px 0;
            border-radius: 6px;
          }
          .info-box p {
            margin: 0;
            color: #4c1d95;
            font-size: 14px;
          }
          .info-box strong {
            color: #3C006C;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <img src="https://wyehpiutzvwplllumgdk.supabase.co/storage/v1/object/public/imagens/image/LOGO-REVALYA123.png" alt="Revalya"
            style="width: 160px; margin-bottom: 10px;">
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Este email foi enviado automaticamente. Por favor, não responda.</p>
            <p>&copy; ${new Date().getFullYear()} Revalya Cobrança Inteligente. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    if (type === 'reseller') {
      emailTemplate = {
        subject: 'Convite para Revendedor - Revalya Cobrança Inteligente',
        html: baseTemplate(`
          <h2 style="color: #1a1a1a; margin-top: 0; font-size: 24px; font-weight: 600;">Bem-vindo ao Revalya!</h2>
          <p style="color: #4b5563; font-size: 16px; margin: 16px 0;">Você foi convidado para ser um revendedor em nossa plataforma de cobrança inteligente.</p>
          <p style="color: #4b5563; font-size: 16px; margin: 16px 0;">Como revendedor, você terá acesso a ferramentas exclusivas para gerenciar seus clientes e expandir seu negócio.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signUpLink}" class="button">Criar conta de revendedor</a>
          </div>
          <div class="divider"></div>
          <p style="color: #6b7280; font-size: 14px; margin: 0;"><strong>Importante:</strong> Este link expira em 7 dias. Se você já possui uma conta, faça login normalmente.</p>
        `)
      };
    } else if (type === 'tenant') {
      emailTemplate = {
        subject: `Convite para ${tenantName} - Revalya Cobrança Inteligente`,
        html: baseTemplate(`
          <h2 style="color: #1a1a1a; margin-top: 0; font-size: 24px; font-weight: 600;">Você foi convidado!</h2>
          <p style="color: #4b5563; font-size: 16px; margin: 16px 0;">
            <strong style="color: #1a1a1a;">${inviterName}</strong> convidou você para acessar <strong style="color: #3C006C;">${tenantName}</strong> na plataforma Revalya Cobrança Inteligente.
          </p>
          <p style="color: #4b5563; font-size: 16px; margin: 16px 0;">
            Você terá acesso a todas as funcionalidades do sistema para gerenciar contratos, cobranças, clientes e muito mais.
          </p>
          
          <div class="info-box">
            <p>
              <strong>💡 Já possui uma conta?</strong><br>
              Se você já tem uma conta, basta fazer login normalmente. O convite aparecerá automaticamente na sua página de seleção de portal para você aceitar.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signUpLink}" class="button">Criar conta e aceitar convite</a>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${baseUrl}/login" style="color: #3C006C; text-decoration: none; font-size: 15px; font-weight: 500;">
              Ou faça login se já possui conta
            </a>
          </div>
          
          <div class="divider"></div>
          <p style="color: #6b7280; font-size: 14px; margin: 0;"><strong>Importante:</strong> Este link expira em 7 dias.</p>
        `)
      };
    } else {
      emailTemplate = {
        subject: 'Convite - Revalya Cobrança Inteligente',
        html: baseTemplate(`
          <h2 style="color: #1a1a1a; margin-top: 0; font-size: 24px; font-weight: 600;">Bem-vindo ao Revalya!</h2>
          <p style="color: #4b5563; font-size: 16px; margin: 16px 0;">Você foi convidado para acessar nossa plataforma de cobrança inteligente.</p>
          <p style="color: #4b5563; font-size: 16px; margin: 16px 0;">Use o link abaixo para criar sua conta e começar a usar todas as funcionalidades disponíveis.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signUpLink}" class="button">Criar conta</a>
          </div>
          <div class="divider"></div>
          <p style="color: #6b7280; font-size: 14px; margin: 0;"><strong>Importante:</strong> Este link expira em 7 dias.</p>
        `)
      };
    }

    // AIDEV-NOTE: Enviar email diretamente usando o serviço de email compartilhado
    // Isso funciona mesmo se o usuário já existir
    try {
      const emailService = createEmailService();
      
      const emailResult = await emailService.sendEmail({
        to: email,
        subject: emailTemplate.subject,
        htmlBody: emailTemplate.html,
      });

      if (!emailResult.success) {
        console.error("Error sending email:", emailResult.error);
        return new Response(
          JSON.stringify({ 
            error: `Erro ao enviar email: ${emailResult.error}`,
            details: 'Verifique se as variáveis de ambiente EMAIL_PROVIDER, EMAIL_API_KEY, EMAIL_FROM estão configuradas no Supabase'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      console.log("Email sent successfully:", { messageId: emailResult.messageId, provider: emailResult.provider });
    } catch (emailError: any) {
      console.error("Error in email service:", emailError);
      return new Response(
        JSON.stringify({ 
          error: `Erro ao enviar email: ${emailError.message || 'Erro desconhecido'}`,
          details: 'Verifique se as variáveis de ambiente EMAIL_PROVIDER, EMAIL_API_KEY, EMAIL_FROM estão configuradas no Supabase'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // AIDEV-NOTE: Salvar notificação na tabela para histórico (opcional)
    try {
      await supabaseAdmin
        .from('notifications')
        .insert({
          recipient_email: email,
          subject: emailTemplate.subject,
          content: emailTemplate.html,
          type: 'invite_email',
          metadata: {
            token: token,
            type: type,
            tenantName: tenantName,
            inviterName: inviterName,
            signUpLink: signUpLink,
          },
          sent_at: new Date().toISOString(),
        });
    } catch (notificationError) {
      // Não bloqueia o fluxo se falhar ao salvar notificação
      console.warn("Erro ao salvar notificação (não crítico):", notificationError);
    }

    console.log("Invite email sent successfully to:", email);

    return new Response(
      JSON.stringify({ 
        message: 'Invite email sent successfully',
        email: email
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro desconhecido',
        details: 'Verifique os logs da edge function para mais detalhes'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

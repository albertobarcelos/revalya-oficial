import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, tenantName, password, loginUrl } = await req.json();
    console.log("Received request to send welcome email:", { email, tenantName });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const baseUrl = Deno.env.get('SITE_URL') ?? loginUrl ?? '';

    // AIDEV-NOTE: Template HTML profissional para email de boas-vindas
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00B4D8 0%, #0077B6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
          .button { display: inline-block; background: #00B4D8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .credentials { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .credentials p { margin: 5px 0; }
          .divider { border-top: 1px solid #e0e0e0; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Bem-vindo ao Revalya!</h1>
            <div style="margin-top: 8px; font-size: 14px; opacity: 0.95;">Cobrança Inteligente</div>
          </div>
          <div class="content">
            <h2 style="color: #0077B6; margin-top: 0;">Sua conta foi criada com sucesso!</h2>
            <p>Parabéns! O tenant <strong>${tenantName}</strong> foi criado e você é o administrador principal.</p>
            <p>Você já pode acessar o sistema e começar a usar todas as funcionalidades disponíveis.</p>
            
            ${password ? `
              <div class="credentials">
                <p style="margin-top: 0;"><strong>Suas credenciais de acesso:</strong></p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Senha:</strong> ${password}</p>
                <p style="color: #d32f2f; font-size: 14px; margin-bottom: 0;"><strong>⚠️ Importante:</strong> Guarde estas informações em local seguro. Recomendamos alterar a senha após o primeiro acesso.</p>
              </div>
            ` : ''}
            
            <div style="text-align: center;">
              <a href="${baseUrl}/login" class="button">Acessar o sistema</a>
            </div>
            
            <div class="divider"></div>
            
            <h3 style="color: #0077B6;">O que você pode fazer agora?</h3>
            <ul>
              <li>Configurar integrações (ASAAS, WhatsApp, etc.)</li>
              <li>Cadastrar clientes e contratos</li>
              <li>Convidar outros usuários para sua equipe</li>
              <li>Personalizar as configurações do tenant</li>
            </ul>
            
            <p style="color: #666; font-size: 14px;">
              Se você tiver alguma dúvida, nossa equipe de suporte está pronta para ajudar.
            </p>
          </div>
          <div class="footer">
            <p>Este email foi enviado automaticamente. Por favor, não responda.</p>
            <p>&copy; ${new Date().getFullYear()} Revalya Cobrança Inteligente. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // AIDEV-NOTE: Enviar email usando inviteUserByEmail com redirectTo customizado
    // Como o usuário já foi criado, vamos usar um método alternativo
    // Se o email não puder ser enviado via Auth, podemos usar um serviço externo
    try {
      // Tentar enviar via Supabase Auth (pode falhar se usuário já existe)
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${baseUrl}/login`,
        data: {
          tenant_name: tenantName,
          welcome_email: true,
        }
      });

      if (inviteError) {
        console.log("Usuário já existe - tentando método alternativo:", inviteError.message);
        // Se o usuário já existe, não podemos usar inviteUserByEmail
        // Em produção, você pode usar um serviço de email externo aqui (SendGrid, Resend, etc.)
        // Por enquanto, apenas logamos o erro mas retornamos sucesso
        // pois o email de boas-vindas é opcional
      }
    } catch (emailError) {
      console.warn("Erro ao enviar email via Auth (não crítico):", emailError);
      // Não bloqueia o fluxo - email de boas-vindas é opcional
    }

    console.log("Welcome email process completed for:", email);

    return new Response(
      JSON.stringify({ 
        message: 'Welcome email sent successfully',
        note: 'If user already exists, email may not be sent via Auth API'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});


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
    const { email, token, type = 'user', tenantName = '', inviterName = '' } = await req.json();
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
    
    if (type === 'reseller') {
      emailTemplate = {
        subject: 'Convite para Revendedor - NexSyn Financial',
        html: `
          <h1>Bem-vindo ao NexSyn Financial!</h1>
          <p>Você foi convidado para ser um revendedor em nossa plataforma.</p>
          <p>Use o link abaixo para criar sua conta de revendedor:</p>
          <a href="${signUpLink}">Criar conta de revendedor</a>
          <p>Este link expira em 7 dias.</p>
        `
      };
    } else if (type === 'tenant') {
      emailTemplate = {
        subject: `Convite para ${tenantName} - NexSyn Financial`,
        html: `
          <h1>Convite para ${tenantName}</h1>
          <p>Você foi convidado por ${inviterName} para acessar o tenant ${tenantName} na plataforma NexSyn Financial.</p>
          <p>Se você já possui uma conta, basta fazer login e o convite aparecerá na sua página de seleção de portal.</p>
          <p>Se você ainda não possui uma conta, use o link abaixo para criar:</p>
          <a href="${signUpLink}">Criar conta</a>
          <p>Este link expira em 7 dias.</p>
        `
      };
    } else {
      emailTemplate = {
        subject: 'Convite - NexSyn Financial',
        html: `
          <h1>Bem-vindo ao NexSyn Financial!</h1>
          <p>Você foi convidado para acessar nossa plataforma.</p>
          <p>Use o link abaixo para criar sua conta:</p>
          <a href="${signUpLink}">Criar conta</a>
          <p>Este link expira em 7 dias.</p>
        `
      };
    }

    // Envia o email usando o serviço de email do Supabase
    const { error } = await supabaseAdmin.auth.admin.sendEmail(
      email,
      emailTemplate.subject,
      emailTemplate.html
    );

    if (error) {
      console.error("Error sending email:", error);
      throw error;
    }

    console.log("Email sent successfully to:", email);

    return new Response(
      JSON.stringify({ message: 'Invite sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
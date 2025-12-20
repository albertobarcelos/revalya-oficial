// Função Edge que usa SendGrid para enviar emails
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, token, type = 'user' } = await req.json();
    console.log("Received request to send email:", { email, token, type });

    const siteUrl = Deno.env.get('SITE_URL') ?? '';
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY') ?? '';
    
    if (!sendgridApiKey) {
      throw new Error('Missing SENDGRID_API_KEY environment variable');
    }

    // Gera link específico baseado no tipo de convite
    const signUpLink = type === 'reseller' 
      ? `${siteUrl}/reseller/register?token=${token}`
      : `${siteUrl}/register?token=${token}`;

    console.log("Generated signup link:", signUpLink);

    // Template do email baseado no tipo
    const emailSubject = type === 'reseller' 
      ? 'Convite para Revendedor - NexSyn Financial'
      : 'Convite - NexSyn Financial';
      
    const emailContent = type === 'reseller' 
      ? `
        <h1>Bem-vindo ao NexSyn Financial!</h1>
        <p>Você foi convidado para ser um revendedor em nossa plataforma.</p>
        <p>Use o link abaixo para criar sua conta de revendedor:</p>
        <a href="${signUpLink}">Criar conta de revendedor</a>
        <p>Este link expira em 7 dias.</p>
      `
      : `
        <h1>Bem-vindo ao NexSyn Financial!</h1>
        <p>Você foi convidado para acessar nossa plataforma.</p>
        <p>Use o link abaixo para criar sua conta:</p>
        <a href="${signUpLink}">Criar conta</a>
        <p>Este link expira em 7 dias.</p>
      `;

    // Enviar email usando SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sendgridApiKey}`
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }]
          }
        ],
        from: { email: 'noreply@nexsyn.com.br', name: 'NexSyn Financial' },
        subject: emailSubject,
        content: [
          {
            type: 'text/html',
            value: emailContent
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("SendGrid API error:", errorData);
      throw new Error(`SendGrid API error: ${response.status} ${errorData}`);
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

// Versão modificada da função Edge que usa a API de email padrão do Supabase
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
    const { email, token, type = 'user' } = await req.json();
    console.log("Received request to send email:", { email, token, type });

    // Log das variáveis de ambiente (sem expor valores sensíveis)
    console.log("Environment variables check:", {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      SITE_URL: Deno.env.get('SITE_URL')
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Gera link específico baseado no tipo de convite
    const baseUrl = Deno.env.get('SITE_URL') ?? '';
    const signUpLink = type === 'reseller' 
      ? `${baseUrl}/reseller/register?token=${token}`
      : `${baseUrl}/register?token=${token}`;

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

    // Tenta enviar o email usando a API de email do Supabase
    // Método 1: Usando o método de redefinição de senha (alternativa)
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: signUpLink
    });

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

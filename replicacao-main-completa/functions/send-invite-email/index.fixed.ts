// Versão corrigida da função Edge que usa métodos alternativos
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

    // Método alternativo 1: Usar o método de redefinição de senha
    // Este método envia um email com um link para redefinir a senha
    // Podemos usar isso como uma solução temporária
    const { error: resetError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: signUpLink
    });

    if (resetError) {
      console.error("Error with invite method:", resetError);
      
      // Método alternativo 2: Criar um usuário temporário e enviar um link de redefinição de senha
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // Tenta criar um usuário temporário
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true
      });
      
      if (createError) {
        console.error("Error creating temporary user:", createError);
        
        // Método alternativo 3: Enviar um link de redefinição de senha para um usuário existente
        const { error: passwordResetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: signUpLink
        });
        
        if (passwordResetError) {
          console.error("Error with password reset method:", passwordResetError);
          throw new Error("All email sending methods failed");
        }
      } else {
        // Usuário criado com sucesso, enviar link de redefinição de senha
        const { error: passwordResetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: signUpLink
        });
        
        if (passwordResetError) {
          console.error("Error with password reset after user creation:", passwordResetError);
          throw new Error("Failed to send password reset email");
        }
      }
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

// Versão simplificada da função Edge que usa apenas métodos garantidos
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const siteUrl = Deno.env.get('SITE_URL') ?? '';
    
    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      siteUrl
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Gera link específico baseado no tipo de convite
    const signUpLink = type === 'reseller' 
      ? `${siteUrl}/reseller/register?token=${token}`
      : `${siteUrl}/register?token=${token}`;

    console.log("Generated signup link:", signUpLink);

    // Usar o método resetPasswordForEmail que está disponível na API pública
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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

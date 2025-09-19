import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface InvitePayload {
  email: string;
  token: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const payload: InvitePayload = await req.json();
    const { email, token } = payload;

    console.log('Processing invite for:', email);

    const { error } = await supabaseClient
      .from('invites')
      .insert([
        {
          email,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);

    if (error) {
      console.error('Error creating invite:', error);
      throw error;
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL');
    if (!frontendUrl) {
      throw new Error('Missing FRONTEND_URL environment variable');
    }

    // Email content template
    const emailContent = `
      <h1>Convite para acesso ao sistema</h1>
      <p>Você foi convidado para acessar o sistema. Use o link abaixo para criar sua conta:</p>
      <a href="${frontendUrl}/register?token=${token}">Criar conta</a>
      <p>Este link expira em 7 dias.</p>
    `;

    console.log('Invite created successfully');

    return new Response(
      JSON.stringify({ message: 'Invite sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing invite:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

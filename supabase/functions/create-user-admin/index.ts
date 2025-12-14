// Edge Function para criar usuário usando API Admin do Supabase
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
    const { email, password, tenantId, role = 'TENANT_USER' } = await req.json();
    
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // AIDEV-NOTE: Criar usuário usando API Admin (método correto)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: email.split('@')[0],
      },
    });

    if (createError) {
      throw createError;
    }

    if (!newUser.user?.id) {
      throw new Error('Falha ao criar usuário - ID não encontrado');
    }

    const userId = newUser.user.id;

    // AIDEV-NOTE: Sincronizar com public.users
    const { error: syncError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        user_role: role,
        name: email.split('@')[0],
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (syncError) {
      console.warn('Aviso ao sincronizar com public.users:', syncError);
    }

    // AIDEV-NOTE: Adicionar ao tenant se tenantId fornecido
    if (tenantId) {
      const { error: tenantError } = await supabaseAdmin
        .from('tenant_users')
        .upsert({
          tenant_id: tenantId,
          user_id: userId,
          role: role,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,user_id',
        });

      if (tenantError) {
        console.warn('Aviso ao adicionar ao tenant:', tenantError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: userId,
          email: newUser.user.email,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in create-user-admin function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});


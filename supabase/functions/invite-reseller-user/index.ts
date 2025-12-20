import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts' // Certifique-se que _shared/cors.ts existe
import { randomUUID } from 'https://deno.land/std@0.177.0/node/crypto.ts';

// Função auxiliar de segurança (PLACEHOLDER - IMPLEMENTAR CORRETAMENTE!)
// Verifica se o usuário autenticado (inviterUserId) tem permissão para convidar para o resellerId
async function checkInvitePermission(supabase: SupabaseClient, inviterUserId: string, resellerId: string): Promise<boolean> {
  console.warn(`SECURITY CHECK for user ${inviterUserId} inviting to reseller ${resellerId} is using a placeholder! Implement proper logic.`);
  // Exemplo simples: Verificar se o usuário que convida já é membro do revendedor
  const { data, error } = await supabase
    .from('reseller_users')
    .select('user_id')
    .eq('reseller_id', resellerId)
    .eq('user_id', inviterUserId)
    .maybeSingle();

  if (error) {
    console.error("Permission check error:", error);
    return false;
  }
  // TODO: Adicionar lógica para verificar se o usuário é um admin global, se necessário
  return data !== null; // Permite se for membro
}

serve(async (req) => {
  // Tratamento de CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Inicializar cliente Supabase e validar autenticação do chamador
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // IMPORTANTE: Use service_role key aqui para ter permissão de inserir/consultar
      // tabelas e chamar funções como 'get_user_id_by_email'
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(); // Pega usuário do JWT
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized: Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const inviterUserId = user.id; // ID do usuário que está fazendo o convite

    // 2. Parsear corpo da requisição
    let reseller_id: string | null = null;
    let email: string | null = null;
    try {
      const body = await req.json();
      reseller_id = body.reseller_id;
      email = body.email;
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!reseller_id || !email) {
      return new Response(JSON.stringify({ error: 'Missing reseller_id or email in request body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const normalizedEmail = email.toLowerCase().trim();

    // 3. --- VERIFICAÇÃO DE PERMISSÃO ---
    const hasPermission = await checkInvitePermission(supabaseClient, inviterUserId, reseller_id);
    if (!hasPermission) {
       console.error(`User ${inviterUserId} permission denied for reseller ${reseller_id}`);
       return new Response(JSON.stringify({ error: 'Forbidden: You do not have permission to invite users to this reseller.' }), {
         status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       });
    }
    // --- FIM VERIFICAÇÃO DE PERMISSÃO ---

    // 4. Verificar se usuário já é membro deste revendedor
    const { data: userIdResult, error: emailCheckError } = await supabaseClient.rpc('get_user_id_by_email', { p_email: normalizedEmail });
    if (emailCheckError) {
        console.error('Error calling get_user_id_by_email:', emailCheckError);
        throw new Error('Database error checking email.'); // Será pego pelo catch genérico
    }
    const existingUserId = userIdResult; // A função retorna UUID ou NULL

    if (existingUserId) {
      const { data: existingMembership, error: membershipError } = await supabaseClient
        .from('reseller_users')
        .select('id')
        .eq('reseller_id', reseller_id)
        .eq('user_id', existingUserId)
        .maybeSingle();

      if (membershipError) {
        console.error('Error checking existing membership:', membershipError);
        throw new Error('Database error checking membership.');
      }
      if (existingMembership) {
        return new Response(JSON.stringify({ error: 'Conflict: This user is already a member of this reseller.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 5. Verificar se já existe um convite PENDENTE e NÃO EXPIRADO
    const now = new Date().toISOString();
    const { data: existingInvite, error: inviteCheckError } = await supabaseClient
      .from('invites')
      .select('invite_id')
      .eq('email', normalizedEmail)
      .eq('reseller_id', reseller_id) // Especificamente para este revendedor
      .eq('status', 'pending')
      .gt('expires_at', now)
      .maybeSingle();

    if (inviteCheckError) {
      console.error('Error checking existing invite:', inviteCheckError);
      throw new Error('Database error checking invites.');
    }

    if (existingInvite) {
       return new Response(JSON.stringify({ error: 'Conflict: An active pending invite already exists for this email and reseller.' }), {
         status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
    }

    // 6. Gerar token e data de expiração
    const token = randomUUID(); // Gera um token UUID v4 seguro
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7); // Expira em 7 dias

    // 7. Inserir o novo convite
    const { error: insertError } = await supabaseClient
      .from('invites')
      .insert({
        email: normalizedEmail,
        token: token,
        reseller_id: reseller_id, // ID do revendedor ao qual o usuário está sendo convidado
        status: 'pending',
        invite_type: 'reseller_user', // Tipo específico para este fluxo
        expires_at: expiration.toISOString(),
        // created_at e invite_id terão valores padrão
      });

    if (insertError) {
      console.error('Error inserting invite:', insertError);
      throw new Error('Database error creating invite.');
    }

    // 8. Retornar sucesso
    // Poderia retornar o token se necessário no front-end, mas geralmente não é preciso
    return new Response(JSON.stringify({ message: 'Reseller user invite created successfully.' }), {
      status: 201, // Created
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in invite-reseller-user function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500, // Internal Server Error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
serve(async (req)=>{
  // Tratamento de CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    // 1. Inicializar cliente Supabase e validar autenticação do chamador
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', // IMPORTANTE: Precisa da service_role key para inserir em reseller_users e atualizar invites
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(); // Pega usuário do JWT
    if (authError || !user) {
      console.error('Accept invite Auth error:', authError?.message);
      return new Response(JSON.stringify({
        error: 'Unauthorized: You must be logged in to accept an invite.'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const acceptingUserId = user.id;
    // 2. Obter token do corpo da requisição
    let token = null;
    try {
      const body = await req.json();
      token = body.token;
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON body'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!token) {
      return new Response(JSON.stringify({
        error: 'Missing token in request body'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // --- Transação: Garantir que todas as operações ocorram ou nenhuma ---
    // A API JS do Supabase não suporta transações complexas diretamente.
    // O ideal seria encapsular isso em uma função de banco de dados (plpgsql).
    // Por simplicidade aqui, faremos as verificações e depois as escritas.
    // NOTA: Existe uma pequena chance de race condition sem uma transação real.
    // 3. Validar o convite (buscar dados necessários)
    const now = new Date().toISOString();
    const { data: invite, error: queryError } = await supabaseClient.from('invites').select('invite_id, email, reseller_id, status, invite_type, expires_at').eq('token', token).single();
    if (queryError || !invite) {
      // Trata erro de não encontrar (PGRST116) ou outro erro
      const status = queryError && queryError.code === 'PGRST116' ? 404 : 500;
      const message = queryError && queryError.code === 'PGRST116' ? 'Invalid or non-existent token.' : 'Database error validating token.';
      console.error('Error finding invite to accept:', queryError);
      return new Response(JSON.stringify({
        error: message
      }), {
        status: status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // 4. Re-validar status, tipo e expiração
    if (invite.status !== 'pending') {
      return new Response(JSON.stringify({
        error: `Cannot accept invite: Status is "${invite.status}".`
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (invite.invite_type !== 'reseller_user') {
      return new Response(JSON.stringify({
        error: `Cannot accept invite: Invalid type "${invite.invite_type}".`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (new Date(invite.expires_at) < new Date(now)) {
      // Opcional: Marcar como expirado aqui também
      // await supabaseClient.from('invites').update({ status: 'expired' }).eq('invite_id', invite.invite_id);
      return new Response(JSON.stringify({
        error: 'Cannot accept invite: Invite has expired.'
      }), {
        status: 410,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // 5. Verificar se o usuário logado (acceptingUserId) já é membro
    const { data: existingMembership, error: membershipError } = await supabaseClient.from('reseller_users').select('id').eq('reseller_id', invite.reseller_id) // ID do revendedor do convite
    .eq('user_id', acceptingUserId) // ID do usuário logado
    .maybeSingle();
    if (membershipError) {
      console.error('Error checking existing membership on accept:', membershipError);
      throw new Error('Database error checking membership.');
    }
    if (existingMembership) {
      // O usuário já é membro, podemos apenas marcar o convite como aceito (ou retornar erro?)
      // Vamos marcar como aceito para consistência e retornar sucesso.
      const { error: updateError } = await supabaseClient.from('invites').update({
        status: 'accepted',
        accepted_at: now
      }) // Opcional: guardar quando foi aceito
      .eq('invite_id', invite.invite_id);
      if (updateError) {
        console.error('Error updating already-member invite status:', updateError);
      // Não falha a requisição por isso, mas loga o erro
      }
      console.log(`User ${acceptingUserId} already member of reseller ${invite.reseller_id}. Marked invite ${invite.invite_id} as accepted.`);
      return new Response(JSON.stringify({
        message: 'Invite accepted successfully (user was already a member).'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // --- Início das Operações de Escrita ---
    // 6. Adicionar o usuário à tabela reseller_users
    const { error: insertMemberError } = await supabaseClient.from('reseller_users').insert({
      user_id: acceptingUserId,
      reseller_id: invite.reseller_id
    });
    if (insertMemberError) {
      // Tratar erro de violação de constraint única (unique_reseller_user) caso a verificação anterior falhe por race condition
      if (insertMemberError.code === '23505') {
        console.warn(`Race condition? User ${acceptingUserId} already became member of ${invite.reseller_id}.`);
      // Tentar marcar o convite como aceito mesmo assim
      } else {
        console.error('Error inserting reseller user:', insertMemberError);
        throw new Error('Database error adding user to reseller.');
      }
    }
    // 7. Atualizar o status do convite para 'accepted'
    const { error: updateInviteError } = await supabaseClient.from('invites').update({
      status: 'accepted',
      accepted_at: now
    }) // Opcional: guardar quando foi aceito
    .eq('invite_id', invite.invite_id); // Usar o ID do convite
    if (updateInviteError) {
      console.error('Error updating invite status after adding member:', updateInviteError);
      // Considerar se deve reverter a inserção em reseller_users (complexo sem transação)
      throw new Error('Database error updating invite status.');
    }
    // --- Fim das Operações de Escrita ---
    // 8. Retornar sucesso
    return new Response(JSON.stringify({
      message: 'Invite accepted successfully.'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in accept-reseller-invite function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal Server Error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

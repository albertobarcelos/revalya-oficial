import { supabase } from '@/lib/supabase';

/**
 * Esta função tenta corrigir os problemas de permissão de um usuário
 * após a reativação do projeto Supabase.
 * 
 * @param userId - ID do usuário (opcional)
 * @param email - Email do usuário (opcional)
 */
export async function repairUserPermissions(userId?: string, email?: string) {
  try {
    console.log('Iniciando reparo de permissões do usuário...');

    // Se não temos userId nem email, tentamos obter do usuário atual
    if (!userId && !email) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        userId = sessionData.session.user.id;
        email = sessionData.session.user.email;
      }
    }

    if (!userId && !email) {
      return {
        success: false,
        message: 'Necessário fornecer userId ou email para reparar permissões'
      };
    }

    console.log(`Tentando reparar permissões para ${email || userId}`);

    // Primeiro, verificar se o usuário existe na tabela public.users
    const { data: publicUser, error: publicUserError } = await supabase
      .from('users')
      .select('id, email, user_role')
      .eq('id', userId)
      .single();
    
    if (publicUserError && publicUserError.code !== 'PGRST116') {
      console.warn('Erro ao buscar usuário em public.users:', publicUserError.message);
      return { success: false, error: 'Erro ao verificar usuário' };
    }
    
    // Se usuário não existe em public.users, tentar buscar por email
    if (!publicUser) {
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('id, email, user_role')
        .eq('email', email)
        .single();
      
      if (emailError && emailError.code !== 'PGRST116') {
        console.error('Erro ao verificar email:', emailError);
        return { success: false, error: 'Erro ao verificar email' };
      }
      
      if (userByEmail) {
        userId = userByEmail.id;
      } else {
        return { success: false, error: 'Usuário não encontrado' };
      }
    }
    
    if (!userId || !email) {
      return {
        success: false,
        message: 'Não foi possível determinar o ID ou email do usuário'
      };
    }

    // Verificar se o usuário já existe na tabela pública 'users'
    const { data: publicUserData, error: checkUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Se não existir, precisamos criar
    if (!publicUserData || checkUserError) {
      console.log('Usuário não encontrado na tabela pública users, criando...');
      
      try {
        // Primeiro tenta criar usando RPC (mais seguro, ignora RLS)
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          'repair_user_permissions',
          { 
            user_email: email,
            user_id: userId
          }
        );
        
        if (rpcError) {
          console.error('Erro ao reparar usuário via RPC:', rpcError);
          console.log('Detalhes do erro RPC:', JSON.stringify(rpcError));
          
          // Tenta criar diretamente como fallback
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: userId,
              email: email,
              user_role: 'USER', // Papel padrão
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              name: email.split('@')[0], // Nome básico a partir do email
              status: 'ACTIVE'
            });

          if (insertError) {
            console.error('Erro ao criar registro de usuário:', insertError);
            console.log('Detalhes do erro:', JSON.stringify(insertError));
            
            // Tentar um último recurso usando SQL direto via RPC
            try {
              const { data: emergencyResult, error: emergencyError } = await supabase.rpc(
                'admin_force_create_user',
                { 
                  user_id_param: userId,
                  user_email_param: email
                }
              );
              
              if (emergencyError) {
                console.error('Erro no último recurso:', emergencyError);
                return {
                  success: false,
                  message: `Erro ao criar registro de usuário: ${insertError.message}`,
                  error: insertError,
                  details: `Código: ${insertError.code}, Dica: ${insertError.hint || 'Nenhuma'}`
                };
              } else {
                console.log('Usuário criado com sucesso pelo último recurso:', emergencyResult);
                return {
                  success: true,
                  message: 'Usuário reparado com sucesso usando último recurso',
                  details: emergencyResult
                };
              }
            } catch (lastError) {
              console.error('Falha no último recurso:', lastError);
              return {
                success: false,
                message: `Falha total no reparo: ${insertError.message}`,
                error: insertError
              };
            }
          }
        } else {
          console.log('Usuário reparado via RPC com sucesso:', rpcResult);
          return {
            success: true,
            message: 'Usuário reparado com sucesso via RPC',
            details: rpcResult
          };
        }
      } catch (error: any) {
        console.error('Exceção ao tentar criar registro de usuário:', error);
        return {
          success: false,
          message: `Exceção ao criar registro de usuário: ${error.message}`,
          error
        };
      }
    } else {
      console.log('Usuário encontrado na tabela pública users, verificando permissões...');
      
      // Verificar e atualizar o status do usuário se necessário
      if (publicUserData.status !== 'ACTIVE') {
        const { error: updateError } = await supabase
          .from('users')
          .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
          .eq('id', userId);
          
        if (updateError) {
          console.error('Erro ao atualizar status do usuário:', updateError);
          return {
            success: false,
            message: `Erro ao atualizar status do usuário: ${updateError.message}`,
            error: updateError
          };
        }
        
        console.log('Status do usuário atualizado para ACTIVE');
      }
    }

    return {
      success: true,
      message: 'Permissões do usuário verificadas e reparadas',
      userId,
      email
    };
  } catch (error: any) {
    console.error('Erro geral no reparo de permissões:', error);
    return {
      success: false,
      message: `Erro ao reparar permissões: ${error.message}`,
      error
    };
  }
}

/**
 * Função para verificar e corrigir problemas comuns durante o login
 * 
 * @param email Email do usuário
 * @param skipPasswordCheck Se verdadeiro, não tenta login com senha
 */
export async function performLoginRepair(email: string, skipPasswordCheck: boolean = true) {
  console.log(`Iniciando reparo de login para ${email}`);
  
  try {
    // Tenta usar nossa função de emergência SQL
    const { data: repairData, error: repairError } = await supabase.rpc('check_and_fix_login');
    
    if (repairError) {
      console.error('Erro no reparo de emergência:', repairError);
      
      // Tentar com o método tradicional
      return await repairUserPermissions(undefined, email);
    }
    
    console.log('Reparo de emergência bem-sucedido:', repairData);
    return {
      success: true,
      message: 'Usuário reparado com sucesso usando função de emergência SQL',
      details: repairData
    };
  } catch (error) {
    console.error('Exceção ao tentar reparo de login:', error);
    
    // Último recurso - o método tradicional
    return await repairUserPermissions(undefined, email);
  }
}

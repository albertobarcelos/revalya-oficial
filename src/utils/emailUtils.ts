// Função para chamar o Edge Function para enviar email
import { supabase } from '@/lib/supabase';
import { sendInviteEmailDirect } from "./emailJsUtils";

export const sendInviteEmail = async (email: string, token: string, type: string = 'reseller') => {
  try {
    console.log('Enviando email para:', email, 'com token:', token, 'tipo:', type);
    
    // Primeiro tenta usar a função Edge
    try {
      const { data, error } = await supabase.functions.invoke('send-invite-email', {
        body: { email, token, type }
      });

      if (error) {
        console.error('Erro ao enviar email via função Edge:', error);
        // Se falhar, tenta o método alternativo
        console.log('Tentando método alternativo...');
        return await sendInviteEmailDirect(email, token, type);
      }

      console.log('Email enviado com sucesso via função Edge:', data);
      return { success: true, data };
    } catch (edgeError) {
      console.error('Erro ao chamar função Edge:', edgeError);
      // Se falhar, tenta o método alternativo
      console.log('Tentando método alternativo...');
      return await sendInviteEmailDirect(email, token, type);
    }
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return { success: false, error: error.message };
  }
};

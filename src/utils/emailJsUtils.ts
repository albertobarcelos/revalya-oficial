// Solução alternativa sem usar EmailJS
// Função para enviar email diretamente pelo cliente de email do usuário

export const sendInviteEmailDirect = async (email: string, token: string, type: string = 'reseller') => {
  try {
    console.log('Preparando email direto para:', email, 'com token:', token, 'tipo:', type);
    
    // Configurar a URL de registro baseada no tipo
    const baseUrl = window.location.origin; // Usa a origem atual da página
    const signUpLink = type === 'reseller' 
      ? `${baseUrl}/reseller/register?token=${token}`
      : `${baseUrl}/register?token=${token}`;
    
    // Preparar o assunto e corpo do email
    const subject = encodeURIComponent(type === 'reseller' 
      ? 'Convite para Revendedor - NexSyn Financial'
      : 'Convite - NexSyn Financial');
    
    const body = encodeURIComponent(`
      Olá,
      
      Você foi convidado para ${type === 'reseller' ? 'ser um revendedor no' : 'acessar o'} NexSyn Financial.
      
      Use o link abaixo para criar sua conta:
      ${signUpLink}
      
      Este link expira em 7 dias.
      
      Atenciosamente,
      Equipe NexSyn Financial
    `);
    
    // Abrir o cliente de email padrão do usuário
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    
    console.log('Cliente de email aberto com link de convite');
    return { success: true, data: { message: 'Email client opened' } };
  } catch (error) {
    console.error('Erro ao preparar email direto:', error);
    return { success: false, error: error.message };
  }
};

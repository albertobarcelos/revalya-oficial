import { supabase } from '@/lib/supabase';

/**
 * Função para testar a conexão com o Supabase
 * Pode ser usada para diagnosticar problemas de conexão
 */
export async function testSupabaseConnection() {
  try {
    console.log('Testando conexão com o Supabase...');
    
    // Teste de conectividade básica
    const { data, error } = await supabase.from('health_check').select('*').limit(1);
    
    if (error) {
      console.error('Erro na consulta de health check:', error);
      return {
        success: false,
        message: `Erro de conexão: ${error.message}`,
        code: error.code,
        details: error
      };
    }
    
    // Teste de autenticação
    const authResponse = await supabase.auth.getSession();
    console.log('Status de autenticação:', authResponse.data.session ? 'Autenticado' : 'Não autenticado');
    
    // Verificar configurações do projeto
    const { data: settings } = await supabase.rpc('get_project_settings');
    
    return {
      success: true,
      message: 'Conexão com Supabase OK',
      authStatus: authResponse.data.session ? 'Autenticado' : 'Não autenticado',
      projectSettings: settings
    };
  } catch (error: any) {
    console.error('Erro ao testar conexão com Supabase:', error);
    return {
      success: false,
      message: `Erro grave na conexão: ${error.message || 'Erro desconhecido'}`,
      error
    };
  }
}

/**
 * Função para validar um email no Supabase
 * Verifica se o email existe na tabela de usuários
 */
export async function checkEmailExists(email: string) {
  try {
    // Esta consulta usa uma função RPC no Supabase que deve retornar
    // um booleano indicando se o email existe
    const { data, error } = await supabase.rpc('check_email_exists', {
      email_to_check: email
    });
    
    if (error) {
      console.error('Erro ao verificar email:', error);
      return {
        success: false,
        exists: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      exists: !!data,
      message: data ? 'Email encontrado' : 'Email não encontrado'
    };
  } catch (error: any) {
    console.error('Erro ao verificar email:', error);
    return {
      success: false,
      exists: false,
      error: error.message || 'Erro desconhecido'
    };
  }
}

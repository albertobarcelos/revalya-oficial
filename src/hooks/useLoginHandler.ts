import { useState, useRef } from "react";
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from "@/components/ui/use-toast";
import { checkEmailExists } from "@/utils/supabaseConnectionTest";
import { loginWithBypass, ensureUserExists } from '@/utils/supabaseAuthBypass';
import { performLoginRepair } from "@/utils/repairUserPermissions";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/authStore";

// Função de log segura que não expõe dados sensíveis
const logDebug = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
  if (import.meta.env.DEV) {
    if (type === 'error') {
      console.error(message);
    } else if (type === 'warning') {
      console.warn(message);
    } else {
      console.info(message);
    }
  }
};

/**
 * Hook personalizado para gerenciar a lógica de login
 * Atualizado para usar o Zustand para gerenciamento de estado global
 */
export function useLoginHandler() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  
  // Estados locais que permanecem no componente
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [needsRepair, setNeedsRepair] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const isCheckingSessionRef = useRef(false);
  
  // Estados globais do Zustand
  const { 
    setUser,
    setLoading, 
    setError,
    isLoading: loading,
    error: authError 
  } = useAuthStore();

  /**
   * Função para lidar com o processo de login
   * Atualizada para usar o store Zustand para estado global de autenticação
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Atualiza estados globais
    setLoading(true);
    setError(null);
    
    // Atualiza estados locais
    setConnectionError(null);
    setNeedsRepair(false);

    try {
      logDebug('Iniciando processo de login com solução alternativa');
      console.log('[DEBUG] Tentando login com email:', email);
      
      // Verificar se o email existe antes de tentar login
      if (email) {
        const emailCheck = await checkEmailExists(email);
        console.log('[DEBUG] Resultado da verificação de email:', emailCheck);
        if (!emailCheck.success || !emailCheck.exists) {
          logDebug(`Email não encontrado ou erro ao verificar: ${JSON.stringify(emailCheck)}`, 'error');
          throw new Error('Email não encontrado no sistema. Verifique suas credenciais.');
        }
      }
      
      // Usar a função de login alternativa que contorna o problema do Supabase
      const loginResult = await loginWithBypass(email, password);
      console.log('[DEBUG] Resultado do login alternativo:', loginResult);
      
      if (!loginResult.success) {
        // Verificar erros específicos
        if (loginResult.error === 'Invalid login credentials') {
          throw new Error('Credenciais inválidas. Verifique seu email e senha.');
        } else if (loginResult.details?.code === 500) {
          // Mesmo com a solução alternativa, ainda pode ocorrer erro do banco
          logDebug('Erro de banco de dados no login alternativo', 'error');
          setNeedsRepair(true);
          throw new Error('Erro nas permissões do usuário. Entre em contato com o administrador.');
        } else {
          throw new Error(loginResult.error || 'Erro ao fazer login');
        }
      }
      
      // Forçar atualização do estado de autenticação no Supabase
      await supabase.auth.getSession();
      
      // Login bem-sucedido, verificar/criar usuário na tabela users
      if (loginResult.user) {
        logDebug('Login alternativo bem-sucedido, garantindo registro na tabela users');
        
        const userResult = await ensureUserExists(
          loginResult.user.id,
          loginResult.user.email
        );
        
        if (!userResult.success) {
          console.error('[DEBUG] Erro ao garantir usuário na tabela:', userResult.error);
          // Continuar mesmo com erro
        }
        
        // Atualiza o estado global do usuário
        setUser(loginResult.user);
        setLoading(false);
        
        toast({
          title: 'Login realizado com sucesso',
          description: 'Você será redirecionado para seus aplicativos.'
        });
        
        // Forçar redirecionamento direto para evitar problemas
        window.location.href = ROUTES.PROTECTED.PORTAL_SELECTION;
        return;
      }
      // Este bloco não é mais necessário, pois já redirecionamos no caso de sucesso acima
      // Mantido como fallback para casos não previstos
      setLoading(false);
      setUser(null);
      toast({
        title: 'Login bem-sucedido',
        description: 'Bem-vindo de volta!'
      });
    } catch (error) {
      // Atualiza estados globais em caso de erro
      setLoading(false);
      setUser(null);
      setError(error instanceof Error ? error.message : 'Erro ao fazer login');
      
      console.error('Erro no login:', error);
      
      toast({
        title: 'Erro de autenticação',
        description: error instanceof Error ? error.message : 'Erro ao fazer login',
        variant: 'destructive',
      });
    }
  };

  /**
   * Função para tentar reparar permissões de usuário
   */
  const handleRepairPermissions = async () => {
    setIsRepairing(true);
    
    try {
      const email = (document.getElementById('email') as HTMLInputElement)?.value;
      
      if (!email) {
        throw new Error('Por favor, informe seu email antes de reparar as permissões');
      }
      
      const result = await performLoginRepair(email);
      
      if (result.success) {
        toast({
          title: 'Permissões reparadas',
          description: 'Suas permissões foram reparadas. Tente fazer login novamente.',
        });
        setNeedsRepair(false);
      } else {
        throw new Error(result.error || 'Não foi possível reparar as permissões');
      }
    } catch (error) {
      toast({
        title: 'Erro ao reparar',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao tentar reparar permissões',
        variant: 'destructive',
      });
    } finally {
      setIsRepairing(false);
    }
  };

  /**
   * Função para testar a conexão com o Supabase
   */
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionError(null);
    
    try {
      const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
      
      if (error) {
        throw new Error(`Erro de conexão com Supabase: ${error.message}`);
      }
      
      toast({
        title: 'Conexão bem-sucedida',
        description: 'A conexão com o Supabase está funcionando corretamente.',
      });
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Erro ao testar conexão');
    } finally {
      setIsTestingConnection(false);
    }
  };

  /**
   * Função para processar solicitação de redefinição de senha
   */
  const handleForgotPassword = async () => {
    try {
      const email = (document.getElementById('email') as HTMLInputElement)?.value;
      
      if (!email) {
        throw new Error('Por favor, informe seu email para redefinir a senha');
      }
      
      // Verificar se o email existe no sistema
      const emailCheck = await checkEmailExists(email);
      if (!emailCheck.success || !emailCheck.exists) {
        throw new Error('Este email não está registrado em nosso sistema');
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) throw error;
      
      toast({
        title: 'Email enviado',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao enviar email',
        description: error instanceof Error ? error.message : 'Não foi possível enviar o email de redefinição',
        variant: 'destructive',
      });
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    connectionError,
    isTestingConnection,
    needsRepair,
    isRepairing,
    handleLogin,
    handleRepairPermissions,
    handleTestConnection,
    handleForgotPassword,
  };
}

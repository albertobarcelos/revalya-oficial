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

  // Estados para fluxo de redefinição via OTP em modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetStep, setResetStep] = useState<"EMAIL" | "CODE" | "PASSWORD">("EMAIL");
  const [isEmailFormatValid, setIsEmailFormatValid] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const resendIntervalRef = useRef<number | null>(null);
  
  // Estados globais do Zustand
  const { 
    setUser,
    setLoading, 
    setError,
    isLoading: loading,
    error: authError,
    setPasswordRecovery
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
    setPasswordRecovery(true);
    setIsResetModalOpen(true);
    setResetStep('EMAIL');
    setResetEmail('');
    setResetOtp('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setIsEmailFormatValid(false);
    setCanResend(false);
    setResendTimer(30);
  };

  const sendResetCode = async (): Promise<boolean> => {
    try {
      if (!resetEmail) throw new Error('Informe seu email');
      const emailCheck = await checkEmailExists(resetEmail);
      if (!emailCheck.success || !emailCheck.exists) {
        toast({ title: 'E-mail não cadastrado', description: 'Verifique e tente novamente.', variant: 'destructive' });
        return false;
      }
      setIsSendingCode(true);
      const baseUrl = (import.meta.env.VITE_APP_URL as string) || (window.location.origin);
      let redirectUrl = 'http://localhost:8080/reset-password';
      try {
        const u = new URL(baseUrl);
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
          u.protocol = 'http:';
          u.port = '8080';
        }
        u.pathname = '/reset-password';
        redirectUrl = u.toString();
      } catch {}
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: redirectUrl });
      if (error) throw error;
      toast({ title: 'Código enviado', description: 'Verifique seu email.' });
      setResetStep('CODE');
      setCanResend(false);
      setResendTimer(30);
      if (resendIntervalRef.current) window.clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = window.setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            if (resendIntervalRef.current) window.clearInterval(resendIntervalRef.current);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return true;
    } catch (error) {
      toast({ title: 'Erro ao enviar código', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
      return false;
    } finally {
      setIsSendingCode(false);
    }
  };

  const resendCode = async () => {
    if (!canResend) return;
    await sendResetCode();
  };

  const validateOtpCode = async (code?: string) => {
    try {
      const token = code ?? resetOtp;
      if (token.length !== 6) return;
      setIsVerifyingCode(true);
      const { data: { session }, error } = await supabase.auth.verifyOtp({ email: resetEmail, token, type: 'recovery' });
      if (error) throw error;
      if (!session) throw new Error('Código inválido');
      toast({ title: 'Código validado', description: 'Informe sua nova senha.' });
      setResetStep('PASSWORD');
    } catch (error) {
      toast({ title: 'Código inválido', description: error instanceof Error ? error.message : 'Verifique e tente novamente.', variant: 'destructive' });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const isPasswordStrong = (pwd: string) => {
    const hasMin = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    return hasMin && hasUpper && hasLower && hasNumber;
  };

  /**
   * Verifica OTP e atualiza a senha do usuário em sessão de recuperação
   */
  const handleVerifyOtpAndResetPassword = async () => {
    try {
      if (!isPasswordStrong(resetNewPassword)) {
        throw new Error('A senha não atende aos requisitos.');
      }
      if (resetNewPassword !== resetConfirmPassword) {
        throw new Error('As senhas não coincidem.');
      }

      setIsResetting(true);

      const { error: updateErr } = await supabase.auth.updateUser({ password: resetNewPassword });
      if (updateErr) throw updateErr;

      toast({
        title: 'Senha atualizada',
        description: 'Sua senha foi redefinida com sucesso. Faça login novamente.',
      });

      // Encerrar sessão de recuperação para exibir campos de login
      await supabase.auth.signOut();
      setUser(null);

      // Limpa estados e fecha modal
      if (resendIntervalRef.current) {
        window.clearInterval(resendIntervalRef.current);
        resendIntervalRef.current = null;
      }
      setIsResetModalOpen(false);
      setResetOtp("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setResetEmail("");
      setResetStep('EMAIL');
      setPasswordRecovery(false);
    } catch (error) {
      toast({
        title: 'Erro na redefinição',
        description: error instanceof Error ? error.message : 'Não foi possível redefinir sua senha.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
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
    sendResetCode,
    resendCode,
    validateOtpCode,
    // Fluxo OTP em modal
    isResetModalOpen,
    setIsResetModalOpen,
    resetStep,
    setResetStep,
    resetEmail,
    setResetEmail,
    isEmailFormatValid,
    setIsEmailFormatValid,
    resetOtp,
    setResetOtp,
    resetNewPassword,
    setResetNewPassword,
    resetConfirmPassword,
    setResetConfirmPassword,
    isResetting,
    isSendingCode,
    isVerifyingCode,
    resendTimer,
    canResend,
    isPasswordStrong,
    handleVerifyOtpAndResetPassword,
  };
}

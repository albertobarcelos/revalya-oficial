import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, AlertCircle, Shield, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLoginHandler } from "@/hooks/useLoginHandler";
import { useZustandAuth } from "@/hooks/useZustandAuth";
import { useToast } from "@/components/ui/use-toast";
 

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

function Login() {
  const { toast } = useToast();
  const { 
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
    isResetModalOpen,
    setIsResetModalOpen,
    resetStep,
    setResetStep,
    resetEmail,
    setResetEmail,
    isEmailFormatValid,
    setIsEmailFormatValid,
    sendResetCode,
    isSendingCode,
    resetOtp,
    setResetOtp,
    validateOtpCode,
    isVerifyingCode,
    resendTimer,
    canResend,
    resendCode,
    resetNewPassword,
    setResetNewPassword,
    resetConfirmPassword,
    setResetConfirmPassword,
    isPasswordStrong,
    isResetting,
    handleVerifyOtpAndResetPassword
  } = useLoginHandler();
  const [showPassword, setShowPassword] = useState(false);
  
  // Obtendo estado global de autenticação do Zustand
  const { 
    user: authUser, 
    isLoading: authLoading
  } = useZustandAuth();

  // AIDEV-NOTE: Forçar tema escuro na página de login
  // Garante que a tela de login sempre esteja em modo escuro
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    
    // Cleanup: quando sair da página, o ThemeProvider vai restaurar o tema
    return () => {
      // Não removemos a classe aqui para evitar flicker
      // O ThemeProvider vai gerenciar o tema quando navegar para outra página
    };
  }, []);

  // Log de montagem do componente
  useEffect(() => {
    logDebug('Componente Login montado');
    
    // Log do estado de autenticação do Zustand
    if (authUser) {
      logDebug(`Usuário já autenticado: ${authUser.email}`, 'info');
    }
  }, [authUser]);

  // Exibe feedback pós-confirmação de cadastro via link de e-mail
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const confirmed = params.get('signup_confirmed');
      const errorDescription = params.get('error_description');
      const error = params.get('error');
      if (confirmed === '1') {
        toast({ title: 'Email confirmado', description: 'Cadastro validado. Faça login para continuar.' });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (errorDescription || error) {
        const desc = decodeURIComponent(errorDescription || 'Falha ao confirmar email');
        toast({ title: 'Erro na confirmação', description: desc, variant: 'destructive' });
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {}
  }, [toast]);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Lado esquerdo - Logo e mensagem de boas-vindas */}
      <div className="hidden lg:flex w-1/2 bg-background flex-col items-center justify-center p-12 border-r border-border">
        <div className="w-3/4 flex flex-col items-center">
          <img 
            src="/logos/LOGO-REVALYA123.png" 
            alt="Revalya Logo" 
            className="w-full mb-12"
          />
          <h1 className="text-4xl font-bold text-foreground mb-6 text-center">
            Bem-vindo de volta!
          </h1>
          <p className="text-muted-foreground text-lg text-center">
              Gerencie as <span className="text-accent font-semibold">cobranças</span> e mantenha seu negócio organizado com a plataforma mais completa do mercado.
            </p>
        </div>
      </div>

      {/* Lado direito - Formulário / Redefinição */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-card/60 shadow-sm p-8">
          
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-10 w-full">
            <img 
              src="/logos/LOGO-REVALYA123.png" 
              alt="Revalya Logo" 
              className="w-3/4"
            />
          </div>

          <div className="mb-10">
            {isResetModalOpen && (
              <div className="flex justify-start mb-2">
                <button
                  type="button"
                  onClick={() => {
                    if (resetStep === 'EMAIL') {
                      setIsResetModalOpen(false);
                    } else if (resetStep === 'CODE') {
                      // volta para inserir e-mail
                      // mantém modal aberto, apenas troca etapa
                      setResetStep('EMAIL');
                    } else {
                      // PASSWORD -> volta para código
                      setResetStep('CODE');
                    }
                  }}
                  className="p-2 rounded-md hover:bg-accent/10 text-muted-foreground"
                  aria-label="Voltar"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-accent">
                {isResetModalOpen ? (resetStep === 'PASSWORD' ? 'Defina sua nova senha' : 'Redefinir senha') : 'Acesse sua conta'}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {isResetModalOpen
                  ? (resetStep === 'EMAIL'
                    ? 'Insira seu e-mail para receber o código de recuperação'
                    : resetStep === 'CODE'
                      ? 'Informe o código enviado para seu e-mail'
                      : 'Digite e confirme sua nova senha')
                  : 'Entre com suas credenciais para continuar'}
              </p>
            </div>
          </div>

          {connectionError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Problema de conexão</AlertTitle>
              <AlertDescription>
                {connectionError}
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      "Testar conexão"
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {needsRepair && (
            <Alert variant="default" className="mb-6 bg-warning/10 border-warning/20">
              <Shield className="h-4 w-4 text-warning" />
              <AlertTitle className="text-warning-foreground">Permissões precisam ser reparadas</AlertTitle>
              <AlertDescription className="text-warning-foreground/80">
                Detectamos um problema com as permissões do seu usuário. Isso geralmente ocorre quando o projeto Supabase é pausado e depois reativado.
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 bg-warning/20 border-warning/30 text-warning-foreground hover:bg-warning/30"
                    onClick={handleRepairPermissions}
                    disabled={isRepairing}
                  >
                    {isRepairing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Reparando...
                      </>
                    ) : (
                      "Reparar permissões"
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isResetModalOpen ? (
            resetStep === 'EMAIL' ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="inline-reset-email">Email</Label>
                  <Input
                    id="inline-reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value);
                      setIsEmailFormatValid(isValid);
                    }}
                    className="h-11"
                  />
                </div>

                <div>
                  <Button
                    onClick={async () => {
                      const ok = await sendResetCode();
                      if (!ok) {
                        // erro já exibido via toast
                      }
                    }}
                    className="w-full h-11"
                    disabled={!isEmailFormatValid || isSendingCode}
                  >
                    {isSendingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar código'
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <ResetFlow
                resetStep={resetStep}
                resetEmail={resetEmail}
                setResetEmail={setResetEmail}
                isEmailFormatValid={isEmailFormatValid}
                setIsEmailFormatValid={setIsEmailFormatValid}
                sendResetCode={sendResetCode}
                isSendingCode={isSendingCode}
                resetOtp={resetOtp}
                setResetOtp={setResetOtp}
                validateOtpCode={validateOtpCode}
                isVerifyingCode={isVerifyingCode}
                resendTimer={resendTimer}
                canResend={canResend}
                resendCode={resendCode}
                resetNewPassword={resetNewPassword}
                setResetNewPassword={setResetNewPassword}
                resetConfirmPassword={resetConfirmPassword}
                setResetConfirmPassword={setResetConfirmPassword}
                isPasswordStrong={isPasswordStrong}
                isResetting={isResetting}
                handleVerifyOtpAndResetPassword={handleVerifyOtpAndResetPassword}
              />
            )
          ) : (
            <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-500 dark:border-slate-300 focus:border-accent"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-200">Senha</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-accent hover:text-accent/90"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10 dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-500 dark:border-slate-300 focus:border-accent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-accent"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 bg-accent hover:bg-accent/90 text-white" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </motion.form>
          )}

          {/* Modal removido: fluxo agora é totalmente inline */}

        </div>
      </div>
    </div>
  );
}

export default Login;
function ResetFlow({
  resetStep,
  resetEmail,
  setResetEmail,
  isEmailFormatValid,
  setIsEmailFormatValid,
  sendResetCode,
  isSendingCode,
  resetOtp,
  setResetOtp,
  validateOtpCode,
  isVerifyingCode,
  resendTimer,
  canResend,
  resendCode,
  resetNewPassword,
  setResetNewPassword,
  resetConfirmPassword,
  setResetConfirmPassword,
  isPasswordStrong,
  isResetting,
  handleVerifyOtpAndResetPassword,
}: any) {
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setResetEmail(val);
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    setIsEmailFormatValid(isValid);
    setEmailError(isValid ? null : 'E-mail inválido');
  };

  const onSendCode = async () => {
    const ok = await sendResetCode();
    if (!ok) setEmailError('E-mail não cadastrado');
  };

  const onOtpChange = (val: string) => {
    setResetOtp(val);
    if (val.length === 6) validateOtpCode(val);
  };

  const passwordsOk =
    isPasswordStrong(resetNewPassword) && resetNewPassword === resetConfirmPassword;

  return (
    <div className="space-y-6">
      {resetStep === 'EMAIL' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={handleEmailChange}
              className="h-11"
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>
          <Button
            onClick={onSendCode}
            className="w-full h-11"
            disabled={!isEmailFormatValid || isSendingCode}
          >
            {isSendingCode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar código'
            )}
          </Button>
        </div>
      )}

      {resetStep === 'CODE' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Código (6 dígitos)</Label>
            <InputOTP maxLength={6} value={resetOtp} onChange={onOtpChange}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {isVerifyingCode && (
            <div className="flex items-center text-muted-foreground text-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando código...
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reenviar em {resendTimer}s</span>
            <Button variant="outline" size="sm" onClick={resendCode} disabled={!canResend || isSendingCode}>
              {isSendingCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : (
                'Reenviar código'
              )}
            </Button>
          </div>
        </div>
      )}

      {resetStep === 'PASSWORD' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">Nova senha</Label>
            <Input
              id="reset-password"
              type="password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Requisitos: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-password-confirm">Confirme a nova senha</Label>
            <Input
              id="reset-password-confirm"
              type="password"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              className="h-11"
            />
          </div>
          <Button onClick={handleVerifyOtpAndResetPassword} className="w-full h-11" disabled={!passwordsOk || isResetting}>
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              'Confirmar nova senha'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

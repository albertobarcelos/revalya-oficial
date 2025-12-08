import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Shield, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLoginHandler } from "@/hooks/useLoginHandler";
import { useAuthStore } from "@/store/authStore";
import { useZustandAuth } from "@/hooks/useZustandAuth";
 

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
    handleForgotPassword
  } = useLoginHandler();
  const [showPassword, setShowPassword] = useState(false);
  
  // Obtendo estado global de autenticação do Zustand
  const { 
    user: authUser, 
    isLoading: authLoading
  } = useZustandAuth();
  const authError = useAuthStore(state => state.error);

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

      {/* Lado direito - Formulário de login */}
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

          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-accent">
              Acesse sua conta
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Entre com suas credenciais para continuar
            </p>
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

          <form onSubmit={handleLogin} className="space-y-6">
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
          </form>

          
        </div>
      </div>
    </div>
  );
}

export default Login;

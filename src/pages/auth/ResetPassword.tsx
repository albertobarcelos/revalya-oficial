import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { type EmailOtpType } from '@supabase/supabase-js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Inicializa a sessão de recuperação ao entrar pela URL do email
   * AIDEV-NOTE: Garante troca de código por sessão (PKCE) ou verificação OTP
   */
  useEffect(() => {
    const initRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        const token_hash = url.searchParams.get('token_hash');
        const typeParam = url.searchParams.get('type');

        if (token_hash && typeParam) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: typeParam as EmailOtpType,
          });
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Listener para fluxo implícito baseado em evento PASSWORD_RECOVERY
          supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'PASSWORD_RECOVERY') {
              const { data: { session: s } } = await supabase.auth.getSession();
              if (!s) {
                throw new Error('Sessão de recuperação não inicializada');
              }
            }
          });
        }
      } catch (err: any) {
        toast({
          title: 'Falha ao inicializar recuperação',
          description: err?.message || 'Link inválido ou expirado. Solicite novo email.',
          variant: 'destructive',
        });
      }
    };

    void initRecoverySession();
  }, [toast]);

  /**
   * Verifica OTP por email para criar sessão quando necessário
   */
  const handleVerifyOtp = async () => {
    try {
      if (!email || !otpCode) {
        toast({
          title: 'Dados incompletos',
          description: 'Informe email e código de verificação.',
          variant: 'destructive',
        });
        return;
      }
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'recovery' as EmailOtpType,
      });
      if (error) throw error;
      if (!session) throw new Error('Sessão não criada. Verifique o código.');
      toast({ title: 'Código verificado', description: 'Sessão criada com sucesso.' });
    } catch (err: any) {
      toast({
        title: 'Falha ao verificar código',
        description: err?.message || 'Não foi possível verificar o código.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submete atualização de senha após sessão de recuperação ativa
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro na validação",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (email && otpCode) {
          const { data: { session: verifiedSession }, error } = await supabase.auth.verifyOtp({
            email,
            token: otpCode,
            type: 'recovery' as EmailOtpType,
          });
          if (error) throw error;
          if (!verifiedSession) throw new Error('Sessão ainda ausente após verificar o código.');
        } else {
          throw new Error('Auth session missing! Verifique o código do email para criar a sessão.');
        }
      }
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha atualizada",
        description: "Sua senha foi atualizada com sucesso.",
      });

      // Redireciona para a página de login após atualizar a senha
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message || "Não foi possível atualizar sua senha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo - Logo e mensagem */}
      <div className="hidden lg:flex w-1/2 bg-[#0f0f11] flex-col items-center justify-center p-12">
        <div className="max-w-md">
          <img 
            src="/logos/LOGO-REVALYA123.png" 
            alt="Revalya Logo" 
            className="h-12 mb-8"
          />
          <h1 className="text-4xl font-bold text-white mb-4">
            Redefinição de Senha
          </h1>
          <p className="text-muted-foreground text-lg">
            Escolha uma nova senha segura para sua conta.
          </p>
        </div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <img 
              src="/logos/LOGO-REVALYA123.png" 
              alt="Revalya Logo" 
              className="h-10"
            />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              Nova Senha
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Digite e confirme sua nova senha
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">Código de verificação (6 dígitos)</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="h-11"
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleVerifyOtp} disabled={loading}>
                  {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>) : 'Verificar Código'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirme a Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar Senha"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

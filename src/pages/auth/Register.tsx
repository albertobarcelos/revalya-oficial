import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [emailExists, setEmailExists] = useState(false);

  const token = searchParams.get("token");

  const validateInvite = async () => {
    console.log('🔍 [DEBUG] Validando convite, token:', token);
    
    // AIDEV-NOTE: Em desenvolvimento, permitir acesso sem token para facilitar testes
    const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;
    
    if (!token) {
      if (isDevelopment) {
        console.warn('⚠️ [DEV MODE] Token não fornecido, mas permitindo acesso em desenvolvimento');
        // Em dev, permitir registro sem token (email será preenchido manualmente)
        return true;
      }
      console.error('❌ [DEBUG] Token não fornecido na URL');
      navigate("/invalid-link?error_description=É+necessário+um+convite+válido+para+se+registrar");
      return false;
    }

    // AIDEV-NOTE: Usar tenant_invites em vez de invites (tabela antiga)
    // A política RLS permite leitura pública de convites pendentes
    console.log('🔍 [DEBUG] Buscando convite no banco...');
    const { data: invite, error } = await supabase
      .from("tenant_invites")
      .select("*, tenant:tenants(name)")
      .eq("token", token)
      .single();

    if (error) {
      console.error('❌ [DEBUG] Erro ao buscar convite:', error);
      console.error('❌ [DEBUG] Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      navigate("/invalid-link?error_description=Este+convite+não+é+válido");
      return false;
    }

    if (!invite) {
      console.error('❌ [DEBUG] Convite não encontrado para o token fornecido');
      navigate("/invalid-link?error_description=Este+convite+não+é+válido");
      return false;
    }

    console.log('✅ [DEBUG] Convite encontrado:', {
      id: invite.id,
      email: invite.email,
      status: invite.status,
      expires_at: invite.expires_at,
      tenant_name: invite.tenant?.name
    });

    // Verificar se o convite já foi aceito
    if (invite.status !== "PENDING") {
      console.warn('⚠️ [DEBUG] Convite não está pendente, status:', invite.status);
      if (invite.status === "ACCEPTED") {
        navigate("/invalid-link?error_description=Este+convite+já+foi+aceito");
      } else {
        navigate("/invalid-link?error_description=Este+convite+não+está+mais+disponível");
      }
      return false;
    }

    // Verificar se o convite expirou
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      console.warn('⚠️ [DEBUG] Convite expirado:', {
        expires_at: invite.expires_at,
        now: new Date().toISOString()
      });
      navigate("/invalid-link?error_description=Este+convite+expirou");
      return false;
    }

    console.log('✅ [DEBUG] Convite válido, configurando email:', invite.email);
    setEmail(invite.email);
    
    return true;
  };

  useEffect(() => {
    validateInvite();
  }, []);

  // AIDEV-NOTE: Validação em tempo real das senhas
  useEffect(() => {
    if (confirmPassword && password) {
      if (password !== confirmPassword) {
        setPasswordError("As senhas não coincidem");
      } else {
        setPasswordError("");
      }
    } else if (confirmPassword && !password) {
      setPasswordError("Digite a senha primeiro");
    } else {
      setPasswordError("");
    }
  }, [password, confirmPassword]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError("");
    setEmailExists(false);

    // AIDEV-NOTE: Validar se as senhas coincidem
    if (password !== confirmPassword) {
      setPasswordError("As senhas não coincidem");
      setLoading(false);
      toast({
        title: "Erro na validação",
        description: "As senhas não coincidem. Verifique e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    // AIDEV-NOTE: Validar tamanho mínimo da senha
    if (password.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres");
      setLoading(false);
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;
      
      // AIDEV-NOTE: Em desenvolvimento sem token, permitir registro básico
      if (!token && isDevelopment) {
        console.warn('⚠️ [DEV MODE] Registro sem token - criando apenas conta de autenticação');
        
        // AIDEV-NOTE: Verificar se o email já existe antes de tentar criar
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, email")
          .eq("email", email)
          .single();

        if (existingUser) {
          setEmailExists(true);
          setLoading(false);
          toast({
            title: 'Email já cadastrado',
            description: 'Este email já possui uma conta. Clique no botão abaixo para fazer login.',
            variant: "destructive",
          });
          return;
        }

        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message?.includes('already registered') || 
              signUpError.message?.includes('already exists') ||
              signUpError.message?.includes('User already registered')) {
            setEmailExists(true);
            setLoading(false);
            toast({
              title: 'Email já cadastrado',
              description: 'Este email já possui uma conta. Clique no botão abaixo para fazer login.',
              variant: "destructive",
            });
            return;
          }
          throw signUpError;
        }

        // AIDEV-NOTE: Verificar se o usuário foi realmente criado
        // O Supabase pode retornar sucesso sem criar se o email já existe
        if (!data.user) {
          setEmailExists(true);
          setLoading(false);
          toast({
            title: 'Email já cadastrado',
            description: 'Este email já possui uma conta. Clique no botão abaixo para fazer login.',
            variant: "destructive",
          });
          return;
        }

        // Criar perfil básico do usuário
        const { error: userError } = await supabase
          .from("users")
          .upsert({
            id: data.user.id,
            name,
            email,
            user_role: 'TENANT_USER',
          });

        if (userError) {
          console.error("Erro ao criar perfil de usuário:", userError);
          // Verificar se é erro de duplicação
          if (userError.message?.includes('duplicate') || userError.code === '23505') {
            setEmailExists(true);
            setLoading(false);
            toast({
              title: 'Email já cadastrado',
              description: 'Este email já possui uma conta. Clique no botão abaixo para fazer login.',
              variant: "destructive",
            });
            return;
          }
        }

        toast({
          title: "Registro realizado com sucesso!",
          description: "Verifique seu email para confirmar o cadastro.",
        });

        navigate("/login");
        return;
      }

      // AIDEV-NOTE: Fluxo normal com token
      const isValid = await validateInvite();
      if (!isValid) return;

      // AIDEV-NOTE: Verificar se o email já existe antes de tentar criar
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", email)
        .single();

      if (existingUser) {
        setEmailExists(true);
        setLoading(false);
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já possui uma conta. Clique no botão abaixo para fazer login.',
          variant: "destructive",
        });
        return;
      }

      // AIDEV-NOTE: Tentar criar conta
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      // AIDEV-NOTE: Se o erro for de usuário já existente, mostrar botão para login
      if (signUpError) {
        if (signUpError.message?.includes('already registered') || 
            signUpError.message?.includes('already exists') ||
            signUpError.message?.includes('User already registered')) {
          setEmailExists(true);
          setLoading(false);
          toast({
            title: 'Email já cadastrado',
            description: 'Este email já possui uma conta. Clique no botão abaixo para fazer login.',
            variant: "destructive",
          });
          return;
        }
        throw signUpError;
      }

      // AIDEV-NOTE: Verificar se o usuário foi realmente criado
      // O Supabase pode retornar sucesso sem criar se o email já existe
      if (!data.user) {
        setEmailExists(true);
        setLoading(false);
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já possui uma conta. Clique no botão abaixo para fazer login.',
          variant: "destructive",
        });
        return;
      }

      // AIDEV-NOTE: Buscar o convite novamente para obter tenant_id e role
      const { data: invite, error: inviteError } = await supabase
        .from("tenant_invites")
        .select("tenant_id, role")
        .eq("token", token)
        .single();

      if (inviteError || !invite) {
        throw new Error("Convite não encontrado");
      }

      // Criar o usuário manualmente caso necessário
      if (data.user) {
        /**
         * Persistir dados do usuário na tabela public.users.
         */
        const { error: userError } = await supabase
          .from("users")
          .upsert({
            id: data.user.id,
            name,
            email,
            user_role: invite.role, // Usar role do convite
          });

        if (userError) {
          console.error("Erro ao criar perfil de usuário:", userError);
        }

        // AIDEV-NOTE: Associar usuário ao tenant automaticamente APENAS quando registra com convite
        // O trigger auto_create_tenant_admin foi desabilitado para evitar associação automática
        const { error: tenantUserError } = await supabase
          .from("tenant_users")
          .insert({
            tenant_id: invite.tenant_id,
            user_id: data.user.id,
            role: invite.role,
            active: true, // AIDEV-NOTE: Usuário ativo ao aceitar convite via registro
          });

        if (tenantUserError) {
          console.error("Erro ao associar usuário ao tenant:", tenantUserError);
          // Não bloqueia o fluxo, mas loga o erro
        }

        // AIDEV-NOTE: Marcar o convite como aceito
        await supabase
          .from("tenant_invites")
          .update({
            status: "ACCEPTED",
            accepted_at: new Date().toISOString(),
            user_id: data.user.id,
          })
          .eq("token", token);
      }

      toast({
        title: "Registro realizado com sucesso!",
        description: "Verifique seu email para confirmar o cadastro.",
      });

      navigate("/login");
    } catch (error) {
      console.error("Erro ao registrar:", error);
      toast({
        title: "Erro ao registrar",
        description: "Ocorreu um erro ao criar sua conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-4 space-y-4">
        <div className="text-center mb-8">
          <img
            src="/logos/LOGO-REVALYA123.png"
            alt="Revalya Logo"
            className="h-24 mx-auto mb-4"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">Criar conta</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  Nome completo
                  <span className="text-red-500 font-bold text-base">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-black pl-[5px]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  Email
                  <span className="text-red-500 font-bold text-base">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailExists(false);
                  }}
                  readOnly={!!token}
                  className={token ? "bg-gray-100 text-black pl-[5px]" : "text-black pl-[5px]"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-1">
                  Senha
                  <span className="text-red-500 font-bold text-base">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`text-black pl-[5px] pr-10 ${passwordError && confirmPassword ? "border-destructive" : ""}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-1">
                  Confirmar Senha
                  <span className="text-red-500 font-bold text-base">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`text-black pl-[5px] pr-10 ${passwordError ? "border-destructive focus:border-destructive focus:ring-destructive" : ""}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-sm text-destructive font-medium animate-in fade-in-0">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full text-white" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Criar conta
              </Button>
            </form>
            
            {/* AIDEV-NOTE: Alerta quando email já existe */}
            {emailExists && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Email já cadastrado</AlertTitle>
                <AlertDescription className="mt-2">
                  Este email já possui uma conta em nosso sistema. Clique no botão abaixo para fazer login.
                  <Button
                    type="button"
                    onClick={() => {
                      if (token) {
                        navigate(`/login?redirect=/register?token=${token}`);
                      } else {
                        navigate('/login');
                      }
                    }}
                    className="w-full mt-3 text-white"
                    variant="default"
                  >
                    Ir para Login
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

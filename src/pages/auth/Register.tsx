import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const token = searchParams.get("token");

  const validateInvite = async () => {
    console.log('🔍 [DEBUG] Validando convite, token:', token);
    
    if (!token) {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isValid = await validateInvite();
      if (!isValid) return;

      // AIDEV-NOTE: Tentar criar conta
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            company_name: company,
          },
        },
      });

      // AIDEV-NOTE: Se o erro for de usuário já existente, redirecionar para login
      if (signUpError) {
        if (signUpError.message?.includes('already registered') || 
            signUpError.message?.includes('already exists') ||
            signUpError.message?.includes('User already registered')) {
          toast({
            title: 'Usuário já existe',
            description: 'Este email já possui uma conta. Redirecionando para login...',
          });
          
          // Redirecionar para login com o token para processar após login
          navigate(`/login?redirect=/register?token=${token}`);
          return;
        }
        throw signUpError;
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
         * Observação: company_name não existe como coluna em users; armazenamos em users.metadata.company_name.
         */
        const { error: userError } = await supabase
          .from("users")
          .upsert({
            id: data.user.id,
            name,
            email,
            metadata: { company_name: company },
            user_role: invite.role, // Usar role do convite
            active: true,
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
            src="https://i.ibb.co/7Wq2L4n/NEXSYN-laranja-2.png"
            alt="Logo"
            className="h-12 mx-auto mb-4"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar conta</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Criar conta
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
    if (!token) {
      navigate("/invalid-link?error_description=É+necessário+um+convite+válido+para+se+registrar");
      return false;
    }

    const { data: invite, error } = await supabase
      .from("invites")
      .select()
      .eq("token", token)
      .single();

    if (error || !invite) {
      navigate("/invalid-link?error_description=Este+convite+não+é+válido");
      return false;
    }

    if (invite.used_at) {
      navigate("/invalid-link?error_description=Este+convite+já+foi+utilizado");
      return false;
    }

    if (new Date(invite.expires_at) < new Date()) {
      navigate("/invalid-link?error_description=Este+convite+expirou");
      return false;
    }

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

      if (signUpError) throw signUpError;

      // Marcar o convite como usado
      await supabase
        .from("invites")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      // Criar o usuário manualmente caso necessário
      if (data.user) {
        const { error: userError } = await supabase
          .from("users")
          .upsert({
            id: data.user.id,
            name,
            email,
            company_name: company,
            user_role: 'TENANT_USER', // Papel padrão para novos usuários
            active: true,
          });

        if (userError) {
          console.error("Erro ao criar perfil de usuário:", userError);
        }
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

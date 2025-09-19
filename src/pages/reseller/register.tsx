import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function ResellerRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resellerId, setResellerId] = useState<string | null>(null);

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

    // Verifica se é um convite de revendedor
    if (!invite.metadata?.type || invite.metadata.type !== 'reseller') {
      navigate("/invalid-link?error_description=Este+convite+não+é+válido+para+revendedores");
      return false;
    }

    setEmail(invite.email);
    setResellerId(invite.metadata.reseller_id);
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

      // 1. Criar usuário no Auth
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'reseller',
            reseller_id: resellerId
          },
        },
      });

      if (signUpError) throw signUpError;

      // 2. Marcar o convite como usado
      await supabase
        .from("invites")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      // 3. Criar o registro do usuário revendedor e vínculo
      if (data.user) {
        // Criar usuário
        const { error: userError } = await supabase
          .from("users")
          .upsert({
            id: data.user.id,
            name,
            email,
            user_role: 'RESELLER',
            reseller_id: resellerId,
            active: true
          });

        if (userError) {
          console.error("Erro ao criar registro de usuário:", userError);
          throw userError;
        }

        // Criar vínculo com o revendedor
        const { error: linkError } = await supabase
          .from("reseller_users")
          .insert({
            user_id: data.user.id,
            reseller_id: resellerId,
            role: 'owner', // Primeiro usuário é sempre owner
            active: true
          });

        if (linkError) {
          console.error("Erro ao vincular usuário ao revendedor:", linkError);
          throw linkError;
        }
      }

      toast({
        title: "Registro realizado com sucesso!",
        description: "Verifique seu email para confirmar o cadastro.",
      });

      navigate("/reseller/login");
    } catch (error: any) {
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
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Registro de Revendedor</CardTitle>
          <CardDescription>
            Crie sua conta de revendedor para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Crie uma senha forte"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Criar Conta"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 

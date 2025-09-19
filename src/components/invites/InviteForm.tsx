import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from "uuid";

interface InviteFormProps {
  onInviteCreated: () => void;
}

export function InviteForm({ onInviteCreated }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Primeiro, busca todos os convites existentes para este email
      const { data: existingInvites, error: fetchError } = await supabase
        .from('invites')
        .select('id')
        .eq('email', email);

      if (fetchError) throw fetchError;

      // Se existirem convites, deleta todos eles
      if (existingInvites && existingInvites.length > 0) {
        const { error: deleteError } = await supabase
          .from('invites')
          .delete()
          .in('id', existingInvites.map(inv => inv.id));

        if (deleteError) throw deleteError;

        // Aguarda um pequeno intervalo para garantir que a deleção foi processada
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Cria um novo convite
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: insertError } = await supabase
        .from('invites')
        .insert([
          {
            email,
            token,
            expires_at: expiresAt.toISOString(),
            created_by: user.id
          }
        ]);

      if (insertError) throw insertError;

      // Envia o email de convite
      const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
        body: { email, token }
      });

      if (emailError) {
        console.error('Erro ao enviar email:', emailError);
        throw new Error('Erro ao enviar email de convite');
      }

      toast({
        title: "Convite enviado",
        description: "O convite foi enviado com sucesso para o email informado.",
      });

      setEmail("");
      onInviteCreated();
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error);
      toast({
        title: "Erro ao enviar convite",
        description: error.message || "Ocorreu um erro ao enviar o convite. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleInvite} className="flex gap-4">
      <Input
        type="email"
        placeholder="Email do usuário"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar convite"
        )}
      </Button>
    </form>
  );
}

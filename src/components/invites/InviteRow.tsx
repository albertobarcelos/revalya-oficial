import { useState } from "react";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendInviteEmail } from "@/utils/emailUtils";
import { sendInviteEmailDirect } from "@/utils/emailJsUtils";
import { RefreshCw, Trash2, Link, Copy, X } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteRowProps {
  invite: {
    id: string;
    email: string;
    token: string;
    created_at: string;
    expires_at: string;
    used_at: string | null;
    metadata: {
      type: string;
    };
  };
  onUpdate: () => void;
}

export function InviteRow({ invite, onUpdate }: InviteRowProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const isExpired = new Date(invite.expires_at) < new Date();

  // Gerar o link de convite
  const baseUrl = window.location.origin;
  const inviteLink = invite.metadata.type === 'reseller' 
    ? `${baseUrl}/reseller/register?token=${invite.token}`
    : `${baseUrl}/register?token=${invite.token}`;

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir este convite para ${invite.email}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("invites")
        .delete()
        .eq("id", invite.id);

      if (error) throw error;

      toast({
        title: "Convite excluído",
        description: `O convite para ${invite.email} foi excluído com sucesso.`,
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir convite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      console.log('Reenviando convite para:', invite.email);
      
      // Atualizar a data de expiração
      const { error } = await supabase
        .from("invites")
        .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .eq("id", invite.id);

      if (error) throw error;

      // Tentar enviar o email
      try {
        // Primeiro tenta usar a função Edge
        const emailResult = await sendInviteEmail(
          invite.email, 
          invite.token, 
          invite.metadata.type
        );
        
        if (!emailResult.success) {
          console.error('Erro ao enviar email:', emailResult.error);
          
          // Se falhar, mostra o diálogo com o link
          setShowLinkDialog(true);
          throw new Error('Falha ao enviar email: ' + (emailResult.error || ''));
        } else {
          toast({
            title: "Convite reenviado",
            description: `Um novo email foi enviado para ${invite.email}`,
          });
        }
      } catch (emailError: any) {
        console.error('Erro ao enviar email:', emailError);
        toast({
          title: "Aviso",
          description: `O convite foi atualizado, mas houve um problema ao enviar o email. Use o link manual.`,
          variant: "destructive",
        });
      }

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao reenviar convite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Link copiado!",
      description: "O link de convite foi copiado para a área de transferência.",
    });
  };

  return (
    <>
      <tr>
        <td>{invite.email}</td>
        <td>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isExpired ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
          }`}>
            {isExpired ? 'Expirado' : 'Ativo'}
          </span>
        </td>
        <td>{new Date(invite.created_at).toLocaleString()}</td>
        <td>{new Date(invite.expires_at).toLocaleString()}</td>
        <td className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLinkDialog(true)}
            title="Obter link de cadastro"
          >
            <Link className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResend}
            disabled={isLoading}
            title="Reenviar convite"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isLoading}
            title="Excluir convite"
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </td>
      </tr>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link de Cadastro</DialogTitle>
            <DialogDescription>
              Compartilhe este link com o usuário para que ele possa se cadastrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" value={invite.email} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-link">Link de Cadastro</Label>
              <div className="flex items-center space-x-2">
                <Input id="invite-link" value={inviteLink} readOnly />
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline"
                  onClick={copyLinkToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Este link expira em {new Date(invite.expires_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Fechar
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

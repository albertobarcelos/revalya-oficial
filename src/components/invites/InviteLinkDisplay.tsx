import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, AlertTriangle } from "lucide-react"; 
import { toast } from "@/components/ui/use-toast";
import { useState, useEffect } from 'react';

interface InviteLinkDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  invite: { email: string; token: string | null | undefined } | null; 
}

const InviteLinkDisplay: React.FC<InviteLinkDisplayProps> = ({ isOpen, onClose, invite }) => {
  const [baseUrl, setBaseUrl] = useState(''); 
  const [inviteLink, setInviteLink] = useState<string | null>(null); 

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (baseUrl && invite && invite.token) {
      setInviteLink(`${baseUrl}/reseller/register?token=${invite.token}`);
    } else {
      setInviteLink(null); 
    }
  }, [baseUrl, invite]);

  const copyLinkToClipboard = () => {
    if (!inviteLink) return; 
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        toast({ title: "Link copiado!" });
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        toast({ title: "Erro ao copiar link", variant: "destructive" });
      });
  };

  if (!isOpen || !invite) return null; 

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link de Cadastro</DialogTitle>
          <DialogDescription>
            {inviteLink 
              ? "Compartilhe este link com o usuário para que ele possa se cadastrar."
              : "Não foi possível gerar um link de cadastro para este convite."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" value={invite.email} readOnly />
            </div>
            
            {inviteLink ? (
              <div className="space-y-2">
                <Label htmlFor="invite-link">Link de Cadastro</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="invite-link"
                    value={inviteLink}
                    readOnly
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={copyLinkToClipboard}
                    title="Copiar link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Este link expira em 7 dias a partir da data de envio/reenvio.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-center text-warning border border-warning/20 bg-warning/10 p-4 rounded-md flex flex-col items-center">
                 <AlertTriangle className="h-6 w-6 mb-2" />
                 <p className="font-medium">Link Indisponível</p>
                 <p className="text-sm text-muted-foreground">O convite pode já ter sido aceito, expirado ou o token não está disponível.</p>
                 <p className="text-sm text-muted-foreground">Tente reenviar o convite para gerar um novo link válido.</p>
              </div>
            )}
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
  );
};

export default InviteLinkDisplay;

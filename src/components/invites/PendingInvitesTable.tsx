import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Trash2, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";

interface Invite {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export function PendingInvitesTable() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Erro ao buscar convites:', error);
      toast({
        title: "Erro ao carregar convites",
        description: "Ocorreu um erro ao carregar os convites. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Convite excluído",
        description: "O convite foi excluído com sucesso.",
      });

      fetchInvites();
    } catch (error) {
      console.error('Erro ao excluir convite:', error);
      toast({
        title: "Erro ao excluir convite",
        description: "Ocorreu um erro ao excluir o convite. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInviteStatus = (invite: Invite) => {
    if (invite.used_at) {
      return (
        <Badge className="bg-green-500">
          <UserCheck className="w-4 h-4 mr-1" />
          Usado
        </Badge>
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return (
        <Badge variant="destructive">
          <X className="w-4 h-4 mr-1" />
          Expirado
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="w-4 h-4 mr-1" />
        Pendente
      </Badge>
    );
  };

  if (loading) {
    return <div>Carregando convites...</div>;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((invite) => (
            <TableRow key={invite.id}>
              <TableCell>{invite.email}</TableCell>
              <TableCell>{getInviteStatus(invite)}</TableCell>
              <TableCell>{formatDate(invite.created_at)}</TableCell>
              <TableCell>{formatDate(invite.expires_at)}</TableCell>
              <TableCell>
                {!invite.used_at && new Date(invite.expires_at) > new Date() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteInvite(invite.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

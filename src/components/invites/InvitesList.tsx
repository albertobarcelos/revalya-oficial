import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { TenantInvite, inviteService } from '@/services/inviteService';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, RefreshCw, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface InvitesListProps {
  tenantId: string;
  refreshTrigger?: number;
}

export function InvitesList({ tenantId, refreshTrigger = 0 }: InvitesListProps) {
  const [invites, setInvites] = useState<TenantInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelingInviteId, setCancelingInviteId] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const { toast } = useToast();

  const fetchInvites = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await inviteService.listTenantInvites(supabase, tenantId);

      if (error) {
        throw error;
      }

      setInvites(data || []);
    } catch (error) {
      console.error('Erro ao buscar convites:', error);
      toast({
        title: 'Erro ao carregar convites',
        description: 'Não foi possível carregar a lista de convites.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, [tenantId, refreshTrigger]);

  const handleCancelInvite = async (inviteId: string) => {
    try {
      setCancelingInviteId(inviteId);
      const { success, error } = await inviteService.cancelInvite(supabase, inviteId);

      if (error) {
        throw error;
      }

      if (success) {
        toast({
          title: 'Convite cancelado',
          description: 'O convite foi cancelado com sucesso.',
        });
        
        // Atualizar a lista de convites
        setInvites(invites.filter(invite => invite.id !== inviteId));
      }
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      toast({
        title: 'Erro ao cancelar convite',
        description: 'Não foi possível cancelar o convite. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setCancelingInviteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-warning/10 text-warning hover:bg-warning/10">Pendente</Badge>;
      case 'ACCEPTED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Aceito</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'TENANT_ADMIN':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">Administrador</Badge>;
      case 'TENANT_USER':
        return <Badge variant="outline" className="bg-muted text-muted-foreground hover:bg-muted">Usuário</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Carregando convites...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium">Convites Enviados</h3>
        <Button variant="outline" size="sm" onClick={fetchInvites}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {invites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">Nenhum convite enviado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Convide usuários para acessar este tenant.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Data de Envio</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>{invite.email}</TableCell>
                  <TableCell>{getStatusBadge(invite.status)}</TableCell>
                  <TableCell>{getRoleBadge(invite.role)}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(invite.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    {invite.status === 'PENDING' ? (
                      formatDistanceToNow(new Date(invite.expires_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {invite.status === 'PENDING' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            disabled={cancelingInviteId === invite.id}
                          >
                            {cancelingInviteId === invite.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar convite</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja cancelar o convite enviado para {invite.email}?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelInvite(invite.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

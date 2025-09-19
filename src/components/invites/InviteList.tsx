import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { InviteForm } from "./InviteForm";
import { InviteRow } from "./InviteRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Invite {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  status: string;
}

export function InviteList() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Erro ao carregar convites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convites</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <InviteForm onInviteCreated={loadInvites} />

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    Nenhum convite encontrado
                  </TableCell>
                </TableRow>
              ) : (
                invites.map((invite) => (
                  <InviteRow 
                    key={invite.id} 
                    invite={invite} 
                    onUpdate={loadInvites}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 
